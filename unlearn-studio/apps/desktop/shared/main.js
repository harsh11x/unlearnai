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
let depsRecheckedAfterCrash = false; // one crash-triggered dependency re-check per session
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

  // Check the Python environment first (every launch), then either start the
  // backend silently or ask the user to allow an automatic install.
  initializeBackendDependencies();
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

  // The interpreter comes from the dependency bootstrap (app-owned venv, or a
  // system interpreter whose requirements are all satisfied). Until that check
  // finishes, fall back to the first existing candidate so an early manual
  // restart still does something sensible.
  // Finder-launched apps get a minimal PATH (/usr/bin:/bin:...) that usually
  // misses python3 installed via Homebrew (/opt/homebrew/bin, /usr/local/bin)
  // or pyenv — hence the absolute-path candidates.
  let pythonCmd = depsState.python;
  let pythonArgs = depsState.pythonArgs || [];
  if (!pythonCmd) {
    const candidates = pythonCandidates();
    let chosen = candidates.find((c) => c.cmd.includes("/") && fs.existsSync(c.cmd));
    if (!chosen) chosen = candidates[candidates.length - 1];
    pythonCmd = chosen.cmd;
    pythonArgs = chosen.args || [];
  }
  backendPythonCmd = pythonCmd;
  console.log("[Backend] Using python:", pythonCmd, pythonArgs.join(" "));

  try {
    pythonProcess = spawn(pythonCmd, [...pythonArgs, backendPath], {
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
      ...(depsState.pythonPath ? { PYTHONPATH: depsState.pythonPath } : {}),
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
      backendLastError = `Python backend exited with code ${code}. Missing or conflicting Python packages — open Settings → Backend and install them.`;
      // A backend that dies on startup is usually an environment problem (a
      // package the probe cannot see, e.g. imported lazily at runtime). Re-run
      // the check once per session so the setup dialog can offer the fix — but
      // never in a loop, or a genuine crash would restart the app forever.
      if (depsState.status === "ok" && !depsRecheckedAfterCrash) {
        depsRecheckedAfterCrash = true;
        setTimeout(() => { initializeBackendDependencies(); }, 500);
      }
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
    backendLastError = `Failed to start Python backend: ${err.message}. Install Python 3, then use Settings → Backend → Install packages.`;
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
            "Python backend not available — its Python packages are missing or broken. " +
            "Use the setup dialog or Settings → Backend → Install packages."
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
// PYTHON DEPENDENCY BOOTSTRAP
// ══════════════════════════════════════════
// New users used to get a degraded/broken backend because the app ran on
// whatever `python3` happened to be on PATH — an interpreter that may be
// missing torch/safetensors or carry a conflicting numpy/torch pair — and the
// shipped requirements.txt was read by nothing at all.
//
// Now the app owns its Python environment and makes it a precondition for
// starting the backend:
//   1. every launch probes the chosen interpreter for every requirement in
//      requirements.txt, checking the installed version AND actually importing
//      the module (an ABI/version conflict shows up as an import failure);
//   2. everything satisfied → start the backend on that interpreter, silently;
//   3. anything missing or broken → the renderer shows a modal listing exactly
//      what is wrong, with Allow / Close the application;
//   4. Allow → create <appData>/Remap Studios/python-env (a real venv, so
//      installs never fight the user's global site-packages) and pip install
//      the whole requirements.txt with streamed progress, then start the
//      backend from that environment.
//
// Env overrides (used by the verification harness):
//   REMAP_PYTHON      force the interpreter to check/spawn with (skips env reuse)
//   REMAP_PYTHON_ENV  force the app-owned environment directory

const PROBE_MARKER = "__REMAP_PROBE__";
const VENV_DIR_NAME = "python-env";
const INSTALL_TIMEOUT_MS = 30 * 60 * 1000;

// Distribution name → import name, where they differ (pip name vs module name).
const MODULE_ALIASES = {
  pyyaml: "yaml", pillow: "PIL", "opencv-python": "cv2", "scikit-learn": "sklearn",
  "python-dateutil": "dateutil", "huggingface-hub": "huggingface_hub",
};

const PROBE_SCRIPT = [
  "import json, sys, importlib, importlib.metadata as md",
  "reqs = json.loads(sys.argv[1])",
  'report = {"exe": sys.executable, "python": sys.version.split()[0], "platform": sys.platform, "packages": []}',
  "for r in reqs:",
  '    entry = {"name": r["name"], "module": r["module"], "version": None, "import_error": None}',
  "    try:",
  '        entry["version"] = md.version(r["name"])',
  "    except Exception:",
  '        entry["version"] = None',
  '    if entry["version"] is not None:',
  "        try:",
  '            importlib.import_module(r["module"])',
  "        except BaseException as e:",
  '            entry["import_error"] = ("%s: %s" % (type(e).__name__, e))[:400].replace("\\n", " ")',
  '    report["packages"].append(entry)',
  `sys.stdout.write("${PROBE_MARKER}" + json.dumps(report) + "\\n")`,
  "sys.stdout.flush()",
].join("\n");

let depsState = {
  status: "unknown",   // unknown | checking | ok | missing | installing | failed
  python: null,        // interpreter the backend will run on
  pythonArgs: [],
  pythonVersion: null,
  envKind: null,       // app-env | system | target-dir
  envPath: null,
  pythonPath: null,    // PYTHONPATH for target-dir installs
  basePython: null,    // interpreter used to build the venv
  basePythonArgs: [],
  basePythonVersion: null,
  requirements: [],
  missing: [],
  detail: "",
  progress: null,
  log: [],
};

function requirementsPath() {
  const candidates = app.isPackaged
    ? [path.join(process.resourcesPath, "backend", "requirements.txt")]
    : [
        path.join(__dirname, "..", "backend", "requirements.txt"),
        path.join(process.resourcesPath || "", "backend", "requirements.txt"),
      ];
  for (const c of candidates) {
    try { if (c && fs.existsSync(c)) return c; } catch (e) { /* ignore */ }
  }
  return candidates[0];
}

function parseRequirements(text) {
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const body = raw.split("#")[0].trim();
    if (!body) continue;
    const m = body.match(/^([A-Za-z0-9._-]+)\s*(?:\[[^\]]*\])?\s*(.*)$/);
    if (!m) continue;
    const name = m[1];
    const specifiers = m[2].split(",").map((s) => s.trim())
      .filter((s) => /^(==|>=|<=|~=|!=|>|<)/.test(s));
    out.push({
      name,
      specifiers,
      module: MODULE_ALIASES[name.toLowerCase()] || name.toLowerCase().replace(/-/g, "_"),
    });
  }
  return out;
}

function loadRequirements() {
  const reqPath = requirementsPath();
  try {
    depsState.requirements = parseRequirements(fs.readFileSync(reqPath, "utf8"));
  } catch (e) {
    depsState.requirements = [];
  }
  return depsState.requirements;
}

// ── PEP 440 subset: compare dotted versions, prereleases rank below releases ──
function versionCompare(a, b) {
  // Local version labels (2.1.0+cu118) carry build metadata, not precedence —
  // strip them so a CUDA-tagged torch still satisfies >= 2.1.0.
  const parse = (s) => String(s).split("+")[0].split(/[.\-_]/).map((seg) => {
    const m = /^(\d+)/.exec(seg);
    return m ? parseInt(m[1], 10) : (seg === "" ? 0 : -1);
  });
  const A = parse(a); const B = parse(b);
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const x = A[i] === undefined ? 0 : A[i];
    const y = B[i] === undefined ? 0 : B[i];
    if (x !== y) return x < y ? -1 : 1;
  }
  // Same release number: 2.1.0rc1 is older than 2.1.0, so a version pinned
  // with >= never accepts a prerelease of exactly that version.
  const pre = (s) => /[a-z]/i.test(String(s).split("+")[0]);
  const preA = pre(a); const preB = pre(b);
  if (preA !== preB) return preA ? -1 : 1;
  return 0;
}

