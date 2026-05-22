const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, Notification, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const wifi = require('node-wifi');
const Database = require('better-sqlite3');

const isDev = !app.isPackaged;
const dbPath = isDev ? path.join(__dirname, '..', 'aeronet.db') : path.join(app.getPath('userData'), 'aeronet.db');
const db = new Database(dbPath);

// Initialize DB schema
db.exec(`
  CREATE TABLE IF NOT EXISTS Settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    scan_interval INTEGER DEFAULT 60,
    data_retention_days INTEGER DEFAULT 30,
    auto_launch BOOLEAN DEFAULT 0,
    alert_evil_twin BOOLEAN DEFAULT 1,
    alert_weak_signal BOOLEAN DEFAULT 1,
    alert_channel_threshold INTEGER DEFAULT 70
  );
  
  CREATE TABLE IF NOT EXISTS NetworkScan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ssid TEXT,
    bssid TEXT,
    channel INTEGER,
    frequency INTEGER,
    signal_level INTEGER,
    security TEXT,
    band TEXT
  );
`);

// Create default settings if empty
const checkSettings = db.prepare('SELECT * FROM Settings WHERE id = 1').get();
if (!checkSettings) {
  db.prepare('INSERT INTO Settings (id) VALUES (1)').run();
}

wifi.init({ iface: null });

let mainWindow = null;
let tray = null;
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
    title: 'AeroNet Wi-Fi Optimizer Pro',
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
      sandbox: false,
      webSecurity: false // Disable CORS for file:// protocol
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist-react', 'index.html'));
  }

  if (state.maximized) mainWindow.maximize();

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
  tray.setToolTip('AeroNet Wi-Fi Optimizer Pro');

  const buildMenu = () => Menu.buildFromTemplate([
    { label: '📡 AeroNet Wi-Fi Optimizer', enabled: false },
    { type: 'separator' },
    {
      label: '🖥️  Pencereyi Aç',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else createWindow();
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

// ─── IPC Mesajları (Renderer ↔ Main) ─────────────────────────────────────────

ipcMain.handle('scan-wifi', async () => {
  try {
    const networks = await wifi.scan();
    
    // Map to AeroNet structure
    const mapped = networks.map(nw => {
      // 6GHz detection
      let band = '2.4GHz';
      let channel = nw.channel || 0;
      
      if (nw.frequency > 5000 && nw.frequency < 5900) {
        band = '5GHz';
      } else if (nw.frequency >= 5925) {
        band = '6GHz';
        // Basic map frequency to 6GHz channel
        // Ch 1 = 5955, Ch 2 = 5960. (Freq - 5950) / 5
        channel = Math.round((nw.frequency - 5950) / 5);
      }

      return {
        ssid: nw.ssid || 'Gizli Ağ',
        bssid: nw.bssid,
        channel: channel,
        frequency: nw.frequency || 0,
        signal_level: nw.signal_level || 0,
        quality: nw.quality || 0,
        security: nw.security || 'Açık',
        band: band
      };
    });

    return { success: true, networks: mapped };
  } catch (error) {
    console.error('Scan Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-settings', () => {
  return db.prepare('SELECT * FROM Settings WHERE id = 1').get();
});

ipcMain.handle('save-settings', (_, data) => {
  const stmt = db.prepare(`
    UPDATE Settings SET 
      scan_interval = @scan_interval,
      data_retention_days = @data_retention_days,
      auto_launch = @auto_launch,
      alert_evil_twin = @alert_evil_twin,
      alert_weak_signal = @alert_weak_signal,
      alert_channel_threshold = @alert_channel_threshold
    WHERE id = 1
  `);
  stmt.run({
    scan_interval: data.scan_interval || 60,
    data_retention_days: data.data_retention_days || 30,
    auto_launch: data.auto_launch ? 1 : 0,
    alert_evil_twin: data.alert_evil_twin ? 1 : 0,
    alert_weak_signal: data.alert_weak_signal ? 1 : 0,
    alert_channel_threshold: data.alert_channel_threshold || 70
  });
  return true;
});

ipcMain.handle('get-history', () => {
  return db.prepare('SELECT * FROM NetworkScan ORDER BY timestamp DESC LIMIT 100').all();
});

ipcMain.handle('save-scan-history', (_, data) => {
  const stmt = db.prepare(`
    INSERT INTO NetworkScan (ssid, bssid, channel, frequency, signal_level, security, band)
    VALUES (@ssid, @bssid, @channel, @frequency, @signal_level, @security, @band)
  `);
  stmt.run({
    ssid: data.ssid || 'Gizli Ağ',
    bssid: data.bssid || '',
    channel: data.channel || 0,
    frequency: data.frequency || 0,
    signal_level: data.signal_level || 0,
    security: data.security || 'Açık',
    band: data.band || '2.4GHz'
  });
  return true;
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
    createWindow();
    createTray();
  });

  app.on('window-all-closed', (e) => {
    if (process.platform !== 'darwin') e.preventDefault();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    db.close();
  });

  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });
}
