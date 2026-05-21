const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scanWifi: () => ipcRenderer.invoke('scan-wifi'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  getHistory: () => ipcRenderer.invoke('get-history'),
  saveHistory: (data) => ipcRenderer.invoke('save-scan-history', data),
  
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  quitApp: () => ipcRenderer.invoke('quit-app')
});
