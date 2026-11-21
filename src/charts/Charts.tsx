import { useState, type ReactNode } from 'react'
import { niceMax, useWidth } from './useWidth'

/* ---------- Bar chart: satu seri, bar terakhir/terpilih diberi aksen ---------- */
export function BarChart({ data, height = 170, unit = '', highlight, goal, fmtTip }: {
  data: { label: string; value: number; sub?: string }[]
  height?: number
  unit?: string
  highlight?: number
  goal?: number
  fmtTip?: (d: { label: string; value: number; sub?: string }) => ReactNode
}) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const padL = 30, padB = 20, padT = 10
  const max = niceMax(Math.max(goal ?? 0, ...data.map((d) => d.value)) * 1.05)
  const ih = height - padB - padT
  const band = (w - padL) / data.length
  const bw = Math.min(24, band * 0.62)
  const y = (v: number) => padT + ih - (v / max) * ih
  const ticks = [0, max / 2, max]
  const hl = highlight ?? data.length - 1
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg className="chart" width={w} height={height} role="img" aria-label="Grafik batang">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end">{Math.round(t)}</text>
          </g>
        ))}
        {goal != null && (
          <g>
            <line x1={padL} x2={w} y1={y(goal)} y2={y(goal)} stroke="var(--ink)" strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
            <text x={w} y={y(goal) - 4} textAnchor="end">TARGET {goal}</text>
          </g>
        )}
        {data.map((d, i) => {
          const x = padL + band * i + (band - bw) / 2
          const h = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * ih)
          const top = padT + ih - h
          const r = Math.min(4, h)
          const path = `M${x},${padT + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${padT + ih} Z`
          const isHl = i === hl
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={padL + band * i} y={padT} width={band} height={ih} fill="transparent" />
              <path d={path} fill={isHl ? 'var(--accent)' : 'var(--ink)'} opacity={hover == null || hover === i ? 1 : 0.35} />
              {((data.length - 1 - i) % Math.ceil(data.length / 6) === 0) && (
                <text x={x + bw / 2} y={height - 5} textAnchor="middle">{d.label}</text>
              )}
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="tip" style={{ left: padL + band * hover + band / 2, top: y(data[hover].value) }}>
          {fmtTip ? fmtTip(data[hover]) : (<><div className="mono">{data[hover].sub ?? data[hover].label}</div><b>{data[hover].value.toFixed(1)}</b> {unit}</>)}
        </div>
      )}
    </div>
  )
}

/* ---------- Line chart multi-seri (satu sumbu, satu satuan) ---------- */
export interface Series { name: string; color: string; values: number[]; dash?: string; width?: number }

export function LineChart({ series, labels, height = 200, zero = false, markers = [], shadeFrom }: { series: Series[]; labels: string[]; height?: number; zero?: boolean; markers?: { i: number; label: string; color?: string }[]; shadeFrom?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const padL = 30, padR = 64, padB = 20, padT = 10
  const all = series.flatMap((s) => s.values)
  const lo = zero ? Math.min(0, ...all) : Math.min(...all)
  const hiRaw = Math.max(...all)
  const hi = niceMax(hiRaw)
  const loN = lo < 0 ? -niceMax(-lo) : 0
  const n = labels.length
  const ih = height - padT - padB
  const x = (i: number) => padL + (i / (n - 1)) * (w - padL - padR)
  const y = (v: number) => padT + ih - ((v - loN) / (hi - loN)) * ih
  const ticks = loN < 0 ? [loN, 0, hi] : [0, hi / 2, hi]
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left - padL) / (w - padL - padR)) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg className="chart" width={w} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Grafik garis">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke={t === 0 && loN < 0 ? 'var(--line)' : 'var(--grid)'} strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end">{Math.round(t)}</text>
          </g>
        ))}
        {shadeFrom != null && <rect x={x(shadeFrom)} y={padT} width={x(n - 1) - x(shadeFrom)} height={ih} fill="var(--ink)" opacity={0.04} />}
        {labels.map((l, i) => (i % Math.ceil(n / 5) === 0 ? <text key={i} x={x(i)} y={height - 5} textAnchor="middle">{l}</text> : null))}
        {markers.map((m) => (
          <g key={m.label}>
            <line x1={x(m.i)} x2={x(m.i)} y1={padT} y2={padT + ih} stroke={m.color ?? 'var(--ink)'} strokeWidth={1} strokeDasharray="3 3" />
            <text x={x(m.i) + 4} y={padT + 9} style={{ fill: m.color ?? 'var(--ink-2)' }}>{m.label}</text>
          </g>
        ))}
        {series.map((s) => {
          const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
          const last = s.values[s.values.length - 1]
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dash} />
              <circle cx={x(n - 1)} cy={y(last)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              <text x={x(n - 1) + 8} y={y(last) + 3} style={{ fill: 'var(--ink-2)' }}>{s.name} {Math.round(last)}</text>
            </g>
          )
        })}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="var(--ink)" strokeWidth={1} opacity={0.3} />
            {series.map((s) => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />)}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="tip" style={{ left: Math.min(Math.max(x(hover), 70), w - 70), top: padT + 20 }}>
          <div className="mono">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.name} className="row" style={{ gap: 6 }}><i style={{ width: 10, height: 3, background: s.color, borderRadius: 2, display: 'inline-block' }} />{s.name} <b>{Math.round(s.values[hover])}</b></div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Kalender aktivitas dot-matrix (sekuensial satu hue) ---------- */
