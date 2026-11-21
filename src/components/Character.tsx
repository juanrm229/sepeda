import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { CharConfig } from '../lib/types'
import { HAIR_COLORS, JERSEY_COLORS, SKINS, type Mood } from '../lib/character'

/* =====================================================================
   Karakter doodle — gaya garis hitam tebal ala ilustrasi referensi.
   Semua digambar prosedural di SVG, satuan "kepala" berpusat di (100,102).
   ===================================================================== */

const INK = '#111111'

function scallop(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): string {
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const r = (Math.hypot(x1 - x0, y1 - y0) / 2) * 1.15
    d += ` A${r.toFixed(1)},${r.toFixed(1)} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`
  }
  return d
}

const FRINGE_CURLY = 'M63,98 C60,66 82,52 102,54 C124,56 140,70 137,96 C130,80 116,72 100,74 C86,76 72,84 63,98 Z'
const FRINGE_CROP = 'M63,94 C61,60 82,48 102,49 C124,50 141,64 137,92 C133,78 120,68 101,68 C83,68 70,77 63,94 Z'
const FRINGE_SIDE = 'M62,100 C56,58 88,42 114,47 C138,52 146,74 138,98 C135,84 128,72 118,67 C108,78 88,83 70,82 C66,88 63,94 62,100 Z'

function HairBack({ hair, color, sw }: { hair: number; color: string; sw: number }) {
  if (hair === 0) return <path d={`${scallop(100, 92, 55, 51, 150, 390, 11)} L120,124 L80,124 Z`} fill={color} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
  if (hair === 3) return <path d="M57,96 C55,56 79,44 100,44 C123,44 147,57 145,98 L149,164 C128,169 72,169 51,164 Z" fill={color} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
  if (hair === 4) return <circle cx={100} cy={44} r={15} fill={color} stroke={INK} strokeWidth={sw} />
  if (hair === 6) return <path d="M100,46 C142,46 154,82 152,112 C151,136 146,150 170,178 L30,178 C54,150 49,136 48,112 C46,82 58,46 100,46 Z" fill={color} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
  return null
}

function HairFront({ hair, color, sw }: { hair: number; color: string; sw: number }) {
  const p = (d: string) => <path d={d} fill={color} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
  switch (hair) {
    case 0: return p(FRINGE_CURLY)
    case 1: return p(FRINGE_CROP)
    case 2: return p(FRINGE_SIDE)
    case 3: return p(FRINGE_SIDE)
    case 4: return p(FRINGE_CROP)
    case 6: return <path d="M66,92 C70,62 130,62 134,92" fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" />
    case 7: return p('M90,66 L91,40 L96,48 L100,30 L104,48 L109,40 L110,66 Z')
    default: return null
  }
}

function Headgear({ g, color, sw }: { g: number; color: string; sw: number }) {
  const light = color === '#ffffff' || color === '#f3d40b'
  const vent = light ? INK : '#ffffff'
  switch (g) {
    case 1:
    case 4:
      return (
        <g>
          <path d="M58,90 C56,54 82,37 106,37 C134,38 151,58 146,88 C128,80 110,77 94,78 C80,79 67,84 58,90 Z" fill={color} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M84,50 L91,64 M103,45 L106,61 M121,50 L119,63" stroke={vent} strokeWidth={sw * 0.8} strokeLinecap="round" />
          <path d="M65,92 L76,128" stroke={INK} strokeWidth={sw * 0.6} strokeLinecap="round" />
          {g === 4 && <path d="M116,66 C134,61 156,64 164,73 C150,77 132,77 118,76 Z" fill={INK} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />}
        </g>
      )
    case 2:
      return (
        <g>
          <path d="M62,88 C60,58 84,45 102,45 C122,45 140,60 138,86 Z" fill={color} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M64,79 C82,70 118,70 137,77" fill="none" stroke={vent} strokeWidth={sw * 1.1} />
          <path d="M118,84 C132,81 150,83 157,90 C149,95 132,93 118,92 Z" fill={INK} stroke={INK} strokeWidth={sw * 0.8} strokeLinejoin="round" />
        </g>
      )
    case 3:
      return (
        <g>
          <path d="M61,84 C80,70 120,68 139,80 L139,92 C120,81 80,83 61,97 Z" fill={color} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M61,90 L45,82 L47,99 Z" fill={color} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
        </g>
      )
    case 5:
      return <path d="M70,60 L75,30 L88,47 L100,23 L112,47 L125,30 L130,60 Z" fill="#f3d40b" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
    default:
      return null
  }
}

