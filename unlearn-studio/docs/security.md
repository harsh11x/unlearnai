# Security Model

## Threat Model

All uploaded model files are treated as **untrusted**. An uploaded model could contain:

- Malicious pickle payloads
- Excessive resource consumption
- Path traversal attacks
- Code injection through custom architectures

## Security Controls

### 1. Model Loading Isolation

- Models are loaded in isolated worker processes, not the API server
- The API server never directly deserializes model code
- Workers can be containerized for filesystem isolation

### 2. Safe Serialization

- Prefer `.safetensors` format over PyTorch `.bin` files
- Safetensors only stores tensors, not arbitrary Python objects
- The system warns when non-safetensors models are uploaded

### 3. Resource Limits

- Maximum upload size: 10 GB
- Maximum model size: 10 GB
- Task time limits: 1 hour per job
- Memory limits per worker

### 4. Authentication & Authorization

- API key authentication (planned)
- Project-level access control (planned)
- Role-based permissions (planned)

### 5. Audit Logging

All significant operations are logged:
- Model uploads
- Unlearning job creation
- Evaluation runs
- Model version creation
- Configuration changes

### 6. Artifact Integrity

- Model files are hashed (SHA-256) on upload
- Hashes are verified before loading
- Dataset hashes ensure reproducibility

## Desktop Application (Electron)

The packaged desktop app (`apps/desktop`) is a local-first tool: it reads model
files from disk, edits weights, and talks to a Python backend over a pipe. Its
trust boundary is the Electron window, not a server.

### Enforced in code (`apps/desktop/shared/main.js`)

| Control | Implementation |
|---|---|
| Renderer isolation | `contextIsolation: true`, `nodeIntegration: false`, `webviewTag: false`, narrow `preload.js` bridge |
| Origin isolation | `webSecurity: true`; renderer served from `http://localhost:<random>` bound to loopback only |
| Content Security Policy | `default-src 'self'`, no `eval`, `object-src 'none'`, explicit allowlists for Firebase/auth/Razorpay |
| Navigation | `will-navigate` / `will-redirect` pinned to the app origin plus the Firebase and Google sign-in hops; anything else is blocked |
| External links | `app:openExternal` and `setWindowOpenHandler` accept only `http:`/`https:` after URL parsing and control-character rejection |
| Permissions | `setPermissionRequestHandler` and `setPermissionCheckHandler` deny camera, microphone, geolocation, notifications and everything else |
| Static file serving | Path resolved against the renderer root; `..`, encoded separators and absolute paths return 403 |
| Download path | `model:download` reduces the filename to a single path segment (`path.basename`), rejects control characters, and accepts only http(s) URLs; redirects are re-validated per hop |
| Update metadata | Certificate verification left on; the update URL is plain HTTP today, so treat update metadata as untrusted |
| Binary hardening | Build-time Electron fuses: `RunAsNode` off, `NODE_OPTIONS` injection off, `--inspect` off, `OnlyLoadAppFromAsar` + embedded ASAR integrity validation on, file:// extra privileges off |

### Verified

Checked against a packaged `win-unpacked` build via the Chromium DevTools protocol:

- `openExternal` refused `file:` and `javascript:` URLs, accepted `https:`
- `location.href` to a foreign origin was blocked and the window stayed on the app origin
- `downloadModel` with `../../evil.bin` landed inside `Downloads/remap-studio-models` and wrote nothing outside it
- CSP header present on the document response; no uncaught renderer exceptions on load
- Fuse wire read back from the built executable matched the configuration above
- `npm audit --omit=dev` reports 0 vulnerabilities for the shipped dependency tree

### Known limitations

- **The installer is not code-signed.** Windows SmartScreen will warn until a
  signing certificate (`CSC_LINK` / `WIN_CSC_LINK`) is configured for
  `electron-builder`. This is a release blocker for public distribution.
- **Cloud calls are plaintext HTTP.** The renderer sends a Firebase ID token to
  `http://13.204.245.212:3001`; without TLS that token is readable by anyone on
  the network path. The app now warns the user once, but the transport needs
  HTTPS before cloud sync is used with real accounts.
- **The terminal pane runs a real system shell** by design. Anything pasted into
  it executes with the user's privileges; it is not sandboxed.
- **Module storage lives under the install directory** (`<app dir>/storage/modules`),
  not per-user app data. Per-user NSIS installs are writable, but a system-wide
  install would break module creation.
- Build-tool-only advisories remain (`electron-builder` → `global-agent` →
  `sprintf-js`, moderate). They are not part of the shipped app and the only
  audit-suggested fix downgrades the builder, which reintroduces high-severity
  ones.

## Known Limitations

- Worker isolation is not fully implemented in V1
- No network-level isolation between workers
- No cryptographic signing of artifacts
- Authentication is not yet implemented
- Audit logs are not tamper-proof

## Recommendations

- Run workers in isolated containers
- Use GPU-dedicated machines for unlearning
- Monitor resource usage during operations
- Review evaluation results before deploying edited models
