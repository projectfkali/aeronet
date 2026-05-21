<div align="center">
  <img src="assets/icon.png" width="128" alt="AeroNet Logo">
  
  <h1>AeroNet Wi-Fi Optimizer 🚀</h1>
  <p><strong>Akıllı, Yerel ve Profesyonel Wi-Fi Ağ Optimizasyon Aracı</strong></p>

  <p>
    <a href="https://github.com/merta/AeroNet/releases"><img src="https://img.shields.io/badge/Versiyon-2.0.0-blue.svg?style=for-the-badge&color=06b6d4" alt="Version"></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Platform-Windows-lightgrey.svg?style=for-the-badge&logo=windows&color=0f172a" alt="Windows"></a>
    <a href="https://electronjs.org/"><img src="https://img.shields.io/badge/Electron-Desktop-darkblue.svg?style=for-the-badge&logo=electron&color=4f46e5" alt="Electron"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/Lisans-MIT-green.svg?style=for-the-badge&color=10b981" alt="License"></a>
  </p>
</div>

---

AeroNet, profesyonel ağ analizi yapan, kanal çakışmalarını tespit eden ve fiziksel engelleri hesaplayarak size en uygun modem ayarlarını sunan bağımsız bir **Windows Masaüstü** (Electron) uygulamasıdır.

Premium "Glassmorphism" tasarımıyla ağ verilerini okumayı sadece kolaylaştırmakla kalmaz, aynı zamanda görsel bir şölene dönüştürür.

<div align="center">
  <img src="https://via.placeholder.com/800x450/0f172a/06b6d4?text=AeroNet+Ana+Ekran+G%C3%B6r%C3%BCnt%C3%BCs%C3%BC+Buraya" alt="AeroNet Ekran Görüntüsü" style="border-radius: 12px; border: 1px solid rgba(255,255,255,0.1)">
</div>

## ✨ Öne Çıkan Özellikler

*   📡 **Canlı Spektrum Analizi:** Çevrenizdeki tüm Wi-Fi ağlarını (2.4GHz & 5GHz) tarar, kanal doluluk oranlarını puanlar.
*   🗺️ **İnteraktif Isı Haritası (Heatmap):** Evinizin krokisini çizip modeminizi yerleştirerek beton, cam veya alçıpan duvarlardan geçen sinyalin simülasyonunu yapın.
*   🧠 **İnce Ayar Hesaplayıcı:** Kullanım senaryonuza (Oyun, Akıllı Ev, Dengeli) ve fiziksel ağınıza göre RTS Threshold, Beacon Interval ve DTIM ayarlarını hesaplar.
*   📊 **Geçmiş & Trend Veritabanı:** Dahili veri tabanı sayesinde son 7 güne ait Wi-Fi kanalı kullanım trendlerini izler.
*   ⚠️ **Akıllı Uyarı Sistemi:** Ağınızda potansiyel bir *Evil Twin* (Şeytani İkiz) saldırısı tespit edilirse veya sinyal gücünüz çok düşerse Windows üzerinden anında bildirim alırsınız.
*   💾 **Tamamen Yerel:** Verileriniz buluta gitmez, tüm analizler ve geçmiş veritabanı kendi bilgisayarınızda (`~/.aeronet/`) barındırılır.

## 🚀 Kurulum & Çalıştırma

### Bağımsız Kullanım (.exe)
Eğer doğrudan uygulamayı kullanmak istiyorsanız, **[Releases](#)** sayfasından en güncel `AeroNet-WiFi-Optimizer-Portable.exe` dosyasını indirip çalıştırabilirsiniz. Kurulum gerektirmez!

### Geliştirici Ortamı Kurulumu
Kaynak kodundan derlemek isterseniz:

```bash
# Projeyi klonlayın
git clone https://github.com/kullaniciadiniz/AeroNet.git

# Klasöre girin
cd AeroNet

# Gerekli kütüphaneleri yükleyin
npm install

# Geliştirme modunda başlatın
npm start

# Kendi .exe dosyanızı oluşturun
npm run dist
```

## 🛠️ Teknolojiler
*   **Electron:** Native Windows masaüstü entegrasyonu.
*   **Node.js:** Arka plan işlemleri ve ağ taramaları (`netsh wlan`).
*   **NeDB:** Yerel, hafif, JSON tabanlı NoSQL veritabanı.
*   **Vanilla JS & CSS:** Framework bağımsız, saf performans ve özel "Glassmorphic" CSS tasarımı.
*   **Chart.js:** Dinamik ve interaktif veri görselleştirmesi.

## 🤝 Katkıda Bulunun
AeroNet tamamen açık kaynaklıdır. Özellik istekleri, hata bildirimleri veya yeni modül fikirleri için lütfen [Issues](#) bölümünü kullanın veya Pull Request gönderin.

1. Projeyi Fork'layın
2. Yeni bir dal (branch) oluşturun (`git checkout -b ozellik/YeniHarikaOzellik`)
3. Değişikliklerinizi commit'leyin (`git commit -m 'Yeni harika özellik eklendi'`)
4. Dalınıza push'layın (`git push origin ozellik/YeniHarikaOzellik`)
5. Bir Pull Request açın!

## 📜 Lisans
Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır. Detaylar için LICENSE dosyasına göz atabilirsiniz.

---
<div align="center">
  <sub><a href="https://github.com/kullaniciadiniz">Kullanıcı Adınız</a> tarafından ❤️ ile geliştirildi.</sub>
</div>
