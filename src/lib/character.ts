import type { CharConfig, Ride } from './types'
import { clamp } from './util'
import { badges, level, readiness, trainingLoad, weekly } from './analytics'
import type { Settings } from './types'

export interface Opt { l: string; req?: { level?: number; badge?: string } }

export const SKINS = ['#ffffff', '#f7dcc4', '#e5b78f', '#b97f55', '#7b4f31']
export const HAIR_COLORS = ['#111111', '#5a3a22', '#c79a5b', '#8a8a85', '#ff4d1f', '#2f6fed']
export const JERSEY_COLORS = ['#111111', '#ff4d1f', '#f3d40b', '#ffffff', '#2f6fed', '#1f9d6a', '#e87ba4']

export const OPTIONS: Record<keyof CharConfig, Opt[]> = {
  skin: SKINS.map((_, i) => ({ l: ['Doodle', 'Terang', 'Sawo', 'Cokelat', 'Gelap'][i] })),
  hair: [{ l: 'Keriting' }, { l: 'Cepak' }, { l: 'Belah samping' }, { l: 'Panjang' }, { l: 'Cepol' }, { l: 'Botak' }, { l: 'Hijab' }, { l: 'Mohawk', req: { level: 6 } }],
  hairColor: HAIR_COLORS.map((_, i) => ({ l: ['Hitam', 'Cokelat', 'Pirang', 'Uban', 'Oranye', 'Biru'][i], req: i >= 4 ? { level: 8 } : undefined })),
  headgear: [{ l: 'Tanpa' }, { l: 'Helm aero' }, { l: 'Cap sepeda' }, { l: 'Bandana' }, { l: 'Helm MTB', req: { badge: 'everest' } }, { l: 'Mahkota', req: { level: 12 } }],
  glasses: [{ l: 'Tanpa' }, { l: 'Bulat' }, { l: 'Sport' }, { l: 'Hitam' }, { l: 'Visor', req: { badge: '1000' } }],
  jersey: [{ l: 'Polos' }, { l: 'Garis' }, { l: 'Polkadot KOM', req: { badge: 'everest' } }, { l: 'Parang', req: { level: 4 } }, { l: 'Split tim', req: { badge: 'squad' } }],
  jerseyColor: JERSEY_COLORS.map((_, i) => ({ l: ['Hitam', 'Oranye', 'Kuning', 'Putih', 'Biru', 'Hijau', 'Pink'][i] })),
  bike: [{ l: 'Road' }, { l: 'MTB' }, { l: 'Lipat' }, { l: 'Fixie', req: { level: 3 } }],
  acc: [{ l: 'Tanpa' }, { l: 'Bendera', req: { level: 2 } }, { l: 'Buff' }, { l: 'Medali', req: { badge: '100k' } }, { l: 'Bel emas', req: { badge: 'streak' } }],
}

export const PART_TABS: { k: keyof CharConfig; l: string }[] = [
  { k: 'hair', l: 'Rambut' }, { k: 'headgear', l: 'Kepala' }, { k: 'glasses', l: 'Kacamata' }, { k: 'jersey', l: 'Jersey' },
  { k: 'jerseyColor', l: 'Warna' }, { k: 'skin', l: 'Kulit' }, { k: 'hairColor', l: 'Warna rambut' }, { k: 'acc', l: 'Aksesori' },
]

export const defaultChar: CharConfig = { skin: 0, hair: 0, hairColor: 0, headgear: 1, glasses: 2, jersey: 1, jerseyColor: 1, bike: 0, acc: 0 }

export function unlocked(o: Opt, lvl: number, gotBadges: Set<string>): boolean {
  if (!o.req) return true
  if (o.req.level && lvl < o.req.level) return false
  if (o.req.badge && !gotBadges.has(o.req.badge)) return false
  return true
}

export function reqText(o: Opt): string {
  if (!o.req) return ''
  if (o.req.level) return `Level ${o.req.level}`
  const names: Record<string, string> = { everest: 'Lencana Everesting', '1000': 'Lencana Seribu Kilo', squad: 'Lencana Anak Squad', '100k': 'Lencana Century', streak: 'Lencana Konsisten' }
  return names[o.req.badge!] ?? 'Lencana'
}

export function seededChar(seed: number): CharConfig {
  let s = seed * 9301 + 49297
  const r = (n: number) => { s = (s * 9301 + 49297) % 233280; return Math.floor((s / 233280) * n) }
  return { skin: r(5), hair: r(7), hairColor: r(4), headgear: r(4), glasses: r(4), jersey: r(2) === 0 ? 0 : 1, jerseyColor: r(7), bike: r(3), acc: r(3) === 0 ? 2 : 0 }
}

/* ---------------- Kelas & statistik RPG dari data ---------------- */

export interface Stat { k: string; l: string; v: number; hint: string }
export interface RiderClass { id: string; name: string; tagline: string; power: string; emblem: string }

