import type { Ride, Settings } from './types'
import { clamp, dayKey } from './util'

export function metFor(speed: number): number {
  if (speed < 16) return 4
  if (speed < 19) return 6.8
  if (speed < 22) return 8
  if (speed < 25) return 10
  if (speed < 30) return 12
  return 15.8
}

export function calories(speed: number, movingSec: number, weightKg: number, elevationM = 0): number {
  // MET dasar + kerja melawan gravitasi (efisiensi ~24%)
  const base = metFor(speed) * weightKg * (movingSec / 3600)
  const climb = (weightKg + 9) * 9.81 * elevationM / 0.24 / 4184
  return Math.round(base + climb)
}

/** Training Stress Score perkiraan, tanpa power meter. */
export function rideTSS(r: Ride, s: Settings): number {
  const hours = r.movingSec / 3600
  const climbPerKm = r.distanceKm > 0 ? r.elevationM / r.distanceKm : 0
  let IF = r.avgSpeed / s.thresholdSpeed + climbPerKm * 0.012
  if (r.avgHr) IF = (IF + r.avgHr / (s.maxHr * 0.9)) / 2
  IF = clamp(IF, 0.45, 1.15)
  return Math.round(hours * IF * IF * 100)
}

export interface LoadPoint { day: string; tss: number; ctl: number; atl: number; tsb: number }

/** Fitness (CTL, 42 hari), Kelelahan (ATL, 7 hari), Form (TSB = CTL - ATL kemarin). */
export function trainingLoad(rides: Ride[], s: Settings, days = 120): LoadPoint[] {
  const byDay = new Map<string, number>()
  for (const r of rides) {
    const k = dayKey(new Date(r.date))
    byDay.set(k, (byDay.get(k) ?? 0) + rideTSS(r, s))
  }
  const out: LoadPoint[] = []
  let ctl = 0
  let atl = 0
  const today = new Date()
  const warm = 60
  for (let i = days + warm; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const k = dayKey(d)
    const tss = byDay.get(k) ?? 0
    const tsb = ctl - atl
    ctl = ctl + (tss - ctl) / 42
    atl = atl + (tss - atl) / 7
    if (i <= days) out.push({ day: k, tss, ctl, atl, tsb })
  }
  return out
}

export interface WeekStat { start: Date; km: number; sec: number; elev: number; rides: number }

export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (x.getDay() + 6) % 7 // Senin = 0
  x.setDate(x.getDate() - dow)
  return x
}

export function weekly(rides: Ride[], weeks = 12): WeekStat[] {
  const now = weekStart(new Date())
  const res: WeekStat[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now)
    start.setDate(start.getDate() - i * 7)
    res.push({ start, km: 0, sec: 0, elev: 0, rides: 0 })
  }
  for (const r of rides) {
    const ws = weekStart(new Date(r.date)).getTime()
    const w = res.find((x) => x.start.getTime() === ws)
    if (w) { w.km += r.distanceKm; w.sec += r.movingSec; w.elev += r.elevationM; w.rides++ }
  }
  return res
}

export function dailyKm(rides: Ride[], days: number): { day: string; km: number }[] {
  const m = new Map<string, number>()
  for (const r of rides) { const k = dayKey(new Date(r.date)); m.set(k, (m.get(k) ?? 0) + r.distanceKm) }
  const out = []
  const t = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(t); d.setDate(d.getDate() - i)
    const k = dayKey(d)
    out.push({ day: k, km: m.get(k) ?? 0 })
  }
  return out
}

export function streakWeeks(rides: Ride[]): number {
  const ws = weekly(rides, 52)
  let n = 0
  for (let i = ws.length - 1; i >= 0; i--) {
    if (ws[i].rides > 0) n++
    else if (i === ws.length - 1) continue // minggu ini belum gowes: belum putus
    else break
  }
  return n
}

