import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    saveBackup: (data: string) => ipcRenderer.invoke('save-backup', data),
    exportPDF: (fileName: string, htmlContent: string, printSize: string) => ipcRenderer.invoke('export-pdf', fileName, htmlContent, printSize),
})
