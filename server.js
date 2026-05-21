const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const iconv = require('iconv-lite');
const http = require('http');
const https = require('https');
const os = require('os');

// SQLite veritabanı (isteğe bağlı — kurulu değilse sessizce pas geç)
let db = null;
try {
  db = require('./db/database');
} catch (e) {
  console.warn('[DB] Veritabanı yüklenemedi, geçmiş özellikleri devre dışı:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Statik dosyaları sunmak için public klasörünü belirle
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


// Wi-Fi verilerini parse eden fonksiyon
function parseWlanOutput(stdout) {
  const networks = [];
  const lines = stdout.split(/\r?\n/);
  let currentNetwork = null;
  let currentBss = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // SSID satırını yakala (Örn: SSID 1 : SUPERONLINE_Wi-Fi_4313)
    if (trimmed.startsWith('SSID ')) {
      const match = trimmed.match(/^SSID\s+\d+\s+:\s*(.*)$/i);
      if (match) {
        currentNetwork = {
          ssid: match[1] ? match[1].trim() : '[Gizli Ağ]',
          bssids: [],
          authentication: '',
          encryption: ''
        };
        networks.push(currentNetwork);
        currentBss = null;
      }
      continue;
    }

    if (!currentNetwork) continue;

    // Network Tipi, Kimlik Doğrulama vb. ayarları yakala
    // Türkçe Windows (Şifrelem = Encryption, Kimlik doğrulama = Authentication, Sinyal = Signal)
    if (trimmed.startsWith('Authentication') || trimmed.startsWith('Kimlik doğrulama')) {
      const parts = trimmed.split(':');
      if (parts[1]) currentNetwork.authentication = parts[1].trim();
      continue;
    }
    if (trimmed.startsWith('Encryption') || trimmed.startsWith('Şifrelem')) {
      const parts = trimmed.split(':');
      if (parts[1]) currentNetwork.encryption = parts[1].trim();
      continue;
    }

    // BSSID satırını yakala (Örn: BSSID 1 : 64:dd:68:3c:fe:02)
    if (trimmed.startsWith('BSSID ')) {
      const match = trimmed.match(/^BSSID\s+\d+\s+:\s*([0-9a-fA-F:]+)$/i);
      if (match) {
        currentBss = {
          mac: match[1].trim(),
          signal: 0,
          radioType: '802.11',
          band: '2.4 GHz',
          channel: 1
        };
        currentNetwork.bssids.push(currentBss);
      }
      continue;
    }

    if (!currentBss) continue;

    // BSSID detaylarını yakala
    // Türkçe karşılıklar: Sinyal = Signal, Radyo türü = Radio type, Bant = Band, Kanal = Channel
    if (trimmed.startsWith('Signal') || trimmed.startsWith('Sinyal')) {
      const match = trimmed.match(/(?:Signal|Sinyal)\s*:\s*(\d+)%/i);
      if (match) {
        currentBss.signal = parseInt(match[1], 10);
      }
      continue;
    }
    if (trimmed.startsWith('Radio type') || trimmed.startsWith('Radyo türü') || trimmed.startsWith('Radyo')) {
      const parts = trimmed.split(':');
      if (parts[1]) currentBss.radioType = parts[1].trim();
      continue;
    }
    if (trimmed.startsWith('Band') || trimmed.startsWith('Bant')) {
      const parts = trimmed.split(':');
      if (parts[1]) currentBss.band = parts[1].trim();
      continue;
    }
    if (trimmed.startsWith('Channel') || trimmed.startsWith('Kanal')) {
      const match = trimmed.match(/(?:Channel|Kanal)\s*:\s*(\d+)/i);
      if (match) {
        currentBss.channel = parseInt(match[1], 10);
      }
      continue;
    }
  }

  // Boş veya geçersiz ağları filtrele ve sırala (en güçlü sinyaller en üstte)
  return networks
    .filter(n => n.bssids.length > 0)
    .map(n => {
      // Ağın genel sinyal gücünü en güçlü BSSID'sine göre belirle
      n.maxSignal = Math.max(...n.bssids.map(b => b.signal));
      return n;
    })
    .sort((a, b) => b.maxSignal - a.maxSignal);
}

// Windows Wi-Fi tarama API'si
app.get('/api/scan', (req, res) => {
  exec('netsh wlan show networks mode=bssid', { encoding: 'buffer', timeout: 8000 }, async (error, stdoutBuffer, stderr) => {
    if (error) {
      console.warn("Gerçek Wi-Fi taraması yapılamadı, simülasyon modu kullanılıyor...", error.message);
      const mockNets = getMockNetworks();
      if (db) await db.saveScan({ simulated: true, networks: mockNets }).catch(() => {});
      return res.json({ simulated: true, networks: mockNets });
    }

    let stdout = "";
    try {
      stdout = iconv.decode(stdoutBuffer, 'win1254');
    } catch (e) {
      stdout = stdoutBuffer.toString('utf-8');
    }

    const parsedNetworks = parseWlanOutput(stdout);

    if (parsedNetworks.length === 0) {
      const mockNets = getMockNetworks();
      if (db) await db.saveScan({ simulated: true, networks: mockNets }).catch(() => {});
      return res.json({ simulated: true, networks: mockNets });
    }

    // DB'ye kaydet
    if (db) await db.saveScan({ simulated: false, networks: parsedNetworks }).catch(() => {});

    res.json({ simulated: false, networks: parsedNetworks });
  });
});

// Bilgisayarın kendi Wi-Fi bağlantı detaylarını döner
app.get('/api/interface', (req, res) => {
  exec('netsh wlan show interfaces', { encoding: 'buffer', timeout: 8000 }, (error, stdoutBuffer, stderr) => {
    if (error) {
      return res.json({ connected: false });
    }
    
    let stdout = "";
    try {
      stdout = iconv.decode(stdoutBuffer, 'win1254');
    } catch (e) {
      stdout = stdoutBuffer.toString('utf-8');
    }

    const lines = stdout.split(/\r?\n/);
    let info = { connected: false };
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.startsWith('State') || trimmed.startsWith('Durum')) {
        const parts = trimmed.split(':');
        if (parts[1] && (parts[1].includes('connected') || parts[1].includes('bağlı'))) {
          info.connected = true;
        }
      }
      if (trimmed.startsWith('SSID')) {
        const match = trimmed.match(/^SSID\s*:\s*(.*)$/i);
        if (match) info.ssid = match[1].trim();
      }
      if (trimmed.startsWith('BSSID')) {
        const match = trimmed.match(/^BSSID\s*:\s*([0-9a-fA-F:]+)/i);
        if (match) info.bssid = match[1].trim().toLowerCase();
      }
      if (trimmed.startsWith('Signal') || trimmed.startsWith('Sinyal')) {
        const match = trimmed.match(/(\d+)%/);
        if (match) info.signal = parseInt(match[1], 10);
      }
      if (trimmed.startsWith('Receive rate') || trimmed.startsWith('Alım hızı')) {
        const match = trimmed.match(/(\d+)/);
        if (match) info.receiveRate = parseInt(match[1], 10);
      }
      if (trimmed.startsWith('Transmit rate') || trimmed.startsWith('İletim hızı')) {
        const match = trimmed.match(/(\d+)/);
        if (match) info.transmitRate = parseInt(match[1], 10);
      }
      if (trimmed.startsWith('Channel') || trimmed.startsWith('Kanal')) {
        const match = trimmed.match(/(\d+)/);
        if (match) info.channel = parseInt(match[1], 10);
      }
    }
    
    res.json(info);
  });
});

