import kit from './avatar-kit.json'
import type { CharConfig } from './types'

/* ============================================================
   Avatar Modular Kit — 512 bagian raster, kanvas 512×512.
   Proporsi wajah sudah dikalibrasi saat build (mata −12%, alis
   naik, mulut naik & diperbesar, kumis menyesuaikan mulut).
   ============================================================ */

export interface Part { id: string; l: string; z: number; r: [number, number, number, number]; slot?: string; ears?: number; src?: string; seg?: { s: [number, number, number, number]; r: [number, number, number, number] }[]; sz?: [number, number] }
type Cat = keyof typeof kit.cats

export const CATS = kit.cats as unknown as Record<Cat, Part[]>
export const PART: Record<string, Part & { cat: Cat }> = {}
for (const [cat, items] of Object.entries(CATS)) for (const p of items) PART[p.id] = { ...p, cat: cat as Cat }

export const partUrl = (id: string) => `/avatar/${id}.webp`

/** Slot tunggal pada CharConfig dan kategori sumbernya. */
export type Slot = 'head' | 'hair' | 'hijab' | 'eyes' | 'brows' | 'mouth' | 'beard' | 'shirt' | 'hat' | 'eyewear' | 'earrings' | 'neckwear'
export interface TabDef { k: Slot | 'details' | 'acc'; l: string; cat: Cat; optional?: boolean; multi?: boolean; focus: 'face' | 'body' }
export const TABS: TabDef[] = [
  { k: 'head', l: 'Wajah', cat: 'heads', focus: 'face' },
  { k: 'hair', l: 'Rambut', cat: 'hair', optional: true, focus: 'face' },
  { k: 'hijab', l: 'Hijab', cat: 'hijabs', optional: true, focus: 'face' },
  { k: 'eyes', l: 'Mata', cat: 'eyes', focus: 'face' },
  { k: 'brows', l: 'Alis', cat: 'brows', focus: 'face' },
  { k: 'mouth', l: 'Mulut', cat: 'mouths', focus: 'face' },
  { k: 'beard', l: 'Kumis', cat: 'beards', optional: true, focus: 'face' },
  { k: 'shirt', l: 'Baju', cat: 'shirts', focus: 'body' },
  { k: 'hat', l: 'Topi', cat: 'hats', optional: true, focus: 'face' },
  { k: 'eyewear', l: 'Kacamata', cat: 'eyewear', optional: true, focus: 'face' },
  { k: 'earrings', l: 'Anting', cat: 'earrings', optional: true, focus: 'face' },
  { k: 'neckwear', l: 'Kalung', cat: 'neckwear', optional: true, focus: 'body' },
  { k: 'details', l: 'Detail', cat: 'details', multi: true, focus: 'face' },
  { k: 'acc', l: 'Aksesori', cat: 'accessories', multi: true, focus: 'face' },
]

/* ---------------- Item terkunci (gamifikasi) ---------------- */
export interface Req { level?: number; badge?: string }
const LOCKS: Record<string, Req> = {
  'hats-38': { level: 5 }, 'hats-39': { level: 7 }, 'hats-40': { level: 9 }, 'hats-49': { badge: 'squad' }, 'hats-50': { level: 11 },
  'eyewear-21': { badge: 'paspor' }, 'eyewear-22': { badge: 'paspor' }, 'eyewear-23': { level: 8 }, 'eyewear-24': { level: 10 }, 'eyewear-25': { level: 12 },
  'neckwear-04': { badge: '100k' }, 'details-06': { badge: 'squad' },
}
for (let i = 57; i <= 66; i++) LOCKS[`hair-${i}`] = { level: 3 + (i - 57) }
for (let i = 57; i <= 65; i++) LOCKS[`shirts-${i}`] = { level: 2 + (i - 57) }
export const lockOf = (id: string): Req | undefined => LOCKS[id]
export function isUnlocked(id: string, lvl: number, got: Set<string>): boolean {
  const r = LOCKS[id]
  if (!r) return true
  if (r.level && lvl < r.level) return false
  if (r.badge && !got.has(r.badge)) return false
  return true
}
const BADGE_NAMES: Record<string, string> = { everest: 'Lencana Everesting', '1000': 'Lencana Seribu Kilo', squad: 'Lencana Anak Squad', '100k': 'Lencana Century', streak: 'Lencana Konsisten', paspor: 'Lencana Paspor' }
export const reqLabel = (id: string) => { const r = LOCKS[id]; return !r ? '' : r.level ? `Level ${r.level}` : BADGE_NAMES[r.badge!] ?? 'Lencana' }

/* ---------------- Konfigurasi bawaan & aturan ---------------- */
export const defaultChar: CharConfig = {
  head: 'heads-05', hair: 'hair-03', hijab: null, eyes: 'eyes-01', brows: 'brows-02', mouth: 'mouths-02', beard: null,
  shirt: 'shirts-66', hat: 'hats-15', eyewear: null, earrings: null, neckwear: null, details: [], acc: [],
}

/** Bersihkan ID yang tidak ada lagi di katalog (mis. aset rusak yang dikeluarkan). */
export function sanitizeChar(c: CharConfig): CharConfig {
  const ok = (id: string | null) => (id && PART[id] ? id : null)
  return {
    ...c,
    head: ok(c.head) ?? defaultChar.head, eyes: ok(c.eyes) ?? defaultChar.eyes, brows: ok(c.brows) ?? defaultChar.brows,
    mouth: ok(c.mouth) ?? defaultChar.mouth, shirt: ok(c.shirt) ?? defaultChar.shirt,
    hair: ok(c.hair), hijab: ok(c.hijab), beard: ok(c.beard), hat: ok(c.hat), eyewear: ok(c.eyewear), earrings: ok(c.earrings), neckwear: ok(c.neckwear),
    details: (c.details ?? []).filter((d) => PART[d]), acc: (c.acc ?? []).filter((d) => PART[d]),
  }
}

