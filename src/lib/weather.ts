import type { LatLng } from './types'
import { clamp } from './util'

export interface Hour {
  time: Date
  temp: number
  feels: number
  rain: number // % peluang
  wind: number // km/j
  windDir: number // derajat, arah ASAL angin
  uv: number
  aqi: number | null
  isDay: boolean
  score: number
  reasons: string[]
}

export interface Forecast { hours: Hour[]; sunrise: Date | null; sunset: Date | null; demo: boolean }

export function scoreHour(h: Omit<Hour, 'score' | 'reasons'>): { score: number; reasons: string[] } {
  let s = 100
  const reasons: string[] = []
  if (h.rain > 20) { s -= (h.rain - 20) * 0.9; reasons.push(`hujan ${h.rain}%`) }
  if (h.feels > 31) { s -= (h.feels - 31) * 6; reasons.push(`terasa ${Math.round(h.feels)}°`) }
  if (h.temp < 17) { s -= (17 - h.temp) * 4; reasons.push('dingin') }
  if (h.wind > 18) { s -= (h.wind - 18) * 2; reasons.push(`angin ${Math.round(h.wind)} km/j`) }
  if (h.uv > 6) { s -= (h.uv - 6) * 5; reasons.push(`UV ${Math.round(h.uv)}`) }
  if (h.aqi != null && h.aqi > 100) { s -= (h.aqi - 100) * 0.35; reasons.push(`AQI ${h.aqi}`) }
  if (!h.isDay) { s -= 18; reasons.push('gelap') }
  return { score: Math.round(clamp(s, 0, 100)), reasons }
}

export async function getForecast(pos: LatLng): Promise<Forecast> {
  try {
    const [lat, lon] = pos.map((x) => x.toFixed(3))
    const ctl = new AbortController()
    setTimeout(() => ctl.abort(), 7000)
    const fetch = (u: string) => window.fetch(u, { signal: ctl.signal })
    const w = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,wind_direction_10m,uv_index,is_day&daily=sunrise,sunset&forecast_days=2&timezone=auto`).then((r) => { if (!r.ok) throw new Error(); return r.json() })
    const a = fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&forecast_days=2&timezone=auto`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    const [wj, aj] = await Promise.all([w, a])
    const H = wj.hourly
    const aqiMap = new Map<string, number>()
    if (aj?.hourly) aj.hourly.time.forEach((t: string, i: number) => aqiMap.set(t, aj.hourly.us_aqi[i]))
    const hours: Hour[] = H.time.map((t: string, i: number) => {
      const base = {
        time: new Date(t), temp: H.temperature_2m[i], feels: H.apparent_temperature[i], rain: H.precipitation_probability[i] ?? 0,
        wind: H.wind_speed_10m[i], windDir: H.wind_direction_10m[i], uv: H.uv_index[i] ?? 0, aqi: aqiMap.get(t) ?? null, isDay: H.is_day[i] === 1,
      }
      return { ...base, ...scoreHour(base) }
    })
    return { hours, sunrise: new Date(wj.daily.sunrise[0]), sunset: new Date(wj.daily.sunset[0]), demo: false }
  } catch {
    return demoForecast()
  }
}

/** Data contoh yang realistis untuk Jakarta bila API tidak terjangkau. */
export function demoForecast(): Forecast {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  start.setHours(0)
  const hours: Hour[] = []
  for (let i = 0; i < 48; i++) {
    const t = new Date(start.getTime() + i * 3600000)
    const h = t.getHours()
    const temp = 25 + 7 * Math.max(0, Math.sin(((h - 7) / 14) * Math.PI))
    const rain = h >= 14 && h <= 18 ? 55 + (i > 24 ? 15 : 0) : h >= 19 && h <= 21 ? 30 : 8
    const base = { time: t, temp, feels: temp + (h > 10 && h < 16 ? 3 : 1), rain, wind: 6 + 10 * Math.max(0, Math.sin(((h - 9) / 12) * Math.PI)), windDir: h < 12 ? 70 : 300, uv: Math.max(0, 11 * Math.sin(((h - 6) / 12) * Math.PI)), aqi: h < 8 ? 132 : h < 12 ? 98 : 74, isDay: h >= 6 && h < 18 }
    hours.push({ ...base, ...scoreHour(base) })
  }
  const sr = new Date(start); sr.setHours(5, 42)
  const ss = new Date(start); ss.setHours(17, 51)
  return { hours, sunrise: sr, sunset: ss, demo: true }
}

export interface Window { start: Date; end: Date; score: number; hours: Hour[] }

/** Cari jendela gowes terbaik (durasi jam) di masa depan, antara 04.00–20.00. */
export function bestWindow(hours: Hour[], dur = 2): Window | null {
  const now = Date.now() - 3600000
  const fut = hours.filter((h) => h.time.getTime() >= now)
  let best: Window | null = null
  for (let i = 0; i + dur <= fut.length; i++) {
    const slice = fut.slice(i, i + dur)
    const hr = slice[0].time.getHours()
    if (hr < 4 || hr + dur > 20) continue
    const sc = Math.round(slice.reduce((a, h) => a + h.score, 0) / dur)
    if (!best || sc > best.score) best = { start: slice[0].time, end: new Date(slice[0].time.getTime() + dur * 3600000), score: sc, hours: slice }
  }
  return best
}

export function windAdvice(dir: number, speed: number): string {
  const from = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'][Math.round(dir / 45) % 8]
  if (speed < 8) return `Angin tenang (${Math.round(speed)} km/j). Rute ke arah mana pun sama enaknya.`
  return `Angin dari ${from} ${Math.round(speed)} km/j. Berangkat ke arah ${from} (lawan angin) selagi tenaga masih penuh, pulang didorong angin.`
}

export function scoreLabel(s: number): string {
  if (s >= 85) return 'Sempurna'
  if (s >= 70) return 'Bagus'
  if (s >= 50) return 'Lumayan'
  if (s >= 30) return 'Kurang'
  return 'Hindari'
}