export const CLASSES: Record<string, RiderClass> = {
  climb: { id: 'climb', name: 'Kambing Gunung', tagline: 'Tanjakan adalah taman bermainmu.', power: 'Gradien 10% terasa seperti datar', emblem: '▲' },
  speed: { id: 'speed', name: 'Sprinter Kilat', tagline: 'Garis finish selalu milikmu.', power: 'Lonjakan kecepatan di 200 m terakhir', emblem: 'ϟ' },
  endu: { id: 'endu', name: 'Penjelajah', tagline: 'Makin jauh, makin hidup.', power: 'Tidak kenal kata “balik kanan”', emblem: '∞' },
  cons: { id: 'cons', name: 'Komuter Baja', tagline: 'Hujan, panas, macet — tetap gowes.', power: 'Streak tak terpatahkan', emblem: '≡' },
  social: { id: 'social', name: 'Kapten Squad', tagline: 'Tidak ada yang ditinggal.', power: 'Satu ajakan, sepuluh yang datang', emblem: '⁂' },
}

export function riderStats(rides: Ride[]): Stat[] {
  const since = Date.now() - 60 * 86400000
  const rs = rides.filter((r) => new Date(r.date).getTime() >= since)
  const n = Math.max(1, rs.length)
  const km = rs.reduce((a, r) => a + r.distanceKm, 0)
  const climbPerKm = rs.reduce((a, r) => a + r.elevationM, 0) / Math.max(1, km)
  const avgSpd = rs.reduce((a, r) => a + r.avgSpeed * r.distanceKm, 0) / Math.max(1, km)
  const maxKm = Math.max(0, ...rs.map((r) => r.distanceKm))
  const perWeek = rs.length / (60 / 7)
  const social = rs.filter((r) => (r.friendIds?.length ?? 0) > 0).length / n
  return [
    { k: 'climb', l: 'TANJAKAN', v: Math.round(clamp((climbPerKm / 14) * 100, 4, 99)), hint: `${climbPerKm.toFixed(1)} m naik per km` },
    { k: 'speed', l: 'KECEPATAN', v: Math.round(clamp(((avgSpd - 16) / 14) * 100, 4, 99)), hint: `rata-rata ${avgSpd.toFixed(1)} km/j` },
    { k: 'endu', l: 'DAYA TAHAN', v: Math.round(clamp((maxKm / 130) * 70 + (km / n / 60) * 30, 4, 99)), hint: `terjauh ${maxKm.toFixed(0)} km` },
    { k: 'cons', l: 'KONSISTENSI', v: Math.round(clamp((perWeek / 5) * 100, 4, 99)), hint: `${perWeek.toFixed(1)} ride / minggu` },
    { k: 'social', l: 'SOSIAL', v: Math.round(clamp(social * 160, 4, 99)), hint: `${Math.round(social * 100)}% ride bareng teman` },
  ]
}

export function riderClass(stats: Stat[]): { main: RiderClass; sub: RiderClass; weakest: Stat } {
  const sorted = [...stats].sort((a, b) => b.v - a.v)
  return { main: CLASSES[sorted[0].k], sub: CLASSES[sorted[1].k], weakest: sorted[sorted.length - 1] }
}

export const QUEST: Record<string, string> = {
  climb: 'Quest: 1 ride berisi ≥ 400 m tanjakan minggu ini (+250 XP)',
  speed: 'Quest: 6×1 menit sprint di jalan sepi (+200 XP)',
  endu: 'Quest: 1 ride ≥ 60 km akhir pekan ini (+300 XP)',
  cons: 'Quest: gowes 4 hari minggu ini, sependek apa pun (+250 XP)',
  social: 'Quest: ajak 2 teman di gowes bareng berikutnya (+200 XP)',
}

/* ---------------- Mood karakter ---------------- */

export type Mood = 'semangat' | 'segar' | 'oke' | 'lelah' | 'kangen'

export function moodOf(rides: Ride[], s: Settings): { mood: Mood; line: string } {
  const last = rides[rides.length - 1]
  const days = last ? (Date.now() - new Date(last.date).getTime()) / 86400000 : 99
  const ready = readiness(trainingLoad(rides, s, 60))
  if (days > 5) return { mood: 'kangen', line: `Sudah ${Math.floor(days)} hari nggak gowes… sepedaku mulai berdebu 🥲` }
  const lastW = weekly(rides, 1)[0]
  if (lastW.km >= s.weeklyGoalKm) return { mood: 'semangat', line: 'Target minggu ini tembus! Aku merasa tak terkalahkan ✨' }
  if (ready.score >= 80) return { mood: 'segar', line: 'Kaki terasa ringan. Hari bagus untuk ride panjang atau kejar rekor!' }
  if (ready.score >= 55) return { mood: 'oke', line: 'Kondisi stabil. Ride tempo 1–2 jam pas banget hari ini.' }
  return { mood: 'lelah', line: 'Kakiku pegal… recovery ride santai atau istirahat dulu ya.' }
}

export function characterLevel(rides: Ride[]) {
  const lv = level(rides)
  const got = new Set(badges(rides).filter((b) => b.got).map((b) => b.id))
  return { ...lv, got }
}