function specSatisfied(version, specifier) {
  const m = /^(==|>=|<=|~=|!=|>|<)\s*([0-9][^,\s]*)$/.exec(String(specifier).trim());
  if (!m) return true; // unrecognized specifier → never block the user on it
  const op = m[1]; const want = m[2];
  const cmp = versionCompare(version, want);
  switch (op) {
    case "==": return cmp === 0;
    case ">=": return cmp >= 0;
    case "<=": return cmp <= 0;
    case ">": return cmp > 0;
    case "<": return cmp < 0;
    case "!=": return cmp !== 0;
    case "~=": {
      if (cmp < 0) return false;
      const parts = want.split(".");
      const idx = parts.length >= 3 ? parts.length - 2 : 0;
      const upper = parts.slice();
      upper[idx] = String(parseInt(upper[idx], 10) + 1);
      for (let i = idx + 1; i < upper.length; i++) upper[i] = "0";
      return versionCompare(version, upper.join(".")) < 0;
    }
    default: return true;
  }
}

function pythonEnvDir() {
  if (process.env.REMAP_PYTHON_ENV) return process.env.REMAP_PYTHON_ENV;
  return path.join(app.getPath("appData"), "Remap Studios", VENV_DIR_NAME);
}

function envPythonPath(dir) {
  return process.platform === "win32"
    ? path.join(dir, "Scripts", "python.exe")
    : path.join(dir, "bin", "python3");
}

