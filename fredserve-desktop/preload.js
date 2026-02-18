const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickFiles: () => ipcRenderer.invoke('pick-files'),
  listStyleFiles: (rootDir) => ipcRenderer.invoke('list-style-files', rootDir),
  readFileBase64: (fullPath) => ipcRenderer.invoke('read-file-base64', fullPath),
  readFileText: (fullPath) => ipcRenderer.invoke('read-file-text', fullPath)
});
