const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tavonDesktop", {
  isDesktop: true,
  listPrinters: () => ipcRenderer.invoke("printers:list"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  onUpdateStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("updates:status", listener);
    return () => ipcRenderer.removeListener("updates:status", listener);
  }
});
