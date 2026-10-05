const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn, execFileSync } = require("child_process");

// Development only: keep requestAnimationFrame and renderer timers alive even
// when the window is behind other apps, so automated CDP probes (fps readout,
// device monitor, unlearn progress) see live values. Packaged builds keep the
// default power-saving throttling.
if (process.env.NODE_ENV === "development") {
  app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
  app.commandLine.appendSwitch("disable-renderer-backgrounding");
  app.commandLine.appendSwitch("disable-background-timer-throttling");
}

let mainWindow;
let httpPort = 0;
let pythonProcess = null;
let rpcId = 0;
let rpcCallbacks = new Map();
let backendReady = false;
let pendingQueue = [];
let backendPythonCmd = null;   // resolved interpreter used to spawn the backend
let backendScriptPath = null;  // server.py that was launched
let backendLastError = null;   // last startup/exit error, surfaced in UI
const queueWaiters = new Map(); // id → { timer, resolve, reject } while backend is starting

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
      // Dev verification drives the UI over CDP while the window is occluded;
      // never background-throttle the page in development.
      ...(process.env.NODE_ENV === "development" ? { backgroundThrottling: false } : {}),
    },
  });  // Block all window.open from renderer — auth is handled via IPC now
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });

  // Serve renderer via local HTTP server so Firebase Auth works
  // (Firebase requires http/https protocol, not file://)
  // PERF: cache static assets (logo, css, js) so relaunches and navigations
  // don't re-read them from disk every time.
  const httpModule = require("http");
  const server = httpModule.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost`);
    const urlPath = parsedUrl.pathname;

    // ── Static file serving ──
    const filePath = path.join(__dirname, "renderer", urlPath === "/" ? "index.html" : urlPath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
      ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
      ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
    };
    const isStatic = filePath !== path.join(__dirname, "renderer", "index.html");
    const headers = { "Content-Type": mimeTypes[ext] || "application/octet-stream" };
    if (isStatic) {
      // In development a 5-minute cache means an edited app.js/nn3d.js keeps
      // being served from cache even after a reload, which is very confusing.
      // Cache aggressively only in the packaged app, where the bytes on disk
      // never change underfoot.
      headers["Cache-Control"] = app.isPackaged
        ? "private, max-age=300"
        : "no-store, must-revalidate";
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        const indexPath = path.join(__dirname, "renderer", "index.html");
        fs.readFile(indexPath, (err2, indexData) => {
          if (err2) { res.writeHead(404); res.end(); return; }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(indexData);
        });
        return;
      }
      res.writeHead(200, headers);
      res.end(data);
    });
  });
  server.listen(0, "localhost", () => {
    httpPort = server.address().port;
    mainWindow.loadURL(`http://localhost:${httpPort}/`);
  });

  // Start Python backend
  startPythonBackend();
}

// ══════════════════════════════════════════
// PYTHON BACKEND MANAGEMENT
// ══════════════════════════════════════════

