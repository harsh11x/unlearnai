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
      // Required for Firebase Auth (which checks location.protocol)
      // Firebase needs http/https, but Electron loads via file:// by default
      webSecurity: false,
    },
  });

  // Serve renderer via local HTTP server so Firebase Auth works
  // (Firebase requires http/https protocol, not file://)
  const http = require("http");
  const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, "renderer", req.url === "/" ? "index.html" : req.url);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
      ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
      ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
    };
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
  server.listen(0, "localhost", () => {
    const port = server.address().port;
    mainWindow.loadURL(`http://localhost:${port}/`);
  });

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
    // No filters — on macOS the default filter greys out non-matching files.
    // We accept any file and let the Python backend validate the format.
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
  const folderPath = result.filePaths[0];
  const folderName = path.basename(folderPath);
  return {
    path: folderPath,
    name: folderName,
    size: 0,
    isDirectory: true,
  };
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

// ── Hardware Info ──

ipcMain.handle("app:hardwareInfo", () => {
  const os = require("os");
  const totalRAM = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const freeRAM = Math.round(os.freemem() / (1024 * 1024 * 1024));
  const cpus = os.cpus();
  const platform = process.platform;
  const arch = process.arch;

  return {
    platform,
    arch,
    totalRAM,
    freeRAM,
    cpuCount: cpus.length,
    cpuModel: cpus.length > 0 ? cpus[0].model : "unknown",
    cpuSpeed: cpus.length > 0 ? cpus[0].speed : 0,
    platformName: platform === "darwin" ? "macOS" : platform === "win32" ? "Windows" : "Linux",
  };
});

// ── Model Download ──

const https = require("https");
const http = require("http");
const { app: appUtil } = require("electron");

const downloadProgress = new Map();

ipcMain.handle("model:download", async (_event, { url, filename }) => {
  const downloadsDir = path.join(appUtil.getPath("home"), "Downloads", "remap-studio-models");
  fs.mkdirSync(downloadsDir, { recursive: true });

  const destPath = path.join(downloadsDir, filename);
  const downloadId = `dl_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const makeRequest = (requestUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error("Too many redirects"));
        return;
      }

      protocol.get(requestUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          makeRequest(response.headers.location, redirectCount + 1);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
        let downloadedBytes = 0;
        const fileStream = fs.createWriteStream(destPath);

        downloadProgress.set(downloadId, { destPath, totalBytes, downloadedBytes, filename, status: "downloading" });

        response.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
          downloadProgress.set(downloadId, { destPath, totalBytes, downloadedBytes, filename, status: "downloading", progress });

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("model:download-progress", {
              id: downloadId,
              filename,
              progress,
              downloadedBytes,
              totalBytes,
            });
          }
        });

        response.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          downloadProgress.set(downloadId, { destPath, totalBytes, downloadedBytes: totalBytes, filename, status: "completed", progress: 100 });
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("model:download-progress", { id: downloadId, filename, progress: 100, downloadedBytes: totalBytes, totalBytes, status: "completed" });
          }
          resolve({ id: downloadId, path: destPath, size: totalBytes });
        });

        fileStream.on("error", (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }).on("error", (err) => {
        reject(err);
      });
    };

    makeRequest(url);
  });
});

ipcMain.handle("model:getDownloads", () => {
  const downloadsDir = path.join(appUtil.getPath("home"), "Downloads", "remap-studio-models");
  if (!fs.existsSync(downloadsDir)) return [];
  return fs.readdirSync(downloadsDir).filter(f => f.endsWith(".gguf") || f.endsWith(".safetensors") || f.endsWith(".bin") || f.endsWith(".pt") || f.endsWith(".pth")).map(f => {
    const stat = fs.statSync(path.join(downloadsDir, f));
    return { name: f, size: stat.size, path: path.join(downloadsDir, f), modified: stat.mtime };
  });
});

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
