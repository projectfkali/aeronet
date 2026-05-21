const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, Notification } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

// ─── Ortam Ayarları ───────────────────────────────────────────────────────────
const isDev = !app.isPackaged;
const PORT = 3000;

// ─── Global Referanslar ───────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let serverProcess = null;
let isQuitting = false;

// ─── Pencere Durumu Kalıcılığı ────────────────────────────────────────────────
const windowStatePath = path.join(app.getPath('userData'), 'window-state.json');
function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(windowStatePath, 'utf-8'));
  } catch {
    return { width: 1280, height: 820, x: undefined, y: undefined, maximized: false };
  }
}
function saveWindowState(win) {
  if (!win) return;
  const bounds = win.getBounds();
  const state = { ...bounds, maximized: win.isMaximized() };
  fs.writeFileSync(windowStatePath, JSON.stringify(state));
}

// ─── Express Sunucusunu Fork Et ───────────────────────────────────────────────
function startServer() {
  const serverPath = path.join(__dirname, '..', 'server.js');
  serverProcess = fork(serverPath, [], {
    silent: true,
    env: { ...process.env, PORT, ELECTRON_RUN_AS_NODE: '1' }
  });

  serverProcess.stdout?.on('data', (d) => console.log('[Server]', d.toString().trim()));
  serverProcess.stderr?.on('data', (d) => console.error('[Server Error]', d.toString().trim()));

  serverProcess.on('error', (err) => console.error('Sunucu başlatma hatası:', err));
  serverProcess.on('exit', (code) => {
    if (!isQuitting) {
      console.warn(`Sunucu beklenmedik çıkış (${code}), yeniden başlatılıyor...`);
      setTimeout(startServer, 2000);
    }
  });
}

// ─── Ana Pencere ──────────────────────────────────────────────────────────────
function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 960,
    minHeight: 640,
    title: 'AeroNet Wi-Fi Optimizer',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#060a13',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0d1424',
      symbolColor: '#94a3b8',
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Express hazır olana kadar retry loop ile yükle
  function loadWithRetry(attempt = 0) {
    mainWindow.loadURL(`http://localhost:${PORT}`).catch(() => {
      if (attempt < 15) {
        setTimeout(() => loadWithRetry(attempt + 1), 800);
      }
    });
  }
  setTimeout(() => loadWithRetry(), 1500);

  if (state.maximized) mainWindow.maximize();

  // Splashscreen: sunucu hazır olmadan önce boş sayfa yerine loading göster
  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => mainWindow.loadURL(`http://localhost:${PORT}`), 800);
  });

  mainWindow.on('close', (e) => {
    saveWindowState(mainWindow);
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'AeroNet arka planda çalışıyor',
          body: 'Wi-Fi izleme devam ediyor. Çıkmak için tray ikonuna sağ tıklayın.',
          icon: path.join(__dirname, '..', 'assets', 'icon.png')
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Harici linkleri sistem tarayıcısında aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ─── System Tray ─────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip('AeroNet Wi-Fi Optimizer');

  const buildMenu = () => Menu.buildFromTemplate([
    {
      label: '📡 AeroNet Wi-Fi Optimizer',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '🖥️  Pencereyi Aç',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: '🔄  Şimdi Tara',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.executeJavaScript('window.fetchScanData && window.fetchScanData()');
        }
      }
    },
    { type: 'separator' },
    {
      label: '⚙️  Ayarlar',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.executeJavaScript("document.getElementById('btn-settings')?.click()");
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌  Çıkış',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(buildMenu());
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// ─── Windows Auto-Launch ──────────────────────────────────────────────────────
function setAutoLaunch(enabled) {
  const appName = 'AeroNet Wi-Fi Optimizer';
  const exePath = process.execPath;

  if (process.platform !== 'win32') return;

  try {
    const { execSync } = require('child_process');
    if (enabled) {
      execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /t REG_SZ /d "${exePath}" /f`);
    } else {
      execSync(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /f`);
    }
  } catch (e) {
    console.warn('Auto-launch ayarı yapılamadı:', e.message);
  }
}

function isAutoLaunchEnabled() {
  try {
    const { execSync } = require('child_process');
    const result = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "AeroNet Wi-Fi Optimizer"').toString();
    return result.includes('AeroNet');
  } catch {
    return false;
  }
}

// ─── IPC Mesajları (Renderer ↔ Main) ─────────────────────────────────────────
ipcMain.handle('get-auto-launch', () => isAutoLaunchEnabled());
ipcMain.handle('set-auto-launch', (_, enabled) => {
  setAutoLaunch(enabled);
  return isAutoLaunchEnabled();
});

ipcMain.handle('show-notification', (_, { title, body, urgency }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title,
      body,
      icon: path.join(__dirname, '..', 'assets', 'icon.png'),
      urgency: urgency || 'normal'
    });
    notif.on('click', () => {
      if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    });
    notif.show();
  }
});

ipcMain.handle('open-external', (_, url) => shell.openExternal(url));

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('quit-app', () => {
  isQuitting = true;
  app.quit();
});

ipcMain.handle('minimize-to-tray', () => {
  if (mainWindow) mainWindow.hide();
});

// ─── Uygulama Yaşam Döngüsü ──────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    startServer();
    createWindow();
    createTray();
  });

  app.on('window-all-closed', (e) => {
    // Windows/Linux'ta tüm pencereler kapanınca uygulamayı bitirme (tray'de devam et)
    if (process.platform !== 'darwin') e.preventDefault();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });
}