export function readiness(load: LoadPoint[]): { score: number; label: string; advice: string } {
  const last = load[load.length - 1]
  if (!last) return { score: 70, label: 'Siap', advice: 'Mulai catat gowes untuk analisis kesiapan.' }
  const tsb = last.ctl - last.atl
  const score = Math.round(clamp(72 + tsb * 1.3, 5, 99))
  if (tsb > 15) return { score, label: 'Segar banget', advice: 'Tubuh sangat pulih. Hari ideal untuk ride panjang atau kejar rekor.' }
  if (tsb > 5) return { score, label: 'Prima', advice: 'Kondisi bagus untuk latihan intensitas sedang–tinggi.' }
  if (tsb > -10) return { score, label: 'Seimbang', advice: 'Beban latihan pas. Ride tempo 1–2 jam aman.' }
  if (tsb > -25) return { score, label: 'Lelah produktif', advice: 'Kamu sedang membangun fitness. Pilih ride santai zona 2.' }
  return { score, label: 'Butuh istirahat', advice: 'Kelelahan menumpuk. Istirahat atau recovery ride < 45 menit.' }
}

export interface Insight { title: string; body: string; tone: 'good' | 'warn' | 'info' | 'accent' }

export function insights(rides: Ride[], load: LoadPoint[], s: Settings): Insight[] {
  const out: Insight[] = []
  const ws = weekly(rides, 8)
  const thisW = ws[ws.length - 1]
  const lastW = ws[ws.length - 2]
  const avg4 = ws.slice(-5, -1).reduce((a, w) => a + w.km, 0) / 4

  // Aturan 10%: lonjakan volume = risiko cedera
  if (lastW && avg4 > 0 && thisW.km > avg4 * 1.3) {
    out.push({ tone: 'warn', title: 'Volume naik terlalu cepat', body: `Minggu ini ${Math.round(thisW.km)} km, ${Math.round((thisW.km / avg4 - 1) * 100)}% di atas rata-rata 4 minggu. Jaga kenaikan ≤10–15% per minggu supaya tidak cedera lutut.` })
  }
  const remain = s.weeklyGoalKm - thisW.km
  const dow = (new Date().getDay() + 6) % 7
  const daysLeft = 7 - dow
  if (remain > 0) {
    out.push({ tone: 'accent', title: `${Math.round(remain)} km lagi ke target`, body: `Sisa ${daysLeft} hari. Cukup ${Math.ceil(remain / Math.max(1, Math.min(daysLeft, 3)))} km per ride dalam ${Math.min(daysLeft, 3)} ride.` })
  } else {
    out.push({ tone: 'good', title: 'Target mingguan tercapai', body: `${Math.round(thisW.km)} / ${s.weeklyGoalKm} km. Mau naikkan target ${Math.round(s.weeklyGoalKm * 1.1)} km minggu depan?` })
  }

  // Pola waktu: kapan kamu paling cepat
  const buckets: Record<string, { n: number; spd: number }> = {}
  for (const r of rides) {
    const h = new Date(r.date).getHours()
    const b = h < 7 ? 'subuh (sebelum 07.00)' : h < 10 ? 'pagi (07–10)' : h < 16 ? 'siang' : 'sore/malam'
    buckets[b] ??= { n: 0, spd: 0 }
    buckets[b].n++
    buckets[b].spd += r.avgSpeed
  }
  const ranked = Object.entries(buckets).filter(([, v]) => v.n >= 3).map(([k, v]) => [k, v.spd / v.n] as const).sort((a, b) => b[1] - a[1])
  if (ranked.length >= 2 && ranked[0][1] - ranked[ranked.length - 1][1] >= 0.8) {
    const diff = ranked[0][1] - ranked[ranked.length - 1][1]
    out.push({ tone: 'info', title: `Kamu paling kencang saat ${ranked[0][0]}`, body: `Rata-rata ${ranked[0][1].toFixed(1)} km/j, ${diff.toFixed(1)} km/j lebih cepat dibanding ${ranked[ranked.length - 1][0]}. Jadwalkan sesi kecepatan di jam ini.` })
  }

  // Tren fitness 4 minggu
  if (load.length > 30) {
    const now = load[load.length - 1].ctl
    const before = load[load.length - 29].ctl
    const pct = before > 0 ? ((now - before) / before) * 100 : 0
    if (pct > 3) out.push({ tone: 'good', title: `Fitness naik ${pct.toFixed(0)}% dalam 4 minggu`, body: 'Konsistensimu berbuah. Pertahankan pola 3–4 ride per minggu.' })
    else if (pct < -5) out.push({ tone: 'warn', title: `Fitness turun ${Math.abs(pct).toFixed(0)}%`, body: 'Frekuensi ride menurun. Satu ride pendek 30 menit pun cukup menahan penurunan.' })
  }

  // Climbing
  const climbs = rides.filter((r) => r.elevationM / Math.max(1, r.distanceKm) > 12)
  if (rides.length > 10 && climbs.length / rides.length < 0.1) {
    out.push({ tone: 'info', title: 'Tambah menu tanjakan', body: 'Kurang dari 10% ride-mu berisi tanjakan. Satu ride bukit per 2 minggu meningkatkan power & VO₂max.' })
  }
  return out
}

