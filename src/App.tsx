import { lazy, Suspense, useEffect } from 'react'
import { Home as HomeIcon, Users, Zap, Bell, User, MapPin, Bike, CloudSun, LineChart, List, Sliders, Smile, Coffee, Stamp } from 'lucide-react'
import { useRoute } from './lib/router'
import { useStore } from './lib/store'
import { dueReminders, notify } from './lib/notify'
import { dayKey } from './lib/util'
import { celebrate, ConfirmHost, ErrorBoundary, Skeleton, Toaster, toast } from './components/UI'
import { level, levelTitle, weekly } from './lib/analytics'
import { stamps } from './lib/passport'
import Home from './pages/Home'
const Record = lazy(() => import('./pages/Record'))
const Squad = lazy(() => import('./pages/Squad'))
const SquadDetail = lazy(() => import('./pages/SquadDetail'))
const Meet = lazy(() => import('./pages/Meet'))
const Reminders = lazy(() => import('./pages/Reminders'))
const Garage = lazy(() => import('./pages/Garage'))
const Profile = lazy(() => import('./pages/Profile'))
const RideDetail = lazy(() => import('./pages/RideDetail'))
const Weather = lazy(() => import('./pages/Weather'))
const Insights = lazy(() => import('./pages/Insights'))
const Rides = lazy(() => import('./pages/Rides'))
const Join = lazy(() => import('./pages/Join'))
const CharacterPage = lazy(() => import('./pages/Character'))
const Plan = lazy(() => import('./pages/Plan'))
const RoutePlanner = lazy(() => import('./pages/RoutePlanner'))
const RouteList = lazy(() => import('./pages/RoutePlanner').then((m) => ({ default: m.RouteList })))
const Onboarding = lazy(() => import('./components/Onboarding'))
const Passport = lazy(() => import('./pages/Passport'))
import { HeadBadge } from './components/Character'

function useAchievements() {
  useEffect(() => {
    let prev = useStore.getState().rides
    return useStore.subscribe((s) => {
      if (s.rides === prev) return
      const before = prev
      prev = s.rides
      if (s.rides.length <= before.length) return
      const lvA = level(before).lvl, lvB = level(s.rides).lvl
      const stA = stamps(before).filter((x) => x.date).length
      const newStamp = stamps(s.rides).filter((x) => x.date).find((x) => !stamps(before).find((y) => y.lm.id === x.lm.id && y.date))
      const wkA = weekly(before, 1)[0].km, wkB = weekly(s.rides, 1)[0].km
      const goal = s.settings.weeklyGoalKm
      setTimeout(() => {
        if (newStamp && stA >= 0) { celebrate(1); toast(`${newStamp.lm.emoji} Stempel baru: ${newStamp.lm.name}!`, 'Cek paspormu — koleksi landmark bertambah') }
        else if (lvB > lvA) { celebrate(1.4); toast(`🆙 Naik ke level ${lvB}!`, `Kamu sekarang ${levelTitle(lvB)} — cek item baru di lemari`) }
        else if (wkA < goal && wkB >= goal) { celebrate(1.2); toast('🎯 Target mingguan tembus!', `${Math.round(wkB)} / ${goal} km — karaktermu semangat`) }
        else celebrate(0.6)
      }, 600)
    })
  }, [])
}

function useReminderLoop() {
  useEffect(() => {
    const tick = () => {
      const { reminders, markReminderFired } = useStore.getState()
      for (const r of dueReminders(reminders)) {
        markReminderFired(r.id, dayKey(new Date()))
        notify('Kayuh · Pengingat', r.title)
        toast('⏰ ' + r.title)
      }
    }
    tick()
    const iv = window.setInterval(tick, 30000)
    return () => clearInterval(iv)
  }, [])
}

