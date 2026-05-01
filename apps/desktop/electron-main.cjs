const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
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
  const name = app.getName().toLowerCase();
  if (name.includes("admin")) return "admin";
  if (name.includes("cardapio") || name.includes("cardápio")) return "cardapio";
  if (name.includes("garcom") || name.includes("garçom")) return "garcom";
  if (name.includes("cozinha")) return "cozinha";
  if (name.includes("caixa")) return "caixa";
  return "admin";
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
    mainWindow.loadURL(`${devUrl}${initialRoute}`);
  } else {
    const indexUrl = pathToFileURL(resourcePath("web", "dist", "index.html"));
    indexUrl.searchParams.set("appRoute", initialRoute.split("?")[0]);
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

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    mainWindow.webContents.send("updates:status", {
      status: "checking",
      message: "Verificando atualizacoes"
    });
  });

  autoUpdater.on("update-available", (info) => {
    mainWindow.webContents.send("updates:status", {
      status: "available",
      version: info.version,
      message: `Atualizacao ${info.version} encontrada`
    });
  });

  autoUpdater.on("update-not-available", () => {
    mainWindow.webContents.send("updates:status", {
      status: "idle",
      message: "Aplicativo atualizado"
    });
  });

  autoUpdater.on("error", (error) => {
    mainWindow.webContents.send("updates:status", {
      status: "error",
      message: error?.message || "Falha ao verificar atualizacao"
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    mainWindow.webContents.send("updates:status", {
      status: "downloading",
      percent: Math.round(progress.percent || 0),
      message: `Baixando atualizacao ${Math.round(progress.percent || 0)}%`
    });
  });

  autoUpdater.on("update-downloaded", async (info) => {
    mainWindow.webContents.send("updates:status", {
      status: "downloaded",
      version: info.version,
      message: `Atualizacao ${info.version} pronta`
    });

    const response = await dialog.showMessageBox(mainWindow, {
      type: "info",
      buttons: ["Reiniciar agora", "Depois"],
      defaultId: 0,
      cancelId: 1,
      title: "Atualizacao pronta",
      message: `A versao ${info.version} foi baixada.`,
      detail: "Reinicie o aplicativo para aplicar a atualizacao."
    });

    if (response.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => undefined);
  }, 8000);

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => undefined);
  }, 30 * 60 * 1000);
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

ipcMain.handle("updates:check", async () => {
  if (!app.isPackaged) {
    return { status: "disabled", message: "Atualizacao automatica disponivel apenas no app instalado" };
  }

  const result = await autoUpdater.checkForUpdates();
  return {
    status: result?.updateInfo ? "ok" : "idle",
    version: result?.updateInfo?.version
  };
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
