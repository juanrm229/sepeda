import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { CharConfig } from '../lib/types'
import type { Mood } from '../lib/character'
import { avatarUri } from '../lib/avatar'

/* =====================================================================
   Avatar profil — DiceBear Lorelei (SVG data URI, cache di lib/avatar).
   ===================================================================== */

const INK = '#111111'

/** Avatar sebagai <img> (aman di semua browser, termasuk Safari). */
export function AvatarImg({ c, mood, size, className, style, label = 'Avatar', zoom = 1, shift = 0 }: { c: CharConfig; mood?: Mood; size: number; className?: string; style?: React.CSSProperties; label?: string; zoom?: number; shift?: number }) {
  return (
    <img src={avatarUri(c, mood)} width={size} height={size} alt={label} className={className} draggable={false} decoding="async"
      style={{ display: 'block', width: size, height: size, transform: zoom !== 1 || shift ? `translateY(${shift}%) scale(${zoom})` : undefined, ...style }} />
  )
}

/** Avatar di dalam SVG lain (adegan balapan dsb). */
export function AvatarImage({ c, mood, x, y, size }: { c: CharConfig; mood?: Mood; x: number; y: number; size: number }) {
  return <image href={avatarUri(c, mood)} x={x} y={y} width={size} height={size} />
}

/** Potret profil. */
export function Portrait({ c, mood = 'oke', size = 160, className, style }: { c: CharConfig; mood?: Mood; size?: number; bg?: string; className?: string; style?: React.CSSProperties }) {
  return <AvatarImg c={c} mood={mood} size={size} className={className} style={style} label="Potret karakter" />
}

/** Kepala kecil bulat untuk avatar di daftar. */
export function HeadBadge({ c, mood = 'oke', size = 38, bg = 'var(--surface-2)', ring = true }: { c: CharConfig; mood?: Mood; size?: number; bg?: string; ring?: boolean }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', display: 'inline-grid', placeItems: 'center', background: bg, flexShrink: 0, boxShadow: ring ? '0 0 0 2px var(--surface)' : undefined }}>
      <AvatarImg c={c} mood={mood} size={size} zoom={1.12} shift={4} />
    </span>
  )
}

export function useTicker(active = true): number {
  const [t, setT] = useState(0)
  const ref = useRef(0)
  useEffect(() => {
    if (!active) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    let raf = 0
    let last = performance.now()
    const start = last
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 33) return
      last = now
      ref.current = (now - start) / 1000
      setT(ref.current)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])
  return t
}

/* ========================= Adegan balapan squad (kepala bulat) ========================= */

