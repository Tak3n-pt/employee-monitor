const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow;

// Start server in-process (works inside asar and without external node)
function startServer() {
    try {
        require('./server/index.js');
        console.log('Server started in-process');
    } catch (error) {
        console.error('Server startup error:', error);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        title: 'Employee Monitor - Admin Panel',
        autoHideMenuBar: true
    });

    // In development, load from localhost React dev server
    // In production, load from built files
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // Load the embedded React app
        mainWindow.loadURL('http://localhost:3847');
    }

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Start server first, then create window after short delay
    startServer();

    // Wait for server to actually be ready before opening window
    function waitForServer(retries = 20) {
        const http = require('http');
        const req = http.get('http://localhost:3847/api/health', (res) => {
            if (res.statusCode === 200) {
                createWindow();
            } else if (retries > 0) {
                setTimeout(() => waitForServer(retries - 1), 500);
            }
        });
        req.on('error', () => {
            if (retries > 0) {
                setTimeout(() => waitForServer(retries - 1), 500);
            }
        });
    }
    setTimeout(() => waitForServer(), 1000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    // Server runs in-process, will exit with the app
});

// IPC handlers for renderer process communication
ipcMain.handle('get-server-info', () => {
    return {
        port: 3847,
        wsPort: 3847,
        url: 'http://localhost:3847'
    };
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});