// Ordered interpreter candidates. Absolute paths first so a Finder-launched
// app (minimal PATH, no Homebrew) still finds a real Python 3.
function pythonCandidates() {
  // Order of preference: the interpreter the user picked in Settings, then the
  // REMAP_PYTHON/PYTHON_PATH override, then well-known absolute paths, then
  // whatever PATH resolves.
  const picked = preferredPython();
  if (process.platform === "win32") {
    const list = [];
    if (picked) list.push({ cmd: picked, args: [] });
    if (process.env.PYTHON_PATH) list.push({ cmd: process.env.PYTHON_PATH, args: [] });
    list.push({ cmd: "py", args: ["-3"] }, { cmd: "python", args: [] }, { cmd: "python3", args: [] });
    return list;
  }
  const list = [];
  if (picked) list.push({ cmd: picked, args: [] });
  if (process.env.PYTHON_PATH) list.push({ cmd: process.env.PYTHON_PATH, args: [] });
  for (const p of ["/opt/homebrew/bin/python3", "/usr/local/bin/python3", "/usr/bin/python3", "/opt/local/bin/python3"]) {
    try { if (fs.existsSync(p)) list.push({ cmd: p, args: [] }); } catch (e) { /* ignore */ }
  }
  list.push({ cmd: "python3", args: [] });
  return list;
}

// Run the probe script inside one interpreter; resolves with a parsed report
// (or a synthetic failure report) — never rejects, so callers stay simple.
function probeInterpreter(spec, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const reqs = depsState.requirements.map((r) => ({ name: r.name, module: r.module }));
    let proc;
    const env = { ...process.env, PYTHONUNBUFFERED: "1", PYTHONDONTWRITEBYTECODE: "1" };
    if (depsState.pythonPath) env.PYTHONPATH = depsState.pythonPath;
    try {
      proc = spawn(spec.cmd, [...(spec.args || []), "-c", PROBE_SCRIPT, JSON.stringify(reqs)], {
        stdio: ["ignore", "pipe", "pipe"],
        env,
        windowsHide: true,
      });
    } catch (err) {
      resolve({ ok: false, cmd: spec.cmd, error: err.message });
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (report) => { if (!settled) { settled = true; resolve(report); } };
    const timer = setTimeout(() => {
      try { proc.kill(); } catch (e) { /* gone */ }
      finish({ ok: false, cmd: spec.cmd, error: `Timed out after ${Math.round(timeoutMs / 1000)}s` });
    }, timeoutMs);

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    proc.on("error", (err) => { clearTimeout(timer); finish({ ok: false, cmd: spec.cmd, error: err.message }); });
    proc.on("exit", () => {
      clearTimeout(timer);
      const line = stdout.split(/\r?\n/).find((l) => l.startsWith(PROBE_MARKER));
      if (!line) {
        finish({ ok: false, cmd: spec.cmd, error: (stderr.trim() || "interpreter produced no report").slice(-800) });
        return;
      }
      try {
        const report = JSON.parse(line.slice(PROBE_MARKER.length));
        report.ok = true;
        report.cmd = spec.cmd;
        report.args = spec.args || [];
        report.stderrTail = stderr.trim().slice(-800);
        finish(report);
      } catch (e) {
        finish({ ok: false, cmd: spec.cmd, error: `unparsable report: ${e.message}` });
      }
    });
  });
}

// What is missing/unsatisfied in a probe report? Empty array = environment is good.
function evaluateProbe(report) {
  const missing = [];
  if (!report || !report.ok) {
    return [{
      name: "python", module: "python", found: null, need: "Python 3.9 or newer with pip",
      reason: `no usable Python 3 interpreter was found (${(report && report.error) || "it could not be started"})`,
    }];
  }
  for (const pkg of report.packages || []) {
    const req = depsState.requirements.find((r) => r.name.toLowerCase() === String(pkg.name).toLowerCase());
    const specifiers = req ? req.specifiers : [];
    if (!pkg.version) {
      missing.push({ name: pkg.name, module: pkg.module, found: null, need: specifiers.join(", "), reason: "not installed" });
      continue;
    }
    if (pkg.import_error) {
      missing.push({ name: pkg.name, module: pkg.module, found: pkg.version, need: specifiers.join(", "), reason: `installed but will not import — ${pkg.import_error}` });
      continue;
    }
    const bad = specifiers.filter((s) => !specSatisfied(pkg.version, s));
    if (bad.length > 0) {
      missing.push({ name: pkg.name, module: pkg.module, found: pkg.version, need: bad.join(", "), reason: `needs ${bad.join(", ")}, found ${pkg.version}` });
    }
  }
  return missing;
}

