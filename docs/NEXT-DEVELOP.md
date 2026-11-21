# Kayuh — Rencana Pengembangan Berikutnya

Strategi: **jangan melawan Strava di jejaring sosial & segmen global.** Menang di *gowes bareng*, *konteks lokal Indonesia*, *fitur yang di Strava berbayar*, dan **bisa impor dari Strava** sehingga pengguna tidak perlu memilih.

Aturan kerja: dibangun **satu per satu**, **verifikasi/QA sekali di akhir** (hemat token), dan semua fitur mengikuti arahan desain di bawah.

---

## 0. Arahan desain — tenang, tidak overstimulated

Masalah saat ini: terlalu banyak kartu berwarna, animasi, marquee, confetti, dan angka besar di satu layar.

- **Satu fokus per layar.** Beranda menampilkan 1 hal utama (ringkasan minggu ini + aksi berikutnya); sisanya bisa digulir atau dibuka.
- **Warna aksen hemat.** Oranye hanya untuk 1 aksi utama per layar + data penting. Kartu lain netral (putih/abu). Maksimal 1 kartu berwarna penuh per layar.
- **Hierarki tipografi.** Angka dot-matrix hanya untuk 1 angka utama per layar. Label kecil cukup 1 gaya (mono).
- **Animasi seperlunya.** Matikan marquee LED, kurangi confetti (hanya untuk pencapaian besar), transisi ≤ 250 ms, hormati `prefers-reduced-motion`. Tambah opsi "Mode tenang" di Profil.
- **Kepadatan.** Jarak antarkartu lebih lega (16–20 px), maksimal 3–4 kartu terlihat tanpa menggulir.
- **Progressive disclosure.** Analitik lanjutan dipindah ke halaman Analisis dengan tab (Ringkas · Latihan · Kesehatan · Squad).
- **Ikon & ilustrasi.** Satu gaya ikon (garis), karakter hanya di tempat yang bermakna (kartu karakter, daftar teman, peta).

Deliverable: audit tiap halaman → versi tenang; token baru `--surface-quiet`, skala spasi 4/8/12/16/24/32; komponen `Section` dengan judul + "Lihat semua".

---

## 1. Analitik khas Indonesia (tanpa akun eksternal)

### 1a. Dosis polusi
- Input: AQI/PM2.5 per jam (Open-Meteo Air Quality, sudah dipakai), durasi & intensitas ride.
- Model: ventilasi menit (L/menit) dari zona intensitas (Z1 ≈ 20, Z2 ≈ 35, Z3 ≈ 50, Z4 ≈ 70, Z5 ≈ 90) × PM2.5 (µg/m³) × durasi → **dosis µg**; bandingkan dengan "setara batang rokok" (≈ 22 µg PM2.5/hari setara 1 batang) — tampilkan dengan hati-hati, bukan menakut-nakuti.
- Fitur: grafik dosis per ride & per minggu, **saran jam & rute lebih bersih** (pakai jendela cuaca yang sudah ada + bobot AQI), badge "Paru-paru Bersih".
- UI: kartu tenang di detail ride + tab Kesehatan.

### 1b. Panas, kelembapan & keringat
- Heat index dari suhu + kelembapan (Open-Meteo `relative_humidity_2m`).
- **Performa disesuaikan panas:** koreksi kecepatan/usaha (mis. +1,5% per °C di atas 25 °C heat index) → "Kecepatan setara sejuk".
- **Estimasi keringat (ml/jam)** dari berat, intensitas, heat index → rekomendasi bidon & elektrolit sebelum ride (masuk ke perencana rute & pengingat).

### 1c. Usaha disesuaikan angin
- Arah ride per segmen (bearing dari jejak) vs angin per jam (arsip Open-Meteo) → komponen angin depan/belakang.
- Output: "Melawan angin rata-rata 12 km/j, setara +2,1 km/j di kondisi tenang".

## 2. Analitik kualitas latihan

### 2a. Pustaka tanjakan pribadi (pengganti segmen)
- Deteksi otomatis: gradien rata-rata ≥ 3% sepanjang ≥ 500 m dari profil elevasi.
- Pencocokan tanjakan yang sama antar ride (start/end dalam radius 60 m).
- Per tanjakan: rekor, VAM (m/jam), gradien, kategori (Kat 4 → HC), grafik progres.
- Tanpa leaderboard global (privasi); opsi papan squad nanti (butuh server).

