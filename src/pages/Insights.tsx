import { useMemo } from 'react'
import { Gauge, Heart, Clock, Sparkles, Timer, Scale } from 'lucide-react'
import { useStore } from '../lib/store'
import { efficiencyTrend, estFTP, feelSweetSpot, polarization, predictTimes, readiness, rideClock, trainingLoad } from '../lib/analytics'
import { fmtDate, HARI } from '../lib/util'
import { BarChart, Dial, LineChart, RadialClock, SegBar, SweetScatter } from '../charts/Charts'
import { Top } from '../components/UI'

const hm = (sec: number) => `${Math.floor(sec / 3600)}:${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`

export default function Insights() {
  const { rides, settings } = useStore()
  const load = useMemo(() => trainingLoad(rides, settings, 90), [rides, settings])
  const ready = readiness(load)
  const last = load[load.length - 1]
  const form = last.ctl - last.atl
  const ftp = estFTP(rides, settings.weightKg)
  const pol = polarization(rides, settings)
  const sweet = useMemo(() => feelSweetSpot(rides, load), [rides, load])
  const clock = useMemo(() => rideClock(rides), [rides])
  const preds = predictTimes(rides)
  const ef = efficiencyTrend(rides)
  const efChange = ef.length > 3 ? ((ef[ef.length - 1].ef - ef[0].ef) / ef[0].ef) * 100 : 0
  const peak = clock.indexOf(Math.max(...clock))
  const tssWeek = load.slice(-7).reduce((a, p) => a + p.tss, 0)
  const rec = (f: (r: (typeof rides)[number]) => number) => rides.reduce((b, r) => (f(r) > f(b) ? r : b), rides[0])
  const longest = rides.length ? rec((r) => r.distanceKm) : null
  const fastest = rides.length ? rec((r) => (r.distanceKm >= 20 ? r.avgSpeed : 0)) : null
  const climb = rides.length ? rec((r) => r.elevationM) : null
  const byDow = HARI.map((l, i) => ({ label: l, value: rides.filter((r) => new Date(r.date).getDay() === i).reduce((a, r) => a + r.distanceKm, 0) }))
  const polVerdict = pol.easy >= 0.75 ? 'Terpolarisasi dengan baik. Pola juara: banyak ringan, sedikit keras.' : pol.mod > 0.35 ? 'Terlalu banyak di “zona abu-abu” (tempo). Buat ride santai lebih santai, dan sesi keras lebih keras.' : 'Porsi intensitas tinggi besar. Tambah ride zona 2 supaya pondasi aerobik kuat.'
  const inSweet = sweet ? form >= sweet.lo && form <= sweet.hi : false

  return (
    <div className="fadein">
      <Top title="Analisis" sub="Performa · 90 hari" back />

      <div className="bento">
        <div className="card accent span2 span2-d" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Dial value={ready.score} size={140} color="#fff" label={<span className="dot" style={{ fontSize: 44 }}>{ready.score}</span>} sub="kesiapan" />
          <div>
            <div className="display" style={{ fontSize: 28 }}>{ready.label}</div>
            <div className="small" style={{ opacity: 0.9, marginTop: 6 }}>{ready.advice}</div>
            <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
              <span className="tag" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>Fitness {Math.round(last.ctl)}</span>
              <span className="tag" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>Lelah {Math.round(last.atl)}</span>
              <span className="tag" style={{ background: '#fff', color: '#111' }}>Form {form >= 0 ? '+' : ''}{Math.round(form)}</span>
            </div>
          </div>
        </div>

        <div className="card span2 span2-d">
          <div className="card-h"><div><div className="mono">FTP estimasi · tanpa power meter</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Mesin tubuhmu</div></div><Gauge size={18} /></div>
          <div className="row" style={{ alignItems: 'flex-end', gap: 16 }}>
            <div><span className="dot" style={{ fontSize: 56 }}>{ftp.ftp}</span><span className="unit">W</span></div>
            <div style={{ paddingBottom: 8 }}><span className="num" style={{ fontSize: 30 }}>{ftp.wkg.toFixed(2)}</span><span className="unit">W/kg</span></div>
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 14 }}>
            {['Pemula', 'Rekreasi', 'Penggemar', 'Kompetitif', 'Elite'].map((c, i) => (
              <div key={c} style={{ flex: 1 }}>
                <div style={{ height: 10, borderRadius: 3, background: i === ftp.catIdx ? 'var(--accent)' : i < ftp.catIdx ? 'var(--ink)' : 'var(--sunken)' }} />
                <div className="mono" style={{ fontSize: 8.5, marginTop: 5, color: i === ftp.catIdx ? 'var(--ink)' : undefined }}>{c}</div>
              </div>
            ))}
          </div>
          <p className="tiny muted" style={{ marginTop: 10 }}>Dihitung dari fisika ride-mu: hambatan gulir, aerodinamika (udara tropis), dan kerja melawan gravitasi untuk berat {settings.weightKg} kg + sepeda 9 kg.</p>
        </div>
      </div>

      <div className="card section">
        <div className="card-h"><div><div className="mono">Beban latihan · 90 hari</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Fitness, kelelahan & form</div></div><span className="mono">TSS 7 hari: {tssWeek}</span></div>
        <div className="legend" style={{ marginBottom: 8 }}><span><i style={{ background: 'var(--ink)' }} />Fitness</span><span><i style={{ background: 'var(--muted)' }} />Kelelahan</span><span><i style={{ background: 'var(--accent)' }} />Form</span></div>
        <LineChart zero labels={load.map((p) => { const d = new Date(p.day); return `${d.getDate()}/${d.getMonth() + 1}` })}
          series={[{ name: 'Fitness', color: 'var(--ink)', values: load.map((p) => p.ctl), width: 2.5 }, { name: 'Lelah', color: 'var(--muted)', values: load.map((p) => p.atl) }, { name: 'Form', color: 'var(--accent)', values: load.map((p) => p.ctl - p.atl) }]} height={230} />
        <a href="#/rencana" className="btn ghost sm" style={{ marginTop: 10 }}>Lihat proyeksi 14 hari di Rencana →</a>
      </div>

      <div className="row-d section">
        <div className="stack">
          <div className="card lime">
            <div className="card-h"><div><div className="mono">Titik manis pribadi</div><div className="display" style={{ fontSize: 24, marginTop: 4 }}>Kapan kamu merasa paling enak?</div></div><Sparkles size={18} /></div>
            {sweet ? (
              <>
                <div style={{ background: 'var(--surface-2)', borderRadius: 18, padding: 10, color: 'var(--ink)' }}><SweetScatter pts={sweet.pts} lo={sweet.lo} hi={sweet.hi} /></div>
                <div style={{ marginTop: 12, fontWeight: 600 }}>Kamu paling menikmati ride saat Form {sweet.lo >= 0 ? '+' : ''}{sweet.lo} s.d. {sweet.hi >= 0 ? '+' : ''}{sweet.hi}.</div>
                <div className="small" style={{ marginTop: 4 }}>Rasa rata-rata {Math.round(sweet.avgIn * 100)}% di zona ini vs {Math.round(sweet.avgOut * 100)}% di luar. Form hari ini {form >= 0 ? '+' : ''}{Math.round(form)} — {inSweet ? 'kamu sedang di titik manis, waktunya ride yang kamu tunggu-tunggu! 🎯' : form < sweet.lo ? 'masih di bawah titik manis; 1–2 hari ringan akan membawamu ke sana.' : 'di atas titik manis; tubuh segar tapi butuh stimulus.'}</div>
              </>
            ) : <div className="small">Isi “cek rasa” setelah minimal 8 ride untuk menemukan titik manismu.</div>}
          </div>

          <div className="card">
            <div className="card-h"><div><div className="mono">Distribusi intensitas · 28 hari</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Cek aturan 80/20</div></div><Scale size={18} /></div>
            <SegBar parts={[{ v: pol.easy, color: 'var(--ink)', label: 'Ringan Z1–2' }, { v: pol.mod, color: 'var(--muted)', label: 'Tempo Z3' }, { v: pol.hard, color: 'var(--accent)', label: 'Keras Z4–5' }]} />
            <div style={{ position: 'relative', height: 14, marginTop: 4 }}>
              <div style={{ position: 'absolute', left: '80%', top: 0, bottom: 0, borderLeft: '1.5px dashed var(--ink)' }} />
              <span className="mono" style={{ position: 'absolute', left: 'calc(80% + 4px)', top: 0, fontSize: 9 }}>target 80%</span>
            </div>
            <p className="small ink2" style={{ marginTop: 8 }}>{polVerdict}</p>
          </div>

          <div className="card">
            <div className="card-h"><div><div className="mono">Efisiensi aerobik</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Kecepatan per detak jantung</div></div><span className={`tag ${efChange >= 0 ? 'good' : 'warn'}`}><Heart size={11} /> {efChange >= 0 ? '+' : ''}{efChange.toFixed(1)}%</span></div>
            {ef.length > 2 && <LineChart labels={ef.map((e) => e.label)} series={[{ name: 'EF', color: 'var(--accent)', values: ef.map((e) => e.ef) }]} height={150} />}
            <p className="tiny muted" style={{ marginTop: 6 }}>Naik = jantung makin efisien: kecepatan sama dengan detak lebih rendah. Indikator paling jujur bahwa pondasi aerobikmu membaik.</p>
          </div>
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          <div className="card">
            <div className="card-h"><div><div className="mono">Jam emas</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Kapan kamu biasa gowes</div></div><Clock size={18} /></div>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <RadialClock values={clock} size={250} now={false} center={<div><div className="dot" style={{ fontSize: 34 }}>{String(peak).padStart(2, '0')}.00</div><div className="mono">jam favorit</div></div>} />
            </div>
          </div>

          <div className="card ink">
            <div className="card-h"><div><div className="mono">Prediksi waktu tempuh</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Dengan fitness saat ini (rute datar)</div></div><Timer size={18} /></div>
            <div className="grid3">
              {preds.map((p) => (
                <div key={p.km}>
                  <div className="mono">{p.km} km</div>
                  <div className="dot" style={{ fontSize: 32, marginTop: 6 }}>{hm(p.sec)}</div>
                  <div className="mono" style={{ marginTop: 4 }}>{p.spd.toFixed(1)} km/j</div>
                </div>
              ))}
            </div>
            <p className="tiny" style={{ opacity: 0.6, marginTop: 10 }}>Rumus Riegel dari performa terbaik 45 hari, dikoreksi tanjakan. Tambah ±10% untuk istirahat makan.</p>
          </div>

          <div className="card"><div className="mono" style={{ marginBottom: 8 }}>Km per hari dalam seminggu</div><BarChart data={byDow} highlight={byDow.reduce((bi, d, i, a) => (d.value > a[bi].value ? i : bi), 0)} unit="km" height={150} /></div>

          <div className="section-h" style={{ marginTop: 6, marginBottom: 0 }}><h3 className="display" style={{ fontSize: 22 }}>Rekor pribadi</h3></div>
          <div className="grid3">
            {[{ l: 'Terjauh', r: longest, v: longest?.distanceKm.toFixed(1), u: 'km' }, { l: 'Tercepat', r: fastest, v: fastest?.avgSpeed.toFixed(1), u: 'km/j' }, { l: 'Nanjak', r: climb, v: climb?.elevationM, u: 'm' }].map((x) => x.r && (
              <a key={x.l} href={'#/ride/' + x.r.id} className="card click" style={{ textDecoration: 'none', padding: 14 }}>
                <div className="mono">{x.l}</div>
                <div className="dot" style={{ fontSize: 28, marginTop: 6 }}>{x.v}</div>
                <div className="mono">{x.u}</div>
                <div className="tiny muted" style={{ marginTop: 6 }}>{fmtDate(x.r.date)}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