function summarizeMissing(missing) {
  return missing.map((m) => `${m.name} (${m.reason})`).join("; ");
}

async function probeFreshEnv() {
  const dir = pythonEnvDir();
  const py = envPythonPath(dir);
  try { if (!fs.existsSync(py)) return null; } catch (e) { return null; }
  const report = await probeInterpreter({ cmd: py, args: [] });
  if (!report.ok) return null;
  const missing = evaluateProbe(report);
  report.dir = dir;
  report.missing = missing;
  return report;
}

function depsLog(line) {
  const text = String(line).slice(0, 400);
  depsState.log.push(text);
  if (depsState.log.length > 400) depsState.log.splice(0, depsState.log.length - 400);
  sendToRenderer("deps:progress", { phase: depsState.progress ? depsState.progress.phase : "log", line: text });
}

let depsSeq = 0; // monotonic status counter so the renderer can drop stale snapshots

// Guards against overlapping checks. The probe takes seconds, and the user can
// start a second one long before the first finishes (pressing Check Again twice,
// or pinning a different interpreter in Settings, which re-checks the runtime).
// Without this the slower — and now irrelevant — probe landed last and stamped
// its verdict over the newer one, so the app could insist 4 packages were
// missing moments after proving they were all present.
let depsRunToken = 0;

function broadcastDeps() {
  depsSeq++; // every verdict bumps the counter; a slow fetch must not win
  sendToRenderer("deps:status", publicDepsState());
}

function publicDepsState() {
  return {
    seq: depsSeq,
    status: depsState.status,
    python: depsState.python,
    pythonVersion: depsState.pythonVersion,
    basePython: depsState.basePython,
    basePythonVersion: depsState.basePythonVersion,
    envKind: depsState.envKind,
    envPath: depsState.envPath,
    plannedEnvPath: pythonEnvDir(),
    pythonPath: depsState.pythonPath,
    missing: depsState.missing,
    requirementCount: depsState.requirements.length,
    detail: depsState.detail,
    progress: depsState.progress,
    log: depsState.log.slice(-300),
  };
}

function setDepsProgress(progress) {
  depsState.progress = progress;
  sendToRenderer("deps:progress", { phase: progress.phase, label: progress.label, percent: progress.percent, done: progress.done, total: progress.total });
}

// ── Streaming child-process helper (venv creation + pip) ──
function runStreaming(cmd, args, opts, onLine, timeoutMs = INSTALL_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, env: { ...process.env, ...(opts.env || {}) } });
    } catch (err) {
      resolve({ code: -1, output: [err.message], error: err.message });
      return;
    }
    const output = [];
    let settled = false;
    const collect = (chunk) => {
      for (const rawLine of String(chunk).split(/\r|\n/)) {
        const line = rawLine.replace(/\s+$/, "");
        if (!line.trim()) continue;
        output.push(line);
        if (output.length > 600) output.shift();
        if (onLine) onLine(line);
      }
    };
    const timer = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch (e) { /* gone */ }
      if (!settled) { settled = true; resolve({ code: -1, output, error: `timed out after ${Math.round(timeoutMs / 60000)} min` }); }
    }, timeoutMs);
    proc.stdout.on("data", collect);
    proc.stderr.on("data", collect);
    proc.on("error", (err) => { clearTimeout(timer); if (!settled) { settled = true; resolve({ code: -1, output, error: err.message }); } });
    proc.on("exit", (code) => { clearTimeout(timer); if (!settled) { settled = true; resolve({ code, output }); } });
  });
}

