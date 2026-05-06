#!/usr/bin/env node
/**
 * build-universal.js
 * Compila o instalador universal Tavon Suite via NSIS.
 *
 * Pré-requisitos:
 *  1. npm run dist:win:universal:only  (gera release/windows/win-unpacked/)
 *  2. NSIS instalado no sistema (makensis no PATH)
 *     Windows: https://nsis.sourceforge.io/Download
 *     macOS:   brew install makensis
 *
 * Uso:
 *   node build-universal.js
 */

const { execSync, spawnSync } = require("child_process");
const path = require("path");
const fs   = require("fs");

const ROOT         = path.resolve(__dirname, "..", "..");
const DESKTOP_DIR  = __dirname;
const RELEASE_DIR  = path.join(ROOT, "release", "windows");
const NSI_TPL      = path.join(DESKTOP_DIR, "build", "installer", "universal.nsi");
const NSI_OUT      = path.join(DESKTOP_DIR, "build", "installer", "universal-compiled.nsi");

// ── Read version from package.json ────────────────────────────────────────────
const pkg     = JSON.parse(fs.readFileSync(path.join(DESKTOP_DIR, "package.json"), "utf8"));
const version = pkg.version;

// ── Find the EXE name inside win-unpacked ─────────────────────────────────────
const unpackedDir = path.join(RELEASE_DIR, "win-unpacked");
if (!fs.existsSync(unpackedDir)) {
  console.error(`❌  win-unpacked not found: ${unpackedDir}`);
  console.error("   Run: npm run dist:win:universal:only   first.");
  process.exit(1);
}

const exeFiles = fs.readdirSync(unpackedDir).filter(f => f.endsWith(".exe") && !f.startsWith("Uninstall"));
if (!exeFiles.length) {
  console.error("❌  No .exe found in win-unpacked/");
  process.exit(1);
}
const exeName = exeFiles[0];
console.log(`✓  Found binary: ${exeName}`);
console.log(`✓  Version:      ${version}`);

// ── Prepare NSIS script (replace template vars) ───────────────────────────────
let nsiContent = fs.readFileSync(NSI_TPL, "utf8");
nsiContent = nsiContent
  .replace(/VAR_VERSION/g, version)
  .replace(/VAR_EXE_NAME/g, exeName);

fs.mkdirSync(path.dirname(NSI_OUT), { recursive: true });
fs.writeFileSync(NSI_OUT, nsiContent, "utf8");
console.log(`✓  NSIS script written: ${path.relative(DESKTOP_DIR, NSI_OUT)}`);

// ── Find makensis ──────────────────────────────────────────────────────────────
function findMakensis() {
  // Try PATH first
  const fromPath = spawnSync("makensis", ["--version"], { shell: true });
  if (fromPath.status === 0) return "makensis";

  // Common Windows install location
  const winPaths = [
    "C:\\Program Files (x86)\\NSIS\\makensis.exe",
    "C:\\Program Files\\NSIS\\makensis.exe",
  ];
  for (const p of winPaths) {
    if (fs.existsSync(p)) return `"${p}"`;
  }

  // electron-builder bundles makensis via nsis-resources
  const candidates = [
    path.join(ROOT, "node_modules", "app-builder-bin", "win", "x64", "nsis", "makensis.exe"),
    path.join(ROOT, "node_modules", "electron-builder", "node_modules", "app-builder-lib", "vendor", "nsis", "windows", "makensis.exe"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return `"${c}"`;
  }

  return null;
}

const makensis = findMakensis();
if (!makensis) {
  console.error("❌  makensis not found. Install NSIS: https://nsis.sourceforge.io/Download");
  console.error(`   The compiled NSI script is ready at: ${NSI_OUT}`);
  process.exit(1);
}

// ── Compile ───────────────────────────────────────────────────────────────────
console.log(`\n🔨  Compiling installer...`);
try {
  execSync(`${makensis} "${NSI_OUT}"`, {
    cwd: DESKTOP_DIR,
    stdio: "inherit",
    shell: true,
  });
  console.log(`\n✅  Universal installer built: release/windows/Tavon-Suite-Setup-${version}.exe`);
} catch (err) {
  console.error("❌  makensis failed.");
  process.exit(1);
}
