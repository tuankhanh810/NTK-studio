import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ntkStudio', {
  platform: process.platform,
  version: '1.2.0',
  onBackendStatus: (callback: (status: { ready: boolean; port: number }) => void) => {
    ipcRenderer.on('backend-status', (_event, data) => callback(data));
  },
  getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
});
