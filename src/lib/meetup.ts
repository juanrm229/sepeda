import type { CharConfig, Friend, GroupRide, LatLng, Participant, RoutePlan } from './types'
import { pointAtKm } from './routing'
import { centroid, haversine } from './geo'
import type { Reply } from './share'
import type { Hour } from './weather'

/* =====================================================================
   Logika "ketemuan": voting, balasan, titik searah, jemput berantai,
   ketersediaan squad.
   ===================================================================== */

export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
export const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n

/** Siapa saja di sebuah ajakan, dengan data lengkap (teman tersimpan atau tamu). */
export interface Person { id: string; name: string; char?: CharConfig; color: string; rsvp: Participant['rsvp']; home?: LatLng; spd: number; vote?: Participant['vote']; note?: string; me?: boolean }

export function peopleOf(g: GroupRide, friends: Friend[], me: { name: string; char: CharConfig; home: LatLng; spd?: number }): Person[] {
  const list: Person[] = [{ id: 'me', name: me.name, char: me.char, color: '#111111', rsvp: g.myRsvp, home: me.home, spd: me.spd ?? 24, vote: g.myVote, me: true }]
  for (const p of g.participants) {
    const f = friends.find((x) => x.id === p.friendId)
    list.push({ id: p.friendId, name: f?.name ?? p.name ?? 'Tamu', char: p.char ?? f?.char, color: f?.color ?? '#8a8a85', rsvp: p.rsvp, home: p.from ?? f?.home, spd: f?.avgSpeed ?? 22, vote: p.vote, note: p.note })
  }
  return list
}

export function rsvpCount(g: GroupRide) {
  const all = [g.myRsvp, ...g.participants.map((p) => p.rsvp)]
  return { ikut: all.filter((r) => r === 'ikut').length, mungkin: all.filter((r) => r === 'mungkin').length, tidak: all.filter((r) => r === 'tidak').length, menunggu: all.filter((r) => r === 'menunggu').length, total: all.length }
}

/** Hitung suara per opsi jam & kopi. */
export function tally(g: GroupRide) {
  const votes = [g.myVote, ...g.participants.filter((p) => p.rsvp !== 'tidak').map((p) => p.vote)]
  const t = (g.timeOptions ?? []).map((_, i) => votes.filter((v) => v?.t === i).length)
  const c = (g.coffeeOptions ?? []).map((_, i) => votes.filter((v) => v?.c === i).length)
  const lead = (a: number[]) => (a.length ? a.indexOf(Math.max(...a)) : -1)
  return { t, c, tLead: lead(t), cLead: lead(c), voters: votes.filter((v) => v && (v.t != null || v.c != null)).length }
}

const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'tamu'

/** Gabungkan balasan teman ke ajakan milik host. Mencocokkan nama ke daftar teman. */
export function mergeReply(g: GroupRide, friends: Friend[], r: Reply): { g: GroupRide; who: string; isNew: boolean } {
  const lower = r.name.trim().toLowerCase()
  const f = friends.find((x) => x.name.toLowerCase() === lower) ?? friends.find((x) => firstName(x.name).toLowerCase() === firstName(lower))
  const pid = f?.id ?? 'g-' + slug(r.name)
  const prev = g.participants.find((p) => p.friendId === pid)
  const next: Participant = { ...(prev ?? {}), friendId: pid, rsvp: r.status ? prev?.rsvp ?? 'ikut' : r.rsvp, name: f ? undefined : r.name, char: r.char ?? prev?.char, from: r.from ?? prev?.from, vote: r.vote ?? prev?.vote, note: r.note ?? prev?.note, at: r.at,
    order: r.order ?? prev?.order, status: r.status ?? prev?.status, statusAt: r.status ? r.at : prev?.statusAt, eta: r.status ? r.eta : prev?.eta }
  let orders = g.orders ?? []
  if (r.order) {
    const oid = 'r-' + pid
    const o = { id: oid, who: pid, name: f ? undefined : r.name, item: r.order.item, note: r.order.note, price: r.order.price, qty: 1, at: r.at }
    orders = orders.some((x) => x.id === oid) ? orders.map((x) => (x.id === oid ? o : x)) : [...orders, o]
  }
  return {
    g: { ...g, orders, participants: prev ? g.participants.map((p) => (p.friendId === pid ? next : p)) : [...g.participants, next] },
    who: f?.name ?? r.name,
    isNew: !prev,
  }
}

