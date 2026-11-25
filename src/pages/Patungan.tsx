import { useMemo, useState } from 'react'
import { Check, MessageCircle, Plus, Trash2, Crown, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Debt } from '../lib/types'
import { Avatar, confirmDialog, Sheet, Tabs, toast, Top, celebrate } from '../components/UI'
import { MyPayAccounts } from '../components/PayAccounts'
import { balances, nameOf, nextTreat, remindText, totals } from '../lib/money'
import { firstName } from '../lib/meetup'
import { rp, waLink } from '../lib/share'
import { relDay, uid } from '../lib/util'
import { useCountUp } from '../components/UI'

/** Patungan: catatan utang squad, tagih dengan rekening otomatis, tandai lunas. */
export default function Patungan() {
  const { ledger, friends, settings, char, setPaid, deleteDebt, addDebts } = useStore()
  const [tab, setTab] = useState<'saldo' | 'riwayat' | 'rekening'>('saldo')
  const [add, setAdd] = useState(false)
  const bal = useMemo(() => balances(ledger), [ledger])
  const tot = useMemo(() => totals(ledger), [ledger])
  const recv = useCountUp(tot.receive, 700), owe = useCountUp(tot.owe, 700)
  const who = (id: string, fallback?: string) => nameOf(id, friends, settings.name, fallback)
  const charOf = (id: string) => (id === 'me' ? char : friends.find((f) => f.id === id)?.char)
  const treat = nextTreat(ledger, [{ id: 'me', name: 'Kamu' }, ...friends.map((f) => ({ id: f.id, name: f.name }))])

  async function settle(name: string, open: Debt[]) {
    if (!(await confirmDialog(`Tandai lunas dengan ${firstName(name)}?`, { body: `${open.length} catatan · ${rp(open.reduce((a, d) => a + d.amount, 0))}`, ok: 'Lunas' }))) return
    setPaid(open.map((d) => d.id), true); celebrate(0.5); toast('✅ Lunas', `Catatan dengan ${firstName(name)} beres`)
  }

  return (
    <div className="fadein">
      <Top title="Patungan" sub="Utang kopi & rekening" back right={<button className="btn ink sm" onClick={() => setAdd(true)}><Plus size={15} /> Catat</button>} />

      <div className="card hero" style={{ padding: 20 }}>
        <div className="grid2" style={{ gap: 0 }}>
          <div>
            <div className="mono"><ArrowDownLeft size={11} style={{ verticalAlign: -1 }} /> Akan diterima</div>
            <div className="big" style={{ fontSize: 34, marginTop: 8 }}>{rp(recv)}</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,.14)', paddingLeft: 16 }}>
            <div className="mono"><ArrowUpRight size={11} style={{ verticalAlign: -1 }} /> Kamu berutang</div>
            <div className="big" style={{ fontSize: 34, marginTop: 8 }}>{rp(owe)}</div>
          </div>
        </div>
        {treat && <div className="row" style={{ marginTop: 18, gap: 10, background: 'rgba(255,255,255,.08)', borderRadius: 16, padding: '10px 12px' }}>
          <Crown size={16} /><span className="small grow">Giliran traktir berikutnya: <b>{treat.person.id === 'me' ? 'kamu 😄' : firstName(treat.person.name)}</b></span>
        </div>}
      </div>

      <div className="section" style={{ marginTop: 16 }}><Tabs value={tab} onChange={setTab} options={[{ v: 'saldo', l: 'Saldo' }, { v: 'riwayat', l: 'Riwayat' }, { v: 'rekening', l: 'Rekeningku' }]} /></div>

      {tab === 'saldo' && (
        <div className="stack section" style={{ marginTop: 14, gap: 8 }}>
          {!bal.length && <div className="card" style={{ textAlign: 'center' }}><div className="h2">Semua lunas ✨</div><p className="small muted" style={{ marginTop: 6 }}>Titip kopi di ajakan, lalu “Tagih patungan” — catatannya muncul di sini.</p></div>}
          {bal.map((b) => {
            const name = who(b.id, b.name)
            const pos = b.net > 0
            return (
              <div key={b.id} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ gap: 12 }}>
                  <Avatar name={name} color="#8a8a85" c={charOf(b.id)} size={42} />
                  <div className="grow"><div className="b">{name}</div><div className="tiny muted">{pos ? 'berutang ke kamu' : 'kamu berutang'} · {b.open.length} catatan</div></div>
                  <div className="big" style={{ fontSize: 22, color: pos ? 'var(--good)' : 'var(--ink)' }}>{pos ? '+' : '−'}{rp(Math.abs(b.net))}</div>
                </div>
                <div className="grid2" style={{ marginTop: 12, gap: 8 }}>
                  {pos
                    ? <a className="btn sm ink" href={waLink(remindText(name, b.net, b.open.filter((d) => d.to === 'me'), settings.pay), friends.find((f) => f.id === b.id)?.phone)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> Tagih + rekening</a>
                    : <a className="btn sm ink" href={waLink(`Halo ${firstName(name)}! Aku transfer ${rp(-b.net)} untuk patungan gowes ya 🙏`)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> Kabari sudah bayar</a>}
                  <button className="btn sm ghost" onClick={() => settle(name, b.open)}><Check size={14} /> Lunas</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'riwayat' && (
        <div className="card section" style={{ marginTop: 14, paddingTop: 6, paddingBottom: 6 }}>
          <div className="list">
            {[...ledger].sort((a, b) => b.at.localeCompare(a.at)).map((d) => {
              const incoming = d.to === 'me'
              return (
                <div key={d.id} className="li" style={{ opacity: d.paid ? 0.5 : 1 }}>
                  <span className="ico">{incoming ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>
                  <div className="grow">
                    <div className="t">{incoming ? `${firstName(who(d.from, d.fromName))} → kamu` : `Kamu → ${firstName(who(d.to, d.toName))}`}</div>
                    <div className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.note} · {relDay(d.at)}{d.paid ? ' · lunas' : ''}</div>
                  </div>
                  <span className="b" style={{ textDecoration: d.paid ? 'line-through' : undefined }}>{rp(d.amount)}</span>
                  <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label={d.paid ? 'Tandai belum lunas' : 'Tandai lunas'} onClick={() => setPaid([d.id], !d.paid)}><Check size={14} /></button>
                  <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label="Hapus catatan" onClick={async () => { if (await confirmDialog('Hapus catatan ini?', { ok: 'Hapus', danger: true })) deleteDebt(d.id) }}><Trash2 size={14} /></button>
                </div>
              )
            })}
            {!ledger.length && <div className="empty">Belum ada catatan.</div>}
          </div>
        </div>
      )}

      {tab === 'rekening' && (
        <div className="section" style={{ marginTop: 14 }}>
          <p className="small muted" style={{ marginBottom: 12 }}>Rekening ini otomatis ikut di undangan & tagihan. Tidak perlu kirim nomor rekening ke grup berulang kali.</p>
          <MyPayAccounts />
        </div>
      )}

      <AddDebt open={add} onClose={() => setAdd(false)} onAdd={(d) => { addDebts([d]); toast('🧾 Dicatat', `${rp(d.amount)} · ${d.note}`) }} />
    </div>
  )
}

function AddDebt({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (d: Debt) => void }) {
  const { friends } = useStore()
  const [dir, setDir] = useState<'in' | 'out'>('in')
  const [who, setWho] = useState(friends[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  return (
    <Sheet open={open} onClose={onClose} title="Catat patungan">
      <div className="stack">
        <div className="tabs" style={{ boxShadow: 'none' }}>
          <i className="tabs-ind" style={{ width: 'calc((100% - 8px) / 2)', transform: `translateX(${dir === 'in' ? 0 : 100}%)` }} />
          <button className={dir === 'in' ? 'on' : ''} onClick={() => setDir('in')}>Dia utang ke aku</button>
          <button className={dir === 'out' ? 'on' : ''} onClick={() => setDir('out')}>Aku utang ke dia</button>
        </div>
        <div className="chips">{friends.map((f) => <button key={f.id} className={`chip ${who === f.id ? 'on' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: 5 }} onClick={() => setWho(f.id)}><Avatar name={f.name} color={f.color} c={f.char} size={22} />{firstName(f.name)}</button>)}</div>
        <label className="field"><span className="mono">Jumlah (Rp)</span><input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="25000" /></label>
        <label className="field"><span className="mono">Untuk apa</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Parkir, ban dalam, sarapan…" /></label>
        <button className="btn ink block lg" disabled={!who || !+amount} onClick={() => { onAdd({ id: uid(), from: dir === 'in' ? who : 'me', to: dir === 'in' ? 'me' : who, amount: +amount, note: note.trim() || 'Patungan', at: new Date().toISOString() }); setAmount(''); setNote(''); onClose() }}>Catat {amount ? rp(+amount) : ''}</button>
      </div>
    </Sheet>
  )
}