### 2b. Kurva daya estimasi & daya tahan
- Watt terbaik 1/5/20/60 menit dari estimasi fisika per segmen; tren 90 hari.
- **Durability:** penurunan daya/kecepatan di jam terakhir ride > 2 jam.

### 2c. Risiko cedera (ACWR)
- Rasio beban akut 7 hari / kronis 28 hari. Zona aman 0,8–1,3; peringatan > 1,5.
- Kartu di Analisis + notifikasi lembut di Beranda bila merah.

### 2d. Analisis pacing
- Split per 10% jarak, negative/positive split, saran: "Terlalu kencang di 20 km pertama".

### 2e. Cek pagi 10 detik
- 3 pertanyaan (tidur, pegal, mood) → memperbaiki skor kesiapan. Pengingat pagi opsional.

### 2f. Sensor Bluetooth (Web Bluetooth)
- Heart Rate (0x180D), Cycling Speed & Cadence (0x1816), Cycling Power (0x1818) saat merekam.
- Catatan: hanya Chrome Android/desktop; iOS Safari tidak mendukung — tampilkan pesan jelas.

## 3. Sosial & cerita
- **Kekompakan squad:** siapa paling sering bareng, kecepatan grup, siapa sering tertinggal.
- **Kayuh Wrapped:** rekap tahunan gaya Spotify (km, tanjakan, kafe favorit, teman tersering, karakter) → kartu IG Story 1080×1920.

## 4. Integrasi (butuh akun dari pemilik)

### 4a. Impor Strava / Garmin / GPX / FIT  — prioritas 1
- GPX/FIT: unggah file (FIT dibaca dengan parser JS).
- Strava: OAuth (butuh *Client ID* dari strava.com/settings/api), impor aktivitas + stream (latlng, altitude, heartrate, cadence, watts).
- Dedup berdasarkan waktu mulai ± 2 menit.

### 4b. Supabase — prioritas 2
- Auth (email magic link / Google), backup data lokal → cloud, sinkron lintas perangkat.
- Tabel: profiles, rides, group_rides, rsvps, votes, routes, checkpoints, hazards, cafes, stamps.
- **RSVP dua arah**, **voting coffee break**, **liga squad nyata**, **radar posisi real-time** (Realtime channel per gowes bareng), notifikasi push (Web Push).
- Row Level Security wajib; data lokasi live hanya untuk anggota grup & kedaluwarsa setelah ride.

## 5. Pembeda lokal
- **Rute sepeda + KRL/MRT** untuk sepeda lipat (stasiun terdekat, jam kereta, aturan sepeda lipat).
- **Kalender CFD per kota** (Jakarta, Bandung, Surabaya, Yogyakarta…) → saran gowes Minggu pagi.
- **Peta rawan komunitas:** lubang, banjir, rawan begal, jalur aman (butuh Supabase); muncul di rute & saat merekam.
- **Kafe ramah sepeda terverifikasi** (parkir sepeda, isi bidon, colokan) + stempel paspor merchant.
- **Booking servis bengkel** dari pengingat aus komponen di Garasi.
- **Pendaftaran event komunitas** (gran fondo, fun ride).
- **Kartu darurat** (golongan darah, kontak, alergi) yang bisa dibuka dari layar kunci (shortcut PWA).

## 6. Avatar
- Keputusan generator avatar baru (lihat riset di percakapan). Setelah dipilih: adaptasi tipe `CharConfig`, migrasi data, ekspresi mood, item terkunci, ekspor PNG.

---

## Urutan eksekusi

| # | Item | Butuh dari pemilik | Estimasi |
|---|---|---|---|
| 1 | Arahan desain tenang (audit semua halaman) | — | besar |
| 2 | Dosis polusi + panas/keringat + angin | — | sedang |
| 3 | Pustaka tanjakan + ACWR + pacing + kurva daya | — | sedang |
| 4 | Impor GPX/FIT → Strava OAuth | Client ID Strava | sedang |
| 5 | Supabase (auth, backup, RSVP, voting, radar) | Project URL + anon key | besar |
| 6 | Peta rawan + kafe terverifikasi | Supabase | sedang |
| 7 | KRL/MRT, CFD, Wrapped, sensor Bluetooth, cek pagi | data jadwal kereta (opsional) | sedang |

Verifikasi: satu putaran `npm run qa` + tes perangkat nyata setelah semua item selesai; laporan diperbarui di `docs/QA-REPORT.md`.
