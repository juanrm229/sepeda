import { createAvatar } from '@dicebear/core'
import * as lorelei from '@dicebear/lorelei'
import type { CharConfig } from './types'

/* ============================================================
   Avatar profil — DiceBear "Lorelei" (desain Lisa Wischofsky, CC0;
   kode MIT). SVG vektor, offline, tanpa aset gambar terpisah.
   ============================================================ */

const P = lorelei.schema.properties as Record<string, { items?: { enum?: string[] } }>
const sorted = (k: string) => [...(P[k]?.items?.enum ?? [])].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))

export const VARIANTS = {
  head: sorted('head'),
  hair: sorted('hair'),
  eyes: sorted('eyes'),
  eyebrows: sorted('eyebrows'),
  mouth: [...sorted('mouth').filter((m) => m.startsWith('happy')), ...sorted('mouth').filter((m) => m.startsWith('sad'))],
  nose: sorted('nose'),
  glasses: sorted('glasses'),
  earrings: sorted('earrings'),
  beard: sorted('beard'),
}

export const SKINS = ['fbe3d1', 'f6d3b8', 'eec09b', 'e2a87d', 'c68a5f', 'a96f4a', '8d5a3b', '6b4329']
export const HAIR_COLORS = ['111111', '2b1d16', '5a3a22', '8b5a2b', 'c79a5b', 'e6c27a', '8a8a85', 'ece8df', 'd93d14', 'e87ba4', '2f6fed', '1f9d6a', '9b6fd6']
export const ACC_COLORS = ['111111', '5a3a22', 'c9a227', 'd93d14', '2f6fed']
/** Latar kartu karakter — pastel tenang. */
export const CARD_BGS = ['e9e2d0', 'dfe7d6', 'd9e4ee', 'f1dcd6', 'e3dcef', 'f3e3b8', 'd7d6d1', '2b2a27']

/* ---------------- Tab lemari karakter ---------------- */
export type VariantKey = keyof typeof VARIANTS
export type TabDef =
  | { k: VariantKey; l: string; kind: 'variant'; optional?: boolean }
  | { k: 'skin' | 'hairColor' | 'accColor' | 'bg'; l: string; kind: 'color'; palette: string[] }
  | { k: 'extras'; l: string; kind: 'toggles' }

export const TABS: TabDef[] = [
  { k: 'head', l: 'Wajah', kind: 'variant' },
  { k: 'skin', l: 'Kulit', kind: 'color', palette: SKINS },
  { k: 'hair', l: 'Rambut', kind: 'variant' },
  { k: 'hairColor', l: 'Warna rambut', kind: 'color', palette: HAIR_COLORS },
  { k: 'eyes', l: 'Mata', kind: 'variant' },
  { k: 'eyebrows', l: 'Alis', kind: 'variant' },
  { k: 'mouth', l: 'Mulut', kind: 'variant' },
  { k: 'nose', l: 'Hidung', kind: 'variant' },
  { k: 'glasses', l: 'Kacamata', kind: 'variant', optional: true },
  { k: 'earrings', l: 'Anting', kind: 'variant', optional: true },
  { k: 'beard', l: 'Janggut', kind: 'variant', optional: true },
  { k: 'extras', l: 'Ekstra', kind: 'toggles' },
  { k: 'accColor', l: 'Warna aksesori', kind: 'color', palette: ACC_COLORS },
  { k: 'bg', l: 'Latar kartu', kind: 'color', palette: CARD_BGS },
]

/** Nama ramah untuk varian (Lorelei tidak memberi nama). */
export function variantLabel(k: VariantKey, v: string): string {
  const n = parseInt(v.replace(/\D/g, ''), 10)
  if (k === 'mouth') return `${v.startsWith('sad') ? 'Datar' : 'Senyum'} ${n}`
  const names: Record<VariantKey, string> = { head: 'Wajah', hair: 'Rambut', eyes: 'Mata', eyebrows: 'Alis', mouth: 'Mulut', nose: 'Hidung', glasses: 'Kacamata', earrings: 'Anting', beard: 'Janggut' }
  return `${names[k]} ${n}`
}

