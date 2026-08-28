const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let mainWindow;
let pythonProcess = null;
let rpcId = 0;
let rpcCallbacks = new Map();
let backendReady = false;
let pendingQueue = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 10 },
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  // Start Python backend
  startPythonBackend();
}

// ══════════════════════════════════════════
// PYTHON BACKEND MANAGEMENT
// ══════════════════════════════════════════

function startPythonBackend() {
  // In dev: __dirname = shared/, backend = ../backend/
  // In production (asar): backend is copied to Resources/backend/
  let backendPath;
  if (app.isPackaged) {
    // Production: look in Resources directory
    backendPath = path.join(process.resourcesPath, "backend", "server.py");
  } else {
    // Development
    backendPath = path.join(__dirname, "..", "backend", "server.py");
  }

  // Try to find python3 first, then python
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  pythonProcess = spawn(pythonCmd, [backendPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1",
    },
  });

  pythonProcess.stdout.on("data", (data) => {
    const lines = data.toString().split("\n").filter((l) => l.trim());
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        handleBackendResponse(response);
      } catch (e) {
        // Non-JSON output from Python (print statements, etc.)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("backend:log", line);
        }
      }
    }
  });

  pythonProcess.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) {
      console.error("[Python]", msg);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("backend:log", `[stderr] ${msg}`);
      }
    }
  });

  pythonProcess.on("exit", (code) => {
    console.log(`Python backend exited with code ${code}`);
    backendReady = false;
    pythonProcess = null;
  });

  pythonProcess.on("error", (err) => {
    console.error("Failed to start Python backend:", err.message);
    backendReady = false;
  });
}

function handleBackendResponse(response) {
  if (response.method === "ready") {
    // Backend is ready
    backendReady = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("backend:ready", response.params);
    }
    // Flush pending queue
    for (const pending of pendingQueue) {
      sendToBackend(pending.method, pending.params, pending.id);
    }
    pendingQueue = [];
    return;
  }

  // Handle RPC response
  if (response.id !== undefined && rpcCallbacks.has(response.id)) {
    const { resolve, reject } = rpcCallbacks.get(response.id);
    rpcCallbacks.delete(response.id);

    if (response.error) {
      reject(new Error(response.error));
    } else {
      resolve(response.result);
    }
  }

  // Forward progress updates to renderer
  if (response.method === "unlearn:progress") {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("unlearn:progress", response.params);
    }
  }
}

function sendToBackend(method, params = {}, id = null) {
  return new Promise((resolve, reject) => {
    if (!backendReady || !pythonProcess) {
      pendingQueue.push({ method, params, id: id || ++rpcId });
      // If backend never started, reject
      setTimeout(() => {
        if (!backendReady) reject(new Error("Python backend not available"));
      }, 10000);
      return;
    }

    const reqId = id || ++rpcId;
    rpcCallbacks.set(reqId, { resolve, reject });

    const request = JSON.stringify({ jsonrpc: "2.0", method, params, id: reqId }) + "\n";
    pythonProcess.stdin.write(request);

    // Timeout after 60 seconds
    setTimeout(() => {
      if (rpcCallbacks.has(reqId)) {
        rpcCallbacks.delete(reqId);
        reject(new Error(`RPC timeout for method: ${method}`));
      }
    }, 60000);
  });
}

// ══════════════════════════════════════════
// IPC HANDLERS — Renderer ↔ Main ↔ Python
// ══════════════════════════════════════════

// File dialogs
ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open Model File",
    filters: [
      { name: "Safetensors", extensions: ["safetensors"] },
      { name: "PyTorch Checkpoint", extensions: ["pt", "pth", "bin"] },
      { name: "ONNX Model", extensions: ["onnx"] },
      { name: "JSON Config", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });

  if (result.canceled) return null;

  const filePath = result.filePaths[0];
  const stats = fs.statSync(filePath);

  return {
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
    modified: stats.mtime,
  };
});

ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open Model Directory",
    properties: ["openDirectory"],
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("dialog:saveFile", async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Export Model",
    filters: [
      { name: "Safetensors", extensions: ["safetensors"] },
      { name: "PyTorch Checkpoint", extensions: ["pt"] },
    ],
  });

  if (result.canceled) return null;
  return result.filePath;
});

// Backend RPC proxy — renderer calls these, they forward to Python
ipcMain.handle("rpc", async (_event, method, params) => {
  try {
    const result = await sendToBackend(method, params);
    return { result };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle("app:getPlatform", () => process.platform);

ipcMain.handle("app:isBackendReady", () => backendReady);

// ── App Lifecycle ──

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  // Kill Python backend
  if (pythonProcess) {
    pythonProcess.kill("SIGTERM");
    pythonProcess = null;
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  if (pythonProcess) {
    pythonProcess.kill("SIGTERM");
    pythonProcess = null;
  }
});
