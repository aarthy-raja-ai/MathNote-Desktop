/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        saveBackup: (data: string) => Promise<{ success: boolean; path?: string; error?: string }>;
        exportPDF: (fileName: string, htmlContent: string, printSize: string) => Promise<{ success: boolean; path?: string; error?: string; cancelled?: boolean }>;
    };
}
