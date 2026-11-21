import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Coffee, Flag, Loader2, MapPin, Navigation, Plus, Repeat, Save, Share2, Sparkles, Trash2, Wand2, Utensils, Store, Wrench, Moon, Droplets, Camera, Bed, Users, Calculator, ExternalLink, Route as RouteIcon, X } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Checkpoint, CheckpointKind, GroupRide, LatLng, RoutePlan } from '../lib/types'
import { getBikeRoute, kmAlong, pointAtKm } from '../lib/routing'
import { CP_KIND, defaultPlan, gmapsDirections, hhmm, itineraryText, timeline } from '../lib/plan'
export { CP_KIND, gmapsDirections, timeline } from '../lib/plan'
import { nearbyPlaces, type Place, type PlaceCat } from '../lib/places'
import { prayerTimes, type PrayerTime } from '../lib/prayer'
import { haversine } from '../lib/geo'
import { fmt, fmtDate, uid } from '../lib/util'
import { BaseMap, MeetPin, Route, SmallPin } from '../components/Map'
import { confirmDialog, Sheet, toast, Top } from '../components/UI'
import { waLink, shareOrCopy } from '../lib/share'
import { go } from '../lib/router'
import { CreateRide } from './Squad'
import { Marker } from 'react-leaflet'
import L from 'leaflet'

const CAT_TABS: { c: PlaceCat; l: string; icon: ReactNode }[] = [
  { c: 'kopi', l: 'Kopi', icon: <Coffee size={14} /> }, { c: 'makan', l: 'Makan', icon: <Utensils size={14} /> }, { c: 'minimarket', l: 'Minimarket', icon: <Store size={14} /> },
  { c: 'masjid', l: 'Masjid', icon: <Moon size={14} /> }, { c: 'bengkel', l: 'Bengkel', icon: <Wrench size={14} /> }, { c: 'air', l: 'Air & toilet', icon: <Droplets size={14} /> },
]
const CAT_TO_KIND: Record<PlaceCat, CheckpointKind> = { kopi: 'kopi', makan: 'makan', minimarket: 'rehat', masjid: 'sholat', bengkel: 'bengkel', air: 'air', kumpul: 'rehat' }


function cpIcon(n: number, kind: CheckpointKind, active: boolean) {
  const html = `<div class="drop"><div style="display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:${active ? '#ff4d1f' : '#111'};color:#fff;font:700 12px var(--f-ui);border:2.5px solid #fff;box-shadow:0 6px 14px -4px rgba(0,0,0,.5);transform:rotate(-6deg)"><span style="font-size:11px;line-height:1">${CP_KIND[kind].emoji}</span><span style="font-size:9px;line-height:1;margin-top:1px">${n}</span></div></div>`
  return L.divIcon({ html, className: '', iconSize: [34, 34], iconAnchor: [17, 17] })
}
const finishIcon = L.divIcon({ html: '<div style="width:30px;height:30px;border-radius:50%;background:repeating-conic-gradient(#111 0 25%,#fff 0 50%) 50%/12px 12px;border:3px solid #111;box-shadow:0 4px 10px rgba(0,0,0,.4)"></div>', className: '', iconSize: [30, 30], iconAnchor: [15, 15] })

