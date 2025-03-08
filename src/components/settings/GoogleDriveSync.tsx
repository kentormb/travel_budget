import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Download, Cloud, Folder, Clock } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

// Google Drive API constants
const API_KEY = "AIzaSyDeD0_VIy2_ALNoaa71cMYLSQJcPbURzo4";
const CLIENT_ID = "301191658080-t0kpn0md60vi7b4b02hlbgs1cb8uo53b.apps.googleusercontent.com";
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
// Use drive.file scope for accessing files/folders created by the app
const SCOPES = "https://www.googleapis.com/auth/drive.file";

// Google Identity Services client
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export function GoogleDriveSync() {
  const [saveDailyToCloud, setSaveDailyToCloud] = useState<boolean>(
    localStorage.getItem("saveDailyToCloud") === "true"
  );
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState<boolean>(false);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string>("");
  const [selectedFolder, setSelectedFolder] = useState<string>(
    localStorage.getItem("googleDriveFolder") || ""
  );
  const [folderName, setFolderName] = useState<string>(
    localStorage.getItem("googleDriveFolderName") || "Root"
  );
  const [lastSavedDate, setLastSavedDate] = useState<string>(
    localStorage.getItem("lastGoogleDriveBackup") || ""
  );

  // Reference to the token client
  const tokenClient = useRef<any>(null);

  useEffect(() => {
    // Only load scripts if backup is enabled
    if (!saveDailyToCloud) {
      return;
    }

    // Load the Google Identity Services script
    const loadGsi = () => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Initialize token client after script loads
        initializeGoogleAuth();
      };
      document.head.appendChild(script);
      return script;
    };

    // Load Google API client script
    const loadGapi = () => {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Initialize GAPI client
        window.gapi.load("client", initializeGapiClient);
      };
      document.head.appendChild(script);
      return script;
    };

    // Load both scripts
    const gsiScript = loadGsi();
    const gapiScript = loadGapi();

    // Cleanup function
    return () => {
      document.head.removeChild(gsiScript);
      document.head.removeChild(gapiScript);
    };
  }, [saveDailyToCloud]);

  // Initialize the GAPI client (for Drive API)
  const initializeGapiClient = async () => {
    try {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
      });
      setIsGoogleApiLoaded(true);

      // Check if user has a stored token
      const storedToken = localStorage.getItem("googleDriveToken");
      if (storedToken) {
        setAccessToken(storedToken);
        setIsSignedIn(true);
      }
    } catch (error) {
      console.error("Error initializing Google API client:", error);
      toast.error("Failed to initialize Google Drive API");
    }
  };

  // Initialize Google Auth (Identity Services)
  const initializeGoogleAuth = () => {
    try {
      // Initialize token client
      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: handleTokenResponse
      });

      setIsGoogleApiLoaded(true);
    } catch (error) {
      console.error("Error initializing Google Identity Services:", error);
      toast.error("Failed to initialize Google authentication");
    }
  };

  // Handle token response
  const handleTokenResponse = (response: any) => {
    if (response.error !== undefined) {
      toast.error(`Error: ${response.error}`);
      setIsSignedIn(false);
      return;
    }

    const token = response.access_token;

    // Set state and local storage immediately
    setAccessToken(token);
    setIsSignedIn(true);
    localStorage.setItem("googleDriveToken", token);

    // After getting token, ensure the backup folder exists
    setTimeout(async () => {
      try {
        // Initialize the client with the token
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });

        window.gapi.client.setToken({ access_token: token });

        // Try to find or create the folder
        const folderId = await ensureBackupFolderExists();

        if (folderId) {
          console.log("Successfully set up backup folder with ID:", folderId);
        } else {
          console.warn("Could not set up backup folder automatically");
        }
      } catch (error) {
        console.error("Error setting up backup folder:", error);
      }
    }, 2000); // Give more time for the API to be properly initialized
  };

  // Function to ensure the backup folder exists
  const ensureBackupFolderExists = async () => {
    if (!isSignedIn || !accessToken) {
      return null;
    }

    const BACKUP_FOLDER_NAME = "TravelExpenseBackups";

    try {
      console.log("Ensuring backup folder exists:", BACKUP_FOLDER_NAME);

      // First, make sure the API is initialized properly
      if (!window.gapi.client.drive) {
        console.log("Drive API not loaded, initializing...");
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
      }

      // Set the token explicitly
      window.gapi.client.setToken({ access_token: accessToken });
      console.log("Token set for API requests");

      // Method 1: Try to find existing folder with GAPI
      try {
        console.log("Searching for existing folder...");
        const response = await window.gapi.client.drive.files.list({
          q: `mimeType='application/vnd.google-apps.folder' and name='${BACKUP_FOLDER_NAME}' and trashed=false`,
          fields: "files(id, name)",
          spaces: "drive"
        });

        const folders = response.result.files;
        console.log("Folder search result:", folders);

        // If folder already exists, use it
        if (folders && folders.length > 0) {
          const folder = folders[0];
          setSelectedFolder(folder.id);
          setFolderName(folder.name);
          localStorage.setItem("googleDriveFolder", folder.id);
          localStorage.setItem("googleDriveFolderName", folder.name);
          console.log("Using existing folder:", folder.name, folder.id);
          return folder.id;
        }

        console.log("No existing folder found, creating new one...");
      } catch (searchError) {
        console.error("Error searching for folder:", searchError);
        console.log("Continuing to folder creation despite search error");
      }

      console.log("Creating new backup folder:", BACKUP_FOLDER_NAME);
      // Folder doesn't exist, create it
      return await createNewFolder(BACKUP_FOLDER_NAME);
    } catch (error) {
      console.error("Error ensuring backup folder exists:", error);
      return null;
    }
  };

  // Function to create a new folder
  const createNewFolder = async (folderName: string) => {
    if (!isSignedIn || !accessToken) {
      toast.error("Please connect to Google Drive first");
      return null;
    }

    try {
      console.log("Creating folder in My Drive root:", folderName);

      // First method: Try with GAPI client
      try {
        console.log("Method 1: Using GAPI client");
        window.gapi.client.setToken({ access_token: accessToken });

        const response = await window.gapi.client.drive.files.create({
          resource: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            // Explicitly set parent to 'root' (My Drive)
            parents: ['root']
          },
          fields: 'id,name'
        });

        const result = response.result;
        console.log("GAPI success! Folder created:", result);

        setSelectedFolder(result.id);
        setFolderName(result.name);
        localStorage.setItem("googleDriveFolder", result.id);
        localStorage.setItem("googleDriveFolderName", result.name);

        toast.success("Created backup folder in Google Drive");
        return result.id;
      } catch (gapiError) {
        console.warn("GAPI method failed:", gapiError);
        console.log("Trying alternative method...");

        // Second method: Try with direct fetch API
        const metadata = JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['root']  // Explicitly set parent to 'root' (My Drive)
        });

        console.log("Method 2: Using fetch API");
        console.log("Request metadata:", metadata);

        const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: metadata
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Response not OK:", response.status, errorText);
          throw new Error(`Failed to create folder: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log("Fetch API success! Folder created:", result);

        if (!result.id) {
          throw new Error("No folder ID returned in response");
        }

        setSelectedFolder(result.id);
        setFolderName(folderName);
        localStorage.setItem("googleDriveFolder", result.id);
        localStorage.setItem("googleDriveFolderName", folderName);

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
    if (!isGoogleApiLoaded || !tokenClient.current) {
      toast.error("Google authentication is not ready yet. Please try again.");
      return;
    }

    if (!isSignedIn) {
      // Request an access token
      tokenClient.current.requestAccessToken({ prompt: 'consent' });
    } else {
      // Sign out
      setIsSignedIn(false);
      setAccessToken("");
      localStorage.removeItem("googleDriveToken");
      toast.success("Disconnected from Google Drive");
    }
  };

  const handleSaveDailyToggle = (checked: boolean) => {
    setSaveDailyToCloud(checked);
    localStorage.setItem("saveDailyToCloud", checked.toString());

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
      // Set the access token for API requests
      window.gapi.client.setToken({ access_token: accessToken });

      // Search for the most recent backup file
      const response = await window.gapi.client.drive.files.list({
        q: "name contains 'trips_backup_' and mimeType='application/json'",
        fields: "files(id, name, modifiedTime)",
        orderBy: "modifiedTime desc",
        pageSize: 1
      });

      const files = response.result.files;
      if (files && files.length > 0) {
        const file = files[0];
        // Get the file content
        const fileResponse = await window.gapi.client.drive.files.get({
          fileId: file.id,
          alt: 'media'
        });

        // Process the file content
        const fileContent = fileResponse.body;
        try {
          const existingTrips = JSON.parse(localStorage.getItem("trips") || "[]");
          const jsonData = JSON.parse(fileContent);

          let itemsCount = 0;
          jsonData.forEach(item => {
            if (item?.id && item?.name && item?.expenses) {
              itemsCount++;
            }
          });

          if (itemsCount === 0) {
            throw new Error("Invalid JSON format: no trips found in array");
          }

          // Merge data with existing trips
          jsonData.forEach(newTrip => {
            const duplicate = existingTrips.find(trip => trip.id === newTrip.id);
            if (duplicate) {
              newTrip.id = `${newTrip.id}-${Math.random().toString(36).substring(2, 3)}`;
            }
            existingTrips.push(newTrip);
          });

          localStorage.setItem("trips", JSON.stringify(existingTrips));
          toast.success(`Imported ${itemsCount} trips from Google Drive!`);
          window.dispatchEvent(new Event('storageChange'));
        } catch (error) {
          console.error("Import error:", error);
          toast.error("Error importing data from Google Drive.");
        }
      } else {
        toast.info("No backup files found in Google Drive");
      }
    } catch (error) {
      console.error("Error fetching files from Google Drive:", error);
      toast.error("Failed to fetch data from Google Drive");
    }
  };

  // Function to upload to Google Drive
  const uploadToGoogleDrive = async (fileData: Blob, fileName: string) => {
    if (!accessToken) {
      toast.error("No authentication token available. Please reconnect to Google Drive.");
      return;
    }

    try {
      // First, create a file metadata
      const metadata: any = {
        name: fileName,
        mimeType: 'application/json',
      };

      // If a folder is selected, add it as the parent
      if (selectedFolder) {
        metadata.parents = [selectedFolder];
      }

      // Create a form data object
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', fileData);

      // Upload file using fetch API with the current access token
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      const result = await response.json();
      if (result.id) {
        const now = new Date().toISOString();
        localStorage.setItem("lastGoogleDriveBackup", now);
        setLastSavedDate(now);
        toast.success('Successfully backed up to Google Drive');
      } else {
        throw new Error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      toast.error('Failed to back up to Google Drive');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6 font-bold">
        <span>Save expenses to Google Drive daily</span>
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
                        Files saved in "TravelExpenseBackups" folder
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

  // Add a function to be called daily for auto-backup
  export function backupToGoogleDrive() {
    console.log("Starting auto-backup to Google Drive...");
    const saveDailyToCloud = localStorage.getItem("saveDailyToCloud") === "true";
    const storedToken = localStorage.getItem("googleDriveToken");

    console.log("Auto-backup settings:", {
      saveDailyToCloud,
      hasToken: !!storedToken,
      folderConfigured: !!localStorage.getItem("googleDriveFolder")
    });

    if (saveDailyToCloud && storedToken) {
      const tripsData = localStorage.getItem("trips");

      if (tripsData) {
        console.log("Trips data found, preparing for backup...");
        const fileData = new Blob([tripsData], { type: "application/json" });
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const formattedDate = `${year}${month}${day}`;

        const fileName = `trips_backup_${formattedDate}.json`;
        console.log("Backup filename:", fileName);

        // Call the upload function
        const uploadToGoogleDrive = async (fileData: Blob, fileName: string, token: string) => {
          try {
            console.log("Starting upload process...");

            // Set the token for the Google API client if available
            if (window.gapi?.client) {
              window.gapi.client.setToken({ access_token: token });
              console.log("Token set successfully");
            }

            // Check for and create folder if needed
            let folderId = localStorage.getItem("googleDriveFolder");
            console.log("Current folder ID:", folderId);

            if (!folderId) {
              console.log("No folder ID found, trying to create folder first");

              // We need to initialize the API discovery
              if (!window.gapi.client.drive) {
                await window.gapi.client.init({
                  apiKey: "AIzaSyDeD0_VIy2_ALNoaa71cMYLSQJcPbURzo4",
                  discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
                });
              }

              // Create a folder directly
              try {
                const BACKUP_FOLDER_NAME = "TravelExpensesBackups";
                console.log("Creating folder:", BACKUP_FOLDER_NAME);

                const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    name: BACKUP_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: ['root']
                  })
                });

                if (folderResponse.ok) {
                  const folderResult = await folderResponse.json();
                  folderId = folderResult.id;
                  localStorage.setItem("googleDriveFolder", folderId);
                  localStorage.setItem("googleDriveFolderName", BACKUP_FOLDER_NAME);
                  console.log("Created folder with ID:", folderId);
                } else {
                  console.error("Failed to create folder:", await folderResponse.text());
                }
              } catch (folderError) {
                console.error("Error creating folder:", folderError);
              }
            }

            const metadata: any = {
              name: fileName,
              mimeType: 'application/json',
            };

            // Add folder as parent if available
            if (folderId) {
              metadata.parents = [folderId];
              console.log("Using folder ID for upload:", folderId);
            } else {
              console.warn("No folder ID available, uploading to root");
            }

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', fileData);

            console.log("Sending upload request...");
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: form,
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Upload failed: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            if (result.id) {
              const now = new Date().toISOString();
              console.log('Auto-backup to Google Drive successful, file ID:', result.id);
              localStorage.setItem("lastGoogleDriveBackup", now);
            } else {
              console.error("No file ID in response:", result);
            }
          } catch (error) {
            console.error('Error during auto-backup to Google Drive:', error);
          }
        };

        uploadToGoogleDrive(fileData, fileName, storedToken);
      } else {
        console.log("No trips data found to backup");
      }
    } else {
      console.log("Auto-backup skipped: daily backup not enabled or no token available");
    }
  }
