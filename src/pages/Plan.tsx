import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, SkipBack, Wand2, Flag, Volume2, VolumeX } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Workout } from '../lib/types'
import { project, readiness, trainingLoad, WORKOUTS } from '../lib/analytics'
import { HARI, fmtDate, clamp } from '../lib/util'
import { LineChart } from '../charts/Charts'
import { DetentSlider } from '../components/Character'
import { Tabs, toast, Top } from '../components/UI'

const LANES: Workout[] = ['rec', 'end', 'tempo', 'int', 'long']
const NOTE: Record<Workout, number> = { rec: 329.6, end: 392, tempo: 440, int: 523.3, long: 261.6 }
const PROFILE: Record<Workout, number[]> = {
  rec: Array.from({ length: 40 }, (_, i) => 0.25 + Math.sin(i / 3) * 0.04),
  end: Array.from({ length: 40 }, (_, i) => (i < 4 ? 0.3 + i * 0.05 : i > 36 ? 0.3 : 0.5 + Math.sin(i / 2.5) * 0.05)),
  tempo: Array.from({ length: 40 }, (_, i) => (i < 5 ? 0.35 : i > 35 ? 0.35 : 0.68 + Math.sin(i) * 0.04)),
  int: Array.from({ length: 40 }, (_, i) => (i < 5 || i > 35 ? 0.35 : Math.floor((i - 5) / 3) % 2 === 0 ? 0.95 : 0.35)),
  long: Array.from({ length: 40 }, (_, i) => 0.45 + Math.sin(i / 4) * 0.15 + (i > 18 && i < 24 ? 0.25 : 0)),
}

let ctx: AudioContext | null = null
function blip(freq: number, dur = 0.14, vol = 0.18, type: OscillatorType = 'triangle') {
  try {
    ctx ??= new AudioContext()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = type; o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur + 0.02)
  } catch { /* tanpa audio */ }
}

/* ---------- Kenop putar ala "drive mode" ---------- */
function Knob({ value, min, max, step = 1, label, onChange, fmtV }: { value: number; min: number; max: number; step?: number; label: string; onChange: (v: number) => void; fmtV?: (v: number) => string }) {
  const frac = (value - min) / (max - min)
  const ang = -135 + frac * 270
  const start = useRef<{ y: number; v: number } | null>(null)
  const set = (v: number) => onChange(clamp(Math.round(v / step) * step, min, max))
  const rad = ((ang - 90) * Math.PI) / 180
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="-60 -60 120 120" width="100%" style={{ maxWidth: 150 }} className="knob" role="slider" aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') set(value + step); if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') set(value - step) }}
        onPointerDown={(e) => { (e.currentTarget as Element).setPointerCapture(e.pointerId); start.current = { y: e.clientY, v: value } }}
        onPointerMove={(e) => { if (!start.current) return; set(start.current.v + ((start.current.y - e.clientY) / 120) * (max - min)) }}
        onPointerUp={() => (start.current = null)}
        onWheel={(e) => set(value + (e.deltaY < 0 ? step : -step))}>
        {Array.from({ length: 11 }, (_, i) => { const a = ((-135 + i * 27 - 90) * Math.PI) / 180; return <circle key={i} cx={Math.cos(a) * 56} cy={Math.sin(a) * 56} r={1.6} fill="var(--muted)" /> })}
        <circle r={46} fill="#111" />
        <line x1={0} y1={0} x2={Math.cos(rad) * 26} y2={Math.sin(rad) * 26} stroke="#d6f06a" strokeWidth={2} strokeLinecap="round" opacity={0.85} />
        <circle cx={Math.cos(rad) * 34} cy={Math.sin(rad) * 34} r={5} fill="#fff" />
      </svg>
      <div className="mono" style={{ marginTop: 4 }}>{label}:{fmtV ? fmtV(value) : value}</div>
    </div>
  )
}

