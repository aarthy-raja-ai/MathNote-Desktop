import storage from './storage';

export const performAutoBackup = async () => {
    try {
        const settings = await storage.getSettings();
        if (!settings?.autoBackupEnabled) return;

        const data = await storage.exportAllData();
        const backupData = JSON.stringify(data, null, 2);

        // In a real Electron app, we would use ipcRenderer to save to a specific path
        // For now, we'll use a fallback or a default name in the user's data directory.
        // We can communicate with the main process to handle the file writing.
        if (window.electronAPI) {
            await window.electronAPI.saveBackup(backupData);
        } else {
            // Fallback for web/dev environment (non-persistent manual-like trigger)
            console.log('Auto-backup triggered, but electronAPI not found.');
        }
    } catch (error) {
        console.error('Auto-backup failed:', error);
    }
};
