import { useMemo, useState } from 'react'
import { Plus, MapPin, UserPlus, CalendarDays, ChevronRight } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Friend, GroupRide } from '../lib/types'
import { HARI, uid } from '../lib/util'
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
  const [addF, setAddF] = useState(false)
  const live = (g: GroupRide) => new Date(g.datetime).getTime() > Date.now() - 6 * 3600000
  const upcoming = [...groupRides].filter(live).sort((a, b) => a.datetime.localeCompare(b.datetime))
  const need = upcoming.filter((g) => g.myRsvp === 'menunggu')
  const soon = upcoming.filter((g) => g.myRsvp !== 'menunggu')
  const past = groupRides.filter((g) => !live(g)).sort((a, b) => b.datetime.localeCompare(a.datetime))
  const myWeek = weekly(rides, 1)[0]
  const mySpeed = useMemo(() => { const last = rides.slice(-15); return last.reduce((a, r) => a + r.avgSpeed, 0) / Math.max(1, last.length) || 24 }, [rides])
  const league = [...friends.map((f) => ({ id: f.id, name: f.name, c: f.char, km: f.weeklyKm * (0.5 + (((new Date().getDay() + 6) % 7) / 6) * 0.5) })), { id: 'me', name: settings.name + ' (kamu)', c: char, km: myWeek.km }].sort((a, b) => b.km - a.km)
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d })

  return (
    <div className="fadein">
      <Top title="Agenda" sub="Gowes bareng" right={<button className="btn ink sm" onClick={() => openAjak()}><Plus size={15} /> Ajak</button>} />
      <Tabs value={tab} onChange={setTab} options={[{ v: 'jadwal', l: 'Jadwal' }, { v: 'teman', l: 'Teman' }, { v: 'liga', l: 'Liga' }]} />

      {tab === 'jadwal' && (
        <div className="section" style={{ marginTop: 18 }}>
          <div className="grid2">
            <a href="#/meet" className="lrow"><span className="ico"><MapPin size={17} /></span><span className="grow"><span className="t" style={{ display: 'block' }}>Titik temu</span><span className="s" style={{ display: 'block' }}>Adil · searah · jemput</span></span></a>
            <a href="#/kapan" className="lrow"><span className="ico"><CalendarDays size={17} /></span><span className="grow"><span className="t" style={{ display: 'block' }}>Kapan bisa?</span><span className="s" style={{ display: 'block' }}>Cocokkan jadwal</span></span></a>
          </div>
          {need.length > 0 && <><div className="section-h section"><h3>Butuh jawabanmu</h3><span className="tag accent">{need.length}</span></div><div className="stack" style={{ gap: 8 }}>{need.map((g) => <Swipe key={g.id} onRight={() => { setMyRsvp(g.id, 'ikut'); toast('🚲 Kamu ikut!') }} onLeft={() => { setMyRsvp(g.id, 'tidak'); toast('Jawaban tersimpan') }}><AgendaRow g={g} /></Swipe>)}</div></>}
          <div className="section-h section"><h3>Akan datang</h3><span className="mono">{soon.length} jadwal</span></div>
          {soon.length === 0 ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="muted">Belum ada jadwal.</p>
              <button className="btn ink" style={{ marginTop: 12 }} onClick={() => openAjak()}><Plus size={16} /> Ajak squad</button>
            </div>
          ) : <div className="stack" style={{ gap: 8 }}>{soon.map((g) => <AgendaRow key={g.id} g={g} />)}</div>}
          {past.length > 0 && <><div className="section-h section"><h3>Sudah lewat</h3></div><div className="stack" style={{ gap: 8 }}>{past.slice(0, 6).map((g) => <AgendaRow key={g.id} g={g} />)}</div></>}
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
  const { settings } = useStore()
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [spd, setSpd] = useState(24)
  const [pos, setPos] = useState(settings.home)
  return (
    <Sheet open={open} onClose={onClose} title="Tambah teman">
      <div className="stack">
        <label className="field"><span className="mono">Nama</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span className="mono">Daerah</span><input className="input" value={area} placeholder="mis. Tebet" onChange={(e) => setArea(e.target.value)} /></label>
        <label className="field"><span className="mono">Kecepatan rata-rata · {spd} km/j</span><input type="range" min={15} max={35} value={spd} onChange={(e) => setSpd(+e.target.value)} /></label>
        <div className="mono">Ketuk perkiraan lokasi rumahnya (untuk titik temu)</div>
        <BaseMap center={pos} zoom={11} className="map" onClick={setPos}><SmallPin pos={pos} color="#111" /></BaseMap>
        <button className="btn ink block" disabled={!name.trim()} onClick={() => { onAdd({ id: uid(), name: name.trim(), color: COLORS[Math.floor(Math.random() * COLORS.length)], avgSpeed: spd, weeklyKm: 80, home: pos, homeLabel: area || 'Jakarta', char: randomChar(), avail: 0 }); setName(''); setArea(''); onClose() }}>Tambah</button>
      </div>
    </Sheet>
  )
}
