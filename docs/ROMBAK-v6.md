# Kayuh v6 — Rombak total: "Ajak, ketemu, ngopi"

Arah baru: Kayuh **bukan lagi aplikasi analitik** yang kebetulan punya fitur gowes bareng.
Kayuh adalah **alat ketemuan untuk pesepeda**: ajak, cocokkan jadwal, cari titik temu yang adil,
atur checkpoint & ngopi, lalu kabari semua orang. Analisis tetap ada, tapi turun prioritas.
Nanti analisis masuk lewat **share dari Strava** dengan penjelasan yang lebih dalam.

---

## 1. Audit board "sepeda 2" (12 pin) dan apa yang diambil

Board dibaca langsung lewat API widget Pinterest, dan ke-12 gambar dicek satu per satu.

| # | Pin | Pola desain | Jadi apa di Kayuh |
|---|---|---|---|
| 1 | Jurnal "It's Sunday 19th…" (kopi) | Kalimat sapaan yang menyatu dengan konteks (hari, cuaca, jam) | **Kalimat hari ini** di Beranda: hari, suhu, siapa ikut, berapa ajakan menunggu |
| 2 | Gym tracker gelap ("Push") | Kartu gelap, grid pil "Last 30 days" (penuh / garis putus) | **Mode gelap** + **grid pil ketersediaan** di *Kapan semua bisa?* |
| 3 | Fitness "Home" (oranye) | Strip hari dengan lingkaran hitam, satu aksen oranye untuk hari ini | **Strip 7 hari**: hitam = ikut, garis = undangan, oranye = hari ini |
| 4 | Logistik "Track Shipping" | Kartu saldo hitam, **stepper Received → In transit → Delivered**, timeline detail | **Kartu hero ajakan** + **stepper Kumpul → Ngopi → Finish** + **timeline checkpoint dengan check-in** |
| 5 | Wellness "Welcome back Hadi" | Header avatar + lonceng, nav pil mengambang | **Header karakter** + **nav pil mengambang** |
| 6 | DailyLoop | Segmented hitam-di-abu, FAB bulat hitam terpisah dari nav | **Tabs** + **FAB "+" Ajak gowes** |
| 7 | MyNote | Catatan tempel kuning dengan pin, tulisan tangan | **Undangan = catatan tempel** (Caveat) berisi pesan host + avatar karakternya |
| 8 | Dynamic island "Thinking" | Notifikasi pil hitam | Dipertahankan: **toast ala dynamic island** |
| 9 | Slothy | Baris: tile ikon + teks + pil kanan bergaris, font mono | Komponen **`.lrow`** (agenda, alat) + **pil status** "Ikut" |
| 10 | Nutrition "2520" | Angka besar tebal rapat, kartu putih di abu, strip tanggal | Tipografi angka **Geist 600, tracking −0.045em** |
| 11 | Tickr | Kalimat dengan **avatar inline** di tengah teks | Avatar karakter inline di kalimat ("bareng 👤👤 2 teman") |
| 12 | Mosaik 66-day | Ubin kecil yang membentuk gambar, label mono | Cadangan komponen **`.mosaic`** (kekompakan squad, tahap berikutnya) |

**Token desain "Soft Mono"**
- Latar `#eeeeec`, kartu `#ffffff` radius 24, sumur `#f4f4f2`. Tinta `#0d0d0d`. Mode gelap `#0b0b0c / #161618`.
- Hanya **satu aksen** (`#d2441c`, AA) untuk *hari ini*, status live, dan satu tag penting. Selebihnya monokrom.
- Font: **Geist** (UI & angka), **Geist Mono** (label kecil kapital), **Caveat** (catatan tempel saja).
- Tombol pil hitam, nav pil mengambang dengan item aktif hitam + label, FAB bulat.
- Animasi ≤ 400 ms. Marquee LED, grain, dan garis cahaya v5 dihapus. Confetti hanya untuk momen penting.
- **Karakter (DiceBear Lorelei) dipertahankan** dan dipakai lebih bermakna: header, avatar inline di kalimat, pin peta, catatan undangan, daftar peserta, layar balasan.

---

## 2. Arsitektur informasi baru

```
Nav pil:  Hari ini · Agenda · Ketemu · Ngopi        [ + ]  ← FAB: Ajak gowes
Header:   avatar karakter → Karakter/Profil · 📅 Kapan bisa? · 🔔 Pengingat
Desktop:  Utama (4 + Kapan bisa) · Kamu (Karakter, Pengingat, Paspor, Profil)
          · Analisis · nanti (Analisis, Riwayat, Rekam, Cuaca, Rencana, Garasi)
```

