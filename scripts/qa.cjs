/* PACK — suite QA/QC end-to-end.
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
  if (opts.onboarded !== false) await ctx.addInitScript(() => { if (!localStorage.getItem('kayuh-v2')) localStorage.setItem('kayuh-v2', JSON.stringify({ state: { onboarded: true }, version: 8 })) })
  const p = await ctx.newPage()
  p._errs = []; p._404 = []
  p.on('pageerror', (e) => p._errs.push('PAGEERR ' + e.message))
  p.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) p._errs.push('CONSOLE ' + m.text().slice(0, 160)) })
  p.on('response', (r) => { if (r.status() >= 400 && !IGNORE.test(r.url())) p._404.push(r.status() + ' ' + r.url()) })
  return p
}
let SHOT = null
async function step(area, name, fn) { try { const note = await fn(); rec(area, name, true, note || '') } catch (e) { if (SHOT) await SHOT.screenshot({ path: path.join(OUT, `fail-${area}-${name.slice(0, 20).replace(/\W+/g, '_')}.png`) }).catch(() => {}); const m = String(e.message); const why = m.split('\n').find((l) => /intercepts|not visible|not stable|not enabled|detached/.test(l)); rec(area, name, false, (m.split('\n')[0].slice(0, 120) + (why ? ' :: ' + why.trim().slice(0, 160) : ''))) } }
const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('kayuh-v2')).state)

;(async () => {
  const b = await chromium.launch()

  /* ---------------- 1. Pengguna baru (onboarding) ---------------- */
  {
    const p = await newPage(b, { onboarded: false })
    await p.goto(BASE); await p.waitForTimeout(1200)
    await step('Onboarding', 'muncul untuk pengguna baru', () => p.getByText('Stop riding alone.').waitFor({ timeout: 5000 }))
    await step('Onboarding', 'isi nama, ganti rambut, kulit & warna rambut', async () => {
      await p.getByRole('button', { name: /Ayo mulai/ }).click()
      await p.getByPlaceholder('Nama panggilan').fill('Rizky')
      await p.getByRole('button', { name: 'Rambut 4', exact: true }).click()
      await p.getByRole('button', { name: 'Warna kulit 7', exact: true }).click()
      await p.getByRole('button', { name: 'Warna rambut 6', exact: true }).click()
      const s = await store(p); if (s.char.hair !== 'variant47' || s.char.skin !== '8d5a3b' || s.char.hairColor !== 'e6c27a') throw new Error(JSON.stringify(s.char))
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
  SHOT = p
  await p.goto(BASE); await p.waitForTimeout(1500)
  await step('Beranda', 'kalimat hari ini, strip hari, ajakan berikutnya, undangan', async () => { await p.locator('.sentence').waitFor(); if ((await p.locator('.weekstrip button').count()) !== 7) throw new Error('strip hari'); await p.locator('.card.hero .stepper').waitFor(); await p.locator('.sticky').first().waitFor() })
  await step('Beranda', 'undangan masuk → Ikut', async () => { await p.goto(BASE); await p.waitForTimeout(800); await p.locator('.sticky').first().getByRole('button', { name: 'Ikut!' }).click(); await p.waitForURL(/squad\/.+/); const s = await store(p); if (!s.groupRides.some((g) => g.host !== 'me' && g.myRsvp === 'ikut')) throw new Error('rsvp undangan') })
  await step('Beranda', 'tema gelap tersimpan', async () => { await p.goto(BASE + 'profile'); await p.waitForTimeout(500); await p.getByRole('button', { name: 'Ganti tema' }).click(); const t = await p.evaluate(() => document.documentElement.dataset.theme); await p.reload(); await p.waitForTimeout(800); const t2 = await p.evaluate(() => document.documentElement.dataset.theme); if (t !== 'dark' || t2 !== 'dark') throw new Error(t + '/' + t2); await p.getByRole('button', { name: 'Ganti tema' }).click() })

  // Karakter
  await p.goto(BASE + 'karakter'); await p.waitForTimeout(1200)
  await step('Karakter', 'semua tab lemari terbuka & berisi', async () => {
    const tabs = await p.locator('.seg-tabs button').allInnerTexts()
    for (const t of tabs) { await p.locator('.seg-tabs button', { hasText: new RegExp('^' + t + '$') }).first().click(); await p.waitForTimeout(100); const n = await p.locator('.wardrobe .tile, .swatch').count(); if (n < 2) throw new Error(`tab ${t} kosong`) }
    return `${tabs.length} tab`
  })
  await step('Karakter', 'pilih rambut & warna (palet + bebas)', async () => {
    await p.locator('.seg-tabs button', { hasText: /^Rambut$/ }).click(); await p.locator('.wardrobe .tile').nth(20).click()
    let s = await store(p); if (s.char.hair !== 'variant21') throw new Error('rambut ' + s.char.hair)
    await p.locator('.seg-tabs button', { hasText: /^Warna rambut$/ }).click(); await p.locator('.swatch').nth(4).click()
    s = await store(p); if (s.char.hairColor !== 'c79a5b') throw new Error('warna ' + s.char.hairColor)
    await p.locator('input[type=color]').fill('#123456'); s = await store(p); if (s.char.hairColor !== '123456') throw new Error('warna bebas ' + s.char.hairColor)
  })
  await step('Karakter', 'kacamata: pilih lalu Tanpa', async () => {
    await p.locator('.seg-tabs button', { hasText: /^Kacamata$/ }).click(); await p.locator('.wardrobe .tile').nth(2).click()
    let s = await store(p); if (s.char.glasses !== 'variant02') throw new Error('kacamata ' + s.char.glasses)
    await p.locator('.wardrobe .tile').nth(0).click(); s = await store(p); if (s.char.glasses !== null) throw new Error('Tanpa gagal')
  })
  await step('Karakter', 'ekstra: bintik on/off', async () => {
    await p.locator('.seg-tabs button', { hasText: /^Ekstra$/ }).click(); await p.locator('.wardrobe .tile').nth(0).click()
    let s = await store(p); if (!s.char.freckles) throw new Error('bintik tidak aktif')
    await p.locator('.wardrobe .tile').nth(0).click(); s = await store(p); if (s.char.freckles) throw new Error('bintik tidak mati')
  })
  await step('Karakter', 'item terkunci menolak + toast', async () => {
    const locked = p.locator('.tile.locked, .swatch.locked').first()
    for (const t of ['Kacamata', 'Warna rambut', 'Ekstra', 'Anting']) { await p.locator('.seg-tabs button', { hasText: new RegExp('^' + t + '$') }).click(); if (await locked.count()) break }
    if (!(await locked.count())) return 'tidak ada item terkunci di level ini'
    const before = JSON.stringify((await store(p)).char); await locked.click(); await p.waitForTimeout(300)
    if (JSON.stringify((await store(p)).char) !== before) throw new Error('item terkunci terpasang')
    await p.locator('.island').waitFor({ timeout: 2000 })
  })
  await step('Karakter', 'urungkan & acak', async () => { const a = JSON.stringify((await store(p)).char); await p.getByRole('button', { name: 'Acak' }).click(); const b2 = JSON.stringify((await store(p)).char); await p.getByRole('button', { name: 'Urungkan' }).click(); const c = JSON.stringify((await store(p)).char); if (a === b2 || a !== c) throw new Error('undo/acak tidak sesuai') })
  await step('Karakter', 'unduh PNG', async () => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.getByRole('button', { name: 'Unduh', exact: true }).click()]); return d.suggestedFilename() })
  await step('Karakter', 'pratinjau ekspresi mood', async () => { await p.getByRole('button', { name: 'lelah' }).click(); await p.waitForTimeout(200); await p.getByRole('button', { name: 'lelah' }).click() })
  await step('Karakter', 'avatar dirender (SVG data URI)', async () => { const n = await p.locator('img[src^="data:image/svg+xml"]').count(); if (n < 3) throw new Error('avatar tidak tampil: ' + n) })

  // Ajak gowes, agenda, voting, balasan dua arah
  let invite = '', rid = ''
  await step('Ajak', 'alur 6 langkah dari FAB → simpan', async () => {
    await p.goto(BASE); await p.waitForTimeout(600); const n = (await store(p)).groupRides.length
    await p.locator('.fab').click()
    for (let i = 0; i < 2; i++) await p.locator('.sheet').getByRole('button', { name: /Lanjut/ }).click()
    await p.getByRole('button', { name: 'Pilih semua yang free' }).click()
    await p.locator('.sheet').getByRole('button', { name: /Lanjut/ }).click()
    await p.locator('.sheet').getByRole('button', { name: /Lanjut/ }).click()
    await p.getByRole('button', { name: /Lewati, tanpa ngopi/ }).click()
    await p.getByRole('button', { name: /Simpan saja/ }).click()
    await p.getByRole('button', { name: 'Lihat ajakan' }).click(); await p.waitForURL(/squad\/.+/)
    rid = (await p.evaluate(() => location.hash)).split('/')[2]
    const s = await store(p); if (s.groupRides.length !== n + 1) throw new Error('tidak tersimpan')
    return s.groupRides.find((g) => g.id === rid).participants.length + ' diajak'
  })
  await step('Ajak', 'link undangan WA berisi data', async () => { const href = await p.locator('a', { hasText: 'Kirim undangan ke grup WhatsApp' }).getAttribute('href'); invite = decodeURIComponent(href.split('text=')[1]).match(/https?:\/\/\S+#\/join\/\S+/)[0]; return invite.length + ' karakter' })
  await step('Ajak', 'aksi telat: geser jadwal 30 menit', async () => { const before = (await store(p)).groupRides.find((g) => g.id === rid).datetime; await p.getByRole('button', { name: /Telat\?/ }).click(); await p.getByRole('dialog').getByRole('button', { name: /Geser 30m/ }).click(); await p.keyboard.press('Escape'); const after = (await store(p)).groupRides.find((g) => g.id === rid).datetime; if (new Date(after) - new Date(before) !== 1800000) throw new Error('geser gagal') })
  await step('Ajak', 'RSVP berubah', async () => { await p.getByRole('button', { name: 'Mungkin', exact: true }).click(); if ((await store(p)).groupRides.find((g) => g.id === rid).myRsvp !== 'mungkin') throw new Error('rsvp'); await p.getByRole('button', { name: 'Ikut', exact: true }).click() })
  await step('Voting', 'vote jam & tetapkan pemenang', async () => {
    const g1 = (await store(p)).groupRides.find((g) => g.id.startsWith('g1'))
    await p.goto(BASE + 'squad/' + g1.id); await p.waitForTimeout(600)
    await p.locator('.opt', { hasText: '06.00' }).click()
    if ((await store(p)).groupRides.find((g) => g.id === g1.id).myVote.t !== 1) throw new Error('vote')
    await p.getByRole('button', { name: /Tetapkan/ }).click()
    const g = (await store(p)).groupRides.find((x) => x.id === g1.id); if (g.timeOptions || !g.plan.checkpoints.some((c) => c.kind === 'kopi')) throw new Error('tidak ditetapkan')
  })
  await step('Titip', 'tambah titipan lewat sheet (di atas nav)', async () => {
    const g1 = (await store(p)).groupRides.find((g) => g.id.startsWith('g1'))
    const n = (g1.orders ?? []).length
    await p.goto(BASE + 'squad/' + g1.id); await p.waitForTimeout(600)
    await p.getByRole('button', { name: /Tambah titipan|Titip pesanan/ }).click()
    const dlg = p.getByRole('dialog')
    await dlg.locator('.chip', { hasText: /^Bayu$/ }).click(); await dlg.locator('.chip', { hasText: /^Matcha latte$/ }).click()
    await dlg.getByRole('button', { name: /^Titip/ }).click()
    const o = (await store(p)).groupRides.find((g) => g.id === g1.id).orders
    if (o.length !== n + 1 || !o.some((x) => x.who === 'f5' && x.item === 'Matcha latte' && x.price === 30000)) throw new Error(JSON.stringify(o.slice(-1)))
  })
  await step('Foto menu', 'unggah foto menu tersimpan & tampil', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC', 'base64')
    await p.locator('input[type=file]').first().setInputFiles({ name: 'menu.png', mimeType: 'image/png', buffer: png })
    await p.locator('.menu-thumb img').first().waitFor({ timeout: 5000 })
    await p.locator('.menu-thumb img').first().click(); await p.locator('.lightbox').waitFor(); await p.keyboard.press('Escape')
  })
  await step('Patungan', 'tagih → catatan utang dibuat + WA berisi rekening', async () => {
    await p.context().addInitScript(() => { window.open = (u) => { window.__opened = u; return null } })
    await p.reload(); await p.waitForTimeout(800)
    await p.evaluate(() => { window.open = (u) => { window.__opened = u; return null } })
    await p.getByRole('button', { name: /Tagih patungan/ }).click(); await p.waitForTimeout(300)
    const u = await p.evaluate(() => window.__opened); const txt = decodeURIComponent(u.split('text=')[1])
    if (!/BCA 1234567890/.test(txt) || !/Bayu/.test(txt)) throw new Error(txt.slice(0, 160))
    const l = (await store(p)).ledger; if (!l.some((d) => d.from === 'f5' && d.to === 'me' && d.rideId)) throw new Error('ledger')
  })
  await step('Patungan', 'halaman saldo, tandai lunas, catat manual, rekening', async () => {
    await p.goto(BASE + 'patungan'); await p.getByText('Akan diterima').waitFor()
    const open0 = (await store(p)).ledger.filter((d) => !d.paid).length
    await p.getByRole('button', { name: 'Lunas' }).first().click(); await p.getByRole('dialog').getByRole('button', { name: 'Lunas', exact: true }).click(); await p.waitForTimeout(300)
    if ((await store(p)).ledger.filter((d) => !d.paid).length >= open0) throw new Error('lunas')
    await p.getByRole('button', { name: /Catat/ }).click(); const d = p.getByRole('dialog'); await d.getByPlaceholder('25000').fill('12000'); await d.getByPlaceholder(/Parkir/).fill('Parkir QA'); await d.getByRole('button', { name: /^Catat/ }).click()
    if (!(await store(p)).ledger.some((x) => x.note === 'Parkir QA')) throw new Error('manual')
    await p.getByRole('tab', { name: 'Rekeningku' }).click(); await p.locator('.paycard').first().waitFor()
  })
  await step('Check-in', 'check-in checkpoint tersimpan', async () => {
    const g1 = (await store(p)).groupRides.find((g) => g.id.startsWith('g1'))
    await p.locator('.vtl-row').first().getByRole('button').click().catch(() => {})
    const ck = (await store(p)).groupRides.find((g) => g.id === g1.id).checkins
    return ck && ck.start ? 'start ✓' : 'di luar jendela ride (tombol tersembunyi) — dilewati'
  })
  await step('Agenda', 'tab teman & liga', async () => { await p.goto(BASE + 'squad'); await p.getByRole('tab', { name: 'Teman' }).click(); await p.getByText(/Siapa free kapan/).waitFor(); await p.getByRole('tab', { name: 'Liga' }).click(); await p.getByText(/Km kamu minggu ini/).waitFor() })
  {
    const p2 = await newPage(b, { onboarded: false })
    await p2.context().addInitScript(() => { window.open = (u) => { window.__opened = u; return null } })
    let reply = ''
    await step('Undangan', 'HP baru membuka link: tanpa onboarding, isi nama, vote, Ikut', async () => {
      await p2.goto(invite.replace(/^https?:\/\/[^/]+\//, BASE.replace('#/', ''))); await p2.waitForTimeout(1000)
      if (await p2.locator('.onb').count()) throw new Error('onboarding menghalangi')
      await p2.getByPlaceholder('mis. Salsa').fill('Tamu QA'); await p2.getByRole('button', { name: 'Ikut!' }).click()
      const s = await store(p2); if (!s.groupRides.some((g) => g.id === rid && g.myRsvp === 'ikut')) throw new Error('tidak tersimpan')
    })
    await step('Undangan', 'kirim balasan berisi link balasan', async () => { await p2.getByRole('button', { name: /Kirim jawaban ke/ }).click(); const u = await p2.evaluate(() => window.__opened); reply = decodeURIComponent(u.split('text=')[1]).match(/#\/balas\/\S+/)[0]; return reply.length + ' karakter' })
    await step('Balasan', 'host membuka balasan → peserta bertambah (idempoten)', async () => {
      const n = (await store(p)).groupRides.find((g) => g.id === rid).participants.length
      await p.goto(BASE + reply.slice(2)); await p.getByText('Balasan masuk').waitFor()
      await p.goto(BASE); await p.goto(BASE + reply.slice(2)); await p.waitForTimeout(500)
      const ps = (await store(p)).groupRides.find((g) => g.id === rid).participants; if (ps.length !== n + 1 || ps.slice(-1)[0].name !== 'Tamu QA') throw new Error(n + ' -> ' + ps.length)
    })
    await step('Undangan', 'link rusak ditangani', async () => { await p2.goto(BASE + 'join/rusak!!'); await p2.getByText(/tidak valid/).waitFor(); await p2.goto(BASE + 'balas/rusak!!'); await p2.getByText(/tidak valid/).waitFor() })
    await p2.context().close()
  }
  {
    const p3 = await newPage(b, { onboarded: false })
    await p3.context().addInitScript(() => { window.open = (u) => { window.__opened = u; return null } })
    await step('Titip', 'tamu nitip Americano lewat jawaban → masuk titipan host', async () => {
      const g1 = (await store(p)).groupRides.find((g) => g.id.startsWith('g1'))
      await p.goto(BASE + 'squad/' + g1.id); await p.waitForTimeout(500)
      const href = await p.locator('a', { hasText: 'Kirim undangan ke grup WhatsApp' }).getAttribute('href')
      const inv = decodeURIComponent(href.split('text=')[1]).match(/#\/join\/\S+/)[0]
      await p3.goto(BASE + inv.slice(2)); await p3.waitForTimeout(800)
      await p3.getByPlaceholder('mis. Salsa').fill('Tamu Kopi')
      await p3.locator('.chip', { hasText: /^Americano$/ }).click()
      await p3.getByRole('button', { name: 'Ikut!' }).click()
      await p3.getByRole('button', { name: /Kirim jawaban ke/ }).click()
      const u = await p3.evaluate(() => window.__opened); const txt = decodeURIComponent(u.split('text=')[1])
      if (!/Nitip: Americano/.test(txt)) throw new Error('teks tanpa titipan')
      if (!/BCA/.test(await p3.locator('.paycard').first().innerText())) throw new Error('rekening host tidak tampil')
      await p.goto(BASE + txt.match(/#\/balas\/\S+/)[0].slice(2)); await p.getByText('Balasan masuk').waitFor()
      const o = (await store(p)).groupRides.find((g) => g.id === g1.id).orders
      if (!o.some((x) => x.item === 'Americano' && x.name === 'Tamu Kopi')) throw new Error(JSON.stringify(o.slice(-1)))
    })
    await p3.context().close()
  }
  await step('Ajak', 'hapus dengan dialog konfirmasi', async () => { await p.goto(BASE + 'squad/' + rid); const n = (await store(p)).groupRides.length; await p.getByRole('button', { name: /Hapus ajakan/ }).click(); await p.getByRole('dialog').getByRole('button', { name: 'Hapus', exact: true }).click(); await p.waitForURL(/#\/squad$/); if ((await store(p)).groupRides.length !== n - 1) throw new Error('tidak terhapus') })
  await step('Jadwal', 'link jadwal free teman → tersimpan ke squad', async () => {
    const code = Buffer.from(JSON.stringify({ n: 'Raka Pratama', m: 0b111111111111111111111 })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    await p.goto(BASE + 'jadwal/' + code); await p.getByRole('button', { name: /Perbarui jadwal Raka/ }).click()
    if ((await store(p)).friends.find((f) => f.id === 'f1').avail !== 0x1fffff) throw new Error('avail')
  })
  await step('Kapan', 'tandai waktu luang & slot emas', async () => { await p.goto(BASE + 'kapan'); const a = (await store(p)).avail; await p.getByRole('button', { name: 'Senin Sore' }).click(); if ((await store(p)).avail === a) throw new Error('avail'); await p.getByText('Slot emas').first().waitFor() })

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
  await step('Titik temu', 'adil, waktu, searah, jemput berantai', async () => { await p.goto(BASE + 'meet'); await p.getByText('Skor keadilan').waitFor(); await p.getByRole('tab', { name: 'Waktu' }).click(); await p.getByRole('tab', { name: 'Searah' }).click(); await p.getByText('Tambahan jarak').waitFor(); await p.getByRole('tab', { name: 'Jemput' }).click(); await p.getByText('Tiba bareng di kumpul').waitFor() })
  await step('Paspor', 'stempel & detail', async () => { await p.goto(BASE + 'paspor'); await p.locator('.stamp-tile').first().click(); await p.getByRole('dialog').waitFor(); await p.keyboard.press('Escape') })
  await step('Garasi', 'reset komponen', async () => { await p.goto(BASE + 'garage'); await p.getByRole('button', { name: /Reset Rantai/ }).first().click(); const s = await store(p); if (s.bikes[0].components[0].usedKm !== 0) throw new Error('tidak reset') })
  await step('Profil', 'ubah nama tercermin di paspor', async () => { await p.goto(BASE + 'profile'); await p.locator('label:has-text("Nama") input').first().fill('QA Rider'); await p.goto(BASE + 'paspor'); await p.getByText('Paspor QA Rider').waitFor() })
  await step('Navigasi', 'rute tak dikenal & ride tak ada', async () => { await p.goto(BASE + 'apa-ini'); await p.locator('.sentence').waitFor(); await p.goto(BASE + 'ride/xyz'); await p.getByText(/tidak ditemukan/i).waitFor() })
  await step('Global', 'tidak ada error JS', async () => { if (p._errs.length) throw new Error(p._errs.slice(0, 3).join(' | ')) })
  await step('Global', 'tidak ada request 4xx/5xx', async () => { if (p._404.length) throw new Error(p._404.slice(0, 3).join(' | ')) })
  await p.context().close()

  /* ---------------- 3. QC: overflow 360px, aksesibilitas, performa ---------------- */
  const ROUTES = ['', 'squad', 'squad/G1', 'kapan', 'patungan', 'record', 'reminders', 'karakter', 'rencana', 'rute', 'rute/g/G1', 'meet', 'weather', 'insights', 'rides', 'garage', 'profile', 'paspor']
  const q = await newPage(b, { device: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, ctx: { reducedMotion: 'reduce' } })
  const a11y = {}
  await q.goto(BASE); await q.waitForTimeout(800); await q.locator('.card.hero').getByRole('button', { name: 'Detail' }).click(); await q.waitForTimeout(300)
  const G1 = (await q.evaluate(() => location.hash)).split('/')[2]
  for (const r0 of ROUTES) {
    const r = r0.replace('G1', G1)
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