/* ---------- Titik temu "searah tujuan" ---------- */
/**
 * Titik kumpul yang meminimalkan total (rumah → titik → tujuan) semua orang.
 * = median geometris dengan tujuan diberi bobot n (algoritma Weiszfeld).
 * Hasilnya titik yang "searah" — tidak ada yang harus balik arah.
 */
export function enRoutePoint(pts: LatLng[], dest: LatLng): LatLng {
  if (!pts.length) return dest
  const all = [...pts, dest]
  const w = [...pts.map(() => 1), pts.length]
  let x = centroid(all)
  for (let it = 0; it < 200; it++) {
    let nx = 0, ny = 0, den = 0
    all.forEach((p, i) => { const d = Math.max(0.05, haversine(x, p)); nx += (w[i] * p[0]) / d; ny += (w[i] * p[1]) / d; den += w[i] / d })
    const n: LatLng = [nx / den, ny / den]
    if (haversine(n, x) < 0.002) { x = n; break }
    x = n
  }
  return x
}

/* ---------- Jemput berantai ---------- */
export interface ChainStop { person: Person; at: Date; legKm: number; groupSize: number }
export interface ChainGroup { stops: ChainStop[]; soloKm: number; directKm: number }
export interface Chain { groups: ChainGroup[]; arrive: Date; totalKm: number; longestSolo: number; longestDirect: number; pickups: number }

const ROAD = 1.3

/**
 * "Nggak ada yang gowes sendirian ke titik kumpul" — sebisa mungkin.
 * Mulai dari orang terjauh; ia menjemput orang yang kebetulan searah
 * (memutar ≤ 25% jaraknya atau ≤ 2 km, dan lebih dekat ke tujuan). Kalau tidak ada
 * yang searah, rombongan baru dimulai. Waktu dihitung mundur dari jam kumpul
 * dengan kecepatan orang paling lambat di rombongan × 0,8.
 */
export function pickupChain(people: Person[], dest: LatLng, arriveAt: Date): Chain | null {
  const ps = people.filter((p) => p.home)
  if (ps.length < 2) return null
  const d = (a: LatLng, b: LatLng) => haversine(a, b)
  const left = [...ps].sort((a, b) => d(b.home!, dest) - d(a.home!, dest))
  const groups: ChainGroup[] = []
  while (left.length) {
    const order: Person[] = [left.shift()!]
    for (;;) {
      const cur = order[order.length - 1].home!
      const base = d(cur, dest)
      let best = -1, bestCost = Infinity
      left.forEach((p, i) => {
        const cost = d(cur, p.home!) + d(p.home!, dest) - base
        if (d(p.home!, dest) < base && cost <= Math.max(2, base * 0.25) && cost < bestCost) { bestCost = cost; best = i }
      })
      if (best < 0) break
      order.push(left.splice(best, 1)[0])
    }
    const legs = order.map((p, i) => d(p.home!, i < order.length - 1 ? order[i + 1].home! : dest) * ROAD)
    const legMin = legs.map((km, i) => (km / (Math.min(...order.slice(0, i + 1).map((p) => p.spd)) * 0.8)) * 60 + (i < order.length - 1 ? 3 : 0))
    let t = arriveAt.getTime()
    const times: number[] = []
    for (let i = order.length - 1; i >= 0; i--) { t -= legMin[i] * 60000; times[i] = t }
    groups.push({
      stops: order.map((p, i) => ({ person: p, at: new Date(times[i]), legKm: legs[i], groupSize: i + 1 })),
      soloKm: legs[0],
      directKm: d(order[0].home!, dest) * ROAD,
    })
  }
  return {
    groups,
    arrive: arriveAt,
    totalKm: groups.reduce((a, g) => a + g.stops.reduce((b, s) => b + s.legKm, 0), 0),
    longestSolo: Math.max(...groups.map((g) => (g.stops.length > 1 ? g.soloKm : 0))),
    longestDirect: Math.max(...ps.map((p) => d(p.home!, dest) * ROAD)),
    pickups: groups.reduce((a, g) => a + g.stops.length - 1, 0),
  }
}

