const { contextBridge, ipcRenderer } = require('electron');

// Renderer process'e güvenli şekilde Electron API'yi açıyoruz
contextBridge.exposeInMainWorld('electronAPI', {
  // Uygulama Bilgisi
  getVersion: () => ipcRenderer.invoke('get-app-version'),

  // Auto-Launch (Windows başlangıcı)
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),

  // Native Bildirimler
  showNotification: (opts) => ipcRenderer.invoke('show-notification', opts),

  // Pencere Kontrolleri
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  quitApp: () => ipcRenderer.invoke('quit-app'),

  // Harici Link
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Electron ortamında olup olmadığını kontrol
  isElectron: true
});
