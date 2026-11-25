import type { CharConfig, GroupRide, LatLng, Rsvp, Vote } from './types'
import { fmtDate } from './util'
import { isCharConfig, sanitizeChar } from './avatar'

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))
const r5 = (x: number) => +x.toFixed(5)

/* ---------- Avatar ringkas (supaya karakter ikut terbawa di link) ---------- */
const CK = ['head', 'hair', 'eyes', 'eyebrows', 'mouth', 'nose', 'glasses', 'earrings', 'beard', 'freckles', 'flowers', 'skin', 'hairColor', 'accColor', 'bg'] as const
const shortV = (v: unknown) => (typeof v === 'string' ? v.replace(/^variant/, '~') : v === true ? 1 : v === false || v == null ? 0 : v)
const longV = (v: unknown) => (typeof v === 'string' ? v.replace(/^~/, 'variant') : v)
export function packChar(c: CharConfig): unknown[] { return CK.map((k) => shortV(c[k])) }
export function unpackChar(a: unknown): CharConfig | undefined {
  if (!Array.isArray(a) || a.length < 14) return undefined
  const o: Record<string, unknown> = { v: 2 }
  CK.forEach((k, i) => { const v = longV(a[i]); o[k] = k === 'freckles' || k === 'flowers' ? !!v : v === 0 ? null : v })
  return isCharConfig(o) ? sanitizeChar(o as unknown as CharConfig) : undefined
}

/* ---------- Undangan (host → teman) ---------- */
/** Undangan dikodekan di URL — teman bisa membuka, voting & RSVP tanpa server. */
export function inviteLink(g: GroupRide, hostName: string, hostChar?: CharConfig): string {
  const t0 = new Date(g.datetime).getTime()
  const payload = {
    v: 2, i: g.id, t: g.title, d: g.datetime, m: g.meet.name, p: g.meet.pos.map(r5), pc: g.pace, k: g.distanceKm, r: g.route, n: g.notes, nd: g.noDrop, h: hostName,
    nt: g.note, hc: hostChar ? packChar(hostChar) : undefined,
    to: g.timeOptions && g.timeOptions.length > 1 ? g.timeOptions.map((x) => Math.round((new Date(x).getTime() - t0) / 60000)) : undefined,
    co: g.coffeeOptions?.length ? g.coffeeOptions.map((c) => [c.name, r5(c.pos[0]), r5(c.pos[1]), c.kind]) : undefined,
    c: g.plan?.checkpoints.map((c) => [c.place?.name ?? c.name, r5(c.pos[0]), r5(c.pos[1]), c.kind, c.stopMin]),
    f: g.plan?.finish ? [g.plan.finish.pos[0], g.plan.finish.pos[1]] : undefined, s: g.plan?.speed,
  }
  return `${location.origin}${location.pathname}#/join/${b64(JSON.stringify(payload))}`
}

export function parseInvite(code: string): GroupRide | null {
  try {
    const p = JSON.parse(unb64(code))
    const t0 = new Date(p.d).getTime()
    return {
      id: p.i ?? 'inv-' + code.slice(0, 10), title: p.t, datetime: p.d, meet: { name: p.m, pos: p.p }, pace: p.pc, distanceKm: p.k,
      route: p.r, notes: p.n, noDrop: !!p.nd, participants: [], myRsvp: 'menunggu', host: p.h || 'Teman',
      note: p.nt, hostChar: unpackChar(p.hc),
      timeOptions: Array.isArray(p.to) ? p.to.map((m: number) => new Date(t0 + m * 60000).toISOString()) : undefined,
      coffeeOptions: Array.isArray(p.co) ? p.co.map((c: [string, number, number, string]) => ({ name: c[0], pos: [c[1], c[2]] as LatLng, kind: c[3] ?? 'Kafe' })) : undefined,
      plan: p.c ? {
        id: 'invp-' + (p.i ?? code.slice(0, 8)), name: p.t, start: { name: p.m, pos: p.p }, finish: p.f ? { name: 'Finish', pos: p.f } : null, speed: p.s ?? 22, startTime: p.d,
        checkpoints: p.c.map((c: [string, number, number, string, number], i: number) => ({ id: 'cp' + i, name: c[0], pos: [c[1], c[2]], kind: c[3], stopMin: c[4], place: { name: c[0], kind: '', pos: [c[1], c[2]] } })),
      } : undefined,
    }
  } catch {
    return null
  }
}

