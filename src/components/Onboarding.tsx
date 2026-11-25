import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Crosshair, Eye, EyeOff, Loader2, Shuffle } from 'lucide-react'
import { useStore } from '../lib/store'
import { AvatarImg, HeadBadge } from './Character'
import { randomChar, SKINS } from '../lib/avatar'
import { celebrate, haptic } from './UI'
import { Orbit } from './Orbit'
import { LogoMark } from './Logo'
import { seedFriends } from '../lib/seed'
import { api, ApiError, setTokenGetter } from '../lib/api'
import { resetSyncHashes } from '../lib/sync'
import { bit, isFree, SLOTS } from '../lib/meetup'
import { HARI } from '../lib/util'
import type { CharConfig } from '../lib/types'

type Step = 'welcome' | 'signup' | 'login' | 'guest' | 'char' | 'handle' | 'free' | 'pay' | 'done'
const FLOW: Step[] = ['char', 'handle', 'free', 'pay', 'done']
const ORDER = [1, 2, 3, 4, 5, 6, 0]
const PRESETS: { l: string; bits: [number, number][] }[] = [
  { l: 'Sabtu pagi', bits: [[6, 0]] }, { l: 'Minggu pagi', bits: [[0, 0]] }, { l: 'Sore weekend', bits: [[6, 1], [0, 1]] },
  { l: 'Malam hari kerja', bits: [[1, 2], [2, 2], [3, 2], [4, 2]] }, { l: 'Pagi sebelum kerja', bits: [[1, 0], [3, 0], [5, 0]] },
]

