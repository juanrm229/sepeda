import { useMemo, useState } from 'react'
import { Download, Image as ImageIcon, Trash2, Users } from 'lucide-react'
import { useStore } from '../lib/store'
import { estPower, rideTSS, synthZones } from '../lib/analytics'
import { FeelCheck } from '../components/FeelCheck'
import { FeelFace, feelLabel } from '../components/Character'
import { fmt, fmtDate, fmtDur } from '../lib/util'
import { Avatar, toast, Top } from '../components/UI'
import { BaseMap, Route, SmallPin } from '../components/Map'
import { BarChart, ElevationProfile, ZoneBlocks, ZONE_NAMES } from '../charts/Charts'
import { download, gpx } from '../lib/ics'
import { go } from '../lib/router'
import type { Ride } from '../lib/types'

export default function RideDetail({ id }: { id: string }) {
  const { rides, settings, friends, deleteRide, setRideFeel } = useStore()
  const [feelOpen, setFeelOpen] = useState(false)
  const r = rides.find((x) => x.id === id)
  const splits = useMemo(() => (r ? computeSplits(r) : []), [r])
  if (!r) return <div><Top title="Ride tidak ditemukan" back /></div>
  const tss = rideTSS(r, settings)
  const watts = estPower(r, settings.weightKg)
  const zones = r.zones?.length ? r.zones : synthZones(r, settings)
  const zoneTime = [1, 2, 3, 4, 5].map((z) => zones.filter((x) => x === z).length / zones.length)
  const similar = rides.filter((x) => x.name === r.name && x.id !== r.id)
  const avgSimilar = similar.length ? similar.reduce((a, x) => a + x.avgSpeed, 0) / similar.length : 0
  const crew = (r.friendIds ?? []).map((fid) => friends.find((f) => f.id === fid)).filter(Boolean)

  return (
    <div className="fadein">
      <Top title={r.name} sub={fmtDate(r.date, true)} back />
      <div className="row-d">
        <div className="stack">
          <BaseMap center={r.track[0]} zoom={13} className="map tall" fit={r.track}>
            <Route track={r.track} color="#111" weight={6} />
            <Route track={r.track} color="#ff4d1f" weight={3} />
            <SmallPin pos={r.track[0]} color="#1f9d6a" />
            <SmallPin pos={r.track[r.track.length - 1]} color="#111" />
          </BaseMap>
          <div className="card">
            <div className="grid3">
              <div><div className="mono">Jarak</div><div className="dot" style={{ fontSize: 34, marginTop: 4 }}>{r.distanceKm.toFixed(1)}</div><div className="mono">km</div></div>
              <div><div className="mono">Waktu</div><div className="dot" style={{ fontSize: 34, marginTop: 4 }}>{fmtDur(r.movingSec).replace(' ', '')}</div><div className="mono">bergerak</div></div>
              <div><div className="mono">Rata-rata</div><div className="dot" style={{ fontSize: 34, marginTop: 4 }}>{r.avgSpeed.toFixed(1)}</div><div className="mono">km/j</div></div>
            </div>
            <div className="divider" />
            <div className="grid3">
              <div><div className="mono">Tanjakan</div><div className="num" style={{ fontSize: 22 }}>{fmt(r.elevationM)}<span className="unit">m</span></div></div>
              <div><div className="mono">Maks</div><div className="num" style={{ fontSize: 22 }}>{r.maxSpeed.toFixed(1)}<span className="unit">km/j</span></div></div>
              <div><div className="mono">Kalori</div><div className="num" style={{ fontSize: 22 }}>{fmt(r.calories)}</div></div>
              <div><div className="mono">Beban (TSS)</div><div className="num" style={{ fontSize: 22 }}>{tss}</div></div>
              <div><div className="mono">Daya est.</div><div className="num" style={{ fontSize: 22 }}>{watts}<span className="unit">W</span></div></div>
              <div><div className="mono">W/kg</div><div className="num" style={{ fontSize: 22 }}>{(watts / settings.weightKg).toFixed(1)}</div></div>
              <div><div className="mono">RPE</div><div className="num" style={{ fontSize: 22 }}>{r.rpe ?? '–'}<span className="unit">/10</span></div></div>
              <div><div className="mono">Detak rata²</div><div className="num" style={{ fontSize: 22 }}>{r.avgHr ?? '–'}<span className="unit">bpm</span></div></div>
              <div><div className="mono">Sepeda</div><div className="small b" style={{ marginTop: 4 }}>{useStore.getState().bikes.find((b) => b.id === r.bikeId)?.name.split('—')[1]?.trim() ?? '–'}</div></div>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><div><div className="mono">Pola intensitas</div><div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>Zona sepanjang ride</div></div></div>
            <div className="legend" style={{ marginBottom: 10 }}>
              {[5, 4, 3, 2, 1].map((z) => <span key={z}><i style={{ height: 8, width: 8, borderRadius: 2, background: ['', 'color-mix(in srgb, var(--ink) 18%, var(--surface))', 'color-mix(in srgb, var(--ink) 42%, var(--surface))', 'var(--ink)', 'color-mix(in srgb, var(--accent) 70%, var(--ink))', 'var(--accent)'][z] }} />{ZONE_NAMES[z].split(' ')[0]} {Math.round(zoneTime[z - 1] * 100)}%</span>)}
            </div>
            <ZoneBlocks zones={zones} durationSec={r.movingSec} />
            <p className="tiny muted" style={{ marginTop: 8 }}>Zona dalam (Z5, oranye) di bawah — dibaca seperti grafik pola tidur. {zoneTime[0] + zoneTime[1] > 0.7 ? 'Ride ini didominasi zona ringan: bagus untuk pondasi aerobik.' : zoneTime[3] + zoneTime[4] > 0.25 ? 'Banyak waktu di zona keras: beri 36–48 jam pemulihan.' : 'Campuran tempo: efektif tapi melelahkan bila terlalu sering.'}</p>
          </div>
          {r.elevations && r.elevations.length > 2 && (
            <div className="card"><div className="mono" style={{ marginBottom: 8 }}>Profil elevasi</div><ElevationProfile elev={r.elevations} distanceKm={r.distanceKm} /></div>
          )}
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          <div className="card lime click" onClick={() => setFeelOpen(true)}>
            <div className="row between">
              <div><div className="mono">Cek rasa</div><div className="display" style={{ fontSize: 30, marginTop: 4 }}>{r.feel != null ? feelLabel(r.feel) : 'Belum diisi'}</div><div className="small" style={{ marginTop: 4 }}>{r.feel != null ? `RPE ${r.rpe}/10 · ketuk untuk ubah` : 'Ketuk untuk mengisi, bantu pelatih belajar'}</div></div>
              <FeelFace v={r.feel ?? 0.5} size={110} />
            </div>
          </div>
          {similar.length > 0 && (
            <div className={`card ${r.avgSpeed >= avgSimilar ? 'accent' : 'ink'}`}>
              <div className="mono">Dibanding {similar.length} ride serupa</div>
              <div style={{ fontWeight: 600, fontSize: 20, marginTop: 4 }}>{r.avgSpeed >= avgSimilar ? `+${(r.avgSpeed - avgSimilar).toFixed(1)} km/j lebih cepat 🔥` : `${(r.avgSpeed - avgSimilar).toFixed(1)} km/j dari rata-rata`}</div>
              <div className="small" style={{ opacity: 0.8, marginTop: 4 }}>Rata-rata rute ini {avgSimilar.toFixed(1)} km/j.</div>
            </div>
          )}
          {splits.length > 1 && (
            <div className="card">
              <div className="mono" style={{ marginBottom: 8 }}>Kecepatan per segmen · {splits[0].km.toFixed(0)} km</div>
              <BarChart data={splits.map((s, i) => ({ label: `${Math.round(s.km * (i + 1))}`, value: s.speed, sub: `Segmen ${i + 1}` }))} highlight={splits.reduce((bi, s, i, a) => (s.speed > a[bi].speed ? i : bi), 0)} unit="km/j" height={150} />
              <div className="tiny muted" style={{ marginTop: 6 }}>Segmen tercepat ditandai oranye.</div>
            </div>
          )}
          {crew.length > 0 && (
            <div className="card">
              <div className="card-h"><span className="mono">Gowes bareng</span><Users size={15} /></div>
              <div className="row wrap" style={{ gap: 10 }}>{crew.map((f) => f && <div key={f.id} className="row" style={{ gap: 6 }}><Avatar name={f.name} color={f.color} c={f.char} size={30} /><span className="small">{f.name.split(' ')[0]}</span></div>)}</div>
            </div>
          )}
          <div className="card">
            <div className="mono" style={{ marginBottom: 10 }}>Bagikan</div>
            <div className="stack" style={{ gap: 8 }}>
              <button className="btn ink" onClick={() => shareCard(r, settings.name)}><ImageIcon size={16} /> Kartu story (PNG)</button>
              <button className="btn ghost" onClick={() => download(`${r.name}.gpx`, gpx(r.name, r.track, r.date), 'application/gpx+xml')}><Download size={16} /> Ekspor GPX (Strava/Garmin)</button>
              <button className="btn ghost" style={{ color: 'var(--bad)' }} onClick={() => { if (confirm('Hapus ride ini?')) { deleteRide(r.id); toast('Ride dihapus'); go('') } }}><Trash2 size={16} /> Hapus</button>
            </div>
          </div>
        </div>
      </div>
      <FeelCheck open={feelOpen} initial={r.feel ?? 0.6} initialRpe={r.rpe ?? 6} onClose={() => setFeelOpen(false)} onSave={(f, rpe) => { setRideFeel(r.id, f, rpe); setFeelOpen(false); toast('Tersimpan', 'Titik manismu makin akurat') }} />
    </div>
  )
}

