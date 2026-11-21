import { Wrench, RotateCcw } from 'lucide-react'
import { useStore } from '../lib/store'
import { fmt } from '../lib/util'
import { toast, Top } from '../components/UI'

export default function Garage() {
  const { bikes, resetComponent, activeBikeId, setActiveBike, rides } = useStore()
  return (
    <div className="fadein">
      <Top title="Garasi" sub="Perawatan otomatis dari km ride" back />
      <div className="stack">
        {bikes.map((b) => {
          const bRides = rides.filter((r) => (r.bikeId ?? 'bike-1') === b.id)
          return (
            <div key={b.id} className="card">
              <div className="card-h">
                <div>
                  <div className="mono">{b.type}</div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>{b.name}</div>
                </div>
                {activeBikeId === b.id ? <span className="tag accent">Utama</span> : <button className="btn sm ghost" onClick={() => setActiveBike(b.id)}>Jadikan utama</button>}
              </div>
              <div className="grid3" style={{ marginBottom: 14 }}>
                <div><div className="mono">Odometer</div><div className="dot" style={{ fontSize: 30, marginTop: 4 }}>{fmt(b.odometerKm)}</div></div>
                <div><div className="mono">Ride</div><div className="num" style={{ fontSize: 24, marginTop: 4 }}>{bRides.length}</div></div>
                <div><div className="mono">Biaya/km</div><div className="num" style={{ fontSize: 24, marginTop: 4 }}>Rp{fmt(Math.round(1_800_000 / Math.max(1, b.odometerKm) * 10))}</div></div>
              </div>
              <div className="list">
                {b.components.map((c) => {
                  const p = c.usedKm / c.lifeKm
                  const n = 16
                  const left = Math.max(0, c.lifeKm - c.usedKm)
                  return (
                    <div key={c.id} className="li" style={{ alignItems: 'flex-start' }}>
                      <div className="ico" style={{ background: p > 0.85 ? 'var(--accent)' : 'var(--sunken)', color: p > 0.85 ? '#fff' : undefined }}><Wrench size={15} /></div>
                      <div className="grow">
                        <div className="row between"><span className="b">{c.name}</span><span className="mono">{fmt(left)} km lagi</span></div>
                        <div className="meter dots" style={{ margin: '8px 0 6px' }}>{Array.from({ length: n }, (_, i) => <i key={i} className={i < Math.round(p * n) ? (p > 0.85 ? 'a' : p > 0.65 ? 'w' : 'f') : ''} />)}</div>
                        <div className="tiny muted">{c.tip}</div>
                      </div>
                      <button className="iconbtn" aria-label={`Reset ${c.name}`} title="Sudah diganti/diservis" onClick={() => { resetComponent(b.id, c.id); toast(`${c.name} direset ke 0 km`) }}><RotateCcw size={15} /></button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        <p className="tiny muted">Setiap ride yang tersimpan otomatis menambah km komponen di sepeda yang dipilih. Ketuk ↺ setelah komponen diganti atau diservis.</p>
      </div>
    </div>
  )
}
