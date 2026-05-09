"use strict";
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path  = require("path");
const https = require("https");
const http  = require("http");
const fs    = require("fs");
const os    = require("os");
const cp    = require("child_process");

const GITHUB_REPO = "renezit0/tavon";

// ─── Window ──────────────────────────────────────────────────────────────────
let win;
function createWindow() {
  win = new BrowserWindow({
    width:           860,
    height:          600,
    frame:           false,
    resizable:       false,
    transparent:     false,
    backgroundColor: "#0d0d10",
    center:          true,
    show:            false,
    webPreferences: {
      preload:          path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });
  win.loadFile(path.join(__dirname, "index.html"));
  win.once("ready-to-show", () => win.show());
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

// ─── Window controls ─────────────────────────────────────────────────────────
ipcMain.handle("win:close",    () => win.close());
ipcMain.handle("win:minimize", () => win.minimize());

// ─── Fetch GitHub releases ────────────────────────────────────────────────────
ipcMain.handle("fetch:releases", async () => {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.github.com",
      path:     `/repos/${GITHUB_REPO}/releases?per_page=30`,
      headers:  { "User-Agent": "TavonInstaller/1.0" },
    };
    https.get(opts, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e.message); }
      });
    }).on("error", (e) => reject(e.message));
  });
});

// ─── Download module installer ────────────────────────────────────────────────
ipcMain.handle("download:module", async (event, { url, filename }) => {
  const tmpDir  = path.join(os.tmpdir(), "tavon-installer");
  fs.mkdirSync(tmpDir, { recursive: true });
  const outPath = path.join(tmpDir, filename);

  return new Promise((resolve, reject) => {
    const follow = (u) => {
      const mod = u.startsWith("https") ? https : http;
      mod.get(u, { headers: { "User-Agent": "TavonInstaller/1.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return follow(res.headers.location);
        }
        const total = parseInt(res.headers["content-length"] || "0", 10);
        let downloaded = 0;
        const file = fs.createWriteStream(outPath);
        res.on("data", (chunk) => {
          downloaded += chunk.length;
          file.write(chunk);
          if (total > 0) {
            event.sender.send("download:progress", {
              filename,
              percent: Math.round((downloaded / total) * 100),
              downloaded,
              total,
            });
          }
        });
        res.on("end", () => {
          file.end();
          event.sender.send("download:progress", { filename, percent: 100, downloaded: total, total });
          resolve(outPath);
        });
        res.on("error", reject);
      }).on("error", reject);
    };
    follow(url);
  });
});

// ─── Run installer ────────────────────────────────────────────────────────────
ipcMain.handle("install:module", async (_event, exePath) => {
  return new Promise((resolve, reject) => {
    const child = cp.spawn(exePath, [], { detached: true, stdio: "ignore" });
    child.on("error", reject);
    child.unref();
    resolve(true);
  });
});

// ─── Open folder ─────────────────────────────────────────────────────────────
ipcMain.handle("open:folder", (_event, p) => shell.openPath(p));