export default function RoutePlanner({ id, groupId }: { id?: string; groupId?: string }) {
  const { routes, upsertRoute, groupRides, upsertGroupRide, settings, friends } = useStore()
  const group = groupId ? groupRides.find((g) => g.id === groupId) : undefined
  const existing = id ? routes.find((r) => r.id === id) : undefined
  const [plan, setPlanState] = useState<RoutePlan>(() => existing ?? group?.plan ?? defaultPlan(group ? group.meet : { name: settings.homeLabel, pos: settings.home }, group?.datetime))
  const [mode, setMode] = useState<'cp' | 'finish' | 'start'>('cp')
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [cbFor, setCbFor] = useState<string | null>(null)
  const [split, setSplit] = useState<Checkpoint | null>(null)
  const [every, setEvery] = useState(20)
  const [prayers, setPrayers] = useState<PrayerTime[]>([])
  const [create, setCreate] = useState(false)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [initialFit] = useState<LatLng[] | undefined>(() => { const p0 = existing ?? group?.plan; return p0 && p0.checkpoints.length ? [p0.start.pos, ...p0.checkpoints.map((c) => c.pos)] : undefined })
  const first = useRef(true)
  const reqId = useRef(0)

  const setPlan = (p: RoutePlan) => setPlanState(p)
  const pts: LatLng[] = useMemo(() => [plan.start.pos, ...plan.checkpoints.map((c) => c.pos), (plan.finish ?? plan.start).pos], [plan.start.pos, plan.checkpoints, plan.finish])
  const ptsKey = pts.map((p) => p.join(',')).join('|')

  // hitung rute sepanjang jalan (debounce)
  useEffect(() => {
    const my = ++reqId.current
    setBusy(true)
    const t = setTimeout(async () => {
      const r = await getBikeRoute(pts)
      if (my !== reqId.current) return
      setPlanState((p) => ({ ...p, geometry: r.coords, legsKm: r.legs, distanceKm: r.km, routed: r.routed }))
      setBusy(false)
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptsKey])

  const tl = timeline(plan)

  // simpan otomatis (debounce) — tidak ada perubahan yang hilang
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setSaved('saving')
    const t = setTimeout(() => { persist(plan); setSaved('saved') }, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan])
  function persist(p: RoutePlan) {
    if (group) {
      const live = useStore.getState().groupRides.find((x) => x.id === group.id) ?? group
      const t2 = timeline(p)
      upsertGroupRide({ ...live, plan: p, distanceKm: Math.round(t2.totalKm) || live.distanceKm, route: p.checkpoints.map((c) => c.place?.name ?? c.name).join(' – ') || live.route })
    } else upsertRoute(p)
  }

  useEffect(() => { prayerTimes(plan.start.pos, new Date(plan.startTime)).then(setPrayers) }, [plan.start.pos, plan.startTime])
  const rideStart = new Date(plan.startTime).getTime()
  const crossing = prayers.filter((p) => p.time.getTime() > rideStart && p.time.getTime() < tl.finish.getTime() && !plan.checkpoints.some((c) => c.kind === 'sholat' && Math.abs(timeAt(c.id) - p.time.getTime()) < 75 * 60000))
  function timeAt(cid: string) { return tl.rows.find((r) => r.c.id === cid)?.arrive.getTime() ?? 0 }

  const addCp = (pos: LatLng, kind: CheckpointKind = 'rehat', extra?: Partial<Checkpoint>) => {
    const c: Checkpoint = { id: uid(), name: `Checkpoint ${plan.checkpoints.length + 1}`, pos, kind, stopMin: CP_KIND[kind].stop, ...extra }
    // sisipkan sesuai urutan di rute bila geometri sudah ada
    let list = [...plan.checkpoints, c]
    if (plan.geometry && plan.geometry.length > 2) list = list.sort((a, b) => kmAlong(plan.geometry!, a.pos) - kmAlong(plan.geometry!, b.pos))
    setPlan({ ...plan, checkpoints: list })
    setSel(c.id)
    return c
  }
  const updCp = (cid: string, p: Partial<Checkpoint>) => setPlan({ ...plan, checkpoints: plan.checkpoints.map((c) => (c.id === cid ? { ...c, ...p } : c)) })
  const delCp = (cid: string) => setPlan({ ...plan, checkpoints: plan.checkpoints.filter((c) => c.id !== cid) })
  const move = (i: number, d: -1 | 1) => { const l = [...plan.checkpoints]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setPlan({ ...plan, checkpoints: l }) }

  const onMap = (p: LatLng) => {
    if (mode === 'cp') { addCp(p); toast('📍 Checkpoint ditambahkan', 'Ketuk ☕ untuk cari kopi/makan di dekatnya') }
    else if (mode === 'finish') { setPlan({ ...plan, finish: { name: 'Finish', pos: p } }); setMode('cp') }
    else { setPlan({ ...plan, start: { ...plan.start, pos: p } }); setMode('cp') }
  }

  function autoEvery() {
    if (!plan.geometry || (plan.distanceKm ?? 0) < every * 1.2) { toast('Rute terlalu pendek', `Butuh lebih dari ${every} km`); return }
    const n = Math.floor((plan.distanceKm! - 3) / every)
    const fresh: Checkpoint[] = []
    for (let i = 1; i <= n; i++) {
      const pos = pointAtKm(plan.geometry, i * every)
      if (plan.checkpoints.some((c) => haversine(c.pos, pos) < 2)) continue
      fresh.push({ id: uid(), name: `Rehat km ${i * every}`, pos, kind: i % 2 === 0 ? 'kopi' : 'rehat', stopMin: i % 2 === 0 ? 20 : 10 })
    }
    const list = [...plan.checkpoints, ...fresh].sort((a, b) => kmAlong(plan.geometry!, a.pos) - kmAlong(plan.geometry!, b.pos))
    setPlan({ ...plan, checkpoints: list })
    toast(`✨ ${fresh.length} checkpoint dibuat`, `Tiap ${every} km — bergantian rehat & coffee break`)
  }

  async function autoPlace(kind: CheckpointKind, pos: LatLng, label: string) {
    const c = addCp(pos, kind, { name: label })
    try {
      const res = await nearbyPlaces(pos, CP_KIND[kind].cat, 1200)
      if (res[0]) {
        setPlanState((p) => ({ ...p, checkpoints: p.checkpoints.map((x) => (x.id === c.id ? { ...x, pos: res[0].pos, name: res[0].name, place: { name: res[0].name, kind: res[0].kind, pos: res[0].pos, hours: res[0].hours, extra: res[0].extra } } : x)) }))
        toast(`${CP_KIND[kind].emoji} ${res[0].name}`, `${res[0].kind} · ${Math.round(res[0].dist * 1000)} m dari rute`)
      } else toast(`${CP_KIND[kind].emoji} ${label} ditambahkan`, 'Belum ketemu tempat; ketuk ☕ untuk cari manual')
    } catch { toast(`${CP_KIND[kind].emoji} ${label} ditambahkan`, 'Data tempat belum bisa dimuat; cari manual nanti') }
  }

  function midCoffee() {
    if (!plan.geometry) return
    const km = (plan.distanceKm ?? 0) * 0.5
    autoPlace('kopi', pointAtKm(plan.geometry, km), `Coffee break km ${km.toFixed(0)}`)
  }

  function addPrayer(p: PrayerTime) {
    if (!plan.geometry) return
    // km saat waktu sholat tiba (abaikan rehat setelahnya untuk perkiraan)
    let t = rideStart, km = 0
    const legs = plan.legsKm ?? []
    for (let i = 0; i < legs.length; i++) {
      const dt = (legs[i] / plan.speed) * 3600000
      if (t + dt >= p.time.getTime()) { km += ((p.time.getTime() - t) / dt) * legs[i]; break }
      t += dt + (plan.checkpoints[i]?.stopMin ?? 0) * 60000
      km += legs[i]
    }
    autoPlace('sholat', pointAtKm(plan.geometry, km), `Sholat ${p.name}`)
  }

  function save() {
    persist(plan)
    setSaved('saved')
    toast(group ? '💾 Rute tersimpan di gowes bareng' : '💾 Rute tersimpan', `${plan.checkpoints.length} checkpoint · ${tl.totalKm.toFixed(1)} km`)
  }

  const cbCp = plan.checkpoints.find((c) => c.id === cbFor) ?? null

  return (
    <div className="fadein">
      <Top title={group ? 'Rute & checkpoint' : 'Perencana rute'} sub={group ? group.title : 'Checkpoint & coffee break'} back={group ? 'squad/' + group.id : 'rute'}
        right={<span className={`savechip ${saved}`} aria-live="polite">{saved === 'saving' ? <><Loader2 size={13} className="spin" /> Menyimpan</> : saved === 'saved' ? <>✓ Tersimpan</> : <><Save size={13} /> Otomatis</>}</span>} />

      <div className="row-d">
        <div className="stack">
          {!group && <input className="input" style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20 }} value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} aria-label="Nama rute" />}
          <div style={{ position: 'relative' }}>
            <BaseMap center={plan.start.pos} zoom={13} className="map full" onClick={onMap} fit={initialFit}>
              {plan.geometry && <><Route track={plan.geometry} color="#111" weight={7} /><Route track={plan.geometry} color="#ff4d1f" weight={3.5} /></>}
              <MeetPin pos={plan.start.pos} label="S" draggable onDrag={(p) => setPlan({ ...plan, start: { ...plan.start, pos: p } })} />
              {plan.finish && <Marker position={plan.finish.pos} icon={finishIcon} draggable eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); setPlan({ ...plan, finish: { ...plan.finish!, pos: [ll.lat, ll.lng] } }) } }} />}
              {plan.checkpoints.map((c, i) => (
                <Fragment key={c.id}>
                  {c.place && haversine(c.place.pos, c.pos) > 0.02 && <SmallPin pos={c.place.pos} color="#ff4d1f" />}
                  <Marker position={c.pos} icon={cpIcon(i + 1, c.kind, sel === c.id)} draggable zIndexOffset={500}
                    eventHandlers={{ click: () => setSel(c.id), dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); updCp(c.id, { pos: [ll.lat, ll.lng], place: undefined }) } }} />
                </Fragment>
              ))}
            </BaseMap>
            <div style={{ position: 'absolute', left: 12, right: 12, top: 12, zIndex: 500, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([['cp', <Plus key="a" size={14} />, 'Checkpoint'], ['finish', <Flag key="b" size={14} />, 'Finish'], ['start', <MapPin key="c" size={14} />, 'Start']] as const).map(([m, ic, l]) => (
                <button key={m} className={`chip ${mode === m ? 'on' : ''}`} style={{ background: mode === m ? undefined : 'var(--surface)', boxShadow: 'var(--shadow)', display: 'inline-flex', gap: 5, alignItems: 'center' }} onClick={() => setMode(m)}>{ic}{l}</button>
              ))}
              {plan.finish && <button className="chip" style={{ background: 'var(--surface)', display: 'inline-flex', gap: 5, alignItems: 'center' }} onClick={() => setPlan({ ...plan, finish: null })}><Repeat size={14} /> Loop</button>}
            </div>
            <div className="card ink" style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 500, padding: '12px 16px', borderRadius: 20 }}>
              <div className="row between">
                <div><div className="mono">Jarak</div><div className="dot" style={{ fontSize: 26 }}>{busy ? '…' : tl.totalKm.toFixed(1)}</div></div>
                <div><div className="mono">Gowes</div><div className="dot" style={{ fontSize: 26 }}>{Math.floor(tl.rideMin / 60)}:{String(tl.rideMin % 60).padStart(2, '0')}</div></div>
                <div><div className="mono">Rehat</div><div className="dot" style={{ fontSize: 26 }}>{tl.stopMin}<span className="unit">m</span></div></div>
                <div><div className="mono">Finish</div><div className="dot" style={{ fontSize: 26, color: 'var(--accent)' }}>{hhmm(tl.finish)}</div></div>
              </div>
              <div className="mono" style={{ marginTop: 4, fontSize: 9 }}>{busy ? 'menghitung rute sepeda…' : plan.routed ? 'rute mengikuti jalan sepeda (OSM)' : 'perkiraan garis lurus — rute jalan belum termuat'} · mode: ketuk peta untuk {mode === 'cp' ? 'menambah checkpoint' : mode === 'finish' ? 'menaruh finish' : 'memindah start'}</div>
            </div>
          </div>
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          <div className="card">
            <div className="row between">
              <label className="field" style={{ flex: 1 }}><span className="mono">Mulai</span><input className="input" type="datetime-local" value={new Date(new Date(plan.startTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={(e) => setPlan({ ...plan, startTime: new Date(e.target.value).toISOString() })} /></label>
              <label className="field" style={{ width: 110, marginLeft: 10 }}><span className="mono">Pace km/j</span><input className="input" type="number" min={10} max={40} value={plan.speed} onChange={(e) => setPlan({ ...plan, speed: Math.max(8, +e.target.value || 20) })} /></label>
            </div>
          </div>

          {/* Timeline checkpoint */}
          <div className="card" style={{ paddingBottom: 8 }}>
            <div className="card-h"><div><div className="mono">Timeline · {plan.checkpoints.length} checkpoint</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Itinerary ride</div></div><RouteIcon size={18} /></div>
            <div className="tl">
              <TlNode n="S" tone="start" time={hhmm(new Date(plan.startTime))} title={plan.start.name} sub="Start · kumpul" />
              {tl.rows.map((r, i) => (
                <div key={r.c.id} className={`tl-item ${sel === r.c.id ? 'sel' : ''}`} onClick={() => setSel(r.c.id)}>
                  <div className="tl-leg mono">↓ {r.leg.toFixed(1)} km · {Math.round((r.leg / plan.speed) * 60)} mnt</div>
                  <div className="tl-row">
                    <div className={`tl-dot k-${r.c.kind}`}><span>{CP_KIND[r.c.kind].emoji}</span><b>{i + 1}</b></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row between" style={{ gap: 8 }}>
                        <input className="tl-name" value={r.c.name} onChange={(e) => updCp(r.c.id, { name: e.target.value })} aria-label={`Nama checkpoint ${i + 1}`} />
                        <span className="dot" style={{ fontSize: 18, flexShrink: 0 }}>{hhmm(r.arrive)}</span>
                      </div>
                      <div className="tiny muted">km {r.km.toFixed(1)} · rehat sampai {hhmm(r.leave)}</div>
                      {r.c.place && (
                        <div className="place-pill">
                          <span>{CP_KIND[r.c.kind].emoji} <b>{r.c.place.name}</b> · {r.c.place.kind}{r.c.place.hours ? ` · ${r.c.place.hours}` : ''}</span>
                          <button aria-label="Lepas tempat" onClick={(e) => { e.stopPropagation(); updCp(r.c.id, { place: undefined }) }}><X size={12} /></button>
                        </div>
                      )}
                      {sel === r.c.id && (
                        <div className="stack" style={{ gap: 8, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                          <div className="chips">{(Object.keys(CP_KIND) as CheckpointKind[]).map((k) => <button key={k} className={`chip ${r.c.kind === k ? 'on' : ''}`} onClick={() => updCp(r.c.id, { kind: k, stopMin: CP_KIND[k].stop })}>{CP_KIND[k].emoji} {CP_KIND[k].l}</button>)}</div>
                          <div className="row" style={{ gap: 6 }}>
                            <span className="mono" style={{ marginRight: 4 }}>Rehat</span>
                            {[5, 10, 15, 20, 30, 45].map((m) => <button key={m} className={`chip ${r.c.stopMin === m ? 'accent' : ''}`} style={{ padding: '5px 9px' }} onClick={() => updCp(r.c.id, { stopMin: m })}>{m}</button>)}
                          </div>
                          <div className="row wrap" style={{ gap: 6 }}>
                            <button className="btn sm accent" onClick={() => setCbFor(r.c.id)}><Coffee size={14} /> Cari {CP_KIND[r.c.kind].cat === 'masjid' ? 'masjid' : CP_KIND[r.c.kind].cat === 'bengkel' ? 'bengkel' : 'kopi & makan'} terdekat</button>
                            {r.c.place && <button className="btn sm ghost" onClick={() => setSplit(r.c)}><Calculator size={14} /> Patungan</button>}
                            <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label="Naik" onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                            <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label="Turun" onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                            <button className="iconbtn" style={{ width: 34, height: 34, color: 'var(--bad)' }} aria-label="Hapus" onClick={() => delCp(r.c.id)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="tl-item"><div className="tl-leg mono">↓ {tl.lastLeg.toFixed(1)} km · {Math.round((tl.lastLeg / plan.speed) * 60)} mnt</div></div>
              <TlNode n="F" tone="finish" time={hhmm(tl.finish)} title={plan.finish?.name ?? `${plan.start.name} (loop)`} sub={`Finish · total ${tl.totalKm.toFixed(1)} km`} />
            </div>
            {plan.checkpoints.length === 0 && <div className="empty" style={{ paddingTop: 6 }}>Ketuk peta untuk menambah checkpoint sebanyak yang kamu mau, atau pakai alat pintar di bawah.</div>}
          </div>

          {/* Alat pintar */}
          <div className="card ink">
            <div className="card-h"><span className="mono">Alat pintar</span><Wand2 size={16} /></div>
            <button className="btn accent block" onClick={midCoffee} disabled={!plan.geometry || tl.totalKm < 5}><Coffee size={16} /> Coffee break otomatis di tengah rute</button>
            <div className="row" style={{ gap: 10, marginTop: 14 }}>
              <span className="mono" style={{ flexShrink: 0 }}>Tiap {every} km</span>
              <input type="range" min={8} max={40} step={2} value={every} onChange={(e) => setEvery(+e.target.value)} style={{ flex: 1 }} aria-label="Jarak antar checkpoint" />
              <button className="btn sm" style={{ background: 'rgba(255,255,255,.14)', color: 'inherit' }} onClick={autoEvery}><Sparkles size={14} /> Buat</button>
            </div>
            {crossing.length > 0 && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 16, background: 'rgba(255,255,255,.08)' }}>
                <div className="b small">🕌 Ride-mu melewati waktu sholat</div>
                {crossing.map((p) => (
                  <div key={p.name} className="row between" style={{ marginTop: 8 }}>
                    <span className="small">{p.name} · {hhmm(p.time)}</span>
                    <button className="btn sm" style={{ background: '#fff', color: '#111' }} onClick={() => addPrayer(p)}>+ Checkpoint masjid</button>
                  </div>
                ))}
              </div>
            )}
            <p className="tiny" style={{ opacity: 0.6, marginTop: 10 }}>Checkpoint otomatis disisipkan sesuai urutan di rute. Seret pin di peta untuk menggeser, rute dihitung ulang mengikuti jalan.</p>
          </div>

          <div className="card">
            <div className="mono" style={{ marginBottom: 10 }}>Bagikan & navigasi</div>
            <div className="stack" style={{ gap: 8 }}>
              <a className="btn ink" href={waLink(itineraryText(plan, group?.title))} target="_blank" rel="noreferrer"><Share2 size={16} /> Kirim itinerary ke grup WA</a>
              <div className="grid2">
                <a className="btn ghost" href={gmapsDirections(plan)} target="_blank" rel="noreferrer"><Navigation size={16} /> Google Maps</a>
                <button className="btn ghost" onClick={async () => { const r = await shareOrCopy(plan.name, itineraryText(plan, group?.title)); if (r === 'copied') toast('📋 Itinerary disalin') }}><ExternalLink size={16} /> Salin</button>
              </div>
              {!group && <button className="btn accent" onClick={() => { save(); setCreate(true) }}><Users size={16} /> Jadikan gowes bareng</button>}
              {group && <button className="btn ghost" onClick={() => { save(); go('squad/' + group.id) }}>Selesai</button>}
            </div>
          </div>
        </div>
      </div>

      <CoffeeSheet cp={cbCp} onClose={() => setCbFor(null)} onPick={(pl, cat) => {
        if (!cbCp) return
        updCp(cbCp.id, { pos: pl.pos, name: pl.name, kind: CAT_TO_KIND[cat], stopMin: CP_KIND[CAT_TO_KIND[cat]].stop, place: { name: pl.name, kind: pl.kind, pos: pl.pos, hours: pl.hours, extra: pl.extra } })
        setCbFor(null)
        toast(`${CP_KIND[CAT_TO_KIND[cat]].emoji} ${pl.name}`, 'Checkpoint dipindah ke tempat ini · rute dihitung ulang')
      }} />
      <SplitSheet cp={split} onClose={() => setSplit(null)} people={group ? 1 + group.participants.filter((p) => p.rsvp === 'ikut').length : 4} groupTitle={group?.title ?? plan.name} />
      {create && <CreateRide open={create} onClose={() => setCreate(false)} preset={{ title: plan.name, meet: plan.start, datetime: plan.startTime, distanceKm: Math.round(tl.totalKm), route: plan.checkpoints.map((c) => c.place?.name ?? c.name).join(' – '), plan, participants: friends.slice(0, 0).map((f) => ({ friendId: f.id, rsvp: 'menunggu' as const })) } as Partial<GroupRide>} />}
    </div>
  )
}

function TlNode({ n, tone, time, title, sub }: { n: string; tone: 'start' | 'finish'; time: string; title: string; sub: string }) {
  return (
    <div className="tl-row" style={{ padding: '4px 0' }}>
      <div className={`tl-dot ${tone}`}><b>{n}</b></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row between"><span className="b" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span><span className="dot" style={{ fontSize: 18 }}>{time}</span></div>
        <div className="tiny muted">{sub}</div>
      </div>
    </div>
  )
}

function CoffeeSheet({ cp, onClose, onPick }: { cp: Checkpoint | null; onClose: () => void; onPick: (p: Place, c: PlaceCat) => void }) {
  const [cat, setCat] = useState<PlaceCat>('kopi')
  const [list, setList] = useState<Place[] | null>(null)
  const [err, setErr] = useState(false)
  const [radius, setRadius] = useState(900)
  useEffect(() => { if (cp) setCat(CP_KIND[cp.kind].cat === 'kumpul' ? 'kopi' : CP_KIND[cp.kind].cat) }, [cp?.id])
  useEffect(() => {
    if (!cp) return
    let alive = true
    setList(null); setErr(false)
    nearbyPlaces(cp.pos, cat, radius).then((r) => alive && setList(r)).catch(() => { if (alive) { setErr(false); setList([]) } })
    return () => { alive = false }
  }, [cp?.id, cat, radius])
  if (!cp) return null
  const q = { kopi: 'kopi', makan: 'tempat makan', minimarket: 'minimarket', masjid: 'masjid', bengkel: 'bengkel sepeda', air: 'toilet umum', kumpul: 'kafe' }[cat]
  return (
    <Sheet open={!!cp} onClose={onClose} title={<span>☕ Coffee break<span className="muted" style={{ fontWeight: 400, fontSize: 15 }}> · dekat {cp.name}</span></span>}>
      <div className="stack">
        <div className="chips">{CAT_TABS.map((t) => <button key={t.c} className={`chip ${cat === t.c ? 'on' : ''}`} style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }} onClick={() => setCat(t.c)}>{t.icon}{t.l}</button>)}</div>
        <BaseMap center={cp.pos} zoom={15} className="map" fit={list?.length ? [cp.pos, ...list.slice(0, 6).map((p) => p.pos)] : undefined}>
          <MeetPin pos={cp.pos} label="CP" />
          {list?.map((p, i) => <SmallPin key={p.id} pos={p.pos} color={i === 0 ? '#ff4d1f' : '#111'} onClick={() => onPick(p, cat)} />)}
        </BaseMap>
        {!list && <div className="row" style={{ justifyContent: 'center', padding: 16, gap: 8 }}><Loader2 size={16} className="spin" /> Mencari {q} dalam {radius} m…</div>}
        {list && list.length === 0 && (
          <div className="card flat small">
            {err ? 'Data tempat belum bisa dimuat sekarang.' : `Belum ada ${q} terdata dalam ${radius} m.`}{' '}
            {radius < 2000 && <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setRadius(2000)}>Perluas ke 2 km</button>}
          </div>
        )}
        {list && list.length > 0 && (
          <div className="list">
            {list.map((p, i) => (
              <button key={p.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', width: '100%', textAlign: 'left' }} onClick={() => onPick(p, cat)}>
                <div className="ico" style={i === 0 ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--sunken)' }}>{CAT_TABS.find((t) => t.c === cat)?.icon}</div>
                <div className="grow">
                  <div className="t">{p.name}{i === 0 && <span className="tag accent" style={{ marginLeft: 6 }}>Terbaik</span>}</div>
                  <div className="tiny muted">{p.kind}{p.extra ? ` · ${p.extra}` : ''} · {Math.round(p.dist * 1000)} m{p.hours ? ` · 🕐 ${p.hours}` : ''}</div>
                  <div className="tiny" style={{ color: 'var(--ink-2)' }}>{p.why}</div>
                </div>
                <span className="btn sm ink">Pilih</span>
              </button>
            ))}
          </div>
        )}
        <a className="btn ghost" href={`https://www.google.com/maps/search/${encodeURIComponent(q)}/@${cp.pos[0]},${cp.pos[1]},16z`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Cari “{q}” di Google Maps (rating & foto)</a>
      </div>
    </Sheet>
  )
}

function SplitSheet({ cp, onClose, people, groupTitle }: { cp: Checkpoint | null; onClose: () => void; people: number; groupTitle: string }) {
  const [total, setTotal] = useState(180000)
  const [n, setN] = useState(people)
  const [tip, setTip] = useState(0)
  useEffect(() => setN(people), [people])
  if (!cp) return null
  const each = Math.ceil(((total * (1 + tip / 100)) / Math.max(1, n)) / 500) * 500
  const text = `☕ Patungan ${cp.place?.name ?? cp.name} (${groupTitle})\nTotal Rp${fmt(total)}${tip ? ` + tip ${tip}%` : ''} ÷ ${n} orang\n👉 *Rp${fmt(each)} per orang*`
  return (
    <Sheet open={!!cp} onClose={onClose} title="Patungan coffee break">
      <div className="stack">
        <div className="card lime" style={{ textAlign: 'center' }}>
          <div className="mono">Per orang</div>
          <div className="dot" style={{ fontSize: 52, marginTop: 6 }}>{fmt(each / 1000, each % 1000 ? 1 : 0)}<span className="unit" style={{ fontFamily: 'var(--f-ui)' }}>rb</span></div>
          <div className="small">{cp.place?.name ?? cp.name}</div>
        </div>
        <label className="field"><span className="mono">Total tagihan (Rp)</span><input className="input" type="number" inputMode="numeric" value={total} onChange={(e) => setTotal(+e.target.value || 0)} /></label>
        <div className="row between"><span className="mono">Jumlah orang</span><div className="row" style={{ gap: 8 }}><button className="iconbtn" onClick={() => setN(Math.max(1, n - 1))}>−</button><span className="dot" style={{ fontSize: 26, minWidth: 30, textAlign: 'center' }}>{n}</span><button className="iconbtn" onClick={() => setN(n + 1)}>+</button></div></div>
        <div className="row" style={{ gap: 6 }}><span className="mono" style={{ marginRight: 4 }}>Tip</span>{[0, 5, 10].map((t) => <button key={t} className={`chip ${tip === t ? 'on' : ''}`} onClick={() => setTip(t)}>{t}%</button>)}</div>
        <a className="btn ink" href={waLink(text)} target="_blank" rel="noreferrer"><Share2 size={16} /> Kirim tagihan ke grup</a>
      </div>
    </Sheet>
  )
}

/** Daftar rute tersimpan. */
export function RouteList() {
  const { routes, deleteRoute, settings, upsertRoute } = useStore()
  return (
    <div className="fadein">
      <Top title="Rute saya" sub="Checkpoint & coffee break" back right={<button className="btn ink sm" onClick={() => { const p = defaultPlan({ name: settings.homeLabel, pos: settings.home }); upsertRoute(p); go('rute/' + p.id) }}><Plus size={15} /> Baru</button>} />
      <div className="stack">
        {routes.length === 0 && (
          <div className="card ink" style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 44 }}>☕🚲</div>
            <div className="display" style={{ fontSize: 26, marginTop: 8 }}>Rencanakan coffee ride pertamamu</div>
            <div className="small" style={{ opacity: 0.7, marginTop: 6 }}>Tambah checkpoint sebanyak apa pun, temukan kafe & tempat makan terdekat, dan bagikan itinerary ke squad.</div>
            <button className="btn accent" style={{ marginTop: 16 }} onClick={() => { const p = defaultPlan({ name: settings.homeLabel, pos: settings.home }); upsertRoute(p); go('rute/' + p.id) }}><Plus size={16} /> Buat rute</button>
          </div>
        )}
        {routes.map((r) => {
          const tl = timeline(r)
          return (
            <div key={r.id} className="card click" onClick={() => go('rute/' + r.id)}>
              <div className="row between">
                <div style={{ minWidth: 0 }}>
                  <div className="display" style={{ fontSize: 22 }}>{r.name}</div>
                  <div className="tiny muted">{r.start.name} · {fmtDate(r.startTime, true)}</div>
                </div>
                <div style={{ textAlign: 'right' }}><div className="dot" style={{ fontSize: 30 }}>{tl.totalKm.toFixed(0)}</div><div className="mono">km</div></div>
              </div>
              <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
                {r.checkpoints.map((c, i) => <span key={c.id} className="tag">{CP_KIND[c.kind].emoji} {i + 1}. {c.place?.name ?? c.name}</span>)}
                {r.checkpoints.length === 0 && <span className="tag">Belum ada checkpoint</span>}
              </div>
              <div className="row between" style={{ marginTop: 12 }}>
                <span className="mono">{r.checkpoints.length} checkpoint · rehat {tl.stopMin} mnt · finish {hhmm(tl.finish)}</span>
                <button className="iconbtn" style={{ width: 32, height: 32 }} aria-label="Hapus rute" onClick={async (e) => { e.stopPropagation(); if (await confirmDialog(`Hapus “${r.name}”?`, { ok: 'Hapus', danger: true })) { deleteRoute(r.id); toast('🗑️ Rute dihapus') } }}><Trash2 size={14} /></button>
              </div>
            </div>
          )
        })}
        <div className="card flat small"><Bed size={14} style={{ verticalAlign: -2 }} /> Tips: coffee break ideal setiap 25–40 km atau 75–90 menit, rehat 15–20 menit supaya otot tidak dingin.</div>
        <div className="card flat small"><Camera size={14} style={{ verticalAlign: -2 }} /> Rute juga bisa dibuat langsung dari jadwal gowes bareng: buka jadwal → “Atur rute & checkpoint”.</div>
      </div>
    </div>
  )
}
