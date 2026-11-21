import type { LatLng } from './types'
import { haversine } from './geo'

export interface Place { id: number; name: string; kind: string; pos: LatLng; dist: number; score: number; why: string }

const KIND: Record<string, { label: string; w: number; why: string }> = {
  convenience: { label: 'Minimarket', w: 1.0, why: 'Air minum, toilet & parkir sepeda — meet point klasik' },
  cafe: { label: 'Kafe', w: 0.9, why: 'Bisa ngopi sambil nunggu yang telat' },
  fuel: { label: 'SPBU', w: 0.8, why: 'Gampang ditemukan, ada toilet & minimarket' },
  park: { label: 'Taman', w: 0.75, why: 'Luas & aman untuk kumpul rombongan' },
  fast_food: { label: 'Resto cepat saji', w: 0.6, why: 'Buka pagi, ada toilet' },
  bicycle: { label: 'Bengkel sepeda', w: 0.85, why: 'Bisa pompa ban & servis darurat' },
}

/** Cari tempat kumpul nyata di sekitar titik (OpenStreetMap / Overpass). */
export async function nearbyMeetSpots(p: LatLng, radius = 900): Promise<Place[]> {
  const q = `[out:json][timeout:15];(node(around:${radius},${p[0]},${p[1]})[shop~"convenience|bicycle"];node(around:${radius},${p[0]},${p[1]})[amenity~"cafe|fuel|fast_food"];way(around:${radius},${p[0]},${p[1]})[leisure=park];);out center 60;`
  let j: any = null
  for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const res = await fetch(host, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      if (res.ok) { j = await res.json(); break }
    } catch { /* coba server berikutnya */ }
  }
  if (!j) throw new Error('overpass')
  const out: Place[] = []
  for (const e of j.elements as any[]) {
    const lat = e.lat ?? e.center?.lat
    const lon = e.lon ?? e.center?.lon
    if (lat == null) continue
    const t = e.tags ?? {}
    const k = t.shop ?? t.amenity ?? t.leisure
    const meta = KIND[k]
    if (!meta) continue
    const name = t.name ?? t.brand ?? meta.label
    const dist = haversine(p, [lat, lon])
    const brandBonus = /indomaret|alfamart|alfamidi|lawson|circle k|family ?mart|starbucks|kopi kenangan|pertamina/i.test(name) ? 0.15 : 0
    const named = t.name ? 0.1 : -0.2
    const score = meta.w + brandBonus + named - dist / radius * 0.5
    out.push({ id: e.id, name, kind: meta.label, pos: [lat, lon], dist, score, why: meta.why })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 8)
}
