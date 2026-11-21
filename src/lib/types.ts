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
