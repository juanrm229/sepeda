import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { initials } from '../lib/util'
import type { CharConfig } from '../lib/types'
import { HeadBadge } from './Character'

export function Top({ title, back, right, sub }: { title: ReactNode; back?: string | boolean; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="topbar">
      <div className="row" style={{ gap: 12, minWidth: 0 }}>
        {back && (
          <button className="back" aria-label="Kembali" onClick={() => (typeof back === 'string' ? (location.hash = '#/' + back) : history.back())}>
            <ArrowLeft size={18} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          {sub && <div className="mono">{sub}</div>}
          <div className="t">{title}</div>
        </div>
      </div>
      {right}
    </div>
  )
}

export function Avatar({ name, color, size, c }: { name: string; color: string; size?: number; c?: CharConfig }) {
  if (c) return <span title={name} style={{ display: 'inline-flex' }}><HeadBadge c={c} size={size ?? 38} bg={color === '#111111' || color === '#111' ? 'var(--sunken)' : `color-mix(in srgb, ${color} 28%, var(--surface-2))`} /></span>
  const light = /^#(f|e|d)/i.test(color)
  return (
    <div className="avatar" style={{ background: color, color: light ? '#111' : '#fff', ...(size ? { width: size, height: size, fontSize: size * 0.34 } : {}) }} title={name}>
      {initials(name)}
    </div>
  )
}

export function Sheet({ open, onClose, children, title, className = '' }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className={`sheet ${className}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="grab" />
        {title && <h3 style={{ fontSize: 22, marginBottom: 16 }}>{title}</h3>}
        {children}
      </div>
    </div>
  )
}

interface ToastMsg { title: string; sub?: string; icon?: ReactNode }
let pushToast: (m: ToastMsg) => void = () => {}
export const toast = (m: string, sub?: string, icon?: ReactNode) => pushToast({ title: m, sub, icon })

/** Notifikasi ala dynamic island. */
export function Toaster() {
  const [msg, setMsg] = useState<ToastMsg | null>(null)
  const [k, setK] = useState(0)
  useEffect(() => {
    let t: number
    pushToast = (m) => { setMsg(m); setK((x) => x + 1); clearTimeout(t); t = window.setTimeout(() => setMsg(null), 3200) }
  }, [])
  if (!msg) return null
  const emoji = msg.title.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation})\s*/u)
  const title = emoji ? msg.title.slice(emoji[0].length) : msg.title
  return (
    <div key={k} className="island" role="status" onClick={() => setMsg(null)}>
      <span className="island-ico">{msg.icon ?? (emoji ? emoji[1] : <i className="island-dot" />)}</span>
      <span style={{ minWidth: 0 }}>
        <span className="island-t">{title}</span>
        {msg.sub && <span className="island-s">{msg.sub}</span>}
      </span>
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button className={`toggle ${on ? 'on' : ''}`} aria-pressed={on} aria-label={label} onClick={() => onChange(!on)} />
}

export function Stat({ label, value, unit, big }: { label: string; value: ReactNode; unit?: string; big?: boolean }) {
  return (
    <div>
      <div className="mono">{label}</div>
      <div className="num" style={{ fontSize: big ? 34 : 24, marginTop: 4 }}>{value}{unit && <span className="unit">{unit}</span>}</div>
    </div>
  )
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => <button key={o.v} role="tab" aria-selected={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>{o.l}</button>)}
    </div>
  )
}
