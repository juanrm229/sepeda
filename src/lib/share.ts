import type { GroupRide } from './types'
import { fmtDate } from './util'

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))

/** Undangan dikodekan di URL — teman bisa membuka & RSVP tanpa server. */
export function inviteLink(g: GroupRide, hostName: string): string {
  const payload = { t: g.title, d: g.datetime, m: g.meet.name, p: g.meet.pos.map((x) => +x.toFixed(5)), pc: g.pace, k: g.distanceKm, r: g.route, n: g.notes, nd: g.noDrop, h: hostName,
    c: g.plan?.checkpoints.map((c) => [c.place?.name ?? c.name, +c.pos[0].toFixed(5), +c.pos[1].toFixed(5), c.kind, c.stopMin]), f: g.plan?.finish ? [g.plan.finish.pos[0], g.plan.finish.pos[1]] : undefined, s: g.plan?.speed }
  return `${location.origin}${location.pathname}#/join/${b64(JSON.stringify(payload))}`
}

export function parseInvite(code: string): GroupRide | null {
  try {
    const p = JSON.parse(unb64(code))
    return {
      id: 'inv-' + code.slice(0, 10), title: p.t, datetime: p.d, meet: { name: p.m, pos: p.p }, pace: p.pc, distanceKm: p.k,
      route: p.r, notes: p.n, noDrop: !!p.nd, participants: [], myRsvp: 'menunggu', host: p.h || 'Teman',
      plan: p.c ? {
        id: 'invp-' + code.slice(0, 8), name: p.t, start: { name: p.m, pos: p.p }, finish: p.f ? { name: 'Finish', pos: p.f } : null, speed: p.s ?? 22, startTime: p.d,
        checkpoints: p.c.map((c: [string, number, number, string, number], i: number) => ({ id: 'cp' + i, name: c[0], pos: [c[1], c[2]], kind: c[3], stopMin: c[4], place: { name: c[0], kind: '', pos: [c[1], c[2]] } })),
      } : undefined,
    }
  } catch {
    return null
  }
}

export function inviteText(g: GroupRide, link: string): string {
  const cps = g.plan?.checkpoints.length ? `\n☕ Checkpoint: ${g.plan.checkpoints.map((c) => c.place?.name ?? c.name).join(' → ')}` : ''
  return `🚲 *${g.title}*\n📅 ${fmtDate(g.datetime, true)}\n📍 ${g.meet.name}${cps}\n🗺 https://maps.google.com/?q=${g.meet.pos[0]},${g.meet.pos[1]}\n⚡ ${g.distanceKm} km · pace ${g.pace}${g.noDrop ? ' · no-drop (nggak ada yang ditinggal)' : ''}\n\nKonfirmasi ikut di sini: ${link}`
}

export async function shareOrCopy(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) { await navigator.share({ title, text }); return 'shared' }
  } catch { /* user batal */ return 'failed' }
  try { await navigator.clipboard.writeText(text); return 'copied' } catch { return 'failed' }
}

export const waLink = (text: string, phone?: string) => `https://wa.me/${phone ? phone.replace(/\D/g, '').replace(/^0/, '62') : ''}?text=${encodeURIComponent(text)}`
