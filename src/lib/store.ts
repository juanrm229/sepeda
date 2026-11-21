import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Bike, Friend, GroupRide, Reminder, Ride, Rsvp, Settings } from './types'
import { applyRidesToBikes, defaultSettings, seedBikes, seedFriends, seedGroupRides, seedReminders, seedRides } from './seed'

interface State {
  rides: Ride[]
  friends: Friend[]
  groupRides: GroupRide[]
  reminders: Reminder[]
  bikes: Bike[]
  settings: Settings
  activeBikeId: string
  onboarded: boolean
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
  }
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...demo(),
      settings: defaultSettings,
      activeBikeId: 'bike-1',
      onboarded: false,
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
    { name: 'kayuh-v1' },
  ),
)
