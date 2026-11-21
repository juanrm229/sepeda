import type { LatLng } from './types'

export interface PrayerTime { name: string; time: Date }
const NAMES: Record<string, string> = { Fajr: 'Subuh', Dhuhr: 'Zuhur', Asr: 'Asar', Maghrib: 'Magrib', Isha: 'Isya' }
const cache = new Map<string, PrayerTime[]>()

/** Jadwal sholat (metode Kemenag RI) untuk tanggal & lokasi; fallback perkiraan Jakarta. */
export async function prayerTimes(pos: LatLng, date: Date): Promise<PrayerTime[]> {
  const d = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
  const key = `${d}@${pos[0].toFixed(1)},${pos[1].toFixed(1)}`
  if (cache.has(key)) return cache.get(key)!
  const mk = (hm: string, n: string) => { const [h, m] = hm.split(':').map(Number); const t = new Date(date); t.setHours(h, m, 0, 0); return { name: n, time: t } }
  try {
    const r = await fetch(`https://api.aladhan.com/v1/timings/${d}?latitude=${pos[0]}&longitude=${pos[1]}&method=20`)
    const j = await r.json()
    const out = Object.entries(NAMES).map(([k, n]) => mk(String(j.data.timings[k]).slice(0, 5), n))
    cache.set(key, out)
    return out
  } catch {
    return [mk('04:15', 'Subuh'), mk('11:50', 'Zuhur'), mk('15:10', 'Asar'), mk('17:55', 'Magrib'), mk('19:08', 'Isya')]
  }
}
