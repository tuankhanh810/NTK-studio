import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ntkStudio', {
  platform: process.platform,
  version: '1.1.0',
});