export interface Racer { id: string; name: string; c: CharConfig; km: number; me?: boolean }

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0,0 L0,14" stroke={INK} strokeWidth={3} />
      <path d="M0,-44 L10,-30 L6,-30 L15,-17 L9,-17 L19,-2 L-19,-2 L-9,-17 L-15,-17 L-6,-30 L-10,-30 Z" fill="#3e8a57" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
    </g>
  )
}
function Rock({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M-14,0 C-14,-8 -6,-12 0,-11 C8,-12 15,-6 14,0 Z" fill="#a39486" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
}

export function RaceScene({ racers, height = 250 }: { racers: Racer[]; height?: number }) {
  const t = useTicker()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const W = 420
  const H = 250
  const max = Math.max(1, ...racers.map((r) => r.km))
  const sorted = [...racers].sort((a, b) => b.km - a.km)
  const scroll = (t * 22) % W
  const deco = (off: number) => (
    <g transform={`translate(${off} 0)`}>
      <Tree x={40} y={150} s={0.8} /><Rock x={120} y={158} s={0.8} /><Tree x={210} y={146} s={1} /><Tree x={236} y={152} s={0.6} /><Rock x={318} y={160} s={0.7} /><Tree x={380} y={150} s={0.9} />
    </g>
  )
  const n = sorted.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }} aria-label="Balapan squad mingguan">
      <defs><clipPath id={`hc${uid}`}><circle r={19} /></clipPath></defs>
      <rect width={W} height={H} fill="var(--race-sky)" />
      <circle cx={352} cy={44} r={18} fill="var(--yellow)" stroke={INK} strokeWidth={2.5} />
      <path d="M0,136 L50,96 L78,114 L120,66 L160,110 L196,88 L232,118 L280,74 L322,114 L360,92 L420,128 L420,160 L0,160 Z" fill="var(--race-mtn)" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M120,66 L110,78 L118,76 L124,82 L130,76 Z M280,74 L272,84 L280,82 L286,87 L291,82 Z" fill="#fff" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <g>{deco(-scroll)}{deco(W - scroll)}</g>
      <rect y={160} width={W} height={H - 160} fill="var(--race-ground)" />
      <path d={`M0,160 L${W},160`} stroke={INK} strokeWidth={2.5} />
      <path d={`M0,238 L${W},238`} stroke={INK} strokeWidth={2} strokeDasharray="16 14" strokeDashoffset={(t * 60) % 30} opacity={0.45} />
      <path d={`M${W - 34},164 L${W - 34},236`} stroke={INK} strokeWidth={2} />
      <rect x={W - 34} y={164} width={22} height={16} fill="url(#flag)" stroke={INK} strokeWidth={1.5} />
      <pattern id="flag" width={8} height={8} patternUnits="userSpaceOnUse"><rect width={8} height={8} fill="#fff" /><rect width={4} height={4} fill={INK} /><rect x={4} y={4} width={4} height={4} fill={INK} /></pattern>
      {sorted.map((r, i) => {
        const frac = 0.5 * (r.km / max) + 0.5 * (1 - i / Math.max(1, n - 1))
        const x = 30 + frac * (W - 100)
        const lane = [0, 22, 11, 33][i % 4]
        const bob = Math.abs(Math.sin(t * 5 + i * 1.3)) * -5
        const by = [-28, -54, -80][i % 3]
        const y = 186 + lane
        return { r, i, x, y, bob, by }
      }).reverse().map(({ r, i, x, y, bob, by }) => (
        <g key={r.id} transform={`translate(${x} ${y})`}>
          {[0, 1, 2].map((k) => <path key={k} d={`M${-26 - k * 9},${-6 + k * 6} L${-46 - k * 12},${-6 + k * 6}`} stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.35 - k * 0.08} strokeDasharray="6 5" strokeDashoffset={(t * 40) % 11} />)}
          <ellipse cx={0} cy={22} rx={16} ry={4} fill={INK} opacity={0.18} />
          <g transform={`translate(0 ${bob}) rotate(${Math.sin(t * 5 + i) * 6})`}>
            <circle r={21} fill={r.me ? '#d2441c' : 'var(--surface-2)'} stroke={INK} strokeWidth={2.5} />
            <g clipPath={`url(#hc${uid})`}><AvatarImage c={r.c} x={-23} y={-21} size={46} /></g>
            <circle r={19} fill="none" stroke={INK} strokeWidth={2} />
          </g>
          <g transform={`translate(0 ${by})`}>
            <path d={`M0,-2 L0,${-by - 26}`} stroke={INK} strokeWidth={1.2} strokeDasharray="2 2" opacity={0.5} />
            <rect x={-30} y={-28} width={60} height={26} rx={9} fill={r.me ? '#111' : 'var(--surface-2)'} stroke={INK} strokeWidth={2} />
            <text x={0} y={-17.5} textAnchor="middle" fontSize={8.5} fontWeight={800} fill={i === 0 ? '#d2441c' : r.me ? '#fff' : INK} fontFamily="var(--f-ui)">#{i + 1} {r.me ? 'Kamu' : r.name.split(' ')[0]}</text>
            <text x={0} y={-7.5} textAnchor="middle" fontSize={8} fontFamily="var(--f-mono)" fill={r.me ? '#fff' : INK}>{Math.round(r.km)} km</text>
          </g>
        </g>
      ))}
    </svg>
  )
}

/** Orb holografik ala Air OS — latar karakter. */
export function HoloOrb({ size = 220, children, spin = true }: { size?: number; children?: ReactNode; spin?: boolean }) {
  return (
    <div className="holo" style={{ width: size, height: size }}>
      <div className={`holo-glow ${spin ? 'spin' : ''}`} />
      <div className="holo-inner">{children}</div>
    </div>
  )
}