| Halaman | Isi |
|---|---|
| **Hari ini** | Kalimat hari ini, strip 7 hari, kartu hero gowes berikutnya (stepper, "berangkat dari rumah jam…", Ajak/Telat), undangan masuk (catatan tempel, Ikut/Detail/Skip), 4 alat ketemuan, agenda, "squad lagi free" |
| **Ajak gowes** (FAB) | 6 langkah, satu pertanyaan per layar: Apa → Kapan (saran slot emas, voting ≤ 3 jam, "n free" per jam) → Siapa (tag *Free*) → Kumpul (Adil / Dekat aku / tempat nyata OSM) → Ngopi (≤ 3 kafe, voting) → pratinjau catatan tempel → WhatsApp |
| **Agenda** | Butuh jawabanmu · Akan datang · Sudah lewat; Teman (bar ketersediaan 7 hari + pace match + peta); Liga |
| **Detail ajakan** | Kartu status ala pelacakan paket, RSVP, voting (host bisa *Tetapkan*), timeline checkpoint + **check-in**, peta rumah→kumpul, jam berangkat, cuaca, peserta + catatan, colek yang belum jawab, jadwal untuk keluarga, radar demo |
| **Titik temu** | 4 mode: **Adil** (minimax jarak), **Waktu** (minimax waktu), **Searah** (baru), **Jemput** (baru) |
| **Kapan semua bisa?** | Slot emas + 2 alternatif (free × cuaca), peta panas 7 hari × 3 slot, grid pil waktu luangku, bagikan jadwal free |
| **Undangan** `#/join/…` | Untuk teman (bisa tanpa akun & tanpa onboarding): catatan tempel, vote jam & kopi, Ikut/Mungkin/Nggak → **kirim jawaban** |
| **Balasan** `#/balas/…` | Untuk host: RSVP, vote, catatan, karakter & titik berangkat teman masuk otomatis |

---

## 3. Inovasi yang SUDAH dibangun di v6

1. **RSVP dua arah tanpa server.** Undangan sudah dikodekan di URL sejak dulu, tapi jawaban teman tidak pernah kembali ke host. Sekarang teman mengirim **link balasan** lewat WhatsApp. Saat host mengetuknya, Kayuh menggabungkan RSVP, vote, catatan, **avatar karakter teman**, dan **perkiraan titik berangkat** (dibulatkan ±1 km dan opsional). Prosesnya idempoten (dibuka dua kali tidak menggandakan) dan cocok-nama ke daftar teman (teman baru menjadi tamu). Tanpa akun, tanpa backend.
2. **Voting jam & tempat ngopi** di dalam undangan, lengkap dengan hitungan suara dan tombol *Tetapkan*. Pemenang kopi otomatis menjadi checkpoint coffee break.
3. **Jemput berantai.** "Nggak ada yang gowes sendirian ke titik kumpul." Orang terjauh berangkat duluan dan menjemput teman yang **searah** (memutar ≤ 25% atau ≤ 2 km). Kalau tidak searah, ia membentuk rombongan sendiri. Jam berangkat tiap orang dihitung mundur dari jam kumpul, memakai kecepatan anggota paling lambat di rombongan saat itu.
4. **Titik temu searah tujuan.** Median geometris (Weiszfeld) dengan tujuan diberi bobot *n*: titik kumpul yang membuat total jarak semua orang ke tujuan (mis. kedai kopi) paling kecil. Tidak ada yang harus balik arah.
5. **Kapan semua bisa?** Waktu luang mingguan (21 slot) × prakiraan cuaca 7 hari menghasilkan **slot emas**, dengan satu ketuk ke Ajak yang sudah terisi teman-teman yang free.
6. **Check-in checkpoint + "Kabari grup".** Setiap check-in menyiapkan status WA ("Rombongan sudah di Kopi X, berikutnya Monas ±06.40"). Ada juga **"Jadwal untuk keluarga di rumah"**.
7. **Undangan sebagai catatan tempel** dengan avatar host. Karakternya ikut terbawa di link (dikodekan ringkas).
8. **Saran jam di alur Ajak**: tiap pilihan jam menampilkan "n free"; saran teratas menggabungkan ketersediaan dan cuaca.
9. **Colek yang belum jawab**: satu ketuk mengirim pengingat WA berisi link undangan.

---

## 4. Fitur yang bisa diperkuat (analisis)

