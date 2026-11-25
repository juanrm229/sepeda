# PACK — Ride as one.

**Live:** https://pack-ride.vercel.app

**Stop riding alone.** PACK adalah PWA untuk pesepeda yang fokus ke **ketemuan**:
- ajak squad dalam 10 detik dan cocokkan jadwal;
- cari titik temu yang adil, lalu atur checkpoint & ngopi;
- titip kopi ke satu orang;
- tagih patungan dengan rekening otomatis.

Semuanya **tanpa akun dan tanpa server**.

Positioning: Strava merekam kamu sendirian, PACK mengumpulkan rombongan. Analisis ride tetap ada, tapi nanti masuk lewat share dari Strava.

Desain "Soft Mono" diterjemahkan dari board Pinterest *sepeda 2*. Logo: huruf **P** yang lengkungnya pin lokasi, dengan titik oranye sebagai titik kumpul. Karakter (DiceBear Lorelei) dipertahankan.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil di dist/, siap deploy ke Vercel/Netlify (static)
npm run dev:api  # API lokal (akun & sinkron) di :8787, di-proxy Vite
npm run qa       # suite QA end-to-end (butuh dev + dev:api)
```

Semua data tersimpan di perangkat (localStorage). Saat pertama dibuka, app memuat data contoh.

## Yang baru di v8 — akun & login

Detail lengkap ada di [`docs/PACK-v8.md`](docs/PACK-v8.md).

- **Akun**: daftar/masuk dengan email + password. Data tersinkron otomatis antar-HP; keluar lalu masuk lagi memulihkan semuanya.
- **Teman lewat @username / link profil**. Ajakan **langsung masuk ke app teman**, dan jawabannya **langsung terkirim ke host** tanpa WhatsApp. Tamu tanpa akun tetap bisa menjawab lewat link.
- **Onboarding baru ala DailyLoop**: kartu melayang, kartu sambutan putih, lalu karakter → @username & lokasi → waktu free → rekening.
- **Tampilan lebih dekat referensi**:
  - Beranda: sapaan dengan serif miring, kartu hari, kartu hitam ber-avatar dengan dua pil aksi, kartu pelacakan, checklist mulai.
  - Agenda: cari + filter, segmented, grup per hari.
  - Nav dengan pil putih.
- **Backend**: `api/pack.ts` (Vercel Function) di atas Vercel Blob terenkripsi AES-256-GCM. Pengembangan lokal: `npm run dev:api`.

## Yang baru di v7 — PACK

Detail lengkap ada di [`docs/PACK-v7.md`](docs/PACK-v7.md).

- **Brand baru PACK**: logo P-pin, wordmark, ikon PWA (termasuk maskable), dan gambar OG.
- **Titip pesanan**: semua nitip ke satu orang yang memesan & menalangi. Tamu bisa nitip langsung dari link undangan. Ada ringkasan untuk barista ("2× es kopi susu").
- **Foto menu kafe**: difoto sekali, disimpan per tempat (IndexedDB, dikompres), dan dilihat lagi sebelum pesan setiap kali ngopi di sana. Ada lightbox zoom/geser.
- **Rekening & e-wallet di app**: ikut otomatis di undangan & tagihan, jadi tidak perlu kirim nomor rekening ke grup berulang kali. Ada tombol salin.
- **Patungan / catatan utang**: tagih otomatis dari titipan, saldo per teman, tagih via WA plus rekening, tandai lunas, catat manual, dan giliran traktir.
- **Kopi Sinkron**: beda pace tapi tiba bareng di kedai kopi (jam start berbeda atau putaran bonus).
- **Papan kedatangan hari-H & "Pulang aman"**: status OTW, tiba, dan sampai rumah lewat link balasan.
- **Link jadwal free**: jadwal teman masuk ke *Kapan semua bisa?*. Juga: **QR undangan**, **titik kumpul ulang no-drop** tiap 10 km, **saran geser jam karena hujan**, dan **"kangen gowes bareng"**.
- **Animasi**:
  - kurva pegas, indikator nav yang meluncur, FAB berubah jadi ×;
  - sheet bisa ditarik ke bawah untuk ditutup;
  - catatan undangan bisa digeser untuk Ikut/Skip;
  - avatar mengorbit lalu berkumpul, logo tergambar, stepper terisi bertahap;
  - header ringkas saat digulir, transisi halaman berarah;
  - semuanya menghormati `prefers-reduced-motion`.

## Yang baru di v6 — rombak total

Detail lengkap (audit desain, analisis fitur, dan inovasi berikutnya) ada di [`docs/ROMBAK-v6.md`](docs/ROMBAK-v6.md).

- **Navigasi baru:** Hari ini · Agenda · Ketemu · Ngopi + FAB **Ajak gowes**. Analisis pindah ke "Analisis · nanti".
- **Ajak gowes 6 langkah** (satu pertanyaan per layar): saran slot emas, voting ≤ 3 jam, tag *Free* per teman, titik kumpul adil/dekat/tempat nyata, voting ≤ 3 kafe, pratinjau catatan tempel, kirim ke WhatsApp.
- **RSVP dua arah tanpa server:** teman membalas lewat *link balasan*. Saat host mengetuknya, RSVP, vote, catatan, karakter, dan titik berangkat (±1 km, opsional) otomatis masuk.
- **Detail ajakan ala pelacakan paket:** stepper Kumpul → Ngopi → Finish, timeline checkpoint dengan **check-in** + "Kabari grup", voting + *Tetapkan*, colek yang belum jawab, jadwal untuk keluarga.
- **Titik temu 4 mode:** Adil, Waktu, **Searah tujuan** (median geometris ke kedai kopi), **Jemput berantai** (yang terjauh menjemput yang searah, jam berangkat dihitung mundur).
- **Kapan semua bisa?** Waktu luang mingguan × cuaca 7 hari → slot emas → satu ketuk ke Ajak.
- **Undangan bisa dibuka di HP baru** tanpa onboarding (cukup isi nama).

## Yang baru di v5 — Avatar Modular Kit & QA

- **Avatar profil memakai [DiceBear Lorelei](https://www.dicebear.com/styles/lorelei/)** (desain Lisa Wischofsky, CC0; kode MIT): 4 bentuk wajah, 48 rambut, 24 mata, 13 alis, 27 mulut, 6 hidung, 5 kacamata, 3 anting, 2 janggut, bintik, bunga rambut, warna kulit/rambut/aksesori bebas. SVG vektor offline tanpa file gambar. Ekspresi mengikuti mood, sebagian warna & aksesori terbuka lewat level/lencana. Avatar versi lama dimigrasi otomatis (warna kulit & rambut dipertahankan).
- **QA/QC menyeluruh**: `npm run qa` menjalankan 88 pemeriksaan (fungsi, status kosong, aksesibilitas axe-core, tata letak 360 px, error & 404). Laporan: [`docs/QA-REPORT.md`](docs/QA-REPORT.md).
- **Aksesibilitas WCAG AA**: token warna diperbarui (aksen `#d93d14`), label aksesibel di peta, tile, & input.

## Yang baru di v4 (polish profesional)

- **Onboarding** pertama kali: nama, karakter, lokasi & target, pilih data contoh atau mulai bersih.
- **Animasi:** sheet & notifikasi masuk-keluar, tab dan navigasi dengan indikator meluncur, kartu muncul berurutan, grafik menggambar diri, dial terisi bertahap, pin checkpoint jatuh, confetti (ride tersimpan, naik level, target tembus, stempel baru), getaran halus, dan skeleton loading.
- **Kualitas:** dialog konfirmasi kustom, penangkap error, autosave rute, migrasi data, halaman lazy-load (bundle utama 650 → ~280 KB), ikon PNG, gambar pratinjau link, shortcut PWA, dan fokus keyboard.
- **Mode hujan:** di perencana rute, peluang hujan sepanjang durasi ride → saran checkpoint berteduh atau geser jam start.
- **Paspor landmark:** 10 stempel (Monas, Kota Tua, Gunung Pancar, Puncak Pass, …) otomatis didapat saat ride melewatinya. 6 stempel membuka item karakter.
- **Rute populer:** 5 template klasik Jabodetabek dengan checkpoint & coffee break, sekali ketuk.

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
