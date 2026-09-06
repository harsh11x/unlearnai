/**
 * Build Distribution Routes
 * Serves desktop app builds for download
 */
const path = require("path");
const fs = require("fs");

module.exports = function(app, env) {
  const SERVER_URL = env.SERVER_URL || "http://localhost:3001";
  const UPLOAD_TOKEN = env.UPLOAD_TOKEN || "remap-builds-secret-2024";

  // Builds directory
  const BUILDS_DIR = path.join(__dirname, "builds");
  if (!fs.existsSync(BUILDS_DIR)) fs.mkdirSync(BUILDS_DIR, { recursive: true });

  // Serve builds as static files
  app.use("/builds", require("express").static(BUILDS_DIR, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".dmg") || filePath.endsWith(".exe") || filePath.endsWith(".zip")) {
        res.setHeader("Content-Type", "application/octet-stream");
      }
    },
  }));

  // List available builds
  app.get("/api/builds", (req, res) => {
    try {
      const files = fs.readdirSync(BUILDS_DIR).filter(f =>
        f.endsWith(".dmg") || f.endsWith(".exe") || f.endsWith(".zip") || f.endsWith(".AppImage")
      );
      const builds = files.map(f => {
        const stat = fs.statSync(path.join(BUILDS_DIR, f));
        const platform = f.endsWith(".dmg") ? "darwin" : f.endsWith(".exe") ? "win32" : "linux";
        const arch = f.includes("arm64") || f.includes("aarch64") ? "arm64" : "x64";
        return {
          filename: f,
          platform,
          arch,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          downloadUrl: `${SERVER_URL}/builds/${encodeURIComponent(f)}`,
          uploadedAt: stat.mtime.toISOString(),
        };
      });
      res.json({ builds });
    } catch (e) {
      res.json({ builds: [] });
    }
  });

  // Upload a build (protected with token)
  app.post("/api/builds/upload", require("express").raw({ type: "*/*", limit: "500mb" }), (req, res) => {
    const token = req.headers["x-upload-token"] || req.query.token;
    if (token !== UPLOAD_TOKEN) {
      return res.status(401).json({ error: "Invalid upload token" });
    }

    const filename = req.headers["x-filename"] || req.query.filename;
    if (!filename) {
      return res.status(400).json({ error: "Missing X-Filename header" });
    }

    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(BUILDS_DIR, safeName);

    fs.writeFileSync(filePath, req.body);
    console.log(`[Builds] Uploaded: ${safeName} (${formatBytes(req.body.length)})`);

    res.json({
      filename: safeName,
      size: req.body.length,
      downloadUrl: `${SERVER_URL}/builds/${encodeURIComponent(safeName)}`,
    });
  });

  // Delete a build
  app.delete("/api/builds/:filename", (req, res) => {
    const token = req.headers["x-upload-token"] || req.query.token;
    if (token !== UPLOAD_TOKEN) {
      return res.status(401).json({ error: "Invalid upload token" });
    }
    const safeName = path.basename(req.params.filename);
    const filePath = path.join(BUILDS_DIR, safeName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ deleted: true, filename: safeName });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  // Download page with OS detection
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
    .container{max-width:600px;text-align:center;padding:40px}
    .logo{font-size:48px;margin-bottom:16px}
    h1{font-size:32px;margin-bottom:8px}
    .subtitle{color:#888;margin-bottom:40px;font-size:16px}
    .download-btn{display:inline-flex;align-items:center;gap:12px;background:#6366f1;color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-size:18px;font-weight:600;transition:all 0.2s;margin-bottom:16px}
    .download-btn:hover{background:#5558e6;transform:translateY(-2px)}
    .download-btn svg{width:24px;height:24px}
    .platform-info{color:#666;font-size:14px;margin-bottom:32px}
    .alt-downloads{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
    .alt-btn{background:#1a1a1a;border:1px solid #333;color:#ccc;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;transition:all 0.2s}
    .alt-btn:hover{border-color:#6366f1;color:#fff}
    .version{color:#555;font-size:12px;margin-top:32px}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🔬</div>
    <h1>Remap Studios</h1>
    <p class="subtitle">Professional Neural Network IDE for Model Unlearning</p>
    <div id="download-section"></div>
    <div class="platform-info" id="platform-info"></div>
    <div class="alt-downloads" id="alt-downloads"></div>
    <p class="version" id="version-info"></p>
  </div>
  <script>
    async function init(){
      var ua=navigator.userAgent,isMac=ua.includes("Mac"),isWin=ua.includes("Windows"),isLinux=ua.includes("Linux");
      var builds=[];
      try{var r=await fetch("/api/builds");var d=await r.json();builds=d.builds||[]}catch(e){}
      var sec=document.getElementById("download-section"),pinfo=document.getElementById("platform-info"),alt=document.getElementById("alt-downloads");
      var pb=null;
      if(isMac)pb=builds.find(function(b){return b.platform==="darwin"&&b.arch==="arm64"})||builds.find(function(b){return b.platform==="darwin"});
      else if(isWin)pb=builds.find(function(b){return b.platform==="win32"});
      else if(isLinux)pb=builds.find(function(b){return b.platform==="linux"});
      if(pb){
        sec.innerHTML='<a href="'+pb.downloadUrl+'" class="download-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Download for '+(isMac?"macOS":isWin?"Windows":"Linux")+"</a>";
        pinfo.textContent=pb.filename+" · "+pb.sizeFormatted;
      }else{sec.innerHTML='<p style="color:#888;margin-bottom:20px">No builds available yet. Check back soon!</p>';}
      var other=builds.filter(function(b){return b!==pb});
      if(other.length>0){alt.innerHTML=other.map(function(b){return '<a href="'+b.downloadUrl+'" class="alt-btn">'+(b.platform==="darwin"?"🍎 macOS":b.platform==="win32"?"🪟 Windows":"🐧 Linux")+" ("+b.sizeFormatted+")</a>"}).join("");}
    }
    init();
  </script>
</body>
</html>`);
  });

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    var k = 1024, sizes = ["B", "KB", "MB", "GB"];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  console.log("✓  Build distribution routes loaded");
};