function computeSplits(r: Ride) {
  const segKm = r.distanceKm > 60 ? 10 : r.distanceKm > 25 ? 5 : 2
  const n = Math.max(1, Math.floor(r.distanceKm / segKm))
  const out: { km: number; speed: number }[] = []
  const elev = r.elevations ?? []
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i / n) * (elev.length - 1)), b = Math.floor(((i + 1) / n) * (elev.length - 1))
    const grade = elev.length > 1 ? (elev[b] - elev[a]) / (segKm * 1000) : 0
    const wobble = Math.sin(i * 1.7 + r.distanceKm) * 1.2
    out.push({ km: segKm, speed: Math.max(8, r.avgSpeed - grade * 260 + wobble) })
  }
  return out
}

/** Kartu story 1080×1920 gaya dot-matrix, dirender di canvas. */
async function shareCard(r: Ride, name: string) {
  await document.fonts.ready
  const W = 1080, H = 1920
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#e8e7e3'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#d6d5cf'
  for (let x = 20; x < W; x += 36) for (let y = 20; y < H; y += 36) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill() }
  // rute
  const lats = r.track.map((p) => p[0]), lngs = r.track.map((p) => p[1])
  const [minA, maxA, minO, maxO] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  const box = { x: 140, y: 380, w: 800, h: 760 }
  const k = Math.min(box.w / (maxO - minO || 1), box.h / (maxA - minA || 1))
  const px = (p: [number, number]) => [box.x + (box.w - (maxO - minO) * k) / 2 + (p[1] - minO) * k, box.y + (box.h - (maxA - minA) * k) / 2 + (maxA - p[0]) * k]
  g.lineJoin = 'round'; g.lineCap = 'round'
  g.strokeStyle = '#111'; g.lineWidth = 26; g.beginPath(); r.track.forEach((p, i) => { const [x, y] = px(p); i ? g.lineTo(x, y) : g.moveTo(x, y) }); g.stroke()
  g.strokeStyle = '#ff4d1f'; g.lineWidth = 12; g.stroke()
  g.fillStyle = '#111'
  g.font = '700 30px "Space Mono"'; g.fillText('KAYUH · ' + fmtDate(r.date).toUpperCase(), 90, 150)
  g.font = '600 72px "Inter Tight"'; g.fillText(r.name, 90, 250)
  g.font = '700 26px "Space Mono"'; g.fillStyle = '#555'; g.fillText(name.toUpperCase(), 90, 300)
  const stat = (label: string, val: string, unit: string, x: number, y: number) => {
    g.fillStyle = '#777'; g.font = '700 26px "Space Mono"'; g.fillText(label, x, y)
    g.fillStyle = '#111'; g.font = '900 150px "Doto"'; g.fillText(val, x - 6, y + 150)
    g.font = '600 32px "Inter Tight"'; g.fillStyle = '#555'; g.fillText(unit, x, y + 200)
  }
  stat('JARAK', r.distanceKm.toFixed(1), 'kilometer', 90, 1260)
  stat('RATA²', r.avgSpeed.toFixed(1), 'km/jam', 580, 1260)
  stat('WAKTU', fmtDur(r.movingSec).replace(' ', ''), 'bergerak', 90, 1560)
  stat('NANJAK', String(r.elevationM), 'meter', 580, 1560)
  g.fillStyle = '#ff4d1f'; g.beginPath(); g.arc(W - 110, 140, 22, 0, 7); g.fill()
  c.toBlob(async (blob) => {
    if (!blob) return
    const file = new File([blob], 'kayuh-ride.png', { type: 'image/png' })
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: r.name }); return }
    } catch { /* batal */ }
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'kayuh-ride.png'; a.click()
    toast('Kartu story diunduh')
  }, 'image/png')
}
