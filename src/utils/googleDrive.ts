import { GOOGLE_API, STORAGE_KEYS } from "@/types/google.ts";

export function loadGapiAndBackup(token: string) {
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

    uploadToGoogleDrive(fileData, fileName, storedToken).then();
}

export async function uploadToGoogleDrive(fileData: Blob, fileName: string, token: string) {
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

export function createMultipartBody(fileData: Blob, metadata: any): FormData {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileData);
    return form;
}

export async function initializeGapiAndBackup(token: string) {
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
