import { useState } from 'react'
import { Bike } from 'lucide-react'
import { useStore } from '../lib/store'
import { fmtDate, fmtDur } from '../lib/util'
import { Top } from '../components/UI'
import type { RideType } from '../lib/types'

const TYPES: { v: RideType | 'all'; l: string }[] = [{ v: 'all', l: 'Semua' }, { v: 'road', l: 'Road' }, { v: 'gravel', l: 'Gravel' }, { v: 'commute', l: 'Commute' }]

export default function Rides() {
  const { rides } = useStore()
  const [t, setT] = useState<RideType | 'all'>('all')
  const list = [...rides].reverse().filter((r) => t === 'all' || r.type === t)
  return (
    <div className="fadein">
      <Top title="Semua ride" sub={`${list.length} aktivitas`} back />
      <div className="chips" style={{ marginBottom: 14 }}>{TYPES.map((x) => <button key={x.v} className={`chip ${t === x.v ? 'on' : ''}`} onClick={() => setT(x.v)}>{x.l}</button>)}</div>
      <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <div className="list">
          {list.map((r) => (
            <a key={r.id} className="li" href={'#/ride/' + r.id}>
              <div className="ico" style={{ background: 'var(--sunken)' }}><Bike size={16} /></div>
              <div className="grow"><div className="t">{r.name}</div><div className="tiny muted">{fmtDate(r.date, true)} · {fmtDur(r.movingSec)} · {r.elevationM} m</div></div>
              <div style={{ textAlign: 'right' }}><div className="num" style={{ fontSize: 20 }}>{r.distanceKm.toFixed(1)}</div><div className="mono">{r.avgSpeed.toFixed(1)} km/j</div></div>
            </a>
          ))}
          {list.length === 0 && <div className="empty">Belum ada ride.</div>}
        </div>
      </div>
    </div>
  )
}
