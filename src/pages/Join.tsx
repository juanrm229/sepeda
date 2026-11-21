import { MapPin } from 'lucide-react'
import { useStore } from '../lib/store'
import { parseInvite } from '../lib/share'
import { fmtDate } from '../lib/util'
import { toast, Top } from '../components/UI'
import { BaseMap, MeetPin } from '../components/Map'
import { PACE } from './Squad'
import { go } from '../lib/router'
import type { Rsvp } from '../lib/types'

export default function Join({ code }: { code: string }) {
  const { upsertGroupRide, groupRides } = useStore()
  const g = parseInvite(code)
  if (!g) return <div><Top title="Undangan tidak valid" back="" /><div className="empty">Link undangan rusak atau terpotong.</div></div>
  const existing = groupRides.find((x) => x.id === g.id)
  const answer = (r: Rsvp) => { upsertGroupRide({ ...(existing ?? g), myRsvp: r }); toast(r === 'ikut' ? 'Kamu ikut! Jadwal tersimpan 🚲' : 'Jawaban tersimpan'); go('squad/' + g.id) }
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
      <div className="section"><BaseMap center={g.meet.pos} zoom={15} className="map"><MeetPin pos={g.meet.pos} /></BaseMap></div>
      <div className="grid3 section">
        <button className="btn accent" onClick={() => answer('ikut')}>Ikut!</button>
        <button className="btn ghost" onClick={() => answer('mungkin')}>Mungkin</button>
        <button className="btn ghost" onClick={() => answer('tidak')}>Tidak</button>
      </div>
    </div>
  )
}
