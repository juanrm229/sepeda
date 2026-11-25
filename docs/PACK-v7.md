# PACK v7 — brand baru, titip kopi, patungan, dan animasi

## 1. Brand: PACK

**Kenapa PACK**
- Satu suku kata dan tegas, seperti Nike, Uber, atau Vans.
- Dalam bahasa balap sepeda, *the pack* adalah rombongan inti peloton. Dalam bahasa sehari-hari, *my pack* berarti geng sendiri.
- Kata ini mudah diucapkan di Indonesia ("pek") dan mudah dijadikan kata kerja: "Pack-in squad Sabtu ini".

**Positioning penantang**

| | Strava | PACK |
|---|---|---|
| Inti | Merekam performa **individu** | Mengumpulkan **rombongan** |
| Momen | Setelah ride (kudos, segmen) | Sebelum & selama ride (ajak, ketemu, ngopi, patungan) |
| Akun | Wajib | Tidak perlu: link WA saja |
| Lokal | Global | Ngopi, titip, transfer BCA/GoPay, waktu sholat, CFD |

**Tagline**
- "Ride as one."
- Kampanye: "Stop riding alone." / "Strava tracks the ride. PACK makes it happen."

**Logo**
- Huruf **P** yang lengkungnya berupa **pin lokasi**, dengan **titik oranye `#ff5a1f`** sebagai titik kumpul.
- Stroke tebal, dibuat sebagai SVG: tetap jelas di 16 px, kuat dijadikan stiker atau jersey.
- Wordmark **PACK** memakai Geist 800 dengan tracking −0.065em dan diakhiri titik oranye.
- Aset: `public/icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (safe zone 80%), `apple-touch-icon.png`, dan `og.png` (1200×630 dengan karakter squad & catatan titipan).
- Animasi logo: tangkai dan lingkaran "tergambar", lalu titik oranye muncul memantul (`.logo-anim`).

> Sebelum rilis publik: cek merek dagang "PACK" di kelas 9/42 (aplikasi) di PDKI/DJKI dan cek ketersediaan domain. Nama diatur di satu tempat: `src/lib/brand.ts`.

## 2. Titip kopi, foto menu, rekening, catatan utang

**Alurnya**
1. Ajakan punya checkpoint ngopi (atau voting kafe).
2. Kartu **Titip pesanan** menampilkan foto menu kafe (kalau ada) dan memilih **satu orang yang pesan & menalangi** (*runner*, default host).
3. Tiap orang menulis titipannya: pilihan cepat (es kopi susu, americano, …), catatan ("less sugar"), harga, dan jumlah. Host/runner juga bisa mencatat titipan untuk teman.
4. **Tamu nitip langsung dari link undangan.** Titipannya ikut di link balasan, lalu masuk ke daftar host saat link itu diketuk.
5. **Daftar ke WA** menghasilkan ringkasan untuk barista ("2× Es kopi susu (less sugar)") plus daftar per orang.
6. **Tagih patungan** membuat catatan utang per orang ke runner, lalu membuka WA berisi rincian dan **rekening runner**.
7. Halaman **Patungan** menampilkan:
   - "akan diterima" dan "kamu berutang";
   - saldo per teman, dengan tombol tagih (WA + rekening) dan tandai lunas;
   - riwayat dan catat manual (parkir, ban dalam, dll);
   - **giliran traktir** (siapa yang paling jarang menalangi).

**Foto menu**
- Disimpan di **IndexedDB** dan dikompres ke ±1400 px JPEG 0,72. Kuncinya nama tempat + koordinat (3 desimal), dengan cadangan cocok berdasarkan nama saja.
- Dipakai lagi setiap kali ngopi di tempat yang sama: di kartu titipan, di sheet titip, dan di lightbox (zoom + geser).

**Rekening & e-wallet**
- Diatur di Profil atau di Patungan → Rekeningku. Pilihan cepat: BCA, Mandiri, BRI, BNI, Jago, SeaBank, BSI, CIMB / GoPay, OVO, DANA, ShopeePay, LinkAja.
- Ikut di **link undangan**, jadi tamu langsung melihat rekening host plus tombol salin. Ikut juga di **tagihan WA**. Tidak perlu kirim nomor rekening ke grup lagi.

**Batasan**
- Foto menu tersimpan di HP yang memotret. Foto terlalu besar untuk dibawa di link, jadi berbagi antar-HP butuh server (Supabase Storage).
- Catatan utang hanya ada di HP host atau runner. Tamu menerima rinciannya lewat WA.

## 3. Inovasi tanpa server (semuanya sudah dibangun)

| Fitur | Cara kerja |
|---|---|
| **Kopi Sinkron** | Peserta dibagi dua jika selisih kecepatan ≥ 3 km/j (dibelah di titik tengah). Jam start grup kencang = start + (D/v_santai − D/v_kencang), atau start bareng + putaran bonus D·(v_k/v_s − 1). Animasi dua jalur yang tiba bersamaan di ☕ |
| **Papan kedatangan** | Hari-H (−4 jam s/d finish +8 jam): status tiap peserta (belum, OTW + ETA, tiba). Tamu mengirim status lewat link balasan (`status`, `eta`) |
| **Pulang aman** | Setelah finish, papan berubah menjadi "sampai rumah" |
| **Link jadwal free** | `#/jadwal/<kode>` berisi nama, mask 21 bit, dan karakter. Cocok nama → perbarui teman, atau tambahkan sebagai teman baru |
| **QR undangan** | Untuk yang baru gabung di titik kumpul (dimuat saat dibutuhkan) |
| **Titik kumpul ulang** | Ajakan no-drop: titik tiap 10 km di sepanjang rute (chip ke Google Maps + pin abu di peta) |
| **Geser karena hujan** | Jika hujan ≥ 50% di jam kumpul dan ada jam ±3 jam dengan hujan ≥ 25 poin lebih rendah, muncul tombol "Geser & kabari grup" |
| **Kangen gowes bareng** | Teman yang ≥ 14 hari tidak gowes bareng muncul dengan tombol Ajak |

