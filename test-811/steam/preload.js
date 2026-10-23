'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('vsHost', {
  platform: process.platform,
  loadSave: () => ipcRenderer.sendSync('save:load'),
  writeSave: (o) => ipcRenderer.send('save:write', o),
  setFullscreen: (b) => ipcRenderer.send('fs:set', !!b),
  isFullscreen: () => ipcRenderer.sendSync('fs:get'),
  quit: () => ipcRenderer.send('app:quit'),
  syncAch: (list) => ipcRenderer.send('steam:sync', list),
  steam: {
    unlock: (name) => ipcRenderer.send('steam:unlock', name),
    available: () => ipcRenderer.sendSync('steam:status').available,
    status: () => ipcRenderer.sendSync('steam:status').status,
  },
});
