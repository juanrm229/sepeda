import { useMemo } from 'react'
import { Bed, Bike, ChevronRight, Gauge, Leaf, Moon, Smile, Frown, Meh, Sun, Wind, Zap, Users, Coffee, CalendarClock, Sliders } from 'lucide-react'
import { useStore } from '../lib/store'
import { CO2_PER_KM_MOTOR, dailyKm, estFTP, estPower, insights, KCAL_NASI_GORENG, readiness, recovery, trainingLoad, weekly } from '../lib/analytics'
import { BAR_LABEL, fmt, fmtDur, relDay } from '../lib/util'
import { BarChart, DotRows, LineChart } from '../charts/Charts'
import { useForecast } from '../lib/useForecast'
import { bestWindow, scoreLabel, windAdvice } from '../lib/weather'
import { HeadBadge, HoloOrb, Portrait, RaceScene, type Racer } from '../components/Character'
import { useCountUp } from '../components/UI'
import { useEffect, useRef, useState } from 'react'
import { QUEST } from '../lib/character'
import { CP_KIND } from '../lib/plan'
import { characterLevel, moodOf, riderClass, riderStats } from '../lib/character'
import { GroupActionCard } from '../components/GroupActions'
import { go } from '../lib/router'

function Pie({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = size / 2
  const a = Math.min(0.9999, pct) * Math.PI * 2
  const x = r + r * Math.sin(a), y = r - r * Math.cos(a)
  return (
    <svg width={size} height={size} aria-label={`${Math.round(pct * 100)}% target`}>
      <circle cx={r} cy={r} r={r} fill="var(--accent-2)" />
      {pct > 0 && <path d={`M${r},${r} L${r},0 A${r},${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x},${y} Z`} fill="var(--accent)" />}
    </svg>
  )
}

const ZC = ['', 'color-mix(in srgb, var(--ink) 18%, var(--surface))', 'color-mix(in srgb, var(--ink) 45%, var(--surface))', 'var(--ink)', 'color-mix(in srgb, var(--accent) 70%, var(--ink))', 'var(--accent)']
export function ZoneStrip({ zones, w = 70 }: { zones?: number[]; w?: number }) {
  if (!zones?.length) return null
  return <span style={{ display: 'flex', width: w, height: 22, alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>{zones.filter((_, i) => i % 2 === 0).map((z, i) => <i key={i} style={{ flex: 1, height: `${z * 20}%`, background: ZC[z], borderRadius: 1.5 }} />)}</span>
}

export default function Home() {
  const { rides, settings, groupRides, friends, char, updateSettings } = useStore()
  const load = useMemo(() => trainingLoad(rides, settings, 90), [rides, settings])
  const weeks = useMemo(() => weekly(rides, 12), [rides])
  const days28 = useMemo(() => dailyKm(rides, 28), [rides])
  const ready = readiness(load)
  const tips = useMemo(() => insights(rides, load, settings), [rides, load, settings])
  const lv = characterLevel(rides)
  const cls = riderClass(riderStats(rides))
  const { mood, line } = moodOf(rides, settings)
  const thisW = weeks[weeks.length - 1]
  const pct = thisW.km / settings.weeklyGoalKm
  const kcalW = rides.filter((r) => new Date(r.date) >= weeks[weeks.length - 1].start).reduce((a, r) => a + r.calories, 0)
  const fc = useForecast(settings.home)
  const win = fc ? bestWindow(fc.hours, 2) : null
  const nowHour = fc?.hours.find((h) => h.time.getTime() >= Date.now() - 3600000)
  const upcoming = groupRides.filter((g) => new Date(g.datetime).getTime() > Date.now() - 3 * 3600000 && g.myRsvp !== 'tidak').sort((a, b) => a.datetime.localeCompare(b.datetime))
  const next = upcoming[0]
  const last = rides[rides.length - 1]
  const ftp = estFTP(rides, settings.weightKg)
  const rec = recovery(rides, settings)
  const form = Math.round(load[load.length - 1].ctl - load[load.length - 1].atl)
  const activeDays = days28.filter((d) => d.km > 0).length
  const totalKm = rides.reduce((a, r) => a + r.distanceKm, 0)
  const totalKcal = rides.reduce((a, r) => a + r.calories, 0)
  const commuteKm = rides.filter((r) => r.type === 'commute').reduce((a, r) => a + r.distanceKm, 0)
  const racers: Racer[] = [...friends.map((f) => ({ id: f.id, name: f.name, c: f.char, km: f.weeklyKm * (0.5 + (((new Date().getDay() + 6) % 7) / 6) * 0.5) })), { id: 'me', name: settings.name, c: char, km: thisW.km, me: true }]
  const myRank = [...racers].sort((a, b) => b.km - a.km).findIndex((r) => r.me) + 1
  const FaceIcon = ready.score >= 70 ? Smile : ready.score >= 45 ? Meh : Frown
  const daysLeftWeek = 7 - ((new Date().getDay() + 6) % 7)
  const kmCount = useCountUp(thisW.km)


  return (
    <div className="fadein">
      <div className="topbar">
        <span className="today-pill">Hari ini · {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        <div className="row">
          <button className="iconbtn" aria-label="Ganti tema" onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>{settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <a href="#/karakter" aria-label="Karakter"><HeadBadge c={char} mood={mood} size={42} bg="var(--surface-2)" /></a>
        </div>
      </div>

      <div className="row-d" style={{ alignItems: 'stretch' }}>
        <div>
          {/* Hero angka ala CMF */}
          <div className="row between" style={{ alignItems: 'flex-start', marginTop: 4 }}>
            <div>
              <div className="dot" style={{ fontSize: 'clamp(84px, 24vw, 132px)' }}>{kmCount.toFixed(1).replace('.', ',')}</div>
              <div className="mono ink" style={{ marginTop: 8 }}>KM minggu ini · target {settings.weeklyGoalKm}</div>
            </div>
            <a href="#/insights" style={{ marginTop: 10 }}><Pie pct={pct} size={68} /></a>
          </div>
          <div className="row wrap" style={{ gap: 22, marginTop: 18 }}>
            <span className="num" style={{ fontSize: 34 }}>{Math.round(thisW.sec / 60)}<span className="unit">Min</span></span>
            <span className="num" style={{ fontSize: 34 }}>{fmt(kcalW)}<span className="unit">Kcal</span></span>
            <span className="num" style={{ fontSize: 34 }}>{fmt(thisW.elev)}<span className="unit">m naik</span></span>
          </div>
          <div className="ticker" style={{ marginTop: 18 }} aria-label="Ringkasan hari ini">
            <div className="ticker-track">
              <span>● Kesiapan <b>{ready.score}</b> {ready.label}</span>
              {win && <span>☀ Jendela terbaik <b>{String(win.start.getHours()).padStart(2, '0')}.00</b></span>}
              {next && <span>👥 {next.title} <b>{relDay(next.datetime)}</b></span>}
              {next?.plan?.checkpoints.find((c) => c.kind === 'kopi') && <span>☕ Coffee break <b>{next.plan.checkpoints.find((c) => c.kind === 'kopi')!.place?.name ?? next.plan.checkpoints.find((c) => c.kind === 'kopi')!.name}</b></span>}
              <span>⚔ Quest <b>{cls.weakest.l}</b></span>
              <span>🏆 Liga peringkat <b>#{myRank}</b></span>
            </div>
          </div>
        </div>

        <StoryDeck char={char} mood={mood} line={line} clsName={cls.main.name} emblem={cls.main.emblem} lvl={lv.lvl} xpPct={lv.cur / lv.next} win={win} windText={nowHour ? windAdvice(nowHour.windDir, nowHour.wind).split('.').slice(0, 2).join('.') + '.' : ''} next={next} quest={QUEST[cls.weakest.k]} weakest={cls.weakest.l} />
      </div>

      {/* Bento ala CMF */}
      <div className="bento section">
        <div className="card accent click" onClick={() => last && go('ride/' + last.id)}>
          <div className="card-h"><div><div className="mono">Latihan terakhir</div><div className="mono" style={{ marginTop: 2 }}>{last ? relDay(last.date) : '-'}</div></div><Bike size={18} /></div>
          {last && (
            <div className="stack" style={{ gap: 2, marginTop: 6 }}>
              <span className="num" style={{ fontSize: 30 }}>{last.distanceKm.toFixed(1)}<span className="unit">Km</span></span>
              <span className="num" style={{ fontSize: 30 }}>{Math.round(last.movingSec / 60)}<span className="unit">Min</span></span>
              <span className="num" style={{ fontSize: 30 }}>{fmt(last.calories)}<span className="unit">Kcal</span></span>
            </div>
          )}
        </div>
        <div className="stack" style={{ gap: 12 }}>
          <a href="#/insights" className="pillcard" style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
            <div><div className="num" style={{ fontSize: 30 }}>{ready.score}</div><div className="mono ink" style={{ fontSize: 9.5 }}>Kesiapan / {ready.label}</div></div>
            <FaceIcon size={26} />
          </a>
          <a href="#/rencana" className="pillcard" style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
            <div><div className="num" style={{ fontSize: 30 }}>{form >= 0 ? '+' : ''}{form}</div><div className="mono ink" style={{ fontSize: 9.5 }}>Form / proyeksi</div></div>
            <Sliders size={22} />
          </a>
        </div>
        <a href="#/insights" className="card click" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-h"><div><div className="mono">Daya estimasi</div><div className="mono" style={{ marginTop: 2 }}>tanpa power meter</div></div><Gauge size={18} /></div>
          <div className="num" style={{ fontSize: 44, marginTop: 18 }}>{last ? estPower(last, settings.weightKg) : 0}<span className="unit">W</span></div>
          <div className="mono ink" style={{ marginTop: 4 }}>FTP ~{ftp.ftp} W · {ftp.wkg.toFixed(1)} W/kg</div>
        </a>
        <div className="card gray">
          <div className="card-h"><div><div className="mono ink">Pemulihan</div><div className="mono" style={{ marginTop: 2 }}>{rec.total} jam total</div></div><Bed size={18} /></div>
          <div className="num" style={{ fontSize: 40, marginTop: 18 }}>{rec.hoursLeft === 0 ? 'Pulih' : `${rec.hoursLeft}j`}</div>
          <div className="mono ink" style={{ marginTop: 4 }}>{rec.hoursLeft === 0 ? 'Siap gas lagi' : 'lagi sampai pulih penuh'}</div>
        </div>
      </div>

      <div className="row-d section">
        <div className="stack">
          {next && <GroupActionCard g={next} />}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="row between" style={{ padding: '16px 18px 10px' }}>
              <div><div className="mono">Liga squad · sisa {daysLeftWeek} hari</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Kamu peringkat #{myRank}</div></div>
              <a href="#/squad" className="btn sm ghost">Lihat <ChevronRight size={14} /></a>
            </div>
            <RaceScene racers={racers} height={240} />
          </div>
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          <div className="card">
            <div className="card-h"><div><div className="mono">Hari aktif</div><div className="mono" style={{ marginTop: 2 }}>28 hari terakhir</div></div><span className="mono">{Math.round((activeDays / 28) * 100)}%</span></div>
            <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}><span className="num" style={{ fontSize: 64 }}>{activeDays}</span></div>
            <div style={{ marginTop: 10 }}><DotRows days={days28} /></div>
          </div>

          <div className="grid2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[{ i: <Zap size={20} />, l: 'Rekam', h: 'record' }, { i: <Users size={20} />, l: 'Squad', h: 'squad' }, { i: <Coffee size={20} />, l: 'Rute & kopi', h: 'rute' }, { i: <CalendarClock size={20} />, l: 'Rencana', h: 'rencana' }].map((a) => (
              <a key={a.h} href={'#/' + a.h} className="card flat" style={{ padding: 12, textAlign: 'center', textDecoration: 'none' }}>
                <div className="ico" style={{ margin: '0 auto 6px' }}>{a.i}</div><div className="tiny b">{a.l}</div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="row-d section">
        <div className="stack">
          <div className="card">
            <div className="card-h"><div><div className="mono">Jarak per minggu</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>12 minggu terakhir</div></div><span className="mono">KM</span></div>
            <BarChart data={weeks.map((w) => ({ label: BAR_LABEL(w.start), value: w.km, sub: `Mgg ${BAR_LABEL(w.start)} · ${w.rides} ride` }))} goal={settings.weeklyGoalKm} unit="km" />
          </div>
          <div className="card">
            <div className="card-h">
              <div><div className="mono">Beban latihan · 90 hari</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Fitness vs Kelelahan</div></div>
              <a href="#/insights" className="mono">Analisis →</a>
            </div>
            <div className="legend" style={{ marginBottom: 8 }}><span><i style={{ background: 'var(--ink)' }} />Fitness (42 hari)</span><span><i style={{ background: 'var(--accent)' }} />Kelelahan (7 hari)</span></div>
            <LineChart labels={load.map((p) => { const d = new Date(p.day); return `${d.getDate()}/${d.getMonth() + 1}` })} series={[{ name: 'Fitness', color: 'var(--ink)', values: load.map((p) => p.ctl), width: 2.5 }, { name: 'Lelah', color: 'var(--accent)', values: load.map((p) => p.atl) }]} />
          </div>
        </div>
        <div className="stack" style={{ marginTop: 0 }}>
          <div className="section-h" style={{ marginTop: 6, marginBottom: 0 }}><h3 className="display" style={{ fontSize: 22 }}>Pelatih Kayuh</h3><span className="mono">AI insight</span></div>
          {tips.slice(0, 4).map((t, i) => (
            <div key={i} className={`card ${t.tone === 'accent' ? 'ink' : ''}`} style={{ padding: 16 }}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <span className={`tag ${t.tone === 'good' ? 'good' : t.tone === 'warn' ? 'warn' : t.tone === 'accent' ? 'accent' : ''}`} style={{ marginTop: 2 }}>{t.tone === 'good' ? '↑' : t.tone === 'warn' ? '!' : t.tone === 'accent' ? '◎' : 'i'}</span>
                <div><div className="b">{t.title}</div><div className="small" style={{ marginTop: 3, opacity: 0.8 }}>{t.body}</div></div>
              </div>
            </div>
          ))}
          <div className="card">
            <div className="card-h"><span className="mono">Dampak kamu</span><Leaf size={16} /></div>
            <div className="grid2">
              <div><div className="num" style={{ fontSize: 26 }}>{fmt(totalKm * CO2_PER_KM_MOTOR)}<span className="unit">kg CO₂</span></div><div className="tiny muted">dihemat vs motor</div></div>
              <div><div className="num" style={{ fontSize: 26 }}>{fmt(Math.round(totalKcal / KCAL_NASI_GORENG))}<span className="unit">piring</span></div><div className="tiny muted">nasi goreng terbakar 🍳</div></div>
              <div><div className="num" style={{ fontSize: 26 }}>Rp{fmt((commuteKm * settings.fuelPricePerKm) / 1000)}<span className="unit">rb</span></div><div className="tiny muted">hemat bensin & parkir</div></div>
              <div><div className="num" style={{ fontSize: 26 }}>{fmt(totalKm)}<span className="unit">km</span></div><div className="tiny muted">total 4 bulan</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-h"><h3 className="display" style={{ fontSize: 22 }}>Ride terakhir</h3><a className="mono" href="#/rides">Semua →</a></div>
        <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <div className="list">
            {[...rides].reverse().slice(0, 5).map((r) => (
              <a key={r.id} className="li" href={'#/ride/' + r.id}>
                <div className="grow">
                  <div className="t">{r.name}</div>
                  <div className="tiny muted">{relDay(r.date)} · {fmtDur(r.movingSec)} · {r.avgSpeed.toFixed(1)} km/j · ~{estPower(r, settings.weightKg)} W{r.friendIds?.length ? ` · 👥 ${r.friendIds.length}` : ''}</div>
                </div>
                <ZoneStrip zones={r.zones} />
                <div style={{ textAlign: 'right', minWidth: 58 }}><div className="num" style={{ fontSize: 22 }}>{r.distanceKm.toFixed(1)}</div><div className="mono">km</div></div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import type { CharConfig, GroupRide } from '../lib/types'
import type { Mood } from '../lib/character'
import type { Window as WWindow } from '../lib/weather'

function StoryDeck({ char, mood, line, clsName, emblem, lvl, xpPct, win, windText, next, quest, weakest }: { char: CharConfig; mood: Mood; line: string; clsName: string; emblem: string; lvl: number; xpPct: number; win: WWindow | null; windText: string; next?: GroupRide; quest: string; weakest: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = 4
  useEffect(() => {
    if (paused) return
    const t = window.setTimeout(() => { const n = (i + 1) % count; ref.current?.scrollTo({ left: n * ref.current.clientWidth, behavior: 'smooth' }); setI(n) }, 6000)
    return () => clearTimeout(t)
  }, [i, paused])
  const onScroll = () => { const el = ref.current; if (el) setI(Math.round(el.scrollLeft / el.clientWidth)) }
  const bars = <div className="story-bars">{Array.from({ length: count }, (_, k) => <i key={k + '-' + i} className={k < i ? 'done' : k === i && !paused ? 'cur' : k === i ? 'done' : ''} />)}</div>
  const kopi = next?.plan?.checkpoints.filter((c) => c.kind === 'kopi' || c.kind === 'makan') ?? []
  return (
    <div style={{ marginTop: 20, position: 'relative' }} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
      <div className="stories" ref={ref} onScroll={onScroll}>
        <a href="#/karakter" className="story card outline dotgrid-bg" style={{ textDecoration: 'none', color: 'inherit' }}>
          {bars}
          <div className="row between"><span className="mono">Lv {lvl} · {emblem} {clsName}</span><span className="mono">1/4</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center', marginTop: 10, flex: 1 }}>
            <HoloOrb size={150}><Portrait c={char} mood={mood} size={128} style={{ marginBottom: -6 }} /></HoloOrb>
            <div>
              <div className="bubble small" style={{ lineHeight: 1.35 }}>{line}</div>
              <div className="xpbar" style={{ marginTop: 14, height: 12 }}><i style={{ width: `${xpPct * 100}%` }} /></div>
            </div>
          </div>
        </a>
        <a href="#/weather" className="story card ink" style={{ textDecoration: 'none' }}>
          {bars}
          <div className="row between"><span className="mono">Waktu terbaik gowes</span><span className="mono">2/4</span></div>
          {win ? (
            <div style={{ marginTop: 'auto' }}>
              <div className="dot" style={{ fontSize: 88 }}>{String(win.start.getHours()).padStart(2, '0')}.00</div>
              <div className="row" style={{ gap: 8, marginTop: 8 }}><span className="tag accent">Skor {win.score} · {scoreLabel(win.score)}</span><span className="small">{relDay(win.start.toISOString())} s.d. {String(win.end.getHours()).padStart(2, '0')}.00</span></div>
              {windText && <div className="small" style={{ marginTop: 10, opacity: 0.7 }}><Wind size={13} style={{ verticalAlign: -2 }} /> {windText}</div>}
            </div>
          ) : <div style={{ marginTop: 'auto' }} className="stack"><span className="skel" style={{ height: 80, width: '70%', borderRadius: 14, opacity: 0.25 }} /><span className="skel" style={{ height: 18, width: '50%', borderRadius: 9, opacity: 0.25 }} /></div>}
        </a>
        <a href={next ? '#/squad/' + next.id : '#/rute'} className="story card" style={{ textDecoration: 'none', color: '#fff', background: '#6b3f1f' }}>
          {bars}
          <div className="row between"><span className="mono" style={{ color: 'rgba(255,255,255,.7)' }}>Coffee ride berikutnya</span><span className="mono" style={{ color: 'rgba(255,255,255,.7)' }}>3/4</span></div>
          {next ? (
            <div style={{ marginTop: 'auto' }}>
              <div className="display" style={{ fontSize: 30 }}>{next.title}</div>
              <div className="small" style={{ opacity: 0.8, marginTop: 4 }}>{relDay(next.datetime)} · {next.meet.name}</div>
              <div className="stack" style={{ gap: 6, marginTop: 14 }}>
                {(next.plan?.checkpoints ?? []).slice(0, 4).map((c, k) => (
                  <div key={c.id} className="row" style={{ gap: 8 }}><span style={{ width: 26, height: 26, borderRadius: 9, background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center', fontSize: 13 }}>{CP_KIND[c.kind].emoji}</span><span className="small" style={{ flex: 1 }}>{k + 1}. {c.place?.name ?? c.name}</span><span className="mono" style={{ color: 'rgba(255,255,255,.6)' }}>{c.stopMin}m</span></div>
                ))}
                {kopi.length === 0 && <span className="small" style={{ opacity: 0.7 }}>Belum ada coffee break — tambahkan di rute.</span>}
              </div>
            </div>
          ) : <div style={{ marginTop: 'auto' }}><div className="display" style={{ fontSize: 30 }}>Rencanakan coffee ride ☕</div><div className="small" style={{ opacity: 0.8 }}>Checkpoint sebanyak apa pun + kafe terdekat.</div></div>}
        </a>
        <a href="#/karakter" className="story card lime" style={{ textDecoration: 'none' }}>
          {bars}
          <div className="row between"><span className="mono">Quest minggu ini · {weakest.toLowerCase()}</span><span className="mono">4/4</span></div>
          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: 46, lineHeight: 1 }}>⚔</div>
            <div className="display" style={{ fontSize: 28, marginTop: 8 }}>{quest.replace('Quest: ', '')}</div>
            <div className="small" style={{ marginTop: 6 }}>Selesaikan untuk naik level & membuka item lemari karakter.</div>
          </div>
        </a>
      </div>
      <div className="row" style={{ position: 'absolute', right: 10, bottom: 10, gap: 4 }}>
        {Array.from({ length: count }, (_, k) => <button key={k} aria-label={`Cerita ${k + 1}`} onClick={() => { ref.current?.scrollTo({ left: k * ref.current.clientWidth, behavior: 'smooth' }); setI(k) }} style={{ width: k === i ? 18 : 7, height: 7, borderRadius: 9, border: 0, padding: 0, background: k === i ? 'var(--accent)' : 'rgba(127,127,127,.4)', transition: 'width .3s' }} />)}
      </div>
    </div>
  )
}
