# Kayuh — Analitik Sepeda & Gowes Bareng

Web app (PWA) untuk pesepeda. Gayanya terinspirasi board Pinterest "sepeda": estetika ala Nothing OS / Teenage Engineering, dengan latar abu hangat, angka dot-matrix, label monospace, aksen merah-oranye, dan dial bulat.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil di dist/, siap deploy ke Vercel/Netlify (static)
```

Semua data tersimpan di perangkat (localStorage). Saat pertama dibuka, app memuat **data contoh 4 bulan** supaya analitiknya langsung terlihat. Data ini bisa dimuat ulang atau dikosongkan di Profil.

## Yang baru di v3

- **Rute, checkpoint & coffee break.** Tambah checkpoint sebanyak apa pun (ketuk peta, seret untuk geser). Rute dihitung **mengikuti jalan sepeda** (OSRM/OpenStreetMap), dengan **ETA tiap checkpoint**, durasi rehat, dan jam finish.
  - **Coffee break**: tiap checkpoint bisa mencari **kafe, kedai kopi, tempat makan, minimarket, masjid, bengkel sepeda, atau air/toilet** terdekat. Pilih, dan checkpoint pindah ke tempat itu lalu rute dihitung ulang. Data dari Overpass, dengan cadangan Nominatim.
  - **Alat pintar**: coffee break otomatis di tengah rute (langsung memilih kafe terbaik), checkpoint otomatis tiap X km, dan **pengingat waktu sholat** (jadwal Kemenag) yang menyarankan checkpoint masjid tepat saat waktunya tiba.
  - **Patungan** tagihan coffee break, **itinerary ke grup WA**, **Google Maps dengan semua waypoint**, rute tersimpan & bisa dijadikan gowes bareng. Checkpoint ikut terbawa di link undangan.
  - Saat **merekam ride**, bisa mengikuti rute: kartu "checkpoint berikutnya" + notifikasi suara saat tiba.
- **Karakter hanya potret & kepala bulat.** Tidak ada lagi ilustrasi bersepeda. Ada kartu koleksi dengan efek miring + kilau holografik, orb holografik ala Air OS, stiker ekspresi, dan balapan squad pakai kepala bulat.
- **UI:** transisi halaman (View Transitions), cerita harian yang bisa digeser, marquee LED dot-matrix, angka yang berhitung naik, indikator navigasi yang bergeser, tekstur grain, dan umpan balik sentuh.

## Yang baru di v2 (diterjemahkan dari board referensi)

| Referensi | Jadi fitur |
|---|---|
| Paladin RPG + avatar builder "Humation" | **Karakter pesepeda doodle**: rambut (termasuk hijab), helm/cap/mahkota, kacamata, jersey (polkadot KOM, parang), aksesori, 4 jenis sepeda. Item langka terbuka lewat level/lencana. **Kelas RPG dari data** (Kambing Gunung, Sprinter Kilat, Penjelajah, Komuter Baja, Kapten Squad) + 5 stat, quest mingguan untuk stat terlemah, mood karakter mengikuti kesiapan tubuhmu, unduh PNG |
| Lomba langkah "Family" | **Adegan balapan squad** beranimasi: karakter teman mengayuh di jalan, posisinya sesuai km mingguan |
| Beat sequencer "Simple Beat" | **Rencana latihan bergaya sequencer** (5 lane × 14 hari), bisa *diputar* sebagai bunyi, **proyeksi Fitness/Form 3 minggu** dan prediksi Form di hari H event |
| Dial "Drive mode" + throttle | **Kenop racik** (volume, intensitas, long ride, istirahat) + fase Base/Build/Taper → rencana 2 minggu otomatis |
| Pola tidur dot-matrix | **Timeline zona intensitas** tiap ride (Z5 oranye di bawah seperti tidur dalam) |
| Feedback "GOOD" lime | **Cek rasa setelah ride**: wajah yang berubah ekspresi + RPE → **titik manis pribadi** (rentang Form saat kamu paling menikmati ride) |
| Kyugo "Your morning" | **Jam radial 24 jam** (terang, jendela cuaca terbaik, pengingat, gowes bareng) + **kartu merah aksi cepat**: aku telat 5/15/30 menit (pesan WA dengan ETA), geser 30 menit, batal, ajak |
| Alarm kuning | **Pemilih jam kuning** besar dengan angka bayangan, tinggal geser |
| CMF Watch | Beranda bento: angka dot-matrix raksasa, pie progres, kartu Latihan oranye, pil Kesiapan/Form, Daya, Pemulihan |
| Notifikasi dynamic island | Semua notifikasi in-app tampil sebagai pil hitam ala dynamic island |

**Analitik baru:** estimasi **watt & FTP tanpa power meter** (fisika gulir + aero + gravitasi) dengan kategori W/kg, **cek 80/20** (distribusi intensitas), **efisiensi aerobik** (km/j per detak), **prediksi waktu** 50/100/160 km (Riegel), **jam emas** radial, **perkiraan jam pemulihan**, titik manis rasa vs form.

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
  components/ Character (karakter doodle SVG prosedural, adegan balapan, wajah rasa), FeelCheck, GroupActions
  pages/      Home, Character, Plan, Record, Squad, SquadDetail, Meet, Reminders, Weather, Garage,
              Profile, RideDetail, Rides, Insights, Join
```

## Roadmap (butuh backend)

1. **Live squad sungguhan**: posisi real-time antar HP (Supabase Realtime / Firebase), alarm no-drop otomatis.
2. **Akun & sinkron**: login, data lintas perangkat, RSVP dua arah.
3. **Integrasi Strava / Garmin / sensor BLE** (detak jantung, cadence, power lewat Web Bluetooth).
4. **Rute pintar**: rute aman sepeda (hindari jalan arteri) + profil elevasi sebelum berangkat.
5. **Peta bahaya komunitas**: lubang, banjir, begal-prone. Dilaporkan pengguna, muncul sebagai peringatan saat rekam.
6. **Pengingat push server-side** (Web Push), supaya tidak bergantung pada tab terbuka.