/** Onboarding PACK: sambutan ala DailyLoop → daftar/masuk → karakter → username → waktu free → rekening. */
export default function Onboarding({ start = 'welcome', onClose }: { start?: Step; onClose?: () => void }) {
  const st = useStore()
  const [step, setStep] = useState<Step>(start)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [name, setName] = useState(st.settings.name && st.settings.name !== 'Juan' ? st.settings.name : '')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [handle, setHandle] = useState('')
  const [loc, setLoc] = useState<'idle' | 'busy' | 'ok' | 'fail'>('idle')
  const [bank, setBank] = useState({ provider: 'BCA', number: '' })
  const [demo, setDemo] = useState(true)
  const alts = useMemo(() => Array.from({ length: 6 }, (_, i) => randomChar('alt' + i + Date.now())), [st.char.hair]) // eslint-disable-line react-hooks/exhaustive-deps
  const keepLocal = !!onClose // mengubah mode tamu menjadi akun: data lokal ikut diunggah

  const idx = FLOW.indexOf(step)
  const go = (s: Step) => { haptic(8); setErr(''); setStep(s) }

  async function doSignup() {
    setBusy(true); setErr('')
    try {
      const r = await api.signup({ email, password: pw, name: name.trim(), char: st.char, home: st.settings.home, homeLabel: st.settings.homeLabel })
      st.setAuth({ token: r.token, uid: r.user.uid, email: r.user.email, handle: r.profile.handle })
      setTokenGetter(() => useStore.getState().auth?.token ?? null)
      resetSyncHashes()
      if (!keepLocal) st.freshStart()
      st.updateSettings({ name: name.trim() })
      setHandle(r.profile.handle)
      go('char')
    } catch (e) { setErr((e as ApiError).message) }
    setBusy(false)
  }
  async function doLogin() {
    setBusy(true); setErr('')
    try {
      const r = await api.login(email, pw)
      st.setAuth({ token: r.token, uid: r.user.uid, email: r.user.email, handle: r.profile.handle })
      setTokenGetter(() => useStore.getState().auth?.token ?? null)
      resetSyncHashes()
      if (r.state?.state) st.applySynced(r.state.state)
      else { st.freshStart(); st.updateSettings({ name: r.profile.name }); if (r.profile.char) st.setChar(r.profile.char as CharConfig); useStore.setState({ onboarded: true }) }
      celebrate(0.8)
      onClose?.()
    } catch (e) { setErr((e as ApiError).message) }
    setBusy(false)
  }
  async function saveHandle() {
    setBusy(true); setErr('')
    try {
      const r = await api.saveProfile({ handle: handle.trim().replace(/^@/, '').toLowerCase(), name: st.settings.name, char: st.char })
      st.setAuth({ ...st.auth!, handle: r.profile.handle })
      go('free')
    } catch (e) { setErr((e as ApiError).message) }
    setBusy(false)
  }
  const locate = () => {
    setLoc('busy')
    navigator.geolocation?.getCurrentPosition(
      (p) => { st.updateSettings({ home: [p.coords.latitude, p.coords.longitude], homeLabel: 'Lokasi saya' }); setLoc('ok') },
      () => setLoc('fail'), { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  function finish() {
    if (bank.number.replace(/\D/g, '').length >= 6) st.updateSettings({ pay: [...(st.settings.pay ?? []), { id: 'p' + Date.now(), kind: ['GoPay', 'OVO', 'DANA'].includes(bank.provider) ? 'ewallet' : 'bank', provider: bank.provider, number: bank.number, holder: st.settings.name }] })
    useStore.setState({ onboarded: true })
    celebrate(1.1)
    onClose?.()
  }
  function guestDone() {
    st.updateSettings({ name: name.trim() || 'Pesepeda' })
    st.finishOnboarding(demo)
    celebrate(1)
    onClose?.()
  }

  /* ---------------- Sambutan ---------------- */
  if (step === 'welcome') {
    return (
      <div className="onb onb-welcome" role="dialog" aria-modal aria-label="Selamat datang di PACK">
        <div className="float-stage" aria-hidden>
          <i className="ring r1" /><i className="ring r2" /><i className="ring r3" />
          <div className="mini-card m1"><b>Titip</b><span>☕ Es kopi susu</span><span>🥐 Croissant</span></div>
          <div className="mini-card m2"><b>Patungan</b><span>Salsa · Rp28rb ✓</span><span>Bayu · Rp22rb</span></div>
          <div className="mini-card m3"><b>Kapan bisa?</b><span>Sab pagi · 5 free</span></div>
          <div className="mini-card m4"><b>Titik temu</b><span>Adil · 4,2 km</span></div>
          <div className="overview">
            <div className="ov-back" /><div className="ov-back b2" />
            <div className="ov-card">
              <div className="row between"><span className="serif" style={{ fontSize: 19 }}>Sabtu ini</span><HeadBadge c={st.char} size={28} bg="#fde98b" ring={false} /></div>
              <div className="ov-body">
                <div className="ov-h">Gowes bareng</div>
                <div className="ov-row"><i className="on" />Coffee ride · 05.30</div>
                <div className="ov-h">Squad ikut</div>
                <div className="ov-row"><span className="avatars">{seedFriends.slice(0, 4).map((f) => <HeadBadge key={f.id} c={f.char} size={20} />)}</span>4 orang</div>
                <div className="ov-h">Ngopi</div>
                <div className="ov-row"><i />Kopi Es Tak Kie</div>
              </div>
            </div>
          </div>
        </div>
        <div className="welcome-card">
          <div className="logo3d"><LogoMark size={68} animate /></div>
          <h1>Selamat datang di PACK!</h1>
          <p>Cara paling gampang ngajak squad gowes, ketemu di titik yang adil, dan ngopi bareng.</p>
          <button className="btn ink block lg" onClick={() => go('signup')}>Mulai sekarang</button>
          <button className="link" style={{ marginTop: 14 }} onClick={() => go('login')}>Sudah punya akun? <b style={{ color: 'var(--ink)' }}>Masuk</b></button>
          <button className="link tiny" style={{ marginTop: 10 }} onClick={() => go('guest')}>Coba dulu tanpa akun</button>
        </div>
      </div>
    )
  }

  const back = () => (step === 'signup' || step === 'login' || step === 'guest' ? go('welcome') : idx > 0 ? go(FLOW[idx - 1]) : undefined)

  return (
    <div className="onb" role="dialog" aria-modal aria-label="Akun PACK">
      <div className="onb-in">
        <div className="row between" style={{ marginBottom: 18 }}>
          {(['signup', 'login', 'guest'].includes(step) || idx > 0) && !(onClose && step === start) ? <button className="iconbtn" aria-label="Kembali" onClick={back}><ArrowLeft size={18} /></button> : onClose ? <button className="iconbtn" aria-label="Tutup" onClick={onClose}><ArrowLeft size={18} /></button> : <span style={{ width: 44 }} />}
          {idx >= 0 ? <div className="steps" style={{ width: 160 }}>{FLOW.slice(0, -1).map((s, i) => <i key={s} className={i <= idx ? 'on' : ''} />)}</div> : <LogoMark size={34} />}
          <span style={{ width: 44 }} />
        </div>

        {step === 'signup' && (
          <form className="onb-step stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); doSignup() }}>
            <div className="qtitle">Bikin akun<br /><span>cuma 20 detik.</span></div>
            <p className="small muted">Akun menyimpan squad, ajakan & patunganmu di semua HP. Teman bisa menemukanmu lewat @username.</p>
            <label className="field"><span className="mono">Nama panggilan</span><input className="input" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Juan" /></label>
            <label className="field"><span className="mono">Email</span><input className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" /></label>
            <label className="field"><span className="mono">Password</span>
              <span className="pw"><input className="input" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="minimal 6 karakter" /><button type="button" className="pw-eye" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
            </label>
            {err && <div className="form-err" role="alert">{err}</div>}
            <button className="btn ink block lg" type="submit" disabled={busy || !name.trim() || !email.includes('@') || pw.length < 6}>{busy ? <Loader2 size={17} className="spin" /> : null} Daftar</button>
            <button type="button" className="link" onClick={() => go('login')}>Sudah punya akun? <b style={{ color: 'var(--ink)' }}>Masuk</b></button>
          </form>
        )}

        {step === 'login' && (
          <form className="onb-step stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); doLogin() }}>
            <div className="qtitle">Selamat datang<br /><span>kembali.</span></div>
            <p className="small muted">Masuk untuk memulihkan squad, ajakan, dan catatan patunganmu.</p>
            <label className="field"><span className="mono">Email</span><input className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" /></label>
            <label className="field"><span className="mono">Password</span>
              <span className="pw"><input className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /><button type="button" className="pw-eye" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
            </label>
            {err && <div className="form-err" role="alert">{err}</div>}
            <button className="btn ink block lg" type="submit" disabled={busy || !email.includes('@') || !pw}>{busy ? <Loader2 size={17} className="spin" /> : null} Masuk</button>
            <button type="button" className="link" onClick={() => go('signup')}>Belum punya akun? <b style={{ color: 'var(--ink)' }}>Daftar</b></button>
          </form>
        )}

        {step === 'guest' && (
          <div className="onb-step stack" style={{ gap: 14 }}>
            <div className="qtitle">Coba dulu,<br /><span>tanpa akun.</span></div>
            <p className="small muted">Semua tersimpan di HP ini saja. Kapan pun bisa bikin akun di Profil — datamu ikut terbawa.</p>
            <label className="field"><span className="mono">Nama panggilan</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Juan" /></label>
            <label className="row between card well" style={{ padding: 14 }}>
              <span><span className="b">Isi data contoh</span><br /><span className="tiny muted">Squad, ajakan & patungan contoh supaya langsung kelihatan</span></span>
              <button type="button" className={`toggle ${demo ? 'on' : ''}`} aria-pressed={demo} aria-label="Data contoh" onClick={() => setDemo(!demo)} />
            </label>
            <button className="btn ink block lg" onClick={guestDone}>Masuk ke PACK</button>
          </div>
        )}

        {step === 'char' && (
          <div className="onb-step stack" style={{ gap: 14 }}>
            <div className="qtitle">Ini kamu<br /><span>di squad.</span></div>
            <p className="small muted">Karaktermu muncul di undangan, peta & daftar peserta. Bisa diubah detail di menu Karakter.</p>
            <div className="char-stage" style={{ background: `#${st.char.bg ?? 'e9e2d0'}` }}>
              <AvatarImg c={st.char} mood="semangat" size={190} className="ccard-avatar" label="Karaktermu" />
              <button className="btn white sm char-shuffle" onClick={() => st.setChar(randomChar())}><Shuffle size={14} /> Acak</button>
            </div>
            <div className="char-alts">{alts.map((c, i) => <button key={i} onClick={() => st.setChar({ ...c, skin: st.char.skin })} aria-label={`Pilihan karakter ${i + 1}`}><HeadBadge c={{ ...c, skin: st.char.skin }} size={52} bg="var(--surface)" ring={false} /></button>)}</div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>{SKINS.map((s) => <button key={s} className={`swatch ${st.char.skin === s ? 'on' : ''}`} style={{ background: '#' + s, width: 34, height: 34 }} aria-label={`Warna kulit ${s}`} onClick={() => st.setChar({ ...st.char, skin: s })} />)}</div>
            <button className="btn ink block lg" onClick={() => go('handle')}>Lanjut</button>
          </div>
        )}

        {step === 'handle' && (
          <div className="onb-step stack" style={{ gap: 14 }}>
            <div className="qtitle">Username<br /><span>& kota gowes.</span></div>
            <p className="small muted">Teman menambahkanmu lewat @username. Lokasi dipakai untuk titik temu adil (dibulatkan ±1 km).</p>
            <label className="field"><span className="mono">Username</span>
              <span className="handle-input"><span>@</span><input className="input" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} maxLength={20} /></span>
            </label>
            <button className={`opt ${loc === 'ok' ? 'on' : ''}`} onClick={locate}>
              <span className="ico">{loc === 'busy' ? <Loader2 size={16} className="spin" /> : loc === 'ok' ? <Check size={16} /> : <Crosshair size={16} />}</span>
              <span className="grow"><span className="b" style={{ display: 'block' }}>{loc === 'ok' ? 'Lokasi tersimpan' : 'Pakai lokasiku sekarang'}</span><span className="tiny muted">{loc === 'fail' ? 'Izin ditolak — tulis daerahmu di bawah' : 'Bisa diubah kapan saja'}</span></span>
            </button>
            <label className="field"><span className="mono">Daerah</span><input className="input" value={st.settings.homeLabel} onChange={(e) => st.updateSettings({ homeLabel: e.target.value })} placeholder="mis. Tebet, Jakarta" /></label>
            {err && <div className="form-err" role="alert">{err}</div>}
            <button className="btn ink block lg" disabled={busy || handle.length < 3} onClick={saveHandle}>{busy ? <Loader2 size={17} className="spin" /> : null} Lanjut</button>
          </div>
        )}

        {step === 'free' && (
          <div className="onb-step stack" style={{ gap: 14 }}>
            <div className="qtitle">Kapan biasanya<br /><span>kamu free?</span></div>
            <p className="small muted">PACK mencocokkan jadwal squad untuk mencari slot emas — tanpa tanya satu-satu di grup.</p>
            <div className="chips">{PRESETS.map((p) => { const on = p.bits.every(([d, s]) => isFree(st.avail, d, s)); return <button key={p.l} className={`chip ${on ? 'on' : ''}`} onClick={() => { let m = st.avail; for (const [d, s] of p.bits) m = on ? m & ~bit(d, s) : m | bit(d, s); st.setAvail(m) }}>{p.l}</button> })}</div>
            <div className="card" style={{ padding: 14 }}>
              <div className="pillgrid">
                <div className="pg-row"><span />{ORDER.map((d) => <span key={d} className="pg-h">{HARI[d]}</span>)}</div>
                {SLOTS.map((sl, si) => <div key={sl.l} className="pg-row"><span className="pg-l">{sl.l}</span>{ORDER.map((d) => { const on = isFree(st.avail, d, si); return <button key={d} className={`pg ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`${HARI[d]} ${sl.l}`} onClick={() => st.setAvail(st.avail ^ bit(d, si))}>{on ? '✓' : ''}</button> })}</div>)}
              </div>
            </div>
            <button className="btn ink block lg" onClick={() => go('pay')}>Lanjut</button>
          </div>
        )}

        {step === 'pay' && (
          <div className="onb-step stack" style={{ gap: 14 }}>
            <div className="qtitle">Rekening<br /><span>buat patungan.</span></div>
            <p className="small muted">Opsional. Ikut otomatis di tagihan titip kopi — nggak perlu kirim nomor rekening ke grup lagi.</p>
            <div className="chips">{['BCA', 'Mandiri', 'BRI', 'BNI', 'Jago', 'GoPay', 'OVO', 'DANA'].map((p) => <button key={p} className={`chip ${bank.provider === p ? 'on' : ''}`} onClick={() => setBank({ ...bank, provider: p })}>{p}</button>)}</div>
            <label className="field"><span className="mono">{['GoPay', 'OVO', 'DANA'].includes(bank.provider) ? 'Nomor HP' : 'Nomor rekening'}</span><input className="input" inputMode="numeric" value={bank.number} onChange={(e) => setBank({ ...bank, number: e.target.value.replace(/\D/g, '') })} placeholder="opsional" /></label>
            <button className="btn ink block lg" onClick={() => go('done')}>{bank.number ? 'Simpan & lanjut' : 'Lewati'}</button>
          </div>
        )}

        {step === 'done' && (
          <div className="onb-step stack" style={{ gap: 14, alignItems: 'center', textAlign: 'center' }}>
            <Orbit converge size={260} chars={[st.char, ...seedFriends.slice(0, 5).map((f) => f.char)]} center={<span className="orbit-logo"><LogoMark size={64} animate /></span>} />
            <div className="qtitle">Siap, {st.settings.name.split(' ')[0]}!<br /><span>Ajak squad pertamamu.</span></div>
            <p className="small muted">Akunmu <b>@{st.auth?.handle}</b> aktif. Tambah teman lewat @username atau link profil, lalu ketuk <b>+</b> untuk ngajak.</p>
            <button className="btn ink block lg" onClick={finish}>Masuk ke PACK</button>
          </div>
        )}
      </div>
    </div>
  )
}
