import type { CharConfig } from '../lib/types'
import type { Mood } from '../lib/character'
import { AvatarImg } from './Character'
import { fmt } from '../lib/util'

const MOOD_LABEL: Record<Mood, string> = { semangat: 'Semangat', segar: 'Segar', oke: 'Stabil', lelah: 'Lelah', kangen: 'Kangen gowes' }
const MOOD_DOT: Record<Mood, string> = { semangat: 'var(--accent)', segar: 'var(--good)', oke: 'var(--ink-2)', lelah: 'var(--warn)', kangen: 'var(--muted)' }

export interface CardProps {
  c: CharConfig; mood: Mood; name: string; className: string; emblem: string; subClass?: string
  lvl: number; xpCur: number; xpNext: number; totalKm?: number; streak?: number; rides?: number; line?: string
  no?: string; compact?: boolean
}

/** Kartu identitas pesepeda — tenang, satu fokus. */
export function CharacterCard(p: CardProps) {
  const bg = `#${p.c.bg ?? 'e9e2d0'}`
  const pct = Math.max(0, Math.min(1, p.xpCur / Math.max(1, p.xpNext)))
  if (p.compact) {
    return (
      <div className="ccard ccard-compact">
        <div className="ccard-photo" style={{ background: bg }}>
          <AvatarImg c={p.c} mood={p.mood} size={132} className="ccard-avatar" label={`Avatar ${p.name}`} />
        </div>
        <div className="ccard-meta">
          <div className="mono">Lv {p.lvl} · {p.emblem} {p.className}</div>
          <div className="ccard-name">{p.name}</div>
          <div className="ccard-xp"><i style={{ width: `${pct * 100}%` }} /></div>
          {p.line && <p className="small ink2 ccard-line">{p.line}</p>}
          <span className="ccard-mood"><i style={{ background: MOOD_DOT[p.mood] }} />{MOOD_LABEL[p.mood]}</span>
        </div>
      </div>
    )
  }
  return (
    <div className="ccard">
      <div className="ccard-photo" style={{ background: bg }}>
        <span className="ccard-chip">No. {p.no ?? String(p.lvl).padStart(3, '0')}</span>
        <span className="ccard-chip ccard-chip-r">Lv {p.lvl}</span>
        <AvatarImg c={p.c} mood={p.mood} size={300} className="ccard-avatar" label={`Avatar ${p.name}`} />
      </div>
      <div className="ccard-body">
        <div className="row between" style={{ alignItems: 'flex-end', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div className="ccard-name">{p.name}</div>
            <div className="ccard-class">{p.emblem} {p.className}{p.subClass ? <span className="muted"> · {p.subClass}</span> : null}</div>
          </div>
          <span className="ccard-mood"><i style={{ background: MOOD_DOT[p.mood] }} />{MOOD_LABEL[p.mood]}</span>
        </div>
        <div className="ccard-stats">
          <div><span className="mono">Level</span><b>{p.lvl}</b></div>
          <div><span className="mono">Total km</span><b>{fmt(p.totalKm ?? 0)}</b></div>
          <div><span className="mono">Streak</span><b>{p.streak ?? 0}<small> mgg</small></b></div>
        </div>
        <div className="ccard-xprow">
          <div className="ccard-xp"><i style={{ width: `${pct * 100}%` }} /></div>
          <span className="mono">{fmt(p.xpCur)} / {fmt(p.xpNext)} XP</span>
        </div>
        {p.line && <p className="small ink2" style={{ marginTop: 12 }}>“{p.line}”</p>}
      </div>
    </div>
  )
}
