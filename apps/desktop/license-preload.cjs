const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tavonLicense", {
  getModule:  ()      => ipcRenderer.invoke("license:getModule"),
  validate:   (key)   => ipcRenderer.invoke("license:validate", key),
  openSupport: ()     => ipcRenderer.invoke("license:openSupport"),
});
