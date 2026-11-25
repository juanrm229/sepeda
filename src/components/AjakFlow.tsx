import { lazy, Suspense, useEffect, useState } from 'react'
import type { GroupRide, Pace } from '../lib/types'

const AjakSheetLazy = lazy(() => import('./AjakSheet'))

/* ---------- Pemicu global (FAB, beranda, titik temu, perencana rute) ---------- */
let pushOpen: (p?: Partial<GroupRide>) => void = () => {}
export const openAjak = (preset?: Partial<GroupRide>) => pushOpen(preset)
const subs = new Set<(o: boolean) => void>()
let isOpen = false
const setOpenFlag = (o: boolean) => { isOpen = o; subs.forEach((f) => f(o)) }
/** Status sheet Ajak terbuka (untuk FAB berubah jadi ×). */
export function useAjakOpen() {
  const [o, setO] = useState(isOpen)
  useEffect(() => { subs.add(setO); return () => { subs.delete(setO) } }, [])
  return o
}

export function AjakHost() {
  const [state, setState] = useState<{ open: boolean; preset?: Partial<GroupRide>; k: number }>({ open: false, k: 0 })
  useEffect(() => { pushOpen = (preset) => setState((s) => ({ open: true, preset, k: s.k + 1 })) }, [])
  useEffect(() => { setOpenFlag(state.open) }, [state.open])
  if (!state.k) return null
  return <Suspense fallback={null}><AjakSheetLazy key={state.k} open={state.open} preset={state.preset} onClose={() => setState((s) => ({ ...s, open: false }))} /></Suspense>
}

/** Sheet alur ajak (dimuat saat dibutuhkan). */
export function AjakSheet(props: { open: boolean; onClose: () => void; preset?: Partial<GroupRide> }) {
  if (!props.open) return null
  return <Suspense fallback={null}><AjakSheetLazy {...props} /></Suspense>
}

export const PACE: Record<Pace, { l: string; spd: string; v: number }> = {
  santai: { l: 'Santai', spd: '18–22 km/j', v: 20 },
  sedang: { l: 'Sedang', spd: '23–27 km/j', v: 25 },
  kencang: { l: 'Kencang', spd: '28+ km/j', v: 29 },
}
