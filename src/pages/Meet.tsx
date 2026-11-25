import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Crosshair, Loader2, MapPin, Plus, Sparkles, X, Store, Coffee, Fuel, Trees, Wrench, Utensils, Flag, UserPlus } from 'lucide-react'
import { useStore } from '../lib/store'
import type { CharConfig, LatLng } from '../lib/types'
import { centroid, etaMin, fairPoint, fairPointByTime, haversine } from '../lib/geo'
import { nearbyMeetSpots, type Place } from '../lib/places'
import { Avatar, Tabs, Top } from '../components/UI'
import { AvatarPin, BaseMap, MeetPin, PersonPin, Ring, Route, SmallPin } from '../components/Map'
import { openAjak } from '../components/AjakFlow'
import { enRoutePoint, firstName, hhmm, pickupChain, type Person } from '../lib/meetup'
import { HeadBadge } from '../components/Character'
import { Marker } from 'react-leaflet'
import L from 'leaflet'

type Mode = 'adil' | 'waktu' | 'searah' | 'jemput'
interface P { id: string; name: string; color: string; pos: LatLng; spd: number; c?: CharConfig }

const KIND_ICON: Record<string, ReactNode> = {
  Minimarket: <Store size={16} />, Kafe: <Coffee size={16} />, 'Kedai kopi': <Coffee size={16} />, SPBU: <Fuel size={16} />, Taman: <Trees size={16} />, 'Bengkel sepeda': <Wrench size={16} />, 'Cepat saji': <Utensils size={16} />,
}
const MODE_TXT: Record<Mode, string> = {
  adil: 'Meminimalkan jarak terjauh yang harus ditempuh satu orang. Tidak ada yang “dikorbankan”.',
  waktu: 'Memperhitungkan kecepatan tiap orang — yang lebih kencang boleh lebih jauh, semua tiba hampir bersamaan.',
  searah: 'Titik kumpul di jalan menuju tujuan (mis. tempat ngopi). Total jarak semua orang paling kecil, tak ada yang balik arah.',
  jemput: 'Nggak ada yang gowes sendirian ke kumpul: yang terjauh berangkat duluan & menjemput yang lain di jalan.',
}
const flagIcon = L.divIcon({ html: '<div style="width:30px;height:30px;border-radius:50%;background:repeating-conic-gradient(#111 0 25%,#fff 0 50%) 50%/12px 12px;border:3px solid #111;box-shadow:0 4px 10px rgba(0,0,0,.35)"></div>', className: '', iconSize: [30, 30], iconAnchor: [15, 15] })

