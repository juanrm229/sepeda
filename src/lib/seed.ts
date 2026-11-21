import type { Bike, Friend, GroupRide, LatLng, Plan, Reminder, Ride, RideType, Settings } from './types'
import { calories, rideIF, synthZones, trainingLoad } from './analytics'
import { clamp, dayKey } from './util'
import { trackLength } from './geo'

// PRNG deterministik supaya data contoh stabil
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const HOME: LatLng = [-6.2297, 106.8090] // Senayan / GBK

export const defaultSettings: Settings = {
  name: 'Juan',
  weightKg: 68,
  maxHr: 190,
  thresholdSpeed: 27,
  weeklyGoalKm: 120,
  emergencyName: '',
  emergencyPhone: '',
  home: HOME,
  homeLabel: 'Senayan, Jakarta',
  theme: 'light',
  fuelPricePerKm: 300,
}

export function makeLoop(center: LatLng, km: number, r: () => number, n = 70): LatLng[] {
  const a = 1 + r() * 0.6
  const b = 1 + r() * 0.6
  const rot = r() * Math.PI
  const pts: LatLng[] = []
  const ph = [r() * 6, r() * 6]
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2
    const wob = 1 + 0.18 * Math.sin(3 * t + ph[0]) + 0.08 * Math.sin(7 * t + ph[1])
    const x = Math.cos(t) * a * wob
    const y = Math.sin(t) * b * wob
    pts.push([x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)])
  }
  // skala supaya keliling sesuai km; titik awal = center
  const raw: LatLng[] = pts.map(([x, y]) => [center[0] + (y - pts[0][1]) * 0.01, center[1] + (x - pts[0][0]) * 0.01])
  const len = trackLength(raw)
  const k = km / len
  return raw.map(([la, lo]) => [center[0] + (la - center[0]) * k, center[1] + (lo - center[1]) * k])
}

function profile(n: number, gain: number, r: () => number, base: number): number[] {
  const out: number[] = []
  const peaks = 1 + Math.floor(r() * 3)
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const v = Math.sin(Math.PI * t * peaks) ** 2 * 0.8 + Math.sin(t * 23 + r()) * 0.08 + 0.1
    out.push(v)
  }
  let up = 0
  for (let i = 1; i < out.length; i++) up += Math.max(0, out[i] - out[i - 1])
  const k = up > 0 ? gain / up : 0
  return out.map((v) => Math.round(base + v * k))
}

const SPOTS: { name: string; c: LatLng; type: RideType; km: [number, number]; elevPerKm: [number, number]; base: number }[] = [
  { name: 'Commute Senayan', c: HOME, type: 'commute', km: [12, 22], elevPerKm: [1, 3], base: 12 },
  { name: 'Loop GBK pagi', c: [-6.2186, 106.8026], type: 'road', km: [20, 35], elevPerKm: [1, 3], base: 10 },
  { name: 'CFD Sudirman–Thamrin', c: [-6.1950, 106.8230], type: 'road', km: [18, 30], elevPerKm: [1, 2], base: 8 },
  { name: 'PIK sunrise ride', c: [-6.1100, 106.7400], type: 'road', km: [45, 70], elevPerKm: [0.5, 1.5], base: 3 },
  { name: 'Tanjakan Sentul', c: [-6.5600, 106.8700], type: 'road', km: [45, 75], elevPerKm: [14, 22], base: 180 },
  { name: 'Gravel Cibubur', c: [-6.3700, 106.8900], type: 'gravel', km: [30, 50], elevPerKm: [5, 9], base: 90 },
  { name: 'Puncak klasik', c: [-6.6500, 106.9300], type: 'road', km: [80, 110], elevPerKm: [16, 24], base: 350 },
]

