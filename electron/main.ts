import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';

// vite-plugin-electron injects VITE_DEV_SERVER_URL at build time
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'MathNote',
        icon: path.join(__dirname, '../public/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        frame: true,
        backgroundColor: '#0F172A',
        show: false,
    });

    // Open DevTools immediately for debugging
    if (!app.isPackaged) {
        win.webContents.openDevTools();
    }

    // Forward renderer console logs to main terminal
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[RENDERER] ${message} (at ${sourceId}:${line})`);
    });

    // Show window when ready to avoid flash of white
    win.once('ready-to-show', () => {
        win.show()
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// IPC handler for saving backups
ipcMain.handle('save-backup', async (_event, data: string) => {
    try {
        const backupDir = path.join(app.getPath('userData'), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const fileName = `autobackup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(backupDir, fileName);
        fs.writeFileSync(filePath, data);

        // Keep only last 5 backups
        const files = fs.readdirSync(backupDir).sort((a, b) => {
            return fs.statSync(path.join(backupDir, b)).mtime.getTime() - fs.statSync(path.join(backupDir, a)).mtime.getTime();
        });
        if (files.length > 5) {
            files.slice(5).forEach(f => fs.unlinkSync(path.join(backupDir, f)));
        }

        return { success: true, path: filePath };
    } catch (error) {
        console.error('Failed to save backup:', error);
        return { success: false, error: (error as Error).message };
    }
});

// IPC handler for exporting PDF
ipcMain.handle('export-pdf', async (event, fileName: string, htmlContent: string, printSize: string) => {
    try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) throw new Error('Window not found');

        const { filePath } = await dialog.showSaveDialog(win, {
            title: 'Save as PDF',
            defaultPath: path.join(app.getPath('documents'), fileName),
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        });

        if (!filePath) return { success: false, cancelled: true };

        // Create a hidden window to render the HTML
        const printWin = new BrowserWindow({
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

        // Wait a tiny bit for any potential fonts to load (optional, but safe)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Determine page size in microns (1mm = 1000 microns)
        let pageSize: Electron.PrintToPDFOptions['pageSize'] = 'A4';
        if (printSize === 'A5') {
            pageSize = 'A5';
        } else if (printSize === 'thermal80') {
            pageSize = { width: 80000, height: 500000 };
        } else if (printSize === 'thermal58') {
            pageSize = { width: 58000, height: 500000 };
        }

        const pdfData = await printWin.webContents.printToPDF({
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            pageSize,
            printBackground: true,
        });

        printWin.close();

        fs.writeFileSync(filePath, pdfData);
        shell.showItemInFolder(filePath);

        return { success: true, path: filePath };
    } catch (error) {
        console.error('Failed to export PDF:', error);
        return { success: false, error: (error as Error).message };
    }
});
