import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { readiness, trainingLoad } from '../lib/analytics'
import { fmtDate, HARI } from '../lib/util'
import { BarChart, Dial, LineChart } from '../charts/Charts'
import { Top } from '../components/UI'

export default function Insights() {
  const { rides, settings } = useStore()
  const load = useMemo(() => trainingLoad(rides, settings, 60), [rides, settings])
  const ready = readiness(load)
  const last = load[load.length - 1]
  const rec = (f: (r: (typeof rides)[number]) => number) => rides.reduce((b, r) => (f(r) > f(b) ? r : b), rides[0])
  const longest = rides.length ? rec((r) => r.distanceKm) : null
  const fastest = rides.length ? rec((r) => (r.distanceKm >= 20 ? r.avgSpeed : 0)) : null
  const climb = rides.length ? rec((r) => r.elevationM) : null
  const byDow = HARI.map((l, i) => ({ label: l, value: rides.filter((r) => new Date(r.date).getDay() === i).reduce((a, r) => a + r.distanceKm, 0) }))
  const speedBins = [16, 20, 24, 28, 32].map((lo, i, arr) => ({ label: `${lo}${i === arr.length - 1 ? '+' : ''}`, value: rides.filter((r) => r.avgSpeed >= lo && (i === arr.length - 1 || r.avgSpeed < arr[i + 1])).length, sub: `${lo}${i === arr.length - 1 ? '+' : '–' + arr[i + 1]} km/j` }))
  const tssWeek = load.slice(-7).reduce((a, p) => a + p.tss, 0)

  return (
    <div className="fadein">
      <Top title="Analisis performa" sub="Insight" back />
      <div className="bento">
        <div className="card accent span2 span2-d" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Dial value={ready.score} size={140} color="#fff" label={<span className="dot" style={{ fontSize: 44 }}>{ready.score}</span>} sub="kesiapan" />
          <div><div style={{ fontSize: 22, fontWeight: 600 }}>{ready.label}</div><div className="small" style={{ opacity: 0.85, marginTop: 4 }}>{ready.advice}</div></div>
        </div>
        <div className="card"><div className="mono">Fitness (CTL)</div><div className="dot" style={{ fontSize: 44, marginTop: 8 }}>{Math.round(last.ctl)}</div><div className="tiny muted">rata-rata beban 42 hari</div></div>
        <div className="card"><div className="mono">Beban 7 hari</div><div className="dot" style={{ fontSize: 44, marginTop: 8 }}>{tssWeek}</div><div className="tiny muted">total TSS</div></div>
      </div>

      <div className="card section">
        <div className="card-h"><div><div className="mono">Form harian · 60 hari</div><div className="b" style={{ marginTop: 2 }}>Segar (+) vs lelah (−)</div></div></div>
        <LineChart zero labels={load.map((p) => { const d = new Date(p.day); return `${d.getDate()}/${d.getMonth() + 1}` })} series={[{ name: 'Form', color: 'var(--accent)', values: load.map((p) => p.ctl - p.atl) }]} height={170} />
        <div className="tiny muted" style={{ marginTop: 6 }}>Zona ideal untuk lomba/ride besar: +5 s.d. +20. Di bawah −25 risiko overtraining.</div>
      </div>

      <div className="grid2 section" style={{ marginTop: 14 }}>
        <div className="card"><div className="mono" style={{ marginBottom: 8 }}>Km per hari dalam seminggu</div><BarChart data={byDow} highlight={byDow.reduce((bi, d, i, a) => (d.value > a[bi].value ? i : bi), 0)} unit="km" height={150} /></div>
        <div className="card"><div className="mono" style={{ marginBottom: 8 }}>Sebaran kecepatan rata-rata</div><BarChart data={speedBins} highlight={speedBins.reduce((bi, d, i, a) => (d.value > a[bi].value ? i : bi), 0)} unit="ride" height={150} /></div>
      </div>

      <div className="section-h section"><h3>Rekor pribadi</h3></div>
      <div className="grid3">
        {[{ l: 'Terjauh', r: longest, v: longest?.distanceKm.toFixed(1), u: 'km' }, { l: 'Tercepat (≥20 km)', r: fastest, v: fastest?.avgSpeed.toFixed(1), u: 'km/j' }, { l: 'Tanjakan terbanyak', r: climb, v: climb?.elevationM, u: 'm' }].map((x) => x.r && (
          <a key={x.l} href={'#/ride/' + x.r.id} className="card click" style={{ textDecoration: 'none', padding: 14 }}>
            <div className="mono">{x.l}</div>
            <div className="dot" style={{ fontSize: 32, marginTop: 6 }}>{x.v}</div>
            <div className="mono">{x.u}</div>
            <div className="tiny muted" style={{ marginTop: 6 }}>{x.r.name} · {fmtDate(x.r.date)}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