/* ---------------- Item terkunci (gamifikasi) ---------------- */
export interface Req { level?: number; badge?: string }
const LOCKS: Record<string, Req> = {
  'hairColor:d93d14': { level: 3 }, 'hairColor:e87ba4': { level: 5 }, 'hairColor:2f6fed': { level: 7 }, 'hairColor:1f9d6a': { level: 9 }, 'hairColor:9b6fd6': { level: 11 },
  'accColor:c9a227': { level: 4 }, 'accColor:d93d14': { badge: 'streak' },
  'glasses:variant05': { badge: 'paspor' }, 'earrings:variant03': { level: 6 }, 'extras:flowers': { badge: 'squad' },
}
export const lockKey = (k: string, v: string) => `${k}:${v}`
export const lockOf = (key: string): Req | undefined => LOCKS[key]
export function isUnlocked(key: string, lvl: number, got: Set<string>): boolean {
  const r = LOCKS[key]
  if (!r) return true
  if (r.level && lvl < r.level) return false
  if (r.badge && !got.has(r.badge)) return false
  return true
}
const BADGE_NAMES: Record<string, string> = { everest: 'Lencana Everesting', '1000': 'Lencana Seribu Kilo', squad: 'Lencana Anak Squad', '100k': 'Lencana Century', streak: 'Lencana Konsisten', paspor: 'Lencana Paspor' }
export const reqLabel = (key: string) => { const r = LOCKS[key]; return !r ? '' : r.level ? `Level ${r.level}` : BADGE_NAMES[r.badge!] ?? 'Lencana' }

/* ---------------- Konfigurasi ---------------- */
export const defaultChar: CharConfig = {
  v: 2, head: 'variant02', hair: 'variant10', eyes: 'variant16', eyebrows: 'variant06', mouth: 'happy01', nose: 'variant01',
  glasses: null, earrings: null, beard: null, freckles: false, flowers: false, skin: 'f6d3b8', hairColor: '5a3a22', accColor: '111111', bg: 'e9e2d0',
}

export function isCharConfig(x: unknown): x is CharConfig {
  return !!x && (x as CharConfig).v === 2 && typeof (x as CharConfig).hair === 'string'
}

const inEnum = (k: VariantKey, v: string | null | undefined) => (v && VARIANTS[k].includes(v) ? v : null)
const hex = (v: unknown, d: string) => (typeof v === 'string' && /^[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d)

/** Pastikan semua nilai valid. */
export function sanitizeChar(c: CharConfig): CharConfig {
  return {
    v: 2,
    head: inEnum('head', c.head) ?? defaultChar.head, hair: inEnum('hair', c.hair) ?? defaultChar.hair, eyes: inEnum('eyes', c.eyes) ?? defaultChar.eyes,
    eyebrows: inEnum('eyebrows', c.eyebrows) ?? defaultChar.eyebrows, mouth: inEnum('mouth', c.mouth) ?? defaultChar.mouth, nose: inEnum('nose', c.nose) ?? defaultChar.nose,
    glasses: inEnum('glasses', c.glasses), earrings: inEnum('earrings', c.earrings), beard: inEnum('beard', c.beard),
    freckles: !!c.freckles, flowers: !!c.flowers, skin: hex(c.skin, defaultChar.skin), hairColor: hex(c.hairColor, defaultChar.hairColor), accColor: hex(c.accColor, defaultChar.accColor), bg: hex(c.bg, 'e9e2d0'),
  }
}

function rng(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296 }
}

/** Avatar acak (deterministik bila diberi seed) dari item yang tidak terkunci. */
export function randomChar(seed: string | number = Math.random().toString(36)): CharConfig {
  const r = rng(String(seed))
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const freeHair = HAIR_COLORS.filter((h) => !LOCKS[lockKey('hairColor', h)])
  return {
    v: 2, head: pick(VARIANTS.head), hair: pick(VARIANTS.hair), eyes: pick(VARIANTS.eyes), eyebrows: pick(VARIANTS.eyebrows),
    mouth: pick(VARIANTS.mouth.filter((m) => m.startsWith('happy'))), nose: pick(VARIANTS.nose),
    glasses: r() < 0.22 ? pick(VARIANTS.glasses.slice(0, 4)) : null, earrings: r() < 0.18 ? pick(VARIANTS.earrings.slice(0, 2)) : null, beard: r() < 0.12 ? pick(VARIANTS.beard) : null,
    freckles: r() < 0.15, flowers: false, skin: pick(SKINS), hairColor: pick(freeHair), accColor: '111111', bg: pick(CARD_BGS.slice(0, 7)),
  }
}

/** Terapkan pilihan dari lemari. */
export function applyPick(c: CharConfig, tab: TabDef, value: string | null): CharConfig {
  if (tab.kind === 'toggles') {
    if (value === 'freckles') return { ...c, freckles: !c.freckles }
    if (value === 'flowers') return { ...c, flowers: !c.flowers }
    return { ...c, freckles: false, flowers: false }
  }
  if (tab.kind === 'color') return { ...c, [tab.k]: value ?? (tab.k === 'skin' ? defaultChar.skin : '111111') }
  return { ...c, [tab.k]: value }
}

/* ---------------- Ekspresi mengikuti mood ---------------- */
export type MoodKey = 'semangat' | 'segar' | 'oke' | 'lelah' | 'kangen'
const MOOD: Record<MoodKey, Partial<Pick<CharConfig, 'eyes' | 'eyebrows' | 'mouth'>>> = {
  semangat: { eyes: 'variant09', eyebrows: 'variant12', mouth: 'happy16' },
  segar: { eyes: 'variant19', eyebrows: 'variant06', mouth: 'happy05' },
  oke: {},
  lelah: { eyes: 'variant03', eyebrows: 'variant02', mouth: 'sad05' },
  kangen: { eyes: 'variant12', eyebrows: 'variant05', mouth: 'sad04' },
}

