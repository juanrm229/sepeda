import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

const TABS = ['', 'squad', 'meet', 'rute']
const parse = () => (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean)

/** Arah transisi: tab kiri/kanan, masuk lebih dalam, atau kembali. */
function direction(from: string[], to: string[]): 'tab-l' | 'tab-r' | 'fwd' | 'back' | 'fade' {
  const fa = from[0] ?? '', ta = to[0] ?? ''
  if (from.length <= 1 && to.length <= 1 && TABS.includes(fa) && TABS.includes(ta)) return TABS.indexOf(ta) > TABS.indexOf(fa) ? 'tab-r' : 'tab-l'
  if (to.length > from.length || (fa === '' && ta !== '')) return 'fwd'
  if (to.length < from.length || ta === '') return 'back'
  return 'fade'
}

export function useRoute(): string[] {
  const [r, setR] = useState(parse)
  useEffect(() => {
    let prev = parse()
    const on = () => {
      const next = parse()
      document.documentElement.dataset.nav = direction(prev, next)
      prev = next
      const apply = () => { flushSync(() => setR(next)); window.scrollTo({ top: 0 }) }
      const d = document as unknown as { startViewTransition?: (cb: () => void) => unknown }
      if (d.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        try {
          const vt = d.startViewTransition(apply) as { finished?: Promise<void>; ready?: Promise<void>; updateCallbackDone?: Promise<void> }
          vt.finished?.catch(() => {}); vt.ready?.catch(() => {}); vt.updateCallbackDone?.catch(() => {})
        } catch { apply() }
      } else apply()
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export const go = (path: string) => { location.hash = '#/' + path.replace(/^\//, '') }
