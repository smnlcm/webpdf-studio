// WebPDF Studio v4.2 Free Version - preload.js
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('webpdf', {
  createPdf: (params) => ipcRenderer.invoke('create-pdf', params),
  mergePdfs: (params) => ipcRenderer.invoke('merge-pdfs', params),
  splitPdf: (params) => ipcRenderer.invoke('split-pdf', params),
  openFiles: () => ipcRenderer.invoke('open-files'),
  saveFile: (name) => ipcRenderer.invoke('save-file', name),
  savePdfFile: (path, buf) => ipcRenderer.invoke('save-pdf-file', path, buf),
  selectFolder: (defPath) => ipcRenderer.invoke('select-folder', defPath),
  showInFolder: (path) => ipcRenderer.invoke('show-in-folder', path),
  openFile: (path) => ipcRenderer.invoke('open-file', path),
  getPdfInfo: (path) => ipcRenderer.invoke('get-pdf-info', path),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  onMergeProgress: (cb) => {
    const listener = (event, data) => cb(data);
    ipcRenderer.on('merge-progress', listener);
    return () => ipcRenderer.removeListener('merge-progress', listener);
  },
  onSplitProgress: (cb) => {
    const listener = (event, data) => cb(data);
    ipcRenderer.on('split-progress', listener);
    return () => ipcRenderer.removeListener('split-progress', listener);
  },
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