/* ---------- Ketersediaan squad ---------- */
export const SLOTS = [
  { l: 'Pagi', h: 5, m: 30, range: '05–08' },
  { l: 'Sore', h: 15, m: 30, range: '15–18' },
  { l: 'Malam', h: 19, m: 30, range: '19–21' },
] as const
export const bit = (jsDay: number, slot: number) => 1 << (jsDay * 3 + slot)
export const isFree = (mask: number | undefined, jsDay: number, slot: number) => !!((mask ?? 0) & bit(jsDay, slot))

export interface SlotPick { date: Date; slot: number; free: string[]; score: number | null; rank: number }

/** 7 hari ke depan × 3 slot: siapa yang bisa + skor cuaca, diurutkan terbaik. */
export function squadSlots(members: { id: string; avail?: number }[], hours: Hour[] | undefined, from = new Date()): SlotPick[] {
  const out: SlotPick[] = []
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < 3; s++) {
      const date = new Date(from); date.setDate(from.getDate() + d); date.setHours(SLOTS[s].h, SLOTS[s].m, 0, 0)
      if (date.getTime() < from.getTime() + 30 * 60000) continue
      const free = members.filter((m) => isFree(m.avail, date.getDay(), s)).map((m) => m.id)
      const h = hours?.find((x) => Math.abs(x.time.getTime() - date.getTime()) <= 45 * 60000)
      const score = h ? h.score : null
      out.push({ date, slot: s, free, score, rank: free.length * 100 + (score ?? 55) })
    }
  }
  return out.sort((a, b) => b.rank - a.rank)
}

/** Detik → teks "3 hari lagi", "besok 05.30" dsb. */
export function whenText(iso: string): string {
  const d = new Date(iso), now = new Date()
  const day = Math.round((new Date(d.toDateString()).getTime() - new Date(now.toDateString()).getTime()) / 86400000)
  const w = day === 0 ? 'hari ini' : day === 1 ? 'besok' : day === 2 ? 'lusa' : day < 7 && day > 0 ? ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getDay()] + ' ini' : `${d.getDate()}/${d.getMonth() + 1}`
  return `${w} ${hhmm(d)}`
}

/** Status perjalanan untuk stepper: urutan titik + mana yang sudah check-in. */
export function journey(g: GroupRide) {
  const cps = g.plan?.checkpoints ?? []
  const nodes = [
    { key: 'start', label: 'Kumpul', name: g.meet.name, kind: 'start' as const },
    ...cps.map((c, i) => ({ key: c.id, label: c.kind === 'kopi' ? 'Ngopi' : `CP${i + 1}`, name: c.place?.name ?? c.name, kind: c.kind })),
    { key: 'finish', label: 'Finish', name: g.plan?.finish?.name ?? (g.plan ? g.meet.name : 'Selesai'), kind: 'finish' as const },
  ]
  const ck = g.checkins ?? {}
  const doneIdx = nodes.reduce((a, n, i) => (ck[n.key] ? i : a), -1)
  return { nodes, ck, doneIdx, nowIdx: Math.min(nodes.length - 1, doneIdx + 1) }
}

/* ---------- Kopi Sinkron ---------- */
export interface SyncGroup { label: string; people: Person[]; speed: number; startAt: Date; extraKm: number }
/**
 * Rombongan campuran selalu saling tunggu. Kopi Sinkron membagi peserta per pace
 * lalu menghitung jam start (atau putaran tambahan) supaya semua TIBA BERSAMAAN di kedai kopi.
 */
