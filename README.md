# Kayuh — Analitik Sepeda & Gowes Bareng

Web app (PWA) untuk pesepeda. Gayanya terinspirasi board Pinterest "sepeda": estetika ala Nothing OS / Teenage Engineering, dengan latar abu hangat, angka dot-matrix, label monospace, aksen merah-oranye, dan dial bulat.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil di dist/, siap deploy ke Vercel/Netlify (static)
```

Semua data tersimpan di perangkat (localStorage). Saat pertama dibuka, app memuat **data contoh 4 bulan** supaya analitiknya langsung terlihat. Data ini bisa dimuat ulang atau dikosongkan di Profil.

## Fitur

| Area | Isi |
|---|---|
| **Beranda** | Km minggu ini vs target, streak, **Skor Kesiapan** (dari Fitness/Kelelahan), waktu terbaik gowes, gowes bareng berikutnya, level & lencana, status garasi |
| **Analitik** | Grafik jarak per minggu, **Fitness (CTL) vs Kelelahan (ATL)** ala TrainingPeaks tanpa power meter, kalender aktivitas dot-matrix, form harian, rekor pribadi, sebaran kecepatan |
| **Pelatih Kayuh** | Insight otomatis: peringatan lonjakan volume (aturan 10%), sisa km ke target, jam saat kamu paling kencang, tren fitness, saran tanjakan |
| **Rekam ride** | GPS live + peta, **pelatih suara Bahasa Indonesia** tiap km, pengingat minum (20 mnt) & makan (45 mnt), **deteksi jatuh** (akselerometer → hitung mundur 30 dtk → SOS WhatsApp + lokasi), bagikan lokasi, layar tetap menyala, mode demo |
| **Gowes Bareng** | Buat jadwal, undang teman, RSVP, **link undangan tanpa server** (data terkodekan di URL, langsung kirim ke grup WA), ekspor ke kalender dengan alarm H-12 jam & H-1 jam, **"kamu harus berangkat jam…"** dihitung dari jarak rumah, cuaca saat kumpul, mode **no-drop**, simulasi radar squad |
| **Titik Temu Adil** | Bukan sekadar titik tengah: algoritma **minimax** meminimalkan jarak terjauh, atau **adil-waktu** yang memperhitungkan kecepatan tiap orang. Skor keadilan, ETA per orang, lalu cari **minimarket/kafe/SPBU/taman nyata** di sekitar (OpenStreetMap) |
| **Teman & Liga** | Pace match (cocok-tidaknya kecepatan), peta rumah teman, liga km mingguan dengan podium |
| **Pengingat** | Jadwal mingguan, notifikasi browser, **ekspor .ics** (alarm tetap bunyi walau browser ditutup), saran pintar: alarm sebelum jendela cuaca terbaik, servis komponen aus, carbo-loading |
| **Cuaca gowes** | Skor per jam (hujan, suhu terasa, angin, UV, **AQI**), jendela terbaik 2 & 3 jam, **strategi angin** (berangkat lawan angin, pulang didorong angin) via Open-Meteo |
| **Garasi** | Odometer & umur komponen otomatis dari km ride (rantai, ban, kampas, sprocket, servis) |
| **Bagikan** | Kartu story 1080×1920 gaya dot-matrix (PNG), ekspor GPX ke Strava/Garmin |
| **Dampak** | CO₂ dihemat vs motor, rupiah dihemat dari commute, kalori → "piring nasi goreng" |

## Struktur

```
src/
  lib/        types, store (zustand+persist), analytics (TSS/CTL/ATL), geo (titik temu adil),
              weather (skor & jendela), notify, ics, share (undangan via URL), places (Overpass)
  charts/     grafik SVG buatan sendiri (bar, garis, heatmap dot, dial, elevasi, skor jam)
  components/ Map (Leaflet + OSM), UI (sheet, toast, toggle, tabs)
  pages/      Home, Record, Squad, SquadDetail, Meet, Reminders, Weather, Garage, Profile,
              RideDetail, Rides, Insights, Join
```

## Roadmap (butuh backend)

1. **Live squad sungguhan**: posisi real-time antar HP (Supabase Realtime / Firebase), alarm no-drop otomatis.
2. **Akun & sinkron**: login, data lintas perangkat, RSVP dua arah.
3. **Integrasi Strava / Garmin / sensor BLE** (detak jantung, cadence, power lewat Web Bluetooth).
4. **Rute pintar**: rute aman sepeda (hindari jalan arteri) + profil elevasi sebelum berangkat.
5. **Peta bahaya komunitas**: lubang, banjir, begal-prone. Dilaporkan pengguna, muncul sebagai peringatan saat rekam.
6. **Pengingat push server-side** (Web Push), supaya tidak bergantung pada tab terbuka.