/* ---------------- Render SVG (dengan cache) ---------------- */
const cache = new Map<string, string>()

/** Data URI SVG avatar. */
export function avatarUri(c: CharConfig, mood?: MoodKey): string {
  const s = isCharConfig(c) ? c : defaultChar
  const m = mood ? MOOD[mood] : {}
  const key = JSON.stringify({ ...s, bg: undefined }) + (mood ?? '')
  const hit = cache.get(key)
  if (hit) return hit
  const uri = createAvatar(lorelei, {
    seed: 'kayuh',
    head: [s.head], hair: [s.hair], eyes: [m.eyes ?? s.eyes], eyebrows: [m.eyebrows ?? s.eyebrows], mouth: [m.mouth ?? s.mouth], nose: [s.nose],
    glasses: [s.glasses ?? 'variant01'], glassesProbability: s.glasses ? 100 : 0,
    earrings: [s.earrings ?? 'variant01'], earringsProbability: s.earrings ? 100 : 0,
    beard: [s.beard ?? 'variant01'], beardProbability: s.beard ? 100 : 0,
    freckles: ['variant01'], frecklesProbability: s.freckles ? 100 : 0,
    hairAccessories: ['flowers'], hairAccessoriesProbability: s.flowers ? 100 : 0,
    skinColor: [s.skin], hairColor: [s.hairColor], glassesColor: [s.accColor], earringsColor: [s.accColor], hairAccessoriesColor: ['d93d14'],
  } as Parameters<typeof createAvatar>[1]).toDataUri()
  if (cache.size > 600) cache.clear()
  cache.set(key, uri)
  return uri
}

/* ---------------- Ekspor PNG (canvas) ---------------- */
export async function drawAvatar(g: CanvasRenderingContext2D, c: CharConfig, x: number, y: number, size: number, mood?: MoodKey) {
  const im = new Image()
  im.src = avatarUri(c, mood)
  await im.decode()
  g.drawImage(im, x, y, size, size)
}

/* ---------------- Migrasi dari Avatar Modular Kit ---------------- */
const KIT_HAIR: Record<string, string> = { '01': '111111', '02': 'e6c27a', '03': '6b3a1f', '04': 'b5532a', '08': 'd96b4f', '10': 'b9b8b3', '13': 'e6c27a', '14': '111111', '17': 'a8322a', '19': '111111', '23': 'e6c27a', '24': '4a2a17', '25': 'a8322a', '26': '5a3a22', '28': '111111', '30': 'b9b8b3', '31': '8e3b24', '32': '1f9d6a', '33': 'e87ba4', '34': '9b6fd6', '35': '111111', '36': '5a3a22', '37': 'e6c27a', '39': '111111', '40': 'a8322a', '41': 'e6c27a', '42': '111111', '43': '4a2a17', '44': 'e6c27a', '45': 'b5532a', '46': '111111', '47': '111111', '48': '6b3a1f', '49': 'b9b8b3', '50': 'e87ba4', '51': '8e3b24', '52': 'e6c27a', '53': '111111', '54': '8fa883', '55': '2f4f7f', '57': '111111', '58': '5a3a22', '59': 'b5532a', '60': 'e6c27a', '61': '111111', '62': '7d4fc4', '63': '111111', '64': '2b1d16', '65': '5a3a22', '66': 'c4622d' }
const KIT_SKIN = ['f6d3b8', 'eec09b', 'e2a87d', '8d5a3b']

/** Ubah avatar versi lama (kit raster) menjadi Lorelei, mempertahankan warna kulit & rambut. */
export function migrateLegacy(old: unknown, seed: string): CharConfig {
  const o = (old ?? {}) as Record<string, unknown>
  const base = randomChar(seed)
  if (typeof o.head !== 'string' || !o.head.startsWith('heads-')) return base
  const n = parseInt(o.head.split('-')[1], 10) || 1
  const hairId = typeof o.hair === 'string' ? o.hair.split('-')[1] : null
  return sanitizeChar({
    ...base,
    skin: KIT_SKIN[Math.min(3, Math.floor((n - 1) / 4))],
    hairColor: hairId ? KIT_HAIR[hairId] ?? '3a2416' : base.hairColor,
    hair: hairId ? VARIANTS.hair[(parseInt(hairId, 10) - 1) % VARIANTS.hair.length] : base.hair,
    glasses: o.eyewear ? 'variant01' : null,
    earrings: o.earrings ? 'variant01' : null,
    beard: o.beard ? 'variant01' : null,
    freckles: Array.isArray(o.details) && o.details.some((d) => d === 'details-01' || d === 'details-02'),
  })
}