export default function Plan() {
  const { plan, setPlan, rides, settings, event, setEvent } = useStore()
  const [week, setWeek] = useState<'0' | '1'>('0')
  const [lane, setLane] = useState<Workout>('end')
  const [playing, setPlaying] = useState(false)
  const [head, setHead] = useState(-1)
  const [sound, setSound] = useState(true)
  const [history, setHistory] = useState<(Workout | null)[][]>([])
  const [vol, setVol] = useState(7)
  const [inten, setInten] = useState(3)
  const [longs, setLongs] = useState(1)
  const [restDays, setRest] = useState(2)
  const [mode, setMode] = useState(0.5)

  const load = useMemo(() => trainingLoad(rides, settings, 42), [rides, settings])
  const todayIdx = (new Date().getDay() + 6) % 7 // Senin = 0
  // TSS yang direncanakan mulai BESOK (sisa hari minggu ini + minggu depan)
  const rest = plan.cells.slice(todayIdx + 1)
  const wk2 = plan.cells.slice(7, 14)
  // setelah 2 minggu, asumsikan pola minggu depan berulang supaya hari H tetap terproyeksi
  const ext = [...rest, ...wk2, ...wk2].slice(0, 24)
  const planned = ext.map((w) => (w ? WORKOUTS[w].tss : 0))
  const proj = useMemo(() => project(load, planned), [load, planned.join(',')])
  const all = [...load.slice(-28), ...proj]
  const labels = all.map((p) => { const d = new Date(p.day); return `${d.getDate()}/${d.getMonth() + 1}` })
  const evIdx = event ? all.findIndex((p) => p.day === new Date(event.date).toISOString().slice(0, 10)) : -1
  const evPoint = evIdx >= 0 ? all[evIdx] : null
  const evForm = evPoint ? evPoint.ctl - evPoint.atl : null

  const cells = plan.cells.slice(+week * 7, +week * 7 + 7)
  const weekTss = cells.reduce((a, w) => a + (w ? WORKOUTS[w].tss : 0), 0)
  const weekMin = cells.reduce((a, w) => a + (w ? WORKOUTS[w].min : 0), 0)
  const ctlNow = load[load.length - 1].ctl
  const ctlEnd = proj[Math.min(proj.length - 1, 7 - todayIdx + (week === '1' ? 7 : 0) - 1)]?.ctl ?? ctlNow
  const ramp = ctlEnd - ctlNow

  const toggle = (day: number, w: Workout) => {
    const idx = +week * 7 + day
    setHistory((h) => [...h.slice(-20), plan.cells])
    const next = [...plan.cells]
    next[idx] = next[idx] === w ? null : w
    setPlan({ cells: next })
    if (sound) blip(NOTE[w], w === 'long' ? 0.3 : 0.14)
  }

  // pemutaran sequencer
  useEffect(() => {
    if (!playing) return
    let i = head < 0 ? 0 : head
    const iv = window.setInterval(() => {
      setHead(i)
      const w = plan.cells[i]
      if (sound) { if (w) blip(NOTE[w], w === 'long' ? 0.32 : 0.15, 0.2); else blip(1400, 0.03, 0.05, 'square') }
      i++
      if (i >= 14) { setPlaying(false); window.setTimeout(() => setHead(-1), 500) }
    }, 380)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  const headDay = head >= 0 ? head : null
  const headProj = headDay != null && headDay > todayIdx ? proj[headDay - todayIdx - 1] : null
  const headReady = headProj ? readiness([headProj]).score : null

  function generate() {
    setHistory((h) => [...h.slice(-20), plan.cells])
    const out: (Workout | null)[] = []
    const taper = mode > 0.7
    for (let wk = 0; wk < 2; wk++) {
      const days: (Workout | null)[] = new Array(7).fill('end')
      const restOrder = [0, 4, 2]
      for (let r = 0; r < restDays; r++) days[restOrder[r]] = null
      const longOrder = [6, 5]
      for (let l = 0; l < longs; l++) days[longOrder[l]] = 'long'
      const hard = Math.round(inten / 2)
      const hardSlots = [1, 3].filter((d) => days[d] !== null)
      hardSlots.slice(0, hard).forEach((d, k) => (days[d] = k === 0 && inten >= 3 ? 'int' : 'tempo'))
      // hari setelah sesi berat → pemulihan
      for (let d = 1; d < 7; d++) if ((days[d - 1] === 'int' || days[d - 1] === 'long') && days[d] === 'end') days[d] = 'rec'
      // sesuaikan volume (menit)
      const target = vol * 60 * (taper && wk === 1 ? 0.6 : mode < 0.3 ? 0.9 : 1)
      const minutes = () => days.reduce((a, w) => a + (w ? WORKOUTS[w].min : 0), 0)
      let guard = 0
      while (minutes() > target + 30 && guard++ < 10) {
        const i = days.findIndex((w) => w === 'end'); if (i >= 0) { days[i] = 'rec'; continue }
        const j = days.findIndex((w) => w === 'rec'); if (j >= 0) { days[j] = null; continue }
        break
      }
      guard = 0
      while (minutes() < target - 45 && guard++ < 10) {
        const i = days.findIndex((w) => w === 'rec'); if (i >= 0) { days[i] = 'end'; continue }
        break
      }
      if (taper && wk === 1) for (let d = 0; d < 7; d++) if (days[d] === 'long') days[d] = 'end'
      out.push(...days)
    }
    setPlan({ cells: out })
    toast('🎛️ Rencana diracik', `${vol} jam/minggu · intensitas ${inten} · ${longs} long ride`)
    if (sound) [392, 494, 587].forEach((f, i) => window.setTimeout(() => blip(f, 0.12), i * 90))
  }

  const verdict = evForm == null ? null : evForm >= 5 && evForm <= 20 ? { t: 'Pas! Kamu akan segar & bertenaga di hari H.', c: 'good' } : evForm > 20 ? { t: 'Terlalu segar — fitness mulai turun. Tambah 1 sesi tempo.', c: 'warn' } : { t: 'Masih lelah di hari H. Kurangi volume 3–5 hari sebelumnya (taper).', c: 'bad' }

  return (
    <div className="fadein">
      <Top title="Rencana Latihan" sub="Sequencer · proyeksi" back />
      <div className="row-d">
        <div className="stack">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>{week === '0' ? 'Minggu ini' : 'Minggu depan'}</div>
              <div className="mono">{cells.filter(Boolean).length} ride · {Math.floor(weekMin / 60)}j {weekMin % 60}m · {weekTss} TSS</div>
            </div>
            <Tabs value={week} onChange={setWeek} options={[{ v: '0', l: 'Minggu ini' }, { v: '1', l: 'Minggu depan' }]} />
            <div className="seq" style={{ gridTemplateColumns: '64px repeat(7, 1fr)', marginTop: 16, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
              <span />
              {HARI.slice(1).concat(HARI[0]).map((h, d) => {
                const isToday = week === '0' && d === todayIdx
                return (
                  <div key={h} style={{ textAlign: 'center' }}>
                    <div style={{ height: 6, borderRadius: 9, background: isToday ? 'var(--accent)' : 'color-mix(in srgb, var(--ink) 12%, transparent)', marginBottom: 6 }} />
                    <div className="mono" style={{ fontSize: 9.5, color: isToday ? 'var(--ink)' : undefined, fontWeight: isToday ? 700 : undefined }}>{h}</div>
                  </div>
                )
              })}
              {LANES.map((w, li) => (
                <div key={w} style={{ display: 'contents' }}>
                  <button onClick={() => setLane(w)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 0, padding: 0 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, background: lane === w ? 'var(--accent)' : 'transparent', color: lane === w ? '#fff' : 'var(--ink-2)', border: lane === w ? 0 : '1px solid var(--line)' }}>{li + 1}</span>
                    <span className="mono" style={{ fontSize: 9 }}>{WORKOUTS[w].short}</span>
                  </button>
                  {cells.map((c, d) => {
                    const idx = +week * 7 + d
                    return <button key={d} aria-label={`${WORKOUTS[w].l} ${HARI[(d + 1) % 7]}`} className={`seq-cell ${c === w ? 'on' : ''} ${week === '0' && d === todayIdx ? 'today' : ''} ${head === idx ? 'play' : ''}`} onClick={() => toggle(d, w)} />
                  })}
                </div>
              ))}
            </div>

            <div className="row between" style={{ background: 'var(--surface-2)', borderRadius: 999, padding: '6px 8px', marginTop: 16 }}>
              <div className="row" style={{ gap: 4 }}>
                <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label="Batalkan" disabled={!history.length} onClick={() => { const h = history[history.length - 1]; if (h) { setPlan({ cells: h }); setHistory(history.slice(0, -1)) } }}><RotateCcw size={15} /></button>
                <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label="Suara" onClick={() => setSound(!sound)}>{sound ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className="dot" style={{ fontSize: 20 }}><span style={{ opacity: 0.6 }}>H</span>{headDay != null ? String(headDay + 1).padStart(2, '0') : '--'}<span style={{ opacity: 0.6 }}>/14</span></span>
                <div className="mono" style={{ fontSize: 9 }}>{headReady != null ? `kesiapan ${headReady}` : headDay != null ? 'sudah lewat' : 'putar minggumu'}</div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label="Ulang" onClick={() => { setHead(-1); setPlaying(false) }}><SkipBack size={15} /></button>
                <button className="iconbtn" style={{ width: 34, height: 34, background: 'var(--accent)', color: '#fff' }} aria-label={playing ? 'Jeda' : 'Putar'} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 14, borderRadius: 18, background: 'var(--surface-2)' }}>
              <div className="mono">Lane: {LANES.indexOf(lane) + 1} · properti</div>
              <div className="row between"><div style={{ fontWeight: 600 }}>{WORKOUTS[lane].l}</div><span className="mono">{WORKOUTS[lane].min} mnt · {WORKOUTS[lane].tss} TSS</span></div>
              <svg viewBox="0 0 200 40" width="100%" height={48} style={{ marginTop: 6 }} aria-hidden>
                <line x1={0} x2={200} y1={20} y2={20} stroke="var(--line)" strokeDasharray="2 3" />
                {PROFILE[lane].map((v, i) => <rect key={i} x={i * 5 + 1} y={20 - v * 18} width={2.4} height={v * 36} rx={1.2} fill="var(--accent)" />)}
                <line x1={1} x2={1} y1={2} y2={38} stroke="var(--ink)" strokeWidth={2} /><line x1={199} x2={199} y1={2} y2={38} stroke="var(--ink)" strokeWidth={2} />
              </svg>
              <div className="tiny muted">{WORKOUTS[lane].desc}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <div><div className="mono">Proyeksi {proj.length} hari</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Masa depan kebugaranmu</div></div>
              <span className={`tag ${ramp > 8 ? 'warn' : ramp > 0 ? 'good' : ''}`}>{ramp >= 0 ? '+' : ''}{ramp.toFixed(1)} fitness</span>
            </div>
            <div className="legend" style={{ marginBottom: 8 }}><span><i style={{ background: 'var(--ink)' }} />Fitness</span><span><i style={{ background: 'var(--accent)' }} />Form</span></div>
            <LineChart labels={labels} zero shadeFrom={28} markers={[{ i: 27, label: 'HARI INI' }, ...(evIdx >= 0 ? [{ i: evIdx, label: 'HARI H', color: 'var(--accent)' }] : [])]}
              series={[{ name: 'Fitness', color: 'var(--ink)', values: all.map((p) => p.ctl), width: 2.5 }, { name: 'Form', color: 'var(--accent)', values: all.map((p) => p.ctl - p.atl) }]} height={210} />
            <p className="tiny muted" style={{ marginTop: 8 }}>Area abu-abu = proyeksi dari rencanamu (setelah 2 minggu, pola minggu depan diasumsikan berulang). Kenaikan fitness ideal 3–7 poin/minggu; di atas 8 risiko cedera.</p>
          </div>
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          {event && (
            <div className={`card ${verdict?.c === 'good' ? 'lime' : 'ink'}`}>
              <div className="card-h"><span className="mono">Target · hari H</span><Flag size={16} /></div>
              <input aria-label="Nama event" className="input" style={{ background: 'transparent', border: 0, padding: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--f-display)' }} value={event.name} onChange={(e) => setEvent({ ...event, name: e.target.value })} />
              <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
                <input aria-label="Tanggal event" className="input" type="date" style={{ width: 'auto', padding: '8px 10px', background: 'rgba(127,127,127,.15)', border: 0, colorScheme: 'dark' }} value={event.date.slice(0, 10)} onChange={(e) => setEvent({ ...event, date: new Date(e.target.value + 'T06:00').toISOString() })} />
                <span className="small">{fmtDate(event.date)} · {event.km} km</span>
              </div>
              {evForm != null ? (
                <>
                  <div className="row" style={{ alignItems: 'flex-end', gap: 10, marginTop: 14 }}>
                    <span className="dot" style={{ fontSize: 56 }}>{evForm >= 0 ? '+' : ''}{Math.round(evForm)}</span>
                    <span className="mono" style={{ paddingBottom: 8 }}>form di hari H</span>
                  </div>
                  <div className="small" style={{ marginTop: 6 }}>{verdict?.t}</div>
                </>
              ) : <div className="small" style={{ marginTop: 10, opacity: 0.7 }}>Hari H di luar jangkauan proyeksi 14 hari. Rencana akan dihitung saat sudah dekat.</div>}
            </div>
          )}

          <div className="card">
            <div className="card-h"><span className="mono">Mode racik · putar kenopnya</span><Wand2 size={16} /></div>
            <div className="grid2" style={{ gap: 6 }}>
              <Knob label="VOL" value={vol} min={3} max={14} onChange={setVol} fmtV={(v) => `${v}j`} />
              <Knob label="INT" value={inten} min={1} max={5} onChange={setInten} />
              <Knob label="LNG" value={longs} min={0} max={2} onChange={setLongs} />
              <Knob label="REST" value={restDays} min={1} max={3} onChange={setRest} />
            </div>
            <div className="mono ink" style={{ margin: '16px 0 10px' }}>Fase latihan</div>
            <DetentSlider value={mode} onChange={setMode} labels={['Base', 'Build', 'Taper']} label="Fase latihan" />
            <button className="btn ink block" style={{ marginTop: 16 }} onClick={generate}><Wand2 size={16} /> Racik rencana 2 minggu</button>
            <p className="tiny muted" style={{ marginTop: 8 }}>Seret kenop ke atas/bawah. Racikan otomatis menaruh sesi berat setelah hari istirahat, pemulihan setelah sesi berat, dan memangkas volume saat taper.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