export function seedRides(days = 120): Ride[] {
  const r = rng(29)
  const rides: Ride[] = []
  const now = new Date()
  for (let i = days; i >= 1; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dow = d.getDay()
    const progress = 1 - i / days // makin baru makin fit
    let spot: (typeof SPOTS)[number] | null = null
    if (dow === 0) spot = r() < 0.15 ? SPOTS[2] : r() < 0.5 ? SPOTS[4] : r() < 0.2 ? SPOTS[6] : SPOTS[3]
    else if (dow === 6) spot = r() < 0.75 ? (r() < 0.5 ? SPOTS[5] : SPOTS[1]) : null
    else if (dow === 2 || dow === 4) spot = r() < 0.8 ? SPOTS[0] : null
    else if (dow === 3) spot = r() < 0.45 ? SPOTS[1] : null
    if (!spot) continue
    const km = +(spot.km[0] + r() * (spot.km[1] - spot.km[0])).toFixed(1)
    const elev = Math.round(km * (spot.elevPerKm[0] + r() * (spot.elevPerKm[1] - spot.elevPerKm[0])))
    const climbPenalty = elev / km / 3
    const spd = +(19 + progress * 4 + r() * 5 - climbPenalty + (spot.type === 'commute' ? -2 : 0)).toFixed(1)
    const movingSec = Math.round((km / spd) * 3600)
    const hour = spot.type === 'commute' ? (r() < 0.5 ? 6 : 17) : 5 + Math.floor(r() * 2)
    d.setHours(hour, Math.floor(r() * 50), 0, 0)
    const track = makeLoop(spot.c, km, r)
    const withFriends = spot.type !== 'commute' && r() < 0.45
    rides.push({
      id: `seed-${i}`,
      name: spot.name,
      date: d.toISOString(),
      type: spot.type,
      distanceKm: km,
      movingSec,
      elevationM: elev,
      avgSpeed: spd,
      maxSpeed: +(spd * (1.45 + r() * 0.5) + elev / 300).toFixed(1),
      avgHr: Math.round(128 + r() * 22 + climbPenalty * 2),
      calories: calories(spd, movingSec, 68, elev),
      track,
      elevations: profile(track.length - 1, elev, r, spot.base),
      bikeId: spot.type === 'gravel' ? 'bike-2' : 'bike-1',
      friendIds: withFriends ? ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].filter(() => r() < 0.4) : [],
    })
  }
  // zona intensitas, RPE & rasa (berkorelasi dengan Form) agar analitik terasa hidup
  const load = trainingLoad(rides, defaultSettings, days + 5)
  const tsbOf = new Map(load.map((p) => [p.day, p.tsb]))
  for (const ride of rides) {
    ride.zones = synthZones(ride, defaultSettings)
    ride.rpe = Math.round(clamp(rideIF(ride, defaultSettings) * 9 + (r() - 0.5) * 2, 1, 10))
    const tsb = tsbOf.get(dayKey(new Date(ride.date))) ?? 0
    ride.feel = +clamp(0.85 - ((tsb - 9) / 22) ** 2 + (r() - 0.5) * 0.25, 0.05, 1).toFixed(2)
  }
  return rides
}

export const seedFriends: Friend[] = [
  { id: 'f1', name: 'Raka Pratama', color: '#ff4d1f', avgSpeed: 27.5, weeklyKm: 168, home: [-6.4025, 106.7942], homeLabel: 'Depok', char: { skin: 2, hair: 1, hairColor: 0, headgear: 1, glasses: 2, jersey: 1, jerseyColor: 1, bike: 0, acc: 0 } },
  { id: 'f2', name: 'Salsa Nadia', color: '#111111', avgSpeed: 24.2, weeklyKm: 112, home: [-6.3020, 106.6520], homeLabel: 'BSD, Tangsel', char: { skin: 1, hair: 6, hairColor: 1, headgear: 1, glasses: 0, jersey: 0, jerseyColor: 6, bike: 2, acc: 2 } },
  { id: 'f3', name: 'Dimas Ari', color: '#f5c518', avgSpeed: 29.1, weeklyKm: 204, home: [-6.2383, 106.9756], homeLabel: 'Bekasi', char: { skin: 3, hair: 2, hairColor: 0, headgear: 2, glasses: 3, jersey: 1, jerseyColor: 2, bike: 0, acc: 0 } },
  { id: 'f4', name: 'Kirana Putri', color: '#8a8a85', avgSpeed: 22.8, weeklyKm: 86, home: [-6.2607, 106.8136], homeLabel: 'Kemang', char: { skin: 1, hair: 3, hairColor: 1, headgear: 0, glasses: 1, jersey: 0, jerseyColor: 3, bike: 3, acc: 0 } },
  { id: 'f5', name: 'Bayu Saputra', color: '#2f6fed', avgSpeed: 25.6, weeklyKm: 131, home: [-6.1588, 106.9050], homeLabel: 'Kelapa Gading', char: { skin: 2, hair: 0, hairColor: 0, headgear: 3, glasses: 0, jersey: 1, jerseyColor: 4, bike: 1, acc: 2 } },
  { id: 'f6', name: 'Nadia Lestari', color: '#1f9d6a', avgSpeed: 23.4, weeklyKm: 97, home: [-6.3725, 106.8960], homeLabel: 'Cibubur', char: { skin: 0, hair: 4, hairColor: 2, headgear: 0, glasses: 2, jersey: 0, jerseyColor: 5, bike: 2, acc: 0 } },
]

