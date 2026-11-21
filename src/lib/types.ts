export type LatLng = [number, number]

export type RideType = 'road' | 'gravel' | 'mtb' | 'commute'

export interface Ride {
  id: string
  name: string
  date: string // ISO
  type: RideType
  distanceKm: number
  movingSec: number
  elevationM: number
  avgSpeed: number
  maxSpeed: number
  avgHr?: number
  calories: number
  track: LatLng[]
  elevations?: number[]
  bikeId?: string
  friendIds?: string[]
  zones?: number[] // zona intensitas 1..5 per segmen waktu
  rpe?: number // 1..10 seberapa berat
  feel?: number // 0..1 seberapa enak rasanya
}

export interface Friend {
  id: string
  name: string
  color: string
  avgSpeed: number
  weeklyKm: number
  home: LatLng
  homeLabel: string
  phone?: string
  char: CharConfig
}

export type Pace = 'santai' | 'sedang' | 'kencang'
export type Rsvp = 'ikut' | 'mungkin' | 'tidak' | 'menunggu'

export interface MeetPoint {
  name: string
  pos: LatLng
}

export interface GroupRide {
  id: string
  title: string
  datetime: string // ISO
  meet: MeetPoint
  pace: Pace
  distanceKm: number
  route?: string
  notes?: string
  noDrop: boolean
  participants: { friendId: string; rsvp: Rsvp }[]
  myRsvp: Rsvp
  host: string // 'me' or friend id or name
  plan?: RoutePlan
}

export type CheckpointKind = 'rehat' | 'kopi' | 'makan' | 'air' | 'foto' | 'sholat' | 'bengkel'

export interface PlaceRef { name: string; kind: string; pos: LatLng; hours?: string; extra?: string }

export interface Checkpoint {
  id: string
  name: string
  pos: LatLng
  kind: CheckpointKind
  stopMin: number
  place?: PlaceRef
}

export interface RoutePlan {
  id: string
  name: string
  start: MeetPoint
  finish: MeetPoint | null // null = kembali ke start (loop)
  checkpoints: Checkpoint[]
  speed: number // km/j rencana
  startTime: string // ISO
  geometry?: LatLng[]
  legsKm?: number[]
  distanceKm?: number
  routed?: boolean
}

export type ReminderKind = 'ride' | 'maintenance' | 'hydration' | 'custom'

export interface Reminder {
  id: string
  kind: ReminderKind
  title: string
  time: string // HH:MM
  days: number[] // 0=Min..6=Sab
  enabled: boolean
  lastFired?: string // yyyy-mm-dd
}

export interface Component {
  id: string
  name: string
  lifeKm: number
  usedKm: number
  tip: string
}

export interface Bike {
  id: string
  name: string
  type: RideType
  odometerKm: number
  components: Component[]
}

export interface Settings {
  name: string
  weightKg: number
  maxHr: number
  thresholdSpeed: number // km/j kecepatan rata-rata "ambang" 1 jam
  weeklyGoalKm: number
  emergencyName: string
  emergencyPhone: string
  home: LatLng
  homeLabel: string
  theme: 'dark' | 'light'
  fuelPricePerKm: number // Rp per km bila naik motor
}

/** Avatar profil (DiceBear Lorelei). */
export interface CharConfig {
  v: 2
  head: string
  hair: string
  eyes: string
  eyebrows: string
  mouth: string
  nose: string
  glasses: string | null
  earrings: string | null
  beard: string | null
  freckles: boolean
  flowers: boolean
  skin: string // hex tanpa '#'
  hairColor: string
  accColor: string
  bg?: string // warna latar kartu (hex)
}

export type Workout = 'rec' | 'end' | 'tempo' | 'int' | 'long'
export interface Plan { cells: (Workout | null)[] /* 14 hari mulai Senin minggu ini */ }
export interface EventGoal { name: string; date: string; km: number }
