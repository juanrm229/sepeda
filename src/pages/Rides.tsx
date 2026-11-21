import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { useStore } from '../lib/store'
import { estPower } from '../lib/analytics'
import { BULAN, fmt, fmtDate, fmtDur } from '../lib/util'
import { Top } from '../components/UI'
import { ZoneStrip } from './Home'
import type { RideType } from '../lib/types'

const TYPES: { v: RideType | 'all'; l: string }[] = [{ v: 'all', l: 'Semua' }, { v: 'road', l: 'Road' }, { v: 'gravel', l: 'Gravel' }, { v: 'commute', l: 'Commute' }]

export default function Rides() {
  const { rides, settings } = useStore()
  const [t, setT] = useState<RideType | 'all'>('all')
  const [q, setQ] = useState('')
  const list = useMemo(() => [...rides].reverse().filter((r) => (t === 'all' || r.type === t) && r.name.toLowerCase().includes(q.toLowerCase())), [rides, t, q])
  const groups = useMemo(() => {
    const m = new Map<string, typeof list>()
    for (const r of list) { const d = new Date(r.date); const k = `${BULAN[d.getMonth()]} ${d.getFullYear()}`; m.set(k, [...(m.get(k) ?? []), r]) }
    return [...m.entries()]
  }, [list])
  return (
    <div className="fadein">
      <Top title="Riwayat" sub={`${list.length} aktivitas`} back />
      <div className="row" style={{ background: 'var(--surface-2)', borderRadius: 999, padding: '4px 6px 4px 14px', marginBottom: 12 }}>
        <Search size={16} className="muted" />
        <input className="input" style={{ border: 0, background: 'transparent' }} placeholder="Cari ride… (mis. Sentul)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari ride" />
      </div>
      <div className="chips" style={{ marginBottom: 16 }}>{TYPES.map((x) => <button key={x.v} className={`chip ${t === x.v ? 'on' : ''}`} onClick={() => setT(x.v)}>{x.l}</button>)}</div>
      {groups.map(([month, rs]) => (
        <div key={month} className="section" style={{ marginTop: 18 }}>
          <div className="row between" style={{ marginBottom: 8, padding: '0 4px' }}>
            <h3 className="display" style={{ fontSize: 22 }}>{month}</h3>
            <span className="mono">{fmt(rs.reduce((a, r) => a + r.distanceKm, 0))} km · {rs.length} ride</span>
          </div>
          <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            <div className="list">
              {rs.map((r) => (
                <a key={r.id} className="li" href={'#/ride/' + r.id}>
                  <div className="grow">
                    <div className="t">{r.name}</div>
                    <div className="tiny muted">{fmtDate(r.date, true)} · {fmtDur(r.movingSec)} · {r.elevationM} m · ~{estPower(r, settings.weightKg)} W{r.friendIds?.length ? <> · <Users size={10} style={{ verticalAlign: -1 }} /> {r.friendIds.length}</> : ''}</div>
                  </div>
                  <ZoneStrip zones={r.zones} w={54} />
                  <div style={{ textAlign: 'right', minWidth: 62 }}><div className="num" style={{ fontSize: 20 }}>{r.distanceKm.toFixed(1)}</div><div className="mono">{r.avgSpeed.toFixed(1)} km/j</div></div>
                </a>
              ))}
            </div>
          </div>
        </div>
      ))}
      {list.length === 0 && (
        <div className="card outline" style={{ textAlign: 'center', padding: 28, marginTop: 10 }}>
          <div style={{ fontSize: 40 }}>🚲</div>
          <div className="display" style={{ fontSize: 22, marginTop: 6 }}>{rides.length ? 'Tidak ada yang cocok' : 'Belum ada ride'}</div>
          <p className="small ink2" style={{ marginTop: 6 }}>{rides.length ? 'Coba kata kunci lain atau ganti filter.' : 'Rekam ride pertamamu dan lihat analitiknya hidup.'}</p>
          {!rides.length && <a href="#/record" className="btn accent" style={{ marginTop: 14 }}>Mulai rekam</a>}
        </div>
      )}
    </div>
  )
}