function startPythonBackend() {
  // Restart support: clean up any previous backend first so we never end up
  // with two Pythons fighting over stdin/stdout.
  if (pythonProcess) {
    try { pythonProcess.kill("SIGTERM"); } catch (e) { /* already dead */ }
    pythonProcess = null;
  }
  backendReady = false;

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
  backendScriptPath = backendPath;

  if (!fs.existsSync(backendPath)) {
    backendLastError = `Backend script missing: ${backendPath}`;
    console.error("[Backend]", backendLastError);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("backend:log", `[error] ${backendLastError}`);
    }
    return;
  }

  // Finder-launched apps get a minimal PATH (/usr/bin:/bin:...) that usually
  // misses python3 installed via Homebrew (/opt/homebrew/bin, /usr/local/bin)
  // or pyenv. Probe candidates and use the first one that exists.
  const candidates = process.platform === "win32"
    ? ["python"]
    : [
        process.env.PYTHON_PATH || "python3",
        "/opt/homebrew/bin/python3",
        "/usr/local/bin/python3",
        "/usr/bin/python3",
        "/opt/local/bin/python3",
      ];
  let pythonCmd = candidates[0];
  for (const c of candidates) {
    if (c.includes("/")) {
      try { if (fs.existsSync(c)) { pythonCmd = c; break; } } catch (e) { /* ignore */ }
    }
  }
  backendPythonCmd = pythonCmd;
  console.log("[Backend] Using python:", pythonCmd);

  try {
    pythonProcess = spawn(pythonCmd, [backendPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      PATH: [
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
        process.env.PATH || "",
      ].join(":"),
      PYTHONUNBUFFERED: "1",
    },
  });
  } catch (err) {
    backendLastError = `Failed to spawn ${pythonCmd}: ${err.message}`;
    console.error("[Backend]", backendLastError);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("backend:log", `[error] ${backendLastError}`);
    }
    return;
  }

  // ── stdout framing ──
  // Responses are newline-delimited JSON, but a single response can be far
  // larger than one pipe chunk (a 291-tensor GGUF model returns ~176 KB, and
  // pipes deliver ~64 KB at a time). Parsing each chunk on its own therefore
  // fails on every fragment and the response is dropped — the RPC then hangs
  // until its timeout and the model never appears, even though the backend
  // answered correctly. So: accumulate into a buffer and only parse complete,
  // newline-terminated lines.
  let stdoutBuffer = "";
  const MAX_STDOUT_BUFFER = 256 * 1024 * 1024; // guard against a runaway writer

  pythonProcess.stdout.on("data", (data) => {
    stdoutBuffer += data.toString();

    let newlineIdx;
    while ((newlineIdx = stdoutBuffer.indexOf("\n")) >= 0) {
      const line = stdoutBuffer.slice(0, newlineIdx).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIdx + 1);
      if (!line) continue;

      try {
        handleBackendResponse(JSON.parse(line));
      } catch (e) {
        // Genuinely non-JSON output from Python (print statements, warnings).
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("backend:log", line.slice(0, 2000));
        }
      }
    }

    // A single line should never approach this; if it does, the backend is
    // emitting something pathological and holding it all would exhaust memory.
    if (stdoutBuffer.length > MAX_STDOUT_BUFFER) {
      backendLastError = "Backend produced an oversized response; stream reset.";
      console.error("[Backend]", backendLastError);
      stdoutBuffer = "";
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("backend:log", `[error] ${backendLastError}`);
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

  const proc = pythonProcess; // captured so a restart's new spawn isn't clobbered by this handler
  pythonProcess.on("exit", (code) => {
    if (pythonProcess !== proc) return; // stale-process event
    console.log(`Python backend exited with code ${code}`);
    backendReady = false;
    pythonProcess = null;
    // Fail anything that was queued or in-flight — callers must not hang on a
    // backend that just died.
    for (const [, w] of queueWaiters) { clearTimeout(w.timer); w.reject(new Error("Python backend exited before it became ready")); }
    queueWaiters.clear();
    for (const [, cb] of rpcCallbacks) cb.reject(new Error("Python backend exited while handling the request"));
    rpcCallbacks.clear();
    pendingQueue = [];
    if (code !== 0 && code !== null) {
      backendLastError = `Python backend exited with code ${code}. Check that Python 3 and required packages (torch, safetensors, psutil) are installed.`;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("backend:log", `[error] ${backendLastError || `Python backend exited with code ${code}`}`);
      mainWindow.webContents.send("backend:status", { ready: false, error: backendLastError });
    }
  });

  pythonProcess.on("error", (err) => {
    if (pythonProcess !== proc) return; // stale-process event
    console.error("Failed to start Python backend:", err.message);
    backendReady = false;
    backendLastError = `Failed to start Python backend: ${err.message}. Install Python 3 and run: pip install torch safetensors psutil h5py pyyaml`;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("backend:log", `[error] ${backendLastError}`);
      mainWindow.webContents.send("backend:status", { ready: false, error: backendLastError });
    }
  });
}