function nextDow(dow: number, h: number, m = 0): string {
  const d = new Date()
  const add = (dow - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + add)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function seedGroupRides(): GroupRide[] {
  return [
    {
      id: 'g1', title: 'CFD Squad Pagi', datetime: nextDow(0, 5, 30),
      meet: { name: 'Bundaran HI (sisi Grand Indonesia)', pos: [-6.1950, 106.8230] },
      pace: 'santai', distanceKm: 32, route: 'Sudirman – Thamrin – Monas – balik GBK', noDrop: true,
      notes: 'Sarapan bubur ayam setelahnya. Bawa lampu belakang.',
      participants: [{ friendId: 'f2', rsvp: 'ikut' }, { friendId: 'f4', rsvp: 'ikut' }, { friendId: 'f5', rsvp: 'mungkin' }, { friendId: 'f6', rsvp: 'menunggu' }],
      myRsvp: 'ikut', host: 'me',
    },
    {
      id: 'g2', title: 'Nanjak Sentul – Gunung Pancar', datetime: nextDow(6, 5, 0),
      meet: { name: 'Sentul Circuit gerbang utama', pos: [-6.5410, 106.8590] },
      pace: 'kencang', distanceKm: 62, route: 'Sentul – Bukit Pelangi – Gunung Pancar', noDrop: false,
      notes: 'Elevasi ±1.100 m. Minimal bawa 2 bidon.',
      participants: [{ friendId: 'f1', rsvp: 'ikut' }, { friendId: 'f3', rsvp: 'ikut' }],
      myRsvp: 'menunggu', host: 'f3',
    },
  ]
}

export const seedBikes: Bike[] = [
  {
    id: 'bike-1', name: 'Road — Si Hitam', type: 'road', odometerKm: 0,
    components: [
      { id: 'c1', name: 'Rantai', lifeKm: 3000, usedKm: 0, tip: 'Ganti jika ukur rantai ≥ 0,5% mulur. Lumasi tiap 250 km.' },
      { id: 'c2', name: 'Ban belakang', lifeKm: 3500, usedKm: 0, tip: 'Ganti jika indikator aus hilang atau sering bocor.' },
      { id: 'c3', name: 'Ban depan', lifeKm: 5000, usedKm: 0, tip: 'Rotasi depan↔belakang untuk umur lebih panjang.' },
      { id: 'c4', name: 'Kampas rem', lifeKm: 2000, usedKm: 0, tip: 'Alur kampas hilang = ganti. Jakarta hujan = cepat habis.' },
      { id: 'c5', name: 'Sprocket', lifeKm: 9000, usedKm: 0, tip: 'Ganti setiap 2–3 kali ganti rantai.' },
      { id: 'c6', name: 'Servis berkala', lifeKm: 1500, usedKm: 0, tip: 'Setel gigi, rem, cek baut, bearing.' },
    ],
  },
  {
    id: 'bike-2', name: 'Gravel — Lumpur', type: 'gravel', odometerKm: 0,
    components: [
      { id: 'c7', name: 'Rantai', lifeKm: 2500, usedKm: 0, tip: 'Medan berdebu mempercepat aus. Bersihkan setelah ride basah.' },
      { id: 'c8', name: 'Ban', lifeKm: 4000, usedKm: 0, tip: 'Cek sobekan dinding ban setelah ride batu.' },
      { id: 'c9', name: 'Kampas rem cakram', lifeKm: 1800, usedKm: 0, tip: 'Ketebalan < 1,5 mm = ganti.' },
    ],
  },
]

export function seedPlan(): Plan {
  // 14 hari mulai Senin minggu ini
  return { cells: ['rec', 'end', null, 'int', null, 'end', 'long', 'rec', 'end', null, 'tempo', null, 'end', 'long'] }
}

export const seedReminders: Reminder[] = [
  { id: 'r1', kind: 'ride', title: 'Gowes pagi — siapkan bidon & lampu', time: '05:00', days: [0, 6], enabled: true },
  { id: 'r2', kind: 'maintenance', title: 'Cek tekanan ban (80–90 psi)', time: '19:30', days: [5], enabled: true },
  { id: 'r3', kind: 'ride', title: 'Commute — sepedaan ke kantor', time: '06:15', days: [2, 4], enabled: true },
  { id: 'r4', kind: 'hydration', title: 'Minum 500 ml air sebelum tidur, besok ride panjang', time: '21:00', days: [6], enabled: false },
]

/** Hitung odometer & pemakaian komponen dari riwayat ride. */
export function applyRidesToBikes(bikes: Bike[], rides: Ride[]): Bike[] {
  return bikes.map((b, idx) => {
    const km = rides.filter((r) => (r.bikeId ?? 'bike-1') === b.id).reduce((a, r) => a + r.distanceKm, 0)
    return {
      ...b,
      odometerKm: Math.round(km + (idx === 0 ? 2140 : 610)),
      components: b.components.map((c, i) => ({ ...c, usedKm: Math.round((km * (0.4 + ((i * 37) % 60) / 100) + i * 120) % c.lifeKm) })),
    }
  })
}
