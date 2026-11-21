import type { LatLng } from './types'
import { haversine } from './geo'

export interface RouteResult { coords: LatLng[]; km: number; legs: number[]; routed: boolean }

const cache = new Map<string, RouteResult>()

/** Rute sepeda mengikuti jalan (OSRM profil sepeda, OpenStreetMap). Fallback: garis lurus × 1,3. */
export async function getBikeRoute(points: LatLng[]): Promise<RouteResult> {
  if (points.length < 2) return { coords: points, km: 0, legs: [], routed: false }
  const key = points.map((p) => p.map((x) => x.toFixed(5)).join(',')).join(';')
  const hit = cache.get(key)
  if (hit) return hit
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 9000)
    const coords = points.map((p) => `${p[1].toFixed(6)},${p[0].toFixed(6)}`).join(';')
    const res = await fetch(`https://routing.openstreetmap.de/routed-bike/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`, { signal: ctl.signal })
    clearTimeout(t)
    if (!res.ok) throw new Error('route')
    const j = await res.json()
    const r = j.routes?.[0]
    if (!r) throw new Error('noroute')
    const out: RouteResult = {
      coords: r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as LatLng),
      km: r.distance / 1000,
      legs: r.legs.map((l: { distance: number }) => l.distance / 1000),
      routed: true,
    }
    cache.set(key, out)
    return out
  } catch {
    const legs = points.slice(1).map((p, i) => haversine(points[i], p) * 1.3)
    return { coords: points, km: legs.reduce((a, b) => a + b, 0), legs, routed: false }
  }
}

/** Titik di sepanjang polyline pada jarak km tertentu. */
export function pointAtKm(coords: LatLng[], km: number): LatLng {
  let acc = 0
  for (let i = 1; i < coords.length; i++) {
    const d = haversine(coords[i - 1], coords[i])
    if (acc + d >= km) {
      const f = d > 0 ? (km - acc) / d : 0
      return [coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * f, coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * f]
    }
    acc += d
  }
  return coords[coords.length - 1]
}

/** Jarak (km) titik terdekat di polyline dari awal — untuk mengurutkan checkpoint di rute. */
export function kmAlong(coords: LatLng[], p: LatLng): number {
  let acc = 0, best = Infinity, bestKm = 0
  for (let i = 1; i < coords.length; i++) {
    const d = haversine(coords[i - 1], coords[i])
    const dd = haversine(coords[i], p)
    if (dd < best) { best = dd; bestKm = acc + d }
    acc += d
  }
  return bestKm
}
