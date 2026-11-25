import { useState } from 'react'
import { Check, ClipboardList, Coffee, MessageCircle, Minus, Plus, Receipt, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import type { GroupRide, Order } from '../lib/types'
import { Avatar, Sheet, toast, celebrate } from './UI'
import { MenuGallery } from './MenuGallery'
import { PayCard } from './PayAccounts'
import { billDebts, billText, orderListText, orderSummary, perPerson, placeOfRide, QUICK_ITEMS, nameOf } from '../lib/money'
import { firstName, peopleOf } from '../lib/meetup'
import { replyLink, replyText, rp, waLink } from '../lib/share'
import { uid } from '../lib/util'
import { go } from '../lib/router'

/** Titip pesanan: semua nitip ke satu orang, lalu tagihan patungan otomatis. */
export function OrdersCard({ g }: { g: GroupRide }) {
  const { friends, settings, char, setRunner, addDebts, ledger } = useStore()
  const [edit, setEdit] = useState<Order | 'new' | null>(null)
  const place = placeOfRide(g)
  const orders = g.orders ?? []
  const isHost = g.host === 'me'
  const runner = g.runner ?? g.host
  const iAmRunner = runner === 'me'
  const people = peopleOf(g, friends, { name: settings.name, char, home: settings.home }).filter((p) => p.rsvp === 'ikut' || p.rsvp === 'mungkin')
  const rows = perPerson(orders)
  const sum = orderSummary(orders)
  const total = rows.reduce((a, r) => a + r.total, 0)
  const unpriced = rows.reduce((a, r) => a + r.unpriced, 0)
  const mine = orders.find((o) => o.who === 'me')
  const billed = ledger.some((d) => d.rideId === g.id)
  const runnerName = nameOf(runner, friends, settings.name, g.participants.find((p) => p.friendId === runner)?.name ?? (isHost ? undefined : g.host))
  const canEdit = (o: Order) => o.who === 'me' || isHost || iAmRunner

  function bill() {
    const debts = billDebts(g, friends, settings.name)
    if (!debts.length) return toast('Belum ada yang perlu ditagih', 'Isi harga tiap pesanan dulu')
    addDebts(debts)
    window.open(waLink(billText(g, friends, settings.name, iAmRunner ? settings.pay : undefined)), '_blank')
    celebrate(0.5)
    toast('🧾 Tagihan dibuat', `${debts.length} orang · tercatat di Patungan`)
  }
  function sendMine() {
    if (!mine) return
    const rep = { rideId: g.id, name: settings.name, rsvp: g.myRsvp === 'menunggu' ? 'ikut' as const : g.myRsvp, order: { item: mine.item + (mine.qty > 1 ? ` ×${mine.qty}` : ''), note: mine.note, price: mine.price }, char, at: new Date().toISOString() }
    window.open(waLink(replyText(g, rep, replyLink(rep))), '_blank')
    toast('📨 Titipan siap dikirim', `ke ${firstName(runnerName)}`)
  }

  return (
    <div className="card">
      <div className="card-h">
        <div style={{ minWidth: 0 }}>
          <div className="mono">Titip pesanan</div>
          <div className="b" style={{ marginTop: 2 }}><Coffee size={14} style={{ verticalAlign: -2 }} /> {place?.name ?? 'Tempat ngopi'}</div>
        </div>
        <span className="tag">{orders.length} titipan</span>
      </div>

      {place && <MenuGallery name={place.name} pos={place.pos} />}

      <div className="mono" style={{ margin: '16px 0 8px' }}>Yang pesan & nalangin</div>
      <div className="chips">
        {people.map((p) => (
          <button key={p.id} disabled={!isHost && !iAmRunner} className={`chip ${runner === p.id ? 'on' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: 5 }} onClick={() => { setRunner(g.id, p.id); toast(`☕ ${p.me ? 'Kamu' : firstName(p.name)} yang pesan`, 'Semua titip ke dia') }}>
            <Avatar name={p.name} color={p.color} c={p.char} size={22} />{p.me ? 'Kamu' : firstName(p.name)}
          </button>
        ))}
      </div>

      {sum.length > 0 && (
        <div className="order-sum">
          {sum.map((s) => <span key={s.item} className="order-chip"><b>{s.qty}×</b> {s.item}</span>)}
        </div>
      )}

      <div className="list" style={{ marginTop: 6 }}>
        {rows.map((r) => {
          const p = people.find((x) => x.id === r.who)
          const nm = r.who === 'me' ? 'Kamu' : nameOf(r.who, friends, settings.name, r.name ?? p?.name)
          return (
            <div key={r.who} className="li" style={{ alignItems: 'flex-start' }}>
              <Avatar name={nm} color={p?.color ?? '#8a8a85'} c={p?.char} size={34} />
              <div className="grow">
                <div className="t">{nm}{r.who === runner && <span className="tag" style={{ marginLeft: 6 }}>pesan</span>}</div>
                {r.items.map((o) => (
                  <button key={o.id} className="order-line" disabled={!canEdit(o)} onClick={() => setEdit(o)}>
                    <span>{o.qty > 1 ? `${o.qty}× ` : ''}{o.item}{o.note && <span className="muted"> · {o.note}</span>}</span>
                    <span className="mono" style={{ color: o.price == null ? 'var(--accent)' : undefined }}>{o.price != null ? rp(o.price * o.qty) : 'harga?'}</span>
                  </button>
                ))}
              </div>
              <div className="b" style={{ minWidth: 72, textAlign: 'right' }}>{rp(r.total)}</div>
            </div>
          )
        })}
      </div>
      {!orders.length && <p className="small muted" style={{ marginTop: 6 }}>Belum ada titipan. Lihat foto menu, lalu tulis pesananmu, dan {firstName(runnerName)} yang pesankan semuanya.</p>}

      {orders.length > 0 && (
        <div className="row between" style={{ marginTop: 10, padding: '12px 0 0', borderTop: '1px solid var(--line)' }}>
          <span className="small muted">Total{unpriced ? ` · ${unpriced} belum ada harga` : ''}</span>
          <span className="big" style={{ fontSize: 24 }}>{rp(total)}</span>
        </div>
      )}

      <div className="grid2" style={{ marginTop: 14, gap: 8 }}>
        <button className="btn ink" onClick={() => setEdit('new')}><Plus size={16} /> {orders.length ? 'Tambah titipan' : 'Titip pesanan'}</button>
        <a className="btn ghost" href={waLink(orderListText(g, friends, settings.name))} target="_blank" rel="noreferrer" aria-disabled={!orders.length}><ClipboardList size={16} /> Daftar ke WA</a>
      </div>
      {!isHost && !iAmRunner && mine && <button className="btn ghost block" style={{ marginTop: 8 }} onClick={sendMine}><MessageCircle size={16} /> Kirim titipanku ke {firstName(runnerName)}</button>}
      {iAmRunner && orders.length > 0 && (
        billed
          ? <button className="btn ghost block" style={{ marginTop: 8 }} onClick={() => go('patungan')}><Check size={16} /> Sudah ditagih · lihat Patungan</button>
          : <button className="btn ink block" style={{ marginTop: 8 }} disabled={total === 0} onClick={bill}><Receipt size={16} /> Tagih patungan ({rp(total - (rows.find((r) => r.who === 'me')?.total ?? 0))})</button>
      )}
      {!iAmRunner && g.hostPay?.length && runner === g.host ? (
        <div className="stack" style={{ gap: 6, marginTop: 12 }}>
          <span className="mono">Transfer ke {firstName(runnerName)}</span>
          {g.hostPay.map((a) => <PayCard key={a.id} a={a} />)}
        </div>
      ) : null}

      <OrderSheet g={g} edit={edit} onClose={() => setEdit(null)} />
    </div>
  )
}

function OrderSheet({ g, edit, onClose }: { g: GroupRide; edit: Order | 'new' | null; onClose: () => void }) {
  const { friends, settings, char, upsertOrder, removeOrder } = useStore()
  const o = edit && edit !== 'new' ? edit : null
  const place = placeOfRide(g)
  const isHost = g.host === 'me' || (g.runner ?? g.host) === 'me'
  const people = peopleOf(g, friends, { name: settings.name, char, home: settings.home }).filter((p) => p.rsvp !== 'tidak')
  const [who, setWho] = useState(o?.who ?? 'me')
  const [item, setItem] = useState(o?.item ?? '')
  const [note, setNote] = useState(o?.note ?? '')
  const [price, setPrice] = useState(o?.price != null ? String(o.price) : '')
  const [qty, setQty] = useState(o?.qty ?? 1)
  const key = edit === 'new' ? 'new' : o?.id ?? ''
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) { setLastKey(key); setWho(o?.who ?? 'me'); setItem(o?.item ?? ''); setNote(o?.note ?? ''); setPrice(o?.price != null ? String(o.price) : ''); setQty(o?.qty ?? 1) }

  function save() {
    const pp = people.find((p) => p.id === who)
    upsertOrder(g.id, { id: o?.id ?? uid(), who, name: who.startsWith('g-') ? pp?.name : undefined, item: item.trim(), note: note.trim() || undefined, price: price ? +price : undefined, qty, at: new Date().toISOString() })
    toast(o ? 'Titipan diperbarui' : '☕ Titipan dicatat', `${qty > 1 ? qty + '× ' : ''}${item}`)
    onClose()
  }

  return (
    <Sheet open={!!edit} onClose={onClose} title={o ? 'Ubah titipan' : 'Mau nitip apa?'}>
      <div className="stack" style={{ gap: 14 }}>
        {place && <div><div className="mono" style={{ marginBottom: 8 }}>Menu {place.name}</div><MenuGallery name={place.name} pos={place.pos} big /></div>}
        {isHost && people.length > 1 && (
          <div className="field"><span className="mono">Untuk siapa</span>
            <div className="chips">{people.map((p) => <button key={p.id} className={`chip ${who === p.id ? 'on' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: 5 }} onClick={() => setWho(p.id)}><Avatar name={p.name} color={p.color} c={p.char} size={22} />{p.me ? 'Aku' : firstName(p.name)}</button>)}</div>
          </div>
        )}
        <div className="chips">{QUICK_ITEMS.map((q) => <button key={q.item} className={`chip ${item === q.item ? 'on' : ''}`} onClick={() => { setItem(q.item); if (!price) setPrice(String(q.price)) }}>{q.item}</button>)}</div>
        <label className="field"><span className="mono">Pesanan</span><input className="input" value={item} maxLength={60} onChange={(e) => setItem(e.target.value)} placeholder="mis. Es kopi susu aren" /></label>
        <label className="field"><span className="mono">Catatan</span><input className="input" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder="less sugar, es dikit, oat milk…" /></label>
        <div className="grid2">
          <label className="field"><span className="mono">Harga satuan (Rp)</span><input className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="opsional" /></label>
          <div className="field"><span className="mono">Jumlah</span>
            <div className="stepper-q"><button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Kurangi"><Minus size={16} /></button><b>{qty}</b><button onClick={() => setQty(Math.min(9, qty + 1))} aria-label="Tambah"><Plus size={16} /></button></div>
          </div>
        </div>
        <button className="btn ink block lg" disabled={!item.trim()} onClick={save}>{o ? 'Simpan' : 'Titip'}{price ? ` · ${rp(+price * qty)}` : ''}</button>
        {o && <button className="btn ghost block" style={{ color: 'var(--bad)' }} onClick={() => { removeOrder(g.id, o.id); onClose() }}><Trash2 size={16} /> Hapus titipan</button>}
      </div>
    </Sheet>
  )
}
