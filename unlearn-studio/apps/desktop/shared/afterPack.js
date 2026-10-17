// Hardens the shipped Windows binary after electron-builder has produced it.
//
// Fuses rewrite bytes inside the executable itself, so they cannot be changed
// by editing the asar archive later. The set below:
//   RunAsNode / NODE_OPTIONS / --inspect  off — the binary is an app, not a
//     general-purpose Node runtime for anyone who can set an environment
//     variable.
//   OnlyLoadAppFromAsar + embeddedAsarIntegrityValidation  on — a modified
//     app.asar is refused at launch instead of executed.
//   GrantFileProtocolExtraPrivileges  off — the renderer is served over
//     http://localhost, so file:// extra privileges are unnecessary.
//
// Required because electron-builder 26 dropped its `electronFuses` config key.

const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

// @electron/fuses is ESM-only, so it is imported by file URL rather than
// required: a bare require of the package directory throws ERR_MODULE_NOT_FOUND.
const FUSES_ENTRY = pathToFileURL(
  path.join(__dirname, "node_modules", "@electron", "fuses", "dist", "index.js")
).href;

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const { flipFuses, FuseVersion, FuseV1Options } = await import(FUSES_ENTRY);
  const executable = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.exe`
  );
  if (!fs.existsSync(executable)) {
    throw new Error(`afterPack: executable not found at ${executable}`);
  }

  await flipFuses(executable, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });

  console.log(`  • hardened electron fuses  file=${path.basename(executable)}`);
};
