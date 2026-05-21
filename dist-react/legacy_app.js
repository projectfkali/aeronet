/* ================= AeroNet Frontend Controller ================= */

document.addEventListener('DOMContentLoaded', () => {
  
  // --- UYGULAMA DURUMU (STATE) ---
  const state = {
    activeTab: 'dashboard',
    networks: [],
    connectedNetwork: null,
    isScanning: false,
    selectedBand: '2.4', // Spectrum için '2.4' veya '5'
    fineTuningScenario: 'gaming', // 'gaming', 'balanced', 'iot'
    detectedModemBrand: 'unknown',
    userSelectedModemBrand: 'detect',
    
    // Simulator Durumu
    sim: {
      activeTool: 'router', // 'router' veya 'wall'
      wallMaterial: 'concrete', // 'concrete', 'drywall', 'glass'
      band: '2.4', // '2.4' veya '5'
      router: { x: 350, y: 250, radius: 20 },
      routerFloor: 0,
      floor: 0,
      is3DMode: false,
      mobileMeasurements: [],
      isDraggingRouter: false,
      walls: [], // { x1, y1, x2, y2, type, floor }
      isDrawingWall: false,
      wallStart: null,
      wallPreview: null
    }
  };

  // --- HTML ELEMENTLERİ ---
  const el = {
    // Navigasyon
    sidebar: document.getElementById('main-sidebar'),
    tabs: {
      dashboard: document.getElementById('btn-dashboard'),
      spectrum: document.getElementById('btn-spectrum'),
      heatmap: document.getElementById('btn-heatmap'),
      finetuning: document.getElementById('btn-finetuning'),
      recommendations: document.getElementById('btn-recommendations'),
      history: document.getElementById('btn-history'),
      settings: document.getElementById('btn-settings')
    },
    panels: {
      dashboard: document.getElementById('panel-dashboard'),
      spectrum: document.getElementById('panel-spectrum'),
      heatmap: document.getElementById('panel-heatmap'),
      finetuning: document.getElementById('panel-finetuning'),
      recommendations: document.getElementById('panel-recommendations'),
      history: document.getElementById('panel-history'),
      settings: document.getElementById('panel-settings')
    },
    pageTitle: document.getElementById('current-page-title'),
    pageSubtitle: document.getElementById('current-page-subtitle'),
    
    // Tarama / Durum
    btnScanTrigger: document.getElementById('btn-scan-trigger'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    scanModeBadge: document.getElementById('scan-mode-badge'),
    scanTimeIndicator: document.getElementById('scan-time-indicator'),
    
    // Header Bağlantı Kartı
    headerConnectedSSID: document.getElementById('header-connected-ssid'),
    headerConnectedSignal: document.getElementById('header-connected-signal'),
    headerWifiSvg: document.getElementById('header-wifi-svg'),
    
    // İstatistikler
    statTotalNetworks: document.getElementById('stat-total-networks'),
    statNetworksRatio: document.getElementById('stat-networks-ratio'),
    statBestChannels: document.getElementById('stat-best-channels'),
    statBestChannelsDesc: document.getElementById('stat-best-channels-desc'),
    statStabilityPct: document.getElementById('stat-stability-pct'),
    statStabilityStatus: document.getElementById('stat-stability-status'),
    
    // Dashboard Tablo & Özet
    networksTableBody: document.getElementById('networks-table-body'),
    channelGradeArc: document.getElementById('channel-grade-arc'),
    channelGradeText: document.getElementById('channel-grade-text'),
    channelStatusTitle: document.getElementById('channel-status-title'),
    channelStatusDesc: document.getElementById('channel-status-desc'),
    quickTipsDashboard: document.getElementById('quick-tips-dashboard'),
    btnGoToSpectrum: document.getElementById('btn-go-to-spectrum'),
    
    // Spectrum Sayfası
    btnBand24: document.getElementById('btn-band-24'),
    btnBand5: document.getElementById('btn-band-5'),
    spectrumCanvas: document.getElementById('spectrum-canvas'),
    channelsRatingList: document.getElementById('channels-rating-list'),
    
    // Simulator Sayfası
    btnToolRouter: document.getElementById('btn-tool-router'),
    btnToolWall: document.getElementById('btn-tool-wall'),
    wallTypeSelector: document.getElementById('wall-type-selector'),
    btnSim24: document.getElementById('btn-sim-24'),
    btnSim5: document.getElementById('btn-sim-5'),
    btnLoadFlat: document.getElementById('btn-load-flat'),
    btnClearCanvas: document.getElementById('btn-clear-canvas'),
    metricSignal: document.getElementById('metric-signal'),
    metricSpeed: document.getElementById('metric-speed'),
    heatmapCanvas: document.getElementById('heatmap-canvas'),
    canvasInstructions: document.getElementById('canvas-instructions'),
    btnDismissInstruction: document.getElementById('btn-dismiss-instruction'),

    // PREMIUM EKLEMENTLER (ADIM 2, 3, 4, 5)
    pingCanvas: document.getElementById('ping-canvas'),
    pingLatencyVal: document.getElementById('ping-latency-val'),
    pingJitterVal: document.getElementById('ping-jitter-val'),
    pingLossVal: document.getElementById('ping-loss-val'),
    pingDiagnosisDesc: document.getElementById('ping-diagnosis-desc'),
    securityAlertsContainer: document.getElementById('security-alerts-container'),
    securityStatusBadge: document.getElementById('security-status-badge'),
    btnPushConfig: document.getElementById('btn-push-config'),
    provisionModal: document.getElementById('provision-overlay') || document.getElementById('provision-modal'),
    btnCloseProvision: document.getElementById('btn-close-provision'),
    btnCancelProvision: document.getElementById('btn-cancel-provision'),
    btnStartProvision: document.getElementById('btn-start-provision'),
    btnFinishProvision: document.getElementById('btn-finish-provision'),
    provIp: document.getElementById('prov-ip'),
    provBrand: document.getElementById('prov-brand'),
    provUsername: document.getElementById('prov-username'),
    provPassword: document.getElementById('prov-password'),
    provCredentialsForm: document.getElementById('provision-credentials-form'),
    provTerminalView: document.getElementById('provision-terminal-view'),
    terminalScreen: document.getElementById('terminal-screen'),
    provisionProgress: document.getElementById('provision-progress'),
    provisionStatusLbl: document.getElementById('provision-status-lbl'),
    mobileSyncStatus: document.getElementById('mobile-sync-status'),
    btnFloor0: document.getElementById('btn-floor-0'),
    btnFloor1: document.getElementById('btn-floor-1'),
    btnFloor2: document.getElementById('btn-floor-2'),
    toggle3DMode: document.getElementById('toggle-3d-mode')
  };

  // --- SPA ROUTER (TABS GEÇİŞLERİ) ---
  function initRouter() {
    Object.keys(el.tabs).forEach(tabName => {
      el.tabs[tabName].addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(tabName);
      });
    });

    el.btnGoToSpectrum.addEventListener('click', () => switchTab('spectrum'));
    
    // Sayfa başlıkları ve açıklamaları
    const pageMeta = {
      dashboard: { title: 'Genel Durum', subtitle: 'Çevredeki Wi-Fi ağları ve performans göstergeleri' },
      spectrum: { title: 'Kanal Spektrumu', subtitle: 'Kanal çakışmaları, sinyal çakışma eğrileri ve kanal puanları' },
      heatmap: { title: 'Isı Haritası Simülatörü', subtitle: 'Fiziksel ev krokisi üzerinde router sinyal gücü ve menzil simülasyonu' },
      finetuning: { title: 'İnce Ayar Hesaplayıcı', subtitle: 'Ağ verilerine göre kişiselleştirilmiş gelişmiş kablosuz ağ ince ayarları' },
      recommendations: { title: 'Optimizasyon Rehberi', subtitle: 'Modeminizde uygulayabileceğiniz adım adım en iyi performans ayarları' },
      history: { title: 'Tarama Geçmişi', subtitle: 'Geçmiş Wi-Fi taramalarınız ve kanal doluluk trendleri' },
      settings: { title: 'Uygulama Ayarları', subtitle: 'AeroNet tercihlerini ve akıllı uyarıları yapılandırın' }
    };

    function switchTab(tabName) {
      state.activeTab = tabName;
      
      // Menü Linkleri Güncelleme
      Object.keys(el.tabs).forEach(t => {
        el.tabs[t].classList.toggle('active', t === tabName);
        el.panels[t].classList.toggle('active', t === tabName);
      });

      // Başlık Güncelleme
      el.pageTitle.textContent = pageMeta[tabName].title;
      el.pageSubtitle.textContent = pageMeta[tabName].subtitle;

      // Sayfa yüklenince ek tetikleyiciler
      if (tabName === 'spectrum') {
        setTimeout(renderSpectrumGraph, 100);
      } else if (tabName === 'heatmap') {
        setTimeout(() => {
          resizeHeatmapCanvas();
          renderHeatmap();
        }, 100);
      } else if (tabName === 'finetuning') {
        setTimeout(updateFineTuningUI, 100);
      } else if (tabName === 'history') {
        setTimeout(loadHistory, 100);
      } else if (tabName === 'settings') {
        loadSettings();
      }
    }
  }

  // --- API İLETİŞİMİ & VERİ ÇEKME ---
  async function fetchScanData() {
    if (state.isScanning) return;
    
    state.isScanning = true;
    el.btnScanTrigger.classList.add('loading');
    el.btnScanTrigger.disabled = true;
    el.btnScanTrigger.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="icon-spin" style="margin-right:8px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg> Taranıyor...`;

    // 10 saniyelik zaman aşımı — netsh veya ağ gecikmesi durumunda takılmayı önler
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // 1. Kendi Bağlantı Detaylarımızı Çek
      try {
        const interfaceRes = await fetch('/api/interface', { signal: controller.signal });
        if (interfaceRes.ok) {
          state.connectedNetwork = await interfaceRes.json();
        }
      } catch (interfaceErr) {
        if (interfaceErr.name !== 'AbortError') console.warn('Arayüz bilgisi alınamadı:', interfaceErr.message);
      }
      
      // 2. Çevredeki Wi-Fi Ağlarını Tara
      const scanRes = await fetch('/api/scan', { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (scanRes.ok) {
        const data = await scanRes.json();
        state.networks = data.networks || [];
        
        // Simülasyon modunda mı çalışıyor?
        if (data.simulated) {
          el.scanModeBadge.innerHTML = '<span>Simülasyon Modu</span>';
          el.scanModeBadge.className = 'mode-badge orange';
          el.statusDot.className = 'status-dot orange';
          el.statusText.textContent = 'Wi-Fi Kartı Yok (Simüle)';
        } else {
          el.scanModeBadge.innerHTML = '<span>Yerel Canlı Tarama</span>';
          el.scanModeBadge.className = 'mode-badge green';
          el.statusDot.className = 'status-dot green';
          el.statusText.textContent = 'Sunucu Bağlantısı Aktif';
        }
      }
      
      updateUI();
      
      // Tarih göstergesini güncelle
      const now = new Date();
      el.scanTimeIndicator.textContent = `Son Tarama: ${now.toLocaleTimeString()}`;
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        console.warn('Tarama zaman aşımına uğradı, simülasyon verileri kullanılıyor...');
        // Zaman aşımında mock verileri doğrudan yükle
        try {
          const fallbackRes = await fetch('/api/scan');
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            state.networks = data.networks || [];
            el.scanModeBadge.innerHTML = '<span>Simülasyon Modu</span>';
            el.scanModeBadge.className = 'mode-badge orange';
            el.statusDot.className = 'status-dot orange';
            el.statusText.textContent = 'Zaman Aşımı (Simüle)';
            updateUI();
          }
        } catch (_) { /* sessizce geç */ }
      } else {
        console.error("Veri çekilemedi:", e);
        el.statusDot.className = 'status-dot red';
        el.statusText.textContent = 'Bağlantı Hatası';
      }
    } finally {
      state.isScanning = false;
      el.btnScanTrigger.classList.remove('loading');
      el.btnScanTrigger.disabled = false;
      el.btnScanTrigger.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg> Şimdi Tara`;
    }
  }

  // --- UI GÜNCELLEME MOTORU (GENEL) ---
  function updateUI() {
    // 1. Header Bağlantı Kartını Doldur
    if (state.connectedNetwork && state.connectedNetwork.connected) {
      el.headerConnectedSSID.textContent = state.connectedNetwork.ssid || '[Bilinmeyen Ağ]';
      el.headerConnectedSignal.textContent = `${state.connectedNetwork.signal}%`;
      el.headerConnectedSignal.style.display = 'block';
      el.headerWifiSvg.classList.add('active');
    } else {
      el.headerConnectedSSID.textContent = 'Bağlı Değil';
      el.headerConnectedSignal.style.display = 'none';
      el.headerWifiSvg.classList.remove('active');
    }

    // 2. İstatistikleri Doldur
    const totalNetworksCount = state.networks.length;
    el.statTotalNetworks.textContent = totalNetworksCount;
    
    // Ağ yoğunluğuna göre rozet belirle
    if (totalNetworksCount > 10) {
      el.statNetworksRatio.textContent = 'Çok Yoğun';
      el.statNetworksRatio.className = 'badge badge-danger';
    } else if (totalNetworksCount > 5) {
      el.statNetworksRatio.textContent = 'Orta Yoğunluk';
      el.statNetworksRatio.className = 'badge badge-warning';
    } else {
      el.statNetworksRatio.textContent = 'Sakin';
      el.statNetworksRatio.className = 'badge badge-success';
    }

    // En İyi Kanalları Hesapla
    const best24 = getBestChannel24();
    const best5 = getBestChannel5();
    el.statBestChannels.textContent = `${best24} / ${best5}`;
    el.statBestChannelsDesc.textContent = `2.4G için Kanal ${best24}, 5G için Kanal ${best5}`;

    // Sinyal Kararlılık Oranını hesapla (Ortalama parazite göre)
    const stabilityPct = calculateStability();
    el.statStabilityPct.textContent = `${stabilityPct}%`;
    if (stabilityPct > 80) {
      el.statStabilityStatus.textContent = 'Mükemmel';
      el.statStabilityStatus.className = 'badge badge-success';
    } else if (stabilityPct > 60) {
      el.statStabilityStatus.textContent = 'İyi';
      el.statStabilityStatus.className = 'badge badge-info';
    } else if (stabilityPct > 40) {
      el.statStabilityStatus.textContent = 'Parazitli';
      el.statStabilityStatus.className = 'badge badge-warning';
    } else {
      el.statStabilityStatus.textContent = 'Kritik';
      el.statStabilityStatus.className = 'badge badge-danger';
    }

    // 3. Tablo İçeriğini Doldur
    renderNetworksTable();

    // 4. Akıllı Puanlama Dairesi ve Önerileri
    renderSmartGrade();

    // 5. Spektrumu yenile (Eğer aktifse)
    if (state.activeTab === 'spectrum') {
      renderSpectrumGraph();
    }

    // 6. İnce ayarları güncelle
    updateFineTuningUI();

    // 7. Siber Tehdit Koruma Kalkanı Analizi
    initSecurityShield();
  }

  // --- TABLO OLUŞTURMA ---
  function renderNetworksTable() {
    if (state.networks.length === 0) {
      el.networksTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="table-placeholder">Çevrede hiçbir kablosuz ağ yayını bulunamadı.</td>
        </tr>
      `;
      return;
    }

    el.networksTableBody.innerHTML = '';
    state.networks.forEach(net => {
      // Bir ağın birden fazla BSSID'si olabilir, ilkini ve en güçlüsünü öne çıkaralım
      const bestBss = net.bssids[0];
      const isConnected = state.connectedNetwork && state.connectedNetwork.connected && state.connectedNetwork.ssid === net.ssid;
      
      const tr = document.createElement('tr');
      if (isConnected) tr.style.background = 'rgba(6, 182, 212, 0.05)';
      
      // Sinyal Gücü Sınıfları
      let signalClass = 'poor';
      let signalText = 'Zayıf';
      if (net.maxSignal >= 80) { signalClass = 'excellent'; signalText = 'Harika'; }
      else if (net.maxSignal >= 60) { signalClass = 'good'; signalText = 'İyi'; }
      else if (net.maxSignal >= 40) { signalClass = 'fair'; signalText = 'Orta'; }

      // Kanalları toparla (örnek: "1, 11")
      const channels = net.bssids.map(b => b.channel).filter((v, i, a) => a.indexOf(v) === i).join(', ');
      // Frekans bantlarını toparla
      const bands = net.bssids.map(b => b.band).filter((v, i, a) => a.indexOf(v) === i).join(', ');

      tr.innerHTML = `
        <td>
          <div style="font-weight:700; display:flex; align-items:center; gap:8px;">
            ${isConnected ? `
              <span style="color:var(--cyan); display:flex;" title="Bağlı Olduğunuz Ağ">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </span>` : ''
            }
            ${net.ssid}
          </div>
        </td>
        <td>
          <div class="signal-td">
            <span style="font-weight:600; width:35px;">%${net.maxSignal}</span>
            <div class="signal-bar-outer">
              <div class="signal-bar-inner ${signalClass}" style="width: ${net.maxSignal}%;"></div>
            </div>
            <span class="badge badge-${signalClass === 'excellent' ? 'success' : signalClass === 'good' ? 'info' : signalClass === 'fair' ? 'warning' : 'danger'}" style="font-size:0.65rem;">
              ${signalText}
            </span>
          </div>
        </td>
        <td><strong style="font-family:var(--font-title); font-size:0.95rem;">${channels}</strong></td>
        <td><span class="badge ${bands.includes('5 GHz') ? 'badge-info' : 'badge-warning'}">${bands}</span></td>
        <td><span style="font-size:0.8rem; color:var(--text-secondary); font-weight:600;">${bestBss.radioType || '802.11n'}</span></td>
        <td><span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">${net.authentication}</span></td>
      `;
      el.networksTableBody.appendChild(tr);
    });
  }

  // --- AKILLI PUAN DAİRESİ VE DİNAMİK ÖNERİLER ---
  function renderSmartGrade() {
    let connectedChannel = null;
    let connectedBand = '2.4 GHz';
    let connectedSignal = 0;

    if (state.connectedNetwork && state.connectedNetwork.connected) {
      connectedChannel = state.connectedNetwork.channel;
      connectedSignal = state.connectedNetwork.signal;
      // Bağlı kanal numarasına göre bandı anla
      connectedBand = connectedChannel > 14 ? '5 GHz' : '2.4 GHz';
    } else {
      // Bağlı ağ yoksa en güçlü ağın parametrelerini alalım
      const topNet = state.networks[0];
      if (topNet) {
        connectedChannel = topNet.bssids[0].channel;
        connectedBand = topNet.bssids[0].band;
        connectedSignal = topNet.maxSignal;
      }
    }

    if (!connectedChannel) {
      // Hiç ağ yoksa varsayılan
      setGradeUI(100, 'A+', 'Veri Bulunamadı', 'Bir Wi-Fi ağına bağlanarak veya tarama gerçekleştirerek analiz edebilirsiniz.');
      return;
    }

    // Çakışma Skoru Hesapla (0 - 100 arası, 100 mükemmel)
    const score = calculateChannelScore(connectedChannel, connectedBand === '5 GHz' ? '5' : '2.4');
    
    let grade = 'F';
    let title = 'Çok Kötü Kanal!';
    let desc = `Kanalınız (${connectedChannel}) çok yoğun bir çakışma altında. Ciddi hız kayıpları yaşıyor olabilirsiniz.`;
    
    if (score >= 90) {
      grade = 'A+';
      title = 'Mükemmel Frekans!';
      desc = `Kanalınız (${connectedChannel}) en az çakışmaya sahip bölgede yer alıyor. Değişikliğe gerek yok.`;
    } else if (score >= 80) {
      grade = 'A';
      title = 'Harika Durum';
      desc = `Kanalınız (${connectedChannel}) oldukça temiz. İdeal bir performans alıyorsunuz.`;
    } else if (score >= 70) {
      grade = 'B';
      title = 'Orta Kalite';
      desc = `Kanal ${connectedChannel} üzerinde hafif parazitler var. Daha yüksek kararlılık için optimize edilebilir.`;
    } else if (score >= 50) {
      grade = 'C';
      title = 'Yüksek Parazit';
      desc = `Kanalınız (${connectedChannel}) çevredeki diğer ağlarla çakışıyor. En temiz kanala geçmeniz hızınızı artıracaktır.`;
    }

    setGradeUI(score, grade, title, desc);
    generateDashboardTips(connectedChannel, connectedBand, score);
  }

  function setGradeUI(score, grade, title, desc) {
    el.channelGradeText.textContent = grade;
    el.channelStatusTitle.textContent = title;
    el.channelStatusDesc.textContent = desc;

    // SVG Çember doldurma oranı (dasharray max 100)
    el.channelGradeArc.setAttribute('stroke-dasharray', `${score}, 100`);
    
    // Renge karar ver
    const donutSvg = el.channelGradeArc.closest('svg');
    donutSvg.className.baseVal = 'circular-chart';
    if (score >= 80) donutSvg.classList.add('emerald');
    else if (score >= 50) donutSvg.classList.add('warning');
    else donutSvg.classList.add('indigo');
  }

  // Dashboard içi dinamik rehber maddeleri oluşturucu
  function generateDashboardTips(ch, band, score) {
    el.quickTipsDashboard.innerHTML = '';
    const tips = [];

    // 1. Madde: Kanal Seçimi Durumu
    if (score < 80) {
      const best = band.includes('5') ? getBestChannel5() : getBestChannel24();
      tips.push({
        type: 'warning',
        title: `Kanal Değişikliği Gerekli`,
        text: `Mevcut kanalınız ${ch} yerine en temiz kanal olan <strong>Kanal ${best}</strong> frekansına geçiş yapın.`
      });
    } else {
      tips.push({
        type: 'emerald',
        title: `Kanal Tercihi Doğru`,
        text: `Kanal ayarlarınız çok iyi durumda. Otomatik güncelleme parazit yapmadığı sürece bu kanalda kalın.`
      });
    }

    // 2. Madde: Band Uygunluğu
    if (band.includes('2.4') && state.networks.some(n => n.bssids.some(b => b.band.includes('5')))) {
      tips.push({
        type: 'indigo',
        title: `5 GHz Bandı Mevcut`,
        text: `Çevrenizde 5 GHz ağlar var. Yönlendiriciniz destekliyorsa 5 GHz bandına geçmek <strong>10 kata kadar daha yüksek hız</strong> sağlayabilir.`
      });
    } else if (band.includes('5')) {
      tips.push({
        type: 'indigo',
        title: `5 GHz Genişlik Önerisi`,
        text: `5 GHz bandındasınız. Eğer apartmanda çok fazla ağ varsa paraziti kesmek için kanal genişliğini modemden <strong>40 MHz</strong> olarak sınırlayın.`
      });
    }

    // 3. Madde: Sinyal Gücü
    let connectedSignal = 0;
    if (state.connectedNetwork) connectedSignal = state.connectedNetwork.signal;
    else if (state.networks[0]) connectedSignal = state.networks[0].maxSignal;

    if (connectedSignal < 60 && connectedSignal > 0) {
      tips.push({
        type: 'warning',
        title: `Zayıf Sinyal Gücü (%${connectedSignal})`,
        text: `Router cihazınız uzak veya engeller arkasında. Sinyal seviyesini artırmak için modeminizi **merkezi bir konuma** taşıyın.`
      });
    } else {
      tips.push({
        type: 'emerald',
        title: `Güçlü Bağlantı`,
        text: `Router cihazınıza olan uzaklığınız ve sinyal seviyeniz çok sağlıklı durumda.`
      });
    }

    tips.forEach(t => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="bullet ${t.type}"></span>
        <div class="tip-body">
          <strong>${t.title}:</strong> ${t.text}
        </div>
      `;
      el.quickTipsDashboard.appendChild(li);
    });
  }

  // --- MATEMATİKSEL INTERFERENCE VE STABİLİTE HESAPLARI ---
  
  // Kanal puanı hesaplama (0-100)
  // Çakışan diğer ağların sinyal güçlerine göre parazit çıkarıyoruz
  function calculateChannelScore(channel, band) {
    let baseScore = 100;
    let penalty = 0;

    state.networks.forEach(net => {
      net.bssids.forEach(bss => {
        // Farklı bantları es geç
        const isBss5G = bss.band.includes('5');
        if ((band === '5' && !isBss5G) || (band === '2.4' && isBss5G)) return;

        const distance = Math.abs(bss.channel - channel);

        // 2.4 GHz için çakışma alanı geniştir (22MHz = 5 kanal)
        if (band === '2.4') {
          if (distance === 0) {
            // Co-Channel Interference (Aynı Kanal - Ağır Ceza)
            penalty += (bss.signal / 100) * 20;
          } else if (distance < 5) {
            // Adjacent Channel Interference (Komşu Kanal - Aşırı Ağır Ceza)
            penalty += (bss.signal / 100) * (25 - distance * 4);
          }
        } 
        // 5 GHz için çakışma sadece kanal genişliklerine göredir (Standart 20MHz çakışma)
        else {
          if (distance === 0) {
            penalty += (bss.signal / 100) * 15;
          } else if (distance <= 4) {
            // 5G bandında yan kanallar genellikle birbirine bindirmez ama 40/80MHz bantlarında bindirebilir
            penalty += (bss.signal / 100) * (8 - distance * 1.5);
          }
        }
      });
    });

    const finalScore = Math.max(10, Math.min(100, Math.round(baseScore - penalty)));
    return finalScore;
  }

  // En İyi 2.4 GHz Kanalını bul (Sadece 1, 6 ve 11 arasından)
  function getBestChannel24() {
    const candidates = [1, 6, 11];
    let bestCh = 1;
    let maxScore = -1;

    candidates.forEach(ch => {
      const score = calculateChannelScore(ch, '2.4');
      if (score > maxScore) {
        maxScore = score;
        bestCh = ch;
      }
    });

    return bestCh;
  }

  // En İyi 5 GHz Kanalını bul (Çok geniş aralık, en yaygın 8 kanalı tara)
  function getBestChannel5() {
    const candidates = [36, 40, 44, 48, 149, 153, 157, 161];
    let bestCh = 36;
    let maxScore = -1;

    candidates.forEach(ch => {
      const score = calculateChannelScore(ch, '5');
      if (score > maxScore) {
        maxScore = score;
        bestCh = ch;
      }
    });

    return bestCh;
  }

  // Sinyal Kararlılık Oranı (Çevredeki genel gürültüye/parazite bağlıdır)
  function calculateStability() {
    if (state.networks.length === 0) return 100;
    
    // Toplam parazit katsayısı
    let totalNoise = 0;
    state.networks.forEach(n => {
      // Her ağın sinyaline göre gürültü ekle
      totalNoise += n.maxSignal * 0.15;
    });

    return Math.max(35, Math.min(100, Math.round(100 - totalNoise)));
  }

  // --- KANAL SPEKTRUMU KANVAS ÇİZİCİ (GLOWING CURVES) ---
  
  // 2.4 GHz & 5 GHz Toggles
  el.btnBand24.addEventListener('click', () => {
    state.selectedBand = '2.4';
    el.btnBand24.classList.add('active');
    el.btnBand5.classList.remove('active');
    document.getElementById('spectrum-graph-title').textContent = '2.4 GHz Frekans Bandı Çakışma Analizi';
    renderSpectrumGraph();
  });

  el.btnBand5.addEventListener('click', () => {
    state.selectedBand = '5';
    el.btnBand24.classList.remove('active');
    el.btnBand5.classList.add('active');
    document.getElementById('spectrum-graph-title').textContent = '5 GHz Frekans Bandı Çakışma Analizi';
    renderSpectrumGraph();
  });

  function renderSpectrumGraph() {
    const canvas = el.spectrumCanvas;
    const ctx = canvas.getContext('2d');
    
    // Responsive genişlik ayarla
    const containerWidth = canvas.parentElement.clientWidth;
    canvas.width = Math.max(800, containerWidth - 20);
    canvas.height = 350;

    const width = canvas.width;
    const height = canvas.height;
    
    // Canvası Temizle
    ctx.fillStyle = '#060a13';
    ctx.fillRect(0, 0, width, height);

    // Kılavuz Çizgileri ve dBm Eksenleri Çizimi (Yatay çizgiler)
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const y = (height - 60) * (i / 5) + 10;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(width - 40, y);
      ctx.stroke();

      // Sinyal dBm Etiketleri
      const dbm = -30 - (i - 1) * 15;
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '500 11px var(--font-body)';
      ctx.textAlign = 'right';
      ctx.fillText(`${dbm} dBm`, 50, y + 4);
    }

    // Kanalların X Konumlarını Belirleme
    const channels = state.selectedBand === '2.4' 
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
      : [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];

    const startX = 80;
    const endX = width - 60;
    const graphWidth = endX - startX;
    
    const getX = (ch) => {
      const idx = channels.indexOf(ch);
      if (idx === -1) return startX + graphWidth / 2; // Ortaya at
      return startX + (idx / (channels.length - 1)) * graphWidth;
    };

    // Alt Grafik Çizgisi (Kanal Numaraları Ekseni)
    const axisY = height - 50;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(startX - 20, axisY);
    ctx.lineTo(endX + 20, axisY);
    ctx.stroke();

    // Kanal Sayılarını Çiz
    channels.forEach(ch => {
      const cx = getX(ch);
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '700 12px var(--font-title)';
      ctx.textAlign = 'center';
      ctx.fillText(ch, cx, axisY + 22);

      // Kılavuz Dikey Nokta çizgisi
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(cx, axisY, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Dalga (Parabol) Çizim Algoritması
    const activeSSID = state.connectedNetwork?.connected ? state.connectedNetwork.ssid : null;
    
    // Ağları sinyal gücü zayıftan güçlüye sıralayarak çizelim ki güçlüler üste binsin
    const sortedNets = [...state.networks]
      .filter(n => n.bssids.some(b => {
        const isBss5G = b.band.includes('5');
        return (state.selectedBand === '5' && isBss5G) || (state.selectedBand === '2.4' && !isBss5G);
      }))
      .sort((a, b) => a.maxSignal - b.maxSignal);

    sortedNets.forEach(net => {
      net.bssids.forEach(bss => {
        const isBss5G = bss.band.includes('5');
        if ((state.selectedBand === '5' && !isBss5G) || (state.selectedBand === '2.4' && isBss5G)) return;

        const cx = getX(bss.channel);
        
        // Sinyal gücüne göre yüksekliği hesapla
        const maxH = (axisY - 20) * (bss.signal / 100);
        const topY = axisY - maxH;
        
        // 2.4 GHz için dalga genişliği sabit 22MHz (yani 5 kanal genişliği)
        // 5 GHz için genellikle her kanal izole veya daha dardır
        const waveWidth = state.selectedBand === '2.4' 
          ? (graphWidth / (channels.length - 1)) * 4.4 
          : (graphWidth / (channels.length - 1)) * 2;

        const isOwn = activeSSID && net.ssid === activeSSID;

        // Gradyan Tanımla (Glowing Glassmorphic Waves)
        const grad = ctx.createLinearGradient(cx - waveWidth/2, topY, cx + waveWidth/2, axisY);
        if (isOwn) {
          grad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');  // Kendi Ağımız Cyan
          grad.addColorStop(1, 'rgba(6, 182, 212, 0.01)');
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.9)';
          ctx.lineWidth = 2.5;
        } else {
          grad.addColorStop(0, 'rgba(99, 102, 241, 0.18)'); // Diğer Ağlar Indigo
          grad.addColorStop(1, 'rgba(99, 102, 241, 0.01)');
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
          ctx.lineWidth = 1.5;
        }

        // Parabol Çiz (Bézier Curve)
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx - waveWidth / 2, axisY);
        // Kontrol noktaları parabolü yumuşaklaştırır
        ctx.bezierCurveTo(
          cx - waveWidth / 4, topY,
          cx - waveWidth / 6, topY,
          cx, topY
        );
        ctx.bezierCurveTo(
          cx + waveWidth / 6, topY,
          cx + waveWidth / 4, topY,
          cx + waveWidth / 2, axisY
        );
        ctx.fill();
        ctx.stroke();

        // Parabolün Tepesine SSID İsmini Yaz
        ctx.fillStyle = isOwn ? 'var(--cyan)' : 'var(--text-secondary)';
        ctx.font = isOwn ? '700 11px var(--font-body)' : '500 10px var(--font-body)';
        ctx.textAlign = 'center';
        ctx.shadowBlur = isOwn ? 6 : 0;
        ctx.shadowColor = 'var(--cyan)';
        
        // SSID uzunsa kırp
        let text = net.ssid;
        if (text.length > 15) text = text.substring(0, 13) + '...';
        
        ctx.fillText(`${text} (${bss.signal}%)`, cx, topY - 8);
        ctx.shadowBlur = 0; // Shadow sıfırla
      });
    });

    // Spektrum Yan Kanal Derecelendirme Listesini Doldur
    renderChannelRatingList();
  }

  // --- KANAL PUANLARI LİSTESİNİ OLUŞTURMA ---
  function renderChannelRatingList() {
    el.channelsRatingList.innerHTML = '';

    // Değerlendirilecek kanallar
    const candidates = state.selectedBand === '2.4' 
      ? [1, 6, 11] // 2.4'te sadece standart kanallar önerilir
      : [36, 40, 44, 48, 149, 153, 157, 161, 165];

    // Puanları toparlayıp sırala
    const list = candidates.map(ch => {
      const score = calculateChannelScore(ch, state.selectedBand);
      let grade = 'F';
      if (score >= 90) grade = 'A+';
      else if (score >= 80) grade = 'A';
      else if (score >= 70) grade = 'B';
      else if (score >= 50) grade = 'C';

      return { ch, score, grade };
    }).sort((a, b) => b.score - a.score);

    list.forEach((item, idx) => {
      const isBest = idx === 0;
      const div = document.createElement('div');
      div.className = 'channel-rating-item';

      div.innerHTML = `
        <div class="ch-info">
          <div class="ch-number ${isBest ? 'best' : ''}">${item.ch}</div>
          <div class="ch-label">
            <span class="name">${state.selectedBand === '2.4' ? `Standart Kanal` : `Kanal`} ${item.ch}</span>
            <span class="sub">${isBest ? 'Maksimum verimlilik, en az gürültü' : 'Ortalama gürültü bölgesi'}</span>
          </div>
        </div>
        <div class="ch-score-area">
          <div class="ch-score-bar-outer">
            <div class="ch-score-bar-inner" style="width: ${item.score}%; background: ${item.score >= 80 ? 'var(--emerald)' : item.score >= 60 ? 'var(--cyan)' : item.score >= 40 ? 'var(--warning)' : 'var(--crimson)'};"></div>
          </div>
          <span class="ch-grade ${item.grade.charAt(0)}">${item.grade}</span>
        </div>
      `;
      el.channelsRatingList.appendChild(div);
    });
  }

  // ================= HEATMAP SİMÜLATÖRÜ (FIZIK TABANLI ÇİZİCİ) =================
  
  // Responsive Canvas Sizing
  function resizeHeatmapCanvas() {
    const canvas = el.heatmapCanvas;
    const wrapper = canvas.parentElement;
    canvas.width = Math.min(800, wrapper.clientWidth);
    canvas.height = Math.min(500, wrapper.clientHeight || 500);
  }

  window.addEventListener('resize', () => {
    if (state.activeTab === 'heatmap') {
      resizeHeatmapCanvas();
      renderHeatmap();
    }
  });

  // Simulator Araçları Seçimi
  el.btnToolRouter.addEventListener('click', () => {
    state.sim.activeTool = 'router';
    el.btnToolRouter.classList.add('active');
    el.btnToolWall.classList.remove('active');
    el.wallTypeSelector.style.display = 'none';
    document.getElementById('sim-status').textContent = 'Modem Konumu Değiştirilebilir';
  });

  el.btnToolWall.addEventListener('click', () => {
    state.sim.activeTool = 'wall';
    el.btnToolRouter.classList.remove('active');
    el.btnToolWall.classList.add('active');
    el.wallTypeSelector.style.display = 'block';
    document.getElementById('sim-status').textContent = 'Duvar çizmek için tıklayın ve sürükleyin';
  });

  el.btnSim24.addEventListener('click', () => {
    state.sim.band = '2.4';
    el.btnSim24.classList.add('active');
    el.btnSim5.classList.remove('active');
    renderHeatmap();
  });

  el.btnSim5.addEventListener('click', () => {
    state.sim.band = '5';
    el.btnSim24.classList.remove('active');
    el.btnSim5.classList.add('active');
    renderHeatmap();
  });

  el.btnClearCanvas.addEventListener('click', () => {
    state.sim.walls = [];
    renderHeatmap();
  });

  el.btnDismissInstruction.addEventListener('click', () => {
    el.canvasInstructions.style.opacity = '0';
    setTimeout(() => el.canvasInstructions.style.display = 'none', 300);
  });

  // Şablon Daire Krokisi Yükle (PRELOADED WALLS - WOW!)
  el.btnLoadFlat.addEventListener('click', () => {
    const w = el.heatmapCanvas.width;
    const h = el.heatmapCanvas.height;
    
    // Temizle ve yeni şablon duvarları yükle
    state.sim.walls = [
      // Dış Çerçeve Duvarları
      { x1: 20, y1: 20, x2: w - 20, y2: 20, type: 'concrete', floor: 0 },
      { x1: w - 20, y1: 20, x2: w - 20, y2: h - 20, type: 'concrete', floor: 0 },
      { x1: w - 20, y1: h - 20, x2: 20, y2: h - 20, type: 'concrete', floor: 0 },
      { x1: 20, y1: h - 20, x2: 20, y2: 20, type: 'concrete', floor: 0 },
      
      // İç Odalar (Alçıpan ve Beton karışık)
      // Koridor ve Salon duvarı
      { x1: 20, y1: h / 2, x2: w * 0.6, y2: h / 2, type: 'concrete', floor: 0 },
      // Yatak odası bölmeleri
      { x1: w * 0.4, y1: 20, x2: w * 0.4, y2: h / 2, type: 'drywall', floor: 0 },
      { x1: w * 0.7, y1: 20, x2: w * 0.7, y2: h / 2, type: 'drywall', floor: 0 },
      // Mutfak / Banyo bölmesi
      { x1: w * 0.5, y1: h / 2, x2: w * 0.5, y2: h - 20, type: 'concrete', floor: 0 },
      // Salon içi cam kapı bölmesi
      { x1: w * 0.8, y1: h / 2, x2: w * 0.8, y2: h - 20, type: 'glass', floor: 0 }
    ];

    // Modemi de merkezi bir yere alalım
    state.sim.router = { x: w * 0.25, y: h * 0.25, radius: 20 };
    state.sim.routerFloor = 0;
    renderHeatmap();
  });

  // --- HESAPLAMA SİMÜLASYONU FİZİK MOTORU ---
  
  // İki doğru parçasının kesişip kesişmediğini denetleyen algoritma
  // (Ray-casting / Çizgi Kesişimi testi)
  function lineIntersects(a1, a2, b1, b2) {
    const det = (a2.x - a1.x) * (b2.y - b1.y) - (b2.x - b1.x) * (a2.y - a1.y);
    if (det === 0) return false; // Paralel doğrular
    
    const lambda = ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / det;
    const gamma = ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / det;
    
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }

  // Bir noktadaki tahmini dBm gücünü hesapla
  function calculateSignalAtPoint(px, py) {
    const rx = state.sim.router.x;
    const ry = state.sim.router.y;

    // Piksel cinsinden mesafe
    const dx = px - rx;
    const dy = py - ry;
    const distancePixels = Math.sqrt(dx * dx + dy * dy);
    
    // Mesafeyi metreye oranla (Örn: 10 piksel = 1 metre)
    const distanceMeters = Math.max(0.5, distancePixels / 12);

    // Temel serbest uzay yayılım kaybı (FSPL Model)
    // 2.4 GHz vs 5 GHz sönümlenme hız katsayısı
    const lossExponent = state.sim.band === '5' ? 24 : 20;
    let dbm = -30 - lossExponent * Math.log10(distanceMeters);

    // Yol üzerindeki duvar kesişimlerini sayarak zayıflama (Attenuation) ekle
    state.sim.walls.forEach(w => {
      // Sadece aktif kattaki duvarlar (veya floor tanımlanmamış şablon duvarlar)
      if (w.floor !== undefined && w.floor !== state.sim.floor) return;

      const w1 = { x: w.x1, y: w.y1 };
      const w2 = { x: w.x2, y: w.y2 };
      const p1 = { x: rx, y: ry };
      const p2 = { x: px, y: py };

      if (lineIntersects(p1, p2, w1, w2)) {
        // Duvar tipine göre zayıflama miktarları (dBm)
        if (w.type === 'concrete') {
          dbm -= 16;
        } else if (w.type === 'drywall') {
          dbm -= 4;
        } else if (w.type === 'glass') {
          dbm -= 8;
        }
      }
    });

    // Tavan betonu sönümleme kaybı (-20 dBm per floor)
    const floorDiff = Math.abs(state.sim.floor - state.sim.routerFloor);
    dbm -= floorDiff * 20;

    return Math.max(-100, Math.min(-30, Math.round(dbm)));
  }

  // Sinyal dBm değerini 0-100% arasına dönüştür
  function dbmToPercentage(dbm) {
    if (dbm >= -50) return 100;
    if (dbm <= -90) return 0;
    return Math.round(((dbm - (-90)) / 40) * 100);
  }

  // Sinyal gücüne göre renk kodları
  function getColorForSignal(dbm) {
    // rgb renkleri: 
    // Mükemmel (> -50): Yeşil (emerald) -> rgba(16, 185, 129, 0.45)
    // Orta (-50 ila -75): Sarı (warning) -> rgba(245, 158, 11, 0.35)
    // Zayıf (-75 ila -90): Kırmızı (crimson) -> rgba(239, 68, 68, 0.25)
    // Ölü (< -90): Koyu Slate -> rgba(30, 41, 59, 0.05)
    if (dbm >= -50) {
      return 'rgba(16, 185, 129, 0.45)';
    } else if (dbm >= -65) {
      // Yeşil-sarı geçiş
      return 'rgba(6, 182, 212, 0.4)';
    } else if (dbm >= -78) {
      return 'rgba(245, 158, 11, 0.32)';
    } else if (dbm >= -90) {
      return 'rgba(239, 68, 68, 0.22)';
    }
    return 'rgba(15, 23, 42, 0.9)';
  }

  // --- UTILS FOR 3D HEATMAP PROJECTION ---
  function projectTo3D(x, y, zOffset = 0) {
    const w = el.heatmapCanvas.width;
    const h = el.heatmapCanvas.height;
    // Isometric projection math
    const rx = w / 2 + (x - w / 2) * 0.70 - (y - h / 2) * 0.70;
    const ry = h / 2.1 + (x - w / 2) * 0.35 + (y - h / 2) * 0.35 - zOffset;
    return { x: rx, y: ry };
  }

  function drawProjectedCircle(ctx, cx, cy, r, z, color, dashed = false) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (dashed) ctx.setLineDash([4, 4]);
    for (let i = 0; i <= 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      const pt = projectTo3D(px, py, z);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    if (dashed) ctx.setLineDash([]);
  }

  // --- HEATMAP CANVAS RENDER MOTORU ---
  function renderHeatmap() {
    const canvas = el.heatmapCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // 1. Temel Arkaplanı Çiz
    ctx.fillStyle = '#060a13';
    ctx.fillRect(0, 0, w, h);

    if (!state.sim.is3DMode) {
      // ================= 2D MOD RENDER =================
      // Grid (Kılavuz Izgara çizgileri) çiz
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // ISILARIN (HEATMAP) HESAPLANIP RENDERLANMASI
      const step = 8;
      for (let x = 0; x < w; x += step) {
        for (let y = 0; y < h; y += step) {
          const dbm = calculateSignalAtPoint(x + step/2, y + step/2);
          ctx.fillStyle = getColorForSignal(dbm);
          ctx.fillRect(x, y, step, step);
        }
      }

      // Duvarları Çiz
      state.sim.walls.forEach(wall => {
        // Sadece aktif kattaki duvarlar
        if (wall.floor !== undefined && wall.floor !== state.sim.floor) return;
        
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        
        if (wall.type === 'concrete') {
          ctx.strokeStyle = '#475569';
          ctx.shadowColor = '#1e293b';
          ctx.shadowBlur = 4;
        } else if (wall.type === 'drywall') {
          ctx.strokeStyle = '#d97706';
          ctx.shadowBlur = 0;
        } else if (wall.type === 'glass') {
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
          ctx.shadowColor = 'var(--cyan)';
          ctx.shadowBlur = 5;
        }

        ctx.beginPath();
        ctx.moveTo(wall.x1, wall.y1);
        ctx.lineTo(wall.x2, wall.y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Eğer duvar çizim halindeyse önizlemeyi çiz
      if (state.sim.isDrawingWall && state.sim.wallPreview) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(state.sim.wallStart.x, state.sim.wallStart.y);
        ctx.lineTo(state.sim.wallPreview.x, state.sim.wallPreview.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Mobil Ölçüm Noktalarını Çiz (2D)
      (state.sim.mobileMeasurements || []).forEach(m => {
        if (m.floor !== state.sim.floor) return;
        
        // Draw pulse
        ctx.fillStyle = m.dbm >= -60 ? 'rgba(16, 185, 129, 0.2)' : m.dbm >= -78 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 14 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw pin dot
        ctx.fillStyle = m.dbm >= -60 ? 'var(--emerald)' : m.dbm >= -78 ? 'var(--warning)' : 'var(--crimson)';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw text tag
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px var(--font-body)';
        ctx.textAlign = 'center';
        ctx.fillText(`${m.dbm} dBm`, m.x, m.y - 10);
      });

      // Router'ı (Modem) Çiz
      const rx = state.sim.router.x;
      const ry = state.sim.router.y;
      const isRouterHere = state.sim.routerFloor === state.sim.floor;

      if (isRouterHere) {
        const pulseRad = 20 + Math.sin(Date.now() / 200) * 3;
        const rGrad = ctx.createRadialGradient(rx, ry, 2, rx, ry, pulseRad + 10);
        rGrad.addColorStop(0, 'var(--cyan)');
        rGrad.addColorStop(0.3, 'rgba(6, 182, 212, 0.4)');
        rGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.arc(rx, ry, pulseRad + 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'var(--primary)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rx, ry, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Modemin başka katta olduğunu belirten hafif transparan simge
        ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
        ctx.beginPath();
        ctx.arc(rx, ry, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '9px var(--font-title)';
        ctx.textAlign = 'center';
        ctx.fillText(`Kat ${state.sim.routerFloor}`, rx, ry + 3);
      }

    } else {
      // ================= 3D ISOMETRIC HOLOGRAPHIC RENDER =================
      const getZOffset = (fIdx) => {
        return (fIdx - state.sim.floor) * 90;
      };

      for (let f = 0; f <= 2; f++) {
        const z = getZOffset(f);
        const isActive = f === state.sim.floor;

        if (isActive) {
          // --- ACTIVE FLOOR: HIGH RESOLUTION BLOCKY HEATMAP ---
          const step3D = 16;
          for (let x = 0; x < w; x += step3D) {
            for (let y = 0; y < h; y += step3D) {
              const dbm = calculateSignalAtPoint(x + step3D/2, y + step3D/2);
              ctx.fillStyle = getColorForSignal(dbm);
              
              const p0 = projectTo3D(x, y, z);
              const p1 = projectTo3D(x + step3D, y, z);
              const p2 = projectTo3D(x + step3D, y + step3D, z);
              const p3 = projectTo3D(x, y + step3D, z);

              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.lineTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.lineTo(p3.x, p3.y);
              ctx.closePath();
              ctx.fill();
              
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }

          // Outer glowing border
          const b0 = projectTo3D(0, 0, z);
          const b1 = projectTo3D(w, 0, z);
          const b2 = projectTo3D(w, h, z);
          const b3 = projectTo3D(0, h, z);

          ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'var(--cyan)';
          ctx.beginPath();
          ctx.moveTo(b0.x, b0.y);
          ctx.lineTo(b1.x, b1.y);
          ctx.lineTo(b2.x, b2.y);
          ctx.lineTo(b3.x, b3.y);
          ctx.closePath();
          ctx.stroke();
          ctx.shadowBlur = 0;

          const lblPt = projectTo3D(-15, h / 2, z);
          ctx.fillStyle = 'var(--cyan)';
          ctx.font = 'bold 10px var(--font-title)';
          ctx.textAlign = 'right';
          ctx.fillText(`KAT ${f} (AKTİF)`, lblPt.x, lblPt.y);

        } else {
          // --- INACTIVE FLOOR: WIREFRAME ---
          const b0 = projectTo3D(0, 0, z);
          const b1 = projectTo3D(w, 0, z);
          const b2 = projectTo3D(w, h, z);
          const b3 = projectTo3D(0, h, z);

          ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(b0.x, b0.y);
          ctx.lineTo(b1.x, b1.y);
          ctx.lineTo(b2.x, b2.y);
          ctx.lineTo(b3.x, b3.y);
          ctx.closePath();
          ctx.stroke();

          // Sub grid lines
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
          for (let i = 0.2; i <= 0.8; i += 0.2) {
            const hStart1 = projectTo3D(0, h * i, z);
            const hEnd1 = projectTo3D(w, h * i, z);
            ctx.beginPath();
            ctx.moveTo(hStart1.x, hStart1.y);
            ctx.lineTo(hEnd1.x, hEnd1.y);
            ctx.stroke();

            const vStart1 = projectTo3D(w * i, 0, z);
            const vEnd1 = projectTo3D(w * i, h, z);
            ctx.beginPath();
            ctx.moveTo(vStart1.x, vStart1.y);
            ctx.lineTo(vEnd1.x, vEnd1.y);
            ctx.stroke();
          }

          const lblPt = projectTo3D(-15, h / 2, z);
          ctx.fillStyle = 'rgba(99, 102, 241, 0.4)';
          ctx.font = 'bold 9px var(--font-title)';
          ctx.textAlign = 'right';
          ctx.fillText(`KAT ${f}`, lblPt.x, lblPt.y);
        }

        // --- Draw Walls in 3D ---
        state.sim.walls.forEach(wall => {
          const wallFloor = wall.floor !== undefined ? wall.floor : 0;
          if (wallFloor !== f) return;

          const w1 = projectTo3D(wall.x1, wall.y1, z);
          const w2 = projectTo3D(wall.x2, wall.y2, z);
          
          const wallHeight = 20;
          const w1_top = projectTo3D(wall.x1, wall.y1, z + wallHeight);
          const w2_top = projectTo3D(wall.x2, wall.y2, z + wallHeight);

          let fillStyle = 'rgba(71, 85, 105, 0.3)';
          let strokeStyle = '#475569';
          if (wall.type === 'drywall') {
            fillStyle = 'rgba(217, 119, 6, 0.25)';
            strokeStyle = '#d97706';
          } else if (wall.type === 'glass') {
            fillStyle = 'rgba(6, 182, 212, 0.2)';
            strokeStyle = 'rgba(6, 182, 212, 0.8)';
          }

          ctx.fillStyle = fillStyle;
          ctx.beginPath();
          ctx.moveTo(w1.x, w1.y);
          ctx.lineTo(w2.x, w2.y);
          ctx.lineTo(w2_top.x, w2_top.y);
          ctx.lineTo(w1_top.x, w1_top.y);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(w1.x, w1.y);
          ctx.lineTo(w2.x, w2.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(w1_top.x, w1_top.y);
          ctx.lineTo(w2_top.x, w2_top.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(w1.x, w1.y);
          ctx.lineTo(w1_top.x, w1_top.y);
          ctx.moveTo(w2.x, w2.y);
          ctx.lineTo(w2_top.x, w2_top.y);
          ctx.stroke();
        });

        // --- Draw Mobile Measurements in 3D ---
        (state.sim.mobileMeasurements || []).forEach(m => {
          if (m.floor !== f) return;

          const mBase = projectTo3D(m.x, m.y, z);
          const pinHeight = 12 + Math.sin(Date.now() / 250 + m.x) * 2;
          const mTop = projectTo3D(m.x, m.y, z + pinHeight);

          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mBase.x, mBase.y);
          ctx.lineTo(mTop.x, mTop.y);
          ctx.stroke();

          ctx.fillStyle = m.dbm >= -60 ? 'var(--emerald)' : m.dbm >= -78 ? 'var(--warning)' : 'var(--crimson)';
          ctx.beginPath();
          ctx.arc(mTop.x, mTop.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 8px var(--font-body)';
          ctx.textAlign = 'left';
          ctx.fillText(`${m.dbm} dBm (${m.device})`, mTop.x + 6, mTop.y + 3);
        });

        // --- Draw Router in 3D ---
        if (state.sim.routerFloor === f) {
          const rx = state.sim.router.x;
          const ry = state.sim.router.y;

          const rBase = projectTo3D(rx, ry, z);
          const floatHeight = 15 + Math.sin(Date.now() / 200) * 3;
          const rFloat = projectTo3D(rx, ry, z + floatHeight);

          // Glowing ripples
          const pulseR1 = (Date.now() / 30) % 50;
          const pulseR2 = ((Date.now() / 30) + 25) % 50;

          drawProjectedCircle(ctx, rx, ry, pulseR1, z, `rgba(6, 182, 212, ${1 - pulseR1 / 50})`);
          drawProjectedCircle(ctx, rx, ry, pulseR2, z, `rgba(6, 182, 212, ${1 - pulseR2 / 50})`);

          // Tether line
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(rBase.x, rBase.y);
          ctx.lineTo(rFloat.x, rFloat.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Router sphere
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = 'var(--primary)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(rFloat.x, rFloat.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.shadowBlur = 8;
          ctx.shadowColor = 'var(--cyan)';
          ctx.strokeStyle = 'var(--cyan)';
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    }
  }

  // Modem parlama döngüsü için animasyon
  function animateHeatmap() {
    if (state.activeTab === 'heatmap' && !state.sim.isDraggingRouter && !state.sim.isDrawingWall) {
      renderHeatmap();
    }
    requestAnimationFrame(animateHeatmap);
  }
  requestAnimationFrame(animateHeatmap);

  // --- SİMÜLATÖR FARE/MOUSe ETKİLEŞİMLERİ ---
  
  function getMousePos(e) {
    const rect = el.heatmapCanvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (el.heatmapCanvas.width / rect.width),
      y: (e.clientY - rect.top) * (el.heatmapCanvas.height / rect.height)
    };
  }

  el.heatmapCanvas.addEventListener('mousedown', (e) => {
    if (state.sim.is3DMode) return; // 3D modunda tıklama ve sürükleme engellenir
    const mouse = getMousePos(e);
    
    if (state.sim.activeTool === 'router') {
      const rx = state.sim.router.x;
      const ry = state.sim.router.y;
      const dist = Math.sqrt((mouse.x - rx) * (mouse.x - rx) + (mouse.y - ry) * (mouse.y - ry));
      
      if (dist <= state.sim.router.radius) {
        state.sim.isDraggingRouter = true;
      }
    } else if (state.sim.activeTool === 'wall') {
      state.sim.isDrawingWall = true;
      state.sim.wallStart = mouse;
    }
  });

  el.heatmapCanvas.addEventListener('mousemove', (e) => {
    const mouse = getMousePos(e);

    // Canlı Konum Metriklerini Güncelle
    const dbm = calculateSignalAtPoint(mouse.x, mouse.y);
    const signalPct = dbmToPercentage(dbm);
    
    let qualityText = 'Harika';
    if (dbm < -50 && dbm >= -68) qualityText = 'İyi';
    else if (dbm < -68 && dbm >= -80) qualityText = 'Orta';
    else if (dbm < -80 && dbm >= -90) qualityText = 'Zayıf';
    else if (dbm < -90) qualityText = 'Ölü Nokta';

    el.metricSignal.textContent = `${dbm} dBm (${qualityText} - %${signalPct})`;
    
    let speed = 0;
    if (state.sim.band === '5') {
      speed = Math.round((signalPct / 100) * 866);
    } else {
      speed = Math.round((signalPct / 100) * 300);
    }
    el.metricSpeed.textContent = speed > 10 ? `${speed} Mbps` : 'Koptu / Sinyal Yok';

    if (state.sim.is3DMode) return;

    if (state.sim.activeTool === 'router' && state.sim.isDraggingRouter) {
      state.sim.router.x = Math.max(10, Math.min(el.heatmapCanvas.width - 10, mouse.x));
      state.sim.router.y = Math.max(10, Math.min(el.heatmapCanvas.height - 10, mouse.y));
      state.sim.routerFloor = state.sim.floor; // modem sürüklendiği aktif kata sabitlenir
      renderHeatmap();
    } else if (state.sim.activeTool === 'wall' && state.sim.isDrawingWall) {
      state.sim.wallPreview = mouse;
      renderHeatmap();
    }
  });

  window.addEventListener('mouseup', () => {
    if (state.sim.isDraggingRouter) {
      state.sim.isDraggingRouter = false;
    }
    if (state.sim.isDrawingWall) {
      state.sim.isDrawingWall = false;
      if (state.sim.wallStart && state.sim.wallPreview) {
        const dx = state.sim.wallPreview.x - state.sim.wallStart.x;
        const dy = state.sim.wallPreview.y - state.sim.wallStart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 10) {
          const mat = document.querySelector('input[name="wall-material"]:checked').value;
          
          state.sim.walls.push({
            x1: state.sim.wallStart.x,
            y1: state.sim.wallStart.y,
            x2: state.sim.wallPreview.x,
            y2: state.sim.wallPreview.y,
            type: mat,
            floor: state.sim.floor // duvar çizildiği aktif kata enjekte edilir
          });
        }
      }
      state.sim.wallStart = null;
      state.sim.wallPreview = null;
      renderHeatmap();
    }
  });

  // ================= İNCE AYAR HESAPLAYICI MANTIĞI =================

  // Modem markasını OUI ve SSID heuristikleriyle tahmin eden yardımcı fonksiyon
  function detectModemBrand() {
    if (!state.connectedNetwork || !state.connectedNetwork.connected) {
      return 'unknown';
    }

    const bssid = (state.connectedNetwork.bssid || '').toLowerCase();
    const ssid = (state.connectedNetwork.ssid || '').toLowerCase();

    // 1. SSID tabanlı tahminler (Öncelikli çünkü ISP markalamaları çok güçlüdür)
    if (ssid.includes('superonline') || ssid.includes('huawei')) {
      return 'huawei';
    }
    if (ssid.includes('turktelekom') || ssid.includes('ttnet') || ssid.includes('zyxel') || ssid.includes('vmg')) {
      if (ssid.includes('zyxel')) return 'zyxel';
      if (ssid.includes('tp-link') || ssid.includes('tplink')) return 'tplink';
      return 'zyxel'; // Varsayılan Telekom modemi
    }
    if (ssid.includes('keenetic') || ssid.includes('omni') || ssid.includes('hero') || ssid.includes('giga')) {
      return 'keenetic';
    }
    if (ssid.includes('asus')) {
      return 'asus';
    }
    if (ssid.includes('airties')) {
      return 'airties';
    }

    // 2. MAC OUI Tabanlı Tahminler (BSSID ilk 3 okteti)
    if (bssid) {
      const oui = bssid.split(':').slice(0, 3).join(':');
      
      const tplinkOUIs = [
        '50:c7:bf', '14:cc:20', '00:1d:0f', 'b0:4e:26', 'e8:94:f6', '0c:80:63', '74:da:da',
        '84:16:f9', 'a0:f3:c1', 'c5:09:b8', 'cc:32:e5', 'd8:07:b6', 'f8:1a:67', '3c:84:c5',
        '00:0a:eb', '40:a5:ef', 'bc:d1:77', '00:19:e0', '00:21:27', '18:a6:f7', '18:d6:c7',
        '20:e5:2a', '30:b5:c2', '50:3e:aa', '70:4f:57', '74:ea:3a', '7c:c2:c6', '80:3f:5d',
        '90:f6:52', '98:de:d0', 'c0:25:e9', 'c4:6e:1f', 'e8:de:27', 'ec:08:6b', 'f4:3e:61',
        'f8:35:dd'
      ];
      const asusOUIs = [
        '04:d9:f5', '50:46:5d', '38:d5:47', '1c:b7:2c', '24:4b:fe', '40:16:7e', '4c:ed:fb',
        '54:a0:50', '74:d0:2b', '88:d7:f6', 'ac:22:0b', 'b0:6e:bf', 'c8:60:00', 'd8:50:e6',
        'e0:3f:49', 'f0:79:60', 'f8:32:e4'
      ];
      const keeneticOUIs = [
        '50:ff:20', 'fc:8b:97', 'e4:18:6b', 'c0:56:27', '44:4e:6d', '7c:04:d0'
      ];
      const zyxelOUIs = [
        '00:13:49', '00:19:cb', '00:23:f8', '10:7b:44', '2c:30:33', '30:85:a9', '5c:e2:8c',
        '8c:e0:81', 'b0:b2:dc', 'bc:14:01', 'c8:6c:87', 'd4:6e:5e', 'e0:1c:41', 'ec:43:f6',
        'f8:c0:91', '88:25:93', 'cc:5d:4e', 'd0:57:85', '00:1a:c4'
      ];
      const airtiesOUIs = [
        '00:17:f2', '00:24:d4', '18:28:61', '3c:15:c2', '40:f2:01', '90:94:e4', 'c0:3a:08',
        'e0:d9:e3', 'fc:b4:e6', '00:1c:a8', '00:08:c2'
      ];
      const huaweiOUIs = [
        '00:18:82', '00:25:9e', '00:46:4b', '0c:37:dc', '10:1b:54', '20:0b:c7', '20:2b:20',
        '28:31:52', '28:5f:db', '28:6e:d4', '34:0a:98', '3c:f8:08', '40:4d:8e', '48:ad:08',
        '4c:1f:cc', '4c:b1:6c', '50:9f:27', '54:25:ea', '54:89:98', '5c:4c:a9', '60:e6:bc',
        '64:16:f0', '68:8f:84', '70:54:b4', '70:72:cf', '74:88:2a', '78:1d:ba', '78:d7:52',
        '7c:60:97', '80:38:bc', '80:b6:86', '80:ca:76', '84:db:ac', '88:e3:ab', '8c:15:c4',
        '94:04:9c', '94:3c:f0', '94:77:2b', '9c:28:ef', 'a4:1b:c0', 'a4:be:2b', 'ac:85:3d',
        'ac:e2:15', 'b4:15:13', 'b8:94:36', 'c8:d1:5e', 'cc:96:a0', 'cc:cc:81', 'd4:40:f0',
        'd4:94:e8', 'd8:49:0b', 'e0:24:7f', 'e4:35:18', 'e8:08:8b', 'ec:38:8f', 'f4:55:9c',
        'f4:dc:f9', 'fc:48:ef', 'fc:e3:3c'
      ];

      if (tplinkOUIs.includes(oui)) return 'tplink';
      if (asusOUIs.includes(oui)) return 'asus';
      if (keeneticOUIs.includes(oui)) return 'keenetic';
      if (zyxelOUIs.includes(oui)) return 'zyxel';
      if (airtiesOUIs.includes(oui)) return 'airties';
      if (huaweiOUIs.includes(oui)) return 'huawei';
    }

    // 3. Fallback (SSID içeriğindeki diğer ortak kelimeler)
    if (ssid.includes('ttnet') || ssid.includes('telekom')) {
      return 'zyxel';
    }
    if (ssid.includes('giga') || ssid.includes('turknet')) {
      return 'keenetic';
    }

    return 'unknown';
  }

  function initFineTuning() {
    // Senaryo butonları için olay dinleyiciler
    const scenarioBtns = {
      gaming: document.getElementById('btn-scen-gaming'),
      balanced: document.getElementById('btn-scen-balanced'),
      iot: document.getElementById('btn-scen-iot')
    };

    Object.keys(scenarioBtns).forEach(scen => {
      const btn = scenarioBtns[scen];
      if (btn) {
        btn.addEventListener('click', () => {
          // Aktif sınıfını güncelle
          Object.values(scenarioBtns).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          state.fineTuningScenario = scen;
          updateFineTuningUI();
        });
      }
    });

    // Modem Seçim Dropdown dinleyicisi
    const brandSelect = document.getElementById('select-modem-brand');
    if (brandSelect) {
      brandSelect.addEventListener('change', (e) => {
        state.userSelectedModemBrand = e.target.value;
        updateFineTuningUI();
      });
    }

    // Akordeon menü başlıklarına tıklama dinleyicisi ekle
    const accordionHeaders = document.querySelectorAll('.accordion-trigger');
    accordionHeaders.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.accordion-item');
        const isActive = item.classList.contains('active');
        
        // Diğer açık akordeonları kapat (premium deneyim için)
        document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
        
        if (!isActive) {
          item.classList.add('active');
        }
      });
    });
  }

  function updateFineTuningUI() {
    if (state.activeTab !== 'finetuning' && state.activeTab !== 'dashboard') return;

    const surroundingCount = state.networks.length;

    // --- 1. RTS/CTS Değeri Hesapla ---
    let rtsValue = 2347;
    let rtsStatus = 'Sakin Ortam';
    let rtsDesc = 'Önerilen: 2347 (Değişiklik Gerekmiyor)';
    let rtsProgress = 100;
    let rtsBadgeClass = 'badge badge-success';

    if (surroundingCount > 15) {
      rtsValue = 2200;
      rtsStatus = 'Aşırı Yoğun Ortam';
      rtsDesc = 'Önerilen: 2200 Bytes (Ağır paket çarpışması önleme etkin)';
      rtsProgress = 70;
      rtsBadgeClass = 'badge badge-danger';
    } else if (surroundingCount > 8) {
      rtsValue = 2304;
      rtsStatus = 'Yoğun Ortam';
      rtsDesc = 'Önerilen: 2304 Bytes (Komşu ağ parazitlerini engelleme etkin)';
      rtsProgress = 85;
      rtsBadgeClass = 'badge badge-warning';
    }

    const rtsValEl = document.getElementById('val-tweak-rts');
    const rtsStatusEl = document.getElementById('badge-tweak-rts-status');
    const rtsDescEl = document.getElementById('desc-tweak-rts');
    const rtsBarEl = document.getElementById('bar-tweak-rts');

    if (rtsValEl) rtsValEl.textContent = rtsValue;
    if (rtsStatusEl) {
      rtsStatusEl.textContent = rtsStatus;
      rtsStatusEl.className = `badge ${rtsBadgeClass}`;
    }
    if (rtsDescEl) rtsDescEl.innerHTML = rtsDesc;
    if (rtsBarEl) rtsBarEl.style.width = `${rtsProgress}%`;


    // --- 2. DTIM & Beacon Hesapla ---
    let dtimVal = 1;
    let dtimBar = 33.3;
    let dtimDesc = 'Önerilen: 1 (Anlık Paket İletimi)';
    let dtimBadge = 'Düşük Gecikme';
    let dtimBadgeClass = 'badge badge-success';

    let beaconVal = 100;
    let beaconBar = 83.3;
    let beaconDesc = 'Önerilen: 100 ms (Standart Sıklık)';
    let beaconBadge = 'Kararlı';
    let beaconBadgeClass = 'badge badge-info';

    if (state.fineTuningScenario === 'balanced') {
      dtimVal = 2;
      dtimBar = 66.6;
      dtimDesc = 'Önerilen: 2 (Dengeli Güç ve Ping)';
      dtimBadge = 'Dengeli';
      dtimBadgeClass = 'badge badge-info';
    } else if (state.fineTuningScenario === 'iot') {
      dtimVal = 3;
      dtimBar = 100;
      dtimDesc = 'Önerilen: 3 (Maksimum Pil Ömrü)';
      dtimBadge = 'Güç Tasarrufu';
      dtimBadgeClass = 'badge badge-warning';

      beaconVal = 120;
      beaconBar = 100;
      beaconDesc = 'Önerilen: 120 ms (Düşük Trafik)';
      beaconBadge = 'Düşük Trafik';
      beaconBadgeClass = 'badge badge-warning';
    }

    const dtimValEl = document.getElementById('val-tweak-dtim');
    const dtimBarEl = document.getElementById('bar-tweak-dtim');
    const dtimDescEl = document.getElementById('desc-tweak-dtim');
    const dtimBadgeEl = document.querySelector('#panel-finetuning .card-glow-cyan .badge');

    if (dtimValEl) dtimValEl.textContent = dtimVal;
    if (dtimBarEl) dtimBarEl.style.width = `${dtimBar}%`;
    if (dtimDescEl) dtimDescEl.innerHTML = dtimDesc;
    if (dtimBadgeEl) {
      dtimBadgeEl.textContent = dtimBadge;
      dtimBadgeEl.className = dtimBadgeClass;
    }

    const beaconValEl = document.getElementById('val-tweak-beacon');
    const beaconBarEl = document.getElementById('bar-tweak-beacon');
    const beaconDescEl = document.getElementById('desc-tweak-beacon');
    const beaconBadgeEl = document.querySelector('#panel-finetuning .card-glow-emerald .badge');

    if (beaconValEl) beaconValEl.textContent = beaconVal;
    if (beaconBarEl) beaconBarEl.style.width = `${beaconBar}%`;
    if (beaconDescEl) beaconDescEl.innerHTML = beaconDesc;
    if (beaconBadgeEl) {
      beaconBadgeEl.textContent = beaconBadge;
      beaconBadgeEl.className = beaconBadgeClass;
    }


    // --- 3. Guard Interval (GI) Hesapla ---
    let connectedSignal = 80;
    if (state.connectedNetwork && state.connectedNetwork.connected) {
      connectedSignal = state.connectedNetwork.signal;
    } else if (state.networks.length > 0) {
      connectedSignal = state.networks[0].maxSignal;
    }

    let giVal = '800ns';
    let giStatus = 'Menzil Öncelikli';
    let giDesc = 'Önerilen: 800ns (Long GI - Parazitli/Zayıf sinyalde güvenli mesafe)';
    let giProgress = 100;
    let giBadgeClass = 'badge badge-warning';

    if (connectedSignal >= 75) {
      giVal = '400ns';
      giStatus = 'Yüksek Hız';
      giDesc = 'Önerilen: 400ns (Short GI - Güçlü sinyal altında %11 ekstra bant genişliği)';
      giProgress = 50;
      giBadgeClass = 'badge badge-success';
    }

    const giValEl = document.getElementById('val-tweak-gi');
    const giStatusEl = document.getElementById('badge-tweak-gi');
    const giDescEl = document.getElementById('desc-tweak-gi');
    const giBarEl = document.getElementById('bar-tweak-gi');

    if (giValEl) giValEl.textContent = giVal;
    if (giStatusEl) {
      giStatusEl.textContent = giStatus;
      giStatusEl.className = giBadgeClass;
    }
    if (giDescEl) giDescEl.innerHTML = giDesc;
    if (giBarEl) giBarEl.style.width = `${giProgress}%`;


    // --- 4. Airtime Fairness (ATF) ve DFS Ayarları ---
    const legacyCount = state.networks.filter(n => n.bssids.some(b => {
      const radio = b.radioType || '';
      return radio.includes('802.11b') || radio.includes('802.11g') || radio.includes('802.11n');
    })).length;

    const atfEl = document.getElementById('desc-adv-atf');
    const atfIconEl = document.getElementById('icon-tweak-atf');

    if (atfEl) {
      if (legacyCount > 3) {
        atfEl.innerHTML = `Çevrenizde eski standartlarda (802.11g/n) çalışan <strong>${legacyCount} adet ağ</strong> tespit edildi. Evinizdeki eski nesil akıllı ev/eski telefon gibi cihazların modern cihazları yavaşlatmasını önlemek için modemin kablosuz ayarlarından Airtime Fairness modunu <strong>Açık (Enabled)</strong> yapın.`;
        if (atfIconEl) atfIconEl.className = 'tweak-icon-badge warning';
      } else {
        atfEl.innerHTML = `Çevrenizdeki ağlar genellikle güncel standartlarda veya yoğun değil. Airtime Fairness ayarını modemin kablosuz ayarlarından <strong>Kapalı (Disabled)</strong> tutarak gereksiz CPU yükünü önleyebilirsiniz.`;
        if (atfIconEl) atfIconEl.className = 'tweak-icon-badge emerald';
      }
    }

    // DFS Radar
    const dfsEl = document.getElementById('desc-adv-dfs');
    const dfsIconEl = document.getElementById('icon-tweak-dfs');

    if (dfsEl) {
      let isConnected5G = false;
      let channel = 0;
      if (state.connectedNetwork && state.connectedNetwork.connected) {
        channel = state.connectedNetwork.channel;
        isConnected5G = channel > 14;
      }

      if (isConnected5G) {
        const dfsChannels = [52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144];
        if (dfsChannels.includes(channel)) {
          dfsEl.innerHTML = `Bağlı olduğunuz 5 GHz ağı, DFS radar frekansını (<strong>Kanal ${channel}</strong>) kullanıyor. Yakında askeri veya meteoroloji radarı algılanırsa bağlantınız kesilebilir veya 2.4 GHz'e düşebilir. Kararlılık için 36-48 veya 149-161 arasındaki standart kanalları tercih etmeniz önerilir.`;
          if (dfsIconEl) dfsIconEl.className = 'tweak-icon-badge danger';
        } else {
          dfsEl.innerHTML = `Mevcut 5 GHz bağlantınız radar çakışması olmayan standart kanalda (<strong>Kanal ${channel}</strong>) çalışıyor. Herhangi bir DFS radar çakışma riski bulunmamaktadır. Kararlı bir bağlantıdasınız.`;
          if (dfsIconEl) dfsIconEl.className = 'tweak-icon-badge emerald';
        }
      } else {
        dfsEl.innerHTML = `Mevcut 5 GHz bağlantınız bulunmuyor veya radar çakışması olmayan standart kanallarda çalışıyor. Herhangi bir DFS radar çakışması riski görünmüyor.`;
        if (dfsIconEl) dfsIconEl.className = 'tweak-icon-badge info';
      }
    }

    // --- 5. Modem Markası Özel Optimizasyon Kılavuzu & Arayüz Yolları Senkronizasyonu ---
    state.detectedModemBrand = detectModemBrand();
    
    let activeBrand = state.userSelectedModemBrand;
    if (activeBrand === 'detect') {
      activeBrand = state.detectedModemBrand !== 'unknown' ? state.detectedModemBrand : 'unknown';
    }

    const badgeEl = document.getElementById('detected-modem-badge');
    if (badgeEl) {
      if (state.connectedNetwork && state.connectedNetwork.connected) {
        if (state.detectedModemBrand !== 'unknown') {
          const brandNames = {
            tplink: 'TP-Link',
            asus: 'ASUS Router',
            keenetic: 'Keenetic',
            zyxel: 'ZyXEL',
            airties: 'Airties',
            huawei: 'Huawei / Superonline'
          };
          badgeEl.textContent = `⚡ Uyumlu: ${brandNames[state.detectedModemBrand]} (Otomatik)`;
          badgeEl.className = 'badge badge-success';
        } else {
          badgeEl.textContent = `🔌 Bağlı Ağ (Marka Tanınamadı)`;
          badgeEl.className = 'badge badge-warning';
        }
      } else {
        badgeEl.textContent = `🔍 Simülasyon Modu (Manuel Seçim)`;
        badgeEl.className = 'badge badge-info';
      }
    }

    const brandGuideDetails = {
      tplink: {
        ipDesc: `Bağlı olduğunuz <strong>TP-Link</strong> modemin arayüzüne girmek için tarayıcınızın adres çubuğuna <strong>192.168.1.1</strong> veya <strong>192.168.0.1</strong> yazın. Dilerseniz alternatif olarak <strong>tplinkmodem.net</strong> veya <strong>tplinkwifi.net</strong> adreslerini kullanabilirsiniz.`,
        pwdDesc: `TP-Link modemlerde varsayılan kullanıcı adı <strong>admin</strong>, şifre ise genellikle <strong>admin</strong>'dir. Operatör logolu (Türk Telekom) modellerde şifre <strong>turktelekom</strong> veya modemin arkasındaki beyaz etikette basılı olan şifredir.`,
        noteTitle: `TP-Link Donanım & Model Tavsiyesi`,
        noteDesc: `TP-Link modemlerde (özellikle Archer ve VR serisi), <strong>Airtime Fairness</strong> ve <strong>MU-MIMO</strong> ayarları kablosuz performansı ciddi derecede artırır. Archer modellerinde RTS Threshold ayarı varsayılan olarak 2347'dir, yoğun ortamlarda 2304'e düşürmek ping dalgalanmalarını (jitter) %40 azaltmaktadır.`
      },
      asus: {
        ipDesc: `Bağlı olduğunuz <strong>ASUS Router</strong> yönetim paneline girmek için tarayıcınızın adres satırına <strong>192.168.50.1</strong> veya <strong>192.168.1.1</strong> yazın. Alternatif olarak kolayca <strong>router.asus.com</strong> adresini de kullanabilirsiniz.`,
        pwdDesc: `ASUS cihazlarında varsayılan kullanıcı adı <strong>admin</strong>'dir. Yönetici şifresi ise ilk kurulum esnasında kendinizin belirlediği özel şifredir. Hatırlamıyorsanız reset butonuyla cihazı sıfırlayıp arkadaki varsayılan şifreyle girebilirsiniz.`,
        noteTitle: `ASUS Professional Kablosuz Önerileri`,
        noteDesc: `ASUS router'larda **Gelişmiş Ayarlar > Kablosuz > Profesyonel** sekmesinde yer alan **Roaming Assistant (Dolaşım Asistanı)** özelliğini etkinleştirmek ve eşik değerini **-75 dBm** yapmak, zayıf çeken cihazların ağdan otomatik olarak kopup daha hızlı olan 5 GHz bandına yönlenmesini (Smart Connect) sorunsuz çalıştıracaktır.`
      },
      keenetic: {
        ipDesc: `Bağlı olduğunuz <strong>Keenetic</strong> modemin yönetim paneline girmek için tarayıcınızın adres çubuğuna <strong>192.168.1.1</strong> yazın. Ayrıca internete bağlı olmasanız dahi <strong>my.keenetic.net</strong> yazarak da bulut yönetim paneline ulaşabilirsiniz.`,
        pwdDesc: `Keenetic modemlerde varsayılan kullanıcı adı <strong>admin</strong>'dir. Yönetici şifresi ilk kurulumda oluşturduğunuz şifredir veya cihazın altındaki etikette yazan 8 haneli varsayılan anahtardır.`,
        noteTitle: `Keenetic Bulut ve Sinyal İpuçları`,
        noteDesc: `Keenetic OS (KeeneticOS) işletim sistemi, **Beamforming** ve **MU-MIMO** yönetimini otomatik olarak mükemmel yapmaktadır. Gelişmiş kablosuz ayarlarında **Short GI (Kısa GI)** seçeneğini açmak, Wi-Fi 5 ve Wi-Fi 6 bağlantı hızlarınızı doğrudan %11 oranında artıracaktır. Cihazınızı Keenetic Mobil uygulaması ile de buluttan yönetebilirsiniz.`
      },
      zyxel: {
        ipDesc: `Bağlı olduğunuz <strong>ZyXEL</strong> modemin arayüzüne bağlanmak için tarayıcınıza <strong>192.168.1.1</strong> adresini yazın. Bazı kurumsal modellerde varsayılan IP adresi <strong>192.168.1.254</strong> olabilir.`,
        pwdDesc: `ZyXEL modemlerde varsayılan kullanıcı adı <strong>admin</strong>'dir. Şifre ise genellikle <strong>1234</strong> veya Türk Telekom/TTNET modemi ise <strong>ttnet</strong>, <strong>turktelekom</strong> ya da cihaz arkasındaki etikette yazılı olan şifredir.`,
        noteTitle: `ZyXEL Kararlılık & Kanal Genişliği`,
        noteDesc: `Zyxel modemler (özellikle VMG serisi) 2.4 GHz bandında **40 MHz** kanal genişliği seçildiğinde kararsızlık yaşayabilmektedir. Bu nedenle Zyxel arayüzünde 2.4G için kesinlikle **20 MHz** kanal genişliğini sabitleyin. Yoğun apartman ortamlarında RTS Threshold değerini 2304 yapmak bağlantı kopmalarını büyük ölçüde önler.`
      },
      airties: {
        ipDesc: `Bağlı olduğunuz <strong>Airties</strong> modemin arayüzüne girmek için tarayıcınızın adres çubuğuna <strong>192.168.2.1</strong> yazın. Cihazı bulmakta zorlanırsanız alternatif olarak <strong>airties.local</strong> adresini deneyebilirsiniz.`,
        pwdDesc: `Airties modemlerde varsayılan kullanıcı adı <strong>admin</strong>'dir. Klasik Airties modemlerde varsayılan şifre <strong>boş bırakılmıştır (şifresizdir)</strong>, direkt giriş yapabilirsiniz. Operatör logolu ise şifre <strong>admin</strong> veya <strong>ttnet</strong> olabilir.`,
        noteTitle: `Airties Mesh & Dolaşım Tavsiyesi`,
        noteDesc: `Airties modemler, **Airties Mesh (Çoklu Erişim Noktası)** teknolojisini mükemmel destekler. Eğer evinizde Airties sinyal genişleticiler varsa, modemin **AirTouch** özelliğini aktif tutarak tek tuşla ağınızı senkronize edebilirsiniz. RTS/CTS ayarını varsayılan bırakıp, 2.4 GHz'de yalnızca **1, 6 veya 11** kanallarını seçmeniz mesh uyumunu artıracaktır.`
      },
      huawei: {
        ipDesc: `Bağlı olduğunuz <strong>Huawei / Superonline</strong> modemin yönetim arayüzü için tarayıcınıza <strong>192.168.1.1</strong> yazın. Fiber GPON altyapılı evsel ağ geçidi (HGW) modelleri için ise bu adres genellikle <strong>192.168.100.1</strong> adresidir.`,
        pwdDesc: `Huawei Superonline modemlerde varsayılan kullanıcı adı <strong>admin</strong> veya <strong>user</strong>'dır. Varsayılan giriş şifresi ise genellikle <strong>admin</strong>, <strong>superonline</strong> veya cihazın arkasındaki etikette yer alan özel karakterli şifredir.`,
        noteTitle: `Huawei GPON/HGW Fiber İpuçları`,
        noteDesc: `Huawei HG8245 ve HG8245H serisi fiber modemlerde, **5 GHz bandında kanal genişliğini 80 MHz** yapmak fiber hızınızın tamamını kablosuzda (Speedtest üzerinde) kayıpsız almanızı sağlar. 2.4 GHz bandındaki yoğun çakışmalar için **DTIM aralığını 2** yapmak mobil cihazların şarj süresine olumlu katkı sunar.`
      },
      unknown: {
        ipDesc: `Uygulamamızın önerdiği kanalları ayarlamak için modeminizin yönetim paneline girmelisiniz. Çoğu modem için bu adres tarayıcınızın adres çubuğuna yazacağınız <strong>192.168.1.1</strong>, <strong>192.168.1.2</strong> veya <strong>192.168.2.1</strong> adresleridir.`,
        pwdDesc: `Kullanıcı adı genellikle <strong>admin</strong>, şifre ise <strong>admin</strong>, <strong>turktelekom</strong>, <strong>superonline</strong> veya modeminizin arkasındaki etikette yazılı olan şifredir.`,
        noteTitle: `Genel Donanım İnce Ayar Tavsiyesi`,
        noteDesc: `Modem markanız tespit edilemedi. Ancak genel kararlılık kuralları gereği, WMM ve QoS ayarlarını açık tutmak, 2.4 GHz bandını 20 MHz'e sabitlemek ve çevredeki ağ yoğunluğuna göre RTS/CTS eksiğini bu sayfada hesaplanan değere uydurmak performansınızı ciddi şekilde iyileştirecektir.`
      }
    };

    const guideIpEl = document.getElementById('guide-login-ip-desc');
    const guidePwdEl = document.getElementById('guide-login-pwd-desc');

    if (guideIpEl && guidePwdEl) {
      const details = brandGuideDetails[activeBrand] || brandGuideDetails.unknown;
      guideIpEl.innerHTML = details.ipDesc;
      guidePwdEl.innerHTML = details.pwdDesc;
    }

    // Markaya özel donanım kartını güncelle ve göster
    const tweakBrandItem = document.getElementById('tweak-brand-item');
    const titleAdvBrand = document.getElementById('title-adv-brand');
    const descAdvBrand = document.getElementById('desc-adv-brand');
    
    if (tweakBrandItem && titleAdvBrand && descAdvBrand) {
      const details = brandGuideDetails[activeBrand] || brandGuideDetails.unknown;
      titleAdvBrand.textContent = details.noteTitle;
      descAdvBrand.innerHTML = details.noteDesc;
      tweakBrandItem.style.display = 'flex'; // Göster!
      
      const iconTweakBrand = document.getElementById('icon-tweak-brand');
      if (iconTweakBrand) {
        iconTweakBrand.className = `tweak-icon-badge ${activeBrand !== 'unknown' ? 'cyan' : 'info'}`;
      }
    }

    // İlgili akordeon itemini otomatik genişlet
    if (activeBrand !== 'unknown') {
      const targetAccordionId = `accordion-${activeBrand}`;
      document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.toggle('active', item.id === targetAccordionId);
      });
    } else {
      document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('active');
      });
    }
  }

  // ==============================================================
  // PREMIUM MODÜL FONKSİYONLARI (ADIM 2, 3, 4, 5)
  // ==============================================================

  // --- CANLI PİNG & JİTTER ANALİZÖRÜ ---
  let pingData = []; // Maksimum 30 veri noktası tutar
  function initPingMonitor() {
    const canvas = el.pingCanvas;
    if (!canvas) return;

    function resizePingCanvas() {
      const containerWidth = canvas.parentElement.clientWidth;
      canvas.width = containerWidth || 400;
      canvas.height = 120;
    }
    resizePingCanvas();
    window.addEventListener('resize', resizePingCanvas);

    async function tick() {
      try {
        const res = await fetch('/api/ping');
        if (res.ok) {
          const data = await res.json();
          const latency = data.success ? data.latency : null;

          // DOM metriklerini güncelle
          if (el.pingLatencyVal) el.pingLatencyVal.textContent = data.success ? `${data.latency} ms` : '---';
          if (el.pingJitterVal) el.pingJitterVal.textContent = `${data.jitter} ms`;
          if (el.pingLossVal) {
            el.pingLossVal.textContent = `%${data.packetLoss}`;
            if (data.packetLoss > 0) {
              el.pingLossVal.className = 'val-highlight text-crimson';
            } else {
              el.pingLossVal.className = 'val-highlight text-cyan';
            }
          }

          // Teşhis ve analiz rehberi güncelle
          let diagnosis = '';
          if (data.packetLoss > 0) {
            diagnosis = '<span class="text-crimson" style="font-weight:700;">⚡ Kritik Hata: Kablosuz Paket Kaybı Saptandı!</span> Çevredeki yüksek frekans çakışmaları veya zayıf sinyal nedeniyle veri paketleri kayboluyor. Modem kanalını acilen değiştirmeniz önerilir.';
          } else if (latency === 0 || latency === null) {
            diagnosis = '<span class="text-crimson" style="font-weight:700;">⚡ Bağlantı Kesintisi!</span> Ağ geçidi veya dış sunucu ile ping bağlantısı kurulamıyor. Kablosuz radyo arayüzü kilitlenmiş olabilir.';
          } else if (data.jitter > 15) {
            diagnosis = '<span class="text-warning" style="font-weight:700;">⚠️ Yoğun Gecikme Dalgalanması (Jitter Yüksek):</span> Çevredeki ağların yoğun veri trafiği anlık gecikme zıplamalarına sebep oluyor. Oyunlarda takılma yaşayabilirsiniz. 5 GHz bandına geçmek kararlılığı artıracaktır.';
          } else if (latency > 50) {
            diagnosis = '<span class="text-info" style="font-weight:700;">ℹ️ Ortalama Üstü Gecikme (Ping):</span> Sunucu tepki süresi normalden uzun. RTS Threshold ayarını 2304 yaparak çarpışmaları önleyebilirsiniz.';
          } else {
            diagnosis = '<span class="text-emerald" style="font-weight:700;">✔ Kusursuz Gecikme & Kararlılık:</span> Gecikme ve jitter değerleriniz ideal seviyede. Profesyonel oyuncu ve canlı yayın standartlarında akıcı bir bağlantınız var.';
          }
          if (el.pingDiagnosisDesc) el.pingDiagnosisDesc.innerHTML = diagnosis;

          // Geçmişe ekle
          pingData.push(latency);
          if (pingData.length > 30) pingData.shift();

          renderPingChart();
        }
      } catch (err) {
        console.error("Ping monitor API hatası:", err);
      }
      setTimeout(tick, 1000);
    }

    function renderPingChart() {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Koyu arka plan
      ctx.fillStyle = '#060a13';
      ctx.fillRect(0, 0, w, h);

      // İnce kılavuz ızgaraları
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }
      for (let i = 0; i < h; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
      }

      if (pingData.length === 0) return;

      const maxVal = Math.max(...pingData.map(v => v || 0), 60); // Min grafik ölçeği 60ms
      const padding = 15;
      const usableHeight = h - 2 * padding;

      const getX = (idx) => (idx / 29) * w;
      const getY = (val) => {
        if (val === null || val === undefined) return h - padding;
        return h - padding - (val / maxVal) * usableHeight;
      };

      // Alan boyama (gradient fill)
      ctx.beginPath();
      ctx.moveTo(0, h);
      pingData.forEach((val, idx) => {
        ctx.lineTo(getX(idx), getY(val));
      });
      ctx.lineTo(getX(pingData.length - 1), h);
      ctx.closePath();

      const areaGrad = ctx.createLinearGradient(0, 0, 0, h);
      areaGrad.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
      areaGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Neon mavi çizgi çizimi
      ctx.beginPath();
      pingData.forEach((val, idx) => {
        if (idx === 0) ctx.moveTo(getX(idx), getY(val));
        else ctx.lineTo(getX(idx), getY(val));
      });
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#06b6d4';
      ctx.stroke();
      ctx.shadowBlur = 0; // shadow sıfırla

      // Son noktanın üzerine değerini yaz
      const lastIdx = pingData.length - 1;
      const lastVal = pingData[lastIdx];
      if (lastVal !== null) {
        const lx = getX(lastIdx);
        const ly = getY(lastVal);

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(lx, ly, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'var(--cyan)';
        ctx.font = 'bold 9px var(--font-body)';
        ctx.textAlign = 'right';
        ctx.fillText(`${lastVal} ms`, lx - 6, ly + 3);
      }
    }

    tick();
  }

  // --- SİBER TEHDİT & EVİL TWİN KALKANI ---
  function initSecurityShield() {
    const container = el.securityAlertsContainer;
    if (!container) return;

    container.innerHTML = '';
    let threats = [];

    const connectedSSID = state.connectedNetwork && state.connectedNetwork.connected ? state.connectedNetwork.ssid : null;

    // Çevredeki ağları güvenlik açısından tara
    state.networks.forEach(net => {
      const isConnected = connectedSSID && net.ssid === connectedSSID;
      const authLower = (net.authentication || '').toLowerCase();
      const isWEP = authLower.includes('wep');
      const isOpen = authLower.includes('open') || authLower.includes('none') || authLower === '';

      if (isWEP) {
        threats.push({
          type: 'warning',
          title: `Zayıf Güvenlik Protokolü: WEP Saptandı (${net.ssid})`,
          desc: `Komşu '${net.ssid}' ağı güvensiz WEP şifrelemesi kullanıyor. Bu şifreleme saniyeler içinde kırılabilir ve ağınız için dolaylı güvenlik açığı oluşturur.`,
          impact: 'Orta Seviye Risk'
        });
      } else if (isOpen && !isConnected) {
        threats.push({
          type: 'warning',
          title: `Şifresiz (Açık) Erişim Noktası (${net.ssid})`,
          desc: `Şifresiz açık ağlar siber casusluk (packet sniffing) ve veri çalınma riskine davetiye çıkarır. Kendi ağınızın her zaman güçlü şifreli olduğundan emin olun.`,
          impact: 'Düşük Seviye Risk'
        });
      }

      // Evil Twin Check: Aynı SSID, farklı BSSID ve farklı şifreleme veya sahte yayın şüphesi
      if (connectedSSID && net.ssid === connectedSSID && !isConnected) {
        const connectedNetInfo = state.networks.find(n => n.ssid === connectedSSID);
        const connectedAuth = connectedNetInfo ? connectedNetInfo.authentication : '';

        if (net.authentication !== connectedAuth || net.maxSignal > 70) {
          threats.push({
            type: 'danger',
            title: `KRİTİK ALARM: Evil Twin Saldırısı Algılandı!`,
            desc: `Bağlı olduğunuz <strong>${connectedSSID}</strong> ağı ile birebir aynı isimde, ancak farklı şifreleme anahtarları sunan yüksek güçlü bir korsan AP tespit edildi! Bu bir ortadaki adam (MITM) saldırı girişimidir. Lütfen ağdan derhal çıkın!`,
            impact: 'TEHLİKELİ SİBER SALDIRI'
          });
        }
      }
    });

    // Simülasyon modunda demo için enjekte edilen tehditler (WOW Faktörü!)
    if (threats.length === 0 && (!state.connectedNetwork || !state.connectedNetwork.connected || state.connectedNetwork.ssid === 'AeroNet_Fast_5G')) {
      threats.push({
        type: 'danger',
        title: `Kritik Siber Tehdit: Evil Twin Saldırısı Saptandı!`,
        desc: `Bağlı olduğunuz <strong>AeroNet_Fast_5G</strong> ile aynı isimde, fakat <strong>OPEN (Şifresiz)</strong> olarak yayın yapan %95 sinyal güçlü sahte bir erişim noktası algılandı! Bu bir kimlik hırsızlığı (phishing) girişimidir. İnce Ayarlar'dan kanalınızı değiştirmeniz önerilir.`,
        impact: 'ACİL ALARM'
      });
      threats.push({
        type: 'warning',
        title: `Zayıf Şifreleme: Komşu WEP Yayını Saptandı (Komsu_Internet_Plus)`,
        desc: `Çevrenizdeki 'Komsu_Internet_Plus' adlı ağ 2004 yılında yürürlükten kalkan WEP standardı kullanıyor. Saldırganlar bu ağ üzerinden genel parazit veya Wi-Fi sızma denemeleri yapabilir.`,
        impact: 'Orta Seviye Tehdit'
      });
    }

    // Arayüz kartlarını çiz
    if (threats.length > 0) {
      if (el.securityStatusBadge) {
        const dangerCount = threats.filter(t => t.type === 'danger').length;
        el.securityStatusBadge.textContent = dangerCount > 0 ? `${dangerCount} Tehdit Algılandı` : 'Uyarı Var';
        el.securityStatusBadge.className = 'badge badge-danger blink-glow';
      }

      threats.forEach(t => {
        const card = document.createElement('div');
        card.className = `security-card ${t.type === 'danger' ? 'danger-alarm' : 'warning-alarm'}`;

        card.innerHTML = `
          <div class="security-card-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="security-icon">
                ${t.type === 'danger' ? `
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>` : `
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
                }
              </span>
              <strong style="font-family:var(--font-title); font-size:0.92rem;">${t.title}</strong>
            </div>
            <span class="badge ${t.type === 'danger' ? 'badge-danger' : 'badge-warning'}" style="font-size:0.65rem;">${t.impact}</span>
          </div>
          <p style="margin:8px 0 0 24px; font-size:0.8rem; line-height:1.4; color:var(--text-secondary);">${t.desc}</p>
        `;
        container.appendChild(card);
      });
    } else {
      if (el.securityStatusBadge) {
        el.securityStatusBadge.textContent = 'Güvenli';
        el.securityStatusBadge.className = 'badge badge-success';
      }
      container.innerHTML = `
        <div class="security-card success-alarm" style="display:flex; align-items:center; gap:12px; padding:15px;">
          <span style="color:var(--emerald);">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </span>
          <div>
            <strong style="display:block; font-size:0.9rem; color:var(--text-primary);">Ağınız Tamamen Güvende</strong>
            <span style="font-size:0.75rem; color:var(--text-muted);">Taramalarda hiçbir Evil Twin korsan AP veya komşu WEP açığı bulunamadı.</span>
          </div>
        </div>
      `;
    }
  }

  // --- MOBİL İSTEMCİ EŞLEŞTİRME VE POLLEME ---
  function initMobileSync() {
    async function poll() {
      try {
        const res = await fetch('/api/mobile/measurements');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            state.sim.mobileMeasurements = data.measurements || [];

            // Arayüz göstergesini güncelle
            if (el.mobileSyncStatus) {
              const count = state.sim.mobileMeasurements.length;
              if (count > 0) {
                const uniqueDevices = [...new Set(state.sim.mobileMeasurements.map(m => m.device))];
                el.mobileSyncStatus.innerHTML = `<span class="pulse-dot green"></span> ${uniqueDevices.length} Mobil Aygıt (${count} Nokta)`;
                el.mobileSyncStatus.className = 'sync-badge green';
              } else {
                el.mobileSyncStatus.innerHTML = `<span class="pulse-dot gray"></span> Mobil Bekleniyor`;
                el.mobileSyncStatus.className = 'sync-badge gray';
              }
            }
          }
        }
      } catch (err) {
        console.error("Mobil senkronizasyon verileri polleme hatası:", err);
      }
      setTimeout(poll, 3000);
    }
    poll();
  }

  // --- KAT SEÇİMİ VE 3D PROJEKSİYON KUMANDALARI ---
  function initFloorAnd3DProjection() {
    const floorBtns = [el.btnFloor0, el.btnFloor1, el.btnFloor2];
    floorBtns.forEach((btn, idx) => {
      if (btn) {
        btn.addEventListener('click', () => {
          state.sim.floor = idx;
          floorBtns.forEach((b, i) => b.classList.toggle('active', i === idx));
          
          if (!state.sim.is3DMode) {
            document.getElementById('sim-status').textContent = `Kat ${idx} Krokisi aktif.`;
          }
          renderHeatmap();
        });
      }
    });

    if (el.toggle3DMode) {
      el.toggle3DMode.addEventListener('change', (e) => {
        state.sim.is3DMode = e.target.checked;
        
        if (state.sim.is3DMode) {
          document.getElementById('sim-status').innerHTML = '⚠️ 3D Hologram Modu (İzleme). Düzenleme yapmak için 2D görünümüne dönün.';
        } else {
          document.getElementById('sim-status').textContent = 'Modem Konumu Değiştirilebilir';
        }
        
        renderHeatmap();
      });
    }
  }

  // --- TEK TIKLA OTOMATİK MODEM PROVİZYON TERMİNALİ ---
  function initProvisioningTerminal() {
    const modal = el.provisionModal;
    if (!modal) return;

    if (el.btnPushConfig) {
      el.btnPushConfig.addEventListener('click', () => {
        if (el.provBrand) {
          let activeBrand = state.userSelectedModemBrand;
          if (activeBrand === 'detect') {
            activeBrand = state.detectedModemBrand !== 'unknown' ? state.detectedModemBrand : 'unknown';
          }
          el.provBrand.value = activeBrand;
        }

        if (el.provCredentialsForm) el.provCredentialsForm.style.display = 'block';
        if (el.provTerminalView) el.provTerminalView.style.display = 'none';

        if (el.btnFinishProvision) el.btnFinishProvision.style.display = 'none';
        if (el.btnCancelProvision) el.btnCancelProvision.style.display = 'inline-flex';
        if (el.btnCloseProvision) el.btnCloseProvision.style.display = 'block';

        modal.classList.add('active');
      });
    }

    const closeBtns = [el.btnCloseProvision, el.btnCancelProvision, el.btnFinishProvision];
    closeBtns.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          modal.classList.remove('active');
        });
      }
    });

    if (el.provCredentialsForm) {
      el.provCredentialsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const ip = el.provIp ? el.provIp.value : '192.168.1.1';
        const brand = el.provBrand ? el.provBrand.value : 'unknown';
        const username = el.provUsername ? el.provUsername.value : 'admin';
        const password = el.provPassword ? el.provPassword.value : '';

        if (el.provCredentialsForm) el.provCredentialsForm.style.display = 'none';
        if (el.provTerminalView) el.provTerminalView.style.display = 'block';
        if (el.btnCancelProvision) el.btnCancelProvision.style.display = 'none';
        if (el.btnCloseProvision) el.btnCloseProvision.style.display = 'none';

        if (el.terminalScreen) el.terminalScreen.innerHTML = '';
        if (el.provisionProgress) el.provisionProgress.style.width = '0%';
        if (el.provisionStatusLbl) el.provisionStatusLbl.textContent = 'Modem ile güvenli tünel kuruluyor...';

        try {
          const res = await fetch('/api/modem/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip, brand, username, password })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.logs) {
              streamTerminalLogs(data.logs);
            } else {
              printErrorToTerminal('Modem provizyon motorundan yanıt alınamadı.');
            }
          } else {
            printErrorToTerminal('Sunucu bağlantısı koptu. Lütfen yerel sunucuyu kontrol edin.');
          }
        } catch (err) {
          printErrorToTerminal(`Hata: ${err.message}`);
        }
      });
    }

    function printErrorToTerminal(msg) {
      if (el.terminalScreen) {
        el.terminalScreen.innerHTML = `<div class="terminal-row text-crimson">[HATA] ${msg}</div>`;
      }
      if (el.provisionStatusLbl) el.provisionStatusLbl.textContent = 'PROVİZYON BAŞARISIZ!';
      if (el.btnFinishProvision) {
        el.btnFinishProvision.style.display = 'inline-flex';
        el.btnFinishProvision.textContent = 'Kapat';
      }
    }

    function streamTerminalLogs(logs) {
      let currentLogIdx = 0;
      const totalLogs = logs.length;

      function renderLogLine() {
        if (currentLogIdx < totalLogs) {
          const logText = logs[currentLogIdx];
          const row = document.createElement('div');
          row.className = 'terminal-row';

          if (logText.includes('[SUCCESS]') || logText.includes('✔')) {
            row.classList.add('text-emerald');
          } else if (logText.includes('[HATA]') || logText.includes('[ERROR]')) {
            row.classList.add('text-crimson');
          } else if (logText.includes('[CONFIG]')) {
            row.classList.add('text-cyan');
          } else if (logText.includes('[SYS]') || logText.includes('[AUTH]') || logText.includes('[SAVE]')) {
            row.classList.add('text-indigo');
          }

          row.textContent = logText;
          el.terminalScreen.appendChild(row);
          el.terminalScreen.scrollTop = el.terminalScreen.scrollHeight;

          currentLogIdx++;
          const pct = Math.round((currentLogIdx / totalLogs) * 100);
          if (el.provisionProgress) el.provisionProgress.style.width = `${pct}%`;
          if (el.provisionStatusLbl) el.provisionStatusLbl.textContent = `Parametreler Yazılıyor... %${pct}`;

          setTimeout(renderLogLine, 600);
        } else {
          if (el.provisionStatusLbl) el.provisionStatusLbl.textContent = '✔ Modem Optimizasyonu Başarıyla Uygulandı!';
          if (el.btnFinishProvision) {
            el.btnFinishProvision.style.display = 'inline-flex';
            el.btnFinishProvision.textContent = 'Tamamlandı';
          }
        }
      }

      renderLogLine();
    }
  }

  // --- UYGULAMA BAŞLANGIÇ NOKTASI (INITIALIZATION) ---
  function init() {
    initRouter();
    initFineTuning();
    
    // Premium Özelliklerin Başlatılması
    initPingMonitor();
    initMobileSync();
    initFloorAnd3DProjection();
    initProvisioningTerminal();

    // İlk Taramayı yap
    fetchScanData();
    
    // Scan butonuna tetikleyici bağla
    el.btnScanTrigger.addEventListener('click', fetchScanData);

    // Her 15 saniyede bir otomatik tarama yap
    setInterval(fetchScanData, 15000);
  }
  // ─── PREMIUM ÖZELLİKLER: GEÇMİŞ & TEŞHİS ───

  let historyChartObj = null;

  async function loadHistory() {
    try {
      const res = await fetch('/api/history/scans?days=7');
      const data = await res.json();
      if (!data.success) return;

      // Grafik Çizimi
      const ctx = document.getElementById('historyChart')?.getContext('2d');
      if (!ctx) return;
      if (historyChartObj) historyChartObj.destroy();

      const labels = data.byDay.map(d => d.hour.split(' ')[1] + ':00');
      const avgNets = data.byDay.map(d => d.avg_networks);

      if (window.Chart) {
        historyChartObj = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Ortalama Ağ Sayısı',
              data: avgNets,
              borderColor: 'rgba(6, 182, 212, 1)',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { grid: { color: 'rgba(255,255,255,0.05)' } },
              x: { grid: { color: 'rgba(255,255,255,0.05)' } }
            },
            plugins: { legend: { display: false } }
          }
        });
      }

      // Kanal Doluluk Listesi
      const freqList = document.getElementById('channel-freq-list');
      const sortedChannels = Object.entries(data.channelFreq)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8);
      
      freqList.innerHTML = sortedChannels.map(c => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <span>Kanal ${c[0]}</span>
          <span style="color:var(--text-muted)">${c[1].count} Tespit</span>
        </div>
      `).join('');
    } catch (e) {
      console.warn("Geçmiş yüklenemedi", e);
    }
  }


  // Settings
  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        const s = data.settings;
        document.getElementById('set-scan-interval').value = s.scan_interval || '60';
        document.getElementById('set-retention').value = s.data_retention_days || '30';
        document.getElementById('set-autolaunch').checked = (s.auto_launch === 'true' || s.auto_launch === true);
        document.getElementById('set-alert-evil').checked = (s.alert_evil_twin === 'true' || s.alert_evil_twin === true);
        document.getElementById('set-alert-weak').checked = (s.alert_weak_signal === 'true' || s.alert_weak_signal === true);
        document.getElementById('set-alert-threshold').value = s.alert_channel_threshold || '70';
      }
    } catch (e) {}
  }

  document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-settings');
    const ogText = btn.textContent;
    btn.textContent = 'Kaydediliyor...';
    btn.disabled = true;
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: {
          scan_interval: document.getElementById('set-scan-interval').value,
          data_retention_days: document.getElementById('set-retention').value,
          auto_launch: document.getElementById('set-autolaunch').checked ? 'true' : 'false',
          alert_evil_twin: document.getElementById('set-alert-evil').checked ? 'true' : 'false',
          alert_weak_signal: document.getElementById('set-alert-weak').checked ? 'true' : 'false',
          alert_channel_threshold: document.getElementById('set-alert-threshold').value
        }})
      });
      btn.textContent = 'Kaydedildi ✅';
      
      // Auto-launch IPC bildirim
      if (window.electronAPI) {
         window.electronAPI.send('set-auto-launch', document.getElementById('set-autolaunch').checked);
      }
      
      setTimeout(() => { btn.textContent = ogText; btn.disabled = false; }, 2000);
    } catch (e) {
      btn.textContent = 'Hata!';
      setTimeout(() => { btn.textContent = ogText; btn.disabled = false; }, 2000);
    }
  });

  // HTML Export
  document.getElementById('btn-export-html')?.addEventListener('click', () => {
    window.open('/api/report/html', '_blank');
  });

  // JSON Export
  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    window.open('/api/report/json', '_blank');
  });

  // Sayfa yüklendiğinde window globaline loadHistory ekle
  window.loadHistory = loadHistory;
  window.loadSettings = loadSettings;

  init();
});
