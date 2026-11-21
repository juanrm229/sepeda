import { useState } from 'react'
import { ArrowRight, Crosshair, Shuffle, Sparkles, Bell, Database, Eraser } from 'lucide-react'
import { useStore } from '../lib/store'
import { HoloOrb, HeadSticker, Portrait } from './Character'
import { applyPick, PART, randomChar, TABS } from '../lib/avatar'
import { celebrate, haptic } from './UI'
import { askPermission } from '../lib/notify'

const STEPS = 4

/** Onboarding pertama kali: kenalan, karakter, lokasi & target, data. */
export default function Onboarding() {
  const { settings, updateSettings, char, setChar, finishOnboarding } = useStore()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(settings.name === 'Juan' ? '' : settings.name)
  const [goal, setGoal] = useState(settings.weeklyGoalKm)
  const [loc, setLoc] = useState<'idle' | 'busy' | 'ok' | 'fail'>('idle')
  const [notif, setNotif] = useState(false)

  const next = () => { haptic(8); setStep((s) => Math.min(STEPS - 1, s + 1)) }
  const shuffle = () => setChar(randomChar())
  const headTab = TABS.find((t) => t.k === 'head')!, hairTab = TABS.find((t) => t.k === 'hair')!, hijabTab = TABS.find((t) => t.k === 'hijab')!
  const shapeIdx = (parseInt(char.head.split('-')[1]) - 1) % 4
  const locate = () => {
    setLoc('busy')
    navigator.geolocation?.getCurrentPosition(
      (p) => { updateSettings({ home: [p.coords.latitude, p.coords.longitude], homeLabel: 'Lokasi saya' }); setLoc('ok') },
      () => setLoc('fail'), { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  const finish = (demo: boolean) => {
    updateSettings({ name: name.trim() || 'Pesepeda', weeklyGoalKm: goal })
    finishOnboarding(demo)
    celebrate(1.2)
  }

  return (
    <div className="onb" role="dialog" aria-modal aria-label="Selamat datang di Kayuh">
      <div className="onb-in">
        <div className="story-bars" style={{ marginBottom: 18 }}>{Array.from({ length: STEPS }, (_, i) => <i key={i} className={i <= step ? 'done' : ''} />)}</div>

        {step === 0 && (
          <div className="onb-step" key="s0">
            <div className="mono">Selamat datang</div>
            <div className="dot" style={{ fontSize: 'clamp(72px, 22vw, 120px)', marginTop: 8 }}>KAYUH</div>
            <div style={{ display: 'grid', placeItems: 'center', margin: '18px 0' }}><HoloOrb size={220}><Portrait c={char} mood="semangat" size={190} style={{ marginBottom: -8 }} /></HoloOrb></div>
            <h2 className="display" style={{ fontSize: 30 }}>Gowes lebih pintar,<br />bareng squad.</h2>
            <p className="ink2" style={{ marginTop: 8 }}>Analitik latihan, karakter yang tumbuh bersamamu, rute dengan coffee break, dan pengingat yang paham cuaca.</p>
          </div>
        )}

        {step === 1 && (
          <div className="onb-step" key="s1">
            <div className="mono">1 · Kenalan dulu</div>
            <h2 className="display" style={{ fontSize: 32, marginTop: 6 }}>Siapa namamu?</h2>
            <input className="input" style={{ marginTop: 14, fontSize: 20, padding: 16 }} placeholder="Nama panggilan" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <div className="row between" style={{ marginTop: 22 }}>
              <div><div className="b">Karaktermu</div><div className="small muted">Bisa diubah kapan saja di menu Karakter.</div></div>
              <button className="btn ghost sm" onClick={shuffle}><Shuffle size={14} /> Acak</button>
            </div>
            <div style={{ display: 'grid', placeItems: 'center', marginTop: 10 }}><HoloOrb size={200}><Portrait c={char} mood="segar" size={172} style={{ marginBottom: -8 }} /></HoloOrb></div>
            <div className="mono" style={{ textAlign: 'center', marginTop: 14 }}>Gaya</div>
            <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 8 }}>
              {[['hair', 'hair-03'], ['hair', 'hair-01'], ['hair', 'hair-48'], ['hijab', 'hijabs-21'], ['hijab', 'hijabs-01']].map(([k, id], i) => {
                const tab = k === 'hair' ? hairTab : hijabTab
                const on = (char as unknown as Record<string, string | null>)[k] === id
                return (
                  <button key={id} onClick={() => setChar(applyPick(char, tab, id))} style={{ background: 'none', border: 0, padding: 0 }} aria-label={PART[id].l} aria-pressed={on}>
                    <HeadSticker c={{ ...applyPick(char, tab, id), hat: null }} size={50} tilt={[-6, 4, -3, 6, -4][i]} bg={on ? 'var(--yellow)' : 'var(--surface-2)'} />
                  </button>
                )
              })}
            </div>
            <div className="mono" style={{ textAlign: 'center', marginTop: 14 }}>Warna kulit</div>
            <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 8 }}>
              {[0, 1, 2, 3].map((tone) => {
                const id = `heads-${String(tone * 4 + shapeIdx + 1).padStart(2, '0')}`
                return <button key={id} aria-label={PART[id].l} onClick={() => setChar(applyPick(char, headTab, id))} style={{ width: 36, height: 36, borderRadius: '50%', border: char.head === id ? '3px solid var(--ink)' : '2px solid var(--line)', background: ['#f7dccb', '#f3cfa8', '#e9b07d', '#b9785a'][tone] }} />
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onb-step" key="s2">
            <div className="mono">2 · Basecamp & target</div>
            <h2 className="display" style={{ fontSize: 32, marginTop: 6 }}>Dari mana kamu biasa gowes?</h2>
            <p className="ink2" style={{ marginTop: 6 }}>Dipakai untuk cuaca, jam berangkat, dan titik temu adil. Disimpan hanya di perangkatmu.</p>
            <button className={`btn block ${loc === 'ok' ? 'accent' : 'ink'}`} style={{ marginTop: 14, padding: 16 }} onClick={locate} disabled={loc === 'busy'}>
              <Crosshair size={16} /> {loc === 'busy' ? 'Mencari lokasi…' : loc === 'ok' ? 'Lokasi tersimpan ✓' : loc === 'fail' ? 'Gagal — coba lagi' : 'Pakai lokasiku sekarang'}
            </button>
            {loc === 'fail' && <p className="tiny muted" style={{ marginTop: 6 }}>Tidak masalah — default Senayan, Jakarta. Bisa diubah di Profil.</p>}
            <div style={{ marginTop: 28 }}>
              <div className="row between"><span className="b">Target mingguan</span><span className="dot" style={{ fontSize: 34 }}>{goal}<span className="unit" style={{ fontFamily: 'var(--f-ui)' }}>km</span></span></div>
              <input type="range" min={20} max={400} step={10} value={goal} onChange={(e) => setGoal(+e.target.value)} style={{ width: '100%', marginTop: 10 }} aria-label="Target mingguan" />
              <div className="row between mono"><span>Santai</span><span>{goal < 60 ? 'Pemula' : goal < 150 ? 'Rutin' : goal < 250 ? 'Serius' : 'Atlet'}</span><span>Gila</span></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onb-step" key="s3">
            <div className="mono">3 · Hampir selesai</div>
            <h2 className="display" style={{ fontSize: 32, marginTop: 6 }}>Mau mulai dari mana{name ? `, ${name.split(' ')[0]}` : ''}?</h2>
            <div className="stack" style={{ marginTop: 16 }}>
              <button className="card click outline" style={{ textAlign: 'left', border: '2.5px solid var(--ink)' }} onClick={() => finish(true)}>
                <div className="row" style={{ gap: 12 }}><div className="ico" style={{ background: 'var(--accent)', color: '#fff' }}><Database size={16} /></div><div><div className="b">Jelajahi dengan data contoh</div><div className="small muted">4 bulan ride, squad, rute & coffee break — lihat semua fitur hidup.</div></div></div>
              </button>
              <button className="card click" style={{ textAlign: 'left', border: 0 }} onClick={() => finish(false)}>
                <div className="row" style={{ gap: 12 }}><div className="ico"><Eraser size={16} /></div><div><div className="b">Mulai bersih</div><div className="small muted">Kosong, siap mencatat ride pertamamu.</div></div></div>
              </button>
            </div>
            <div className="row between card sunk" style={{ marginTop: 14, padding: 14 }}>
              <div className="row" style={{ gap: 10 }}><Bell size={18} /><div><div className="b small">Notifikasi pengingat</div><div className="tiny muted">Jadwal gowes, servis, coffee break</div></div></div>
              <button className={`toggle ${notif ? 'on' : ''}`} aria-pressed={notif} aria-label="Notifikasi" onClick={async () => { const r = await askPermission(); setNotif(r === 'granted') }} />
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />
        {step < STEPS - 1 && (
          <div className="row between" style={{ marginTop: 20 }}>
            {step > 0 ? <button className="btn ghost" onClick={() => setStep(step - 1)}>Kembali</button> : <button className="btn ghost" onClick={() => finish(true)}>Lewati</button>}
            <button className="btn accent" style={{ padding: '14px 22px' }} onClick={next}>{step === 0 ? <>Ayo mulai <Sparkles size={16} /></> : <>Lanjut <ArrowRight size={16} /></>}</button>
          </div>
        )}
      </div>
    </div>
  )
}