function handleBackendResponse(response) {
  if (response.method === "ready") {
    // Backend is ready
    backendReady = true;
    backendLastError = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("backend:ready", response.params);
    }
    // Flush pending queue — reconnect each waiter's promise to the real RPC
    // so queued callers resolve with the actual response (they used to be
    // left hanging until the ready-timer fired).
    for (const pending of pendingQueue) {
      const waiter = queueWaiters.get(pending.id);
      sendToBackend(pending.method, pending.params, pending.id)
        .then((result) => waiter && waiter.resolve(result))
        .catch((err) => waiter && waiter.reject(err));
      if (waiter) {
        clearTimeout(waiter.timer);
        queueWaiters.delete(pending.id);
      }
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
    const reqId = id || ++rpcId;

    if (!backendReady || !pythonProcess) {
      // Queue the request; it is flushed when the backend signals ready.
      pendingQueue.push({ method, params, id: reqId });
      const timer = setTimeout(() => {
        queueWaiters.delete(reqId);
        if (!backendReady) {
          reject(new Error(
            "Python backend not available — it needs Python 3 with torch, safetensors and psutil installed. " +
            "See Settings → Backend for status, or Restart Backend after installing."
          ));
        }
      }, 15000);
      queueWaiters.set(reqId, { timer, resolve, reject });
      return;
    }

    rpcCallbacks.set(reqId, { resolve, reject });

    const request = JSON.stringify({ jsonrpc: "2.0", method, params, id: reqId }) + "\n";
    pythonProcess.stdin.write(request);

    // Loading large models (multi-GB safetensors) can legitimately take
    // minutes; everything else keeps a tighter bound.
    const timeoutMs = method.startsWith("model_load") ? 300000 : 60000;
    // The timer must not hold the process open on its own.
    const timer = setTimeout(() => {
      if (rpcCallbacks.has(reqId)) {
        rpcCallbacks.delete(reqId);
        reject(new Error(`RPC timeout for method: ${method}`));
      }
    }, timeoutMs);
    if (typeof timer.unref === "function") timer.unref();
  });
}

// ══════════════════════════════════════════
// SYSTEM TERMINAL
// ══════════════════════════════════════════
// The terminal pane runs the user's real shell (zsh/bash on macOS & Linux,
// PowerShell or cmd on Windows) in the main process and streams it to the
// renderer over IPC. It is deliberately native-module-free (no node-pty) so
// the identical code builds and ships for macOS and Windows; the trade-off of
// pipes instead of a PTY is that full-screen TUI apps do not work, while every
// ordinary command, `cd`, environment variable and exit status behaves exactly
// like the system terminal.
//
// Interactive shells print prompts to stderr. Right after start-up we inject a
// prompt carrying a `__REMAP_CWD__…__END__` marker, so the renderer can track
// the working directory (and strip the prompt instead of showing shell noise).
// Shells whose prompt ignores the injection fall back to raw output.
const os = require("os");
const { StringDecoder } = require("string_decoder");

const CWD_MARK_START = "__REMAP_CWD__";
const CWD_MARK_END = "__END__";

let terminalProc = null;
let terminalSeq = 0;
let terminalSession = null; // { id, shell, cwd, alive }

function pathHasExecutable(exe) {
  const dirs = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  return dirs.some((dir) => {
    try { return fs.existsSync(path.join(dir, exe)); } catch (e) { return false; }
  });
}

function unixShellSpec() {
  let loginShell = null;
  try { loginShell = os.userInfo().shell; } catch (e) { /* not available */ }
  const shell = [process.env.SHELL, loginShell, "/bin/zsh", "/bin/bash", "/bin/sh"]
    .filter(Boolean)[0];
  const name = path.basename(shell).toLowerCase();
  if (name.includes("zsh")) {
    return { cmd: shell, args: ["-i"], setup: "PS1='" + CWD_MARK_START + "%~" + CWD_MARK_END + " '; RPROMPT=''; PROMPT2='';\n" };
  }
  if (name.includes("bash")) {
    return { cmd: shell, args: ["-i"], setup: "PS1='" + CWD_MARK_START + "\\w" + CWD_MARK_END + " '; PS2='';\n" };
  }
  // fish, sh, dash, …: run them, but their prompt cannot be redefined in one
  // line — the renderer's fallback mode simply shows their output as-is.
  return { cmd: shell, args: ["-i"], setup: "" };
}

