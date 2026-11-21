import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

export function useRoute(): string[] {
  const get = () => (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean)
  const [r, setR] = useState(get)
  useEffect(() => {
    const on = () => {
      const apply = () => { flushSync(() => setR(get())); window.scrollTo({ top: 0 }) }
      const d = document as Document & { startViewTransition?: (cb: () => void) => unknown }
      if (d.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) d.startViewTransition(apply)
      else apply()
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export const go = (path: string) => { location.hash = '#/' + path.replace(/^\//, '') }
