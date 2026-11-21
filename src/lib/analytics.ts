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