export const CO2_PER_KM_MOTOR = 0.09 // kg CO₂ per km motor bensin
export const KCAL_NASI_GORENG = 550

export interface Badge { id: string; icon: string; name: string; desc: string; got: boolean; progress: number }

export function badges(rides: Ride[]): Badge[] {
  const totalKm = rides.reduce((a, r) => a + r.distanceKm, 0)
  const maxKm = Math.max(0, ...rides.map((r) => r.distanceKm))
  const totalElev = rides.reduce((a, r) => a + r.elevationM, 0)
  const subuh = rides.filter((r) => new Date(r.date).getHours() < 6).length
  const squad = rides.filter((r) => (r.friendIds?.length ?? 0) > 0).length
  const streak = streakWeeks(rides)
  const mk = (id: string, icon: string, name: string, desc: string, v: number, target: number): Badge => ({ id, icon, name, desc, got: v >= target, progress: clamp(v / target, 0, 1) })
  return [
    mk('100k', '◎', 'Century', 'Satu ride 100 km', maxKm, 100),
    mk('1000', '∞', 'Seribu Kilo', 'Total 1.000 km', totalKm, 1000),
    mk('everest', '▲', 'Everesting', 'Total tanjakan 8.849 m', totalElev, 8849),
    mk('subuh', '☾', 'Pejuang Subuh', '10 ride sebelum jam 6', subuh, 10),
    mk('squad', '⁂', 'Anak Squad', '10 ride bareng teman', squad, 10),
    mk('streak', '≡', 'Konsisten', 'Streak 8 minggu', streak, 8),
  ]
}

export function level(rides: Ride[]): { lvl: number; xp: number; next: number; cur: number } {
  const xp = Math.round(rides.reduce((a, r) => a + r.distanceKm * 10 + r.elevationM, 0))
  let lvl = 1
  let need = 1000
  let acc = 0
  while (xp >= acc + need) { acc += need; lvl++; need = Math.round(need * 1.25) }
  return { lvl, xp, cur: xp - acc, next: need }
}

export const LEVEL_TITLES = ['Pemula', 'Penggowes', 'Penjelajah', 'Pemburu Tanjakan', 'Road Warrior', 'Kapten Squad', 'Legenda Aspal', 'Dewa Kayuh']
export const levelTitle = (l: number) => LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((l - 1) / 2))]

/* ======================= Analitik lanjutan ======================= */

/** Estimasi daya (watt) dari fisika: rolling + aero + gravitasi, tanpa power meter. */
export function estPower(r: Ride, weightKg: number): number {
  const m = weightKg + 9
  const v = r.avgSpeed / 3.6
  const crr = r.type === 'gravel' || r.type === 'mtb' ? 0.009 : 0.0055
  const cda = r.type === 'commute' ? 0.42 : 0.33
  const rho = 1.15 // udara panas tropis
  const roll = crr * m * 9.81 * v
  const aero = 0.5 * rho * cda * v * v * v * 1.12 // faktor variabilitas kecepatan
  const climb = (m * 9.81 * r.elevationM) / Math.max(1, r.movingSec)
  return Math.round((roll + aero + climb) / 0.97)
}

export function estFTP(rides: Ride[], weightKg: number): { ftp: number; wkg: number; cat: string; catIdx: number } {
  const since = Date.now() - 90 * 86400000
  const cands = rides.filter((r) => r.movingSec >= 40 * 60 && new Date(r.date).getTime() >= since).map((r) => {
    const p = estPower(r, weightKg)
    const hrs = r.movingSec / 3600
    // daya rata-rata ride panjang < FTP; koreksi berdasarkan durasi
    return p * (hrs > 2.5 ? 1.18 : hrs > 1.5 ? 1.1 : 1.04)
  })
  const ftp = Math.round(cands.length ? Math.max(...cands) * 0.95 : 150)
  const wkg = ftp / weightKg
  const cats = ['Pemula', 'Rekreasi', 'Penggemar', 'Kompetitif', 'Elite']
  const catIdx = wkg < 2 ? 0 : wkg < 2.8 ? 1 : wkg < 3.5 ? 2 : wkg < 4.3 ? 3 : 4
  return { ftp, wkg, cat: cats[catIdx], catIdx }
}

