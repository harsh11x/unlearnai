const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Dialogs
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  saveFile: () => ipcRenderer.invoke("dialog:saveFile"),

  // Drag-and-drop: Electron 32+ removed File.path, so resolve real paths here
  // via webUtils.getPathForFile (exposed as a function, not a value copy).
  fileFromDrop: (file) => {
    try {
      return {
        path: webUtils.getPathForFile(file),
        name: file.name,
        size: file.size,
      };
    } catch (e) {
      return { path: null, name: file.name, size: file.size };
    }
  },

  // RPC to Python backend
  rpc: (method, params = {}) => ipcRenderer.invoke("rpc", method, params),

  // System terminal — a real shell in the main process, streamed over IPC.
  // App-level commands (help/status/…) are handled in the renderer; everything
  // else is written into the shell exactly as if typed in a system terminal.
  terminalStart: (opts) => ipcRenderer.invoke("terminal:start", opts || {}),
  terminalRestart: (opts) => ipcRenderer.invoke("terminal:restart", opts || {}),
  terminalSend: (data) => ipcRenderer.send("terminal:input", data),
  terminalInterrupt: () => ipcRenderer.invoke("terminal:interrupt"),
  onTerminalData: (callback) => {
    ipcRenderer.on("terminal:data", (_event, payload) => callback(payload));
  },
  onTerminalReady: (callback) => {
    ipcRenderer.on("terminal:ready", (_event, info) => callback(info));
  },
  onTerminalExit: (callback) => {
    ipcRenderer.on("terminal:exit", (_event, info) => callback(info));
  },

  // Backend status
  isBackendReady: () => ipcRenderer.invoke("app:isBackendReady"),
  getBackendStatus: () => ipcRenderer.invoke("app:backendStatus"),
  restartBackend: () => ipcRenderer.invoke("app:restartBackend"),

  // Python dependency bootstrap — the app checks every requirement on launch
  // and installs whatever is missing (torch, safetensors, …) into its own
  // environment when the user allows it.
  getDepsStatus: () => ipcRenderer.invoke("deps:status"),
  checkDeps: () => ipcRenderer.invoke("deps:check"),
  installDeps: () => ipcRenderer.invoke("deps:install"),
  continueWithoutDeps: () => ipcRenderer.invoke("deps:continue"),
  getPython: () => ipcRenderer.invoke("deps:getPython"),
  quitApp: () => ipcRenderer.invoke("app:quit"),
  onDepsStatus: (callback) => {
    ipcRenderer.on("deps:status", (_event, status) => callback(status));
  },
  onDepsProgress: (callback) => {
    ipcRenderer.on("deps:progress", (_event, data) => callback(data));
  },

  // Backend lifecycle events
  onBackendStatus: (callback) => {
    ipcRenderer.on("backend:status", (_event, status) => callback(status));
  },

  // Platform
  getPlatform: () => ipcRenderer.invoke("app:getPlatform"),

  // Settings store — durable in the main process (userData/settings.json) so
  // preferences survive a reinstall and the backend spawn can read them.
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSetting: (key, value) => ipcRenderer.invoke("settings:set", key, value),
  resetSettings: () => ipcRenderer.invoke("settings:reset"),

  // Hardware info
  getHardwareInfo: () => ipcRenderer.invoke("app:hardwareInfo"),

  // Model downloads
  downloadModel: (url, filename) => ipcRenderer.invoke("model:download", { url, filename }),
  getDownloads: () => ipcRenderer.invoke("model:getDownloads"),

  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke("app:checkUpdates"),
  getAppVersion: () => ipcRenderer.invoke("app:version"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),

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
  onDownloadProgress: (callback) => {
    ipcRenderer.on("model:download-progress", (_event, data) => callback(data));
  },
});