// ── Decide which interpreter runs the backend, every launch ──
// Order: (1) the app-owned environment, (2) the first system interpreter whose
// requirements are all satisfied, (3) nothing usable → report what is missing
// and which interpreter is the best base for building the app environment.
async function resolvePythonRuntime() {
  // Settings → Backend → Interpreter wins over the env var so the UI control
  // is authoritative; REMAP_PYTHON stays as the CI/scripting override when no
  // preference has been saved.
  const forcedSpec = preferredPython() || process.env.REMAP_PYTHON || null;
  const forced = forcedSpec ? { cmd: forcedSpec, args: [] } : null;

  if (!forced) {
    const fresh = await probeFreshEnv();
    if (fresh && fresh.missing.length === 0) {
      return { ok: true, python: envPythonPath(fresh.dir), pythonArgs: [], version: fresh.python, envKind: "app-env", envPath: fresh.dir, pythonPath: null };
    }
    if (fresh) {
      // The app environment exists but is incomplete (a package was removed,
      // an upgrade went wrong, …): report what is wrong in *that* environment
      // and let the repair install into it. Falling through to system probing
      // here would blame the system Python for a problem the app can fix.
      return {
        ok: false,
        python: envPythonPath(fresh.dir),
        pythonVersion: fresh.python,
        basePython: envPythonPath(fresh.dir),
        basePythonArgs: [],
        basePythonVersion: fresh.python,
        envKind: "app-env",
        envPath: fresh.dir,
        missing: fresh.missing,
        detail: "The app's own Python environment needs repair.",
      };
    }
  }

  const candidates = forced ? [forced] : pythonCandidates();
  let best = null;
  for (const cand of candidates) {
    const report = await probeInterpreter(cand);
    if (!report.ok) {
      if (!best) best = { spec: cand, report, missing: evaluateProbe(report) };
      continue;
    }
    const missing = evaluateProbe(report);
    if (missing.length === 0) {
      return { ok: true, python: cand.cmd, pythonArgs: cand.args || [], version: report.python, envKind: "system", envPath: null, pythonPath: null };
    }
    if (!best || missing.length < best.missing.length) best = { spec: cand, report, missing };
  }

  // Only an interpreter that actually ran can be offered as the base for the
  // app environment — an ENOENT candidate must not be presented as "found".
  const usable = best && best.report.ok ? best : null;
  return {
    ok: false,
    basePython: usable ? usable.spec.cmd : null,
    basePythonArgs: usable ? usable.spec.args || [] : [],
    basePythonVersion: usable ? usable.report.python : null,
    missing: best ? best.missing : [{ name: "python", reason: "no working Python 3 interpreter found", need: "Python 3.9+ with pip" }],
    detail: usable ? "" : (best && best.report.error) || "",
  };
}

// Adopt a runtime decision into depsState (single place so UI + spawn agree).
function applyRuntime(result) {
  depsState.python = result.python || null;
  depsState.pythonArgs = result.pythonArgs || [];
  depsState.pythonVersion = result.version || null;
  depsState.envKind = result.envKind || null;
  depsState.envPath = result.envPath || null;
  depsState.missing = result.missing || [];
  if (result.ok) depsState.pythonPath = result.pythonPath || null;
}

