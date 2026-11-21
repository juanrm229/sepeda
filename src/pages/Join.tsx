import { MapPin } from 'lucide-react'
import { useStore } from '../lib/store'
import { parseInvite } from '../lib/share'
import { fmtDate } from '../lib/util'
import { celebrate, toast, Top } from '../components/UI'
import { BaseMap, MeetPin, Route, SmallPin } from '../components/Map'
import { CP_KIND } from '../lib/plan'
import { PACE } from './Squad'
import { go } from '../lib/router'
import type { Rsvp } from '../lib/types'

export default function Join({ code }: { code: string }) {
  const { upsertGroupRide, groupRides } = useStore()
  const g = parseInvite(code)
  if (!g) return <div><Top title="Undangan tidak valid" back="" /><div className="empty">Link undangan rusak atau terpotong.</div></div>
  const existing = groupRides.find((x) => x.id === g.id)
  const answer = (r: Rsvp) => { upsertGroupRide({ ...(existing ?? g), myRsvp: r }); toast(r === 'ikut' ? '🚲 Kamu ikut!' : 'Jawaban tersimpan', r === 'ikut' ? 'Jadwal & rute tersimpan di Squad' : undefined); if (r === 'ikut') celebrate(0.8); go('squad/' + g.id) }
  return (
    <div className="fadein">
      <Top title="Undangan gowes" sub={`dari ${g.host}`} back="" />
      <div className="card yellow">
        <div className="mono">{fmtDate(g.datetime, true)}</div>
        <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{g.title}</div>
        <div className="small" style={{ marginTop: 6 }}><MapPin size={13} style={{ verticalAlign: -2 }} /> {g.meet.name}</div>
        <div className="row wrap" style={{ gap: 6, marginTop: 12 }}><span className="tag ink">{g.distanceKm} km</span><span className="tag ink">{PACE[g.pace]?.l}</span>{g.noDrop && <span className="tag ink">No-drop</span>}</div>
        {g.route && <div className="small" style={{ marginTop: 12 }}>Rute: {g.route}</div>}
        {g.notes && <div className="small" style={{ marginTop: 4 }}>{g.notes}</div>}
      </div>
      {g.plan && g.plan.checkpoints.length > 0 && (
        <div className="card section">
          <div className="mono" style={{ marginBottom: 10 }}>Rute · {g.plan.checkpoints.length} checkpoint</div>
          <div className="tl">
            {g.plan.checkpoints.map((c, i) => (
              <div key={c.id} className="tl-row" style={{ padding: '6px 0' }}>
                <div className={`tl-dot k-${c.kind}`}><span>{CP_KIND[c.kind].emoji}</span><b>{i + 1}</b></div>
                <div><div className="b">{c.name}</div><div className="tiny muted">{CP_KIND[c.kind].l} · {c.stopMin} mnt</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="section"><BaseMap center={g.meet.pos} zoom={14} className="map" fit={g.plan ? [g.meet.pos, ...g.plan.checkpoints.map((c) => c.pos)] : undefined}>
        {g.plan && <Route track={[g.meet.pos, ...g.plan.checkpoints.map((c) => c.pos), (g.plan.finish ?? g.plan.start).pos]} color="#ff4d1f" weight={3} dash="6 8" />}
        {g.plan?.checkpoints.map((c) => <SmallPin key={c.id} pos={c.pos} />)}
        <MeetPin pos={g.meet.pos} />
      </BaseMap></div>
      <div className="grid3 section">
        <button className="btn accent" onClick={() => answer('ikut')}>Ikut!</button>
        <button className="btn ghost" onClick={() => answer('mungkin')}>Mungkin</button>
        <button className="btn ghost" onClick={() => answer('tidak')}>Tidak</button>
      </div>
    </div>
  )
}