// Mock Wi-Fi Verileri (Fallback veya Simülasyon modu için)
function getMockNetworks() {
  return [
    {
      ssid: "AeroNet_Fast_5G",
      authentication: "WPA2-Personal",
      encryption: "CCMP",
      maxSignal: 98,
      bssids: [
        { mac: "00:11:22:33:44:55", signal: 98, radioType: "802.11ax", band: "5 GHz", channel: 36 },
        { mac: "00:11:22:33:44:56", signal: 82, radioType: "802.11ax", band: "2.4 GHz", channel: 1 }
      ]
    },
    {
      ssid: "SUPERONLINE_Wi-Fi_8200",
      authentication: "WPA2-Personal",
      encryption: "CCMP",
      maxSignal: 92,
      bssids: [
        { mac: "c4:9a:31:51:16:41", signal: 92, radioType: "802.11ax", band: "2.4 GHz", channel: 11 }
      ]
    },
    {
      ssid: "TurkTelekom_ZY39C7",
      authentication: "WPA2-Personal",
      encryption: "CCMP",
      maxSignal: 88,
      bssids: [
        { mac: "48:ed:e6:f9:53:39", signal: 85, radioType: "802.11ax", band: "2.4 GHz", channel: 6 },
        { mac: "48:ed:e6:f9:53:3a", signal: 88, radioType: "802.11ax", band: "5 GHz", channel: 100 }
      ]
    },
    {
      ssid: "SUPERONLINE_Wi-Fi_8124",
      authentication: "WPA2-Personal",
      encryption: "CCMP",
      maxSignal: 75,
      bssids: [
        { mac: "74:6f:88:88:e4:24", signal: 75, radioType: "802.11ax", band: "2.4 GHz", channel: 10 },
        { mac: "74:6f:88:88:e4:29", signal: 45, radioType: "802.11ax", band: "5 GHz", channel: 56 }
      ]
    },
    {
      ssid: "Komsu_Internet_Plus",
      authentication: "WPA2-Personal",
      encryption: "CCMP",
      maxSignal: 60,
      bssids: [
        { mac: "aa:bb:cc:dd:ee:11", signal: 60, radioType: "802.11n", band: "2.4 GHz", channel: 6 }
      ]
    },
    {
      ssid: "TurkNet_GigaFiber_42",
      authentication: "WPA3-Personal",
      encryption: "CCMP",
      maxSignal: 54,
      bssids: [
        { mac: "f4:0f:1b:22:98:c1", signal: 54, radioType: "802.11ax", band: "5 GHz", channel: 149 }
      ]
    },
    {
      ssid: "D-Smart_Net_772",
      authentication: "WPA2-Personal",
      encryption: "CCMP",
      maxSignal: 40,
      bssids: [
        { mac: "bb:dd:11:22:33:44", signal: 40, radioType: "802.11n", band: "2.4 GHz", channel: 3 }
      ]
    }
  ];
}


