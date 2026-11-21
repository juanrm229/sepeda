import type { LatLng } from './types'
import { haversine } from './geo'

export interface Place { id: number; name: string; kind: string; pos: LatLng; dist: number; score: number; why: string; hours?: string; extra?: string }

export type PlaceCat = 'kopi' | 'makan' | 'minimarket' | 'bengkel' | 'masjid' | 'air' | 'kumpul'

const CAT_QUERY: Record<PlaceCat, string[]> = {
  kopi: ['node[amenity=cafe]', 'way[amenity=cafe]', 'node[shop=coffee]', 'node[cuisine~"coffee"]'],
  makan: ['node[amenity~"restaurant|fast_food|food_court"]', 'way[amenity~"restaurant|food_court"]', 'node[shop=bakery]'],
  minimarket: ['node[shop=convenience]', 'node[amenity=fuel]'],
  bengkel: ['node[shop=bicycle]', 'way[shop=bicycle]'],
  masjid: ['node[amenity=place_of_worship][religion=muslim]', 'way[amenity=place_of_worship][religion=muslim]'],
  air: ['node[amenity~"drinking_water|toilets"]', 'node[shop=convenience]'],
  kumpul: ['node[shop~"convenience|bicycle"]', 'node[amenity~"cafe|fuel|fast_food"]', 'way[leisure=park]'],
}

const KIND: Record<string, { label: string; w: number; why: string }> = {
  convenience: { label: 'Minimarket', w: 1.0, why: 'Air minum, toilet & parkir sepeda' },
  cafe: { label: 'Kafe', w: 1.0, why: 'Ngopi sambil nunggu yang telat' },
  coffee: { label: 'Kedai kopi', w: 1.0, why: 'Kopi enak, rehat singkat' },
  fuel: { label: 'SPBU', w: 0.8, why: 'Toilet & minimarket, gampang ditemukan' },
  park: { label: 'Taman', w: 0.75, why: 'Luas & aman untuk rombongan' },
  fast_food: { label: 'Cepat saji', w: 0.7, why: 'Buka pagi, cepat, ada toilet' },
  restaurant: { label: 'Rumah makan', w: 0.9, why: 'Isi tenaga: nasi, mi, sate…' },
  food_court: { label: 'Food court', w: 0.85, why: 'Banyak pilihan untuk rombongan' },
  bakery: { label: 'Toko roti', w: 0.8, why: 'Karbo cepat untuk lanjut gowes' },
  bicycle: { label: 'Bengkel sepeda', w: 0.95, why: 'Pompa, ban dalam, servis darurat' },
  place_of_worship: { label: 'Masjid/Musala', w: 1.0, why: 'Sholat, wudu & toilet' },
  drinking_water: { label: 'Air minum', w: 0.9, why: 'Isi ulang bidon' },
  toilets: { label: 'Toilet umum', w: 0.7, why: 'Rehat sebentar' },
}

const BRAND = /indomaret|alfamart|alfamidi|lawson|circle k|family ?mart|starbucks|kopi kenangan|janji jiwa|fore|tomoro|point coffee|kopi soe|pertamina|mcdonald|kfc|warung|mie gacoan|solaria/i

async function overpass(q: string): Promise<any> {
  for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 7000)
      const res = await fetch(host, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal })
      clearTimeout(t)
      if (res.ok) return await res.json()
    } catch { /* coba server berikutnya */ }
  }
  throw new Error('overpass')
}

/** Cari tempat nyata di sekitar titik (OpenStreetMap / Overpass) berdasarkan kategori. */
export async function nearbyPlaces(p: LatLng, cat: PlaceCat, radius = 900): Promise<Place[]> {
  try {
    return await overpassPlaces(p, cat, radius)
  } catch {
    return await nominatimPlaces(p, cat, radius)
  }
}