export function DotHeatmap({ days, weeks = 17 }: { days: { day: string; km: number }[]; weeks?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const cells = days.slice(-weeks * 7)
  // susun kolom per minggu, mulai Senin
  const first = new Date(cells[0]?.day ?? Date.now())
  const offset = (first.getDay() + 6) % 7
  const cols = Math.ceil((cells.length + offset) / 7)
  const gap = 3
  const size = Math.min(16, (w - 22 - gap * cols) / cols)
  const lvl = (km: number) => (km <= 0 ? 0 : km < 20 ? 1 : km < 40 ? 2 : km < 70 ? 3 : 4)
  const fills = ['var(--sunken)', 'color-mix(in srgb, var(--accent) 30%, var(--surface))', 'color-mix(in srgb, var(--accent) 55%, var(--surface))', 'color-mix(in srgb, var(--accent) 80%, var(--surface))', 'var(--accent)']
  const H = 7 * (size + gap)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg className="chart" width={w} height={H + 4} role="img" aria-label="Kalender aktivitas">
        {['S', 'R', 'J'].map((l, i) => <text key={l} x={0} y={i * 2 * (size + gap) + size * 0.75}>{l}</text>)}
        {cells.map((c, i) => {
          const k = i + offset
          const col = Math.floor(k / 7), row = k % 7
          const L = lvl(c.km)
          return (
            <circle key={c.day} cx={22 + col * (size + gap) + size / 2} cy={row * (size + gap) + size / 2} r={L === 0 ? size * 0.22 : size / 2}
              fill={fills[L]} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)} />
          )
        })}
      </svg>
      {hover != null && (() => {
        const k = hover + offset
        return (
          <div className="tip" style={{ left: 22 + Math.floor(k / 7) * (size + gap) + size / 2, top: (k % 7) * (size + gap) }}>
            <div className="mono">{new Date(cells[hover].day).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
            {cells[hover].km > 0 ? <><b>{cells[hover].km.toFixed(1)}</b> km</> : 'Istirahat'}
          </div>
        )
      })()}
      <div className="row tiny muted" style={{ justifyContent: 'flex-end', gap: 4, marginTop: 6 }}>
        <span>0</span>{fills.map((f, i) => <svg key={i} width="12" height="12"><circle cx="6" cy="6" r={i === 0 ? 2.5 : 5.5} fill={f} /></svg>)}<span>70+ km</span>
      </div>
    </div>
  )
}

/* ---------- Sparkline ---------- */
export function Sparkline({ values, color = 'currentColor', height = 34, width = 110 }: { values: number[]; color?: string; height?: number; width?: number }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1), min = Math.min(...values, 0)
  const x = (i: number) => (i / (values.length - 1)) * (width - 6) + 3
  const y = (v: number) => height - 4 - ((v - min) / (max - min || 1)) * (height - 8)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')
  return (
    <svg width={width} height={height} aria-hidden style={{ flexShrink: 0, display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={3.5} fill="var(--accent)" />
    </svg>
  )
}

/* ---------- Profil elevasi ---------- */
export function ElevationProfile({ elev, distanceKm, height = 130 }: { elev: number[]; distanceKm: number; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  if (elev.length < 2) return null
  const padL = 34, padB = 18, padT = 8
  const lo = Math.min(...elev), hi = Math.max(...elev)
  const top = niceMax(hi - lo || 10) + lo
  const ih = height - padT - padB
  const x = (i: number) => padL + (i / (elev.length - 1)) * (w - padL)
  const y = (v: number) => padT + ih - ((v - lo) / (top - lo || 1)) * ih
  const line = elev.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const area = `${line}L${x(elev.length - 1)},${padT + ih}L${padL},${padT + ih}Z`
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg className="chart" width={w} height={height} onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(elev.length - 1, Math.round(((e.clientX - r.left - padL) / (w - padL)) * (elev.length - 1))))) }}>
        {[lo, top].map((t) => (<g key={t}><line x1={padL} x2={w} y1={y(t)} y2={y(t)} stroke="var(--grid)" /><text x={padL - 6} y={y(t) + 3} textAnchor="end">{Math.round(t)}</text></g>))}
        <path d={area} fill="var(--ink)" opacity={0.1} />
        <path d={line} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />
        <text x={padL} y={height - 4}>0 KM</text>
        <text x={w} y={height - 4} textAnchor="end">{distanceKm.toFixed(0)} KM</text>
        {hover != null && <circle cx={x(hover)} cy={y(elev[hover])} r={4.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />}
      </svg>
      {hover != null && (
        <div className="tip" style={{ left: Math.min(Math.max(x(hover), 50), w - 50), top: y(elev[hover]) }}>
          <div className="mono">KM {((hover / (elev.length - 1)) * distanceKm).toFixed(1)}</div><b>{elev[hover]}</b> mdpl
        </div>
      )}
    </div>
  )
}

