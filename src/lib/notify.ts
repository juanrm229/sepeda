import type { Reminder } from './types'
import { dayKey } from './util'

export function notifSupported() { return typeof window !== 'undefined' && 'Notification' in window }

export async function askPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notifSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export async function notify(title: string, body: string) {
  if (navigator.vibrate) navigator.vibrate([120, 60, 120])
  if (!notifSupported() || Notification.permission !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, icon: '/icon.svg', badge: '/icon.svg' })
    else new Notification(title, { body, icon: '/icon.svg' })
    return true
  } catch {
    return false
  }
}

export function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'id-ID'
    u.rate = 1.02
    speechSynthesis.speak(u)
  } catch { /* abaikan */ }
}

/** Reminder yang jatuh tempo sekarang (toleransi 2 menit) dan belum dikirim hari ini. */
export function dueReminders(list: Reminder[], now = new Date()): Reminder[] {
  const today = dayKey(now)
  const mins = now.getHours() * 60 + now.getMinutes()
  return list.filter((r) => {
    if (!r.enabled || r.lastFired === today || !r.days.includes(now.getDay())) return false
    const [h, m] = r.time.split(':').map(Number)
    const t = h * 60 + m
    return mins >= t && mins - t <= 2
  })
}

export function nextOccurrence(r: Reminder, from = new Date()): Date | null {
  if (!r.days.length) return null
  const [h, m] = r.time.split(':').map(Number)
  for (let i = 0; i < 8; i++) {
    const d = new Date(from)
    d.setDate(d.getDate() + i)
    d.setHours(h, m, 0, 0)
    if (r.days.includes(d.getDay()) && d > from) return d
  }
  return null
}