## 4. Animasi

Diambil dari pola gerak di board:

| Referensi | Animasi di PACK |
|---|---|
| Slothy "swipe to tomorrow" | **Geser catatan undangan** ke kanan untuk Ikut, ke kiri untuk Skip (kartu terbang keluar, getaran haptik). Juga di daftar "Butuh jawabanmu" |
| DailyLoop (kartu melayang dalam cincin) | **Orbit avatar** squad di onboarding; di layar "ajakan terkirim" orbitnya **menyempit dan berkumpul** ke logo, sebagai metafora titik temu |
| Dynamic island "Thinking" | **Pil pemuat** hitam dengan piksel berpendar saat mencari kafe; toast island memantul |
| Tickr (kartu yang melipat) | **Header ringkas** muncul dari atas saat menggulir Beranda |
| Mosaik (kartu terangkat) | Kartu hero masuk dengan sedikit rotasi & skala; kartu terangkat saat hover |
| Pelacakan paket | **Stepper terisi bertahap**, node "sekarang" berdenyut, check-in memantul |
| MyNote | Catatan tempel **jatuh lalu menempel**, pin menekan |

Animasi umum lainnya:
- Kurva **pegas** (`linear()`, dengan fallback cubic-bezier).
- **Indikator nav** meluncur dan berubah lebar; label tab muncul dengan pegas.
- **FAB** berputar menjadi × saat sheet Ajak terbuka.
- **Sheet** muncul dengan pegas dan bisa **ditarik ke bawah untuk ditutup**, dengan memperhitungkan kecepatan tarikan.
- **Transisi halaman berarah**: tab kiri/kanan, masuk lebih dalam, atau kembali.
- Strip hari muncul berurutan, cincin "hari ini" sekali, dan angka Patungan berhitung naik.
- Semua animasi dimatikan oleh `prefers-reduced-motion`.

Perbaikan teknis: sheet, lightbox, dan header ringkas dirender lewat **portal** ke `body`. Kartu yang sedang beranimasi membuat konteks tumpukan sendiri, sehingga tanpa portal elemen fixed tertutup nav.

## 5. QA

`npm run qa` → **104/104 lolos**. Mencakup:
- titip (host untuk teman, tamu lewat link);
- foto menu (unggah + lightbox);
- tagih patungan (WA berisi rekening, catatan utang terbuat), tandai lunas, catat manual, rekening;
- link jadwal free;
- serta seluruh pemeriksaan v6, termasuk axe-core dan layout 360 px untuk 18 rute.
