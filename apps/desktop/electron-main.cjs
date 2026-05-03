const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleRoutes = {
  admin: "/admin",
  cardapio: "/cardapio?table=M01",
  garcom: "/garcom",
  cozinha: "/cozinha",
  caixa: "/caixa"
};

function resourcePath(...segments) {
  if (app.isPackaged) return path.join(process.resourcesPath, ...segments);
  return path.join(__dirname, "..", ...segments);
}

function inferModuleFromProductName() {
  const metadataModule = readPackageMetadata().tavonModule;
  if (metadataModule && moduleRoutes[metadataModule]) return metadataModule;

  const name = `${app.getName()} ${process.execPath}`.toLowerCase();
  if (name.includes("admin")) return "admin";
  if (name.includes("cardapio") || name.includes("cardápio")) return "cardapio";
  if (name.includes("garcom") || name.includes("garçom")) return "garcom";
  if (name.includes("cozinha")) return "cozinha";
  if (name.includes("caixa")) return "caixa";
  return "admin";
}

function readPackageMetadata() {
  try {
    return JSON.parse(fs.readFileSync(path.join(app.getAppPath(), "package.json"), "utf8"));
  } catch {
    return {};
  }
}

function configPath() {
  return path.join(app.getPath("userData"), "tavon-config.json");
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(nextConfig) {
  const current = readConfig();
  const merged = {
    serverUrl: "http://127.0.0.1:3333",
    ...current,
    ...nextConfig
  };
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(merged, null, 2));
  return merged;
}

function getServerUrl() {
  return (readConfig().serverUrl || process.env.TAVON_SERVER_URL || "http://127.0.0.1:3333").replace(/\/+$/, "");
}

function resolveInitialRoute() {
  const moduleName = (process.env.APP_MODULE || inferModuleFromProductName()).toLowerCase();
  return moduleRoutes[moduleName] || moduleRoutes.admin;
}

function resolveModuleName() {
  return (process.env.APP_MODULE || inferModuleFromProductName()).toLowerCase();
}

