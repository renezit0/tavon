"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("installer", {
  close:       ()           => ipcRenderer.invoke("win:close"),
  minimize:    ()           => ipcRenderer.invoke("win:minimize"),
  fetchReleases: ()         => ipcRenderer.invoke("fetch:releases"),
  download:    (mod)        => ipcRenderer.invoke("download:module", mod),
  install:     (exePath)    => ipcRenderer.invoke("install:module", exePath),
  onProgress:  (cb)        => ipcRenderer.on("download:progress", (_e, d) => cb(d)),
  openFolder:  (p)          => ipcRenderer.invoke("open:folder", p),
});
