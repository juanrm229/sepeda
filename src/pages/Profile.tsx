import { useState } from 'react'
import { Crosshair, Download, RefreshCw, Trash2, Moon, Sun } from 'lucide-react'
import { useStore } from '../lib/store'
import { MyPayAccounts } from '../components/PayAccounts'
import { badges, level, levelTitle } from '../lib/analytics'
import { fmt } from '../lib/util'
import { confirmDialog, toast, Top } from '../components/UI'
import { HeadSticker } from '../components/Character'
import { go } from '../lib/router'
import { BaseMap, SmallPin } from '../components/Map'
import { download } from '../lib/ics'

export default function Profile() {
  const st = useStore()
  const { settings, updateSettings, rides } = st
  const lv = level(rides)
  const bs = badges(rides)
  const [locating, setLocating] = useState(false)
  const totalKm = rides.reduce((a, r) => a + r.distanceKm, 0)
  const totalElev = rides.reduce((a, r) => a + r.elevationM, 0)

  function locate() {
    setLocating(true)
    navigator.geolocation?.getCurrentPosition(
      (p) => { updateSettings({ home: [p.coords.latitude, p.coords.longitude], homeLabel: 'Lokasi saya' }); setLocating(false); toast('📍 Lokasi rumah diperbarui', 'Cuaca & titik temu memakai lokasi baru') },
      () => { setLocating(false); toast('Tidak bisa mengambil lokasi', 'Izinkan akses lokasi, atau ketuk peta') },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const num = (k: 'weightKg' | 'maxHr' | 'thresholdSpeed' | 'weeklyGoalKm' | 'fuelPricePerKm', label: string, unit: string) => (
    <label className="field"><span className="mono">{label}</span>
      <div className="row"><input className="input" type="number" value={settings[k]} onChange={(e) => updateSettings({ [k]: +e.target.value } as any)} /><span className="muted small" style={{ minWidth: 40 }}>{unit}</span></div>
    </label>
  )

  return (
    <div className="fadein">
      <Top title="Profil" sub="Pengaturan & pencapaian" back="karakter" right={<button className="iconbtn" onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} aria-label="Ganti tema">{settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>} />
      <div className="row-d">
        <div className="stack">
          <div className="card ink">
            <div className="row" style={{ gap: 14 }}>
              <HeadSticker c={st.char} mood="segar" size={68} tilt={-6} bg="var(--yellow)" />
              <div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{settings.name}</div>
                <div className="mono">Level {lv.lvl} · {levelTitle(lv.lvl)}</div>
              </div>
            </div>
            <div className="meter" style={{ marginTop: 16, background: 'rgba(255,255,255,.15)' }}><i style={{ width: `${(lv.cur / lv.next) * 100}%`, background: 'var(--accent)' }} /></div>
            <div className="row between mono" style={{ marginTop: 8 }}><span>{fmt(lv.cur)} XP</span><span>{fmt(lv.next)} XP ke level {lv.lvl + 1}</span></div>
            <div className="grid3" style={{ marginTop: 16 }}>
              <div><div className="mono">Total</div><div className="dot" style={{ fontSize: 28 }}>{fmt(totalKm)}</div><div className="mono">km</div></div>
              <div><div className="mono">Tanjakan</div><div className="dot" style={{ fontSize: 28 }}>{fmt(totalElev)}</div><div className="mono">m</div></div>
              <div><div className="mono">Ride</div><div className="dot" style={{ fontSize: 28 }}>{rides.length}</div><div className="mono">×</div></div>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><div><div className="mono">Rekening & e-wallet</div><div className="b" style={{ marginTop: 2 }}>Ikut otomatis di tagihan patungan</div></div><a href="#/patungan" className="link">Patungan</a></div>
            <MyPayAccounts />
          </div>

          <div className="section-h" style={{ marginTop: 10 }}><h3>Lencana</h3><span className="mono">{bs.filter((b) => b.got).length}/{bs.length}</span></div>
          <div className="grid3">
            {bs.map((b) => (
              <div key={b.id} className={`card ${b.got ? '' : 'flat'}`} style={{ textAlign: 'center', padding: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto', display: 'grid', placeItems: 'center', fontSize: 22, background: b.got ? 'var(--accent)' : 'var(--sunken)', color: b.got ? '#fff' : 'var(--muted)' }}>{b.icon}</div>
                <div className="small b" style={{ marginTop: 8 }}>{b.name}</div>
                <div className="tiny muted">{b.desc}</div>
                {!b.got && <div className="meter" style={{ height: 4, marginTop: 8 }}><i style={{ width: `${b.progress * 100}%` }} /></div>}
              </div>
            ))}
          </div>
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          <div className="card">
            <div className="mono" style={{ marginBottom: 12 }}>Data diri & latihan</div>
            <div className="stack">
              <label className="field"><span className="mono">Nama</span><input className="input" value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} /></label>
              <div className="grid2">
                {num('weightKg', 'Berat', 'kg')}
                {num('maxHr', 'Detak maks', 'bpm')}
                {num('thresholdSpeed', 'Kecepatan ambang', 'km/j')}
                {num('weeklyGoalKm', 'Target mingguan', 'km')}
              </div>
              {num('fuelPricePerKm', 'Biaya motor/ojek per km (untuk hitung penghematan)', 'Rp')}
            </div>
          </div>

          <div className="card">
            <div className="mono" style={{ marginBottom: 12 }}>Kontak darurat (SOS)</div>
            <div className="grid2">
              <label className="field"><span className="mono">Nama</span><input className="input" value={settings.emergencyName} placeholder="mis. Ibu" onChange={(e) => updateSettings({ emergencyName: e.target.value })} /></label>
              <label className="field"><span className="mono">No. WhatsApp</span><input className="input" type="tel" value={settings.emergencyPhone} placeholder="08…" onChange={(e) => updateSettings({ emergencyPhone: e.target.value })} /></label>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><span className="mono">Lokasi rumah (untuk cuaca & titik temu)</span><button className="btn sm ghost" onClick={locate}><Crosshair size={14} /> {locating ? 'Mencari…' : 'Pakai lokasiku'}</button></div>
            <BaseMap center={settings.home} zoom={12} className="map" onClick={(p) => updateSettings({ home: p, homeLabel: 'Titik pilihan' })}><SmallPin pos={settings.home} color="#d2441c" /></BaseMap>
            <div className="tiny muted" style={{ marginTop: 8 }}>Ketuk peta untuk mengubah. Lokasi hanya disimpan di perangkatmu.</div>
          </div>

          <div className="card">
            <div className="mono" style={{ marginBottom: 12 }}>Data</div>
            <div className="stack" style={{ gap: 8 }}>
              <button className="btn ghost" onClick={() => download('kayuh-data.json', JSON.stringify({ rides: st.rides, friends: st.friends, groupRides: st.groupRides, reminders: st.reminders, bikes: st.bikes, settings: st.settings }, null, 2), 'application/json')}><Download size={16} /> Ekspor semua data (JSON)</button>
              <button className="btn ghost" onClick={() => { useStore.setState({ onboarded: false }); go('') }}>✨ Ulangi perkenalan</button>
              <button className="btn ghost" onClick={() => { st.resetDemo(); toast('🔄 Data contoh dimuat ulang') }}><RefreshCw size={16} /> Muat ulang data contoh</button>
              <button className="btn ghost" style={{ color: 'var(--bad)' }} onClick={async () => { if (await confirmDialog('Mulai dari nol?', { body: 'Semua ride, jadwal, dan rute contoh akan dihapus. Karakter & pengaturan tetap.', ok: 'Kosongkan', danger: true })) { st.clearAll(); toast('🧹 Data dikosongkan', 'Siap mencatat ride pertamamu') } }}><Trash2 size={16} /> Mulai dari nol</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
