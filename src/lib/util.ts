export const uid = () => Math.random().toString(36).slice(2, 10)

export const fmt = (n: number, d = 0) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d })

export function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}j ${m}m` : `${m}m`
}

export function fmtClock(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const p = (x: number) => String(x).padStart(2, '0')
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
}

export const dayKey = (d: Date) => {
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
export const HARI_PANJANG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function fmtDate(iso: string, withTime = false): string {
  const d = new Date(iso)
  const s = `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`
  if (!withTime) return s
  return `${s} · ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
}

export function relDay(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.round((new Date(dayKey(d)).getTime() - new Date(dayKey(today)).getTime()) / 86400000)
  if (diff === 0) return 'Hari ini'
  if (diff === 1) return 'Besok'
  if (diff === -1) return 'Kemarin'
  if (diff > 1 && diff < 7) return `${diff} hari lagi`
  if (diff < -1 && diff > -7) return `${-diff} hari lalu`
  return fmtDate(iso)
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x))
}

export const BAR_LABEL = (d: Date) => `${d.getDate()} ${BULAN[d.getMonth()]}`
