import { Sunrise, Sunset, Wind, Droplets, Thermometer, Sun, Gauge } from 'lucide-react'
import { useStore } from '../lib/store'
import { useForecast } from '../lib/useForecast'
import { bestWindow, scoreLabel, windAdvice } from '../lib/weather'
import { HourBars, Dial } from '../charts/Charts'
import { Top } from '../components/UI'
import { relDay } from '../lib/util'

const hh = (d: Date) => `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`

export default function Weather() {
  const { settings } = useStore()
  const fc = useForecast(settings.home)
  if (!fc) return <div><Top title="Cuaca gowes" back /><div className="empty">Memuat prakiraan…</div></div>
  const win = bestWindow(fc.hours, 2)
  const win3 = bestWindow(fc.hours, 3)
  const now = fc.hours.find((h) => h.time.getTime() >= Date.now() - 3600000) ?? fc.hours[0]
  const fut = fc.hours.filter((h) => h.time.getTime() >= Date.now() - 3600000).slice(0, 36)

  return (
    <div className="fadein">
      <Top title="Cuaca gowes" sub={`${settings.homeLabel}${fc.demo ? ' · data contoh' : ' · Open-Meteo'}`} back />
      <div className="bento">
        <div className="card accent span2 span2-d">
          <div className="mono">Jendela terbaik (2 jam)</div>
          {win && <>
            <div className="dot" style={{ fontSize: 64, marginTop: 8 }}>{hh(win.start)}</div>
            <div style={{ marginTop: 6 }}>{relDay(win.start.toISOString())} · s.d. {hh(win.end)} · skor {win.score} ({scoreLabel(win.score)})</div>
          </>}
          {win3 && <div className="small" style={{ marginTop: 10, opacity: 0.85 }}>Untuk ride 3 jam: mulai {hh(win3.start)} {relDay(win3.start.toISOString()).toLowerCase()} (skor {win3.score}).</div>}
        </div>
        <div className="card span2 span2-d" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Dial value={now.score} size={130} label={<span className="dot" style={{ fontSize: 38 }}>{now.score}</span>} sub="sekarang" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 20 }}>{scoreLabel(now.score)}</div>
            <div className="small muted" style={{ marginTop: 4 }}>{now.reasons.length ? 'Faktor: ' + now.reasons.join(', ') : 'Tidak ada faktor penghambat.'}</div>
          </div>
        </div>
      </div>

      <div className="card section">
        <div className="card-h"><div><div className="mono">Skor gowes per jam</div><div className="b" style={{ marginTop: 2 }}>36 jam ke depan</div></div><Gauge size={16} /></div>
        <HourBars hours={fut} best={win ? [win.start.getTime(), win.end.getTime()] : undefined} />
        <div className="legend" style={{ marginTop: 8 }}>
          <span><i style={{ background: 'var(--accent)', height: 8, width: 8, borderRadius: 2 }} />Jendela terbaik</span>
          <span><i style={{ background: 'var(--ink)', height: 8, width: 8, borderRadius: 2 }} />Skor ≥ 60</span>
          <span><i style={{ background: 'var(--line)', height: 8, width: 8, borderRadius: 2 }} />Kurang ideal</span>
        </div>
      </div>

      <div className="grid2 section" style={{ marginTop: 14 }}>
        <div className="card"><Thermometer size={16} /><div className="mono" style={{ marginTop: 8 }}>Suhu / terasa</div><div className="num" style={{ fontSize: 28, marginTop: 4 }}>{Math.round(now.temp)}° <span className="unit">/ {Math.round(now.feels)}°</span></div></div>
        <div className="card"><Droplets size={16} /><div className="mono" style={{ marginTop: 8 }}>Peluang hujan</div><div className="num" style={{ fontSize: 28, marginTop: 4 }}>{now.rain}%</div></div>
        <div className="card"><Sun size={16} /><div className="mono" style={{ marginTop: 8 }}>Indeks UV</div><div className="num" style={{ fontSize: 28, marginTop: 4 }}>{now.uv.toFixed(0)}</div></div>
        <div className="card"><Gauge size={16} /><div className="mono" style={{ marginTop: 8 }}>Kualitas udara (AQI)</div><div className="num" style={{ fontSize: 28, marginTop: 4 }}>{now.aqi ?? '–'}</div></div>
        <div className="card"><Sunrise size={16} /><div className="mono" style={{ marginTop: 8 }}>Matahari terbit</div><div className="num" style={{ fontSize: 28, marginTop: 4 }}>{fc.sunrise ? hh(fc.sunrise) : '–'}</div></div>
        <div className="card"><Sunset size={16} /><div className="mono" style={{ marginTop: 8 }}>Terbenam</div><div className="num" style={{ fontSize: 28, marginTop: 4 }}>{fc.sunset ? hh(fc.sunset) : '–'}</div></div>
      </div>

      <div className="card ink section">
        <div className="card-h"><span className="mono">Strategi angin</span><Wind size={16} /></div>
        <div className="row" style={{ gap: 16 }}>
          <svg width="70" height="70" viewBox="0 0 70 70" aria-hidden style={{ flexShrink: 0 }}>
            <circle cx="35" cy="35" r="32" fill="none" stroke="currentColor" opacity=".25" />
            <text x="35" y="12" textAnchor="middle" fontSize="9" fill="currentColor" fontFamily="var(--f-mono)">U</text>
            <g transform={`rotate(${now.windDir + 180} 35 35)`}><path d="M35 12 L42 40 L35 34 L28 40Z" fill="var(--accent)" /></g>
          </svg>
          <div className="small">{windAdvice(now.windDir, now.wind)}</div>
        </div>
      </div>
      {now.aqi != null && now.aqi > 100 && <div className="card flat section small">😷 AQI {now.aqi}: udara kurang sehat. Pilih rute taman/jalan kecil, kurangi intensitas, atau pakai masker sport.</div>}
    </div>
  )
}