function Eyes({ mood, sw }: { mood: Mood; sw: number }) {
  const L: [number, number] = [87, 106]
  const R: [number, number] = [113, 106]
  if (mood === 'segar') return <path d={`M${L[0] - 6},${L[1] + 2} Q${L[0]},${L[1] - 6} ${L[0] + 6},${L[1] + 2} M${R[0] - 6},${R[1] + 2} Q${R[0]},${R[1] - 6} ${R[0] + 6},${R[1] + 2}`} fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" />
  if (mood === 'lelah') return <path d={`M${L[0] - 6},${L[1]} L${L[0] + 6},${L[1] + 1} M${R[0] - 6},${R[1] + 1} L${R[0] + 6},${R[1]} M${L[0] - 4},${L[1] + 7} Q${L[0]},${L[1] + 9} ${L[0] + 4},${L[1] + 7} M${R[0] - 4},${R[1] + 7} Q${R[0]},${R[1] + 9} ${R[0] + 4},${R[1] + 7}`} fill="none" stroke={INK} strokeWidth={sw * 0.8} strokeLinecap="round" />
  if (mood === 'semangat') {
    const star = (x: number, y: number) => `M${x},${y - 8} Q${x + 1.5},${y - 1.5} ${x + 8},${y} Q${x + 1.5},${y + 1.5} ${x},${y + 8} Q${x - 1.5},${y + 1.5} ${x - 8},${y} Q${x - 1.5},${y - 1.5} ${x},${y - 8} Z`
    return <path d={star(...L) + star(...R)} fill={INK} />
  }
  return (
    <g>
      <circle cx={L[0]} cy={L[1]} r={4.6} fill={INK} />
      <circle cx={R[0]} cy={R[1]} r={4.6} fill={INK} />
      {mood === 'kangen' && <path d="M118,112 C116,118 116,122 119,123 C122,122 122,118 120,112 Z" fill="#7cc4ff" stroke={INK} strokeWidth={sw * 0.5} />}
    </g>
  )
}

function Mouth({ mood, sw }: { mood: Mood; sw: number }) {
  const s = { fill: 'none', stroke: INK, strokeWidth: sw, strokeLinecap: 'round' as const }
  switch (mood) {
    case 'semangat': return <path d="M88,124 Q100,142 112,124 Z" fill={INK} stroke={INK} strokeWidth={sw * 0.6} strokeLinejoin="round" />
    case 'segar': return <path d="M90,126 Q100,135 110,126" {...s} />
    case 'oke': return <path d="M92,127 Q100,131 108,127" {...s} />
    case 'lelah': return <path d="M92,129 Q96,126 100,129 Q104,132 108,129" {...s} />
    case 'kangen': return <path d="M92,132 Q100,124 108,132" {...s} />
  }
}

function Glasses({ g, sw }: { g: number; sw: number }) {
  switch (g) {
    case 1: return <g fill="none" stroke={INK} strokeWidth={sw * 0.8}><circle cx={87} cy={106} r={11} /><circle cx={113} cy={106} r={11} /><path d="M98,104 Q100,101 102,104 M124,103 L137,99" strokeLinecap="round" /></g>
    case 2: return <g><path d="M70,98 C82,93 120,93 133,98 L131,111 C122,118 106,115 100,110 C94,115 78,118 72,111 Z" fill={INK} stroke={INK} strokeWidth={sw * 0.6} strokeLinejoin="round" /><path d="M78,101 L92,100" stroke="#fff" strokeWidth={sw * 0.5} strokeLinecap="round" opacity={0.7} /></g>
    case 3: return <g><rect x={75} y={98} width={24} height={16} rx={6} fill={INK} /><rect x={101} y={98} width={24} height={16} rx={6} fill={INK} /><path d="M125,103 L137,99" stroke={INK} strokeWidth={sw * 0.7} strokeLinecap="round" /></g>
    case 4: return <path d="M63,96 L139,96 L137,114 L65,114 Z" fill="#ff4d1f" stroke={INK} strokeWidth={sw * 0.8} strokeLinejoin="round" opacity={0.92} />
    default: return null
  }
}

