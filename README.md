<div align="center">

<img src="assets/icon.png" width="160" alt="AeroNet Logo">

# 🚀 AeroNet Wi-Fi Optimizer

**Akıllı, Yerel ve Profesyonel Ağ Optimizasyon & Teşhis Aracı**

<br/>

[![Version](https://img.shields.io/badge/Versiyon-2.0.0-blue.svg?style=for-the-badge&color=06b6d4&logo=aer-lingus)](#)
[![Windows](https://img.shields.io/badge/Platform-Windows-lightgrey.svg?style=for-the-badge&logo=windows&color=0f172a)](#)
[![Electron](https://img.shields.io/badge/Altyapı-Electron-darkblue.svg?style=for-the-badge&logo=electron&color=4f46e5)](#)
[![License](https://img.shields.io/badge/Lisans-MIT-green.svg?style=for-the-badge&color=10b981)](#)

<br/>

> *AeroNet, profesyonel ağ analizi yapan, kanal çakışmalarını tespit eden ve fiziksel engelleri hesaplayarak size en uygun modem ayarlarını sunan tam donanımlı bir **Windows Masaüstü** uygulamasıdır.*

</div>

---

### 💎 "Glassmorphism" Arayüzü
Geleneksel, sıkıcı ağ teşhis araçlarını unutun. AeroNet, verileri okumayı kolaylaştıran saydam katmanlar, bulanık cam efektleri (blur) ve zarif iç gölgelerden oluşan "Premium" bir arayüze sahiptir. Sadece sorunları çözmekle kalmaz, bunu görsel bir şölene dönüştürür.

<br/>

## ✨ Öne Çıkan Özellikler

> **Tamamen Yerel:** Verileriniz asla buluta gitmez. Tüm analizleriniz ve geçmiş veri tabanınız bilgisayarınızın derinliklerinde, güvenle saklanır.

| Özellik | Detaylar |
| :--- | :--- |
| 📡 **Canlı Spektrum Analizi** | Çevrenizdeki tüm Wi-Fi ağlarını (2.4GHz & 5GHz) tarar, kanal doluluk oranlarını yapay zeka destekli algoritmayla puanlar. |
| 🗺️ **İnteraktif Isı Haritası** | Evinizin krokisini çizin, modeminizi yerleştirin ve beton/alçıpan duvarlardan geçen sinyalin simülasyonunu anında görün. |
| 🧠 **İnce Ayar Hesaplayıcı** | Oyun, Akıllı Ev veya Dengeli senaryolarına göre *RTS Threshold*, *Beacon Interval* ve *DTIM* ayarlarınızı optimize eder. |
| 📊 **Geçmiş & Trend Analizi** | Dahili NoSQL (NeDB) veritabanı ile son 7 güne ait Wi-Fi kanal doluluk trendlerini şık grafiklerle izleyin. |
| ⚠️ **Akıllı Uyarı Sistemi** | Ağınızda olası bir **Evil Twin (Şeytani İkiz)** saldırısı tespit edilirse Windows bildirim merkezinden anında uyarılırsınız. |

<br/>

## 🚀 Kurulum & Çalıştırma

### 🔌 Hızlı Başlangıç (Bağımsız Kullanım)
Teknik detaylarla uğraşmak istemiyorsanız, sadece tek tıkla çalıştırabilirsiniz. Kurulum gerektirmez!
1. **[Releases](#)** sayfamıza gidin.
2. En güncel `AeroNet-WiFi-Optimizer-Portable.exe` dosyasını indirin.
3. Çift tıklayın ve optimizasyona başlayın!

### 💻 Geliştirici Ortamı Kurulumu
Kaynak kodunu derlemek ve kendi sürümünüzü oluşturmak isterseniz:

```bash
# Projeyi klonlayın
git clone https://github.com/projectfkali/aeronet.git

# Klasöre girin
cd aeronet

# Bağımlılıkları yükleyin
npm install

# Geliştirici modunda başlatın
npm start

# Windows için kendi bağımsız .exe'nizi paketleyin
npm run dist
```

<br/>

## 🛠️ Mimari & Teknolojiler
Bu proje, modern web teknolojilerinin gücünü yerel işletim sistemi yetenekleriyle birleştiren hibrit bir altyapıya sahiptir.

*   ⚡ **Electron:** Native pencereli Windows masaüstü deneyimi.
*   🟢 **Node.js:** Arka plan işlemleri, TCP/UDP analizleri ve ağ taramaları (`netsh wlan`).
*   🗄️ **NeDB:** Yerel, hafif ve son derece hızlı JSON tabanlı NoSQL veritabanı.
*   🎨 **Vanilla JS & Özel CSS:** Herhangi bir ağır framework olmadan saf performans ve özel "Glassmorphic" mimari.
*   📈 **Chart.js:** Dinamik veri trendlerinin kusursuz görselleştirmesi.

<br/>

## 🤝 Katkıda Bulunun

AeroNet gücünü topluluktan alır. Kod tabanını inceleyin, özellikleri test edin ve gelişmesine yardımcı olun!

1. Bu projeyi **Fork**'layın.
2. Kendinize yeni bir dal oluşturun: `git checkout -b ozellik/YeniFikriniz`
3. Değişikliklerinizi işleyin: `git commit -m 'Harika bir özellik ekledim'`
4. Değişiklikleri gönderin: `git push origin ozellik/YeniFikriniz`
5. Bir **Pull Request (PR)** açın!

<br/>

## 📜 Lisans & Telif
Bu proje **[MIT Lisansı](LICENSE)** ile güvence altına alınmıştır. Dilediğiniz gibi kullanabilir, değiştirebilir ve dağıtabilirsiniz. Daha fazla detay için LICENSE dosyasına göz atın.

