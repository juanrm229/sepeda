import type { ReactNode } from 'react'
import type { CharConfig } from '../lib/types'
import { HeadBadge } from './Character'

/**
 * Avatar squad mengorbit titik pusat (ala kartu melayang DailyLoop),
 * lalu bisa "berkumpul" ke tengah — metafora titik temu.
 */
export function Orbit({ chars, center, size = 260, converge = false }: { chars: CharConfig[]; center: ReactNode; size?: number; converge?: boolean }) {
  const inner = chars.slice(0, Math.ceil(chars.length / 2)), outer = chars.slice(Math.ceil(chars.length / 2))
  const ring = (list: CharConfig[], r: number, dur: number, rev: boolean, av: number) => (
    <div className={`orbit-ring ${rev ? 'rev' : ''}`} style={{ ['--r' as string]: `${r}px`, animationDuration: `${dur}s` }}>
      {list.map((c, i) => (
        <span key={i} className="orbit-item" style={{ ['--a' as string]: `${(360 / list.length) * i + (rev ? 30 : 0)}deg`, animationDuration: `${dur}s`, animationDelay: `${i * 0.08}s` }}>
          <span className="orbit-face" style={{ animationDuration: `${dur}s` }}><HeadBadge c={c} size={av} bg="var(--surface)" /></span>
        </span>
      ))}
    </div>
  )
  return (
    <div className={`orbit ${converge ? 'converge' : ''}`} style={{ width: size, height: size }} aria-hidden>
      <i className="orbit-track" style={{ inset: size * 0.5 - size * 0.27 }} />
      <i className="orbit-track" style={{ inset: size * 0.5 - size * 0.45 }} />
      {ring(inner, size * 0.27, 22, false, Math.round(size * 0.15))}
      {ring(outer, size * 0.45, 34, true, Math.round(size * 0.17))}
      <div className="orbit-center">{center}</div>
    </div>
  )
}
