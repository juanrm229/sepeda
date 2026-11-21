/* Kayuh — suite QA/QC end-to-end.
   Jalankan: npm run dev (port 5199) lalu  node scripts/qa.cjs [BASE_URL]
   Butuh: playwright (global) & axe-core (devDependency). */
const { chromium, devices } = require('playwright')
const fs = require('fs')
const path = require('path')
const BASE = (process.argv[2] || 'http://localhost:5199') + '/#/'
const OUT = process.env.QA_OUT || path.join(__dirname, '..', 'qa-output')
fs.mkdirSync(OUT, { recursive: true })
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const IGNORE = /open-meteo|429|ERR_FAILED|overpass|kumi|nominatim|aladhan|routing\.openstreetmap|tile\.openstreetmap|fonts\.g/
const results = []
const rec = (area, name, ok, note = '') => { results.push({ area, name, ok, note }); console.log(`${ok ? '✓' : '✗'} [${area}] ${name}${note ? ' — ' + note : ''}`) }

async function newPage(b, opts = {}) {
  const ctx = await b.newContext({ ...(opts.device ?? devices['iPhone 13']), ...(opts.ctx ?? {}) })
  if (opts.onboarded !== false) await ctx.addInitScript(() => { if (!localStorage.getItem('kayuh-v2')) localStorage.setItem('kayuh-v2', JSON.stringify({ state: { onboarded: true }, version: 5 })) })
  const p = await ctx.newPage()
  p._errs = []; p._404 = []
  p.on('pageerror', (e) => p._errs.push('PAGEERR ' + e.message))
  p.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) p._errs.push('CONSOLE ' + m.text().slice(0, 160)) })
  p.on('response', (r) => { if (r.status() >= 400 && !IGNORE.test(r.url())) p._404.push(r.status() + ' ' + r.url()) })
  return p
}
async function step(area, name, fn) { try { const note = await fn(); rec(area, name, true, note || '') } catch (e) { const m = String(e.message); const why = m.split('\n').find((l) => /intercepts|not visible|not stable|not enabled|detached/.test(l)); rec(area, name, false, (m.split('\n')[0].slice(0, 120) + (why ? ' :: ' + why.trim().slice(0, 160) : ''))) } }
const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('kayuh-v2')).state)