| Fitur | Kondisi sekarang | Cara memperkuat | Butuh server? |
|---|---|---|---|
| Titik temu | Jarak garis lurus × 1,3 | **Matriks waktu tempuh jalan sepeda** (OSRM `table`) supaya "adil" berarti menit nyata, plus penalti tanjakan dan jalan arteri | Tidak (API publik) |
| Jemput berantai | Heuristik serakah | Optimasi 2-opt, batas waktu tunggu tiap penjemputan, titik jemput di **minimarket/SPBU** (bukan depan rumah) demi privasi | Tidak |
| Ngopi | Cari kafe di sekitar titik kumpul | **Cek jam buka vs ETA** ("kafe buka 07.00, kalian tiba 06.40 → geser 20 mnt"), kafe *ramah sepeda* (parkir, isi bidon) | Tidak / rating komunitas: ya |
| Voting | Satu suara per orang | Persetujuan ganda (boleh pilih >1), tenggat voting otomatis, auto-tetapkan H-12 jam | Tidak |
| Kapan bisa | Waktu luang teman = data contoh | Teman membagikan jadwal lewat **link ketersediaan** (pola sama dengan link balasan), lalu sinkron penuh | Link: tidak / sinkron: ya |
| Pengingat | Manual + "Ingatkan aku" | Otomatis dari RSVP: H-1 malam (cas lampu, cek ban), jam berangkat, dan cuaca memburuk | Web Push: ya |
| Telat | Pilihan 5/15/30 menit | ETA dari GPS nyata + "jalan duluan, aku kejar di CP2" | Tidak |
| Liga | Berbasis km | Ganti ke **poin kebersamaan** (hadir, menjemput, jadi host), selaras dengan fokus baru | Tidak |
| Karakter | Avatar profil + kartu ID | Ekspresi bereaksi ke RSVP/check-in, lencana sosial (*Kapten Squad*: 5× host; *Penjemput*: 10× jemput) | Tidak |

---

## 5. Inovasi berikutnya (yang paling bikin "wah")

**Tanpa server (bisa langsung):**
- **Kopi Sinkron.** Rombongan dibagi per pace (A cepat, B santai). Kayuh menghitung **jam & titik start berbeda** supaya semua tiba **bersamaan di kedai kopi**. Yang santai start lebih dekat atau lebih awal, yang kencang dapat rute lebih panjang. Selama ini rombongan campuran selalu saling menunggu, dan ini menyelesaikannya.
- **Papan kedatangan (hari-H).** Pagi hari ride, Beranda berubah jadi papan bandara: siapa sudah berangkat, ETA tiap orang. Teman menekan "Aku OTW" di link undangan, yang mengirim link status (pola link balasan).
- **QR kumpul.** Host menampilkan QR di titik kumpul, teman memindai untuk absen hadir. Ada stempel paspor "Hadir" dan daftar hadir otomatis untuk no-drop.
- **Utang kopi (ledger squad).** Patungan tercatat lintas ride, ada "giliran traktir" yang adil, dan tagihan bisa dibagikan sebagai teks/QRIS.
- **Titik kumpul ulang otomatis (regroup).** Untuk no-drop: titik aman (minimarket) disarankan tiap ±10 km atau setelah tanjakan.
- **Geser karena cuaca.** H-12 jam, kalau peluang hujan melonjak, satu ketuk mengusulkan jam baru ke semua orang beserta alasannya.
- **Kimia squad.** "Sudah 3 minggu nggak gowes bareng Kirana. Ajak?" dihitung dari riwayat ajakan.

**Dengan server (Supabase, sesuai roadmap):**
- **Radar live & alarm no-drop sungguhan** (Realtime channel per ajakan, lokasi kedaluwarsa setelah ride).
- **Sinkron waktu luang squad** dan **RSVP push** (tanpa perlu mengetuk link balasan).
- **"Pulang aman"**: setelah finish, tiap orang menekan *sampai rumah* dan host melihat semua aman.
- **Interkom squad** (push-to-talk WebRTC) untuk rombongan yang memanjang.
- **Peta rawan & kafe terverifikasi** dari komunitas.

---

## 6. Analisis lewat Strava (nanti)

- Tahap 1: **Share link aktivitas Strava → Kayuh** (Web Share Target di manifest). Kayuh mengenali ID aktivitas.
- Tahap 2: **OAuth Strava** (butuh Client ID) untuk mengambil stream latlng/altitude/HR/cadence/watts.
- Tahap 3: **Penjelasan yang lebih dalam** dalam bahasa manusia, misalnya "kenapa km 30–40 melambat" (angin, tanjakan, panas, pacing), dosis polusi, keringat, plus **analisis rombongan**: siapa menarik di depan, siapa tertinggal, dan efek drafting.
- Mesin analitik lama (TSS/CTL/ATL, FTP estimasi, 80/20, prediksi waktu) tetap ada di menu *Analisis · nanti* dan akan memakai data Strava.

---

## 7. Batasan yang perlu diketahui

- Waktu luang teman masih data contoh sampai ada link ketersediaan atau sinkron.
- Balasan dicocokkan berdasarkan nama. Nama sama dengan orang berbeda akan tertimpa (tahap berikutnya: ID perangkat di link).
- Link balasan hanya berfungsi di HP pembuat ajakan, karena semua data tersimpan lokal.
- Titik berangkat yang dibagikan dibulatkan ke 2 desimal (±1 km) dan hanya bila teman mengizinkan.

## 8. QA

`npm run qa` sudah diperbarui untuk fitur baru: alur Ajak 6 langkah, voting + tetapkan, check-in, undangan di HP baru tanpa onboarding, link balasan idempoten, 4 mode titik temu, dan Kapan bisa. Hasilnya **96/96 lolos**, termasuk axe-core tanpa pelanggaran kritis/serius dan tanpa scroll horizontal di 360 px untuk 17 rute.
