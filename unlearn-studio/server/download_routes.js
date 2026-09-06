/**
 * Build Distribution Routes
 * Serves desktop app builds from osapps/{mac,windows,linux}/
 * 
 * Folder structure on disk:
 *   osapps/mac/      → .dmg files
 *   osapps/windows/  → .exe, .msi files
 *   osapps/linux/    → .AppImage, .deb, .rpm files
 */
const path = require("path");
const fs = require("fs");

module.exports = function (app, env) {
  const SERVER_URL = env.SERVER_URL || "http://localhost:3001";
  const UPLOAD_TOKEN = env.UPLOAD_TOKEN || "remap-builds-secret-2024";

  const OSAPPS_DIR = path.join(__dirname, "osapps");

  // Ensure folder structure exists
  ["mac", "windows", "linux"].forEach((os) => {
    const dir = path.join(OSAPPS_DIR, os);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // ══════════════════════════════════════
  //  STATIC — serve osapps/ files directly
  // ══════════════════════════════════════

  app.use("/osapps", require("express").static(OSAPPS_DIR, {
    setHeaders: (res, filePath) => {
      res.setHeader("Content-Disposition", "attachment");
      if (filePath.endsWith(".dmg")) {
        res.setHeader("Content-Type", "application/x-apple-diskimage");
      } else if (filePath.endsWith(".exe")) {
        res.setHeader("Content-Type", "application/x-msdownload");
      } else if (filePath.endsWith(".AppImage") || filePath.endsWith(".deb")) {
        res.setHeader("Content-Type", "application/octet-stream");
      }
    },
  }));

  // ══════════════════════════════════════
  //  GET /api/downloads — all platforms (for Vercel website)
  // ══════════════════════════════════════

  app.get("/api/downloads", (_req, res) => {
    try {
      const platforms = ["mac", "windows", "linux"];
      const result = {};

      for (const os of platforms) {
        const dir = path.join(OSAPPS_DIR, os);
        if (!fs.existsSync(dir)) {
          result[os] = { available: false, builds: [] };
          continue;
        }

        const files = fs.readdirSync(dir).filter((f) => !f.startsWith(".") && !f.endsWith(".json"));
        const builds = files
          .map((f) => {
            const filePath = path.join(dir, f);
            const stat = fs.statSync(filePath);
            const arch = f.includes("arm64") || f.includes("aarch64") ? "arm64" : "x64";
            return {
              filename: f,
              arch,
              size: stat.size,
              sizeFormatted: formatBytes(stat.size),
              downloadUrl: `${SERVER_URL}/osapps/${os}/${encodeURIComponent(f)}`,
              uploadedAt: stat.mtime.toISOString(),
            };
          })
          .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

        result[os] = {
          available: builds.length > 0,
          latest: builds[0] || null,
          builds,
        };
      }

      res.json(result);
    } catch (e) {
      console.error("Downloads API error:", e.message);
      res.json({ mac: { available: false }, windows: { available: false }, linux: { available: false } });
    }
  });

  // ══════════════════════════════════════
  //  GET /api/downloads/:platform — single platform
  // ══════════════════════════════════════

  app.get("/api/downloads/:platform", (req, res) => {
    const platform = req.params.platform.toLowerCase();
    if (!["mac", "windows", "linux"].includes(platform)) {
      return res.status(400).json({ error: "Invalid platform. Use: mac, windows, linux" });
    }

    try {
      const dir = path.join(OSAPPS_DIR, platform);
      if (!fs.existsSync(dir)) {
        return res.json({ available: false, builds: [] });
      }

      const files = fs.readdirSync(dir).filter((f) => !f.startsWith(".") && !f.endsWith(".json"));
      const builds = files
        .map((f) => {
          const filePath = path.join(dir, f);
          const stat = fs.statSync(filePath);
          const arch = f.includes("arm64") || f.includes("aarch64") ? "arm64" : "x64";
          return {
            filename: f,
            arch,
            size: stat.size,
            sizeFormatted: formatBytes(stat.size),
            downloadUrl: `${SERVER_URL}/osapps/${platform}/${encodeURIComponent(f)}`,
            uploadedAt: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

      res.json({
        available: builds.length > 0,
        latest: builds[0] || null,
        builds,
      });
    } catch (e) {
      res.json({ available: false, builds: [] });
    }
  });

  // ══════════════════════════════════════
  //  POST /api/builds/upload — upload a build
  // ══════════════════════════════════════

  app.post("/api/builds/upload", require("express").raw({ type: "*/*", limit: "500mb" }), (req, res) => {
    const token = req.headers["x-upload-token"] || req.query.token;
    if (token !== UPLOAD_TOKEN) {
      return res.status(401).json({ error: "Invalid upload token" });
    }

    const filename = req.headers["x-filename"] || req.query.filename;
    if (!filename) {
      return res.status(400).json({ error: "Missing X-Filename header" });
    }

    // Auto-detect platform from filename
    const platform = detectPlatform(filename);
    if (!platform) {
      return res.status(400).json({
        error: "Cannot detect platform from filename. Use: mac/windows/linux in the name or use .dmg/.exe/.AppImage extension",
      });
    }

    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const dir = path.join(OSAPPS_DIR, platform);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, safeName);

    fs.writeFileSync(filePath, req.body);
    console.log(`[Builds] Uploaded: osapps/${platform}/${safeName} (${formatBytes(req.body.length)})`);

    res.json({
      filename: safeName,
      platform,
      size: req.body.length,
      sizeFormatted: formatBytes(req.body.length),
      downloadUrl: `${SERVER_URL}/osapps/${platform}/${encodeURIComponent(safeName)}`,
    });
  });

  // ══════════════════════════════════════
  //  DELETE /api/builds/:platform/:filename
  // ══════════════════════════════════════

  app.delete("/api/builds/:platform/:filename", (req, res) => {
    const token = req.headers["x-upload-token"] || req.query.token;
    if (token !== UPLOAD_TOKEN) {
      return res.status(401).json({ error: "Invalid upload token" });
    }

    const platform = req.params.platform;
    if (!["mac", "windows", "linux"].includes(platform)) {
      return res.status(400).json({ error: "Invalid platform" });
    }

    const safeName = path.basename(req.params.filename);
    const filePath = path.join(OSAPPS_DIR, platform, safeName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ deleted: true, filename: safeName, platform });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  // ══════════════════════════════════════
  //  DOWNLOAD PAGE (redirects to latest)
  // ══════════════════════════════════════

  app.get("/download", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download Remap Studios</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .container{max-width:700px;text-align:center;padding:40px}
    .logo{font-size:48px;margin-bottom:16px}
    h1{font-size:32px;margin-bottom:8px}
    .subtitle{color:#888;margin-bottom:40px;font-size:16px}
    .platforms{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:32px}
    .platform-card{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:24px;min-width:180px;text-decoration:none;color:#fff;transition:all 0.2s}
    .platform-card:hover{border-color:#6366f1;transform:translateY(-2px)}
    .platform-card.unavailable{opacity:0.4;cursor:not-allowed}
    .platform-icon{font-size:32px;margin-bottom:8px}
    .platform-name{font-size:16px;font-weight:600;margin-bottom:4px}
    .platform-info{color:#888;font-size:12px}
    .platform-size{color:#6366f1;font-size:13px;margin-top:8px}
    .version{color:#555;font-size:12px;margin-top:32px}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🔬</div>
    <h1>Remap Studios</h1>
    <p class="subtitle">Professional Neural Network IDE for Model Unlearning</p>
    <div class="platforms" id="platforms">
      <div class="platform-card unavailable">
        <div class="platform-icon">🍎</div>
        <div class="platform-name">macOS</div>
        <div class="platform-info">Loading...</div>
      </div>
      <div class="platform-card unavailable">
        <div class="platform-icon">🪟</div>
        <div class="platform-name">Windows</div>
        <div class="platform-info">Loading...</div>
      </div>
      <div class="platform-card unavailable">
        <div class="platform-icon">🐧</div>
        <div class="platform-name">Linux</div>
        <div class="platform-info">Loading...</div>
      </div>
    </div>
    <p class="version" id="version-info"></p>
  </div>
  <script>
    async function init() {
      var platforms = document.getElementById("platforms");
      var info = document.getElementById("version-info");
      try {
        var r = await fetch("/api/downloads");
        var data = await r.json();
        var html = "";
        var icons = { mac: "🍎", windows: "🪟", linux: "🐧" };
        var names = { mac: "macOS", windows: "Windows", linux: "Linux" };
        for (var os of ["mac", "windows", "linux"]) {
          var p = data[os];
          if (p && p.available && p.latest) {
            var b = p.latest;
            html += '<a href="' + b.downloadUrl + '" class="platform-card">' +
              '<div class="platform-icon">' + icons[os] + '</div>' +
              '<div class="platform-name">Download for ' + names[os] + '</div>' +
              '<div class="platform-info">' + b.filename + ' · ' + (b.arch || "x64") + '</div>' +
              '<div class="platform-size">' + b.sizeFormatted + '</div></a>';
          } else {
            html += '<div class="platform-card unavailable">' +
              '<div class="platform-icon">' + icons[os] + '</div>' +
              '<div class="platform-name">' + names[os] + '</div>' +
              '<div class="platform-info">Coming soon</div></div>';
          }
        }
        platforms.innerHTML = html;
        var totalBuilds = Object.values(data).reduce(function(s, p) { return s + (p.builds ? p.builds.length : 0); }, 0);
        info.textContent = totalBuilds + " build" + (totalBuilds !== 1 ? "s" : "") + " available";
      } catch (e) {
        platforms.innerHTML = '<p style="color:#888">Failed to load builds</p>';
      }
    }
    init();
  </script>
</body>
</html>`);
  });

  // ══════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════

  function detectPlatform(filename) {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".dmg") || lower.endsWith(".pkg")) return "mac";
    if (lower.endsWith(".exe") || lower.endsWith(".msi")) return "windows";
    if (lower.endsWith(".appimage") || lower.endsWith(".deb") || lower.endsWith(".rpm")) return "linux";
    // Fallback: check if platform name is in the filename
    if (lower.includes("mac") || lower.includes("darwin") || lower.includes("arm64")) return "mac";
    if (lower.includes("win")) return "windows";
    if (lower.includes("linux")) return "linux";
    return null;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  console.log("✓  Build distribution routes loaded (osapps/)");
};
