import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

export function useRoute(): string[] {
  const get = () => (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean)
  const [r, setR] = useState(get)
  useEffect(() => {
    const on = () => {
      const apply = () => { flushSync(() => setR(get())); window.scrollTo({ top: 0 }) }
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
