import { useEffect, useState } from 'react'

/** Buka layar daftar/masuk dari mana saja (mis. Profil, mode tamu). */
type Step = 'signup' | 'login'
const subs = new Set<(s: Step | null) => void>()
export const openAuth = (s: Step = 'signup') => subs.forEach((f) => f(s))
export const closeAuth = () => subs.forEach((f) => f(null))
export function useAuthOpen() {
  const [s, setS] = useState<Step | null>(null)
  useEffect(() => { subs.add(setS); return () => { subs.delete(setS) } }, [])
  return s
}
