import { useEffect } from 'react'
import { Home as HomeIcon, Users, Zap, Bell, User, MapPin, Bike, CloudSun, LineChart, List, Sliders, Smile } from 'lucide-react'
import { useRoute } from './lib/router'
import { useStore } from './lib/store'
import { dueReminders, notify } from './lib/notify'
import { dayKey } from './lib/util'
import { Toaster, toast } from './components/UI'
import Home from './pages/Home'
import Record from './pages/Record'
import Squad from './pages/Squad'
import SquadDetail from './pages/SquadDetail'
import Meet from './pages/Meet'
import Reminders from './pages/Reminders'
import Garage from './pages/Garage'
import Profile from './pages/Profile'
import RideDetail from './pages/RideDetail'
import Weather from './pages/Weather'
import Insights from './pages/Insights'
import Rides from './pages/Rides'
import Join from './pages/Join'
import CharacterPage from './pages/Character'
import Plan from './pages/Plan'
import { HeadBadge } from './components/Character'

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
  useReminderLoop()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#e8e7e3')
  }, [theme])

  const [a, b] = route
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
    default: page = <Home />
  }
  const on = (x: string | undefined) => (a === x ? 'on' : '')

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><span className="brand-mark"><i /></span>Kayuh</div>
        <a href="#/" className={on(undefined)}><HomeIcon size={18} /> Beranda</a>
        <a href="#/squad" className={on('squad')}><Users size={18} /> Gowes Bareng</a>
        <a href="#/karakter" className={on('karakter')}><Smile size={18} /> Karakter</a>
        <a href="#/rencana" className={on('rencana')}><Sliders size={18} /> Rencana</a>
        <a href="#/meet" className={on('meet')}><MapPin size={18} /> Titik Temu</a>
        <a href="#/reminders" className={on('reminders')}><Bell size={18} /> Pengingat</a>
        <a href="#/weather" className={on('weather')}><CloudSun size={18} /> Cuaca Gowes</a>
        <a href="#/insights" className={on('insights')}><LineChart size={18} /> Analisis</a>
        <a href="#/rides" className={on('rides')}><List size={18} /> Riwayat</a>
        <a href="#/garage" className={on('garage')}><Bike size={18} /> Garasi</a>
        <a href="#/profile" className={on('profile')}><User size={18} /> Profil</a>
        <a href="#/record" className="btn accent rec" style={{ color: '#fff', justifyContent: 'center' }}><Zap size={18} /> Mulai rekam</a>
      </aside>
      <main className="main">{page}</main>
      <nav className="bottomnav" aria-label="Navigasi utama">
        <a href="#/" className={on(undefined)} aria-label="Beranda"><HomeIcon size={21} /></a>
        <a href="#/squad" className={on('squad')} aria-label="Gowes bareng"><Users size={21} /></a>
        <a href="#/record" className="rec" aria-label="Rekam"><Zap size={22} /></a>
        <a href="#/reminders" className={on('reminders')} aria-label="Pengingat"><Bell size={21} /></a>
        <a href="#/karakter" className={on('karakter')} aria-label="Karakter" style={{ opacity: 1 }}><HeadBadge c={char} size={32} bg="#2a2a28" ring={false} /></a>
      </nav>
      <Toaster />
    </div>
  )
}
