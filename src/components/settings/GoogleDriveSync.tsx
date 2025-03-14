import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Download, Cloud, Clock } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { GOOGLE_API, STORAGE_KEYS } from "@/types/google";
import { ensureBackupFolderExists } from "@/utils/googleDrive";

export function GoogleDriveSync() {
  const [saveDailyToCloud, setSaveDailyToCloud] = useState<boolean>(
      localStorage.getItem(STORAGE_KEYS.SAVE_DAILY) === "true"
  );
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState<boolean>(false);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string>("");
  const [selectedFolder, setSelectedFolder] = useState<string>(
      localStorage.getItem(STORAGE_KEYS.FOLDER_ID) || ""
  );
  const [folderName, setFolderName] = useState<string>(
      localStorage.getItem(STORAGE_KEYS.FOLDER_NAME) || "Root"
  );
  const [lastSavedDate, setLastSavedDate] = useState<string>(
      localStorage.getItem(STORAGE_KEYS.LAST_BACKUP) || ""
  );
  const [tokenClient, setTokenClient] = useState<any>(null);

  useEffect(() => {
    if (!saveDailyToCloud) return;

    const scripts: HTMLScriptElement[] = [];

    // Load Google Identity Services
    const loadGsi = () => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleAuth;
      document.head.appendChild(script);
      scripts.push(script);
      return script;
    };

    const loadGapi = () => {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      script.defer = true;
      script.onload = () => window.gapi.load("client", initializeGapiClient);
      document.head.appendChild(script);
      scripts.push(script);
      return script;
    };

    loadGsi();
    loadGapi();

    return () => {
      scripts.forEach(script => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      });
    };
  }, [saveDailyToCloud]);

  const initializeGapiClient = async () => {
    try {
      await window.gapi.client.init({
        apiKey: GOOGLE_API.API_KEY,
        discoveryDocs: GOOGLE_API.DISCOVERY_DOCS,
      });
      setIsGoogleApiLoaded(true);

      // Check for stored token
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (storedToken) {
        setAccessToken(storedToken);
        setIsSignedIn(true);
      }
    } catch (error) {
      console.error("Error initializing Google API client:", error);
      toast.error("Failed to initialize Google Drive API");
    }
  };

  const initializeGoogleAuth = () => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_API.CLIENT_ID,
        scope: GOOGLE_API.SCOPES,
        callback: handleTokenResponse
      });

      setTokenClient(client);
      setIsGoogleApiLoaded(true);
    } catch (error) {
      console.error("Error initializing Google Identity Services:", error);
      toast.error("Failed to initialize Google authentication");
    }
  };

  const handleTokenResponse = useCallback(async (response: any) => {
    if (response.error !== undefined) {
      toast.error(`Error: ${response.error}`);
      setIsSignedIn(false);
      return;
    }

    const token = response.access_token;

    // Validate token immediately
    try {
      const tokenResponse = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`);
      if (!tokenResponse.ok) {
        toast.error("Authentication failed. Please try again.");
        setIsSignedIn(false);
        return;
      }

      setAccessToken(token);
      setIsSignedIn(true);
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);

      setTimeout(async () => {
        const folderId = await ensureBackupFolderExists(token);
        if (folderId) {
          const folderName = localStorage.getItem(STORAGE_KEYS.FOLDER_NAME) || GOOGLE_API.BACKUP_FOLDER_NAME;
          updateComponentFolderState(folderId, folderName);
        }
      }, 1000);
    } catch (error) {
      console.error("Error validating token:", error);
      toast.error("Authentication validation failed. Please try again.");
      setIsSignedIn(false);
    }
  }, []);

  const updateComponentFolderState = (id: string, name: string) => {
    setSelectedFolder(id);
    setFolderName(name);
    localStorage.setItem(STORAGE_KEYS.FOLDER_ID, id);
    localStorage.setItem(STORAGE_KEYS.FOLDER_NAME, name);
  };

  const handleGoogleAuth = () => {
    if (!isGoogleApiLoaded || !tokenClient) {
      toast.error("Google authentication is not ready yet. Please try again.");
      return;
    }

    if (!isSignedIn) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Sign out
      setIsSignedIn(false);
      setAccessToken("");
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      toast.success("Disconnected from Google Drive");
    }
  };

  const handleSaveDailyToggle = (checked: boolean) => {
    setSaveDailyToCloud(checked);
    localStorage.setItem(STORAGE_KEYS.SAVE_DAILY, checked.toString());

    if (checked && !isSignedIn && isGoogleApiLoaded) {
      toast.info("Please connect to Google Drive to enable daily saving");
    }
  };

  const handleDataFromDrive = async () => {
    if (!isSignedIn || !accessToken) {
      toast.error("Please connect to Google Drive first");
      return;
    }

    // Validate token before proceeding
    try {
      const tokenResponse = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
      if (!tokenResponse.ok) {
        toast.error("Your Google Drive authentication has expired. Please reconnect.");
        setIsSignedIn(false);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        return;
      }
    } catch (tokenError) {
      console.error("Error validating token:", tokenError);
      toast.error("Failed to validate Google authentication.");
      return;
    }

    try {
      window.gapi.client.setToken({ access_token: accessToken });

      // First try an open search to make sure we can find the file anywhere
      let query = "name='" + STORAGE_KEYS.EXPORT_FILENAME + "' and mimeType='application/json' and trashed=false";

      const response = await window.gapi.client.drive.files.list({
        q: query,
        fields: "files(id, name, modifiedTime, parents)",
        pageSize: 10
      });

      let files = response.result.files;

      // If no files found and we have a selected folder, try specifically with that folder
      if ((!files || files.length === 0) && selectedFolder) {
        const folderQuery = `name='${STORAGE_KEYS.EXPORT_FILENAME}' and mimeType='application/json' and trashed=false and '${selectedFolder}' in parents`;
        console.log("No files found in general search. Trying with specific folder:", folderQuery);

        const folderResponse = await window.gapi.client.drive.files.list({
          q: folderQuery,
          fields: "files(id, name, modifiedTime, parents)",
          pageSize: 5
        });

        files = folderResponse.result.files;
      }

      // If still no files found, try one more time with the backup folder name
      if (!files || files.length === 0) {
        // Try to find the backup folder first
        console.log("Searching for backup folder by name:", GOOGLE_API.BACKUP_FOLDER_NAME);
        const folderSearchResponse = await window.gapi.client.drive.files.list({
          q: `name='${GOOGLE_API.BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: "files(id, name)",
          pageSize: 2
        });

        const folders = folderSearchResponse.result.files;
        if (folders && folders.length > 0) {
          const foundFolder = folders[0];
          console.log("Found backup folder:", foundFolder);

          // Search in this specific folder
          const finalQuery = `name='${STORAGE_KEYS.EXPORT_FILENAME}' and mimeType='application/json' and trashed=false and '${foundFolder.id}' in parents`;
          console.log("Final search attempt with query:", finalQuery);

          const finalResponse = await window.gapi.client.drive.files.list({
            q: finalQuery,
            fields: "files(id, name, modifiedTime, parents)",
            pageSize: 5
          });

          files = finalResponse.result.files;

          // Update folder info if found
          if (files && files.length > 0) {
            updateComponentFolderState(foundFolder.id, foundFolder.name);
          }
        }
      }

      if (files && files.length > 0) {
        const file = files[0];

        try {
          const fileResponse = await window.gapi.client.drive.files.get({
            fileId: file.id,
            alt: 'media'
          });

          if (fileResponse.body) {
            importTripsData(fileResponse.body);
          } else {
            throw new Error("Empty file content received");
          }
        } catch (fileError) {
          try {
            console.log("Trying alternative fetch approach for file:", file.id);
            const fetchResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });

            if (!fetchResponse.ok) {
              throw new Error(`Fetch failed with status: ${fetchResponse.status}`);
            }

            const content = await fetchResponse.text();
            importTripsData(content);
          } catch (altError) {
            toast.error("Failed to download backup file content");
          }
        }
      } else {
        toast.info("No backup file found in Google Drive");
      }
    } catch (error) {
      toast.error("Failed to fetch data from Google Drive");
    }
  };

  const importTripsData = (fileContent: string) => {
    try {
      if (!fileContent || fileContent.trim() === "") {
        toast.error("The backup file is empty");
        return;
      }

      // Try to parse the JSON content
      let jsonData;
      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        toast.error("The backup file contains invalid JSON data");
        return;
      }

      if (!Array.isArray(jsonData)) {
        toast.error("Invalid backup format: expected an array of trips");
        return;
      }

      const existingTrips = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRIPS) || "[]");
      const validTrips = [];
      let invalidTrips = 0;

      for (const item of jsonData) {
        if (item?.id && item?.name && Array.isArray(item?.expenses)) {
          validTrips.push(item);
        } else {
          invalidTrips++;
        }
      }

      if (validTrips.length === 0) {
        toast.error("No valid trips found in the backup file");
        return;
      }

      if (invalidTrips > 0) {
        console.warn(`Found ${invalidTrips} invalid trips in the backup`);
      }

      const updatedTrips = [...existingTrips];
      validTrips.forEach((newTrip: any) => {
        const duplicate = existingTrips.find((trip: any) => trip.id === newTrip.id);
        if (duplicate) {
          const index = existingTrips.indexOf(duplicate);
          updatedTrips[index] = newTrip;
        } else {
          updatedTrips.push(newTrip);
        }
      });

      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(updatedTrips));
      toast.success(`Imported ${validTrips.length} trips from Google Drive!`);
      window.dispatchEvent(new Event('storageChange'));
    } catch (error) {
      toast.error("Error importing data from Google Drive.");
    }
  };

  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6 font-bold">
          <span>Save expenses to Google Drive</span>
          <Switch
              id="save-daily"
              checked={saveDailyToCloud}
              onCheckedChange={handleSaveDailyToggle}
          />
        </div>

        {saveDailyToCloud && (
            <div className="flex flex-col space-y-2 mt-4">
              <Button
                  variant={isSignedIn ? "outline" : "default"}
                  onClick={handleGoogleAuth}
                  className="w-full flex items-center justify-center gap-2"
              >
                <Cloud className="h-4 w-4"/>
                {isSignedIn ? "Disconnect from Google Drive" : "Connect to Google Drive"}
              </Button>

              {isSignedIn && (
                  <>
                    <div className="flex items-center justify-center text-sm text-muted-foreground my-2 gap-1">
                <span>
                  Files saved in "{GOOGLE_API.BACKUP_FOLDER_NAME}" folder
                </span>
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleDataFromDrive}
                        className="w-full flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4"/>
                      Import data from Google Drive
                    </Button>

                    {lastSavedDate && (
                        <div className="flex items-center justify-center text-sm text-muted-foreground mt-2 gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                    Last backup: {format(parseISO(lastSavedDate), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                        </div>
                    )}
                  </>
              )}
            </div>
        )}
      </div>
  );
}
