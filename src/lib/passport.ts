import type { LatLng, Ride } from './types'
import { haversine } from './geo'

export interface Landmark { id: string; name: string; area: string; pos: LatLng; emoji: string; color: string; rarity: 'umum' | 'langka' | 'legenda'; hint: string }

export const LANDMARKS: Landmark[] = [
  { id: 'hi', name: 'Bundaran HI', area: 'Jakarta Pusat', pos: [-6.1950, 106.8230], emoji: '⛲', color: '#2f6fed', rarity: 'umum', hint: 'Ikut Car Free Day hari Minggu' },
  { id: 'monas', name: 'Monas', area: 'Jakarta Pusat', pos: [-6.1754, 106.8272], emoji: '🗼', color: '#d2441c', rarity: 'umum', hint: 'Putari Medan Merdeka' },
  { id: 'gbk', name: 'GBK Senayan', area: 'Jakarta Selatan', pos: [-6.2186, 106.8026], emoji: '🏟️', color: '#111111', rarity: 'umum', hint: 'Loop ring road GBK' },
  { id: 'kotatua', name: 'Kota Tua', area: 'Jakarta Barat', pos: [-6.1352, 106.8133], emoji: '🏛️', color: '#6b3f1f', rarity: 'langka', hint: 'Coffee ride ke Taman Fatahillah' },
  { id: 'ancol', name: 'Pantai Ancol', area: 'Jakarta Utara', pos: [-6.1225, 106.8350], emoji: '🌊', color: '#2f9bd6', rarity: 'umum', hint: 'Gowes ke pesisir utara' },
  { id: 'pik', name: 'PIK', area: 'Jakarta Utara', pos: [-6.1100, 106.7400], emoji: '🌅', color: '#e87ba4', rarity: 'langka', hint: 'Sunset ride ke PIK' },
  { id: 'cibubur', name: 'Bumi Perkemahan Cibubur', area: 'Jakarta Timur', pos: [-6.3700, 106.8900], emoji: '🏕️', color: '#1f9d6a', rarity: 'langka', hint: 'Jalur gravel Cibubur' },
  { id: 'sentul', name: 'Sentul', area: 'Bogor', pos: [-6.5600, 106.8700], emoji: '🏁', color: '#f3a40b', rarity: 'langka', hint: 'Tanjakan Sentul pagi' },
  { id: 'pancar', name: 'Gunung Pancar', area: 'Bogor', pos: [-6.5905, 106.9050], emoji: '🌲', color: '#3e8a57', rarity: 'legenda', hint: 'Nanjak sampai hutan pinus' },
  { id: 'puncak', name: 'Puncak Pass', area: 'Bogor–Cianjur', pos: [-6.7020, 107.0060], emoji: '🍵', color: '#5aa05a', rarity: 'legenda', hint: 'Taklukkan 1.400 mdpl' },
]

export interface Stamp { lm: Landmark; date: string | null; rideId?: string }

/** Stempel didapat bila jejak ride melewati landmark (radius ~1,2 km). */
export function stamps(rides: Ride[]): Stamp[] {
  return LANDMARKS.map((lm) => {
    for (const r of rides) {
      const step = Math.max(1, Math.floor(r.track.length / 120))
      for (let i = 0; i < r.track.length; i += step) {
        if (haversine(r.track[i], lm.pos) < 0.8) return { lm, date: r.date, rideId: r.id }
      }
    }
    return { lm, date: null }
  })
}