/* ---------- Dial / gauge ala Teenage Engineering ---------- */
export function Dial({ value, max = 100, size = 150, label, sub, color = 'var(--accent)', ticks = 40 }: { value: number; max?: number; size?: number; label?: ReactNode; sub?: ReactNode; color?: string; ticks?: number }) {
  const c = size / 2
  const r = size / 2 - 8
  const start = 135, sweep = 270
  const frac = Math.max(0, Math.min(1, value / max))
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const a = ((start + (sweep * i) / ticks) * Math.PI) / 180
          const on = i / ticks <= frac
          const r1 = r - (i % 5 === 0 ? 10 : 6)
          return <line key={i} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * r} y2={c + Math.sin(a) * r} stroke={on ? color : 'var(--line)'} strokeWidth={i % 5 === 0 ? 2.5 : 2} strokeLinecap="round" />
        })}
        {(() => {
          const a = ((start + sweep * frac) * Math.PI) / 180
          return <circle cx={c + Math.cos(a) * (r - 16)} cy={c + Math.sin(a) * (r - 16)} r={3} fill={color} />
        })()}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>{label}{sub && <div className="mono" style={{ marginTop: 4 }}>{sub}</div>}</div>
      </div>
    </div>
  )
}

/* ---------- Skor per jam (cuaca) ---------- */
export function HourBars({ hours, best }: { hours: { time: Date; score: number; temp: number; rain: number }[]; best?: [number, number] }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const height = 120, padB = 18
  const band = w / hours.length
  const bw = Math.max(3, Math.min(14, band - 2))
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg className="chart" width={w} height={height}>
        {hours.map((h, i) => {
          const bh = Math.max(3, (h.score / 100) * (height - padB - 6))
          const x = band * i + (band - bw) / 2
          const inBest = best && h.time.getTime() >= best[0] && h.time.getTime() < best[1]
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={band * i} y={0} width={band} height={height} fill="transparent" />
              <rect x={x} y={height - padB - bh} width={bw} height={bh} rx={Math.min(4, bw / 2)} fill={inBest ? 'var(--accent)' : h.score >= 60 ? 'var(--ink)' : 'var(--line)'} />
              {h.time.getHours() % 6 === 0 && <text x={x + bw / 2} y={height - 4} textAnchor="middle">{String(h.time.getHours()).padStart(2, '0')}</text>}
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="tip" style={{ left: Math.min(Math.max(band * hover + band / 2, 60), w - 60), top: 20 }}>
          <div className="mono">{hours[hover].time.toLocaleDateString('id-ID', { weekday: 'short' })} {String(hours[hover].time.getHours()).padStart(2, '0')}.00</div>
          Skor <b>{hours[hover].score}</b> · {Math.round(hours[hover].temp)}° · hujan {hours[hover].rain}%
        </div>
      )}
    </div>
  )
}

/* ---------- Timeline zona intensitas ala pola tidur ---------- */
const ZONE_FILL = ['', 'color-mix(in srgb, var(--ink) 18%, var(--surface))', 'color-mix(in srgb, var(--ink) 42%, var(--surface))', 'var(--ink)', 'color-mix(in srgb, var(--accent) 70%, var(--ink))', 'var(--accent)']
export const ZONE_NAMES = ['', 'Z1 Pulih', 'Z2 Endurance', 'Z3 Tempo', 'Z4 Ambang', 'Z5 Maks']

