import { useMemo, useState } from 'react'
import { Plus, MapPin, UserPlus, CalendarDays, ChevronRight, Search, Loader2, Copy, MessageCircle, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Friend, GroupRide, PublicProfile } from '../lib/types'
import { api } from '../lib/api'
import { friendFromProfile } from '../lib/sync'
import { copyText } from '../components/PayAccounts'
import { waLink } from '../lib/share'
import { BULAN, HARI, relDay, uid } from '../lib/util'
import { Avatar, Sheet, Swipe, Tabs, toast, Top } from '../components/UI'
import { AvatarPin, BaseMap, SmallPin } from '../components/Map'
import { AjakSheet, openAjak } from '../components/AjakFlow'
import { AgendaRow } from './Home'
import { isFree } from '../lib/meetup'
import { weekly } from '../lib/analytics'
import { randomChar } from '../lib/avatar'
import { HeadBadge, RaceScene } from '../components/Character'
import { haversine } from '../lib/geo'

export { PACE } from '../components/AjakFlow'

/** Kompatibilitas: dipakai Titik Temu & Perencana Rute — sekarang membuka alur Ajak baru. */
export function CreateRide({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: Partial<GroupRide> }) {
  return <AjakSheet open={open} onClose={onClose} preset={preset} />
}

export default function Squad() {
  const { groupRides, friends, rides, settings, addFriend, char, avail, setMyRsvp } = useStore()
  const [tab, setTab] = useState<'jadwal' | 'teman' | 'liga'>('jadwal')
  const [q, setQ] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [closed, setClosed] = useState<string[]>([])
  const [addF, setAddF] = useState(false)
  const live = (g: GroupRide) => new Date(g.datetime).getTime() > Date.now() - 6 * 3600000
  const upcoming = [...groupRides].filter(live).sort((a, b) => a.datetime.localeCompare(b.datetime))
  const need = upcoming.filter((g) => g.myRsvp === 'menunggu')
  const soon = upcoming.filter((g) => g.myRsvp !== 'menunggu')
  const past = groupRides.filter((g) => !live(g)).sort((a, b) => b.datetime.localeCompare(a.datetime))
  const [seg, setSeg] = useState<'butuh' | 'datang' | 'selesai'>(() => (need.length ? 'butuh' : 'datang'))
  const myWeek = weekly(rides, 1)[0]
  const mySpeed = useMemo(() => { const last = rides.slice(-15); return last.reduce((a, r) => a + r.avgSpeed, 0) / Math.max(1, last.length) || 24 }, [rides])
  const league = [...friends.map((f) => ({ id: f.id, name: f.name, c: f.char, km: f.weeklyKm * (0.5 + (((new Date().getDay() + 6) % 7) / 6) * 0.5) })), { id: 'me', name: settings.name + ' (kamu)', c: char, km: myWeek.km }].sort((a, b) => b.km - a.km)
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d })

  return (
    <div className="fadein">
      <Top title="Agenda" sub="Gowes bareng" right={<button className="btn ink sm" onClick={() => openAjak()}><Plus size={15} /> Ajak</button>} />
      <Tabs value={tab} onChange={setTab} options={[{ v: 'jadwal', l: 'Jadwal' }, { v: 'teman', l: 'Teman' }, { v: 'liga', l: 'Liga' }]} />

      {tab === 'jadwal' && (
        <div className="section" style={{ marginTop: 16 }}>
          <form className="search" onSubmit={(e) => e.preventDefault()}>
            <Search size={17} className="muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari ajakan, tempat, teman…" aria-label="Cari ajakan" />
            <button type="button" className={`filter-btn ${mineOnly ? 'on' : ''}`} aria-pressed={mineOnly} aria-label="Hanya ajakanku" onClick={() => setMineOnly(!mineOnly)}><SlidersHorizontal size={16} /></button>
          </form>
          <div className="seg" role="tablist" style={{ marginTop: 12 }}>
            {([['butuh', 'Butuh jawaban', need.length], ['datang', 'Akan datang', soon.length], ['selesai', 'Selesai', past.length]] as const).map(([k, l, n]) => (
              <button key={k} role="tab" aria-selected={seg === k} className={seg === k ? 'on' : ''} onClick={() => setSeg(k)}>{l}{n ? <span className="seg-n">{n}</span> : null}</button>
            ))}
          </div>
          {mineOnly && <div className="tag" style={{ marginTop: 10 }}>Hanya ajakan yang kamu buat</div>}
          {(() => {
            const list = (seg === 'butuh' ? need : seg === 'datang' ? soon : past).filter((g) => (!mineOnly || g.host === 'me') && (!q.trim() || `${g.title} ${g.meet.name} ${g.note ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())))
            if (!list.length) return (
              <div className="card" style={{ textAlign: 'center', marginTop: 14 }}>
                <div className="h2">{seg === 'butuh' ? 'Semua sudah dijawab ✨' : seg === 'datang' ? 'Belum ada jadwal' : 'Belum ada riwayat'}</div>
                {seg !== 'selesai' && <button className="btn ink" style={{ marginTop: 12 }} onClick={() => openAjak()}><Plus size={16} /> Ajak squad</button>}
              </div>
            )
            const groups = new Map<string, GroupRide[]>()
            for (const g of list) { const k = new Date(g.datetime).toDateString(); groups.set(k, [...(groups.get(k) ?? []), g]) }
            return [...groups.entries()].map(([k, gs]) => {
              const d = new Date(k)
              const open = !closed.includes(k)
              return (
                <div key={k} className="daygroup">
                  <button className="daygroup-h" aria-expanded={open} onClick={() => setClosed(open ? [...closed, k] : closed.filter((x) => x !== k))}>
                    <ChevronDown size={16} style={{ transform: open ? undefined : 'rotate(-90deg)', transition: 'transform .3s' }} />
                    <span className="grow">{relDay(d.toISOString())}{relDay(d.toISOString()).includes(' ') ? '' : `, ${d.getDate()} ${BULAN[d.getMonth()]}`}</span>
                    <span className="mono">{gs.length}</span>
                  </button>
                  {open && <div className="stack" style={{ gap: 8 }}>{gs.map((g) => g.myRsvp === 'menunggu'
                    ? <Swipe key={g.id} onRight={() => { setMyRsvp(g.id, 'ikut'); toast('🚲 Kamu ikut!') }} onLeft={() => { setMyRsvp(g.id, 'tidak'); toast('Jawaban tersimpan') }}><AgendaRow g={g} /></Swipe>
                    : <AgendaRow key={g.id} g={g} />)}</div>}
                </div>
              )
            })
          })()}
          <div className="grid2 section">
            <a href="#/meet" className="lrow"><span className="ico"><MapPin size={17} /></span><span className="grow"><span className="t" style={{ display: 'block' }}>Titik temu</span><span className="s" style={{ display: 'block' }}>Adil · searah · jemput</span></span></a>
            <a href="#/kapan" className="lrow"><span className="ico"><CalendarDays size={17} /></span><span className="grow"><span className="t" style={{ display: 'block' }}>Kapan bisa?</span><span className="s" style={{ display: 'block' }}>Cocokkan jadwal</span></span></a>
          </div>
        </div>
      )}

      {tab === 'teman' && (
        <div className="stack section" style={{ marginTop: 18 }}>
          <div className="card">
            <div className="card-h"><div><div className="mono">Squad · 7 hari ke depan</div><div className="b" style={{ marginTop: 2 }}>Siapa free kapan</div></div><a href="#/kapan" className="link">Atur <ChevronRight size={14} /></a></div>
            <div className="list">
              {[{ id: 'me', name: 'Kamu', c: char, color: '#111', avail, avgSpeed: mySpeed, homeLabel: settings.homeLabel, home: settings.home }, ...friends].map((f) => {
                const match = f.id === 'me' ? null : Math.max(0, Math.round(100 - Math.abs(f.avgSpeed - mySpeed) * 12))
                return (
                  <div key={f.id} className="li">
                    <Avatar name={f.name} color={f.color} c={"c" in f ? f.c : (f as Friend).char} size={38} />
                    <div className="grow">
                      <div className="t">{f.name}</div>
                      <div className="tiny muted">{f.homeLabel}{f.id !== 'me' ? ` · ${haversine(settings.home, f.home).toFixed(1)} km · ${f.avgSpeed} km/j` : ''}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 7px)', gap: 3 }} aria-label="Ketersediaan 7 hari">
                      {week.map((d, i) => { const n = [0, 1, 2].filter((sl) => isFree(f.avail, d.getDay(), sl)).length; return <i key={i} title={HARI[d.getDay()]} style={{ width: 7, height: 18, borderRadius: 4, background: n ? 'var(--ink)' : 'var(--surface-2)', opacity: n ? 0.4 + n * 0.2 : 1 }} /> })}
                    </div>
                    {match != null && <div style={{ textAlign: 'right', minWidth: 46 }}><div className="b">{match}%</div><div className="mono" style={{ fontSize: 9 }}>pace</div></div>}
                  </div>
                )
              })}
            </div>
          </div>
          <BaseMap center={settings.home} zoom={10} fit={[settings.home, ...friends.map((f) => f.home)]} className="map short">
            <AvatarPin pos={settings.home} c={char} title="Kamu" size={30} />
            {friends.map((f) => <AvatarPin key={f.id} pos={f.home} c={f.char} title={f.name} size={30} />)}
          </BaseMap>
          <button className="btn ghost block" onClick={() => setAddF(true)}><UserPlus size={16} /> Tambah teman</button>
        </div>
      )}

      {tab === 'liga' && (
        <div className="stack section" style={{ marginTop: 18 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 18px 6px' }}>
              <div className="mono">Km kamu minggu ini</div>
              <div className="big" style={{ fontSize: 52, marginTop: 8 }}>{myWeek.km.toFixed(1).replace('.', ',')}<span className="unit">km</span></div>
              <div className="small muted" style={{ marginTop: 6 }}>Liga reset tiap Senin · {7 - ((new Date().getDay() + 6) % 7)} hari lagi</div>
            </div>
            <RaceScene racers={league.map((p) => ({ id: p.id, name: p.name, c: p.c, km: p.km, me: p.id === 'me' }))} height={230} />
          </div>
          <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            <div className="list">
              {league.map((p, i) => (
                <div key={p.id} className="li">
                  <span className="b" style={{ width: 22, color: i === 0 ? 'var(--accent)' : 'var(--muted)' }}>{i + 1}</span>
                  <HeadBadge c={p.c} size={36} bg="var(--surface-2)" />
                  <div className="grow"><div className="t" style={{ fontWeight: p.id === 'me' ? 700 : 600 }}>{p.name}</div>
                    <div className="meter" style={{ marginTop: 6, height: 4 }}><i style={{ width: `${(p.km / league[0].km) * 100}%` }} /></div>
                  </div>
                  <div className="b" style={{ minWidth: 60, textAlign: 'right' }}>{p.km.toFixed(0)}<span className="unit">km</span></div>
                </div>
              ))}
            </div>
          </div>
          <p className="tiny muted">Juara minggu ini memilih tempat ngopi gowes bareng berikutnya ☕</p>
        </div>
      )}

      <AddFriend open={addF} onClose={() => setAddF(false)} onAdd={(f) => { addFriend(f); toast(`${f.name} ditambahkan`) }} />
    </div>
  )
}

const COLORS = ['#d2441c', '#111111', '#f5c518', '#2f6fed', '#1f9d6a', '#8a8a85', '#b04ad6']

function AddFriend({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (f: Friend) => void }) {
  const { settings, auth, friends } = useStore()
  const [mode, setMode] = useState<'akun' | 'manual'>('akun')
  const [q, setQ] = useState('')
  const [found, setFound] = useState<PublicProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [spd, setSpd] = useState(24)
  const [pos, setPos] = useState(settings.home)
  const link = auth ? `${location.origin}/#/u/${auth.handle}` : ''
  async function search() {
    setBusy(true); setErr(''); setFound(null)
    try { setFound((await api.byHandle(q.trim())).profile) } catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }
  return (
    <Sheet open={open} onClose={onClose} title="Tambah teman">
      <div className="stack">
        <div className="tabs" style={{ boxShadow: 'none' }}>
          <i className="tabs-ind" style={{ width: 'calc((100% - 8px) / 2)', transform: `translateX(${mode === 'akun' ? 0 : 100}%)` }} />
          <button className={mode === 'akun' ? 'on' : ''} onClick={() => setMode('akun')}>Punya akun PACK</button>
          <button className={mode === 'manual' ? 'on' : ''} onClick={() => setMode('manual')}>Belum pakai PACK</button>
        </div>
        {mode === 'akun' ? (
          <>
            <form className="search" onSubmit={(e) => { e.preventDefault(); search() }}>
              <span className="muted">@</span><input value={q} onChange={(e) => setQ(e.target.value.replace(/^@/, '').toLowerCase())} placeholder="username teman" aria-label="Username teman" autoCapitalize="none" />
              <button className="iconbtn" style={{ background: 'var(--ink)', color: 'var(--bg)', width: 38, height: 38 }} aria-label="Cari" disabled={busy || q.length < 3}>{busy ? <Loader2 size={16} className="spin" /> : <Search size={16} />}</button>
            </form>
            {err && <div className="form-err">{err}</div>}
            {found && (
              <div className="lrow" style={{ boxShadow: 'none', background: 'var(--surface)' }}>
                {found.char ? <HeadBadge c={found.char} size={44} /> : null}
                <span className="grow"><span className="t" style={{ display: 'block' }}>{found.name}</span><span className="s" style={{ display: 'block' }}>@{found.handle} · {found.homeLabel || '—'}</span></span>
                {friends.some((f) => f.uid === found.uid) ? <span className="tag good">Teman</span> : <button className="btn ink sm" onClick={() => { onAdd(friendFromProfile(found)); setFound(null); setQ(''); onClose() }}><UserPlus size={14} /> Tambah</button>}
              </div>
            )}
            {auth ? (
              <div className="card well" style={{ padding: 14 }}>
                <div className="b">Atau bagikan profilmu</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>Teman yang membuka link ini bisa menambahkanmu sekali ketuk.</div>
                <div className="grid2" style={{ marginTop: 10 }}>
                  <button className="btn sm" onClick={() => copyText(link, 'Link profil disalin')}><Copy size={14} /> @{auth.handle}</button>
                  <a className="btn sm ink" href={waLink(`Tambahin aku di PACK biar gampang ngajak gowes 🚲 ${link}`)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
                </div>
              </div>
            ) : <p className="tiny muted">Buat akun di Profil supaya teman bisa menambahkanmu dan ajakan langsung masuk ke app mereka.</p>}
          </>
        ) : (
          <>
            <label className="field"><span className="mono">Nama</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="field"><span className="mono">Daerah</span><input className="input" value={area} placeholder="mis. Tebet" onChange={(e) => setArea(e.target.value)} /></label>
            <label className="field"><span className="mono">Kecepatan rata-rata · {spd} km/j</span><input type="range" min={15} max={35} value={spd} onChange={(e) => setSpd(+e.target.value)} /></label>
            <div className="mono">Ketuk perkiraan lokasi rumahnya (untuk titik temu)</div>
            <BaseMap center={pos} zoom={11} className="map short" onClick={setPos}><SmallPin pos={pos} color="#111" /></BaseMap>
            <button className="btn ink block" disabled={!name.trim()} onClick={() => { onAdd({ id: uid(), name: name.trim(), color: COLORS[Math.floor(Math.random() * COLORS.length)], avgSpeed: spd, weeklyKm: 80, home: pos, homeLabel: area || 'Jakarta', char: randomChar(), avail: 0 }); setName(''); setArea(''); onClose() }}>Tambah</button>
            <p className="tiny muted">Teman tanpa akun tetap bisa menjawab ajakan lewat link WhatsApp.</p>
          </>
        )}
      </div>
    </Sheet>
  )
}
