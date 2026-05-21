/**
 * AeroNet Veritabanı — NeDB tabanlı (native addon gerekmez, pure JS)
 * Veriler ~/.aeronet/ klasöründe JSON dosyaları olarak saklanır.
 */
const Datastore = require('nedb-promises');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Veri klasörü
const dataDir = path.join(os.homedir(), '.aeronet');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Koleksiyonlar (her biri ayrı .db dosyası)
const scansDb    = Datastore.create({ filename: path.join(dataDir, 'scans.db'),    autoload: true });
const speedDb    = Datastore.create({ filename: path.join(dataDir, 'speed.db'),    autoload: true });
const settingsDb = Datastore.create({ filename: path.join(dataDir, 'settings.db'), autoload: true });
const alertsDb   = Datastore.create({ filename: path.join(dataDir, 'alerts.db'),   autoload: true });

// Indeksler
scansDb.ensureIndex({ fieldName: 'timestamp' });
speedDb.ensureIndex({ fieldName: 'timestamp' });
alertsDb.ensureIndex({ fieldName: 'timestamp' });
settingsDb.ensureIndex({ fieldName: 'key', unique: true });

// ─── Varsayılan Ayarlar ────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  scan_interval:           '60',
  auto_launch:             'false',
  alert_channel_threshold: '70',
  alert_evil_twin:         'true',
  alert_weak_signal:       'true',
  weak_signal_threshold:   '40',
  data_retention_days:     '30',
  theme:                   'neon-dark',
  language:                'tr'
};

// Eksik ayarları oluştur — NeDB $setOnInsert desteklemiyor, manuel kontrol yapıyoruz
(async () => {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await settingsDb.findOne({ key });
    if (!existing) {
      await settingsDb.insert({ key, value });
    }
  }
})().catch(e => console.warn('[DB] Ayar başlatma hatası:', e.message));

// ─── Tarama Geçmişi ────────────────────────────────────────────────────────
async function saveScan({ simulated, networks }) {
  return scansDb.insert({
    timestamp: Date.now(),
    simulated: !!simulated,
    network_count: networks.length,
    networks: networks   // tüm ağları sakla
  });
}

async function getRecentScans(limit = 100) {
  return scansDb.find({}).sort({ timestamp: -1 }).limit(limit);
}

async function getScansByDay(days = 7) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await scansDb.find({ timestamp: { $gt: since } }).sort({ timestamp: 1 });

  // Saatlik gruplama
  const hourMap = {};
  rows.forEach(r => {
    const d = new Date(r.timestamp);
    const hour = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}`;
    if (!hourMap[hour]) hourMap[hour] = { hour, count: 0, totalNetworks: 0 };
    hourMap[hour].count++;
    hourMap[hour].totalNetworks += r.network_count;
  });

  return Object.values(hourMap).map(h => ({
    hour: h.hour,
    scan_count: h.count,
    avg_networks: +(h.totalNetworks / h.count).toFixed(1)
  }));
}

async function getChannelHistory(days = 7) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await scansDb.find({ timestamp: { $gt: since } });

  const channelFreq = {};
  rows.forEach(r => {
    (r.networks || []).forEach(net => {
      (net.bssids || []).forEach(bss => {
        const ch = bss.channel;
        if (!channelFreq[ch]) channelFreq[ch] = { count: 0, totalSignal: 0 };
        channelFreq[ch].count++;
        channelFreq[ch].totalSignal += bss.signal;
      });
    });
  });

  return channelFreq;
}

// ─── Hız Testi ─────────────────────────────────────────────────────────────
async function saveSpeedTest(data) {
  return speedDb.insert({ timestamp: Date.now(), ...data });
}

async function getSpeedHistory(limit = 20) {
  return speedDb.find({}).sort({ timestamp: -1 }).limit(limit);
}

// ─── Ayarlar ────────────────────────────────────────────────────────────────
async function getSetting(key) {
  const row = await settingsDb.findOne({ key });
  return row ? row.value : (DEFAULT_SETTINGS[key] || null);
}

async function setSetting(key, value) {
  await settingsDb.update({ key }, { $set: { value } }, { upsert: true });
}

async function getAllSettings() {
  const rows = await settingsDb.find({});
  const result = { ...DEFAULT_SETTINGS };
  rows.forEach(r => { result[r.key] = r.value; });
  return result;
}

// ─── Uyarı Logları ──────────────────────────────────────────────────────────
async function logAlert(type, message) {
  return alertsDb.insert({ timestamp: Date.now(), type, message, dismissed: false });
}

async function getRecentAlerts(limit = 50) {
  return alertsDb.find({}).sort({ timestamp: -1 }).limit(limit);
}

// ─── Temizlik ───────────────────────────────────────────────────────────────
async function pruneOldData() {
  const retentionDays = parseInt(await getSetting('data_retention_days'), 10) || 30;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  await scansDb.remove({ timestamp: { $lt: cutoff } }, { multi: true });
  await speedDb.remove({ timestamp: { $lt: cutoff } }, { multi: true });
  await alertsDb.remove({ timestamp: { $lt: cutoff } }, { multi: true });
}

// Başlangıçta temizle
pruneOldData().catch(e => console.warn('[DB] Temizlik hatası:', e.message));

module.exports = {
  saveScan, getRecentScans, getScansByDay, getChannelHistory,
  saveSpeedTest, getSpeedHistory,
  getSetting, setSetting, getAllSettings,
  logAlert, getRecentAlerts,
  pruneOldData
};