// ── Install everything into the app-owned environment ──
async function installPythonDependencies() {
  if (depsState.status === "installing") return { ok: false, error: "an install is already running" };
  loadRequirements();
  const reqPath = requirementsPath();
  if (depsState.requirements.length === 0 || !fs.existsSync(reqPath)) {
    return { ok: false, error: `requirements.txt not found (looked in ${reqPath})` };
  }

  depsState.status = "installing";
  depsState.detail = "";
  depsState.log = [];
  depsState.progress = null;
  depsState.pythonPath = null; // a stale PYTHONPATH must not leak into a fresh venv
  broadcastDeps();

  const total = depsState.requirements.length;
  const dir = pythonEnvDir();
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* exists */ }

  // 1 — pick a base interpreter to build the environment from
  let base = depsState.basePython
    ? { cmd: depsState.basePython, args: depsState.basePythonArgs || [] }
    : null;
  if (!base || !fs.existsSync(base.cmd)) {
    const candidates = pythonCandidates();
    for (const cand of candidates) {
      if (cand.cmd.includes("/") && fs.existsSync(cand.cmd)) { base = cand; break; }
    }
    if (!base) base = candidates[candidates.length - 1];
  }

  setDepsProgress({ phase: "env", label: `Preparing an isolated Python environment in ${dir}`, percent: 3, done: 0, total });
  depsLog(`[setup] base interpreter: ${base.cmd}${base.args ? " " + base.args.join(" ") : ""}`);
  depsLog(`[setup] environment: ${dir}`);

  let venvPython = envPythonPath(dir);
  let usingTargetDir = false;

  if (!fs.existsSync(venvPython)) {
    const makeVenv = async (extraArgs) => runStreaming(base.cmd, [...(base.args || []), "-m", "venv", ...extraArgs, dir], {}, (line) => depsLog(`[venv] ${line}`), 300000);
    let res = await makeVenv([]);
    if (res.code !== 0) {
      depsLog("[setup] plain venv failed — retrying without bundled pip");
      res = await makeVenv(["--without-pip"]);
      if (res.code === 0 && fs.existsSync(venvPython)) {
        const boot = await runStreaming(venvPython, ["-m", "ensurepip", "--upgrade"], {}, (line) => depsLog(`[ensurepip] ${line}`), 300000);
        if (boot.code !== 0) depsLog(`[setup] ensurepip reported an error (${boot.code})`);
      }
    }
    if (!fs.existsSync(venvPython)) {
      // Last resort: install into a plain directory and point PYTHONPATH at it.
      usingTargetDir = true;
      venvPython = base.cmd;
      depsState.pythonPath = path.join(dir, "packages");
      try { fs.mkdirSync(depsState.pythonPath, { recursive: true }); } catch (e) { /* exists */ }
      depsLog("[setup] could not create a venv — falling back to a private package directory");
    }
  }

  // 2 — pip install the full requirement set
  const pipBase = { cmd: venvPython, args: usingTargetDir ? base.args || [] : [] };
  const pipArgs = ["-m", "pip", "install", "--upgrade", "--no-input", "--disable-pip-version-check", "--progress-bar", "off"];
  if (usingTargetDir) pipArgs.push("--target", depsState.pythonPath);
  pipArgs.push("-r", reqPath);

  const seen = new Set();
  let lastLine = "";
  const onPipLine = (line) => {
    if (line === lastLine) return;
    lastLine = line;
    depsLog(`[pip] ${line}`);
    const collecting = /^\s*Collecting\s+([A-Za-z0-9._-]+)/.exec(line);
    if (collecting) seen.add(collecting[1].toLowerCase());
    const downloading = /^\s*Downloading\s+(\S+)\s*\(([^)]+)\)/.exec(line);
    const installing = /Installing collected packages/.test(line);
    // pip also resolves transitive dependencies, so the number of packages it
    // collects can far exceed the requirements count. Saturate towards 92%
    // instead of pretending the job has a known length, and let the
    // "Installing collected packages" phase be the last visible step.
    const pct = installing ? 94 : Math.min(92, 8 + Math.round(84 * (1 - Math.exp(-seen.size / 14))));
    const label = installing
      ? "Installing collected packages…"
      : downloading
        ? `Downloading ${downloading[1].split("/").pop()} (${downloading[2]})…`
        : (collecting ? `Resolving ${collecting[1]}…` : null);
    setDepsProgress({ phase: "install", label: label || `Installing packages… (${seen.size} resolved)`, percent: pct, done: Math.min(seen.size, total), total });
  };

  setDepsProgress({ phase: "install", label: `Installing ${total} packages (torch is a large download)…`, percent: 6, done: 0, total });
  let install = await runStreaming(pipBase.cmd, [...pipBase.args, ...pipArgs], {}, onPipLine);

  if (install.code !== 0 && /No module named pip/i.test(install.output.join("\n"))) {
    depsLog("[setup] pip is missing in the base interpreter — bootstrapping it with ensurepip");
    const boot = await runStreaming(base.cmd, [...(base.args || []), "-m", "ensurepip", "--upgrade", "--user"], {}, (line) => depsLog(`[ensurepip] ${line}`), 300000);
    if (boot.code !== 0) {
      await runStreaming(base.cmd, [...(base.args || []), "-m", "ensurepip", "--upgrade"], {}, (line) => depsLog(`[ensurepip] ${line}`), 300000);
    }
    install = await runStreaming(pipBase.cmd, [...pipBase.args, ...pipArgs], {}, onPipLine);
  }

  // 3 — verify by re-probing, so "installed" means "imports and satisfies"
  setDepsProgress({ phase: "verify", label: "Verifying the installed packages…", percent: 96, done: total, total });
  const verifySpec = usingTargetDir ? { cmd: base.cmd, args: base.args || [] } : { cmd: venvPython, args: [] };
  const report = await probeInterpreter(verifySpec);
  const missing = evaluateProbe(report);

  if (install.code !== 0 && missing.length > 0) {
    const tail = install.output.slice(-12).join("\n");
    depsState.status = "failed";
    depsState.detail = `pip exited with code ${install.code}. ${missing.length} package(s) still missing.`;
    depsState.missing = missing;
    depsLog(`[error] ${depsState.detail}`);
    depsLog(tail);
    setDepsProgress({ phase: "failed", label: `Install failed — ${summarizeMissing(missing)}`, percent: 0, done: 0, total });
    broadcastDeps();
    return { ok: false, error: depsState.detail, missing };
  }

  if (missing.length > 0) {
    depsState.status = "failed";
    depsState.detail = `Install finished but these are still broken: ${summarizeMissing(missing)}`;
    depsState.missing = missing;
    depsLog(`[error] ${depsState.detail}`);
    setDepsProgress({ phase: "failed", label: depsState.detail, percent: 0, done: 0, total });
    broadcastDeps();
    return { ok: false, error: depsState.detail, missing };
  }

  applyRuntime({
    ok: true,
    python: usingTargetDir ? base.cmd : venvPython,
    pythonArgs: usingTargetDir ? base.args || [] : [],
    version: report.python,
    envKind: usingTargetDir ? "target-dir" : "app-env",
    envPath: dir,
    missing: [],
  });
  depsState.status = "ok";
  depsState.detail = "";
  setDepsProgress({ phase: "done", label: `All ${total} packages installed — starting the Python backend…`, percent: 100, done: total, total });
  depsLog(`[setup] environment ready: ${depsState.python}`);
  broadcastDeps();

  // Backend can now start for real.
  startPythonBackend();
  return { ok: true, python: depsState.python, envKind: depsState.envKind, envPath: dir };
}

