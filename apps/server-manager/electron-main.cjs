const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const os = require("node:os");
const crypto = require("node:crypto");

// ── Config ───────────────────────────────────────────────────────────────────

function configPath() {
  return path.join(app.getPath("userData"), "server-config.json");
}

const DEFAULT_CONFIG = {
  port: 3333,
  host: "0.0.0.0",
  storage: "memory",
  dbHost: "localhost",
  dbPort: 3306,
  dbName: "tavon",
  dbUser: "root",
  dbPassword: "",
  jwtSecret: crypto.randomUUID(),
  autoStart: true,
  externalMode: false,
  externalUrl: ""
};

function loadConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath(), "utf-8")) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), "utf-8");
}

// ── Resource path ─────────────────────────────────────────────────────────────

function resourcePath(...segs) {
  if (app.isPackaged) return path.join(process.resourcesPath, ...segs);
  return path.join(__dirname, "..", ...segs);
}

// ── Server process ────────────────────────────────────────────────────────────

let serverProc = null;
let serverStatus = "stopped";
let serverStartTime = null;
const logs = [];
let win = null;

function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "127.0.0.1";
}

function configToEnv(cfg) {
  const env = {
    NODE_ENV: "production",
    API_HOST: cfg.host,
    API_PORT: String(cfg.port),
    API_STORAGE: cfg.storage,
    JWT_SECRET: cfg.jwtSecret,
    CORS_ORIGIN: "*",
    APP_PUBLIC_URL: `http://localhost:${cfg.port}`
  };
  if (cfg.storage === "mysql") {
    Object.assign(env, {
      DB_HOST: cfg.dbHost,
      DB_PORT: String(cfg.dbPort),
      DB_NAME: cfg.dbName,
      DB_USER: cfg.dbUser,
      DB_PASSWORD: cfg.dbPassword
    });
  }
  return env;
}

function pushLog(level, msg) {
  const raw = msg.trim();
  if (!raw) return;
  const entry = { level, msg: raw, time: new Date().toISOString() };
  logs.push(entry);
  if (logs.length > 400) logs.shift();
  win?.webContents.send("server:log", entry);
}

function broadcastStatus() {
  const uptime = serverStartTime ? Math.floor((Date.now() - serverStartTime) / 1000) : 0;
  win?.webContents.send("server:status", { status: serverStatus, uptime });
}

function startServer() {
  if (serverProc) return;
  const cfg = loadConfig();

  if (cfg.externalMode) {
    serverStatus = "external";
    broadcastStatus();
    return;
  }

  const apiPath = resourcePath("api", "dist", "server.js");
  pushLog("info", `▶ Iniciando Tavon Server na porta ${cfg.port}...`);

  serverProc = spawn(process.execPath, [apiPath], {
    env: { ...process.env, ...configToEnv(cfg), ELECTRON_RUN_AS_NODE: "1" }
  });

  serverStatus = "starting";
  serverStartTime = Date.now();
  broadcastStatus();

  const onOutput = (buf, level) => {
    const text = buf.toString();
    pushLog(level, text);
    if (/listening|started|server running/i.test(text) && serverStatus !== "running") {
      serverStatus = "running";
      broadcastStatus();
    }
  };

  serverProc.stdout.on("data", (buf) => onOutput(buf, "info"));
  serverProc.stderr.on("data", (buf) => onOutput(buf, level_for(buf.toString())));

  serverProc.on("exit", (code) => {
    serverProc = null;
    serverStatus = code === 0 || code === null ? "stopped" : "error";
    serverStartTime = null;
    pushLog("info", `■ Servidor encerrado (código ${code ?? "–"})`);
    broadcastStatus();
  });

  // Fastify escreve no stderr em JSON — considera rodando após 3s se não saiu
  setTimeout(() => {
    if (serverProc && serverStatus === "starting") {
      serverStatus = "running";
      broadcastStatus();
    }
  }, 3000);
}

function level_for(text) {
  if (/error|err/i.test(text)) return "error";
  if (/warn/i.test(text)) return "warn";
  return "info";
}

function stopServer() {
  if (!serverProc) return;
  pushLog("info", "■ Encerrando servidor...");
  serverProc.kill("SIGTERM");
  const timer = setTimeout(() => serverProc?.kill("SIGKILL"), 3000);
  serverProc.once("exit", () => clearTimeout(timer));
}

function restartServer() {
  if (serverProc) {
    serverProc.once("exit", () => setTimeout(startServer, 500));
    stopServer();
  } else {
    startServer();
  }
}

// ── Window ────────────────────────────────────────────────────────────────────

function createWindow() {
  win = new BrowserWindow({
    width: 860,
    height: 680,
    minWidth: 680,
    minHeight: 520,
    backgroundColor: "#111417",
    title: "Tavon Server",
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  win.once("ready-to-show", () => win.show());

  if (process.env.WEB_URL) {
    win.loadURL(process.env.WEB_URL);
  } else {
    win.loadFile(path.join(__dirname, "ui-dist", "index.html"));
  }

  // Minimizar em vez de fechar se o servidor estiver rodando
  win.on("close", (e) => {
    if (serverProc) {
      e.preventDefault();
      win.minimize();
    }
  });
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle("server:start", () => { startServer(); return true; });
ipcMain.handle("server:stop", () => { stopServer(); return true; });
ipcMain.handle("server:restart", () => { restartServer(); return true; });
ipcMain.handle("server:status", () => ({
  status: serverStatus,
  uptime: serverStartTime ? Math.floor((Date.now() - serverStartTime) / 1000) : 0
}));
ipcMain.handle("server:logs", () => logs);
ipcMain.handle("server:clear-logs", () => { logs.length = 0; return true; });
ipcMain.handle("server:local-ip", () => getLocalIp());
ipcMain.handle("config:get", () => loadConfig());
ipcMain.handle("config:save", (_e, cfg) => { saveConfig(cfg); return true; });
ipcMain.handle("server:open-browser", (_e, port) => {
  shell.openExternal(`http://localhost:${port}`);
  return true;
});

// Broadcast uptime a cada 5s enquanto rodando
setInterval(() => {
  if (serverStatus === "running") broadcastStatus();
}, 5000);

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  const cfg = loadConfig();
  if (cfg.autoStart && !cfg.externalMode) {
    setTimeout(startServer, 1000);
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else win?.show();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !serverProc) app.quit();
});

app.on("before-quit", () => {
  stopServer();
  if (process.platform === "win32") setTimeout(() => process.exit(0), 2000);
});
