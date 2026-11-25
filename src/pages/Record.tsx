import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Square, ShieldAlert, Volume2, Droplets, Activity, Share2, Lock, FlaskConical } from 'lucide-react'
import { useStore } from '../lib/store'
import type { LatLng, Ride, RoutePlan } from '../lib/types'
import { CP_KIND } from '../lib/plan'
import { haversine } from '../lib/geo'
import { calories } from '../lib/analytics'
import { fmtClock, uid } from '../lib/util'
import { BaseMap, Follow, LivePin, Route, SmallPin } from '../components/Map'
import { Sheet, Toggle, toast, Top, Avatar } from '../components/UI'
import { notify, speak } from '../lib/notify'
import { waLink } from '../lib/share'
import { makeLoop } from '../lib/seed'
import { go } from '../lib/router'
import { FeelCheck } from '../components/FeelCheck'

type Phase = 'idle' | 'rec' | 'pause'
interface Pt { p: LatLng; t: number; alt: number | null; spd: number | null }

export default function Record() {
  const { settings, addRide, bikes, activeBikeId, friends, setRideFeel, routes, groupRides } = useStore()
  const plans = [...routes, ...groupRides.filter((g) => g.plan && new Date(g.datetime).getTime() > Date.now() - 12 * 3600000).map((g) => ({ ...g.plan!, name: g.title }))]
  const [follow, setFollow] = useState<RoutePlan | null>(null)
  const [reached, setReached] = useState<string[]>([])
  const [feelFor, setFeelFor] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [pts, setPts] = useState<Pt[]>([])
  const [moving, setMoving] = useState(0)
  const [demo, setDemo] = useState(false)
  const [gpsErr, setGpsErr] = useState<string | null>(null)
  const [voice, setVoice] = useState(true)
  const [hydr, setHydr] = useState(true)
  const [crash, setCrash] = useState(true)
  const [sos, setSos] = useState<number | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [name, setName] = useState('')
  const [bikeId, setBikeId] = useState(activeBikeId)
  const [tagged, setTagged] = useState<string[]>([])
  const watchId = useRef<number | null>(null)
  const demoTimer = useRef<number | null>(null)
  const lastKm = useRef(0)
  const lastDrink = useRef(0)
  const lastFuel = useRef(0)
  const wake = useRef<any>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  // ---- metrik turunan
  const stats = useMemo(() => {
    let dist = 0, gain = 0, maxSpd = 0
    for (let i = 1; i < pts.length; i++) {
      dist += haversine(pts[i - 1].p, pts[i].p)
      const a0 = pts[i - 1].alt, a1 = pts[i].alt
      if (a0 != null && a1 != null && a1 - a0 > 0.5) gain += a1 - a0
    }
    const last = pts[pts.length - 1]
    let cur = 0
    if (last?.spd != null) cur = last.spd * 3.6
    else if (pts.length > 3) {
      const a = pts[pts.length - 4]
      const dt = (last.t - a.t) / 3600000
      cur = dt > 0 ? haversine(a.p, last.p) / dt : 0
    }
    for (let i = 4; i < pts.length; i += 2) {
      const dt = (pts[i].t - pts[i - 4].t) / 3600000
      if (dt > 0) maxSpd = Math.max(maxSpd, haversine(pts[i - 4].p, pts[i].p) / dt)
    }
    const avg = moving > 0 ? dist / (moving / 3600) : 0
    return { dist, gain, cur: Math.min(cur, 90), avg, max: Math.min(maxSpd, 90) }
  }, [pts, moving])

  // ---- jam moving time
  useEffect(() => {
    if (phase !== 'rec') return
    const t = window.setInterval(() => setMoving((m) => m + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  // ---- pelatih suara & pengingat minum
  useEffect(() => {
    if (phase !== 'rec') return
    const km = Math.floor(stats.dist)
    if (voice && km > lastKm.current && km > 0) {
      lastKm.current = km
      speak(`Kilometer ${km}. Kecepatan rata-rata ${stats.avg.toFixed(0)} kilometer per jam.`)
    }
    const interval = 20 * 60
    if (hydr && moving - lastDrink.current >= interval) {
      lastDrink.current = moving
      toast('💧 Waktunya minum 2–3 teguk')
      notify('Waktunya minum', 'Minum 150–250 ml supaya performa tetap stabil.')
      if (voice) speak('Waktunya minum.')
    }
    if (hydr && moving - lastFuel.current >= 45 * 60) {
      lastFuel.current = moving
      toast('🍌 Makan sedikit: pisang / gel / kurma')
      if (voice) speak('Waktunya makan sedikit. Pisang atau gel energi.')
    }
  }, [stats.dist, moving, voice, hydr, phase, stats.avg])

  // ---- checkpoint terdekat dari rute yang diikuti
  const lastP = pts[pts.length - 1]?.p
  const nextCp = follow?.checkpoints.find((c) => !reached.includes(c.id))
  const nextDist = nextCp && lastP ? haversine(lastP, nextCp.place?.pos ?? nextCp.pos) : null
  useEffect(() => {
    if (!nextCp || nextDist == null || phase !== 'rec') return
    if (nextDist < 0.15) {
      setReached((r) => [...r, nextCp.id])
      const msg = `Sampai di ${nextCp.place?.name ?? nextCp.name}. Waktunya ${CP_KIND[nextCp.kind].l.toLowerCase()} ${nextCp.stopMin} menit.`
      toast(`${CP_KIND[nextCp.kind].emoji} Checkpoint tercapai`, msg)
      notify('Checkpoint tercapai', msg)
      if (voice) speak(msg)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextDist])

  // ---- deteksi jatuh (akselerometer)
  useEffect(() => {
    if (!crash || phase === 'idle') return
    const on = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a || a.x == null || a.y == null || a.z == null) return
      const g = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
      if (g > 34 && sos == null) setSos(30)
    }
    window.addEventListener('devicemotion', on)
    return () => window.removeEventListener('devicemotion', on)
  }, [crash, phase, sos])

  useEffect(() => {
    if (sos == null) return
    if (sos === 30) { navigator.vibrate?.([400, 200, 400, 200, 400]); if (voice) speak('Terdeteksi benturan keras. Apakah kamu baik-baik saja?') }
    if (sos <= 0) { sendSOS(); return }
    const t = window.setTimeout(() => setSos((s) => (s == null ? s : s - 1)), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sos])

  const lastPos = pts[pts.length - 1]?.p ?? null

  function sosText() {
    const p = lastPos ?? settings.home
    return `🚨 SOS dari ${settings.name} (Kayuh). Kemungkinan jatuh saat bersepeda. Lokasi terakhir: https://maps.google.com/?q=${p[0].toFixed(5)},${p[1].toFixed(5)} — tolong segera hubungi/datangi.`
  }
  function sendSOS() {
    window.open(waLink(sosText(), settings.emergencyPhone || undefined), '_blank')
  }
  function shareLive() {
    const p = lastPos ?? settings.home
    const text = `📍 Aku lagi gowes. Posisi saat ini: https://maps.google.com/?q=${p[0].toFixed(5)},${p[1].toFixed(5)} · ${stats.dist.toFixed(1)} km sudah ditempuh.`
    window.open(waLink(text, settings.emergencyPhone || undefined), '_blank')
  }

  // ---- GPS
  function startGps() {
    if (!('geolocation' in navigator)) { setGpsErr('Perangkat tidak mendukung GPS.'); return false }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (phaseRef.current !== 'rec') return
        const p: LatLng = [pos.coords.latitude, pos.coords.longitude]
        if (pos.coords.accuracy > 40) return
        setPts((arr) => {
          const last = arr[arr.length - 1]
          if (last && haversine(last.p, p) < 0.004) return arr // abaikan jitter <4 m
          return [...arr, { p, t: pos.timestamp, alt: pos.coords.altitude, spd: pos.coords.speed }]
        })
      },
      (err) => { setGpsErr(err.code === 1 ? 'Izin lokasi ditolak.' : 'Sinyal GPS tidak tersedia.') },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    )
    return true
  }

  function startDemo() {
    setDemo(true)
    const loop = makeLoop(settings.home, 18, Math.random, 900)
    let i = 0
    let alt = 12
    demoTimer.current = window.setInterval(() => {
      if (phaseRef.current !== 'rec') return
      i = Math.min(loop.length - 1, i + 1)
      alt += Math.sin(i / 40) * 0.8
      setPts((arr) => [...arr, { p: loop[i], t: Date.now(), alt, spd: null }])
    }, 600)
    // percepat waktu supaya data demo terasa realistis (~26 km/j)
  }

  async function start(useDemo = false) {
    setPts([]); setMoving(0); lastKm.current = 0; lastDrink.current = 0; lastFuel.current = 0
    setPhase('rec')
    try { wake.current = await (navigator as any).wakeLock?.request('screen') } catch { /* opsional */ }
    try { const DM = (window as any).DeviceMotionEvent; if (crash && DM?.requestPermission) await DM.requestPermission() } catch { /* iOS */ }
    if (useDemo) startDemo()
    else if (!startGps()) startDemo()
    if (voice) speak('Rekaman dimulai. Selamat gowes!')
  }

  function stopAll() {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    if (demoTimer.current != null) clearInterval(demoTimer.current)
    watchId.current = null; demoTimer.current = null
    try { wake.current?.release() } catch { /* */ }
  }
  useEffect(() => stopAll, [])

  function finish() {
    setPhase('pause')
    const h = new Date().getHours()
    setName(h < 11 ? 'Gowes pagi' : h < 15 ? 'Gowes siang' : h < 18 ? 'Gowes sore' : 'Gowes malam')
    setSaveOpen(true)
  }

  function save() {
    stopAll()
    const track = pts.map((x) => x.p)
    const dist = demo ? stats.dist * 1 : stats.dist
    const movingSec = demo ? Math.round((dist / 26) * 3600) : moving
    const avg = movingSec > 0 ? dist / (movingSec / 3600) : 0
    const r: Ride = {
      id: uid(), name: name || 'Gowes', date: new Date(Date.now() - movingSec * 1000).toISOString(), type: 'road',
      distanceKm: +dist.toFixed(2), movingSec, elevationM: Math.round(stats.gain), avgSpeed: +avg.toFixed(1), maxSpeed: +(Math.max(stats.max, avg * 1.4)).toFixed(1),
      calories: calories(avg, movingSec, settings.weightKg, stats.gain), track: track.filter((_, i) => i % Math.max(1, Math.floor(track.length / 400)) === 0),
      elevations: pts.filter((_, i) => i % Math.max(1, Math.floor(pts.length / 120)) === 0).map((x) => Math.round(x.alt ?? 10)),
      bikeId, friendIds: tagged,
    }
    if (r.distanceKm < 0.05) { toast('Ride terlalu pendek', 'Minimal 50 m — lanjutkan dulu atau buang'); return }
    addRide(r)
    setSaveOpen(false); setPhase('idle'); setPts([])
    toast('🎉 Ride tersimpan', `+${Math.round(r.distanceKm * 10 + r.elevationM)} XP untuk karaktermu`)
    setFeelFor(r.id)
  }

  function discard() {
    stopAll(); setSaveOpen(false); setPhase('idle'); setPts([]); setMoving(0)
  }

  const shownTime = demo ? Math.round((stats.dist / 26) * 3600) : moving
  const shownAvg = demo ? (stats.dist > 0 ? 26 : 0) : stats.avg
  const shownSpeed = demo ? (phase === 'rec' ? 24 + Math.sin(pts.length / 9) * 5 : 0) : stats.cur

  return (
    <div className="fadein">
      <Top title={phase === 'idle' ? 'Rekam ride' : phase === 'rec' ? 'Merekam…' : 'Dijeda'} sub={demo ? 'Mode demo · rute simulasi' : 'GPS · layar tetap menyala'}
        right={phase !== 'idle' ? <span className="tag accent">● REC</span> : undefined} />

      <div className="row-d">
        <div className="stack">
          <div style={{ position: 'relative' }}>
            <BaseMap center={lastPos ?? settings.home} zoom={15} className="map tall">
              {follow && <Route track={follow.geometry ?? [follow.start.pos, ...follow.checkpoints.map((c) => c.pos), (follow.finish ?? follow.start).pos]} color="#888" weight={4} dash="6 8" />}
              {follow?.checkpoints.map((c) => <SmallPin key={c.id} pos={c.place?.pos ?? c.pos} color={reached.includes(c.id) ? '#1f9d6a' : '#d2441c'} />)}
              {pts.length > 1 && <Route track={pts.map((x) => x.p)} />}
              {lastPos && <><LivePin pos={lastPos} /><Follow pos={lastPos} /></>}
            </BaseMap>
            {phase !== 'idle' && (
              <div className="card ink" style={{ position: 'absolute', left: 12, top: 12, padding: '10px 14px', zIndex: 500, borderRadius: 18 }}>
                <div className="mono">Kecepatan</div>
                <div className="dot" style={{ fontSize: 44 }}>{shownSpeed.toFixed(0)}<span className="unit" style={{ fontFamily: 'var(--f-ui)' }}>km/j</span></div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="grid2">
              <div><div className="mono">Waktu bergerak</div><div className="dot" style={{ fontSize: 40, marginTop: 6 }}>{fmtClock(shownTime)}</div></div>
              <div><div className="mono">Jarak</div><div className="dot" style={{ fontSize: 40, marginTop: 6 }}>{stats.dist.toFixed(2)}<span className="unit" style={{ fontFamily: 'var(--f-ui)' }}>km</span></div></div>
            </div>
            <div className="divider" />
            <div className="grid3">
              <div><div className="mono">Rata-rata</div><div className="num" style={{ fontSize: 22, marginTop: 4 }}>{shownAvg.toFixed(1)}</div></div>
              <div><div className="mono">Tanjakan</div><div className="num" style={{ fontSize: 22, marginTop: 4 }}>{Math.round(stats.gain)}<span className="unit">m</span></div></div>
              <div><div className="mono">Kalori</div><div className="num" style={{ fontSize: 22, marginTop: 4 }}>{calories(shownAvg, shownTime, settings.weightKg, stats.gain)}</div></div>
            </div>
          </div>

          {nextCp && phase !== 'idle' && (
            <div className="card" style={{ background: '#6b3f1f', color: '#fff' }}>
              <div className="row between">
                <div><div className="mono" style={{ color: 'rgba(255,255,255,.7)' }}>Checkpoint berikutnya</div><div style={{ fontWeight: 600, fontSize: 18 }}>{CP_KIND[nextCp.kind].emoji} {nextCp.place?.name ?? nextCp.name}</div><div className="tiny" style={{ opacity: 0.75 }}>{CP_KIND[nextCp.kind].l} · rehat {nextCp.stopMin} mnt</div></div>
                <div style={{ textAlign: 'right' }}><div className="dot" style={{ fontSize: 34 }}>{nextDist != null ? nextDist.toFixed(1) : '–'}</div><div className="mono" style={{ color: 'rgba(255,255,255,.7)' }}>km lagi</div></div>
              </div>
            </div>
          )}
          {phase === 'idle' && plans.length > 0 && (
            <div className="card">
              <div className="mono" style={{ marginBottom: 8 }}>Ikuti rute dengan checkpoint (opsional)</div>
              <div className="chips">
                <button className={`chip ${!follow ? 'on' : ''}`} onClick={() => setFollow(null)}>Bebas</button>
                {plans.map((p) => <button key={p.id} className={`chip ${follow?.id === p.id ? 'on' : ''}`} onClick={() => { setFollow(p); setReached([]) }}>☕ {p.name} · {p.checkpoints.length} CP</button>)}
              </div>
            </div>
          )}
          {gpsErr && <div className="card flat small"><b>GPS:</b> {gpsErr} Beralih ke mode demo agar kamu tetap bisa mencoba.</div>}

          <div className="row" style={{ justifyContent: 'center', gap: 14, marginTop: 4 }}>
            {phase === 'idle' && (
              <>
                <button className="btn accent" style={{ padding: '18px 34px', fontSize: 16 }} onClick={() => start(false)}><Play size={18} /> Mulai</button>
                <button className="btn ghost" onClick={() => start(true)}><FlaskConical size={16} /> Coba demo</button>
              </>
            )}
            {phase === 'rec' && (
              <>
                <button className="btn ink circle" style={{ width: 64, height: 64 }} aria-label="Jeda" onClick={() => setPhase('pause')}><Pause size={22} /></button>
                <button className="btn accent circle" style={{ width: 64, height: 64 }} aria-label="Selesai" onClick={finish}><Square size={20} /></button>
              </>
            )}
            {phase === 'pause' && !saveOpen && (
              <>
                <button className="btn ink" onClick={() => setPhase('rec')}><Play size={16} /> Lanjut</button>
                <button className="btn accent" onClick={finish}><Square size={16} /> Selesai</button>
              </>
            )}
          </div>
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          <div className="section-h hide-d" style={{ marginTop: 18 }}><h3>Pendamping ride</h3></div>
          <div className="card">
            <div className="list">
              <div className="li"><div className="ico"><Volume2 size={16} /></div><div className="grow"><div className="b">Pelatih suara</div><div className="tiny muted">Info tiap kilometer dalam Bahasa Indonesia</div></div><Toggle on={voice} onChange={setVoice} label="Pelatih suara" /></div>
              <div className="li"><div className="ico"><Droplets size={16} /></div><div className="grow"><div className="b">Pengingat minum & makan</div><div className="tiny muted">Minum tiap 20 menit, makan tiap 45 menit</div></div><Toggle on={hydr} onChange={setHydr} label="Pengingat minum" /></div>
              <div className="li"><div className="ico"><Activity size={16} /></div><div className="grow"><div className="b">Deteksi jatuh</div><div className="tiny muted">Benturan keras → hitung mundur 30 dtk → kirim SOS</div></div><Toggle on={crash} onChange={setCrash} label="Deteksi jatuh" /></div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><span className="mono">Keamanan</span><Lock size={15} /></div>
            <div className="small ink2" style={{ marginBottom: 12 }}>
              Kontak darurat: <b>{settings.emergencyName || 'belum diatur'}</b>{settings.emergencyPhone ? ` · ${settings.emergencyPhone}` : ''}.{' '}
              {!settings.emergencyPhone && <a href="#/profile">Atur sekarang</a>}
            </div>
            <div className="grid2">
              <button className="btn ghost" onClick={shareLive}><Share2 size={16} /> Bagikan lokasi</button>
              <button className="btn accent" onClick={() => setSos(30)}><ShieldAlert size={16} /> SOS</button>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={saveOpen} onClose={() => setSaveOpen(false)} title="Simpan ride">
        <div className="stack">
          <div className="grid3 card sunk">
            <div><div className="mono">Jarak</div><div className="num" style={{ fontSize: 22 }}>{stats.dist.toFixed(2)}</div></div>
            <div><div className="mono">Waktu</div><div className="num" style={{ fontSize: 22 }}>{fmtClock(shownTime)}</div></div>
            <div><div className="mono">Rata²</div><div className="num" style={{ fontSize: 22 }}>{shownAvg.toFixed(1)}</div></div>
          </div>
          <label className="field"><span className="mono">Nama ride</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className="field"><span className="mono">Sepeda</span>
            <div className="chips">{bikes.map((b) => <button key={b.id} className={`chip ${bikeId === b.id ? 'on' : ''}`} onClick={() => setBikeId(b.id)}>{b.name}</button>)}</div>
          </div>
          <div className="field"><span className="mono">Gowes bareng siapa?</span>
            <div className="chips">{friends.map((f) => (
              <button key={f.id} className={`chip ${tagged.includes(f.id) ? 'on' : ''}`} onClick={() => setTagged((t) => (t.includes(f.id) ? t.filter((x) => x !== f.id) : [...t, f.id]))} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Avatar name={f.name} color={f.color} c={f.char} size={22} />{f.name.split(' ')[0]}
              </button>
            ))}</div>
          </div>
          <div className="grid2" style={{ marginTop: 6 }}>
            <button className="btn ghost" onClick={discard}>Buang</button>
            <button className="btn ink" onClick={save}>Simpan</button>
          </div>
        </div>
      </Sheet>

      <FeelCheck open={!!feelFor} onClose={() => { const id = feelFor; setFeelFor(null); if (id) go('ride/' + id) }} onSave={(f, rpe) => { const id = feelFor!; setRideFeel(id, f, rpe); setFeelFor(null); go('ride/' + id) }} />

      {sos != null && (
        <div className="sos" role="alertdialog">
          <ShieldAlert size={48} />
          <div className="mono" style={{ color: '#fff' }}>Benturan terdeteksi</div>
          <div className="dot" style={{ fontSize: 120 }}>{sos}</div>
          <div style={{ maxWidth: 320 }}>Kamu baik-baik saja? Jika tidak ada respons, pesan SOS + lokasi akan disiapkan untuk {settings.emergencyName || 'kontak darurat'}.</div>
          <button className="btn" style={{ background: '#fff', color: '#111', padding: '18px 30px', fontSize: 17 }} onClick={() => setSos(null)}>Saya baik-baik saja</button>
          <button className="btn ink" onClick={() => { setSos(null); sendSOS() }}>Kirim SOS sekarang</button>
        </div>
      )}
    </div>
  )
}