/** Kepala lengkap (tanpa badan). */
export function HeadArt({ c, mood = 'oke', sw = 4.5 }: { c: CharConfig; mood?: Mood; sw?: number }) {
  const skin = SKINS[c.skin] ?? SKINS[0]
  const hairC = HAIR_COLORS[c.hairColor] ?? INK
  const jc = JERSEY_COLORS[c.jerseyColor] ?? INK
  const hijab = c.hair === 6
  const blush = mood === 'segar' || mood === 'semangat'
  return (
    <g>
      <HairBack hair={c.hair} color={hijab ? jc === '#111111' ? '#2a2a28' : jc : hairC} sw={sw} />
      {!hijab && <path d="M137,100 C148,96 150,115 137,117" fill={skin} stroke={INK} strokeWidth={sw} strokeLinecap="round" />}
      <ellipse cx={100} cy={hijab ? 104 : 102} rx={hijab ? 33 : 37} ry={hijab ? 38 : 43} fill={skin} stroke={INK} strokeWidth={sw} />
      {blush && <g fill="#ff8a7a" opacity={0.5}><ellipse cx={80} cy={119} rx={6} ry={3.5} /><ellipse cx={120} cy={119} rx={6} ry={3.5} /></g>}
      <Eyes mood={mood} sw={sw} />
      <path d="M101,110 C98,118 99,121 104,120" fill="none" stroke={INK} strokeWidth={sw * 0.7} strokeLinecap="round" />
      <Mouth mood={mood} sw={sw} />
      <HairFront hair={c.hair} color={hijab ? INK : hairC} sw={sw} />
      <Glasses g={c.glasses} sw={sw} />
      <Headgear g={c.headgear} color={c.headgear === 1 || c.headgear === 4 ? (jc === '#111111' ? '#ffffff' : jc) : jc} sw={sw} />
    </g>
  )
}

function JerseyFill({ id, c }: { id: string; c: CharConfig }) {
  const jc = JERSEY_COLORS[c.jerseyColor] ?? INK
  const contrast = jc === '#ffffff' || jc === '#f3d40b' ? INK : '#ffffff'
  switch (c.jersey) {
    case 1: return <pattern id={id} width={20} height={20} patternUnits="userSpaceOnUse"><rect width={20} height={20} fill={jc} /><rect y={12} width={20} height={5} fill={contrast} /></pattern>
    case 2: return <pattern id={id} width={18} height={18} patternUnits="userSpaceOnUse"><rect width={18} height={18} fill="#ffffff" /><circle cx={5} cy={5} r={3.6} fill="#e3312b" /><circle cx={14} cy={14} r={3.6} fill="#e3312b" /></pattern>
    case 3: return <pattern id={id} width={22} height={22} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width={22} height={22} fill={jc} /><path d="M0,11 Q5.5,3 11,11 T22,11" fill="none" stroke={contrast} strokeWidth={2.5} /></pattern>
    case 4: return <linearGradient id={id} x1="0" x2="1"><stop offset="0.5" stopColor={jc} /><stop offset="0.5" stopColor={INK} /></linearGradient>
    default: return <pattern id={id} width={10} height={10} patternUnits="userSpaceOnUse"><rect width={10} height={10} fill={jc} /></pattern>
  }
}

