import { useEffect, useState } from 'react'
import { useStore, snapshot } from './store'
import { api, setTokenGetter } from './api'
import type { Friend, GroupRide, Participant, PublicProfile } from './types'
import { mergeReply } from './meetup'
import { randomChar } from './avatar'

/* =====================================================================
   Sinkron akun: simpan otomatis, terbitkan ajakan, ambil undangan,
   perbarui profil teman, kirim jawaban langsung ke host.
   ===================================================================== */

export type SyncStatus = 'off' | 'idle' | 'saving' | 'saved' | 'offline'
let status: SyncStatus = 'off'
const subs = new Set<(s: SyncStatus) => void>()
const setStatus = (s: SyncStatus) => { status = s; subs.forEach((f) => f(s)) }
export function useSyncStatus() {
  const [s, setS] = useState(status)
  useEffect(() => { subs.add(setS); return () => { subs.delete(setS) } }, [])
  return s
}

const hashes = (() => { try { return JSON.parse(localStorage.getItem('pack-sync') || '{}') as Record<string, string> } catch { return {} as Record<string, string> } })()
const saveHashes = () => { try { localStorage.setItem('pack-sync', JSON.stringify(hashes)) } catch { /* */ } }
const hash = (x: unknown) => { const s = JSON.stringify(x); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h) + ':' + s.length }

/** Profil publik dari pengaturan saya. */
function myProfile() {
  const s = useStore.getState()
  return { name: s.settings.name, char: s.char, homeLabel: s.settings.homeLabel, home: s.settings.home.map((x) => +x.toFixed(2)) as [number, number], avail: s.avail, pay: s.settings.pay ?? [] }
}

/** Ajakan sebagaimana dilihat tamu (tanpa data lokal milik host). */
function publicRide(g: GroupRide) {
  const s = useStore.getState()
  const { myStatus: _a, checkins: _b, remote: _c, publishedAt: _d, ...rest } = g
  void _a; void _b; void _c; void _d
  return { ...rest, hostPay: s.settings.pay ?? [], hostChar: s.char, hostName: s.settings.name }
}

function myReply(g: GroupRide) {
  const s = useStore.getState()
  const mine = g.orders?.find((o) => o.who === 'me')
  return {
    name: s.settings.name, rsvp: g.myRsvp, vote: g.myVote, status: g.myStatus, char: s.char,
    from: s.settings.home.map((x) => +x.toFixed(2)),
    order: mine ? { item: mine.item + (mine.qty > 1 ? ` ×${mine.qty}` : ''), note: mine.note, price: mine.price } : undefined,
  }
}

async function flush() {
  const s = useStore.getState()
  if (!s.auth) return setStatus('off')
  setStatus('saving')
  try {
    const snap = snapshot(s)
    const hs = hash(snap)
    if (hashes.state !== hs) { await api.putState(snap, new Date().toISOString()); hashes.state = hs }
    const prof = myProfile(); const hp = hash(prof)
    if (hashes.profile !== hp) { await api.saveProfile(prof); hashes.profile = hp }
    for (const g of s.groupRides) {
      if (g.host === 'me') {
        const pub = publicRide(g)
        const invitees = g.participants.map((p) => p.uid ?? s.friends.find((f) => f.id === p.friendId)?.uid).filter(Boolean) as string[]
        const h = hash({ pub, invitees })
        if (hashes['r:' + g.id] !== h) { await api.publish(pub, invitees); hashes['r:' + g.id] = h }
      } else if (g.remote && g.myRsvp !== 'menunggu') {
        const rep = myReply(g); const h = hash(rep)
        if (hashes['a:' + g.id] !== h) { await api.reply(g.id, rep); hashes['a:' + g.id] = h }
      }
    }
    saveHashes()
    setStatus('saved')
  } catch (e) {
    setStatus((e as { status?: number }).status === 0 ? 'offline' : 'idle')
    if ((e as { status?: number }).status === 401) useStore.getState().setAuth(null)
  }
}

/** Teman dari profil publik (dipakai saat menambah lewat @username atau undangan). */
export function friendFromProfile(p: PublicProfile, existing?: Friend): Friend {
  return {
    id: existing?.id ?? 'u:' + p.uid, uid: p.uid, handle: p.handle, name: p.name, color: existing?.color ?? '#111111',
    avgSpeed: p.avgSpeed ?? existing?.avgSpeed ?? 23, weeklyKm: existing?.weeklyKm ?? 0,
    home: p.home ?? existing?.home ?? useStore.getState().settings.home, homeLabel: p.homeLabel ?? existing?.homeLabel ?? '—',
    char: (p.char as Friend['char']) ?? existing?.char ?? randomChar(p.handle), avail: p.avail ?? existing?.avail ?? 0, pay: p.pay ?? existing?.pay,
  }
}

