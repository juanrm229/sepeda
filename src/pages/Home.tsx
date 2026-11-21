import { useMemo } from 'react'
import { Bike, CalendarClock, ChevronRight, CloudSun, Leaf, MapPin, Moon, Sun, Users, Wind, Zap } from 'lucide-react'
import { useStore } from '../lib/store'
import { badges, CO2_PER_KM_MOTOR, dailyKm, insights, KCAL_NASI_GORENG, level, levelTitle, readiness, streakWeeks, trainingLoad, weekly } from '../lib/analytics'
import { BAR_LABEL, fmt, fmtDate, fmtDur, greeting, relDay } from '../lib/util'
import { BarChart, Dial, DotHeatmap, LineChart, Sparkline } from '../charts/Charts'
import { useForecast } from '../lib/useForecast'
import { bestWindow, scoreLabel, windAdvice } from '../lib/weather'
import { Avatar } from '../components/UI'
import { go } from '../lib/router'

export default function Home() {
  const { rides, settings, groupRides, friends, bikes, updateSettings } = useStore()
  const load = useMemo(() => trainingLoad(rides, settings, 90), [rides, settings])
  const weeks = useMemo(() => weekly(rides, 12), [rides])
  const days = useMemo(() => dailyKm(rides, 7 * 17), [rides])
  const ready = readiness(load)
  const tips = useMemo(() => insights(rides, load, settings), [rides, load, settings])
  const lv = level(rides)
  const thisW = weeks[weeks.length - 1]
  const pct = Math.min(1, thisW.km / settings.weeklyGoalKm)
  const streak = streakWeeks(rides)
  const fc = useForecast(settings.home)
  const win = fc ? bestWindow(fc.hours, 2) : null
  const nowHour = fc?.hours.find((h) => h.time.getTime() >= Date.now() - 3600000)
  const upcoming = groupRides.filter((g) => new Date(g.datetime).getTime() > Date.now() - 3 * 3600000).sort((a, b) => a.datetime.localeCompare(b.datetime))
  const next = upcoming[0]
  const totalKm = rides.reduce((a, r) => a + r.distanceKm, 0)
  const totalKcal = rides.reduce((a, r) => a + r.calories, 0)
  const commuteKm = rides.filter((r) => r.type === 'commute').reduce((a, r) => a + r.distanceKm, 0)
  const recent = [...rides].reverse().slice(0, 5)
  const worn = bikes.flatMap((b) => b.components.map((c) => ({ b, c }))).filter(({ c }) => c.usedKm / c.lifeKm > 0.85)
  const earned = badges(rides).filter((b) => b.got).length
  const dots = 20

  return (
    <div className="fadein">
      <div className="topbar">
        <div>
          <div className="mono">{greeting()} · {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="t">Halo, {settings.name}</div>
        </div>
        <div className="row">
          <button className="iconbtn" aria-label="Ganti tema" onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>
            {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a href="#/profile" aria-label="Profil" style={{ textDecoration: 'none' }}><Avatar name={settings.name} color="#111" /></a>
        </div>
      </div>

      <div className="bento">
        {/* Minggu ini */}
        <div className="card span2 span2-d">
          <div className="card-h">
            <span className="mono">Minggu ini</span>
            <span className="tag ink">≡ Streak {streak} mgg</span>
          </div>
          <div className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
            <span className="dot" style={{ fontSize: 76 }}>{fmt(thisW.km)}</span>
            <span className="mono ink" style={{ paddingBottom: 8 }}>/ {settings.weeklyGoalKm} km</span>
          </div>
          <div className="meter dots" style={{ margin: '14px 0 14px' }}>
            {Array.from({ length: dots }, (_, i) => <i key={i} className={i < Math.round(pct * dots) ? (pct >= 1 ? 'a' : 'f') : ''} />)}
          </div>
          <div className="grid3">
            <div><div className="mono">Waktu</div><div className="num" style={{ fontSize: 20, marginTop: 4 }}>{fmtDur(thisW.sec)}</div></div>
            <div><div className="mono">Tanjakan</div><div className="num" style={{ fontSize: 20, marginTop: 4 }}>{fmt(thisW.elev)}<span className="unit">m</span></div></div>
            <div><div className="mono">Ride</div><div className="num" style={{ fontSize: 20, marginTop: 4 }}>{thisW.rides}<span className="unit">×</span></div></div>
          </div>
        </div>

        {/* Kesiapan */}
        <div className="card accent click" onClick={() => go('insights')}>
          <div className="card-h"><span className="mono">Kesiapan</span><Zap size={16} /></div>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <Dial value={ready.score} size={128} color="#fff" label={<span className="dot" style={{ fontSize: 40 }}>{ready.score}</span>} />
          </div>
          <div className="b" style={{ marginTop: 2 }}>{ready.label}</div>
          <div className="tiny" style={{ opacity: 0.85 }}>{ready.advice}</div>
        </div>

        {/* Jendela gowes */}
        <div className="card ink click" onClick={() => go('weather')}>
          <div className="card-h"><span className="mono">Waktu terbaik gowes</span><CloudSun size={16} /></div>
          {win ? (
            <>
              <div className="dot" style={{ fontSize: 34 }}>{String(win.start.getHours()).padStart(2, '0')}.00</div>
              <div className="small" style={{ marginTop: 6 }}>{relDay(win.start.toISOString())} · s.d. {String(win.end.getHours()).padStart(2, '0')}.00</div>
              <div className="row" style={{ marginTop: 10, gap: 6 }}>
                <span className="tag accent">{win.score} · {scoreLabel(win.score)}</span>
              </div>
              {nowHour && <div className="tiny" style={{ marginTop: 10, opacity: 0.75 }}><Wind size={12} style={{ verticalAlign: -2 }} /> {windAdvice(nowHour.windDir, nowHour.wind).split('.')[0]}.</div>}
              {fc?.demo && <div className="mono" style={{ marginTop: 6 }}>Data contoh (offline)</div>}
            </>
          ) : <div className="muted small">Memuat prakiraan…</div>}
        </div>

        {/* Gowes bareng berikutnya */}
        {next && (
          <div className="card yellow span2 span2-d click" onClick={() => go('squad/' + next.id)}>
            <div className="card-h">
              <span className="mono">Gowes bareng berikutnya</span>
              <span className="tag ink">{relDay(next.datetime)}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{next.title}</div>
            <div className="small" style={{ marginTop: 4 }}><MapPin size={13} style={{ verticalAlign: -2 }} /> {next.meet.name}</div>
            <div className="row between" style={{ marginTop: 14 }}>
              <div className="avatars">
                {next.participants.filter((p) => p.rsvp === 'ikut').map((p) => { const f = friends.find((x) => x.id === p.friendId); return f ? <Avatar key={f.id} name={f.name} color={f.color} /> : null })}
              </div>
              <span className="b small">{fmtDate(next.datetime, true)} <ChevronRight size={14} style={{ verticalAlign: -3 }} /></span>
            </div>
          </div>
        )}

        {/* Level */}
        <div className="card click" onClick={() => go('profile')}>
          <div className="card-h"><span className="mono">Level {lv.lvl}</span><span className="tag">{earned} lencana</span></div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>{levelTitle(lv.lvl)}</div>
          <div className="meter" style={{ marginTop: 12 }}><i style={{ width: `${(lv.cur / lv.next) * 100}%`, background: 'var(--accent)' }} /></div>
          <div className="mono" style={{ marginTop: 8 }}>{fmt(lv.cur)} / {fmt(lv.next)} XP</div>
        </div>

        <div className="card click" onClick={() => go('garage')}>
          <div className="card-h"><span className="mono">Garasi</span><Bike size={16} /></div>
          {worn.length ? (
            <>
              <div style={{ fontWeight: 600 }}>{worn.length} komponen perlu dicek</div>
              <div className="tiny muted" style={{ marginTop: 4 }}>{worn.slice(0, 2).map(({ c }) => c.name).join(', ')}</div>
              <span className="tag warn" style={{ marginTop: 10 }}>⚠ Segera servis</span>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600 }}>Semua prima</div>
              <span className="tag good" style={{ marginTop: 10 }}>✓ Aman</span>
            </>
          )}
        </div>
      </div>

      {/* Aksi cepat */}
      <div className="grid2 section" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { i: <Zap size={20} />, l: 'Rekam', h: 'record' },
          { i: <Users size={20} />, l: 'Squad', h: 'squad' },
          { i: <MapPin size={20} />, l: 'Titik temu', h: 'meet' },
          { i: <CalendarClock size={20} />, l: 'Pengingat', h: 'reminders' },
        ].map((a) => (
          <a key={a.h} href={'#/' + a.h} className="card flat" style={{ padding: 12, textAlign: 'center', textDecoration: 'none' }}>
            <div className="ico" style={{ margin: '0 auto 6px' }}>{a.i}</div>
            <div className="tiny b">{a.l}</div>
          </a>
        ))}
      </div>

      <div className="row-d section" style={{ marginTop: 26 }}>
        <div className="stack">
          <div className="card">
            <div className="card-h">
              <div><div className="mono">Jarak per minggu</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>12 minggu terakhir</div></div>
              <span className="mono">KM</span>
            </div>
            <BarChart data={weeks.map((w) => ({ label: BAR_LABEL(w.start), value: w.km, sub: `Mgg ${BAR_LABEL(w.start)} · ${w.rides} ride` }))} goal={settings.weeklyGoalKm} unit="km" />
          </div>

          <div className="card">
            <div className="card-h">
              <div><div className="mono">Beban latihan · 90 hari</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Fitness vs Kelelahan</div></div>
              <span className={`tag ${ready.score >= 60 ? 'good' : 'warn'}`}>Form {Math.round(load[load.length - 1].ctl - load[load.length - 1].atl)}</span>
            </div>
            <div className="legend" style={{ marginBottom: 8 }}>
              <span><i style={{ background: 'var(--ink)' }} />Fitness (42 hari)</span>
              <span><i style={{ background: 'var(--accent)' }} />Kelelahan (7 hari)</span>
            </div>
            <LineChart
              labels={load.map((p) => { const d = new Date(p.day); return `${d.getDate()}/${d.getMonth() + 1}` })}
              series={[
                { name: 'Fitness', color: 'var(--ink)', values: load.map((p) => p.ctl), width: 2.5 },
                { name: 'Lelah', color: 'var(--accent)', values: load.map((p) => p.atl) },
              ]}
            />
            <p className="tiny muted" style={{ marginTop: 8 }}>Form = Fitness − Kelelahan. Positif berarti segar, negatif berarti sedang membangun kapasitas.</p>
          </div>

          <div className="card">
            <div className="card-h"><div><div className="mono">Kalender aktivitas</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>17 minggu terakhir</div></div></div>
            <DotHeatmap days={days} />
          </div>
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          <div className="section-h hide-d" style={{ marginTop: 14 }}><h3>Pelatih Kayuh</h3><span className="mono">AI insight</span></div>
          <div className="card flat hide-m" style={{ padding: '14px 18px' }}><span className="mono">Pelatih Kayuh · AI insight</span></div>
          {tips.map((t, i) => (
            <div key={i} className={`card ${t.tone === 'accent' ? 'ink' : ''}`} style={{ padding: 16 }}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <span className={`tag ${t.tone === 'good' ? 'good' : t.tone === 'warn' ? 'warn' : t.tone === 'accent' ? 'accent' : ''}`} style={{ marginTop: 2 }}>{t.tone === 'good' ? '↑' : t.tone === 'warn' ? '!' : t.tone === 'accent' ? '◎' : 'i'}</span>
                <div>
                  <div className="b">{t.title}</div>
                  <div className="small" style={{ marginTop: 3, opacity: 0.8 }}>{t.body}</div>
                </div>
              </div>
            </div>
          ))}

          <div className="card">
            <div className="card-h"><span className="mono">Dampak kamu</span><Leaf size={16} /></div>
            <div className="grid2">
              <div><div className="num" style={{ fontSize: 26 }}>{fmt(totalKm * CO2_PER_KM_MOTOR)}<span className="unit">kg CO₂</span></div><div className="tiny muted">dihemat vs naik motor</div></div>
              <div><div className="num" style={{ fontSize: 26 }}>{fmt(Math.round(totalKcal / KCAL_NASI_GORENG))}<span className="unit">piring</span></div><div className="tiny muted">nasi goreng terbakar 🍳</div></div>
              <div><div className="num" style={{ fontSize: 26 }}>Rp{fmt((commuteKm * settings.fuelPricePerKm) / 1000)}<span className="unit">rb</span></div><div className="tiny muted">hemat bensin & parkir</div></div>
              <div><div className="num" style={{ fontSize: 26 }}>{fmt(totalKm)}<span className="unit">km</span></div><div className="tiny muted">total 4 bulan</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-h"><h3>Ride terakhir</h3><a className="mono" href="#/rides">Semua →</a></div>
        <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <div className="list">
            {recent.map((r) => (
              <a key={r.id} className="li" href={'#/ride/' + r.id}>
                <div className="ico" style={{ background: 'var(--sunken)' }}><Bike size={16} /></div>
                <div className="grow">
                  <div className="t">{r.name}</div>
                  <div className="tiny muted">{relDay(r.date)} · {fmtDur(r.movingSec)} · {r.avgSpeed.toFixed(1)} km/j{r.friendIds?.length ? ` · 👥 ${r.friendIds.length}` : ''}</div>
                </div>
                <Sparkline values={r.elevations?.filter((_, i) => i % 4 === 0) ?? []} width={64} height={26} color="var(--ink-2)" />
                <div style={{ textAlign: 'right', minWidth: 58 }}><div className="num" style={{ fontSize: 20 }}>{r.distanceKm.toFixed(1)}</div><div className="mono">km</div></div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
