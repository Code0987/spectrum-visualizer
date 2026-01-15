const {
    app,
    BrowserWindow,
    ipcMain,
    dialog,
    Menu,
    globalShortcut,
} = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        backgroundColor: "#0a0a0f",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
        titleBarStyle: "hiddenInset",
        frame: true,
        autoHideMenuBar: true,
        icon: path.join(__dirname, "../../assets/icons/icon.png"),
    });

    // Hide the menu bar completely
    Menu.setApplicationMenu(null);

    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

    // Open DevTools in development
    if (process.env.NODE_ENV === "development") {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

    // Register global shortcuts
    registerShortcuts();
}

function registerShortcuts() {
    // Open file shortcut
    globalShortcut.register("CmdOrCtrl+O", () => {
        if (mainWindow) openAudioFile();
    });

    // Export video shortcut
    globalShortcut.register("CmdOrCtrl+E", () => {
        if (mainWindow) mainWindow.webContents.send("export-video");
    });

    // Toggle DevTools shortcut
    globalShortcut.register("CmdOrCtrl+Shift+I", () => {
        if (mainWindow) mainWindow.webContents.toggleDevTools();
    });

    // Reload shortcut
    globalShortcut.register("CmdOrCtrl+R", () => {
        if (mainWindow) mainWindow.reload();
    });

    // Fullscreen shortcut
    globalShortcut.register("F11", () => {
        if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
    });

    // Quit shortcut
    globalShortcut.register("CmdOrCtrl+Q", () => {
        app.quit();
    });
}

async function openAudioFile() {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openFile"],
        filters: [
            {
                name: "Audio Files",
                extensions: ["mp3", "wav", "ogg", "flac", "m4a", "aac"],
            },
        ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
        mainWindow.webContents.send("file-selected", result.filePaths[0]);
    }
}

// IPC Handlers
ipcMain.handle("open-file-dialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openFile"],
        filters: [
            {
                name: "Audio Files",
                extensions: ["mp3", "wav", "ogg", "flac", "m4a", "aac"],
            },
        ],
    });
    return result;
});

ipcMain.handle("save-file-dialog", async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: "Save Video",
        defaultPath: options.defaultPath || "visualization",
        filters: options.filters || [
            { name: "MP4 Video", extensions: ["mp4"] },
            { name: "WebM Video", extensions: ["webm"] },
            { name: "GIF Animation", extensions: ["gif"] },
        ],
    });
    return result;
});

ipcMain.handle("read-file", async (event, filePath) => {
    return fs.promises.readFile(filePath);
});

ipcMain.handle("write-file", async (event, filePath, data) => {
    return fs.promises.writeFile(filePath, Buffer.from(data));
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    // Unregister all shortcuts
    globalShortcut.unregisterAll();

    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("will-quit", () => {
    // Unregister all shortcuts before quitting
    globalShortcut.unregisterAll();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