export default function Meet() {
  const { friends, settings, char, groupRides } = useStore()
  const [sel, setSel] = useState<string[]>(['me', 'f1', 'f2', 'f5'])
  const [guests, setGuests] = useState<P[]>([])
  const [tapMode, setTapMode] = useState<'none' | 'guest' | 'dest'>('none')
  const [mode, setMode] = useState<Mode>('adil')
  const [override, setOverride] = useState<LatLng | null>(null)
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(false)
  const [chosen, setChosen] = useState<Place | null>(null)
  const dests = groupRides.filter((g) => g.plan?.checkpoints.length && new Date(g.datetime).getTime() > Date.now() - 6 * 3600000).map((g) => ({ name: g.plan!.checkpoints[0].place?.name ?? g.plan!.checkpoints[0].name, pos: g.plan!.checkpoints[0].pos }))
  const [dest, setDest] = useState<{ name: string; pos: LatLng }>(dests[0] ?? { name: 'Kota Tua', pos: [-6.1352, 106.8133] })
  const [arrive, setArrive] = useState(() => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); d.setHours(5, 30, 0, 0); return d })

  const all: P[] = [
    { id: 'me', name: settings.name, color: '#111111', pos: settings.home, spd: 25, c: char },
    ...friends.map((f) => ({ id: f.id, name: f.name, color: f.color, pos: f.home, spd: f.avgSpeed, c: f.char })),
  ]
  const people = [...all.filter((p) => sel.includes(p.id)), ...guests]
  const key = people.map((p) => p.pos.join(',')).join('|') + dest.pos.join(',')

  const computed = useMemo(() => {
    const pts = people.map((p) => p.pos)
    if (pts.length < 2) return null
    const c = centroid(pts)
    const f = mode === 'waktu' ? fairPointByTime(pts, people.map((p) => p.spd)) : mode === 'searah' ? enRoutePoint(pts, dest.pos) : fairPoint(pts)
    return { c, f }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mode])

  useEffect(() => { setOverride(null); setPlaces(null); setChosen(null) }, [key, mode])

  const point = override ?? computed?.f ?? settings.home
  const meetPos = chosen?.pos ?? point
  const meetName = chosen?.name ?? (mode === 'searah' ? `Titik searah ke ${dest.name}` : 'Titik temu adil')
  const rows = people.map((p) => { const d = haversine(p.pos, meetPos); return { ...p, d, eta: etaMin(d, p.spd * 0.8) } })
  const maxD = Math.max(0, ...rows.map((r) => r.d))
  const maxCentroid = computed ? Math.max(...people.map((p) => haversine(p.pos, computed.c))) : 0
  const avgD = rows.reduce((a, r) => a + r.d, 0) / Math.max(1, rows.length)
  const fairness = rows.length ? Math.round(Math.max(0, 100 - ((maxD - avgD) / Math.max(maxD, 0.1)) * 100)) : 0
  const viaKm = mode === 'searah' ? rows.reduce((a, r) => a + r.d, 0) + haversine(meetPos, dest.pos) * rows.length : 0
  const directKm = mode === 'searah' ? rows.reduce((a, r) => a + haversine(r.pos, dest.pos), 0) : 0

  const chainPeople: Person[] = people.map((p) => ({ id: p.id, name: p.id === 'me' ? 'Kamu' : p.name, char: p.c, color: p.color, rsvp: 'ikut', home: p.pos, spd: p.spd }))
  const chain = mode === 'jemput' ? pickupChain(chainPeople, meetPos, arrive) : null

  async function findSpots() {
    setLoading(true); setErr(false)
    try { const r = await nearbyMeetSpots(point); setPlaces(r); if (!r.length) setErr(true) } catch { setErr(true); setPlaces([]) }
    setLoading(false)
  }
  const onMap = (pos: LatLng) => {
    if (tapMode === 'guest') setGuests((g) => [...g, { id: 'g' + Date.now(), name: `Tamu ${g.length + 1}`, color: '#8a8a85', pos, spd: 22 }])
    if (tapMode === 'dest') setDest({ name: 'Tujuan', pos })
    setTapMode('none')
  }

  return (
    <div className="fadein">
      <Top title="Titik temu" sub="Ketemuan adil" right={<button className="btn ink sm" disabled={!computed} onClick={() => openAjak({ meet: { name: meetName, pos: meetPos }, participants: sel.filter((x) => x !== 'me').map((id) => ({ friendId: id, rsvp: 'menunggu' as const })) })}><UserPlus size={15} /> Ajak</button>} />

      <div className="row-d">
        <div className="stack">
          <div className="mapcard" style={{ position: 'relative' }}>
            <BaseMap center={point} zoom={11} className="map tall" fit={[...people.map((p) => p.pos), ...(mode === 'searah' ? [dest.pos] : [])]} onClick={tapMode !== 'none' ? onMap : undefined}>
              {computed && mode !== 'jemput' && <Ring center={meetPos} km={maxD} color="#0d0d0d" />}
              {mode === 'jemput' && chain ? (
                <>{chain.groups.map((gr, gi) => <Route key={gi} track={[...gr.stops.map((s) => s.person.home!), meetPos]} color={gr.stops.length > 1 ? '#0d0d0d' : '#9a9a93'} weight={gr.stops.length > 1 ? 3.5 : 2} dash={gr.stops.length > 1 ? undefined : '2 6'} />)}</>
              ) : rows.map((p) => <Route key={p.id} track={[p.pos, meetPos]} color="#0d0d0d" weight={1.5} dash="1 7" />)}
              {mode === 'searah' && <><Route track={[meetPos, dest.pos]} color="#d2441c" weight={4} /><Marker position={dest.pos} icon={flagIcon} title={dest.name} /></>}
              {rows.map((p) => (
                <Fragment key={p.id}>
                  {p.c ? <AvatarPin pos={p.pos} c={p.c} title={p.id === 'me' ? 'Kamu' : p.name} ring={p.id === 'me' ? '#0d0d0d' : '#fff'} size={34} /> : <PersonPin pos={p.pos} label={p.name.slice(0, 2).toUpperCase()} color={p.color} size={30} />}
                </Fragment>
              ))}
              {places?.map((pl) => <SmallPin key={pl.id} pos={pl.pos} color={chosen?.id === pl.id ? '#d2441c' : '#111'} onClick={() => setChosen(pl)} title={pl.name} />)}
              <MeetPin pos={meetPos} draggable onDrag={(p) => { setOverride(p); setChosen(null); setPlaces(null) }} />
            </BaseMap>
            {tapMode !== 'none' && <div className="island" style={{ position: 'absolute', top: 12, animation: 'none' }}><span className="island-ico"><Crosshair size={16} /></span><span className="island-t">Ketuk peta untuk {tapMode === 'guest' ? 'lokasi tamu' : 'tujuan'}</span></div>}
            <div style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 500 }} className="row">
              {mode === 'searah' && <button className="btn sm white" style={{ boxShadow: 'var(--shadow)' }} onClick={() => setTapMode('dest')}><Flag size={14} /> Tujuan</button>}
              <button className="btn sm ink" onClick={() => setTapMode(tapMode === 'guest' ? 'none' : 'guest')}><Plus size={14} /> Tamu</button>
            </div>
          </div>
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          <Tabs value={mode} onChange={setMode} options={[{ v: 'adil', l: 'Adil' }, { v: 'waktu', l: 'Waktu' }, { v: 'searah', l: 'Searah' }, { v: 'jemput', l: 'Jemput' }]} />
          <p className="small muted" style={{ marginTop: -2 }}>{MODE_TXT[mode]}</p>

          <div className="card">
            <div className="mono" style={{ marginBottom: 10 }}>Siapa saja?</div>
            <div className="chips">
              {all.map((p) => (
                <button key={p.id} className={`chip ${sel.includes(p.id) ? 'on' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: 5 }}
                  onClick={() => setSel((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}>
                  <Avatar name={p.name} color={p.color} c={p.c} size={22} />{p.id === 'me' ? 'Kamu' : firstName(p.name)}
                </button>
              ))}
              {guests.map((g) => <button key={g.id} className="chip on" onClick={() => setGuests((x) => x.filter((y) => y.id !== g.id))}>{g.name} <X size={12} /></button>)}
            </div>
          </div>

          {mode === 'searah' && (
            <div className="card">
              <div className="mono" style={{ marginBottom: 10 }}>Tujuan bersama</div>
              <div className="chips">
                {[...dests, { name: 'Kota Tua', pos: [-6.1352, 106.8133] as LatLng }, { name: 'Ancol', pos: [-6.1225, 106.8350] as LatLng }, { name: 'Sentul', pos: [-6.5410, 106.8590] as LatLng }].filter((x, i, a) => a.findIndex((y) => y.name === x.name) === i).map((d) => (
                  <button key={d.name} className={`chip ${dest.name === d.name ? 'on' : ''}`} onClick={() => setDest(d)}>{d.name}</button>
                ))}
              </div>
            </div>
          )}

          {computed ? (
            <>
              {mode === 'jemput' && chain ? (
                <div className="card">
                  <div className="card-h">
                    <div><div className="mono">Jemput berantai</div><div className="b" style={{ marginTop: 2 }}>Tiba bareng di kumpul</div></div>
                    <input className="input" type="time" aria-label="Jam tiba" style={{ width: 112, padding: '8px 10px' }} value={hhmm(arrive).replace('.', ':')} onChange={(e) => { if (!e.target.value) return; const [h, m] = e.target.value.split(':').map(Number); const d = new Date(arrive); d.setHours(h, m); setArrive(d) }} />
                  </div>
                  <p className="small muted" style={{ marginTop: -4, marginBottom: 12 }}>{chain.pickups ? `${chain.pickups} penjemputan searah · ${chain.groups.length} rombongan` : 'Tidak ada yang searah — semua langsung ke titik kumpul. Coba mode Searah atau titik lain.'}</p>
                  {chain.groups.map((gr, gi) => (
                    <div key={gi} style={{ marginTop: gi ? 12 : 0 }}>
                      <div className="mono" style={{ marginBottom: 8 }}>{gr.stops.length > 1 ? `Rombongan ${String.fromCharCode(65 + chain.groups.slice(0, gi).filter((x) => x.stops.length > 1).length)} · ${gr.stops.length} orang` : 'Langsung sendiri'}</div>
                      <div className="vtl">
                        {gr.stops.map((s, i) => (
                          <div key={s.person.id} className="vtl-row done">
                            <div className="vtl-time"><b>{hhmm(s.at)}</b><small>{i === 0 ? 'berangkat' : 'dijemput'}</small></div>
                            <div className="vtl-rail"><span className="n">{i + 1}</span><span className="ln" /></div>
                            <div className="vtl-body">
                              <div className="row" style={{ gap: 8 }}>{s.person.char && <HeadBadge c={s.person.char} size={26} />}<span className="t">{s.person.name}</span></div>
                              <div className="s">{gr.stops.length === 1 ? `${s.legKm.toFixed(1)} km langsung ke kumpul` : i === 0 ? `Mulai sendiri ${s.legKm.toFixed(1)} km sampai jemputan pertama` : `Rombongan jadi ${s.groupSize} · lanjut ${s.legKm.toFixed(1)} km`}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="vtl" style={{ marginTop: 4 }}>
                    <div className="vtl-row">
                      <div className="vtl-time"><b>{hhmm(chain.arrive)}</b><small>tiba</small></div>
                      <div className="vtl-rail"><span className="n" /><span className="ln" /></div>
                      <div className="vtl-body"><div className="t">📍 {meetName}</div><div className="s">Semua tiba bersamaan</div></div>
                    </div>
                  </div>
                  <div className="grid2" style={{ marginTop: 6 }}>
                    <div className="stat"><div className="mono">Dijemput</div><div className="big">{chain.pickups}<span className="unit">orang</span></div><div className="s">tidak perlu gowes sendirian</div></div>
                    <div className="stat"><div className="mono">Total km rombongan</div><div className="big">{chain.totalKm.toFixed(0)}<span className="unit">km</span></div><div className="s">rute penjemputan</div></div>
                  </div>
                </div>
              ) : (
                <div className="grid2">
                  {mode === 'searah' ? (
                    <>
                      <div className="stat"><div className="mono">Tambahan jarak</div><div className="big">+{Math.max(0, viaKm - directKm).toFixed(1)}<span className="unit">km</span></div><div className="s">total semua orang vs langsung ke tujuan</div></div>
                      <div className="stat"><div className="mono">Terjauh ke kumpul</div><div className="big">{maxD.toFixed(1)}<span className="unit">km</span></div><div className="s">lalu bareng {haversine(meetPos, dest.pos).toFixed(1)} km</div></div>
                    </>
                  ) : (
                    <>
                      <div className="stat"><div className="mono">Skor keadilan</div><div className="big">{fairness}</div><div className="s">100 = terjauh ≈ rata-rata</div></div>
                      <div className="stat"><div className="mono">Terjauh</div><div className="big">{maxD.toFixed(1)}<span className="unit">km</span></div><div className="s">{maxCentroid - maxD > 0.2 ? `hemat ${(maxCentroid - maxD).toFixed(1)} km vs titik tengah` : 'per orang'}</div></div>
                    </>
                  )}
                </div>
              )}

              {mode !== 'jemput' && (
                <div className="card">
                  <div className="list">
                    {[...rows].sort((a, b) => b.d - a.d).map((r) => (
                      <div key={r.id} className="li">
                        <Avatar name={r.name} color={r.color} c={r.c} size={34} />
                        <div className="grow">
                          <div className="t">{r.id === 'me' ? 'Kamu' : r.name}</div>
                          <div className="meter" style={{ marginTop: 6, height: 4 }}><i style={{ width: `${(r.d / Math.max(maxD, 0.1)) * 100}%`, background: r.d === maxD ? 'var(--accent)' : 'var(--ink)' }} /></div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 70 }}><div className="b">{r.d.toFixed(1)}<span className="unit">km</span></div><div className="mono">±{r.eta} mnt</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-h">
                  <div><div className="mono">Tempat kumpul nyata</div><div className="b" style={{ marginTop: 2 }}>Minimarket, kafe, SPBU, taman</div></div>
                  <Sparkles size={16} />
                </div>
                {!places && <button className="btn ink block" onClick={findSpots} disabled={loading}>{loading ? <><Loader2 size={16} className="spin" /> Mencari…</> : <><Crosshair size={16} /> Cari tempat terbaik</>}</button>}
                {places && places.length > 0 && (
                  <div className="stack" style={{ gap: 6 }}>
                    {places.slice(0, 6).map((pl) => (
                      <button key={pl.id} className={`opt ${chosen?.id === pl.id ? 'on' : ''}`} onClick={() => setChosen(pl)}>
                        <span className="ico">{KIND_ICON[pl.kind] ?? <MapPin size={16} />}</span>
                        <span className="grow"><span className="b" style={{ display: 'block' }}>{pl.name}</span><span className="tiny muted">{pl.kind} · {Math.round(pl.dist * 1000)} m · {pl.why}</span></span>
                      </button>
                    ))}
                  </div>
                )}
                {err && <div className="small muted" style={{ marginTop: 8 }}>Tidak bisa memuat data tempat sekarang. Geser pin ke lokasi yang kamu tahu.</div>}
              </div>

              <button className="btn ink block lg" onClick={() => openAjak({ meet: { name: meetName, pos: meetPos }, participants: sel.filter((x) => x !== 'me').map((id) => ({ friendId: id, rsvp: 'menunggu' as const })), datetime: mode === 'jemput' ? arrive.toISOString() : undefined })}><UserPlus size={17} /> Ajak gowes di sini</button>
              <a className="btn ghost block" href={`https://www.google.com/maps/search/?api=1&query=${meetPos[0]},${meetPos[1]}`} target="_blank" rel="noreferrer">Lihat di Google Maps</a>
            </>
          ) : <div className="empty">Pilih minimal 2 orang.</div>}
        </div>
      </div>
    </div>
  )
}