function windowsShellSpec() {
  const promptSetup = "function prompt { \"" + CWD_MARK_START + "$($executionContext.SessionState.Path.CurrentLocation)" + CWD_MARK_END + "\" }\n";
  if (pathHasExecutable("pwsh.exe")) {
    return { cmd: "pwsh.exe", args: ["-NoLogo", "-NoProfile", "-Command", "-"], setup: promptSetup };
  }
  if (pathHasExecutable("powershell.exe")) {
    return { cmd: "powershell.exe", args: ["-NoLogo", "-NoProfile", "-Command", "-"], setup: promptSetup };
  }
  return { cmd: process.env.ComSpec || "cmd.exe", args: ["/Q", "/D"], setup: "" };
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function startTerminalSession(opts = {}) {
  if (terminalProc && terminalProc.exitCode === null && !opts.force) {
    return { ok: true, already: true, ...terminalSession };
  }
  stopTerminalSession();

  const cwd = opts.cwd && fs.existsSync(opts.cwd) ? opts.cwd : os.homedir();
  const spec = process.platform === "win32" ? windowsShellSpec() : unixShellSpec();
  const id = ++terminalSeq;
  const shellName = path.basename(spec.cmd);

  let proc;
  try {
    proc = spawn(spec.cmd, spec.args, {
      cwd,
      env: {
        ...process.env,
        TERM: "dumb",
        // Plain-text output only: pagers would wait for keypresses that a
        // pipe-driven terminal can never send.
        PAGER: "cat",
        GIT_PAGER: "cat",
        REMAP_STUDIO_TERMINAL: "1",
      },
      stdio: ["pipe", "pipe", "pipe"],
      // Own process group on Unix, so Ctrl+C can signal the shell *and* the
      // command it is currently running, not the whole Electron app.
      detached: process.platform !== "win32",
      windowsHide: true,
    });
  } catch (err) {
    sendToRenderer("terminal:exit", { id, code: null, error: `Failed to start ${spec.cmd}: ${err.message}` });
    return { ok: false, error: err.message };
  }

  terminalProc = proc;
  terminalSession = { id, shell: shellName, cwd, alive: true };
  proc.__terminalId = id;

  // StringDecoder keeps multi-byte characters intact when a chunk splits one.
  const outDecoder = new StringDecoder("utf8");
  const errDecoder = new StringDecoder("utf8");
  proc.stdout.on("data", (chunk) => sendToRenderer("terminal:data", { id, stream: "stdout", chunk: outDecoder.write(chunk) }));
  proc.stderr.on("data", (chunk) => sendToRenderer("terminal:data", { id, stream: "stderr", chunk: errDecoder.write(chunk) }));

  proc.on("error", (err) => {
    if (proc.__terminalId !== id) return;
    terminalProc = null;
    terminalSession = null;
    sendToRenderer("terminal:exit", { id, code: null, error: `Failed to start ${spec.cmd}: ${err.message}` });
  });

  proc.on("exit", (code, signal) => {
    if (proc.__terminalId !== id) return;
    terminalProc = null;
    terminalSession = null;
    sendToRenderer("terminal:exit", { id, code, signal });
  });

  if (spec.setup) {
    try { proc.stdin.write(spec.setup); } catch (e) { /* stdin already closed */ }
  }
  sendToRenderer("terminal:ready", { id, shell: shellName, cwd });
  return { ok: true, id, shell: shellName, cwd };
}

function stopTerminalSession() {
  const proc = terminalProc;
  if (!proc) return;
  terminalProc = null;
  terminalSession = null;
  proc.__terminalId = -1; // its exit event is stale from here on
  try {
    if (process.platform === "win32") proc.kill();
    else {
      try { process.kill(-proc.pid, "SIGTERM"); } catch (e) { proc.kill("SIGTERM"); }
    }
  } catch (e) { /* already gone */ }
}

function terminalInput(data) {
  // Typing after the shell exited restarts it instead of swallowing the line.
  if (!terminalProc) startTerminalSession();
  if (terminalProc) {
    try { terminalProc.stdin.write(String(data)); } catch (e) { /* ignore */ }
  }
}

// Direct children of the shell, i.e. the command currently running. Returns
// null when the platform utility is unavailable, so the caller can fall back.
function shellChildren(pid) {
  for (const exe of ["/usr/bin/pgrep", "/bin/pgrep", "pgrep"]) {
    try {
      const out = execFileSync(exe, ["-P", String(pid)], {
        encoding: "utf8", timeout: 1500, stdio: ["ignore", "pipe", "ignore"],
      });
      return out.split("\n").map((line) => parseInt(line.trim(), 10)).filter((n) => Number.isInteger(n) && n > 0);
    } catch (e) {
      if (e && e.status === 1) return []; // pgrep found nothing, binary works
    }
  }
  return null;
}

function interruptTerminal() {
  const proc = terminalProc;
  if (!proc) return { ok: false, reason: "no-session" };
  if (process.platform === "win32") return { ok: false, reason: "unsupported-platform" };

  // Nothing running: a real terminal's Ctrl+C at an idle prompt only prints
  // ^C. Signalling the shell here would make zsh discard the next command
  // line it reads from the pipe, so skip the signal and report success.
  const children = shellChildren(proc.pid);
  if (Array.isArray(children) && children.length === 0) return { ok: true, idle: true };

  try {
    process.kill(-proc.pid, "SIGINT");
    return { ok: true, signal: "group" };
  } catch (e) {
    try { proc.kill("SIGINT"); return { ok: true, signal: "shell" }; } catch (e2) { return { ok: false, reason: e2.message }; }
  }
}

// ══════════════════════════════════════════
// IPC HANDLERS — Renderer ↔ Main ↔ Python
// ══════════════════════════════════════════

// File dialogs
ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open Model File",
    // "All Files" first = default filter. Users can open ANY file (universal
    // ML/DL/NLP/LLM support); specific filters are still available in the dropdown.
    filters: [
      { name: "All Files", extensions: ["*"] },
      { name: "All Model Files", extensions: [
        "safetensors", "pt", "pth", "bin", "ckpt",
        "gguf", "onnx", "h5", "hdf5", "pb", "tflite",
        "pkl", "pickle", "joblib", "npy", "npz",
        "ipynb", "json", "yaml", "yml",
        "mlmodel", "mlpackage", "weights", "dat",
        "model", "caffemodel",
      ]},
      { name: "Safetensors", extensions: ["safetensors"] },
      { name: "PyTorch", extensions: ["pt", "pth", "bin", "ckpt"] },
      { name: "GGUF", extensions: ["gguf"] },
      { name: "ONNX", extensions: ["onnx"] },
      { name: "HDF5 / Keras", extensions: ["h5", "hdf5"] },
      { name: "TensorFlow", extensions: ["pb", "tflite"] },
      { name: "Pickle / Joblib", extensions: ["pkl", "pickle", "joblib"] },
      { name: "NumPy", extensions: ["npy", "npz"] },
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
    return result;
  } catch (e) {
    return { error: e.message };
  }
});