/** Intensity factor kasar 0.4–1.15 */
export function rideIF(r: Ride, s: Settings): number {
  const hours = r.movingSec / 3600
  return Math.sqrt(rideTSS(r, s) / Math.max(0.1, hours) / 100)
}

/** Distribusi intensitas (berbobot waktu): ringan / sedang / berat — cek aturan 80/20. */
export function polarization(rides: Ride[], s: Settings, days = 28): { easy: number; mod: number; hard: number } {
  const since = Date.now() - days * 86400000
  let e = 0, m = 0, h = 0
  for (const r of rides.filter((x) => new Date(x.date).getTime() >= since)) {
    const z = r.zones ?? []
    if (z.length) {
      const seg = r.movingSec / z.length
      for (const k of z) { if (k <= 2) e += seg; else if (k === 3) m += seg; else h += seg }
    } else {
      const f = rideIF(r, s)
      if (f < 0.75) e += r.movingSec; else if (f < 0.88) m += r.movingSec; else h += r.movingSec
    }
  }
  const t = e + m + h || 1
  return { easy: e / t, mod: m / t, hard: h / t }
}

/** Efisiensi aerobik: km/j per 100 bpm — naik = jantung makin efisien. */
export function efficiencyTrend(rides: Ride[], weeks = 12): { label: string; ef: number }[] {
  const ws = weekly(rides, weeks)
  return ws.map((w) => {
    const rs = rides.filter((r) => r.avgHr && weekStart(new Date(r.date)).getTime() === w.start.getTime() && r.elevationM / Math.max(1, r.distanceKm) < 8)
    const ef = rs.length ? rs.reduce((a, r) => a + (r.avgSpeed / (r.avgHr ?? 1)) * 100, 0) / rs.length : NaN
    return { label: `${w.start.getDate()}/${w.start.getMonth() + 1}`, ef }
  }).filter((x) => !Number.isNaN(x.ef))
}

/** Prediksi waktu tempuh jarak lain (rumus Riegel) dari performa terbaik 30 hari. */
export function predictTimes(rides: Ride[], targets = [50, 100, 160]): { km: number; sec: number; spd: number }[] {
  const since = Date.now() - 45 * 86400000
  const rs = rides.filter((r) => new Date(r.date).getTime() >= since && r.distanceKm >= 15)
  if (!rs.length) return []
  // pilih ride dengan skor performa (kecepatan disesuaikan jarak) tertinggi, koreksi tanjakan
  const best = rs.reduce((b, r) => {
    const adj = (x: Ride) => x.avgSpeed * Math.pow(x.distanceKm, 0.06) * (1 + x.elevationM / Math.max(1, x.distanceKm) / 100)
    return adj(r) > adj(b) ? r : b
  })
  const flatSpd = best.avgSpeed * (1 + best.elevationM / Math.max(1, best.distanceKm) / 100)
  const t1 = (best.distanceKm / flatSpd) * 3600
  return targets.map((km) => {
    const sec = t1 * Math.pow(km / best.distanceKm, 1.06)
    return { km, sec, spd: km / (sec / 3600) }
  })
}