export function ZoneBlocks({ zones, height = 150, durationSec }: { zones: number[]; height?: number; durationSec: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  if (!zones.length) return null
  const padB = 18
  const rowH = (height - padB) / 5
  const segW = w / zones.length
  // gabungkan segmen berurutan dengan zona sama menjadi blok
  const blocks: { z: number; s: number; e: number }[] = []
  zones.forEach((z, i) => { const b = blocks[blocks.length - 1]; if (b && b.z === z) b.e = i + 1; else blocks.push({ z, s: i, e: i + 1 }) })
  const y = (z: number) => (z - 1) * rowH // Z1 di atas, Z5 di bawah (seperti tidur dalam)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg className="chart" width={w} height={height} onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(zones.length - 1, Math.floor((e.clientX - r.left) / segW)))) }}>
        {blocks.map((b, i) => {
          const next = blocks[i + 1]
          return (
            <g key={i}>
              <rect x={b.s * segW + 1} y={y(b.z) + 2} width={Math.max(2, (b.e - b.s) * segW - 2)} height={rowH - 4} fill={ZONE_FILL[b.z]} />
              {next && <line x1={b.e * segW} x2={b.e * segW} y1={Math.min(y(b.z), y(next.z)) + 2} y2={Math.max(y(b.z), y(next.z)) + rowH - 2} stroke="var(--ink)" strokeWidth={1.5} />}
            </g>
          )
        })}
        {hover != null && <line x1={(hover + 0.5) * segW} x2={(hover + 0.5) * segW} y1={0} y2={height - padB} stroke="var(--ink)" opacity={0.3} />}
        <text x={0} y={height - 4}>00:00 MULAI</text>
        <text x={w} y={height - 4} textAnchor="end">{Math.floor(durationSec / 3600)}:{String(Math.floor((durationSec % 3600) / 60)).padStart(2, '0')} SELESAI</text>
      </svg>
      {hover != null && (
        <div className="tip" style={{ left: Math.min(Math.max((hover + 0.5) * segW, 60), w - 60), top: y(zones[hover]) }}>
          <div className="mono">menit {Math.round((hover / zones.length) * durationSec / 60)}</div>{ZONE_NAMES[zones[hover]]}
        </div>
      )}
    </div>
  )
}

/* ---------- Bar tersegmentasi (satu keseluruhan) ---------- */
export function SegBar({ parts, height = 14 }: { parts: { v: number; color: string; label: string }[]; height?: number }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 2, height, borderRadius: 99, overflow: 'hidden' }}>
        {parts.map((p) => <div key={p.label} title={`${p.label} ${Math.round(p.v * 100)}%`} style={{ flex: Math.max(0.001, p.v), background: p.color }} />)}
      </div>
      <div className="legend" style={{ marginTop: 8 }}>
        {parts.map((p) => <span key={p.label}><i style={{ background: p.color, height: 8, width: 8, borderRadius: 2 }} />{p.label} <b>{Math.round(p.v * 100)}%</b></span>)}
      </div>
    </div>
  )
}

