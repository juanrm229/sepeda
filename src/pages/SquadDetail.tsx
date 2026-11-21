import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarPlus, Clock, Share2, MessageCircle, Trash2, Radio, Bell, Navigation, CloudRain, Thermometer, Wind, Coffee } from 'lucide-react'
import { useStore } from '../lib/store'
import type { CharConfig, GroupRide, LatLng, Rsvp } from '../lib/types'
import { etaMin, haversine, trackLength } from '../lib/geo'
import { fmtDate, relDay } from '../lib/util'
import { Avatar, toast, Top } from '../components/UI'
import { BaseMap, MeetPin, PersonPin, Route, SmallPin } from '../components/Map'
import { download, groupRideICS } from '../lib/ics'
import { inviteLink, inviteText, shareOrCopy, waLink } from '../lib/share'
import { PACE } from './Squad'
import { makeLoop } from '../lib/seed'
import { go } from '../lib/router'
import { useForecast } from '../lib/useForecast'
import { GroupActionCard } from '../components/GroupActions'
import { CP_KIND, gmapsDirections, timeline } from './RoutePlanner'
import { notify, speak } from '../lib/notify'

const RSVP_L: Record<Rsvp, string> = { ikut: 'Ikut', mungkin: 'Mungkin', tidak: 'Tidak', menunggu: 'Belum jawab' }