export function isCharConfig(x: unknown): x is CharConfig {
  return !!x && typeof (x as CharConfig).head === 'string' && !!PART[(x as CharConfig).head]
}

/** Terapkan pilihan dengan aturan kit: hijab menyembunyikan rambut & anting, rambut baru melepas hijab, slot aksesori saling menggantikan. */
export function applyPick(c: CharConfig, tab: TabDef, id: string | null): CharConfig {
  const n: CharConfig = { ...c, details: [...c.details], acc: [...c.acc] }
  if (tab.k === 'details' || tab.k === 'acc') {
    if (!id) { n[tab.k] = []; return n }
    const p = PART[id]
    if (tab.k === 'acc' && p.slot) {
      const slot = p.slot as Slot
      ;(n as unknown as Record<string, string | null>)[slot] = (n as unknown as Record<string, string | null>)[slot] === id ? null : id
      return n
    }
    const arr = n[tab.k]
    n[tab.k] = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
    return n
  }
  ;(n as unknown as Record<string, string | null>)[tab.k] = id
  if (tab.k === 'hair' && id) n.hijab = null
  return n
}

/* ---------------- Ekspresi mengikuti mood ---------------- */
export type MoodKey = 'semangat' | 'segar' | 'oke' | 'lelah' | 'kangen'
const MOOD: Record<MoodKey, Partial<Pick<CharConfig, 'eyes' | 'brows' | 'mouth'>>> = {
  semangat: { eyes: 'eyes-27', brows: 'brows-39', mouth: 'mouths-41' },
  segar: { eyes: 'eyes-21', brows: 'brows-08', mouth: 'mouths-16' },
  oke: {},
  lelah: { eyes: 'eyes-33', brows: 'brows-27', mouth: 'mouths-35' },
  kangen: { eyes: 'eyes-28', brows: 'brows-05', mouth: 'mouths-06' },
}

/** Daftar bagian siap gambar, urut zIndex. */
export function layers(c: CharConfig, mood?: MoodKey): (Part & { cat: Cat })[] {
  const m = mood ? MOOD[mood] : {}
  const ids = [c.head, c.shirt, m.eyes ?? c.eyes, m.brows ?? c.brows, m.mouth ?? c.mouth, c.beard, c.hijab ? null : c.hair, c.hijab, c.hat, c.eyewear, c.hijab ? null : c.earrings, c.neckwear, ...c.details, ...c.acc]
  // rambut yang menutupi telinga → kepala varian tanpa telinga (rambut sudah diperkecil)
  const earless = !c.hijab && !!c.hair && !!PART[c.hair]?.ears
  return ids.filter((x): x is string => !!x && !!PART[x]).map((id) => (id === c.head && earless ? { ...PART[id], src: `${id}-ne` } : PART[id])).sort((a, b) => a.z - b.z)
}

/** Avatar acak dari item yang tidak terkunci. */
export function randomChar(seed = Math.random() * 1e9, opts: { hijab?: boolean } = {}): CharConfig {
  let s = Math.floor(seed) % 233280
  const r = (n: number) => { s = (s * 9301 + 49297) % 233280; return Math.floor((s / 233280) * n) }
  const pick = (cat: Cat, max?: number) => { const list = CATS[cat].filter((p) => !LOCKS[p.id]); return list[r(Math.min(max ?? list.length, list.length))].id }
  const hijab = opts.hijab ?? r(5) === 0
  return {
    head: pick('heads'), hair: hijab ? null : pick('hair'), hijab: hijab ? pick('hijabs') : null,
    eyes: pick('eyes', 24), brows: pick('brows', 24), mouth: pick('mouths', 24), beard: !hijab && r(6) === 0 ? pick('beards') : null,
    shirt: pick('shirts'), hat: r(3) === 0 ? pick('hats', 30) : null, eyewear: r(4) === 0 ? pick('eyewear', 20) : null,
    earrings: null, neckwear: r(6) === 0 ? pick('neckwear') : null, details: [], acc: [],
  }
}

/* ---------------- Ekspor PNG (canvas) ---------------- */
const imgCache = new Map<string, Promise<HTMLImageElement>>()
function loadImg(src: string) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src }))
  return imgCache.get(src)!
}
export async function drawAvatar(g: CanvasRenderingContext2D, c: CharConfig, x: number, y: number, size: number, mood?: MoodKey, view: [number, number, number] = [0, 0, 512]) {
  const [vx, vy, vs] = view
  const k = size / vs
  for (const p of layers(c, mood)) {
    const im = await loadImg(partUrl(p.src ?? p.id))
    if (p.seg && p.sz) {
      const fx = im.naturalWidth / p.sz[0], fy = im.naturalHeight / p.sz[1]
      for (const sgm of p.seg) {
        const [sx0, sy0, sx1, sy1] = sgm.s
        g.drawImage(im, sx0 * fx, sy0 * fy, (sx1 - sx0) * fx, (sy1 - sy0) * fy, x + (sgm.r[0] - vx) * k, y + (sgm.r[1] - vy) * k, sgm.r[2] * k, sgm.r[3] * k)
      }
    } else g.drawImage(im, x + (p.r[0] - vx) * k, y + (p.r[1] - vy) * k, p.r[2] * k, p.r[3] * k)
  }
}
