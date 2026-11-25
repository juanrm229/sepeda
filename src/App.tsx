import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Home as HomeIcon, Zap, Bell, User, MapPin, Bike, CloudSun, LineChart, List, Sliders, Smile, Coffee, Stamp, CalendarDays, Plus, Users, Wallet } from 'lucide-react'
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
const Kapan = lazy(() => import('./pages/Kapan'))
const Balas = lazy(() => import('./pages/Balas'))
const Patungan = lazy(() => import('./pages/Patungan'))
const Jadwal = lazy(() => import('./pages/Jadwal'))
import { AjakHost, openAjak, useAjakOpen } from './components/AjakFlow'
import { Logo } from './components/Logo'

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
        notify('PACK · Pengingat', r.title)
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
  const onboarded = useStore((s) => s.onboarded)
  useReminderLoop()
  useAchievements()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0b0c' : '#eeeeec')
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
    case 'kapan': page = <Kapan />; break
    case 'balas': page = <Balas code={b} />; break
    case 'patungan': page = <Patungan />; break
    case 'jadwal': page = <Jadwal code={b} />; break
    case 'rute': page = !b ? <RouteList /> : b === 'g' ? <RoutePlanner key={'g' + c} groupId={c} /> : <RoutePlanner key={b} id={b} />; break
    default: page = <Home />
  }
  const on = (x: string | undefined) => (a === x ? 'on' : '')
  const nav: { href: string; k: string | undefined; l: string; i: React.ReactNode }[] = [
    { href: '#/', k: undefined, l: 'Hari ini', i: <HomeIcon size={20} /> },
    { href: '#/squad', k: 'squad', l: 'Agenda', i: <CalendarDays size={20} /> },
    { href: '#/meet', k: 'meet', l: 'Ketemu', i: <MapPin size={20} /> },
    { href: '#/rute', k: 'rute', l: 'Ngopi', i: <Coffee size={20} /> },
  ]

  return (
    <div className="app">
      <aside className="side">
        <div style={{ margin: '0 12px 22px' }}><Logo size={30} /></div>
        {nav.map((n) => <a key={n.l} href={n.href} className={on(n.k)}>{n.i} {n.l === 'Ketemu' ? 'Titik temu' : n.l === 'Ngopi' ? 'Rute & ngopi' : n.l}</a>)}
        <a href="#/kapan" className={on('kapan')}><Users size={20} /> Kapan semua bisa?</a>
        <div className="side-h">Kamu</div>
        <a href="#/patungan" className={on('patungan')}><Wallet size={18} /> Patungan</a>
        <a href="#/karakter" className={on('karakter')}><Smile size={18} /> Karakter</a>
        <a href="#/reminders" className={on('reminders')}><Bell size={18} /> Pengingat</a>
        <a href="#/paspor" className={on('paspor')}><Stamp size={18} /> Paspor</a>
        <a href="#/profile" className={on('profile')}><User size={18} /> Profil</a>
        <div className="side-h">Analisis · nanti</div>
        <a href="#/insights" className={on('insights')}><LineChart size={18} /> Analisis</a>
        <a href="#/rides" className={on('rides')}><List size={18} /> Riwayat</a>
        <a href="#/record" className={on('record')}><Zap size={18} /> Rekam</a>
        <a href="#/weather" className={on('weather')}><CloudSun size={18} /> Cuaca</a>
        <a href="#/rencana" className={on('rencana')}><Sliders size={18} /> Rencana</a>
        <a href="#/garage" className={on('garage')}><Bike size={18} /> Garasi</a>
        <button className="btn ink block side-cta" style={{ marginTop: 18 }} onClick={() => openAjak()}><Plus size={18} /> Ajak gowes</button>
      </aside>
      <main className="main">
        <ErrorBoundary key={route.join('/')}>
          <Suspense fallback={<PageSkeleton />}>{page}</Suspense>
        </ErrorBoundary>
      </main>
      {a !== 'record' && (
        <NavPill nav={nav} active={a} />
      )}
      <AjakHost />
      <Toaster />
      <ConfirmHost />
      {!onboarded && a !== 'join' && a !== 'jadwal' && <Suspense fallback={null}><Onboarding /></Suspense>}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="page-skel" aria-busy="true" aria-label="Memuat">
      <Skeleton h={46} w={180} r={23} /><Skeleton h={90} r={16} />
      <Skeleton h={240} r={24} />
      <div className="grid2"><Skeleton h={120} r={24} /><Skeleton h={120} r={24} /></div>
    </div>
  )
}

function NavPill({ nav, active }: { nav: { href: string; k: string | undefined; l: string; i: React.ReactNode }[]; active: string | undefined }) {
  const ref = useRef<HTMLElement>(null)
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null)
  const open = useAjakOpen()
  const idx = nav.findIndex((n) => n.k === active)
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current?.querySelectorAll('a')[idx] as HTMLElement | undefined
      setInd(el ? { x: el.offsetLeft, w: el.offsetWidth } : null)
    }
    measure()
    const t = setTimeout(measure, 260)
    window.addEventListener('resize', measure)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [idx])
  return (
    <div className="navwrap">
      <nav ref={ref} className="navpill" aria-label="Navigasi utama">
        <i className="nav-ind" style={{ transform: `translateX(${ind?.x ?? 0}px)`, width: ind?.w ?? 0, opacity: ind ? 1 : 0 }} />
        {nav.map((n) => <a key={n.l} href={n.href} className={active === n.k ? 'on' : ''} aria-label={n.l} aria-current={active === n.k ? 'page' : undefined}>{n.i}<span>{n.l}</span></a>)}
      </nav>
      <button className={`fab ${open ? 'open' : ''}`} aria-label="Ajak gowes" onClick={() => openAjak()}><Plus size={26} /></button>
    </div>
  )
}