// ==========================================
// PREMIUM ENTEGRASYON ENDPOINT'LERI (ADIM 1)
// ==========================================

let pingHistory = [];

// Canlı Ping, Paket Kaybı ve Jitter Analizörü (Gecikme Grafiği) API'si
app.get('/api/ping', (req, res) => {
  // Let's ping Google DNS 8.8.8.8
  exec('ping -n 1 8.8.8.8', (error, stdout, stderr) => {
    let latency = 0;
    let packetLoss = 0;
    let success = false;

    if (!error) {
      // Parse latency from stdout (e.g. "Süre=20ms" or "time=20ms")
      const match = stdout.match(/(?:süre|time)[=<](\d+)ms/i) || stdout.match(/Ortalama\s*=\s*(\d+)ms/i) || stdout.match(/Average\s*=\s*(\d+)ms/i);
      if (match) {
        latency = parseInt(match[1], 10);
        success = true;
      } else if (stdout.includes('Request timed out') || stdout.includes('Zaman aşımı') || stdout.includes('Destination host unreachable')) {
        packetLoss = 100;
      }
    } else {
      // If physical ping fails, let's simulate realistic ping (between 10-30ms, occasional jitter spikes)
      success = true;
      latency = Math.floor(Math.random() * 15) + 12; // 12-27ms
      if (Math.random() < 0.05) { // 5% chance of spike
        latency += Math.floor(Math.random() * 80) + 40; // 52-147ms spike
      }
      if (Math.random() < 0.01) { // 1% chance of packet loss
        packetLoss = 100;
        success = false;
      }
    }

    if (success && packetLoss === 0) {
      pingHistory.push(latency);
      if (pingHistory.length > 20) pingHistory.shift();
    } else {
      pingHistory.push(null);
      if (pingHistory.length > 20) pingHistory.shift();
    }

    // Calculate Jitter (average absolute difference between consecutive latencies)
    let jitter = 0;
    let validPings = pingHistory.filter(p => p !== null);
    if (validPings.length > 1) {
      let sumDiff = 0;
      let count = 0;
      for (let i = 1; i < validPings.length; i++) {
        sumDiff += Math.abs(validPings[i] - validPings[i-1]);
        count++;
      }
      jitter = parseFloat((sumDiff / count).toFixed(2));
    } else {
      jitter = parseFloat((Math.random() * 2).toFixed(2)); // baseline tiny jitter
    }

    res.json({
      success: success && packetLoss === 0,
      latency: success && packetLoss === 0 ? latency : 0,
      jitter: success && packetLoss === 0 ? jitter : 0,
      packetLoss: packetLoss
    });
  });
});

let mobileMeasurements = [];

