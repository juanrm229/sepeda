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
  /** Ketersediaan mingguan: bit (hari JS 0=Min..6=Sab) × 3 + slot (0 pagi, 1 sore, 2 malam). */
  avail?: number
  /** Teman yang punya akun PACK. */
  uid?: string
  handle?: string
  pay?: PayAccount[]
}

export interface Auth { token: string; uid: string; email: string; handle: string }
export interface PublicProfile { uid: string; handle: string; name: string; char?: CharConfig; homeLabel?: string; home?: LatLng; avgSpeed?: number; avail?: number; pay?: PayAccount[]; updatedAt?: string }

export type Pace = 'santai' | 'sedang' | 'kencang'
export type Rsvp = 'ikut' | 'mungkin' | 'tidak' | 'menunggu'

export interface MeetPoint {
  name: string
  pos: LatLng
}

/** Jawaban/vote satu peserta. Bisa teman tersimpan atau tamu dari link balasan. */
export interface Participant {
  friendId: string
  uid?: string
  rsvp: Rsvp
  name?: string
  char?: CharConfig
  /** Perkiraan titik berangkat (dibulatkan ±1 km, opsional) — untuk titik temu adil. */
  from?: LatLng
  vote?: Vote
  note?: string
  at?: string
  order?: { item: string; note?: string; price?: number }
  status?: TripStatus
  statusAt?: string
  eta?: string
}

export interface Vote { t?: number; c?: number }

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
  participants: Participant[]
  myRsvp: Rsvp
  host: string // 'me' or friend id or name
  plan?: RoutePlan
  /** Pilihan jam yang divoting (ISO). datetime = pilihan yang sedang dipakai. */
  timeOptions?: string[]
  /** Pilihan tempat ngopi yang divoting. */
  coffeeOptions?: PlaceRef[]
  myVote?: Vote
  /** Pesan ajakan pendek (tampil tulisan tangan di catatan tempel). */
  note?: string
  hostChar?: CharConfig
  /** Check-in rombongan: kunci 'start' | id checkpoint | 'finish' → waktu ISO. */
  checkins?: Record<string, string>
  /** Titip pesanan ke satu orang (runner) yang memesan & membayar dulu. */
  orders?: Order[]
  runner?: string
  billedAt?: string
  /** Rekening host (dibawa di link undangan supaya tamu tahu transfer ke mana). */
  hostPay?: PayAccount[]
  myStatus?: TripStatus
  /** Ajakan yang tersimpan di server (host punya akun). */
  remote?: { hostUid: string; hostHandle?: string; repliedAt?: string }
  publishedAt?: string
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
  /** Rekening/e-wallet untuk patungan — tidak perlu kirim nomor rekening berulang ke grup. */
  pay?: PayAccount[]
}

export interface PayAccount { id: string; kind: 'bank' | 'ewallet'; provider: string; number: string; holder: string }

/** Titipan pesanan (kopi/makan) di checkpoint ngopi. */
export interface Order { id: string; who: string; name?: string; item: string; note?: string; price?: number; qty: number; at?: string }

/** Catatan utang: `from` berutang `amount` ke `to`. Id orang: 'me' | id teman | 'g-…' tamu. */
export interface Debt { id: string; rideId?: string; from: string; fromName?: string; to: string; toName?: string; amount: number; note: string; at: string; paid?: string }

/** Status perjalanan peserta untuk papan kedatangan. */
export type TripStatus = 'otw' | 'tiba' | 'pulang'

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
