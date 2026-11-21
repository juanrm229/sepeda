import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
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
  const [shown, setShown] = useState(open)
  const [closing, setClosing] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) { setShown(true); setClosing(false) }
    else if (shown) { setClosing(true); const t = setTimeout(() => { setShown(false); setClosing(false) }, 220); return () => clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    const prev = document.activeElement as HTMLElement | null
    setTimeout(() => box.current?.focus(), 30)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', on); document.body.style.overflow = ''; prev?.focus?.() }
  }, [open, onClose])
  if (!shown) return null
  return (
    <div className={`sheet-bg ${closing ? 'closing' : ''}`} onClick={onClose}>
      <div ref={box} tabIndex={-1} className={`sheet ${className}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="grab" />
        {title && <h3 style={{ fontSize: 22, marginBottom: 16 }}>{title}</h3>}
        {children}
      </div>
    </div>
  )
}

/* ---------- Dialog konfirmasi (pengganti confirm() bawaan) ---------- */
interface ConfirmReq { title: string; body?: string; ok?: string; danger?: boolean; resolve: (v: boolean) => void }
let pushConfirm: (r: ConfirmReq) => void = () => {}
export const confirmDialog = (title: string, opts: { body?: string; ok?: string; danger?: boolean } = {}) =>
  new Promise<boolean>((resolve) => pushConfirm({ title, ...opts, resolve }))

export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmReq | null>(null)
  useEffect(() => { pushConfirm = setReq }, [])
  const done = (v: boolean) => { req?.resolve(v); setReq(null) }
  return (
    <Sheet open={!!req} onClose={() => done(false)}>
      {req && (
        <div className="stack" style={{ textAlign: 'center', paddingTop: 4 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto', display: 'grid', placeItems: 'center', background: req.danger ? 'color-mix(in srgb, var(--bad) 14%, transparent)' : 'var(--sunken)', color: req.danger ? 'var(--bad)' : 'var(--ink)', fontSize: 24 }}>{req.danger ? '!' : '?'}</div>
          <h3 className="display" style={{ fontSize: 24 }}>{req.title}</h3>
          {req.body && <p className="small ink2">{req.body}</p>}
          <div className="grid2" style={{ marginTop: 8 }}>
            <button className="btn ghost" onClick={() => done(false)}>Batal</button>
            <button className="btn" style={{ background: req.danger ? 'var(--bad)' : 'var(--ink)', color: req.danger ? '#fff' : 'var(--bg)' }} onClick={() => done(true)} autoFocus>{req.ok ?? 'Ya, lanjut'}</button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

/* ---------- Haptik & perayaan ---------- */
export const haptic = (ms: number | number[] = 8) => { try { navigator.vibrate?.(ms) } catch { /* */ } }

export function celebrate(power = 1) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const c = document.createElement('canvas')
  c.className = 'confetti'
  c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio
  document.body.appendChild(c)
  const g = c.getContext('2d')!
  g.scale(devicePixelRatio, devicePixelRatio)
  const colors = ['#ff4d1f', '#111111', '#f3d40b', '#d6f06a', '#2f6fed', '#ffffff']
  const N = Math.round(120 * power)
  const ps = Array.from({ length: N }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 5,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, c: colors[Math.floor(Math.random() * colors.length)], dot: Math.random() < 0.3,
  }))
  const t0 = performance.now()
  const tick = (now: number) => {
    const t = now - t0
    g.clearRect(0, 0, innerWidth, innerHeight)
    for (const p of ps) {
      p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - t / 2600); g.fillStyle = p.c
      if (p.dot) { g.beginPath(); g.arc(0, 0, p.h, 0, 7); g.fill() } else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      g.restore()
    }
    if (t < 2600) requestAnimationFrame(tick); else c.remove()
  }
  requestAnimationFrame(tick)
  haptic([12, 40, 18])
}

/* ---------- Penangkap error ---------- */
export class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error('Kayuh error', err, info.componentStack) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div style={{ minHeight: '70dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="card outline" style={{ maxWidth: 420, textAlign: 'center' }}>
          <div className="dot" style={{ fontSize: 64 }}>:(</div>
          <h3 className="display" style={{ fontSize: 26, marginTop: 8 }}>Rantainya lepas sebentar</h3>
          <p className="small ink2" style={{ marginTop: 6 }}>Ada yang tidak beres di halaman ini. Datamu aman di perangkat.</p>
          <div className="grid2" style={{ marginTop: 16 }}>
            <button className="btn ghost" onClick={() => { this.setState({ err: null }); location.hash = '#/' }}>Ke beranda</button>
            <button className="btn ink" onClick={() => location.reload()}>Muat ulang</button>
          </div>
        </div>
      </div>
    )
  }
}

/* ---------- Skeleton ---------- */
export function Skeleton({ h = 16, w = '100%', r = 10, style }: { h?: number; w?: number | string; r?: number; style?: React.CSSProperties }) {
  return <span className="skel" style={{ height: h, width: w, borderRadius: r, ...style }} />
}

interface ToastMsg { title: string; sub?: string; icon?: ReactNode }
let pushToast: (m: ToastMsg) => void = () => {}
export const toast = (m: string, sub?: string, icon?: ReactNode) => pushToast({ title: m, sub, icon })

/** Notifikasi ala dynamic island. */
export function Toaster() {
  const [msg, setMsg] = useState<ToastMsg | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [k, setK] = useState(0)
  useEffect(() => {
    let t: number, t2: number
    pushToast = (m) => {
      setMsg(m); setLeaving(false); setK((x) => x + 1); haptic(10)
      clearTimeout(t); clearTimeout(t2)
      t = window.setTimeout(() => setLeaving(true), 3000)
      t2 = window.setTimeout(() => setMsg(null), 3350)
    }
  }, [])
  if (!msg) return null
  const emoji = msg.title.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation})\uFE0F?\s*/u)
  const title = emoji ? msg.title.slice(emoji[0].length) : msg.title
  return (
    <div key={k} className={`island ${leaving ? 'leaving' : ''}`} role="status" aria-live="polite" onClick={() => setLeaving(true)}>
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

/** Tab pill dengan indikator yang meluncur. */
export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  const idx = Math.max(0, options.findIndex((o) => o.v === value))
  return (
    <div className="tabs" role="tablist" style={{ position: 'relative' }}>
      <i className="tabs-ind" style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }} />
      {options.map((o) => <button key={o.v} role="tab" aria-selected={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => { haptic(6); onChange(o.v) }}>{o.l}</button>)}
    </div>
  )
}

/** Animasi angka naik saat muncul. */
export function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(target); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      setV(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}