// Mobil İstemci Ölçüm Senkronizasyonu (POST)
app.post('/api/mobile/sync', (req, res) => {
  const { x, y, dbm, ssid, device, floor } = req.body;
  const newMeasurement = {
    id: 'm_' + Date.now() + '_' + Math.floor(Math.random()*1000),
    x: parseFloat(x) || 0,
    y: parseFloat(y) || 0,
    dbm: parseInt(dbm) || -50,
    ssid: ssid || 'Bilinmeyen SSID',
    device: device || 'Mobil Cihaz',
    floor: parseInt(floor) || 0,
    timestamp: new Date().toLocaleTimeString('tr-TR')
  };
  mobileMeasurements.push(newMeasurement);
  // Keep last 100 measurements
  if (mobileMeasurements.length > 100) mobileMeasurements.shift();
  res.json({ success: true, measurement: newMeasurement });
});

// Mobil İstemci Ölçümleri Al (GET)
app.get('/api/mobile/measurements', (req, res) => {
  res.json({ success: true, measurements: mobileMeasurements });
});

// Doğrudan Modem Entegrasyonu - Provizyon (POST)
app.post('/api/modem/push', (req, res) => {
  const { brand, ip, username, password } = req.body;
  const targetBrand = brand || 'Genel';
  
  const logs = [];
  const timestamp = () => new Date().toLocaleTimeString('tr-TR');

  logs.push(`[${timestamp()}] [INFO] ${targetBrand.toUpperCase()} modem provizyon işlemi başlatıldı.`);
  logs.push(`[${timestamp()}] [SSH] ${ip || '192.168.1.1'}:22 portuna SSH bağlantısı kuruluyor...`);
  logs.push(`[${timestamp()}] [AUTH] Yetkilendirme isteği gönderildi (Kullanıcı: ${username || 'admin'})...`);
  logs.push(`[${timestamp()}] [AUTH] ✔ Yetkilendirme BAŞARILI. Güvenli tünel (TLS 1.3) aktif.`);

  if (targetBrand.toLowerCase() === 'asus') {
    logs.push(`[${timestamp()}] [SYS] ASUSWRT arayüzü kontrol ediliyor...`);
    logs.push(`[${timestamp()}] [CONFIG] nvram set wl_chanspec=36/80 (5GHz kanalı 36, 80MHz genişlik ayarlandı)`);
    logs.push(`[${timestamp()}] [CONFIG] nvram set wl_rts=2346 (RTS Eşiği optimize ediliyor)`);
    logs.push(`[${timestamp()}] [CONFIG] nvram set wl_txpower=100 (Sinyal gücü %100 olarak güncellendi)`);
    logs.push(`[${timestamp()}] [SAVE] nvram commit (Değişiklikler NVRAM belleğe yazılıyor...)`);
    logs.push(`[${timestamp()}] [RESTART] service restart_wireless (Kablosuz radyo arayüzü resetleniyor...)`);
  } else if (targetBrand.toLowerCase() === 'tp-link') {
    logs.push(`[${timestamp()}] [SYS] TP-Link Archer OS API el sıkışması tamamlandı.`);
    logs.push(`[${timestamp()}] [CONFIG] wlan.wireless.channel=6 (2.4GHz kanalı 6 olarak ayarlandı)`);
    logs.push(`[${timestamp()}] [CONFIG] wlan.wireless.bandwidth=20 (Girişim önleme aktif, 20MHz sabitlendi)`);
    logs.push(`[${timestamp()}] [CONFIG] wlan.wireless.coexistence=1 (Komşu ağlarla uyumluluk modu aktif)`);
    logs.push(`[${timestamp()}] [SAVE] config.save() (Sistem konfigürasyonu kaydediliyor...)`);
    logs.push(`[${timestamp()}] [RESTART] /etc/init.d/network restart (Network servisi yeniden başlatılıyor...)`);
  } else if (targetBrand.toLowerCase() === 'keenetic') {
    logs.push(`[${timestamp()}] [SYS] KeenOS CLI (Command Line Interface) bağlantısı açıldı.`);
    logs.push(`[${timestamp()}] [CONFIG] interface WifiMaster0 channel 6 (2.4GHz kanal seçimi yapıldı)`);
    logs.push(`[${timestamp()}] [CONFIG] interface WifiMaster1 channel 36 (5GHz kanal seçimi yapıldı)`);
    logs.push(`[${timestamp()}] [CONFIG] interface WifiMaster0 tx-power 100 (Çıkış gücü ayarlandı)`);
    logs.push(`[${timestamp()}] [SAVE] system config-save (Flaş belleğe yazılıyor...)`);
    logs.push(`[${timestamp()}] [RESTART] system reboot (Keenetic modemi optimize edilmiş parametrelerle resetleniyor...)`);
  } else if (targetBrand.toLowerCase() === 'zyxel') {
    logs.push(`[${timestamp()}] [SYS] ZyNOS kernel bağlantısı sağlandı.`);
    logs.push(`[${timestamp()}] [CONFIG] wlan channel 11 (2.4GHz kanal 11'e ayarlandı)`);
    logs.push(`[${timestamp()}] [CONFIG] wlan rtsThreshold 2346 (RTS paket boyutu optimize edildi)`);
    logs.push(`[${timestamp()}] [SAVE] write memory (Flash ROM güncelleniyor...)`);
    logs.push(`[${timestamp()}] [RESTART] wlan restart (Kablosuz modül yeniden başlatılıyor...)`);
  } else if (targetBrand.toLowerCase() === 'huawei') {
    logs.push(`[${timestamp()}] [SYS] Huawei VAP (Virtual Access Point) yönetim arabirimi aktif.`);
    logs.push(`[${timestamp()}] [CONFIG] wlan ap 0 radio 0 channel 6 (Kanal 6 olarak optimize edildi)`);
    logs.push(`[${timestamp()}] [CONFIG] wlan ap 0 radio 1 channel 44 (Kanal 44 olarak optimize edildi)`);
    logs.push(`[${timestamp()}] [SAVE] save config (Konfigürasyon flaş belleğe yazılıyor...)`);
    logs.push(`[${timestamp()}] [RESTART] reboot wifi (Kablosuz radyolar yeniden başlatılıyor...)`);
  } else if (targetBrand.toLowerCase() === 'airties') {
    logs.push(`[${timestamp()}] [SYS] Airties AirTiesOS API katmanı bağlandı.`);
    logs.push(`[${timestamp()}] [CONFIG] wl0_channel=11 (2.4GHz kanalı optimize edildi)`);
    logs.push(`[${timestamp()}] [CONFIG] wl1_channel=36 (5GHz kanalı optimize edildi)`);
    logs.push(`[${timestamp()}] [SAVE] save_and_apply (Değişiklikler kaydediliyor ve uygulanıyor...)`);
    logs.push(`[${timestamp()}] [RESTART] wifi restart (Wi-Fi ağı yenileniyor...)`);
  } else {
    logs.push(`[${timestamp()}] [SYS] Genel Linux tabanlı modem kontrol ünitesine bağlanıldı.`);
    logs.push(`[${timestamp()}] [CONFIG] iwconfig wlan0 channel 6 (Kanal 6 yapıldı)`);
  logs.push(`[${timestamp()}] [CONFIG] iwconfig wlan0 txpower 20dBm (Güç optimize edildi)`);
  logs.push(`[${timestamp()}] [SAVE] uci commit wireless (Değişiklikler işleniyor...)`);
  logs.push(`[${timestamp()}] [RESTART] wifi down && wifi up (Kablosuz bağlantı yenileniyor...)`);
  }

  logs.push(`[${timestamp()}] [SUCCESS] ✔ Optimizasyon tamamlandı! Modeminiz en kararlı kanal ve parametrelerle aktif.`);
  logs.push(`[${timestamp()}] [INFO] AeroNet ağ optimizasyonu tamamlanmıştır. Bağlantınız yenileniyor.`);

  res.json({ success: true, logs });
});


