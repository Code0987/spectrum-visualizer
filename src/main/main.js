const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin' ? true : true,
    icon: path.join(__dirname, '../../assets/icons/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Audio File',
          accelerator: 'CmdOrCtrl+O',
          click: () => openAudioFile()
        },
        { type: 'separator' },
        {
          label: 'Export Video',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('export-video')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Visualization',
      submenu: [
        { label: 'Bar Graph', click: () => mainWindow.webContents.send('change-visualization', 'bars') },
        { label: 'Waveform', click: () => mainWindow.webContents.send('change-visualization', 'waveform') },
        { label: 'Circular', click: () => mainWindow.webContents.send('change-visualization', 'circular') },
        { label: 'Particles', click: () => mainWindow.webContents.send('change-visualization', 'particles') },
        { label: 'Cloud', click: () => mainWindow.webContents.send('change-visualization', 'cloud') },
        { label: 'Psychedelic', click: () => mainWindow.webContents.send('change-visualization', 'psychedelic') },
        { label: '3D Terrain', click: () => mainWindow.webContents.send('change-visualization', '3d') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Spectrum Visualizer',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'Spectrum Visualizer',
              detail: 'Version 1.0.0\nA real-time music spectrum visualizer with multiple visualization modes.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function openAudioFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    mainWindow.webContents.send('file-selected', result.filePaths[0]);
  }
}

// IPC Handlers
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] }
    ]
  });
  return result;
});

ipcMain.handle('save-file-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Video',
    defaultPath: options.defaultPath || 'visualization',
    filters: options.filters || [
      { name: 'MP4 Video', extensions: ['mp4'] },
      { name: 'WebM Video', extensions: ['webm'] },
      { name: 'GIF Animation', extensions: ['gif'] }
    ]
  });
  return result;
});

ipcMain.handle('read-file', async (event, filePath) => {
  return fs.promises.readFile(filePath);
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  return fs.promises.writeFile(filePath, Buffer.from(data));
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