/** Potret dada-ke-atas ala avatar builder. */
export function Portrait({ c, mood = 'oke', size = 160, bg, className, style }: { c: CharConfig; mood?: Mood; size?: number; bg?: string; className?: string; style?: React.CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const skin = SKINS[c.skin] ?? SKINS[0]
  const jc = JERSEY_COLORS[c.jerseyColor] ?? INK
  const zipC = jc === '#111111' ? '#ffffff' : INK
  return (
    <svg viewBox="12 14 176 220" width={size} height={size * (220 / 176)} className={className} style={style} aria-label="Karakter">
      <defs><JerseyFill id={`j${uid}`} c={c} /></defs>
      {bg && <rect x={12} y={14} width={176} height={220} fill={bg} />}
      <path d="M90,136 L90,162 L110,162 L110,136" fill={skin} stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
      <path d="M26,236 C28,190 56,164 100,162 C144,164 172,190 174,236 Z" fill={`url(#j${uid})`} stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
      <path d="M86,162 L100,175 L114,162" fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      <path d="M100,176 L100,236" stroke={zipC} strokeWidth={2.5} strokeDasharray="3 3" />
      <path d="M58,236 C58,214 62,200 66,192 M142,236 C142,214 138,200 134,192" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      {c.acc === 1 && <g><rect x={124} y={190} width={16} height={11} fill="#ffffff" stroke={INK} strokeWidth={2.5} /><rect x={124} y={190} width={16} height={5.5} fill="#e3312b" stroke={INK} strokeWidth={2.5} /></g>}
      {c.acc === 2 && <path d="M84,150 C92,160 108,160 116,150 L118,164 C108,172 92,172 82,164 Z" fill={jc === '#111111' ? '#ff4d1f' : INK} stroke={INK} strokeWidth={4} strokeLinejoin="round" />}
      {c.acc === 3 && <g><path d="M80,164 L100,198 L120,164" fill="none" stroke="#ff4d1f" strokeWidth={6} /><circle cx={100} cy={204} r={11} fill="#f3d40b" stroke={INK} strokeWidth={3.5} /><text x={100} y={208} textAnchor="middle" fontSize={11} fontWeight={800} fill={INK} fontFamily="var(--f-ui)">1</text></g>}
      {c.acc === 4 && <g><path d="M124,200 C124,188 140,188 140,200 L142,204 L122,204 Z" fill="#f3d40b" stroke={INK} strokeWidth={3} strokeLinejoin="round" /><circle cx={132} cy={207} r={2.5} fill={INK} /></g>}
      <HeadArt c={c} mood={mood} />
    </svg>
  )
}

/** Kepala kecil bulat untuk avatar di daftar. */
export function HeadBadge({ c, mood = 'oke', size = 38, bg = 'var(--surface-2)', ring = true }: { c: CharConfig; mood?: Mood; size?: number; bg?: string; ring?: boolean }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', display: 'inline-grid', placeItems: 'center', background: bg, flexShrink: 0, boxShadow: ring ? '0 0 0 2px var(--surface)' : undefined }}>
      <svg viewBox="40 30 120 120" width={size * 1.05} height={size * 1.05} style={{ marginTop: size * 0.12 }}><HeadArt c={c} mood={mood} sw={5} /></svg>
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
            <circle r={21} fill={r.me ? '#ff4d1f' : 'var(--surface-2)'} stroke={INK} strokeWidth={2.5} />
            <g clipPath={`url(#hc${uid})`}><g transform="translate(-32 -28) scale(0.32)"><HeadArt c={r.c} sw={7} /></g></g>
            <circle r={19} fill="none" stroke={INK} strokeWidth={2} />
          </g>
          <g transform={`translate(0 ${by})`}>
            <path d={`M0,-2 L0,${-by - 26}`} stroke={INK} strokeWidth={1.2} strokeDasharray="2 2" opacity={0.5} />
            <rect x={-30} y={-28} width={60} height={26} rx={9} fill={r.me ? '#111' : 'var(--surface-2)'} stroke={INK} strokeWidth={2} />
            <text x={0} y={-17.5} textAnchor="middle" fontSize={8.5} fontWeight={800} fill={i === 0 ? '#ff4d1f' : r.me ? '#fff' : INK} fontFamily="var(--f-ui)">#{i + 1} {r.me ? 'Kamu' : r.name.split(' ')[0]}</text>
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
      <svg viewBox="30 22 140 140" width={size} height={size} style={{ marginTop: size * 0.1 }}><HeadArt c={c} mood={mood} sw={5.5} /></svg>
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
export function DetentSlider({ value, onChange, labels, accent = '#ff4d1f', track = 'var(--sunken)', thumb }: { value: number; onChange: (v: number) => void; labels: string[]; accent?: string; track?: string; thumb?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const set = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    onChange(Math.max(0, Math.min(1, (clientX - r.left - 16) / (r.width - 32))))
  }
  return (
    <div>
      <div ref={ref} role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} tabIndex={0}
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