/** Stiker kepala bulat dengan outline tebal. */
export function HeadSticker({ c, mood = 'oke', size = 64, bg = 'var(--surface-2)', tilt = 0 }: { c: CharConfig; mood?: Mood; size?: number; bg?: string; tilt?: number }) {
  return (
    <span className="sticker" style={{ width: size, height: size, background: bg, transform: `rotate(${tilt}deg)` }}>
      <AvatarImg c={c} mood={mood} size={size} zoom={1.1} shift={4} />
    </span>
  )
}

/* ========================= Wajah perasaan (cek rasa) ========================= */

export function feelLabel(v: number) {
  return v < 0.25 ? 'BERAT' : v < 0.5 ? 'LUMAYAN' : v < 0.78 ? 'ENAK' : 'MANTAP'
}

export function FeelFace({ v, size = 260, ink = '#1f2a07' }: { v: number; size?: number; ink?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ry = 32 + 10 * v
  const droop = (1 - v) * 30
  const smile = (v - 0.45) * 70
  const eye = (cx: number, outer: number, id: string) => {
    const top = 92 - ry
    const yo = top + droop * 1.0
    const yi = top + droop * 0.15
    const poly = outer < cx ? `0,${yo} ${cx + 60},${yi} ${cx + 60},300 0,300` : `${cx - 60},${yi} 300,${yo} 300,300 ${cx - 60},300`
    return (
      <g>
        <clipPath id={id}><polygon points={poly} /></clipPath>
        <ellipse cx={cx} cy={92} rx={44} ry={ry} fill={ink} clipPath={`url(#${id})`} />
        {v > 0.7 && <circle cx={cx + 14} cy={92 - ry * 0.45} r={7} fill="#fff" opacity={0.85} />}
      </g>
    )
  }
  return (
    <svg viewBox="0 0 300 220" width={size} height={size * (220 / 300)} aria-label={`Wajah: ${feelLabel(v)}`}>
      {eye(96, 40, `l${uid}`)}
      {eye(204, 260, `r${uid}`)}
      <path d={`M118,170 Q150,${170 + smile} 182,170`} fill="none" stroke={ink} strokeWidth={13} strokeLinecap="round" />
    </svg>
  )
}

/** Slider detent ala "throttle response". */
export function DetentSlider({ value, onChange, labels, accent = '#d2441c', track = 'var(--sunken)', thumb, label = 'Pilih nilai' }: { value: number; onChange: (v: number) => void; labels: string[]; accent?: string; track?: string; thumb?: ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const set = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    onChange(Math.max(0, Math.min(1, (clientX - r.left - 16) / (r.width - 32))))
  }
  return (
    <div>
      <div ref={ref} role="slider" aria-label={label} aria-valuetext={labels[Math.round(value * (labels.length - 1))]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') onChange(Math.min(1, value + 0.05)); if (e.key === 'ArrowLeft') onChange(Math.max(0, value - 0.05)) }}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); set(e.clientX) }}
        onPointerMove={(e) => { if (e.buttons) set(e.clientX) }}
        style={{ position: 'relative', height: 40, borderRadius: 99, background: track, touchAction: 'none', cursor: 'pointer' }}>
        {labels.map((_, i) => <i key={i} style={{ position: 'absolute', top: 17, left: `calc(16px + ${(i / (labels.length - 1)) * 100}% - ${(i / (labels.length - 1)) * 32}px - 3px)`, width: 6, height: 6, borderRadius: 9, background: 'currentColor', opacity: 0.45 }} />)}
        <div style={{ position: 'absolute', top: 4, left: `calc(${value * 100}% - ${value * 32}px)`, width: 32, height: 32, borderRadius: 99, background: accent, display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.25)', color: '#fff' }}>{thumb}</div>
      </div>
      <div className="row between" style={{ marginTop: 8 }}>{labels.map((l) => <span key={l} className="mono" style={{ color: 'inherit', opacity: 0.6 }}>{l}</span>)}</div>
    </div>
  )
}