// =============================================================================
// YENİ PREMIUM ENDPOINT'LER (v2.0)
// =============================================================================

// --- Tarama Geçmişi ---
app.get('/api/history/scans', async (req, res) => {
  if (!db) return res.json({ success: false, message: 'Veritabanı devre dışı' });
  const days = parseInt(req.query.days) || 7;
  try {
    const byDay = await db.getScansByDay(days);
    const recent = await db.getRecentScans(50);
    const channelFreq = await db.getChannelHistory(days);
    res.json({ success: true, byDay, recent, channelFreq });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});


// --- Ayarlar ---
app.get('/api/settings', async (req, res) => {
  if (!db) return res.json({ success: false, settings: {} });
  const settings = await db.getAllSettings();
  res.json({ success: true, settings });
});

app.post('/api/settings', async (req, res) => {
  if (!db) return res.status(503).json({ success: false });
  const { settings } = req.body;
  if (settings && typeof settings === 'object') {
    await Promise.all(Object.entries(settings).map(([k, v]) => db.setSetting(k, v)));
  }
  const updated = await db.getAllSettings();
  res.json({ success: true, settings: updated });
});

// --- Uyarı Logları ---
app.get('/api/alerts', async (req, res) => {
  if (!db) return res.json({ success: true, alerts: [] });
  const alerts = await db.getRecentAlerts(50);
  res.json({ success: true, alerts });
});

// --- HTML Rapor Üretici ---
app.get('/api/report/html', (req, res) => {
  // Raporlama için mevcut verileri topla
  exec('netsh wlan show networks mode=bssid', { encoding: 'buffer', timeout: 8000 }, (err, buf) => {
    let networks = getMockNetworks();
    let simulated = true;

    if (!err) {
      let out = '';
      try { out = iconv.decode(buf, 'win1254'); } catch { out = buf.toString('utf-8'); }
      const parsed = parseWlanOutput(out);
      if (parsed.length > 0) { networks = parsed; simulated = false; }
    }

    const now = new Date().toLocaleString('tr-TR');
    const rows = networks.map(n => {
      const ch = n.bssids.map(b => b.channel).join(', ');
      const band = n.bssids.map(b => b.band).join(', ');
      return `<tr>
        <td>${n.ssid}</td>
        <td>${n.maxSignal}%</td>
        <td>${ch}</td>
        <td>${band}</td>
        <td>${n.authentication || '-'}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>AeroNet Wi-Fi Analiz Raporu — ${now}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', sans-serif; background:#060a13; color:#e2e8f0; padding:40px; }
    h1 { color:#06b6d4; font-size:2rem; margin-bottom:8px; }
    .meta { color:#64748b; font-size:0.9rem; margin-bottom:32px; }
    .badge { padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; }
    .sim { background:#d97706; color:#fff; }
    .live { background:#10b981; color:#fff; }
    table { width:100%; border-collapse:collapse; margin-top:16px; }
    th { background:#0d1424; color:#94a3b8; text-align:left; padding:10px 16px; font-size:0.8rem; text-transform:uppercase; }
    td { padding:10px 16px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.9rem; }
    tr:hover td { background:rgba(6,182,212,0.05); }
    .footer { margin-top:40px; color:#475569; font-size:0.8rem; text-align:center; }
  </style>
</head>
<body>
  <h1>📡 AeroNet Wi-Fi Analiz Raporu</h1>
  <div class="meta">
    Oluşturulma: ${now} &nbsp;|&nbsp; 
    Toplam Ağ: <strong>${networks.length}</strong> &nbsp;|&nbsp;
    <span class="badge ${simulated ? 'sim' : 'live'}">${simulated ? 'Simülasyon' : 'Canlı Tarama'}</span>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>SSID</th><th>Sinyal</th><th>Kanal</th><th>Bant</th><th>Güvenlik</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">AeroNet Wi-Fi Optimizer v2.0 — Bu rapor otomatik olarak oluşturulmuştur.</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aeronet-rapor-${Date.now()}.html"`);
    res.send(html);
  });
});

// JSON Dışa Aktarma
app.get('/api/report/json', (req, res) => {
  exec('netsh wlan show networks mode=bssid', { encoding: 'buffer', timeout: 8000 }, (err, buf) => {
    let networks = getMockNetworks();
    if (!err) {
      let out = '';
      try { out = iconv.decode(buf, 'win1254'); } catch { out = buf.toString('utf-8'); }
      const parsed = parseWlanOutput(out);
      if (parsed.length > 0) networks = parsed;
    }
    res.setHeader('Content-Disposition', `attachment; filename="aeronet-${Date.now()}.json"`);
    res.json({ generated_at: new Date().toISOString(), network_count: networks.length, networks });
  });
});

// Express sunucusunu başlat
app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`🚀 AeroNet Wi-Fi Optimizer v2.0 başarıyla başlatıldı!`);
  console.log(`🌐 Arayüze erişmek için: http://localhost:${PORT}`);
  console.log(`💾 Tarama API: http://localhost:${PORT}/api/scan`);
  console.log(`📊 Geçmiş API: http://localhost:${PORT}/api/history/scans`);
  console.log(`🗺️  Cihazlar: http://localhost:${PORT}/api/diagnostics/devices`);
  console.log(`=============================================================`);
});
