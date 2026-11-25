# PACK v8 — akun & login, onboarding baru, tampilan lebih dekat ke referensi

## 1. Akun

**Alur pengguna**
1. Sambutan, lalu **Daftar**: isi nama, email, dan password.
2. Pilih karakter.
3. Atur **@username** dan lokasi.
4. Tandai waktu free.
5. Tambah rekening (opsional), lalu selesai.
6. Untuk pengguna lama: **Masuk** memulihkan semua data dari server.
7. **Coba tanpa akun** tetap tersedia. Akun bisa dibuat kapan saja dari Profil, dan data di HP ikut terunggah.

**Yang tersinkron**
- Data pribadi: ride, teman, ajakan, pengingat, garasi, pengaturan, karakter, rute, waktu free, catatan patungan, dan rekening.
- Disimpan otomatis ±2 detik setelah ada perubahan. Status tampil di Profil (Tersinkron / Menyimpan / Offline).

**Fitur sosial berbasis akun**

| Fitur | Cara kerja |
|---|---|
| Tambah teman | Lewat **@username**, atau lewat link profil `#/u/<username>` |
| Undangan in-app | Ajakan yang dibuat host langsung **masuk ke app teman** yang punya akun, dan muncul sebagai catatan tempel di Beranda |
| Jawaban langsung | Ikut/mungkin/tidak, vote, titipan, dan status OTW **terkirim langsung ke host**, tanpa WhatsApp. Host melihatnya saat membuka ajakan (diperbarui tiap 40 detik) |
| Tamu tanpa akun | Tetap bisa menjawab lewat link undangan. Jawabannya kini juga masuk ke server, dengan WhatsApp sebagai cadangan |
| Profil teman | Waktu free, karakter, dan rekening teman ikut diperbarui otomatis |

**Arsitektur** (`api/pack.ts`, satu Vercel Function)
- **Penyimpanan:** Vercel Blob store `pack-ride-data`.
  - Setiap dokumen dienkripsi **AES-256-GCM** (kunci dari env `PACK_SECRET`).
  - Path dokumen berupa HMAC sehingga tidak bisa ditebak.
  - Setiap penulisan membuat **versi baru dengan nama unik**, karena CDN Blob menyimpan cache; versi lama dihapus. Hasilnya, pembacaan selalu mendapat versi terbaru (sudah diuji di produksi).
- **Password:** scrypt (N=16384) dengan salt acak.
- **Sesi:** token bertanda tangan HMAC-SHA256, berlaku 90 hari.
- **Otorisasi:** ajakan hanya bisa diubah host-nya. Rekening hanya terlihat oleh pengguna yang sudah login (pencarian @username publik tidak menampilkannya).
- **Lokal:** `npm run dev:api` menjalankan API yang sama dengan penyimpanan di `.data/`. Vite mem-proxy `/api` ke API lokal ini.

**Batasan** (rekomendasi tahap berikutnya)
- Belum ada **verifikasi email** dan **reset password**. Keduanya butuh layanan pengirim email (mis. Resend), jadi perlu API key.
- Belum ada pembatasan jumlah percobaan login.
- **Kuota Blob:** operasi tulis/daftar dihitung sebagai "advanced operations", dan paket gratis Vercel punya kuota bulanan. Kalau pengguna sudah banyak, migrasi ke Postgres (Neon/Supabase) lewat Vercel Marketplace.
- **Foto menu** masih tersimpan per HP (IndexedDB).

## 2. Onboarding (ala pin DailyLoop)
- **Panggung kartu melayang** dalam cincin yang "bernapas". Kartu utama "Sabtu ini" memakai judul **serif** (Instrument Serif) dan baris centang, dikelilingi kartu mini di tepi (Titip, Patungan, Kapan bisa, Titik temu).
- **Kartu sambutan putih** di bawah:
  - logo 3D (bayangan + tilt yang bergerak);
  - "Selamat datang di PACK!";
  - tombol hitam "Mulai sekarang";
  - "Sudah punya akun? **Masuk**";
  - "Coba dulu tanpa akun".
- Langkah-langkah memakai judul besar dua baris (baris kedua abu) dan progress bar di atas. Form punya tombol lihat/sembunyikan password dan pesan error yang bergetar.

## 3. Tampilan lebih dekat ke referensi

| Referensi | Penerapan |
|---|---|
| DailyLoop "Hey, Karthik 👋 / *Let's make progress today!*" | Header **"Hey, Juan 👋"** dengan subjudul **serif miring** |
| DailyLoop pemilih hari dalam kartu putih | **Kartu hari**: hari ini pil abu, hari dengan ride bertitik hitam, undangan bertitik oranye |
| Tickr kalimat dengan avatar | **Kartu hitam** berisi kalimat "**Coffee ride** kumpul **05.30** … bareng 👤👤 **2 teman**" |
| Logistik "New Shipping / Track Shipping" | Dua **pil putih** di kartu hitam: *Ajak teman*, *Aku telat* |
| Logistik "Current Tracking" | **Kartu pelacakan**: kode ajakan, status pil biru/hijau, kolom Kumpul → Ngopi, dan stepper |
| Mosaik "3 of 5 done" | **Checklist mulai** "x dari 6 selesai" dengan progress bar dan lingkaran centang |
| Wellness "Hadi" kartu ber-chevron | Kartu alat ketemuan dengan chevron di kanan atas |
| Logistik search + tombol filter hitam | **Agenda**: kolom cari + tombol filter bulat hitam |
| DailyLoop segmented hitam & grup ▾ Morning/Workload | **Segmented** Butuh jawaban / Akan datang / Selesai, plus **grup per hari** yang bisa dilipat |
| DailyLoop nav | **Nav**: trek abu, **pil putih** untuk menu aktif, semua item berlabel |

Alur yang lebih jelas:
- **Undangan masuk** tampil di atas Beranda.
- Di langkah terakhir Ajak, tombol utama berubah menjadi "**Kirim ke n teman di PACK**" bila temannya punya akun.
- Setelah RSVP muncul indikator "Terkirim ke host".
- Pengguna baru dipandu checklist.

## 4. QA
`npm run qa` (butuh `npm run dev` dan `npm run dev:api`) → **110/110 lolos**. Mencakup:
- onboarding tanpa akun;
- daftar penuh 6 langkah, password salah ditolak;
- keluar lalu masuk memulihkan data;
- akun kedua ditambah lewat link profil;
- undangan in-app dan jawaban yang terlihat di HP host;
- seluruh pemeriksaan v7.

Uji dua akun juga dijalankan langsung di **https://pack-ride.vercel.app**.
