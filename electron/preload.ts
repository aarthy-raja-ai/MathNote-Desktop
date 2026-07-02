import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    saveBackup: (data: string) => ipcRenderer.invoke('save-backup', data),
    exportPDF: (fileName: string, htmlContent: string, printSize: string) => ipcRenderer.invoke('export-pdf', fileName, htmlContent, printSize),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    saveBackupToPath: (folderPath: string, data: string) => ipcRenderer.invoke('save-backup-to-path', folderPath, data),
    onAppClosing: (callback: () => void) => {
        ipcRenderer.on('app-closing', callback);
        return () => {
            ipcRenderer.off('app-closing', callback);
        };
    },
    confirmClose: () => ipcRenderer.send('confirm-close'),
})