export default function SquadDetail({ id }: { id: string }) {
  const { groupRides, friends, settings, setMyRsvp, deleteGroupRide, upsertReminder } = useStore()
  const g = groupRides.find((x) => x.id === id)
  const fc = useForecast(g?.meet.pos ?? settings.home)
  if (!g) return <div><Top title="Tidak ditemukan" back="squad" /><div className="empty">Jadwal ini sudah dihapus.</div></div>

  const start = new Date(g.datetime)
  const myDist = haversine(settings.home, g.meet.pos)
  const myEta = etaMin(myDist, 20)
  const leave = new Date(start.getTime() - (myEta + 10) * 60000)
  const hour = fc?.hours.find((h) => Math.abs(h.time.getTime() - start.getTime()) < 1800000)
  const link = inviteLink(g, settings.name)
  const text = inviteText(g, link)
  const people = [
    { id: 'me', name: settings.name + ' (kamu)', color: '#111', rsvp: g.myRsvp, home: settings.home, spd: 25, c: useStore.getState().char },
    ...g.participants.map((p) => { const f = friends.find((x) => x.id === p.friendId); return f ? { id: f.id, name: f.name, color: f.color, rsvp: p.rsvp, home: f.home, spd: f.avgSpeed, c: f.char } : null }).filter(Boolean) as { id: string; name: string; color: string; rsvp: Rsvp; home: LatLng; spd: number; c: CharConfig }[],
  ]

  function leaveReminder() {
    const hh = String(leave.getHours()).padStart(2, '0'), mm = String(leave.getMinutes()).padStart(2, '0')
    upsertReminder({ id: 'gr-' + g!.id, kind: 'ride', title: `Berangkat ke ${g!.meet.name} (${g!.title})`, time: `${hh}:${mm}`, days: [leave.getDay()], enabled: true })
    toast(`Pengingat berangkat ${hh}.${mm} dipasang ⏰`)
  }

  return (
    <div className="fadein">
      <Top title={g.title} sub={`${relDay(g.datetime)} · ${PACE[g.pace].l}`} back="squad" />

      <div className="row-d">
        <div className="stack">
          <BaseMap center={g.meet.pos} zoom={12} className="map tall" fit={[g.meet.pos, ...people.filter((p) => p.rsvp !== 'tidak').map((p) => p.home)]}>
            {people.filter((p) => p.rsvp !== 'tidak').map((p) => (
              <Fragment key={p.id}>
                <Route track={[p.home, g.meet.pos]} color={p.id === 'me' ? '#ff4d1f' : '#111'} weight={2} dash="2 6" />
                <PersonPin pos={p.home} label={p.name.split(' ')[0].slice(0, 2).toUpperCase()} color={p.color} size={30} />
              </Fragment>
            ))}
            {g.plan && <Route track={g.plan.geometry ?? [g.plan.start.pos, ...g.plan.checkpoints.map((c) => c.pos), (g.plan.finish ?? g.plan.start).pos]} color="#ff4d1f" weight={3.5} />}
            {g.plan?.checkpoints.map((c) => <SmallPin key={c.id} pos={c.place?.pos ?? c.pos} color="#111" />)}
            <MeetPin pos={g.meet.pos} />
          </BaseMap>

          <div className="bento">
            <div className="card span2 span2-d">
              <div className="mono">Kumpul</div>
              <div className="dot" style={{ fontSize: 52, marginTop: 6 }}>{String(start.getHours()).padStart(2, '0')}.{String(start.getMinutes()).padStart(2, '0')}</div>
              <div className="small" style={{ marginTop: 6 }}>{fmtDate(g.datetime)} · {g.meet.name}</div>
              <div className="row wrap" style={{ marginTop: 12, gap: 6 }}>
                <span className="tag ink">{g.distanceKm} km</span>
                <span className="tag">{PACE[g.pace].spd}</span>
                {g.noDrop && <span className="tag good">No-drop</span>}
              </div>
            </div>
            <div className="card accent span2 span2-d">
              <div className="card-h"><span className="mono">Kamu harus berangkat</span><Navigation size={16} /></div>
              <div className="dot" style={{ fontSize: 52 }}>{String(leave.getHours()).padStart(2, '0')}.{String(leave.getMinutes()).padStart(2, '0')}</div>
              <div className="small" style={{ marginTop: 6 }}>{myDist.toFixed(1)} km dari rumah · ±{myEta} menit gowes + 10 menit buffer</div>
              <button className="btn sm" style={{ marginTop: 12, background: '#fff', color: '#111' }} onClick={leaveReminder}><Bell size={14} /> Ingatkan aku</button>
            </div>
          </div>

          {hour ? (
            <div className="card">
              <div className="card-h"><span className="mono">Cuaca saat kumpul{fc?.demo ? ' · data contoh' : ''}</span><span className={`tag ${hour.score >= 70 ? 'good' : hour.score >= 45 ? 'warn' : 'bad'}`}>Skor {hour.score}</span></div>
              <div className="grid3">
                <div><Thermometer size={15} /><div className="num" style={{ fontSize: 22 }}>{Math.round(hour.temp)}°</div></div>
                <div><CloudRain size={15} /><div className="num" style={{ fontSize: 22 }}>{hour.rain}%</div></div>
                <div><Wind size={15} /><div className="num" style={{ fontSize: 22 }}>{Math.round(hour.wind)}<span className="unit">km/j</span></div></div>
              </div>
              {hour.rain > 50 && <div className="small" style={{ marginTop: 10 }}>☔ Peluang hujan tinggi. Pertimbangkan majukan jadwal atau bawa jas hujan.</div>}
            </div>
          ) : (
            <div className="card flat small muted"><Clock size={14} style={{ verticalAlign: -2 }} /> Prakiraan cuaca muncul 48 jam sebelum jadwal.</div>
          )}

          <div className="card">
            <div className="card-h">
              <div><div className="mono">Rute · checkpoint · coffee break</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>{g.plan?.checkpoints.length ? `${g.plan.checkpoints.length} checkpoint` : 'Belum ada checkpoint'}</div></div>
              <Coffee size={18} />
            </div>
            {g.plan && g.plan.checkpoints.length > 0 && (() => {
              const tl = timeline(g.plan)
              return (
                <div className="tl" style={{ marginBottom: 8 }}>
                  {tl.rows.map((r, i) => (
                    <div key={r.c.id} className="tl-row" style={{ padding: '6px 0' }}>
                      <div className={`tl-dot k-${r.c.kind}`}><span>{CP_KIND[r.c.kind].emoji}</span><b>{i + 1}</b></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row between"><span className="b" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.c.place?.name ?? r.c.name}</span>{g.plan!.legsKm && <span className="dot" style={{ fontSize: 16 }}>{String(r.arrive.getHours()).padStart(2, '0')}.{String(r.arrive.getMinutes()).padStart(2, '0')}</span>}</div>
                        <div className="tiny muted">{CP_KIND[r.c.kind].l} · {r.c.stopMin} mnt{g.plan!.legsKm ? ` · km ${r.km.toFixed(1)}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
            <div className="grid2">
              <button className="btn accent" onClick={() => go('rute/g/' + g.id)}><Coffee size={16} /> {g.plan?.checkpoints.length ? 'Atur rute' : 'Tambah checkpoint'}</button>
              {g.plan ? <a className="btn ghost" href={gmapsDirections(g.plan)} target="_blank" rel="noreferrer"><Navigation size={16} /> Google Maps</a> : <span />}
            </div>
          </div>

          {(g.route || g.notes) && (
            <div className="card">
              {g.route && <><div className="mono">Rute</div><div style={{ marginTop: 4 }}>{g.route}</div></>}
              {g.notes && <><div className="mono" style={{ marginTop: g.route ? 12 : 0 }}>Catatan</div><div style={{ marginTop: 4 }}>{g.notes}</div></>}
            </div>
          )}
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          {g.myRsvp === 'ikut' && new Date(g.datetime).getTime() > Date.now() && <GroupActionCard g={g} compact />}
          <div className="card">
            <div className="mono" style={{ marginBottom: 10 }}>Kamu ikut?</div>
            <div className="grid3">
              {(['ikut', 'mungkin', 'tidak'] as Rsvp[]).map((r) => (
                <button key={r} className={`btn ${g.myRsvp === r ? (r === 'ikut' ? 'accent' : 'ink') : 'ghost'}`} onClick={() => { setMyRsvp(g.id, r); toast(r === 'ikut' ? 'Sip, sampai ketemu! 🚲' : 'RSVP diperbarui') }}>{RSVP_L[r]}</button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><span className="mono">Peserta · estimasi tiba</span><span className="tag">{people.filter((p) => p.rsvp === 'ikut').length} ikut</span></div>
            <div className="list">
              {people.map((p) => {
                const d = haversine(p.home, g.meet.pos)
                return (
                  <div key={p.id} className="li">
                    <Avatar name={p.name} color={p.color} c={p.c} size={36} />
                    <div className="grow"><div className="t">{p.name}</div><div className="tiny muted">{d.toFixed(1)} km · ±{etaMin(d, p.spd * 0.8)} mnt ke meet point</div></div>
                    <span className={`tag ${p.rsvp === 'ikut' ? 'good' : p.rsvp === 'tidak' ? 'bad' : p.rsvp === 'mungkin' ? 'warn' : ''}`}>{RSVP_L[p.rsvp]}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="mono" style={{ marginBottom: 10 }}>Undang & simpan</div>
            <div className="stack" style={{ gap: 8 }}>
              <a className="btn ink" href={waLink(text)} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Kirim ke grup WhatsApp</a>
              <div className="grid2">
                <button className="btn ghost" onClick={async () => { const r = await shareOrCopy(g.title, text); if (r === 'copied') toast('Link undangan disalin') }}><Share2 size={16} /> Bagikan</button>
                <button className="btn ghost" onClick={() => { download(`${g.title}.ics`, groupRideICS(g)); toast('Ditambahkan ke kalender (dengan alarm H-12 jam & H-1 jam)') }}><CalendarPlus size={16} /> Kalender</button>
              </div>
              <a className="btn ghost" href={`https://www.google.com/maps/dir/?api=1&destination=${g.meet.pos[0]},${g.meet.pos[1]}&travelmode=bicycling`} target="_blank" rel="noreferrer"><Navigation size={16} /> Navigasi ke meet point</a>
            </div>
          </div>

          <LiveSquad g={g} />

          {g.host === 'me' && (
            <button className="btn ghost" style={{ color: 'var(--bad)' }} onClick={() => { if (confirm('Hapus jadwal ini?')) { deleteGroupRide(g.id); go('squad') } }}><Trash2 size={16} /> Hapus jadwal</button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Simulasi radar squad: posisi tiap anggota di rute + peringatan no-drop. */
function LiveSquad({ g }: { g: GroupRide }) {
  const { friends, settings } = useStore()
  const [on, setOn] = useState(false)
  const [t, setT] = useState(0)
  const [alert, setAlert] = useState<string | null>(null)
  const alerted = useRef<Set<string>>(new Set())
  const route = useMemo(() => makeLoop(g.meet.pos, Math.min(g.distanceKm, 40), () => 0.5, 300), [g])
  const total = useMemo(() => trackLength(route), [route])
  const members = useMemo(() => [
    { id: 'me', name: settings.name, color: '#ff4d1f', k: 1 },
    ...g.participants.filter((p) => p.rsvp !== 'tidak').map((p, i) => { const f = friends.find((x) => x.id === p.friendId); return f ? { id: f.id, name: f.name, color: f.color, k: i === g.participants.length - 1 ? 0.86 : 0.97 + ((i * 7) % 6) / 100 } : null }).filter(Boolean) as { id: string; name: string; color: string; k: number }[],
  ], [g, friends, settings.name])

  useEffect(() => {
    if (!on) return
    const iv = window.setInterval(() => setT((x) => x + 1), 300)
    return () => clearInterval(iv)
  }, [on])

  const posAt = (frac: number): LatLng => route[Math.min(route.length - 1, Math.max(0, Math.floor(frac * (route.length - 1))))]
  const fracs = members.map((m) => Math.min(1, (t / 260) * m.k))
  const lead = Math.max(...fracs)

  useEffect(() => {
    if (!on || !g.noDrop) return
    members.forEach((m, i) => {
      const gapKm = (lead - fracs[i]) * total
      if (gapKm > 0.6 && !alerted.current.has(m.id)) {
        alerted.current.add(m.id)
        const msg = `${m.name.split(' ')[0]} tertinggal ${Math.round(gapKm * 1000)} m — rombongan pelankan / tunggu di titik aman`
        setAlert(msg)
        notify('No-drop alert', msg)
        speak(msg)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  return (
    <div className="card ink">
      <div className="card-h">
        <div><div className="mono">Radar squad (live)</div><div className="b" style={{ marginTop: 2 }}>Lihat posisi rombongan</div></div>
        <button className="btn sm accent" onClick={() => { setOn(!on); if (!on) { setT(0); alerted.current.clear(); setAlert(null) } }}><Radio size={14} /> {on ? 'Stop' : 'Simulasikan'}</button>
      </div>
      {on && (
        <>
          <BaseMap center={g.meet.pos} zoom={13} className="map" fit={route}>
            <Route track={route} color="#888" weight={3} />
            {members.map((m, i) => <PersonPin key={m.id} pos={posAt(fracs[i])} label={m.name.slice(0, 2).toUpperCase()} color={m.color} size={26} />)}
          </BaseMap>
          <div className="stack" style={{ gap: 6, marginTop: 12 }}>
            {members.map((m, i) => (
              <div key={m.id} className="row small" style={{ gap: 8 }}>
                <i style={{ width: 8, height: 8, borderRadius: 9, background: m.color, display: 'inline-block', outline: '1.5px solid #fff' }} />
                <span style={{ flex: 1 }}>{m.name.split(' ')[0]}</span>
                <span className="mono">{(fracs[i] * total).toFixed(1)} km · {lead - fracs[i] < 0.005 ? 'depan' : `-${Math.round((lead - fracs[i]) * total * 1000)} m`}</span>
              </div>
            ))}
          </div>
          {alert && <div className="card accent small" style={{ marginTop: 12, padding: 12 }}>⚠ {alert}</div>}
        </>
      )}
      <p className="tiny" style={{ opacity: 0.6, marginTop: 10 }}>Demo simulasi. Untuk berbagi posisi real-time antar HP diperlukan server sinkronisasi (lihat roadmap).</p>
    </div>
  )
}