/** Ambil undangan & segarkan profil teman. */
export async function pull() {
  const s = useStore.getState()
  if (!s.auth) return
  try {
    const [inbox, profs] = await Promise.all([api.inbox(), api.profiles(s.friends.filter((f) => f.uid).map((f) => f.uid!))])
    const st = useStore.getState()
    let friends = st.friends.map((f) => { const p = profs.profiles.find((x) => x.uid === f.uid); return p ? friendFromProfile(p, f) : f })
    let rides = st.groupRides
    for (const it of inbox.rides) {
      if (!it.host) continue
      let host = friends.find((f) => f.uid === it.host.uid)
      if (!host) { host = friendFromProfile(it.host); friends = [...friends, host] }
      const r = it.ride as GroupRide & { hostChar?: unknown; hostName?: string }
      const local = rides.find((x) => x.id === r.id)
      const merged: GroupRide = {
        ...r, participants: local?.participants ?? [], host: host.id, hostChar: host.char, hostPay: r.hostPay ?? host.pay,
        myRsvp: local?.myRsvp ?? 'menunggu', myVote: local?.myVote, myStatus: local?.myStatus, checkins: local?.checkins, orders: local?.orders ?? [],
        remote: { hostUid: it.host.uid, hostHandle: it.host.handle, repliedAt: local?.remote?.repliedAt },
      }
      rides = local ? rides.map((x) => (x.id === r.id ? merged : x)) : [...rides, merged]
    }
    useStore.setState({ friends, groupRides: rides })
  } catch { /* offline: coba lagi nanti */ }
}

/** Gabungkan jawaban dari server ke ajakan (host: daftar peserta; tamu: lihat siapa saja ikut). */
export async function refreshRide(id: string) {
  const s = useStore.getState()
  const g = s.groupRides.find((x) => x.id === id)
  if (!g) return
  try {
    const d = await api.getRide(id)
    let next = useStore.getState().groupRides.find((x) => x.id === id)!
    const myUid = s.auth?.uid
    if (g.host === 'me') {
      for (const r of d.replies) {
        next = mergeReply(next, useStore.getState().friends, { rideId: id, name: r.name, rsvp: r.rsvp, vote: r.vote, from: r.from, note: r.note, char: r.char, order: r.order, status: r.status, eta: r.eta, at: r.at, uid: r.uid } as Parameters<typeof mergeReply>[2]).g
      }
    } else {
      const friends = useStore.getState().friends
      const parts: Participant[] = d.replies.filter((r) => !myUid || r.uid !== myUid).map((r) => {
        const f = r.uid ? friends.find((x) => x.uid === r.uid) : undefined
        return { friendId: f?.id ?? (r.uid ? 'u:' + r.uid : 'g-' + String(r.name).toLowerCase()), uid: r.uid, name: f ? undefined : r.name, rsvp: r.rsvp, vote: r.vote, char: r.char, note: r.note, order: r.order, status: r.status, eta: r.eta, at: r.at }
      })
      const r = d.ride as GroupRide
      next = { ...next, title: r.title, datetime: r.datetime, meet: r.meet, plan: r.plan ?? next.plan, timeOptions: r.timeOptions, coffeeOptions: r.coffeeOptions, note: r.note, hostPay: r.hostPay ?? next.hostPay, participants: parts, remote: next.remote ?? { hostUid: d.host?.uid, hostHandle: d.host?.handle } }
    }
    useStore.getState().upsertGroupRide(next)
    return true
  } catch { return false }
}

/** Pasang mesin sinkron (sekali, di App). */
export function useAccountSync() {
  useEffect(() => {
    setTokenGetter(() => useStore.getState().auth?.token ?? null)
    let t: number | undefined
    let last = 0
    const schedule = () => { clearTimeout(t); t = window.setTimeout(flush, 1800) }
    const unsub = useStore.subscribe((s, p) => { if (s.auth && s !== p) schedule() })
    const focus = () => { if (Date.now() - last > 45000 && useStore.getState().auth) { last = Date.now(); pull() } }
    if (useStore.getState().auth) { setStatus('idle'); last = Date.now(); pull().then(schedule) }
    window.addEventListener('focus', focus)
    document.addEventListener('visibilitychange', focus)
    return () => { unsub(); clearTimeout(t); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus) }
  }, [])
}

/** Setelah daftar/masuk. */
export function resetSyncHashes() { for (const k of Object.keys(hashes)) delete hashes[k]; saveHashes() }