const NOMI_TERMS: Record<PlaceCat, string[]> = {
  kopi: ['cafe', 'kopi'], makan: ['restaurant', 'warung'], minimarket: ['indomaret', 'alfamart'], bengkel: ['bicycle shop', 'bengkel sepeda'],
  masjid: ['masjid', 'musala'], air: ['toilets', 'drinking water'], kumpul: ['cafe', 'indomaret'],
}
const NOMI_KIND: Record<string, string> = { cafe: 'cafe', restaurant: 'restaurant', fast_food: 'fast_food', food_court: 'food_court', convenience: 'convenience', supermarket: 'convenience', bicycle: 'bicycle', place_of_worship: 'place_of_worship', toilets: 'toilets', drinking_water: 'drinking_water', fuel: 'fuel', bakery: 'bakery', park: 'park', coffee: 'coffee' }

/** Cadangan bila Overpass sibuk: Nominatim (OSM) dengan viewbox terbatas. */
async function nominatimPlaces(p: LatLng, cat: PlaceCat, radius: number): Promise<Place[]> {
  const dLat = radius / 111000, dLon = radius / (111000 * Math.cos((p[0] * Math.PI) / 180))
  const vb = [p[1] - dLon, p[0] + dLat, p[1] + dLon, p[0] - dLat].map((x) => x.toFixed(5)).join(',')
  const out: Place[] = []
  const seen = new Set<string>()
  for (const term of NOMI_TERMS[cat]) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(term)}&format=jsonv2&viewbox=${vb}&bounded=1&limit=15&accept-language=id`)
      if (!r.ok) continue
      for (const e of (await r.json()) as any[]) {
        const k = NOMI_KIND[e.type] ?? (cat === 'masjid' ? 'place_of_worship' : undefined)
        const meta = k ? KIND[k] : undefined
        if (!meta || !e.name) continue
        const pos: LatLng = [+e.lat, +e.lon]
        const key = e.name + Math.round(pos[0] * 2000)
        if (seen.has(key)) continue
        seen.add(key)
        const dist = haversine(p, pos)
        out.push({ id: +e.place_id, name: e.name, kind: meta.label, pos, dist, score: meta.w + (BRAND.test(e.name) ? 0.15 : 0) - (dist / radius) * 0.6, why: meta.why })
      }
    } catch { /* lanjut */ }
  }
  if (!out.length) throw new Error('noplaces')
  return out.sort((a, b) => b.score - a.score).slice(0, 12)
}

async function overpassPlaces(p: LatLng, cat: PlaceCat, radius: number): Promise<Place[]> {
  const parts = CAT_QUERY[cat].map((sel) => `${sel}(around:${radius},${p[0]},${p[1]});`).join('')
  const j = await overpass(`[out:json][timeout:15];(${parts});out center 80;`)
  const out: Place[] = []
  const seen = new Set<string>()
  for (const e of j.elements as any[]) {
    const lat = e.lat ?? e.center?.lat
    const lon = e.lon ?? e.center?.lon
    if (lat == null) continue
    const t = e.tags ?? {}
    const k = t.shop === 'coffee' ? 'coffee' : t.shop ?? t.amenity ?? t.leisure
    const meta = KIND[k]
    if (!meta) continue
    const name = t.name ?? t.brand ?? meta.label
    const dedupe = name + Math.round(lat * 2000) + Math.round(lon * 2000)
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    const dist = haversine(p, [lat, lon])
    const score = meta.w + (BRAND.test(name) ? 0.15 : 0) + (t.name ? 0.1 : -0.25) + (t.opening_hours ? 0.05 : 0) - (dist / radius) * 0.6
    out.push({ id: e.id, name, kind: meta.label, pos: [lat, lon], dist, score, why: meta.why, hours: t.opening_hours, extra: t.cuisine?.replace(/;/g, ', ') })
  }
  if (!out.length) throw new Error('empty')
  return out.sort((a, b) => b.score - a.score).slice(0, 12)
}

/** Kompatibel dengan versi lama: tempat kumpul. */
export const nearbyMeetSpots = (p: LatLng, radius = 900) => nearbyPlaces(p, 'kumpul', radius)