/* ---------- Jam radial 24 jam ---------- */
export function RadialClock({ values, size = 220, arcs = [], pins = [], now = true, center }: {
  values?: number[]; size?: number
  arcs?: { from: number; to: number; color: string; label?: string }[] // jam desimal
  pins?: { h: number; label: string; color?: string; dark?: boolean }[]
  now?: boolean; center?: ReactNode
}) {
  const c = size / 2
  const R = size / 2 - 26
  const ang = (h: number) => ((h / 24) * 360 - 90) * (Math.PI / 180)
  const pt = (h: number, r: number): [number, number] => [c + Math.cos(ang(h)) * r, c + Math.sin(ang(h)) * r]
  const max = values ? Math.max(1, ...values) : 1
  const arcPath = (a: number, b: number, r: number) => {
    const [x0, y0] = pt(a, r), [x1, y1] = pt(b, r)
    const large = (b - a + 24) % 24 > 12 ? 1 : 0
    return `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1}`
  }
  const hNow = new Date().getHours() + new Date().getMinutes() / 60
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} className="chart" aria-label="Jam 24 jam">
        <circle cx={c} cy={c} r={R + 14} fill="var(--surface-2)" />
        {Array.from({ length: 96 }, (_, i) => {
          const h = i / 4
          const major = i % 12 === 0
          const [x0, y0] = pt(h, R + 12), [x1, y1] = pt(h, R + (major ? 4 : 8))
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--muted)" strokeWidth={major ? 1.5 : 0.8} opacity={major ? 0.9 : 0.5} />
        })}
        {[0, 6, 12, 18].map((h) => { const [x, y] = pt(h, R - 8); return <text key={h} x={x} y={y + 3} textAnchor="middle">{String(h).padStart(2, '0')}</text> })}
        {arcs.map((a, i) => <path key={i} d={arcPath(a.from, a.to, R + 8)} stroke={a.color} strokeWidth={8} fill="none" strokeLinecap="round" />)}
        {values?.map((v, h) => {
          if (v <= 0) return null
          const r0 = R - 22, r1 = r0 - (v / max) * (R - 50)
          const [x0, y0] = pt(h + 0.5, r0), [x1, y1] = pt(h + 0.5, r1)
          return <line key={h} x1={x0} y1={y0} x2={x1} y2={y1} stroke={v === max ? 'var(--accent)' : 'var(--ink)'} strokeWidth={Math.max(3, (2 * Math.PI * r0) / 24 - 5)} strokeLinecap="round" />
        })}
        {now && (() => { const [x, y] = pt(hNow, R + 8); return <><line x1={c} y1={c} x2={x} y2={y} stroke="var(--accent)" strokeWidth={1.2} opacity={0.5} /><circle cx={x} cy={y} r={5} fill="var(--accent)" stroke="var(--surface-2)" strokeWidth={2} /></> })()}
      </svg>
      {pins.map((p, i) => {
        const [x, y] = pt(p.h, R + 8)
        return <div key={i} style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', background: p.dark ? 'var(--ink)' : p.color ?? 'var(--accent)', color: '#fff', borderRadius: 99, padding: '3px 8px', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', boxShadow: '0 4px 10px -4px rgba(0,0,0,.4)' }}>{p.label}</div>
      })}
      {center && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>{center}</div>}
    </div>
  )
}

/* ---------- Titik konsistensi (ukuran = km) ala Air OS ---------- */
export function DotRows({ days, cols = 14, color = 'var(--accent)' }: { days: { day: string; km: number }[]; cols?: number; color?: string }) {
  const max = Math.max(1, ...days.map((d) => d.km))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6, alignItems: 'center', justifyItems: 'center' }}>
      {days.map((d) => {
        const s = d.km > 0 ? 6 + (d.km / max) * 10 : 5
        return <i key={d.day} title={`${d.day}: ${d.km.toFixed(1)} km`} style={{ width: s, height: s, borderRadius: '50%', background: d.km > 0 ? color : 'color-mix(in srgb, var(--ink) 14%, transparent)', display: 'block' }} />
      })}
    </div>
  )
}

/* ---------- Sebaran rasa vs form, dengan zona titik manis ---------- */
export function SweetScatter({ pts, lo, hi, height = 190 }: { pts: { tsb: number; feel: number }[]; lo: number; hi: number; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const padL = 30, padB = 22, padT = 8
  const xs = pts.map((p) => p.tsb)
  const x0 = Math.floor(Math.min(...xs, -30) / 10) * 10, x1 = Math.ceil(Math.max(...xs, 25) / 10) * 10
  const x = (v: number) => padL + ((v - x0) / (x1 - x0)) * (w - padL - 8)
  const y = (v: number) => padT + (1 - v) * (height - padT - padB)
  return (
    <div ref={ref}>
      <svg className="chart" width={w} height={height} role="img" aria-label="Rasa vs form">
        <rect x={x(lo)} y={padT} width={x(hi) - x(lo)} height={height - padT - padB} fill="var(--lime)" opacity={0.55} rx={8} />
        <text x={(x(lo) + x(hi)) / 2} y={padT + 12} textAnchor="middle" style={{ fill: 'var(--lime-ink)', fontWeight: 700 }}>TITIK MANIS</text>
        {[0, 0.5, 1].map((v) => <g key={v}><line x1={padL} x2={w} y1={y(v)} y2={y(v)} stroke="var(--grid)" /><text x={padL - 6} y={y(v) + 3} textAnchor="end">{v === 1 ? '😄' : v === 0 ? '😩' : '😐'}</text></g>)}
        {[x0, 0, x1].map((v) => <text key={v} x={x(v)} y={height - 6} textAnchor="middle">{v > 0 ? '+' : ''}{v}</text>)}
        <line x1={x(0)} x2={x(0)} y1={padT} y2={height - padB} stroke="var(--line)" />
        {pts.map((p, i) => <circle key={i} cx={x(p.tsb)} cy={y(p.feel)} r={4.5} fill={p.tsb >= lo && p.tsb <= hi ? 'var(--ink)' : 'var(--muted)'} stroke="var(--surface)" strokeWidth={2} opacity={0.9} />)}
      </svg>
    </div>
  )
}
