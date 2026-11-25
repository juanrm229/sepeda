import { useState } from 'react'
import { Copy, Plus, Trash2, Wallet, Landmark } from 'lucide-react'
import { useStore } from '../lib/store'
import type { PayAccount } from '../lib/types'
import { uid } from '../lib/util'
import { Sheet, toast } from './UI'

const BANKS = ['BCA', 'Mandiri', 'BRI', 'BNI', 'Jago', 'SeaBank', 'BSI', 'CIMB']
const WALLETS = ['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja']

export const copyText = async (t: string, label = 'Disalin') => { try { await navigator.clipboard.writeText(t); toast('📋 ' + label, t) } catch { toast('Tidak bisa menyalin', t) } }

/** Kartu rekening dengan tombol salin. */
export function PayCard({ a, onRemove }: { a: PayAccount; onRemove?: () => void }) {
  return (
    <div className={`paycard ${a.kind}`}>
      <span className="ico">{a.kind === 'bank' ? <Landmark size={17} /> : <Wallet size={17} />}</span>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="mono" style={{ display: 'block' }}>{a.provider}</span>
        <span className="b" style={{ display: 'block', fontSize: 17, letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>{a.number.replace(/(\d{4})(?=\d)/g, '$1 ')}</span>
        <span className="tiny muted">a.n. {a.holder}</span>
      </span>
      <button className="iconbtn" aria-label={`Salin nomor ${a.provider}`} onClick={() => copyText(a.number, `Nomor ${a.provider} disalin`)}><Copy size={16} /></button>
      {onRemove && <button className="iconbtn" aria-label={`Hapus ${a.provider}`} onClick={onRemove}><Trash2 size={16} /></button>}
    </div>
  )
}

/** Rekening & e-wallet saya. Ikut terbawa di undangan & tagihan, jadi tidak perlu kirim nomor rekening ke grup lagi. */
export function MyPayAccounts({ editable = true }: { editable?: boolean }) {
  const { settings, updateSettings } = useStore()
  const [add, setAdd] = useState(false)
  const list = settings.pay ?? []
  return (
    <div className="stack" style={{ gap: 8 }}>
      {list.map((a) => <PayCard key={a.id} a={a} onRemove={editable ? () => updateSettings({ pay: list.filter((x) => x.id !== a.id) }) : undefined} />)}
      {!list.length && <p className="small muted">Belum ada rekening. Tambahkan sekali, nanti otomatis ikut di tagihan patungan.</p>}
      {editable && <button className="btn ghost block" onClick={() => setAdd(true)}><Plus size={16} /> Tambah rekening / e-wallet</button>}
      <AddPay open={add} onClose={() => setAdd(false)} onAdd={(a) => { updateSettings({ pay: [...list, a] }); toast('💳 Rekening disimpan', `${a.provider} · ikut di tagihan & undangan`) }} />
    </div>
  )
}

function AddPay({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (a: PayAccount) => void }) {
  const { settings } = useStore()
  const [kind, setKind] = useState<'bank' | 'ewallet'>('bank')
  const [provider, setProvider] = useState('BCA')
  const [number, setNumber] = useState('')
  const [holder, setHolder] = useState(settings.name)
  const ok = provider.trim() && number.replace(/\D/g, '').length >= 6 && holder.trim()
  return (
    <Sheet open={open} onClose={onClose} title="Tambah rekening">
      <div className="stack">
        <div className="tabs" style={{ boxShadow: 'none' }}>
          <i className="tabs-ind" style={{ width: 'calc((100% - 8px) / 2)', transform: `translateX(${kind === 'bank' ? 0 : 100}%)` }} />
          <button className={kind === 'bank' ? 'on' : ''} onClick={() => { setKind('bank'); setProvider('BCA') }}>Bank</button>
          <button className={kind === 'ewallet' ? 'on' : ''} onClick={() => { setKind('ewallet'); setProvider('GoPay') }}>E-wallet</button>
        </div>
        <div className="chips">{(kind === 'bank' ? BANKS : WALLETS).map((p) => <button key={p} className={`chip ${provider === p ? 'on' : ''}`} onClick={() => setProvider(p)}>{p}</button>)}</div>
        <label className="field"><span className="mono">{kind === 'bank' ? 'Nomor rekening' : 'Nomor HP'}</span><input className="input" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value.replace(/[^\d]/g, ''))} placeholder={kind === 'bank' ? '1234567890' : '0812…'} /></label>
        <label className="field"><span className="mono">Atas nama</span><input className="input" value={holder} onChange={(e) => setHolder(e.target.value)} /></label>
        <button className="btn ink block lg" disabled={!ok} onClick={() => { onAdd({ id: uid(), kind, provider: provider.trim(), number: number.trim(), holder: holder.trim() }); setNumber(''); onClose() }}>Simpan</button>
        <p className="tiny muted">Disimpan di HP ini saja. Ikut terkirim hanya di undangan & tagihan yang kamu bagikan.</p>
      </div>
    </Sheet>
  )
}