export default function App() {
  const route = useRoute()
  const theme = useStore((s) => s.settings.theme)
  const char = useStore((s) => s.char)
  const onboarded = useStore((s) => s.onboarded)
  useReminderLoop()
  useAchievements()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#e8e7e3')
  }, [theme])

  const [a, b, c] = route
  let page
  switch (a) {
    case undefined: page = <Home />; break
    case 'record': page = <Record />; break
    case 'squad': page = b ? <SquadDetail id={b} /> : <Squad />; break
    case 'meet': page = <Meet />; break
    case 'reminders': page = <Reminders />; break
    case 'garage': page = <Garage />; break
    case 'profile': page = <Profile />; break
    case 'ride': page = <RideDetail id={b} />; break
    case 'rides': page = <Rides />; break
    case 'weather': page = <Weather />; break
    case 'insights': page = <Insights />; break
    case 'join': page = <Join code={b} />; break
    case 'karakter': page = <CharacterPage />; break
    case 'rencana': page = <Plan />; break
    case 'paspor': page = <Passport />; break
    case 'rute': page = !b ? <RouteList /> : b === 'g' ? <RoutePlanner key={'g' + c} groupId={c} /> : <RoutePlanner key={b} id={b} />; break
    default: page = <Home />
  }
  const on = (x: string | undefined) => (a === x ? 'on' : '')
  const navIdx = [undefined, 'squad', 'record', 'reminders', 'karakter'].indexOf(a)

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><span className="brand-mark"><i /></span>Kayuh</div>
        <a href="#/" className={on(undefined)}><HomeIcon size={18} /> Beranda</a>
        <a href="#/squad" className={on('squad')}><Users size={18} /> Gowes Bareng</a>
        <a href="#/karakter" className={on('karakter')}><Smile size={18} /> Karakter</a>
        <a href="#/rencana" className={on('rencana')}><Sliders size={18} /> Rencana</a>
        <a href="#/rute" className={on('rute')}><Coffee size={18} /> Rute & Kopi</a>
        <a href="#/paspor" className={on('paspor')}><Stamp size={18} /> Paspor</a>
        <a href="#/meet" className={on('meet')}><MapPin size={18} /> Titik Temu</a>
        <a href="#/reminders" className={on('reminders')}><Bell size={18} /> Pengingat</a>
        <a href="#/weather" className={on('weather')}><CloudSun size={18} /> Cuaca Gowes</a>
        <a href="#/insights" className={on('insights')}><LineChart size={18} /> Analisis</a>
        <a href="#/rides" className={on('rides')}><List size={18} /> Riwayat</a>
        <a href="#/garage" className={on('garage')}><Bike size={18} /> Garasi</a>
        <a href="#/profile" className={on('profile')}><User size={18} /> Profil</a>
        <a href="#/record" className="btn accent rec" style={{ color: '#fff', justifyContent: 'center' }}><Zap size={18} /> Mulai rekam</a>
      </aside>
      <main className="main">
        <ErrorBoundary key={route.join('/')}>
          <Suspense fallback={<PageSkeleton />}>{page}</Suspense>
        </ErrorBoundary>
      </main>
      <nav className="bottomnav" aria-label="Navigasi utama">
        <i className="nav-ind" style={{ transform: `translateX(${[0, 60, 120, 186, 246][Math.max(0, navIdx)]}px)`, opacity: navIdx < 0 || navIdx === 2 ? 0 : 1 }} />
        <a href="#/" className={on(undefined)} aria-label="Beranda"><HomeIcon size={21} /></a>
        <a href="#/squad" className={on('squad')} aria-label="Gowes bareng"><Users size={21} /></a>
        <a href="#/record" className="rec" aria-label="Rekam"><Zap size={22} /></a>
        <a href="#/reminders" className={on('reminders')} aria-label="Pengingat"><Bell size={21} /></a>
        <a href="#/karakter" className={on('karakter')} aria-label="Karakter" style={{ opacity: 1 }}><HeadBadge c={char} size={32} bg="#2a2a28" ring={false} /></a>
      </nav>
      <Toaster />
      <ConfirmHost />
      {!onboarded && <Suspense fallback={null}><Onboarding /></Suspense>}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="page-skel" aria-busy="true" aria-label="Memuat">
      <Skeleton h={14} w={120} /><Skeleton h={34} w={220} r={12} />
      <Skeleton h={260} r={26} />
      <div className="grid2"><Skeleton h={140} r={26} /><Skeleton h={140} r={26} /></div>
      <Skeleton h={180} r={26} />
    </div>
  )
}
