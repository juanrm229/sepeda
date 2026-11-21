import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { initials } from '../lib/util'

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

export function Avatar({ name, color, size }: { name: string; color: string; size?: number }) {
  const light = /^#(f|e|d)/i.test(color)
  return (
    <div className="avatar" style={{ background: color, color: light ? '#111' : '#fff', ...(size ? { width: size, height: size, fontSize: size * 0.34 } : {}) }} title={name}>
      {initials(name)}
    </div>
  )
}

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="grab" />
        {title && <h3 style={{ fontSize: 22, marginBottom: 16 }}>{title}</h3>}
        {children}
      </div>
    </div>
  )
}

let pushToast: (m: string) => void = () => {}
export const toast = (m: string) => pushToast(m)

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let t: number
    pushToast = (m) => { setMsg(m); clearTimeout(t); t = window.setTimeout(() => setMsg(null), 2800) }
  }, [])
  return msg ? <div className="toast" role="status">{msg}</div> : null
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