// System terminal — the renderer starts the shell, writes command lines and
// receives raw output; the shell itself lives in this process.
ipcMain.handle("terminal:start", (_event, opts) => startTerminalSession(opts || {}));
ipcMain.handle("terminal:restart", (_event, opts) => startTerminalSession({ ...(opts || {}), force: true }));
ipcMain.handle("terminal:interrupt", () => interruptTerminal());
ipcMain.on("terminal:input", (_event, data) => terminalInput(data));

ipcMain.handle("app:getPlatform", () => process.platform);

ipcMain.handle("app:isBackendReady", () => backendReady);

// Full status incl. the resolved interpreter and the last startup error —
// used by the Backend settings page so failures are visible in the UI.
ipcMain.handle("app:backendStatus", () => ({
  ready: backendReady,
  python: backendPythonCmd,
  script: backendScriptPath,
  lastError: backendLastError,
}));

// Restart the backend (e.g. after installing missing Python packages).
ipcMain.handle("app:restartBackend", () => {
  backendLastError = null;
  startPythonBackend();
  return { ok: true };
});

// ── App Version ──
ipcMain.handle("app:version", () => app.getVersion());

// ── Open External URL ──
ipcMain.handle("app:openExternal", (_event, url) => {
  shell.openExternal(url);
});

