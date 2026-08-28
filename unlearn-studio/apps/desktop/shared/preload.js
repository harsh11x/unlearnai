const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Dialogs
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  saveFile: () => ipcRenderer.invoke("dialog:saveFile"),

  // RPC to Python backend
  rpc: (method, params = {}) => ipcRenderer.invoke("rpc", method, params),

  // Backend status
  isBackendReady: () => ipcRenderer.invoke("app:isBackendReady"),

  // Platform
  getPlatform: () => ipcRenderer.invoke("app:getPlatform"),

  // Event listeners
  onBackendReady: (callback) => {
    ipcRenderer.on("backend:ready", (_event, info) => callback(info));
  },
  onBackendLog: (callback) => {
    ipcRenderer.on("backend:log", (_event, msg) => callback(msg));
  },
  onUnlearnProgress: (callback) => {
    ipcRenderer.on("unlearn:progress", (_event, data) => callback(data));
  },
});
