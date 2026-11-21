import type { GroupRide } from './types'
import { fmtDate } from './util'

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))

/** Undangan dikodekan di URL — teman bisa membuka & RSVP tanpa server. */
export function inviteLink(g: GroupRide, hostName: string): string {
  const payload = { t: g.title, d: g.datetime, m: g.meet.name, p: g.meet.pos.map((x) => +x.toFixed(5)), pc: g.pace, k: g.distanceKm, r: g.route, n: g.notes, nd: g.noDrop, h: hostName }
  return `${location.origin}${location.pathname}#/join/${b64(JSON.stringify(payload))}`
}

export function parseInvite(code: string): GroupRide | null {
  try {
    const p = JSON.parse(unb64(code))
    return {
      id: 'inv-' + code.slice(0, 10), title: p.t, datetime: p.d, meet: { name: p.m, pos: p.p }, pace: p.pc, distanceKm: p.k,
      route: p.r, notes: p.n, noDrop: !!p.nd, participants: [], myRsvp: 'menunggu', host: p.h || 'Teman',
    }
  } catch {
    return null
  }
}

export function inviteText(g: GroupRide, link: string): string {
  return `🚲 *${g.title}*\n📅 ${fmtDate(g.datetime, true)}\n📍 ${g.meet.name}\n🗺 https://maps.google.com/?q=${g.meet.pos[0]},${g.meet.pos[1]}\n⚡ ${g.distanceKm} km · pace ${g.pace}${g.noDrop ? ' · no-drop (nggak ada yang ditinggal)' : ''}\n\nKonfirmasi ikut di sini: ${link}`
}

export async function shareOrCopy(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) { await navigator.share({ title, text }); return 'shared' }
  } catch { /* user batal */ return 'failed' }
  try { await navigator.clipboard.writeText(text); return 'copied' } catch { return 'failed' }
}

export const waLink = (text: string, phone?: string) => `https://wa.me/${phone ? phone.replace(/\D/g, '').replace(/^0/, '62') : ''}?text=${encodeURIComponent(text)}`
