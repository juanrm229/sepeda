import type { Ride } from './types'
import { clamp } from './util'
import { badges, level, readiness, trainingLoad, weekly } from './analytics'
import type { Settings } from './types'

export { defaultChar, randomChar as seededChar } from './avatar'

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
