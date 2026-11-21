import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Crosshair, Loader2, MapPin, Plus, Sparkles, X, Store, Coffee, Fuel, Trees, Wrench, Utensils } from 'lucide-react'
import { useStore } from '../lib/store'
import type { LatLng } from '../lib/types'
import { centroid, etaMin, fairPoint, fairPointByTime, haversine } from '../lib/geo'
import { nearbyMeetSpots, type Place } from '../lib/places'
import { Avatar, Tabs, Top } from '../components/UI'
import { BaseMap, MeetPin, PersonPin, Ring, Route, SmallPin } from '../components/Map'
import { CreateRide } from './Squad'

type Mode = 'adil' | 'waktu' | 'rata'
interface P { id: string; name: string; color: string; pos: LatLng; spd: number; c?: import('../lib/types').CharConfig }

const KIND_ICON: Record<string, ReactNode> = {
  Minimarket: <Store size={16} />, Kafe: <Coffee size={16} />, SPBU: <Fuel size={16} />, Taman: <Trees size={16} />, 'Bengkel sepeda': <Wrench size={16} />, 'Resto cepat saji': <Utensils size={16} />,
}

export default function Meet() {
  const { friends, settings, char } = useStore()
  const [sel, setSel] = useState<string[]>(['me', 'f1', 'f2', 'f5'])
  const [guests, setGuests] = useState<P[]>([])
  const [addMode, setAddMode] = useState(false)
  const [mode, setMode] = useState<Mode>('adil')
  const [override, setOverride] = useState<LatLng | null>(null)
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(false)
  const [chosen, setChosen] = useState<Place | null>(null)
  const [create, setCreate] = useState(false)

  const all: P[] = [
    { id: 'me', name: settings.name, color: '#111111', pos: settings.home, spd: 25, c: char },
    ...friends.map((f) => ({ id: f.id, name: f.name, color: f.color, pos: f.home, spd: f.avgSpeed, c: f.char })),
  ]
  const people = [...all.filter((p) => sel.includes(p.id)), ...guests]
  const key = people.map((p) => p.pos.join(',')).join('|')

  const computed = useMemo(() => {
    const pts = people.map((p) => p.pos)
    if (pts.length < 2) return null
    const c = centroid(pts)
    const f = mode === 'waktu' ? fairPointByTime(pts, people.map((p) => p.spd)) : mode === 'adil' ? fairPoint(pts) : c
    return { c, f }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mode])

  useEffect(() => { setOverride(null); setPlaces(null); setChosen(null) }, [key, mode])

  const point = override ?? computed?.f ?? settings.home
  const rows = people.map((p) => { const d = haversine(p.pos, point); return { ...p, d, eta: etaMin(d, p.spd * 0.8) } })
  const maxD = Math.max(0, ...rows.map((r) => r.d))
    const maxCentroid = computed ? Math.max(...people.map((p) => haversine(p.pos, computed.c))) : 0
  const saved = maxCentroid - maxD
  const avgD = rows.reduce((a, r) => a + r.d, 0) / Math.max(1, rows.length)
  // 100 = orang yang paling jauh tidak menempuh lebih dari rata-rata kelompok
  const fairness = rows.length ? Math.round(Math.max(0, 100 - ((maxD - avgD) / Math.max(maxD, 0.1)) * 100)) : 0

  async function findSpots() {
    setLoading(true); setErr(false)
    try { const r = await nearbyMeetSpots(point); setPlaces(r); if (!r.length) setErr(true) } catch { setErr(true); setPlaces([]) }
    setLoading(false)
  }

  const meetPos = chosen?.pos ?? point
  const meetName = chosen?.name ?? `Titik temu (${point[0].toFixed(4)}, ${point[1].toFixed(4)})`

  return (
    <div className="fadein">
      <Top title="Titik Temu Adil" sub="Meet point" back />

      <div className="row-d">
        <div className="stack">
          <div style={{ position: 'relative' }}>
            <BaseMap center={point} zoom={11} className="map full" fit={[...people.map((p) => p.pos)]}
              onClick={addMode ? (pos) => { setGuests((g) => [...g, { id: 'g' + Date.now(), name: `Tamu ${g.length + 1}`, color: '#8a8a85', pos, spd: 22 }]); setAddMode(false) } : undefined}>
              {computed && <Ring center={point} km={maxD} />}
              {rows.map((p) => (
                <Fragment key={p.id}>
                  <Route track={[p.pos, meetPos]} color={p.color === '#111111' ? '#111' : p.color} weight={2} dash="1 7" />
                  <PersonPin pos={p.pos} label={p.name.slice(0, 2).toUpperCase()} color={p.color} size={30} />
                </Fragment>
              ))}
              {mode !== 'rata' && computed && !override && <SmallPin pos={computed.c} color="#8a8a85" />}
              {places?.map((pl) => <SmallPin key={pl.id} pos={pl.pos} color={chosen?.id === pl.id ? '#ff4d1f' : '#111'} onClick={() => setChosen(pl)} />)}
              <MeetPin pos={meetPos} draggable onDrag={(p) => { setOverride(p); setChosen(null); setPlaces(null) }} />
            </BaseMap>
            {addMode && <div className="toast" style={{ position: 'absolute', top: 12 }}>Ketuk peta untuk menambah lokasi tamu</div>}
            <div style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 500 }} className="row">
              <button className="btn sm ink" onClick={() => setAddMode(!addMode)}><Plus size={14} /> Lokasi tamu</button>
            </div>
          </div>
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          <div className="card">
            <div className="mono" style={{ marginBottom: 10 }}>Siapa saja yang ikut?</div>
            <div className="chips">
              {all.map((p) => (
                <button key={p.id} className={`chip ${sel.includes(p.id) ? 'on' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setSel((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}>
                  <Avatar name={p.name} color={p.color} c={p.c} size={22} />{p.id === 'me' ? 'Kamu' : p.name.split(' ')[0]}
                </button>
              ))}
              {guests.map((g) => <button key={g.id} className="chip on" onClick={() => setGuests((x) => x.filter((y) => y.id !== g.id))}>{g.name} <X size={12} /></button>)}
            </div>
          </div>

          <Tabs value={mode} onChange={setMode} options={[{ v: 'adil', l: 'Adil jarak' }, { v: 'waktu', l: 'Adil waktu' }, { v: 'rata', l: 'Rata-rata' }]} />
          <p className="tiny muted" style={{ marginTop: -4 }}>
            {mode === 'adil' && 'Meminimalkan jarak terjauh yang harus ditempuh satu orang. Tidak ada yang “dikorbankan”.'}
            {mode === 'waktu' && 'Memperhitungkan kecepatan tiap orang. Yang lebih kencang boleh menempuh jarak lebih jauh, jadi semua tiba hampir bersamaan.'}
            {mode === 'rata' && 'Titik tengah geografis biasa. Sering tidak adil kalau mayoritas teman di satu sisi kota.'}
          </p>

          {computed ? (
            <>
              <div className="bento">
                <div className="card accent">
                  <div className="mono">Skor keadilan</div>
                  <div className="dot" style={{ fontSize: 52, marginTop: 6 }}>{fairness}</div>
                  <div className="tiny">100 = yang terjauh tidak lebih jauh dari rata-rata</div>
                </div>
                <div className="card ink">
                  <div className="mono">Terjauh</div>
                  <div className="dot" style={{ fontSize: 52, marginTop: 6 }}>{maxD.toFixed(1)}</div>
                  <div className="tiny">km{saved > 0.2 && mode !== 'rata' ? ` · hemat ${saved.toFixed(1)} km vs rata-rata` : ''}</div>
                </div>
              </div>

              <div className="card">
                <div className="list">
                  {rows.sort((a, b) => b.d - a.d).map((r) => (
                    <div key={r.id} className="li">
                      <Avatar name={r.name} color={r.color} c={r.c} size={34} />
                      <div className="grow">
                        <div className="t">{r.id === 'me' ? 'Kamu' : r.name}</div>
                        <div className="meter" style={{ marginTop: 6, height: 5 }}><i style={{ width: `${(r.d / Math.max(maxD, 0.1)) * 100}%`, background: r.d === maxD ? 'var(--accent)' : 'var(--ink)' }} /></div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 70 }}><div className="num" style={{ fontSize: 18 }}>{r.d.toFixed(1)}<span className="unit">km</span></div><div className="mono">±{r.eta} mnt</div></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-h">
                  <div><div className="mono">Tempat kumpul nyata di sekitar</div><div className="b" style={{ marginTop: 2 }}>Minimarket, kafe, SPBU, taman</div></div>
                  <Sparkles size={16} />
                </div>
                {!places && <button className="btn ink block" onClick={findSpots} disabled={loading}>{loading ? <><Loader2 size={16} className="spin" /> Mencari…</> : <><Crosshair size={16} /> Cari tempat terbaik</>}</button>}
                {places && places.length > 0 && (
                  <div className="list">
                    {places.map((pl) => (
                      <button key={pl.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'left', width: '100%' }} onClick={() => setChosen(pl)}>
                        <div className="ico" style={chosen?.id === pl.id ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--sunken)' }}>{KIND_ICON[pl.kind] ?? <MapPin size={16} />}</div>
                        <div className="grow"><div className="t">{pl.name}</div><div className="tiny muted">{pl.kind} · {Math.round(pl.dist * 1000)} m · {pl.why}</div></div>
                      </button>
                    ))}
                  </div>
                )}
                {err && <div className="small muted" style={{ marginTop: 8 }}>Tidak bisa memuat data tempat sekarang. Geser pin ke lokasi yang kamu tahu (mis. minimarket terdekat).</div>}
              </div>

              <button className="btn accent block" style={{ padding: 16 }} onClick={() => setCreate(true)}><MapPin size={16} /> Buat gowes bareng di sini</button>
              <a className="btn ghost block" href={`https://www.google.com/maps/search/?api=1&query=${meetPos[0]},${meetPos[1]}`} target="_blank" rel="noreferrer">Lihat di Google Maps</a>
            </>
          ) : <div className="empty">Pilih minimal 2 orang.</div>}
        </div>
      </div>

      {create && (
        <CreateRide open={create} onClose={() => setCreate(false)} preset={{ title: 'Gowes bareng', meet: { name: meetName, pos: meetPos }, participants: sel.filter((x) => x !== 'me').map((id) => ({ friendId: id, rsvp: 'menunggu' as const })) }} />
      )}
    </div>
  )
}
