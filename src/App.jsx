import React, { useState, useEffect } from 'react';
import SpectrumChart from './components/SpectrumChart';
import Heatmap from './components/Heatmap';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [networks, setNetworks] = useState([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    // Initial scan when app loads
    handleScan();
  }, []);

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      if (window.api && window.api.scanWifi) {
        const result = await window.api.scanWifi();
        if (result.success) {
          setNetworks(result.networks);
          // Auto save to history
          if (result.networks.length > 0) {
            const best = result.networks.sort((a,b) => b.signal_level - a.signal_level)[0];
            await window.api.saveHistory({
              ssid: best.ssid,
              bssid: best.bssid,
              channel: best.channel,
              frequency: best.frequency,
              signal_level: best.signal_level,
              security: best.security,
              band: best.band
            });
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <h2>AeroNet <span>Pro</span></h2>
        </div>
        <nav>
          <a className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Spektrum Analizi</a>
          <a className={activeTab === 'heatmap' ? 'active' : ''} onClick={() => setActiveTab('heatmap')}>Isı Haritası</a>
          <a className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Ayarlar</a>
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <h1>{activeTab === 'dashboard' ? 'Wi-Fi Spektrum Analizi' : activeTab === 'heatmap' ? 'Gelişmiş Isı Haritası' : 'Uygulama Ayarları'}</h1>
          <button className={`btn-primary ${scanning ? 'loading' : ''}`} onClick={handleScan} disabled={scanning}>
            {scanning ? 'Taranıyor...' : 'Şimdi Tara'}
          </button>
        </header>

        <div className="content-area">
          {activeTab === 'dashboard' && (
            <div className="card">
              <h3>Ağ Listesi ve Spektrum Analizi</h3>
              <div style={{ height: '400px', marginBottom: '20px' }}>
                <SpectrumChart networks={networks} />
              </div>
              <table style={{ width: '100%', textAlign: 'left', marginTop: 15 }}>
                <thead>
                  <tr>
                    <th>SSID</th>
                    <th>Kanal</th>
                    <th>Frekans</th>
                    <th>Sinyal Gücü</th>
                    <th>Bant</th>
                  </tr>
                </thead>
                <tbody>
                  {networks.map((nw, i) => (
                    <tr key={i}>
                      <td>{nw.ssid}</td>
                      <td>{nw.channel}</td>
                      <td>{nw.frequency} MHz</td>
                      <td>{nw.signal_level} dBm</td>
                      <td><span className={`badge ${nw.band === '6GHz' ? 'green' : 'blue'}`}>{nw.band}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'heatmap' && (
            <div className="card">
              <h3>Gelişmiş Kat Planı (Heatmap)</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Ev veya ofisinizin krokisini yükleyerek duvar engellerini analiz edin ve modemin en iyi konumunu bulun.
              </p>
              <Heatmap />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="card">
              <h3>Veritabanı ve Tercihler</h3>
              <p>Ayarlar Prisma + SQLite üzerinden yerel olarak saklanmaktadır.</p>
              <button className="btn-secondary" style={{ marginTop: 10 }}>Değişiklikleri Kaydet</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
