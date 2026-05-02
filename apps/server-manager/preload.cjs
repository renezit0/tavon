const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tavonServer", {
  start: () => ipcRenderer.invoke("server:start"),
  stop: () => ipcRenderer.invoke("server:stop"),
  restart: () => ipcRenderer.invoke("server:restart"),
  getStatus: () => ipcRenderer.invoke("server:status"),
  getLogs: () => ipcRenderer.invoke("server:logs"),
  clearLogs: () => ipcRenderer.invoke("server:clear-logs"),
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (cfg) => ipcRenderer.invoke("config:save", cfg),
  openBrowser: (port) => ipcRenderer.invoke("server:open-browser", port),
  getLocalIp: () => ipcRenderer.invoke("server:local-ip"),
  onStatus: (cb) => {
    const fn = (_e, data) => cb(data);
    ipcRenderer.on("server:status", fn);
    return () => ipcRenderer.removeListener("server:status", fn);
  },
  onLog: (cb) => {
    const fn = (_e, entry) => cb(entry);
    ipcRenderer.on("server:log", fn);
    return () => ipcRenderer.removeListener("server:log", fn);
  }
});