// ── Launch gate: check every time the app opens, then start or ask ──
async function initializeBackendDependencies() {
  loadRequirements();
  const myToken = ++depsRunToken;
  depsState.status = "checking";
  depsState.missing = [];
  depsState.detail = "";
  depsState.pythonPath = null;
  const checkStarted = Date.now();
  broadcastDeps();

  let result;
  try {
    result = await resolvePythonRuntime();
  } catch (e) {
    result = { ok: false, missing: [{ name: "python", reason: e.message, need: "Python 3.9+" }] };
  }

  // A newer check started while this one was probing: its verdict is the only
  // one that describes the current configuration, so discard this one entirely
  // rather than mutating shared state.
  if (myToken !== depsRunToken) {
    depsLog("[check] discarded a stale result (a newer check superseded it)");
    return publicDepsState();
  }

  if (result.ok) {
    applyRuntime(result);
    depsState.status = "ok";
    depsState.basePython = result.python;
    depsState.basePythonArgs = result.pythonArgs || [];
    depsLog(`[check] ${depsState.requirements.length} packages present in ${result.python} (${result.envKind}) in ${Date.now() - checkStarted} ms`);
    broadcastDeps();
    depsRecheckedAfterCrash = false;
    startPythonBackend();
    return publicDepsState();
  }

  applyRuntime(result);
  depsState.basePython = result.basePython || null;
  depsState.basePythonArgs = result.basePythonArgs || [];
  depsState.basePythonVersion = result.basePythonVersion || null;
  depsState.status = "missing";
  depsState.detail = result.detail || "";
  console.warn(`[Deps] missing (checked in ${Date.now() - checkStarted} ms):`, summarizeMissing(depsState.missing));
  broadcastDeps();
  return publicDepsState();
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

// ── Python dependency bootstrap ──
ipcMain.handle("deps:status", () => publicDepsState());
ipcMain.handle("deps:check", () => initializeBackendDependencies());
ipcMain.handle("deps:install", () => installPythonDependencies());
ipcMain.handle("deps:continue", () => {
  // Escape hatch for offline users: run with whatever interpreter actually
  // works on this machine (never a candidate that failed to start), and let
  // the backend report degraded mode for the missing pieces.
  const isRunnable = (p) => {
    try { return Boolean(p) && (p.includes("/") ? fs.existsSync(p) : true); } catch (e) { return false; }
  };
  const forced = [...(preferredPython() ? [{ cmd: preferredPython(), args: [] }] : []), ...(process.env.REMAP_PYTHON ? [{ cmd: process.env.REMAP_PYTHON, args: [] }] : [])];
  const candidates = [...forced, ...pythonCandidates()];
  const chosen = candidates.find((c) => c.cmd.includes("/") && isRunnable(c.cmd))
    || candidates.find((c) => !c.cmd.includes("/"))
    || (isRunnable(depsState.python) ? { cmd: depsState.python, args: depsState.pythonArgs || [] } : null);
  if (chosen) {
    depsState.python = chosen.cmd;
    depsState.pythonArgs = chosen.args || [];
  }
  depsState.envKind = "system";
  depsState.status = "skipped";
  broadcastDeps();
  startPythonBackend();
  return { ok: true, python: depsState.python };
});
ipcMain.handle("app:quit", () => { app.quit(); });

// Last resort when no interpreter exists: get Python 3 onto the machine. On
// macOS /usr/bin/python3 comes with the command line tools, and the supported
// way to install those is the system dialog xcode-select opens (no admin
// password, no silent installer). Everywhere else, send the user to python.org.
ipcMain.handle("deps:getPython", async () => {
  if (process.platform === "darwin") {
    const res = await runStreaming("/usr/bin/xcode-select", ["--install"], {}, (line) => depsLog(`[python] ${line}`), 120000);
    const output = res.output.join("\n").trim();
    const already = /already installed/i.test(output);
    return { ok: res.code === 0 || already, already, platform: "darwin", output: output.slice(0, 400) };
  }
  if (process.platform === "win32") {
    shell.openExternal("https://www.python.org/downloads/windows/");
  } else {
    shell.openExternal("https://www.python.org/downloads/");
  }
  return { ok: true, opened: true, platform: process.platform };
});

// Full status incl. the resolved interpreter and the last startup error —
// used by the Backend settings page so failures are visible in the UI.
ipcMain.handle("app:backendStatus", () => ({
  ready: backendReady,
  python: backendPythonCmd,
  script: backendScriptPath,
  lastError: backendLastError,
  deps: publicDepsState(),
}));

// Restart the backend (e.g. after installing missing Python packages).
// If the environment is known to be incomplete, re-check it first so the
// setup dialog comes back instead of the same failure.
ipcMain.handle("app:restartBackend", () => {
  backendLastError = null;
  if (depsState.status === "missing" || depsState.status === "failed") {
    initializeBackendDependencies();
  } else {
    startPythonBackend();
  }
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

// ══════════════════════════════════════════
// SETTINGS STORE
// ══════════════════════════════════════════
// The renderer owns the schema and the UI; this is the durable store. Keeping
// it in the main process (not localStorage) means a packaged app that is
// reinstalled or cleared of site data still remembers the user's preferences,
// and the backend spawn can read them (interpreter choice, autoload path).
//
// Every write is atomic (tmp + rename) so a crash mid-save cannot leave a
// half-written settings.json that would lose every preference.

let settingsCache = null;

function settingsFile() {
  return path.join(appUtil.getPath("userData"), "settings.json");
}

function readSettings() {
  if (settingsCache) return settingsCache;
  try {
    const raw = fs.readFileSync(settingsFile(), "utf8");
    const parsed = JSON.parse(raw);
    settingsCache = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    // First launch (or a corrupt file) — defaults come from the renderer.
    settingsCache = {};
  }
  return settingsCache;
}

function writeSettings(next) {
  const file = settingsFile();
  const dir = path.dirname(file);
  try {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8");
    fs.renameSync(tmp, file);
    settingsCache = next;
    return { ok: true, path: file };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

ipcMain.handle("settings:get", () => {
  const s = readSettings();
  return {
    ...s,
    // Where the file lives, so Settings → Backend can show the real path.
    _path: settingsFile(),
    // Facts the renderer cannot know on its own.
    _appVersion: app.getVersion(),
    _packaged: app.isPackaged,
    _platform: process.platform,
  };
});

ipcMain.handle("settings:set", (_event, key, value) => {
  if (typeof key !== "string" || !key || key.startsWith("_")) {
    return { ok: false, error: "invalid setting key" };
  }
  const before = readSettings();
  const next = { ...before, [key]: value };
  const res = writeSettings(next);
  // A changed interpreter invalidates the resolved Python; re-check so the
  // next model load uses the interpreter the user asked for.
  if (res.ok && key === "pythonPath") {
    depsState.python = null;
    depsState.pythonArgs = [];
    depsState.pythonPath = null;
    initializeBackendDependencies();
  }
  return { ...res, settings: { ...next, _path: settingsFile() } };
});

ipcMain.handle("settings:reset", () => {
  const res = writeSettings({});
  return res;
});

// A user-chosen interpreter beats every auto-detected candidate.
function preferredPython() {
  const p = readSettings().pythonPath;
  if (typeof p !== "string") return null;
  const trimmed = p.trim();
  if (!trimmed || trimmed === "python3" || trimmed === "python") return null;
  return trimmed;
}

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