// ── Auto-Update Check ──
ipcMain.handle("app:checkUpdates", async () => {
  const httpModule = require("http");
  const updateUrl = `http://13.204.245.212:3001/api/update/check?version=${app.getVersion()}&platform=${process.platform}&arch=${process.arch}`;

  return new Promise((resolve) => {
    const req = httpModule.get(updateUrl, { rejectUnauthorized: false }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ updateAvailable: false });
        }
      });
    });
    req.on("error", () => resolve({ updateAvailable: false }));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ updateAvailable: false });
    });
  });
});

// ── Hardware Info ──
//
// Real CPU load comes from differencing os.cpus() cumulative tick counters
// between samples (the technique `top` uses). The old implementation derived a
// number from cpuSpeed — a constant clock frequency — so it reported the same
// meaningless value forever and never matched the screenshot complaint: it is
// the real-time data of the machine that matters.

let _lastCpuSample = null;

function sampleCpu() {
  const cores = require("os").cpus();
  let idle = 0;
  let total = 0;
  for (const core of cores) {
    for (const type of Object.keys(core.times)) total += core.times[type];
    idle += core.times.idle;
  }
  return { idle, total };
}

/**
 * CPU busy percentage since the previous call.
 * Returns null on the first call (no baseline yet) so the UI can show "—"
 * instead of inventing a number.
 */
function cpuUsagePercent() {
  const now = sampleCpu();
  if (!_lastCpuSample) {
    _lastCpuSample = now;
    return null;
  }
  const idleDelta = now.idle - _lastCpuSample.idle;
  const totalDelta = now.total - _lastCpuSample.total;
  _lastCpuSample = now;
  if (totalDelta <= 0) return null;
  return Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100));
}

ipcMain.handle("app:hardwareInfo", () => {
  const os = require("os");
  const totalBytes = os.totalmem() || 0;
  const freeBytes = os.freemem() || 0;
  const cpus = os.cpus();
  const platform = process.platform;
  const arch = process.arch;
  const GB = 1024 * 1024 * 1024;

  return {
    platform,
    arch,
    // `totalRAM`/`freeRAM` stay in whole GB: the model catalog's "can this
    // machine run it" heuristics are written against those units. The precise
    // byte fields below drive the live status-bar gauges.
    totalRAM: Math.round(totalBytes / GB),
    freeRAM: Math.round(freeBytes / GB),
    totalRAMBytes: totalBytes,
    freeRAMBytes: freeBytes,
    ramUsedBytes: totalBytes - freeBytes,
    // null until a second sample exists — the UI shows "—" rather than a
    // fabricated number.
    cpuUsagePercent: cpuUsagePercent(),
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
  const _modelExts = [".gguf", ".safetensors", ".bin", ".pt", ".pth", ".ckpt", ".onnx", ".h5", ".hdf5", ".pkl", ".npy", ".npz", ".pb", ".tflite"];
  return fs.readdirSync(downloadsDir).filter(f => _modelExts.some(ext => f.endsWith(ext))).map(f => {
    const stat = fs.statSync(path.join(downloadsDir, f));
    return { name: f, size: stat.size, path: path.join(downloadsDir, f), modified: stat.mtime };
  });
});

// ── App Lifecycle ──

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  // Kill the user's shell and the Python backend
  stopTerminalSession();
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
  stopTerminalSession();
  if (pythonProcess) {
    pythonProcess.kill("SIGTERM");
    pythonProcess = null;
  }
});