export function coffeeSync(people: Person[], kmToCoffee: number, startAt: Date): { groups: SyncGroup[]; arrive: Date } | null {
  const ps = people.filter((p) => p.rsvp === 'ikut')
  if (ps.length < 2 || kmToCoffee < 2) return null
  const lo = Math.min(...ps.map((p) => p.spd)), hi = Math.max(...ps.map((p) => p.spd))
  if (hi - lo < 3) return null
  const mid = (lo + hi) / 2
  const fast = ps.filter((p) => p.spd >= mid), slow = ps.filter((p) => p.spd < mid)
  if (!fast.length || !slow.length) return null
  const vs = Math.min(...slow.map((p) => p.spd)) * 0.9
  const vf = Math.min(...fast.map((p) => p.spd)) * 0.9
  const tSlow = kmToCoffee / vs, tFast = kmToCoffee / vf
  const arrive = new Date(startAt.getTime() + tSlow * 3600000)
  return {
    arrive,
    groups: [
      { label: 'Santai', people: slow, speed: vs, startAt, extraKm: 0 },
      { label: 'Kencang', people: fast, speed: vf, startAt: new Date(startAt.getTime() + (tSlow - tFast) * 3600000), extraKm: kmToCoffee * (vf / vs - 1) },
    ],
  }
}

/* ---------- Titik kumpul ulang (no-drop) ---------- */
export function regroupPoints(plan: RoutePlan, every = 10): { km: number; pos: LatLng }[] {
  const path = plan.geometry?.length ? plan.geometry : [plan.start.pos, ...plan.checkpoints.map((c) => c.place?.pos ?? c.pos), (plan.finish ?? plan.start).pos]
  let total = 0
  for (let i = 1; i < path.length; i++) total += haversine(path[i - 1], path[i])
  const scale = plan.geometry?.length ? 1 : 1.3
  const out: { km: number; pos: LatLng }[] = []
  for (let k = every; k < total * scale - every / 2; k += every) out.push({ km: k, pos: pointAtKm(path, k / scale) })
  return out.slice(0, 8)
}

/* ---------- Geser karena cuaca ---------- */
export function weatherShift(hours: Hour[] | undefined, at: Date): { from: Hour; to: Hour } | null {
  if (!hours) return null
  const cur = hours.find((h) => Math.abs(h.time.getTime() - at.getTime()) < 1800000)
  if (!cur || cur.rain < 50) return null
  const cands = hours.filter((h) => Math.abs(h.time.getTime() - at.getTime()) <= 3 * 3600000 && h.time.getTime() > Date.now() + 3600000 && h.isDay && h.rain <= cur.rain - 25)
  if (!cands.length) return null
  const best = cands.sort((a, b) => b.score - a.score || Math.abs(a.time.getTime() - at.getTime()) - Math.abs(b.time.getTime() - at.getTime()))[0]
  return { from: cur, to: best }
}

/* ---------- Kimia squad ---------- */
export function missedFriends(friends: Friend[], rides: GroupRide[], soloRides: { date: string; friendIds?: string[] }[], minDays = 14) {
  const now = Date.now()
  return friends.map((f) => {
    const dates = [
      ...rides.filter((g) => new Date(g.datetime).getTime() < now && g.myRsvp === 'ikut' && g.participants.some((p) => p.friendId === f.id && p.rsvp === 'ikut')).map((g) => new Date(g.datetime).getTime()),
      ...soloRides.filter((r) => r.friendIds?.includes(f.id)).map((r) => new Date(r.date).getTime()),
    ]
    const last = dates.length ? Math.max(...dates) : null
    return { f, last, days: last ? Math.floor((now - last) / 86400000) : null }
  }).filter((x) => x.days == null || x.days >= minDays).sort((a, b) => (b.days ?? 999) - (a.days ?? 999))
}
