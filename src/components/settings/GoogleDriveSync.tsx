import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Download, Cloud, Clock } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { GOOGLE_API, STORAGE_KEYS } from "@/types/google";

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
    setAccessToken(token);
    setIsSignedIn(true);
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);

    setTimeout(() => ensureBackupFolderExists(token), 1000);
  }, []);

  const ensureBackupFolderExists = async (token: string) => {
    try {
      // Initialize API with token
      await window.gapi.client.init({
        apiKey: GOOGLE_API.API_KEY,
        discoveryDocs: GOOGLE_API.DISCOVERY_DOCS,
      });

      window.gapi.client.setToken({ access_token: token });

      // Search for existing folder
      try {
        const response = await window.gapi.client.drive.files.list({
          q: `mimeType='application/vnd.google-apps.folder' and name='${GOOGLE_API.BACKUP_FOLDER_NAME}' and trashed=false`,
          fields: "files(id, name)",
          spaces: "drive"
        });

        const folders = response.result.files;

        if (folders && folders.length > 0) {
          const folder = folders[0];
          updateFolderState(folder.id, folder.name);
          return folder.id;
        }
      } catch (error) {
        console.warn("Error searching for folder:", error);
      }

      return await createNewFolder(GOOGLE_API.BACKUP_FOLDER_NAME, token);
    } catch (error) {
      console.error("Error ensuring backup folder exists:", error);
      return null;
    }
  };

  const updateFolderState = (id: string, name: string) => {
    setSelectedFolder(id);
    setFolderName(name);
    localStorage.setItem(STORAGE_KEYS.FOLDER_ID, id);
    localStorage.setItem(STORAGE_KEYS.FOLDER_NAME, name);
  };

  const createNewFolder = async (folderName: string, token: string) => {
    try {
      try {
        window.gapi.client.setToken({ access_token: token });

        const response = await window.gapi.client.drive.files.create({
          resource: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['root']
          },
          fields: 'id,name'
        });

        const result = response.result;
        updateFolderState(result.id, result.name);
        toast.success("Created backup folder in Google Drive");
        return result.id;
      } catch (gapiError) {
        console.warn("GAPI method failed:", gapiError);

        const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['root']
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to create folder: ${response.status}`);
        }

        const result = await response.json();

        if (!result.id) {
          throw new Error("No folder ID returned in response");
        }

        updateFolderState(result.id, folderName);
        toast.success("Created backup folder in Google Drive");
        return result.id;
      }
    } catch (error) {
      console.error("All folder creation methods failed:", error);
      toast.error("Failed to create Google Drive folder");
      return null;
    }
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

    try {
      window.gapi.client.setToken({ access_token: accessToken });

      // Find most recent backup file
      const response = await window.gapi.client.drive.files.list({
        q: "name contains 'trips_backup_' and mimeType='application/json'",
        fields: "files(id, name, modifiedTime)",
        orderBy: "modifiedTime desc",
        pageSize: 1
      });

      const files = response.result.files;

      if (files && files.length > 0) {
        const file = files[0];

        // Get file content
        const fileResponse = await window.gapi.client.drive.files.get({
          fileId: file.id,
          alt: 'media'
        });

        importTripsData(fileResponse.body);
      } else {
        toast.info("No backup files found in Google Drive");
      }
    } catch (error) {
      console.error("Error fetching files from Google Drive:", error);
      toast.error("Failed to fetch data from Google Drive");
    }
  };

  const importTripsData = (fileContent: string) => {
    try {
      const existingTrips = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRIPS) || "[]");
      const jsonData = JSON.parse(fileContent);

      let itemsCount = 0;
      jsonData.forEach((item: any) => {
        if (item?.id && item?.name && item?.expenses) {
          itemsCount++;
        }
      });

      if (itemsCount === 0) {
        throw new Error("Invalid JSON format: no trips found in array");
      }

      // Merge data with existing trips
      const updatedTrips = [...existingTrips];
      jsonData.forEach((newTrip: any) => {
        const duplicate = existingTrips.find((trip: any) => trip.id === newTrip.id);
        if (duplicate) {
          newTrip.id = `${newTrip.id}-${Math.random().toString(36).substring(2, 3)}`;
        }
        updatedTrips.push(newTrip);
      });

      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(updatedTrips));
      toast.success(`Imported ${itemsCount} trips from Google Drive!`);
      window.dispatchEvent(new Event('storageChange'));
    } catch (error) {
      console.error("Import error:", error);
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