async function startApi() {
  if (process.env.WEB_URL) return;
  if (process.env.TAVON_START_EMBEDDED_API !== "1") return;

  process.env.API_HOST = process.env.API_HOST || "127.0.0.1";
  process.env.API_PORT = process.env.API_PORT || "3333";
  process.env.APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "http://localhost:5180";
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 700);
    const response = await fetch(`http://127.0.0.1:${process.env.API_PORT}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (response.ok) return;
  } catch {
    // No local API is active yet; this desktop process will start it.
  }

  const apiPath = resourcePath("api", "dist", "server.js");
  await import(pathToFileURL(apiPath).href);
}

function createWindow() {
  const moduleName = resolveModuleName();
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#111417",
    title: app.getName(),
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  const devUrl = process.env.WEB_URL;
  const initialRoute = resolveInitialRoute();
  if (devUrl) {
    const url = new URL(`${devUrl}${initialRoute}`);
    url.searchParams.set("appModule", moduleName);
    url.searchParams.set("apiUrl", getServerUrl());
    mainWindow.loadURL(url.toString());
  } else {
    const indexUrl = pathToFileURL(resourcePath("web", "dist", "index.html"));
    indexUrl.searchParams.set("appRoute", initialRoute.split("?")[0]);
    indexUrl.searchParams.set("appModule", moduleName);
    indexUrl.searchParams.set("apiUrl", getServerUrl());
    const query = initialRoute.split("?")[1];
    if (query) {
      for (const [key, value] of new URLSearchParams(query)) {
        indexUrl.searchParams.set(key, value);
      }
    }
    mainWindow.loadURL(indexUrl.toString());
  }

  setupAutoUpdates(mainWindow);
}

function setupAutoUpdates(mainWindow) {
  if (!app.isPackaged || process.env.TAVON_DISABLE_AUTO_UPDATE === "1") return;

  // Never download automatically — renderer controls the flow
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  const send = (payload) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send("updates:status", payload);
  };

  autoUpdater.on("checking-for-update", () => {
    send({ status: "checking", message: "Verificando atualizacoes..." });
  });

  autoUpdater.on("update-available", (info) => {
    send({ status: "available", version: info.version, releaseNotes: info.releaseNotes || "" });
  });

  autoUpdater.on("update-not-available", () => {
    send({ status: "idle", message: "Aplicativo ja esta atualizado." });
  });

  autoUpdater.on("error", (error) => {
    send({ status: "error", message: error?.message || "Falha ao verificar atualizacao." });
  });

  autoUpdater.on("download-progress", (progress) => {
    send({ status: "downloading", percent: Math.round(progress.percent || 0) });
  });

  autoUpdater.on("update-downloaded", (info) => {
    send({ status: "downloaded", version: info.version });
  });

  // First check 10 s after startup, then every 30 min
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => undefined), 10000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => undefined), 30 * 60 * 1000);
}

ipcMain.handle("printers:list", async (event) => {
  const printers = await event.sender.getPrintersAsync();
  return printers.map((printer) => ({
    name: printer.name,
    displayName: printer.displayName || printer.name,
    description: printer.description || "",
    status: printer.status,
    isDefault: Boolean(printer.isDefault)
  }));
});

ipcMain.handle("config:get", () => ({
  module: resolveModuleName(),
  serverUrl: getServerUrl(),
  ...readConfig()
}));

ipcMain.handle("config:set", (_event, nextConfig) => writeConfig(nextConfig || {}));

ipcMain.handle("print:silent", async (event, input = {}) => {
  const html = String(input.html || "");
  if (!html.trim()) throw new Error("Conteudo de impressao vazio");

  const printWindow = new BrowserWindow({
    show: false,
    width: 320,
    height: 800,
    webPreferences: {
      sandbox: true
    }
  });

  const documentHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: 80mm auto; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #fff; color: #111; font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      .thermal-ticket { width: 80mm; padding: 4mm; color: #111; background: #fff; }
      .thermal-ticket h1 { margin: 0 0 3mm; text-align: center; font-size: 16px; letter-spacing: 0; }
      .thermal-ticket p { margin: 2mm 0; text-align: center; }
      .thermal-row, .thermal-line { display: flex; justify-content: space-between; gap: 4mm; margin: 1.5mm 0; }
      .thermal-divider { border-top: 1px dashed #111; margin: 3mm 0; }
      .thermal-item { margin: 2mm 0; }
      .thermal-item strong, .thermal-item small { display: block; }
      .thermal-total { font-size: 14px; font-weight: 700; }
    </style>
  </head>
  <body>${html}</body>
</html>`;

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(documentHtml)}`);

  return new Promise((resolve, reject) => {
    const options = {
      silent: true,
      printBackground: true,
      margins: { marginType: "none" }
    };
    if (input.deviceName) options.deviceName = String(input.deviceName);

    printWindow.webContents.print(options, (success, failureReason) => {
      printWindow.close();
      if (success) {
        event.sender.send("print:status", { status: "printed" });
        resolve({ ok: true });
      } else {
        reject(new Error(failureReason || "Falha ao imprimir"));
      }
    });
  });
});

ipcMain.handle("updates:check", async () => {
  if (!app.isPackaged) {
    return { status: "dev", message: "Atualizacao automatica disponivel apenas no app instalado." };
  }
  autoUpdater.checkForUpdates().catch(() => undefined);
  return { status: "checking" };
});

ipcMain.handle("updates:download", async () => {
  if (!app.isPackaged) return;
  autoUpdater.downloadUpdate().catch(() => undefined);
});

ipcMain.handle("updates:install", () => {
  autoUpdater.quitAndInstall(false, true);
});

app.whenReady().then(async () => {
  await startApi();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  // Garante que o processo termina completamente no Windows
  if (process.platform === "win32") {
    setTimeout(() => process.exit(0), 1500);
  }
});
