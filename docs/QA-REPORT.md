# Laporan QA / QC — Kayuh

**Tanggal:** 21 Nov 2026 · **Build:** v5.1 (Avatar Modular Kit, kalibrasi proporsi) · **Lingkungan uji:** Chromium (Playwright), iPhone 13 (390×844), layar 360×740, desktop 1440×900, tema terang & gelap.

**Hasil akhir: 88/88 pemeriksaan lolos** — `node scripts/qa.cjs` (butuh `npm run dev -- --port 5199`).

## Cakupan

| Area | Yang diuji |
|---|---|
| Onboarding | muncul untuk pengguna baru, nama, gaya hijab & warna kulit, target mingguan, "mulai bersih" mengosongkan data |
| Status kosong | 12 halaman dibuka tanpa data apa pun → tanpa crash / error boundary |
| Beranda | hero, cerita harian, bento, liga; tema gelap tersimpan setelah reload |
| Karakter | 14 tab lemari berisi; aturan hijab (rambut & anting disembunyikan, rambut baru melepas hijab); multi-pilih detail & "Tanpa"; item terkunci menolak + notifikasi; urungkan & acak; pencarian; unduh PNG; pratinjau ekspresi; semua gambar avatar termuat (0 × 404) |
| Squad | buat jadwal + undangan; link WA berisi data; geser 30 menit; RSVP; hapus via dialog; tab Teman & Liga |
| Undangan | teman membuka link → RSVP "Ikut" tersimpan; link rusak ditangani |
| Rute | template populer; tambah checkpoint tanpa batas lewat peta; ubah jenis/durasi/urutan/hapus; autosave; cari kafe (12 tempat nyata ditemukan); itinerary WA & Google Maps waypoints |
| Rekam | demo → simpan → cek rasa → detail; ride baru punya rasa/RPE/zona; ekspor GPX; hapus via dialog |
| Lainnya | pengingat (buat/hapus, ekspor .ics), rencana (racik/putar/proyeksi), titik temu (3 mode), paspor, garasi (reset), profil (nama tercermin), rute tak dikenal |
| QC global | 0 error JavaScript, 0 request 4xx/5xx |
| QC tata letak | 16 halaman tanpa scroll horizontal di 360 px |
| QC aksesibilitas | axe-core 16 halaman: 0 pelanggaran kritis/serius (terang & gelap) |

## Temuan & perbaikan

| # | Temuan | Tingkat | Status |
|---|---|---|---|
| 1 | Dialog (Sheet) baru tampil 1 frame setelah dibuka → tombol di belakang bisa tertekan dan dialog konfirmasi tertinggal menutupi layar | Tinggi | ✅ Diperbaiki — dialog dirender langsung |
| 2 | Anting **dihapus** saat hijab dipilih (seharusnya hanya disembunyikan, sesuai spesifikasi kit) | Sedang | ✅ Diperbaiki |
| 3 | Kontras teks abu-abu 3,2:1 (≈300 elemen) | Tinggi (a11y) | ✅ Token `--muted` → 5,5:1 (terang), 6:1 (gelap) |
| 4 | Teks putih di atas aksen `#ff4d1f` 3,3:1 | Tinggi (a11y) | ✅ Aksen → `#d93d14` (4,54:1), teks di kartu aksen putih penuh |
| 5 | Status hijau/kuning/merah & label kecil di kartu lime/cokelat kurang kontras | Sedang | ✅ Diperbaiki |
| 6 | Marker peta tanpa nama aksesibel (pembaca layar) | Sedang | ✅ Semua marker punya judul |
| 7 | Tile terkunci & stempel: label aksesibel tidak memuat teks yang terlihat | Rendah | ✅ Diperbaiki |
| 8 | Input nama/tanggal event & slider fase tanpa label | Sedang | ✅ Diperbaiki |
| 9 | Tidak ada heading level-1 di setiap halaman | Rendah | ✅ Judul halaman kini `<h1>` |
| 10 | Pratinjau rambut/hijab di lemari tertutup topi | Sedang (UX) | ✅ Pratinjau tanpa topi |
| 11 | Kepala di adegan balapan terpotong (hanya ubun-ubun) | Sedang (UX) | ✅ Dikalibrasi |
| 12 | Pin peta masih inisial, tidak konsisten dengan karakter | Rendah (UX) | ✅ Pin = kepala karakter |
| 13 | Teks "0 item masih terkunci" | Rendah | ✅ Diperbaiki |
| 14 | Proporsi kit: mata & alis terlalu besar dan menempel, mulut terlalu kecil & dekat dagu | Sedang (visual) | ✅ Dikalibrasi saat build (mata −12%, alis naik, mulut naik & +25%, kumis menyesuaikan) |
| 15 | **Manifest kit men-stretch gambar tidak proporsional**: baju melar ~1,5× ke samping (leher terlihat kecil), topi 1,26×, kumis 1,25×, detail 1,33×, headphone 2,7× | Tinggi (visual) | ✅ Rasio aspek asli dipertahankan, jangkar per kategori |
| 16 | Rambut terlalu besar (1,37× lebar tengkorak) | Sedang (visual) | ✅ Rambut 92% dijangkar di garis telinga, topi 94%, kepala 105% dari leher |
| 17 | Sport hijab 21–25 tidak menutup ubun-ubun | Sedang | ✅ Dinaikkan 10 px & 104% |
| 18 | 7 aset kit rusak (mulut 18/20/23/33 hanya garis 3–4 px; headphone leher 22–24 terpotong) | Tinggi | ✅ Dikeluarkan dari katalog; avatar tersimpan yang memakainya dimigrasi otomatis |

## Belum bisa diverifikasi otomatis (perlu uji perangkat nyata)
- GPS asli, getaran, deteksi jatuh (akselerometer), notifikasi sistem di iOS/Android.
- Data cuaca & jadwal sholat asli: di lingkungan uji, Open-Meteo terkena rate-limit sehingga app memakai data contoh (fallback berjalan).
- Overpass (pencarian tempat utama) tidak terjangkau di lingkungan uji; jalur cadangan Nominatim terbukti bekerja.

## Kinerja
- Bundle utama ~275 KB (gzip ~87 KB); halaman lain dimuat sesuai kebutuhan.
- Avatar: 505 bagian valid (dari 512) → WebP 4,2 MB total; satu avatar memuat ±7 file kecil. Build ulang: `python3 scripts/build-avatar-kit.py <folder kit>`.
