import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Bike, CharConfig, EventGoal, Friend, GroupRide, Plan, Reminder, Ride, RoutePlan, Rsvp, Settings, Vote } from './types'
import { applyRidesToBikes, defaultSettings, MY_AVAIL, seedAvail, seedBikes, seedFriends, seedGroupRides, seedPlan, seedReminders, seedRides } from './seed'
import { defaultChar, isCharConfig, migrateLegacy, sanitizeChar } from './avatar'

interface State {
  rides: Ride[]
  friends: Friend[]
  groupRides: GroupRide[]
  reminders: Reminder[]
  bikes: Bike[]
  settings: Settings
  activeBikeId: string
  onboarded: boolean
  char: CharConfig
  plan: Plan
  event: EventGoal | null
  routes: RoutePlan[]
  /** Ketersediaan mingguan saya (bitmask, lihat lib/meetup). */
  avail: number
  setAvail: (m: number) => void
  setMyVote: (id: string, v: Vote) => void
  checkin: (id: string, key: string, on?: boolean) => void
  upsertRoute: (r: RoutePlan) => void
  deleteRoute: (id: string) => void
  setChar: (c: CharConfig) => void
  finishOnboarding: (useDemo: boolean) => void
  setPlan: (p: Plan) => void
  setEvent: (e: EventGoal | null) => void
  setRideFeel: (id: string, feel: number, rpe: number) => void
  addRide: (r: Ride) => void
  deleteRide: (id: string) => void
  addFriend: (f: Friend) => void
  removeFriend: (id: string) => void
  upsertGroupRide: (g: GroupRide) => void
  deleteGroupRide: (id: string) => void
  setMyRsvp: (id: string, r: Rsvp) => void
  upsertReminder: (r: Reminder) => void
  deleteReminder: (id: string) => void
  markReminderFired: (id: string, day: string) => void
  resetComponent: (bikeId: string, compId: string) => void
  setActiveBike: (id: string) => void
  updateSettings: (s: Partial<Settings>) => void
  resetDemo: () => void
  clearAll: () => void
}

function demo() {
  const rides = seedRides()
  return {
    rides,
    friends: seedFriends,
    groupRides: seedGroupRides(),
    reminders: seedReminders,
    bikes: applyRidesToBikes(seedBikes, rides),
    plan: seedPlan(),
    event: { name: 'Gran Fondo Sentul', date: (() => { const d = new Date(); d.setDate(d.getDate() + 13); d.setHours(6, 0, 0, 0); return d.toISOString() })(), km: 100 } as EventGoal,
  }
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...demo(),
      settings: defaultSettings,
      activeBikeId: 'bike-1',
      onboarded: false,
      char: defaultChar,
      routes: [],
      avail: MY_AVAIL,
      setAvail: (m) => set({ avail: m }),
      setMyVote: (id, v) => set((s) => ({ groupRides: s.groupRides.map((g) => (g.id === id ? { ...g, myVote: { ...g.myVote, ...v } } : g)) })),
      checkin: (id, key, on = true) => set((s) => ({ groupRides: s.groupRides.map((g) => { if (g.id !== id) return g; const ck = { ...(g.checkins ?? {}) }; if (on) ck[key] = new Date().toISOString(); else delete ck[key]; return { ...g, checkins: ck } }) })),
      upsertRoute: (r) => set((s) => ({ routes: s.routes.some((x) => x.id === r.id) ? s.routes.map((x) => (x.id === r.id ? r : x)) : [r, ...s.routes] })),
      deleteRoute: (id) => set((s) => ({ routes: s.routes.filter((r) => r.id !== id) })),
      setChar: (c) => set({ char: c }),
      finishOnboarding: (useDemo) => set(useDemo ? { onboarded: true } : { onboarded: true, rides: [], groupRides: [], routes: [], bikes: seedBikes.map((b) => ({ ...b, odometerKm: 0, components: b.components.map((c) => ({ ...c, usedKm: 0 })) })) }),
      setPlan: (p) => set({ plan: p }),
      setEvent: (e) => set({ event: e }),
      setRideFeel: (id, feel, rpe) => set((s) => ({ rides: s.rides.map((r) => (r.id === id ? { ...r, feel, rpe } : r)) })),
      addRide: (r) =>
        set((s) => ({
          rides: [...s.rides, r].sort((a, b) => a.date.localeCompare(b.date)),
          bikes: s.bikes.map((b) =>
            b.id === (r.bikeId ?? s.activeBikeId)
              ? { ...b, odometerKm: Math.round(b.odometerKm + r.distanceKm), components: b.components.map((c) => ({ ...c, usedKm: Math.round(c.usedKm + r.distanceKm) })) }
              : b,
          ),
        })),
      deleteRide: (id) => set((s) => ({ rides: s.rides.filter((r) => r.id !== id) })),
      addFriend: (f) => set((s) => ({ friends: [...s.friends, f] })),
      removeFriend: (id) => set((s) => ({ friends: s.friends.filter((f) => f.id !== id) })),
      upsertGroupRide: (g) =>
        set((s) => ({ groupRides: s.groupRides.some((x) => x.id === g.id) ? s.groupRides.map((x) => (x.id === g.id ? g : x)) : [...s.groupRides, g] })),
      deleteGroupRide: (id) => set((s) => ({ groupRides: s.groupRides.filter((g) => g.id !== id) })),
      setMyRsvp: (id, r) => set((s) => ({ groupRides: s.groupRides.map((g) => (g.id === id ? { ...g, myRsvp: r } : g)) })),
      upsertReminder: (r) =>
        set((s) => ({ reminders: s.reminders.some((x) => x.id === r.id) ? s.reminders.map((x) => (x.id === r.id ? r : x)) : [...s.reminders, r] })),
      deleteReminder: (id) => set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),
      markReminderFired: (id, day) => set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, lastFired: day } : r)) })),
      resetComponent: (bikeId, compId) =>
        set((s) => ({ bikes: s.bikes.map((b) => (b.id === bikeId ? { ...b, components: b.components.map((c) => (c.id === compId ? { ...c, usedKm: 0 } : c)) } : b)) })),
      setActiveBike: (id) => set({ activeBikeId: id }),
      updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      resetDemo: () => set({ ...demo() }),
      clearAll: () => set({ rides: [], groupRides: [], bikes: seedBikes }),
    }),
    {
      name: 'kayuh-v2',
      version: 7,
      migrate: (persisted: unknown) => {
        const p = (persisted ?? {}) as Partial<State>
        const d = demo()
        return {
          ...p,
          routes: p.routes ?? [],
          avail: typeof p.avail === 'number' ? p.avail : MY_AVAIL,
          onboarded: p.onboarded ?? true,
          plan: p.plan?.cells?.length === 14 ? p.plan : d.plan,
          char: isCharConfig(p.char) ? sanitizeChar(p.char) : p.char ? migrateLegacy(p.char, p.settings?.name ?? 'kayuh') : defaultChar,
          friends: (p.friends ?? d.friends).map((f, i) => ({ ...f, avail: f.avail ?? seedAvail(f.id), char: isCharConfig(f.char) ? sanitizeChar(f.char) : d.friends.find((x) => x.id === f.id)?.char ?? migrateLegacy(f.char, f.name + i) })),
          groupRides: (p.groupRides ?? d.groupRides).map((g) => { const seed = d.groupRides.find((x) => x.id.split('-')[0] === g.id); return seed && !g.timeOptions ? { ...seed, myRsvp: g.myRsvp } : g }),
          settings: { ...defaultSettings, ...(p.settings ?? {}) },
        } as State
      },
    },
  ),
)
