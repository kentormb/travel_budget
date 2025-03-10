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

  // Ensure backup folder exists
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

export function backupToGoogleDrive() {
  const saveDailyToCloud = localStorage.getItem(STORAGE_KEYS.SAVE_DAILY) === "true";
  const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

  if (!saveDailyToCloud || !storedToken) {
    console.log("Auto-backup skipped: daily backup not enabled or no token available");
    return;
  }

  const tripsData = localStorage.getItem(STORAGE_KEYS.TRIPS);
  if (!tripsData) {
    console.log("No trips data found to backup");
    return;
  }

  const fileData = new Blob([tripsData], { type: "application/json" });
  const date = new Date();
  const formattedDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const fileName = `trips_backup_${formattedDate}.json`;

  uploadToGoogleDrive(fileData, fileName, storedToken);
}

async function uploadToGoogleDrive(fileData: Blob, fileName: string, token: string) {
  try {
    if (window.gapi?.client) {
      window.gapi.client.setToken({ access_token: token });
    }

    let folderId = localStorage.getItem(STORAGE_KEYS.FOLDER_ID);

    if (!folderId) {
      if (window.gapi?.client && !window.gapi.client.drive) {
        await window.gapi.client.init({
          apiKey: GOOGLE_API.API_KEY,
          discoveryDocs: GOOGLE_API.DISCOVERY_DOCS,
        });
      }

      const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: GOOGLE_API.BACKUP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['root']
        })
      });

      if (folderResponse.ok) {
        const folderResult = await folderResponse.json();
        folderId = folderResult.id;
        localStorage.setItem(STORAGE_KEYS.FOLDER_ID, folderId);
        localStorage.setItem(STORAGE_KEYS.FOLDER_NAME, GOOGLE_API.BACKUP_FOLDER_NAME);
      }
    }

    let fileId = null;
    try {
      let query = `name='${fileName}' and mimeType='application/json' and trashed=false`;
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }

      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.files && searchResult.files.length > 0) {
          fileId = searchResult.files[0].id;
        }
      }
    } catch (searchError) {
      console.warn('Error searching for existing file:', searchError);
    }

    if (fileId) {
      const updateResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: createMultipartBody(fileData, {
          name: fileName,
          mimeType: 'application/json'
        })
      });

      if (!updateResponse.ok) {
        throw new Error(`Update failed: ${updateResponse.status}`);
      }

      const now = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, now);
      return true;
    } else {
      const metadata: any = {
        name: fileName,
        mimeType: 'application/json',
      };

      if (folderId) {
        metadata.parents = [folderId];
      }

      // Upload new file
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', fileData);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      if (result.id) {
        const now = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, now);
        console.log('New backup file created successfully, file ID:', result.id);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    return false;
  }
}

function createMultipartBody(fileData: Blob, metadata: any): FormData {
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', fileData);
  return form;
}

export function initializeAutomaticBackup() {
  const saveDailyToCloud = localStorage.getItem(STORAGE_KEYS.SAVE_DAILY) === "true";
  const googleDriveToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

  if (saveDailyToCloud && googleDriveToken) {
    console.log("Initializing automatic backup to Google Drive...");

    setTimeout(() => {
      loadGapiAndBackup(googleDriveToken);
    }, 1000);
  }
}

function loadGapiAndBackup(token: string) {
  if (window.gapi && window.gapi.client) {
    initializeGapiAndBackup(token).then();
    return;
  }

  try {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("GAPI script loaded successfully");
      window.gapi.load("client", () => initializeGapiAndBackup(token));
    };

    script.onerror = (error) => {
      console.error("Failed to load Google API script:", error);
    };

    document.head.appendChild(script);
  } catch (error) {
    console.error("Error setting up Google API script:", error);
  }
}

async function initializeGapiAndBackup(token: string) {
  try {
    // Initialize the GAPI client
    await window.gapi.client.init({
      apiKey: GOOGLE_API.API_KEY,
      discoveryDocs: GOOGLE_API.DISCOVERY_DOCS,
    });

    window.gapi.client.setToken({ access_token: token });

    backupToGoogleDrive();
  } catch (error) {
    console.error("Error initializing Google API client:", error);
  }
}
