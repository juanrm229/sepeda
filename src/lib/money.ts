import type { Debt, Friend, GroupRide, Order, PayAccount } from './types'
import { payLine, rp } from './share'
import { firstName } from './meetup'

/* =====================================================================
   Titip pesanan, tagihan patungan & catatan utang.
   ===================================================================== */

export const QUICK_ITEMS = [
  { item: 'Es kopi susu', price: 22000 }, { item: 'Americano', price: 20000 }, { item: 'Latte', price: 28000 },
  { item: 'Kopi tubruk', price: 15000 }, { item: 'Matcha latte', price: 30000 }, { item: 'Teh tarik', price: 18000 },
  { item: 'Air mineral', price: 6000 }, { item: 'Croissant', price: 25000 }, { item: 'Pisang goreng', price: 18000 },
]

export const nameOf = (id: string, friends: Friend[], me: string, fallback?: string) => (id === 'me' ? me : friends.find((f) => f.id === id)?.name ?? fallback ?? 'Tamu')

/** Ringkasan pesanan per item (untuk dibacakan ke barista). */
export function orderSummary(orders: Order[]) {
  const m = new Map<string, { item: string; qty: number; notes: string[] }>()
  for (const o of orders) {
    const k = o.item.trim().toLowerCase()
    const e = m.get(k) ?? { item: o.item.trim(), qty: 0, notes: [] }
    e.qty += o.qty
    if (o.note) e.notes.push(o.note)
    m.set(k, e)
  }
  return [...m.values()].sort((a, b) => b.qty - a.qty)
}

export function perPerson(orders: Order[]) {
  const m = new Map<string, { who: string; name?: string; total: number; items: Order[]; unpriced: number }>()
  for (const o of orders) {
    const e = m.get(o.who) ?? { who: o.who, name: o.name, total: 0, items: [], unpriced: 0 }
    e.items.push(o)
    if (o.price != null) e.total += o.price * o.qty; else e.unpriced++
    m.set(o.who, e)
  }
  return [...m.values()]
}

export function placeOfRide(g: GroupRide) {
  const cp = g.plan?.checkpoints.find((c) => c.kind === 'kopi' || c.kind === 'makan')
  if (cp) return { name: cp.place?.name ?? cp.name, pos: cp.place?.pos ?? cp.pos }
  const c = g.coffeeOptions?.[0]
  return c ? { name: c.name, pos: c.pos } : null
}

export function orderListText(g: GroupRide, friends: Friend[], me: string) {
  const place = placeOfRide(g)
  const sum = orderSummary(g.orders ?? [])
  const lines = sum.map((s) => `• ${s.qty}× ${s.item}${s.notes.length ? ` (${s.notes.join('; ')})` : ''}`)
  const who = perPerson(g.orders ?? []).map((p) => `${firstName(nameOf(p.who, friends, me, p.name))}: ${p.items.map((i) => i.item + (i.note ? ` (${i.note})` : '')).join(', ')}`)
  return `🧾 *Titipan ${place?.name ?? g.title}*\n${lines.join('\n')}\n\nPer orang:\n${who.join('\n')}`
}

/** Buat catatan utang dari pesanan: tiap orang berutang ke runner. */
export function billDebts(g: GroupRide, friends: Friend[], _me: string): Debt[] {
  const runner = g.runner ?? g.host
  const at = new Date().toISOString()
  return perPerson(g.orders ?? []).filter((p) => p.who !== runner && p.total > 0).map((p) => ({
    id: `bill-${g.id}-${p.who}`, rideId: g.id, from: p.who, fromName: p.name ?? (p.who.startsWith('g-') ? g.participants.find((x) => x.friendId === p.who)?.name : undefined),
    to: runner, toName: runner === 'me' ? undefined : friends.find((f) => f.id === runner)?.name ?? g.participants.find((x) => x.friendId === runner)?.name,
    amount: p.total, note: `${p.items.map((i) => i.item).join(' + ')} · ${g.title}`, at,
  }))
}

export function billText(g: GroupRide, friends: Friend[], me: string, pay: PayAccount[] | undefined) {
  const runner = g.runner ?? g.host
  const runnerName = runner === 'me' ? me : nameOf(runner, friends, me)
  const rows = perPerson(g.orders ?? []).filter((p) => p.who !== runner && p.total > 0)
  const lines = rows.map((p) => `• ${firstName(nameOf(p.who, friends, me, p.name))}: *${rp(p.total)}* (${p.items.map((i) => i.item).join(', ')})`)
  const total = rows.reduce((a, p) => a + p.total, 0)
  const acc = pay?.length ? `\n\nTransfer ke ${firstName(runnerName)}:\n${pay.map((a) => '💳 ' + payLine(a)).join('\n')}` : ''
  return `☕ *Patungan ${g.title}*\nDitalangin ${firstName(runnerName)} dulu, total ${rp(total)}\n\n${lines.join('\n')}${acc}\n\nKalau sudah transfer, kabari ya 🙏`
}

/** Saldo bersih per orang dari sudut pandang saya (+ = mereka berutang ke saya). */
export function balances(ledger: Debt[]) {
  const m = new Map<string, { id: string; name?: string; net: number; open: Debt[] }>()
  for (const d of ledger) {
    if (d.paid) continue
    if (d.to === 'me' && d.from !== 'me') {
      const e = m.get(d.from) ?? { id: d.from, name: d.fromName, net: 0, open: [] }; e.net += d.amount; e.open.push(d); m.set(d.from, e)
    } else if (d.from === 'me' && d.to !== 'me') {
      const e = m.get(d.to) ?? { id: d.to, name: d.toName, net: 0, open: [] }; e.net -= d.amount; e.open.push(d); m.set(d.to, e)
    }
  }
  return [...m.values()].filter((x) => x.net !== 0).sort((a, b) => b.net - a.net)
}

export function totals(ledger: Debt[]) {
  const b = balances(ledger)
  return { receive: b.filter((x) => x.net > 0).reduce((a, x) => a + x.net, 0), owe: -b.filter((x) => x.net < 0).reduce((a, x) => a + x.net, 0) }
}

/** Giliran traktir: yang paling jarang menalangi/traktir di catatan. */
export function nextTreat(ledger: Debt[], people: { id: string; name: string }[]) {
  if (people.length < 2) return null
  const paidFor = new Map<string, number>(people.map((p) => [p.id, 0]))
  for (const d of ledger) if (paidFor.has(d.to)) paidFor.set(d.to, (paidFor.get(d.to) ?? 0) + d.amount)
  const sorted = [...people].sort((a, b) => (paidFor.get(a.id) ?? 0) - (paidFor.get(b.id) ?? 0))
  return { person: sorted[0], amount: paidFor.get(sorted[0].id) ?? 0 }
}

export function remindText(name: string, amount: number, items: Debt[], pay: PayAccount[] | undefined) {
  return `Halo ${firstName(name)}! 👋 Catatan patungan gowes: *${rp(amount)}*\n${items.map((d) => `• ${d.note} — ${rp(d.amount)}`).join('\n')}${pay?.length ? `\n\nBisa transfer ke:\n${pay.map((a) => '💳 ' + payLine(a)).join('\n')}` : ''}\n\nMakasih! ☕`
}