/* ---------- Balasan (teman → host) — RSVP dua arah tanpa server ---------- */
export interface Reply { rideId: string; name: string; rsvp: Rsvp; vote?: Vote; from?: LatLng; note?: string; char?: CharConfig; at: string }

export function replyLink(r: Reply): string {
  const payload = { i: r.rideId, n: r.name, r: r.rsvp, t: r.vote?.t, c: r.vote?.c, f: r.from?.map((x) => +x.toFixed(2)), m: r.note, a: r.char ? packChar(r.char) : undefined, at: r.at }
  return `${location.origin}${location.pathname}#/balas/${b64(JSON.stringify(payload))}`
}

export function parseReply(code: string): Reply | null {
  try {
    const p = JSON.parse(unb64(code))
    if (!p.i || !p.n || !['ikut', 'mungkin', 'tidak'].includes(p.r)) return null
    return { rideId: p.i, name: String(p.n).slice(0, 40), rsvp: p.r, vote: p.t != null || p.c != null ? { t: p.t ?? undefined, c: p.c ?? undefined } : undefined, from: Array.isArray(p.f) ? [p.f[0], p.f[1]] : undefined, note: p.m ? String(p.m).slice(0, 140) : undefined, char: unpackChar(p.a), at: p.at ?? new Date().toISOString() }
  } catch {
    return null
  }
}

export function replyText(g: GroupRide, r: Reply, link: string): string {
  const head = r.rsvp === 'ikut' ? `✅ Aku ikut *${g.title}*!` : r.rsvp === 'mungkin' ? `🤔 Mungkin ikut *${g.title}*.` : `🙏 Maaf, kali ini nggak bisa ikut *${g.title}*.`
  const t = r.vote?.t != null && g.timeOptions?.[r.vote.t] ? `\n🕐 Pilih jam: ${fmtDate(g.timeOptions[r.vote.t], true)}` : ''
  const c = r.vote?.c != null && g.coffeeOptions?.[r.vote.c] ? `\n☕ Ngopi: ${g.coffeeOptions[r.vote.c].name}` : ''
  return `${head}${t}${c}${r.note ? `\n💬 ${r.note}` : ''}\n\nKetuk supaya jawabanku masuk ke Kayuh-mu: ${link}`
}

/* ---------- Teks ---------- */
export function inviteText(g: GroupRide, link: string): string {
  const vote = g.timeOptions && g.timeOptions.length > 1 ? `\n🗳 Pilih jam: ${g.timeOptions.map((t) => fmtDate(t, true).split('· ')[1]).join(' / ')}` : ''
  const kopi = g.coffeeOptions?.length ? `\n☕ Ngopi di: ${g.coffeeOptions.map((c) => c.name).join(' / ')} (voting)` : ''
  const cps = g.plan?.checkpoints.length ? `\n📍 Checkpoint: ${g.plan.checkpoints.map((c) => c.place?.name ?? c.name).join(' → ')}` : ''
  return `🚲 *${g.title}*${g.note ? `\n“${g.note}”` : ''}\n📅 ${fmtDate(g.datetime, true)}${vote}\n📍 Kumpul: ${g.meet.name}${cps}${kopi}\n🗺 https://maps.google.com/?q=${g.meet.pos[0]},${g.meet.pos[1]}\n⚡ ${g.distanceKm} km · pace ${g.pace}${g.noDrop ? ' · no-drop' : ''}\n\nJawab (10 detik): ${link}`
}

export async function shareOrCopy(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) { await navigator.share({ title, text }); return 'shared' }
  } catch { /* user batal */ return 'failed' }
  try { await navigator.clipboard.writeText(text); return 'copied' } catch { return 'failed' }
}

export const waLink = (text: string, phone?: string) => `https://wa.me/${phone ? phone.replace(/\D/g, '').replace(/^0/, '62') : ''}?text=${encodeURIComponent(text)}`
