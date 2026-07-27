const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("webPdf", {
  selectHtmlFile: (language) =>
    ipcRenderer.invoke("source:select-file", language),
  generatePreview: (request) => ipcRenderer.invoke("pdf:preview", request),
  savePdf: (request) => ipcRenderer.invoke("pdf:save", request),
  cancelOperation: () => ipcRenderer.invoke("pdf:cancel"),
  loadPreferences: () => ipcRenderer.invoke("preferences:load"),
  savePreferences: (preferences) =>
    ipcRenderer.invoke("preferences:save", preferences),
  platformInfo: () => ipcRenderer.invoke("app:platform")
});
