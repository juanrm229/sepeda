import type { CheckpointKind, LatLng, RoutePlan } from './types'
import type { PlaceCat } from './places'
import { fmtDate, uid } from './util'

export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`

export const CP_KIND: Record<CheckpointKind, { l: string; emoji: string; stop: number; cat: PlaceCat }> = {
  rehat: { l: 'Rehat', emoji: '⏸', stop: 10, cat: 'minimarket' },
  kopi: { l: 'Coffee break', emoji: '☕', stop: 20, cat: 'kopi' },
  makan: { l: 'Makan', emoji: '🍜', stop: 35, cat: 'makan' },
  air: { l: 'Isi air', emoji: '💧', stop: 5, cat: 'air' },
  foto: { l: 'Foto', emoji: '📸', stop: 5, cat: 'kumpul' },
  sholat: { l: 'Sholat', emoji: '🕌', stop: 15, cat: 'masjid' },
  bengkel: { l: 'Bengkel', emoji: '🔧', stop: 15, cat: 'bengkel' },
}
export function defaultPlan(start: { name: string; pos: LatLng }, startTime?: string): RoutePlan {
  const t = new Date(); t.setDate(t.getDate() + ((6 - t.getDay() + 7) % 7 || 7)); t.setHours(5, 30, 0, 0)
  return { id: uid(), name: 'Rute baru', start, finish: null, checkpoints: [], speed: 24, startTime: startTime ?? t.toISOString() }
}

/** Hitung ETA tiap checkpoint dari legs jarak. */
export function timeline(plan: RoutePlan) {
  const legs = plan.legsKm ?? []
  let t = new Date(plan.startTime).getTime()
  let km = 0
  const rows = plan.checkpoints.map((c, i) => {
    const leg = legs[i] ?? 0
    km += leg
    t += (leg / plan.speed) * 3600000
    const arrive = new Date(t)
    t += c.stopMin * 60000
    return { c, leg, km, arrive, leave: new Date(t) }
  })
  const lastLeg = legs[plan.checkpoints.length] ?? 0
  km += lastLeg
  t += (lastLeg / plan.speed) * 3600000
  const stopMin = plan.checkpoints.reduce((a, c) => a + c.stopMin, 0)
  return { rows, lastLeg, totalKm: km, finish: new Date(t), stopMin, rideMin: Math.round((km / plan.speed) * 60) }
}

export function itineraryText(plan: RoutePlan, title?: string) {
  const tl = timeline(plan)
  const g = (p: LatLng) => `https://maps.google.com/?q=${p[0].toFixed(5)},${p[1].toFixed(5)}`
  const lines = [
    `🚲 *${title ?? plan.name}* — ${fmtDate(plan.startTime)}`,
    `${tl.totalKm.toFixed(1)} km · ${Math.floor(tl.rideMin / 60)}j ${tl.rideMin % 60}m gowes + ${tl.stopMin} mnt rehat · finish ±${hhmm(tl.finish)}`,
    '',
    `🟢 ${hhmm(new Date(plan.startTime))} Start — ${plan.start.name}`,
    ...tl.rows.map((r, i) => `${CP_KIND[r.c.kind].emoji} ${hhmm(r.arrive)} CP${i + 1} ${r.c.place?.name ?? r.c.name} (km ${r.km.toFixed(1)}, ${r.c.stopMin} mnt) ${g(r.c.place?.pos ?? r.c.pos)}`),
    `🏁 ${hhmm(tl.finish)} Finish — ${plan.finish?.name ?? plan.start.name}`,
  ]
  return lines.join('\n')
}

export function gmapsDirections(plan: RoutePlan) {
  const s = plan.start.pos, f = (plan.finish ?? plan.start).pos
  const wp = plan.checkpoints.map((c) => (c.place?.pos ?? c.pos).map((x) => x.toFixed(5)).join(',')).join('|')
  return `https://www.google.com/maps/dir/?api=1&origin=${s[0]},${s[1]}&destination=${f[0]},${f[1]}${wp ? `&waypoints=${encodeURIComponent(wp)}` : ''}&travelmode=bicycling`
}

