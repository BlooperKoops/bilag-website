const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#f3f6f9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle('pick-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'txt', 'md', 'docx'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled) return [];
  return result.filePaths;
});

async function walkFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        out.push(fullPath);
      }
    }
  }
  await walk(rootDir);
  return out;
}

ipcMain.handle('list-style-files', async (_event, rootDir) => {
  if (!rootDir) return [];
  const files = await walkFiles(rootDir);
  return files
    .filter((f) => /\.(txt|md)$/i.test(f))
    .map((fullPath) => ({
      fullPath,
      relativePath: path.relative(rootDir, fullPath)
    }));
});

ipcMain.handle('read-file-base64', async (_event, fullPath) => {
  const data = await fs.readFile(fullPath);
  return data.toString('base64');
});

ipcMain.handle('read-file-text', async (_event, fullPath) => {
  const data = await fs.readFile(fullPath, 'utf-8');
  return data;
});
