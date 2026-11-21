import type { LatLng } from './types'

const R = 6371

export function haversine(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function trackLength(t: LatLng[]): number {
  let d = 0
  for (let i = 1; i < t.length; i++) d += haversine(t[i - 1], t[i])
  return d
}

export function centroid(pts: LatLng[]): LatLng {
  const n = pts.length || 1
  return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n]
}

/**
 * Titik temu "adil": meminimalkan jarak TERJAUH yang harus ditempuh seseorang
 * (minimax / smallest enclosing circle), bukan sekadar rata-rata.
 * Rata-rata (centroid) bisa membuat satu orang menempuh jarak jauh sekali
 * kalau mayoritas teman berkumpul di satu sisi kota.
 */
export function fairPoint(pts: LatLng[]): LatLng {
  if (pts.length === 0) return [0, 0]
  if (pts.length === 1) return pts[0]
  let p = centroid(pts)
  let step = 0.5
  for (let i = 0; i < 4000; i++) {
    let far = pts[0]
    let fd = -1
    for (const q of pts) {
      const d = haversine(p, q)
      if (d > fd) { fd = d; far = q }
    }
    p = [p[0] + (far[0] - p[0]) * step, p[1] + (far[1] - p[1]) * step]
    step *= 0.995
    if (step < 1e-5) break
  }
  return p
}

/** Bobot berdasar kecepatan: titik yang meminimalkan WAKTU terlama, bukan jarak. */
export function fairPointByTime(pts: LatLng[], speeds: number[]): LatLng {
  if (pts.length <= 1) return pts[0] ?? [0, 0]
  let p = centroid(pts)
  let step = 0.5
  for (let i = 0; i < 4000; i++) {
    let far = pts[0]
    let ft = -1
    pts.forEach((q, j) => {
      const t = haversine(p, q) / Math.max(8, speeds[j] || 18)
      if (t > ft) { ft = t; far = q }
    })
    p = [p[0] + (far[0] - p[0]) * step, p[1] + (far[1] - p[1]) * step]
    step *= 0.995
    if (step < 1e-5) break
  }
  return p
}

export function bearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]))
  const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function compass(deg: number): string {
  const dirs = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut']
  return dirs[Math.round(deg / 45) % 8]
}

/** Estimasi menit bersepeda — jarak jalan ~1.3x garis lurus. */
export function etaMin(km: number, speed = 18): number {
  return Math.round(((km * 1.3) / speed) * 60)
}
