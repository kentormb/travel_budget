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
        return;
    }

    const tripsData = localStorage.getItem(STORAGE_KEYS.TRIPS);
    if (!tripsData) {
        return;
    }

    const fileData = new Blob([tripsData], { type: "application/json" });
    const fileName = STORAGE_KEYS.EXPORT_FILENAME;

    uploadToGoogleDrive(fileData, fileName, storedToken)
        .then(success => {
            if (success) {
                console.log("Backup completed successfully");
            } else {
                console.warn("Backup failed");
            }
        })
        .catch(err => {
            console.error("Error during backup:", err);
        });
}

export async function ensureBackupFolderExists(token: string) {
    try {
        // Initialize API with token if needed
        if (window.gapi?.client && !window.gapi.client.drive) {
            await window.gapi.client.init({
                apiKey: GOOGLE_API.API_KEY,
                discoveryDocs: GOOGLE_API.DISCOVERY_DOCS,
            });
        }

        if (window.gapi?.client) {
            window.gapi.client.setToken({ access_token: token });
        }

        let folderId = localStorage.getItem(STORAGE_KEYS.FOLDER_ID);

        if (folderId) {
            return folderId;
        }

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

        // Create new folder
        try {
            // Try GAPI method first
            const response = await window.gapi.client.drive.files.create({
                resource: {
                    name: GOOGLE_API.BACKUP_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: ['root']
                },
                fields: 'id,name'
            });

            const result = response.result;
            updateFolderState(result.id, result.name);
            return result.id;
        } catch (gapiError) {
            console.warn("GAPI folder creation failed:", gapiError);

            // Fallback to fetch API
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
                updateFolderState(folderId, GOOGLE_API.BACKUP_FOLDER_NAME);
                return folderId;
            }
        }

        console.error("Failed to create or find backup folder");
        return null;
    } catch (error) {
        console.error("Error ensuring backup folder exists:", error);
        return null;
    }
}

export function updateFolderState(id: string, name: string) {
    localStorage.setItem(STORAGE_KEYS.FOLDER_ID, id);
    localStorage.setItem(STORAGE_KEYS.FOLDER_NAME, name);
}

export async function uploadToGoogleDrive(fileData: Blob, fileName: string, token: string) {
    try {
        // Validate token before proceeding
        try {
            const tokenResponse = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`);
            if (!tokenResponse.ok) {
                console.error("Invalid token, cannot upload to Google Drive");
                localStorage.removeItem(STORAGE_KEYS.TOKEN);
                return false;
            }
        } catch (tokenError) {
            console.error("Error validating token:", tokenError);
            return false;
        }

        if (window.gapi?.client) {
            window.gapi.client.setToken({ access_token: token });
        }

        let folderId = await ensureBackupFolderExists(token);

        // Look for existing backup file
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
            // Update existing file
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
            console.log('Backup file updated successfully');
            return true;
        } else {
            // Create new file
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

        // Check if token is valid
        try {
            const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`);

            if (!response.ok) {
                console.error("Token validation failed:", await response.text());
                localStorage.removeItem(STORAGE_KEYS.TOKEN);
                return;
            }

            window.gapi.client.setToken({ access_token: token });
            backupToGoogleDrive();
        } catch (error) {
            console.error("Token validation error:", error);
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
        }
    } catch (error) {
        console.error("Error initializing Google API client:", error);
    }
}