/** Titik manis: rentang Form saat kamu merasa paling enak (dari cek-rasa setelah ride). */
export function feelSweetSpot(rides: Ride[], load: LoadPoint[]): { pts: { tsb: number; feel: number }[]; lo: number; hi: number; avgIn: number; avgOut: number } | null {
  const byDay = new Map(load.map((p) => [p.day, p.tsb]))
  const pts = rides.filter((r) => r.feel != null).map((r) => ({ tsb: byDay.get(dayKey(new Date(r.date))) ?? NaN, feel: r.feel! })).filter((p) => !Number.isNaN(p.tsb))
  if (pts.length < 8) return null
  let best = { lo: 0, hi: 10, score: -1 }
  for (let lo = -30; lo <= 20; lo += 2) {
    const hi = lo + 14
    const inn = pts.filter((p) => p.tsb >= lo && p.tsb <= hi)
    if (inn.length < 4) continue
    const avg = inn.reduce((a, p) => a + p.feel, 0) / inn.length
    if (avg > best.score) best = { lo, hi, score: avg }
  }
  const out = pts.filter((p) => p.tsb < best.lo || p.tsb > best.hi)
  return { pts, lo: best.lo, hi: best.hi, avgIn: best.score, avgOut: out.length ? out.reduce((a, p) => a + p.feel, 0) / out.length : 0 }
}

/** Perkiraan jam pemulihan tersisa dari ride terakhir yang berat. */
export function recovery(rides: Ride[], s: Settings): { hoursLeft: number; total: number; pct: number } {
  const last = rides[rides.length - 1]
  if (!last) return { hoursLeft: 0, total: 0, pct: 1 }
  const tss = rideTSS(last, s)
  const total = Math.round(Math.min(72, tss < 50 ? tss * 0.25 + 2 : tss * 0.35))
  const end = new Date(last.date).getTime() + last.movingSec * 1000
  const elapsed = (Date.now() - end) / 3600000
  const left = Math.max(0, Math.round(total - elapsed))
  return { hoursLeft: left, total, pct: clamp(elapsed / total, 0, 1) }
}

/** Jam-jam favoritmu gowes (24 bucket, km). */
export function rideClock(rides: Ride[]): number[] {
  const b = new Array(24).fill(0)
  for (const r of rides) {
    const st = new Date(r.date)
    const hrs = r.movingSec / 3600
    for (let i = 0; i < Math.ceil(hrs); i++) b[(st.getHours() + i) % 24] += r.distanceKm / Math.ceil(hrs)
  }
  return b
}

/** Zona intensitas sintetis dari profil elevasi & kecepatan (untuk ride tanpa sensor). */
export function synthZones(r: Ride, s: Settings, n = 40): number[] {
  const el = r.elevations ?? []
  const f = rideIF(r, s)
  const base = f < 0.65 ? 1.3 : f < 0.75 ? 1.8 : f < 0.85 ? 2.4 : 3.0
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i / n) * Math.max(0, el.length - 1))
    const b = Math.floor(((i + 1) / n) * Math.max(0, el.length - 1))
    const grade = el.length > 1 ? (el[b] - el[a]) / ((r.distanceKm * 1000) / n) : 0
    const warm = i < 3 ? -0.8 : i > n - 3 ? -1 : 0
    const wob = Math.sin(i * 1.3 + r.distanceKm) * 0.6
    out.push(Math.round(clamp(base + grade * 32 + warm + wob, 1, 5)))
  }
  return out
}

export const WORKOUTS = {
  rec: { l: 'Pemulihan', short: 'REC', tss: 25, min: 40, desc: 'Zona 1, kaki berputar ringan' },
  end: { l: 'Endurance', short: 'END', tss: 65, min: 90, desc: 'Zona 2, bisa sambil ngobrol' },
  tempo: { l: 'Tempo', short: 'TMP', tss: 80, min: 75, desc: 'Zona 3, napas berat tapi stabil' },
  int: { l: 'Interval', short: 'INT', tss: 90, min: 70, desc: '5×4 menit zona 4–5' },
  long: { l: 'Long ride', short: 'LNG', tss: 170, min: 210, desc: 'Ride panjang akhir pekan' },
} as const

/** Proyeksi CTL/ATL/TSB ke depan memakai rencana latihan. */
export function project(load: LoadPoint[], plannedTss: number[]): LoadPoint[] {
  const last = load[load.length - 1]
  let ctl = last?.ctl ?? 0
  let atl = last?.atl ?? 0
  const out: LoadPoint[] = []
  const d0 = new Date()
  plannedTss.forEach((tss, i) => {
    const d = new Date(d0); d.setDate(d.getDate() + i + 1)
    const tsb = ctl - atl
    ctl += (tss - ctl) / 42
    atl += (tss - atl) / 7
    out.push({ day: dayKey(d), tss, ctl, atl, tsb })
  })
  return out
}