;(async () => {
  const b = await chromium.launch()

  /* ---------------- 1. Pengguna baru (onboarding) ---------------- */
  {
    const p = await newPage(b, { onboarded: false })
    await p.goto(BASE); await p.waitForTimeout(1200)
    await step('Onboarding', 'muncul untuk pengguna baru', () => p.getByText('Gowes lebih pintar').waitFor({ timeout: 5000 }))
    await step('Onboarding', 'isi nama, ganti gaya hijab & kulit', async () => {
      await p.getByRole('button', { name: /Ayo mulai/ }).click()
      await p.getByPlaceholder('Nama panggilan').fill('Rizky')
      await p.getByRole('button', { name: 'Black sport hijab' }).click()
      await p.getByRole('button', { name: /Brown/ }).first().click()
      const s = await store(p); if (!s.char.hijab) throw new Error('hijab tidak terpasang')
      await p.getByRole('button', { name: /Lanjut/ }).click()
    })
    await step('Onboarding', 'target mingguan & lanjut', async () => { await p.getByText('Dari mana kamu biasa gowes?').waitFor(); await p.locator('input[type=range]').fill('150'); await p.getByRole('button', { name: /Lanjut/ }).click() })
    await step('Onboarding', 'mulai bersih mengosongkan data', async () => {
      await p.getByText('Mulai bersih').click(); await p.waitForTimeout(600)
      const s = await store(p); if (s.rides.length !== 0 || s.settings.name !== 'Rizky' || s.settings.weeklyGoalKm !== 150) throw new Error(JSON.stringify({ r: s.rides.length, n: s.settings.name, g: s.settings.weeklyGoalKm }))
    })
    await step('Kosong', 'beranda tanpa data tidak crash', async () => { await p.goto(BASE); await p.waitForTimeout(1200); if (await p.getByText(/Rantainya lepas/).count()) throw new Error('error boundary muncul') })
    for (const r of ['insights', 'rides', 'karakter', 'rencana', 'squad', 'paspor', 'garage', 'record', 'reminders', 'rute', 'weather']) {
      await step('Kosong', `halaman ${r} tanpa data`, async () => { await p.goto(BASE + r); await p.waitForTimeout(900); if (await p.getByText(/Rantainya lepas/).count()) throw new Error('error boundary') })
    }
    await step('Kosong', 'tidak ada error JS', async () => { if (p._errs.length) throw new Error(p._errs.slice(0, 3).join(' | ')) })
    await p.context().close()
  }

  /* ---------------- 2. Fitur utama (data contoh) ---------------- */
  const p = await newPage(b)
  await p.goto(BASE); await p.waitForTimeout(1500)
  await step('Beranda', 'hero, cerita, bento, liga tampil', async () => { await p.getByText(/KM minggu ini/i).waitFor(); await p.locator('.stories').waitFor(); await p.locator('svg[aria-label="Balapan squad mingguan"]').first().waitFor() })
  await step('Beranda', 'tema gelap tersimpan', async () => { await p.getByRole('button', { name: 'Ganti tema' }).click(); const t = await p.evaluate(() => document.documentElement.dataset.theme); await p.reload(); await p.waitForTimeout(800); const t2 = await p.evaluate(() => document.documentElement.dataset.theme); if (t !== 'dark' || t2 !== 'dark') throw new Error(t + '/' + t2); await p.getByRole('button', { name: 'Ganti tema' }).click() })

  // Karakter
  await p.goto(BASE + 'karakter'); await p.waitForTimeout(1200)
  await step('Karakter', 'semua 14 tab lemari terbuka & berisi', async () => {
    const tabs = await p.locator('.seg-tabs button').allInnerTexts()
    for (const t of tabs) { await p.locator('.seg-tabs button', { hasText: t.replace(' •', '') }).first().click(); await p.waitForTimeout(120); const n = await p.locator('.wardrobe .tile').count(); if (n < 2) throw new Error(`tab ${t} kosong`) }
    return `${tabs.length} tab`
  })
  await step('Karakter', 'aturan: hijab menyembunyikan rambut, rambut melepas hijab', async () => {
    await p.locator('.seg-tabs button', { hasText: /^Hijab/ }).click(); await p.locator('.wardrobe .tile').nth(2).click()
    let s = await store(p); if (!s.char.hijab) throw new Error('hijab tidak terpasang')
    const hairShown = await p.locator('.tiltcard image[href*="/hair-"]').count(); if (hairShown) throw new Error('rambut masih tergambar di bawah hijab')
    await p.locator('.seg-tabs button', { hasText: /^Rambut/ }).click(); await p.locator('.wardrobe .tile').nth(3).click()
    s = await store(p); if (s.char.hijab || !s.char.hair) throw new Error('rambut tidak melepas hijab')
  })
  await step('Karakter', 'multi-pilih detail & tombol Tanpa', async () => {
    await p.locator('.seg-tabs button', { hasText: /^Detail/ }).click()
    await p.locator('.wardrobe .tile').nth(1).click(); await p.locator('.wardrobe .tile').nth(2).click()
    let s = await store(p); if (s.char.details.length !== 2) throw new Error('detail ' + s.char.details.length)
    await p.locator('.wardrobe .tile').nth(0).click(); s = await store(p); if (s.char.details.length !== 0) throw new Error('Tanpa gagal')
  })
  await step('Karakter', 'item terkunci menolak + toast', async () => {
    await p.locator('.seg-tabs button', { hasText: /^Topi/ }).click()
    const locked = p.locator('.wardrobe .tile.locked').first()
    if (!(await locked.count())) return 'tidak ada item terkunci di level ini'
    const before = (await store(p)).char.hat; await locked.click(); await p.waitForTimeout(300)
    if ((await store(p)).char.hat !== before) throw new Error('item terkunci terpasang')
    await p.locator('.island').waitFor({ timeout: 2000 })
  })
  await step('Karakter', 'urungkan & acak', async () => { const a = JSON.stringify((await store(p)).char); await p.getByRole('button', { name: 'Acak' }).click(); const b2 = JSON.stringify((await store(p)).char); await p.getByRole('button', { name: 'Urungkan' }).click(); const c = JSON.stringify((await store(p)).char); if (a === b2 || a !== c) throw new Error('undo/acak tidak sesuai') })
  await step('Karakter', 'cari item', async () => { await p.locator('.seg-tabs button', { hasText: /^Baju/ }).click(); await p.getByPlaceholder(/Cari baju/).fill('batik'); await p.waitForTimeout(200); const n = await p.locator('.wardrobe .tile').count(); await p.getByPlaceholder(/Cari baju/).fill(''); if (n !== 2) throw new Error('hasil ' + n) })
  await step('Karakter', 'unduh PNG', async () => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.getByRole('button', { name: 'Unduh' }).click()]); return d.suggestedFilename() })
  await step('Karakter', 'pratinjau ekspresi mood', async () => { await p.getByRole('button', { name: 'lelah' }).click(); await p.waitForTimeout(200); await p.getByRole('button', { name: 'lelah' }).click() })
  await step('Karakter', 'gambar avatar termuat (tanpa 404)', async () => { const bad = p._404.filter((x) => x.includes('/avatar/')); if (bad.length) throw new Error(bad.slice(0, 2).join(', ')) })

  // Squad & undangan
  let invite = ''
  await step('Squad', 'buat gowes bareng + undang', async () => { await p.goto(BASE + 'squad'); await p.getByRole('button', { name: 'Buat' }).click(); await p.getByRole('button', { name: /Buat & undang/ }).click(); await p.waitForURL(/squad\/.+/) })
  await step('Squad', 'link undangan WA berisi data', async () => { const href = await p.locator('a', { hasText: 'Kirim ke grup WhatsApp' }).getAttribute('href'); invite = decodeURIComponent(href.split('text=')[1]).match(/https?:\/\/\S+#\/join\/\S+/)[0]; return invite.length + ' karakter' })
  await step('Squad', 'kartu aksi: telat & geser jadwal', async () => { const before = (await store(p)).groupRides.slice(-1)[0].datetime; await p.getByRole('button', { name: /Geser 30m/ }).first().click(); const after = (await store(p)).groupRides.slice(-1)[0].datetime; if (new Date(after) - new Date(before) !== 1800000) throw new Error('geser gagal') })
  await step('Squad', 'RSVP berubah', async () => { await p.getByRole('button', { name: 'Mungkin', exact: true }).click(); if ((await store(p)).groupRides.slice(-1)[0].myRsvp !== 'mungkin') throw new Error('rsvp') })
  await step('Squad', 'hapus dengan dialog konfirmasi', async () => { const n = (await store(p)).groupRides.length; await p.getByRole('button', { name: /Hapus jadwal/ }).click(); await p.getByRole('dialog').getByRole('button', { name: 'Hapus', exact: true }).click(); await p.waitForURL(/#\/squad$/); if ((await store(p)).groupRides.length !== n - 1) throw new Error('tidak terhapus') })
  await step('Squad', 'tab teman & liga', async () => { await p.getByRole('tab', { name: 'Teman' }).click(); await p.getByText(/Pace match/).waitFor(); await p.getByRole('tab', { name: 'Liga mingguan' }).click(); await p.getByText(/Km kamu minggu ini/).waitFor() })
  {
    const p2 = await newPage(b)
    await step('Undangan', 'teman membuka link → RSVP ikut', async () => { await p2.goto(invite); await p2.getByRole('button', { name: 'Ikut!' }).click(); await p2.waitForURL(/squad\//); const s = await store(p2); if (!s.groupRides.some((g) => g.myRsvp === 'ikut' && g.id.startsWith('inv-'))) throw new Error('tidak tersimpan') })
    await step('Undangan', 'link rusak ditangani', async () => { await p2.goto(BASE + 'join/rusak!!'); await p2.getByText(/tidak valid/).waitFor() })
    await p2.context().close()
  }

  // Rute & checkpoint
  await step('Rute', 'template populer → planner', async () => { await p.goto(BASE + 'rute'); await p.locator('.tpl', { hasText: 'Kota Tua' }).getByRole('button', { name: 'Pakai rute ini' }).click(); await p.waitForURL(/rute\/.+/); await p.waitForTimeout(1500); const n = await p.locator('.tl-item .tl-dot').count(); if (n !== 3) throw new Error('cp ' + n) })
  await step('Rute', 'tambah checkpoint dengan ketuk peta (tanpa batas)', async () => { const bb = await p.locator('.map.full').boundingBox(); for (const [x, y] of [[0.3, 0.4], [0.6, 0.35], [0.45, 0.55]]) { await p.touchscreen.tap(bb.x + bb.width * x, bb.y + bb.height * y); await p.waitForTimeout(350) } const n = await p.locator('.tl-item .tl-dot').count(); if (n !== 6) throw new Error('cp ' + n) })
  await step('Rute', 'ubah jenis, durasi, urutan, hapus', async () => {
    await p.locator('.tl-item').nth(1).click(); await p.locator('.tl-item.sel').getByRole('button', { name: /Makan/ }).click(); await p.locator('.tl-item.sel').getByRole('button', { name: '45', exact: true }).click()
    await p.locator('.tl-item.sel').getByRole('button', { name: 'Turun' }).click(); await p.locator('.tl-item.sel').getByRole('button', { name: 'Hapus' }).click(); await p.waitForTimeout(400)
    const n = await p.locator('.tl-item .tl-dot').count(); if (n !== 5) throw new Error('cp ' + n)
  })
  await step('Rute', 'autosave tersimpan ke daftar', async () => { await p.getByText('Tersimpan').first().waitFor({ timeout: 5000 }) })
  await step('Rute', 'coffee break cari tempat (Overpass/Nominatim)', async () => { await p.locator('.tl-item').nth(1).click(); await p.locator('.tl-item.sel').getByRole('button', { name: /Cari/ }).click(); await p.waitForTimeout(15000); const n = await p.getByRole('button', { name: /Pilih/ }).count(); await p.keyboard.press('Escape'); return n ? `${n} tempat ditemukan` : 'jaringan tempat tidak tersedia di lingkungan uji (fallback tampil)' })
  await step('Rute', 'itinerary WA & Google Maps waypoints', async () => { const wa = await p.locator('a', { hasText: 'Kirim itinerary' }).getAttribute('href'); const gm = await p.locator('a', { hasText: 'Google Maps' }).first().getAttribute('href'); if (!decodeURIComponent(wa).includes('CP1') || !gm.includes('waypoints')) throw new Error('link tidak lengkap') })
  await step('Rute', 'patungan menghitung per orang', async () => { const sel = p.locator('.tl-item').filter({ has: p.locator('.place-pill') }); if (!(await sel.count())) return 'tidak ada tempat terpilih — dilewati'; await sel.first().click(); await p.getByRole('button', { name: /Patungan/ }).click(); await p.getByText('Per orang').waitFor(); await p.keyboard.press('Escape') })

  // Rekam & cek rasa
  await step('Rekam', 'demo → simpan → cek rasa → detail', async () => { await p.goto(BASE + 'record'); await p.getByRole('button', { name: 'Coba demo' }).click(); await p.waitForTimeout(3500); await p.getByRole('button', { name: 'Selesai' }).click(); await p.getByRole('button', { name: 'Simpan', exact: true }).click(); await p.getByText('Gimana rasanya ride tadi?').waitFor({ timeout: 4000 }); await p.getByRole('button', { name: /Simpan/ }).last().click(); await p.waitForURL(/ride\//) })
  await step('Rekam', 'ride baru punya rasa, RPE, zona', async () => { const r = (await store(p)).rides.slice(-1)[0]; if (r.feel == null || !r.rpe) throw new Error('feel/rpe kosong'); await p.getByText('Pola intensitas').waitFor() })
  await step('Rekam', 'GPX & hapus ride', async () => { const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /GPX/ }).click()]); await p.getByRole('button', { name: /^Hapus$/ }).click(); await p.getByRole('dialog').getByRole('button', { name: 'Hapus', exact: true }).click(); await p.waitForURL(/#\/$/); return d.suggestedFilename() })

  // Lainnya
  await step('Pengingat', 'buat, nonaktifkan, hapus', async () => { await p.goto(BASE + 'reminders'); await p.getByRole('button', { name: 'Baru' }).click(); await p.getByPlaceholder(/Gowes pagi/).fill('QA pengingat'); await p.getByRole('button', { name: 'Simpan' }).click(); await p.getByText('QA pengingat').first().click(); await p.getByRole('dialog').getByRole('button', { name: 'Hapus' }).click(); await p.waitForTimeout(400); if (await p.getByText('QA pengingat').count()) throw new Error('masih ada') })
  await step('Pengingat', 'ekspor .ics', async () => { const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Ekspor ke kalender/ }).click()]); return d.suggestedFilename() })
  await step('Rencana', 'racik, putar, proyeksi', async () => { await p.goto(BASE + 'rencana'); await p.getByRole('button', { name: /Racik rencana/ }).click(); await p.getByRole('button', { name: 'Putar' }).click(); await p.waitForTimeout(1200); await p.getByText(/Masa depan kebugaranmu/).waitFor() })
  await step('Titik temu', 'hitung titik adil + mode', async () => { await p.goto(BASE + 'meet'); await p.getByText('Skor keadilan').waitFor(); await p.getByRole('tab', { name: 'Adil waktu' }).click(); await p.getByRole('tab', { name: 'Rata-rata' }).click() })
  await step('Paspor', 'stempel & detail', async () => { await p.goto(BASE + 'paspor'); await p.locator('.stamp-tile').first().click(); await p.getByRole('dialog').waitFor(); await p.keyboard.press('Escape') })
  await step('Garasi', 'reset komponen', async () => { await p.goto(BASE + 'garage'); await p.getByRole('button', { name: /Reset Rantai/ }).first().click(); const s = await store(p); if (s.bikes[0].components[0].usedKm !== 0) throw new Error('tidak reset') })
  await step('Profil', 'ubah nama tercermin di paspor', async () => { await p.goto(BASE + 'profile'); await p.locator('label:has-text("Nama") input').first().fill('QA Rider'); await p.goto(BASE + 'paspor'); await p.getByText('Paspor QA Rider').waitFor() })
  await step('Navigasi', 'rute tak dikenal & ride tak ada', async () => { await p.goto(BASE + 'apa-ini'); await p.getByText(/KM minggu ini/i).waitFor(); await p.goto(BASE + 'ride/xyz'); await p.getByText(/tidak ditemukan/i).waitFor() })
  await step('Global', 'tidak ada error JS', async () => { if (p._errs.length) throw new Error(p._errs.slice(0, 3).join(' | ')) })
  await step('Global', 'tidak ada request 4xx/5xx', async () => { if (p._404.length) throw new Error(p._404.slice(0, 3).join(' | ')) })
  await p.context().close()

  /* ---------------- 3. QC: overflow 360px, aksesibilitas, performa ---------------- */
  const ROUTES = ['', 'squad', 'squad/g1', 'record', 'reminders', 'karakter', 'rencana', 'rute', 'rute/g/g1', 'meet', 'weather', 'insights', 'rides', 'garage', 'profile', 'paspor']
  const q = await newPage(b, { device: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, ctx: { reducedMotion: 'reduce' } })
  const a11y = {}
  for (const r of ROUTES) {
    const t0 = Date.now(); await q.goto(BASE + r); await q.waitForLoadState('networkidle').catch(() => {}); const ms = Date.now() - t0
    await q.waitForTimeout(1200)
    const ov = await q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    rec('QC 360px', `/${r} tanpa scroll horizontal`, ov <= 1, ov > 1 ? `lebih ${ov}px` : `${ms} ms`)
    await q.addScriptTag({ content: AXE })
    const v = await q.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: true } } })).violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, help: x.help })))
    a11y[r || 'home'] = v
    const serious = v.filter((x) => x.impact === 'critical' || x.impact === 'serious')
    rec('QC a11y', `/${r} tanpa pelanggaran kritis/serius`, serious.length === 0, serious.map((x) => `${x.id}×${x.n}`).join(', '))
  }
  fs.writeFileSync(path.join(OUT, 'a11y.json'), JSON.stringify(a11y, null, 2))
  await q.context().close()
  await b.close()

  const fail = results.filter((r) => !r.ok)
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  console.log(`\n${results.length - fail.length}/${results.length} lolos`)
  process.exit(fail.length ? 1 : 0)
})()
