import { useMemo, useState } from 'react'
import { Plus, MapPin, UserPlus, Gauge, CalendarPlus } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Friend, GroupRide, Pace } from '../lib/types'
import { fmtDate, relDay, uid } from '../lib/util'
import { Avatar, Sheet, Tabs, Toggle, toast, Top } from '../components/UI'
import { BaseMap, MeetPin, SmallPin } from '../components/Map'
import { weekly } from '../lib/analytics'
import { go } from '../lib/router'
import { seededChar } from '../lib/character'
import { HeadBadge, RaceScene } from '../components/Character'
import { haversine } from '../lib/geo'

export const PACE: Record<Pace, { l: string; spd: string }> = {
  santai: { l: 'Santai', spd: '18–22 km/j' },
  sedang: { l: 'Sedang', spd: '23–27 km/j' },
  kencang: { l: 'Kencang', spd: '28+ km/j' },
}

export default function Squad() {
  const { groupRides, friends, rides, settings, addFriend, char } = useStore()
  const [tab, setTab] = useState<'jadwal' | 'teman' | 'liga'>('jadwal')
  const [create, setCreate] = useState(false)
  const [addF, setAddF] = useState(false)
  const upcoming = [...groupRides].filter((g) => new Date(g.datetime).getTime() > Date.now() - 6 * 3600000).sort((a, b) => a.datetime.localeCompare(b.datetime))
  const past = groupRides.filter((g) => new Date(g.datetime).getTime() <= Date.now() - 6 * 3600000)
  const myWeek = weekly(rides, 1)[0]
  const mySpeed = useMemo(() => { const last = rides.slice(-15); return last.reduce((a, r) => a + r.avgSpeed, 0) / Math.max(1, last.length) }, [rides])

  const league = [...friends.map((f) => ({ id: f.id, name: f.name, c: f.char, km: f.weeklyKm * (0.5 + (((new Date().getDay() + 6) % 7) / 6) * 0.5) })), { id: 'me', name: settings.name + ' (kamu)', c: char, km: myWeek.km }].sort((a, b) => b.km - a.km)

  return (
    <div className="fadein">
      <Top title="Gowes Bareng" sub="Squad" right={<button className="btn ink sm" onClick={() => setCreate(true)}><Plus size={15} /> Buat</button>} />
      <Tabs value={tab} onChange={setTab} options={[{ v: 'jadwal', l: 'Jadwal' }, { v: 'teman', l: 'Teman' }, { v: 'liga', l: 'Liga mingguan' }]} />

      {tab === 'jadwal' && (
        <div className="stack section" style={{ marginTop: 16 }}>
          <a href="#/meet" className="card ink click" style={{ textDecoration: 'none' }}>
            <div className="row between">
              <div>
                <div className="mono">Fitur jenius</div>
                <div style={{ fontWeight: 600, fontSize: 18, marginTop: 2 }}>Cari Titik Temu Adil</div>
                <div className="small" style={{ opacity: 0.75, marginTop: 4 }}>Hitung lokasi kumpul yang paling adil untuk semua teman, lalu pilih minimarket/kafe nyata di dekatnya.</div>
              </div>
              <MapPin size={30} style={{ flexShrink: 0 }} />
            </div>
          </a>
          {upcoming.length === 0 && <div className="empty">Belum ada jadwal. Ajak teman gowes!</div>}
          {upcoming.map((g) => <GroupCard key={g.id} g={g} friends={friends} />)}
          {past.length > 0 && <div className="mono" style={{ marginTop: 10 }}>Sudah lewat</div>}
          {past.map((g) => <GroupCard key={g.id} g={g} friends={friends} faded />)}
        </div>
      )}

      {tab === 'teman' && (
        <div className="stack section" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="card-h"><span className="mono">Pace match · rata-rata kamu {mySpeed.toFixed(1)} km/j</span><Gauge size={15} /></div>
            <div className="list">
              {[...friends].sort((a, b) => Math.abs(a.avgSpeed - mySpeed) - Math.abs(b.avgSpeed - mySpeed)).map((f) => {
                const match = Math.max(0, Math.round(100 - Math.abs(f.avgSpeed - mySpeed) * 12))
                const dist = haversine(settings.home, f.home)
                return (
                  <div key={f.id} className="li">
                    <Avatar name={f.name} color={f.color} c={f.char} />
                    <div className="grow">
                      <div className="t">{f.name}</div>
                      <div className="tiny muted">{f.homeLabel} · {dist.toFixed(1)} km · {f.avgSpeed} km/j · {f.weeklyKm} km/mgg</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="num" style={{ fontSize: 20 }}>{match}%</div>
                      <div className="mono">{match >= 85 ? 'Cocok' : match >= 65 ? 'Oke' : f.avgSpeed > mySpeed ? 'Lebih cepat' : 'Lebih santai'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <BaseMap center={settings.home} zoom={10} fit={[settings.home, ...friends.map((f) => f.home)]} className="map">
            <SmallPin pos={settings.home} color="#ff4d1f" />
            {friends.map((f) => <SmallPin key={f.id} pos={f.home} color={f.color} />)}
          </BaseMap>
          <button className="btn ghost block" onClick={() => setAddF(true)}><UserPlus size={16} /> Tambah teman</button>
        </div>
      )}

      {tab === 'liga' && (
        <div className="stack section" style={{ marginTop: 16 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px 4px' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((d, i) => {
                  const ws = new Date(); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7) + i)
                  const mine = rides.find((r) => new Date(r.date).toDateString() === ws.toDateString())
                  const future = ws > new Date()
                  const crew = mine?.friendIds?.[0] ? friends.find((f) => f.id === mine.friendIds![0]) : null
                  return (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div className="mono" style={{ fontSize: 9 }}>{d}</div>
                      <div style={{ marginTop: 4 }}>
                        {mine ? <HeadBadge c={crew ? crew.char : char} size={34} bg={crew ? 'var(--accent-2)' : 'var(--sunken)'} /> : <span style={{ width: 34, height: 34, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', background: 'var(--sunken)', opacity: future ? 0.5 : 1, fontWeight: 700, color: 'var(--muted)' }}>{future ? '' : '?'}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <div className="small muted">Km kamu minggu ini</div>
                <div className="dot" style={{ fontSize: 56, marginTop: 4 }}>{myWeek.km.toFixed(1).replace('.', ',')}</div>
                <div className="small muted" style={{ marginTop: 4 }}>Liga berakhir {7 - ((new Date().getDay() + 6) % 7)} hari lagi</div>
              </div>
            </div>
            <RaceScene racers={league.map((p) => ({ id: p.id, name: p.name, c: p.c, km: p.km, me: p.id === 'me' }))} height={260} />
          </div>
          <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            <div className="list">
              {league.map((p, i) => (
                <div key={p.id} className="li">
                  <span className="dot" style={{ fontSize: 22, width: 26, color: i === 0 ? 'var(--accent)' : undefined }}>{i + 1}</span>
                  <HeadBadge c={p.c} size={36} bg="var(--sunken)" />
                  <div className="grow"><div className="t" style={{ fontWeight: p.id === 'me' ? 700 : 600 }}>{p.name}</div>
                    <div className="meter" style={{ marginTop: 6, height: 5 }}><i style={{ width: `${(p.km / league[0].km) * 100}%`, background: p.id === 'me' ? 'var(--accent)' : 'var(--ink)' }} /></div>
                  </div>
                  <div className="num" style={{ fontSize: 18, minWidth: 64, textAlign: 'right' }}>{p.km.toFixed(0)}<span className="unit">km</span></div>
                </div>
              ))}
            </div>
          </div>
          <p className="tiny muted">Liga reset tiap Senin 00.00. Juara minggu ini menentukan rute gowes bareng berikutnya 🏆</p>
        </div>
      )}

      <CreateRide open={create} onClose={() => setCreate(false)} />
      <AddFriend open={addF} onClose={() => setAddF(false)} onAdd={(f) => { addFriend(f); toast(`${f.name} ditambahkan`) }} />
    </div>
  )
}

function GroupCard({ g, friends, faded }: { g: GroupRide; friends: Friend[]; faded?: boolean }) {
  const going = g.participants.filter((p) => p.rsvp === 'ikut')
  const hostF = friends.find((f) => f.id === g.host)
  return (
    <div className="card click" style={{ opacity: faded ? 0.55 : 1 }} onClick={() => go('squad/' + g.id)}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="mono">{relDay(g.datetime)} · {fmtDate(g.datetime, true).split('·')[1]}</div>
          <div style={{ fontWeight: 600, fontSize: 18, marginTop: 2 }}>{g.title}</div>
          <div className="small muted" style={{ marginTop: 2 }}><MapPin size={12} style={{ verticalAlign: -1 }} /> {g.meet.name}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="num" style={{ fontSize: 26 }}>{g.distanceKm}<span className="unit">km</span></div>
        </div>
      </div>
      <div className="row between" style={{ marginTop: 14 }}>
        <div className="row" style={{ gap: 8 }}>
          <div className="avatars">{going.slice(0, 5).map((p) => { const f = friends.find((x) => x.id === p.friendId); return f ? <Avatar key={f.id} name={f.name} color={f.color} c={f.char} /> : null })}</div>
          <span className="tiny muted">{going.length + (g.myRsvp === 'ikut' ? 1 : 0)} ikut</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span className="tag">{PACE[g.pace].l}</span>
          {g.noDrop && <span className="tag good">No-drop</span>}
          {g.myRsvp === 'menunggu' && <span className="tag accent">Undangan{hostF ? ` · ${hostF.name.split(' ')[0]}` : ''}</span>}
        </div>
      </div>
    </div>
  )
}

export function CreateRide({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: Partial<GroupRide> }) {
  const { friends, settings, upsertGroupRide } = useStore()
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + ((6 - tomorrow.getDay() + 7) % 7 || 7)); tomorrow.setHours(5, 30, 0, 0)
  const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  const [title, setTitle] = useState(preset?.title ?? 'Gowes Sabtu Pagi')
  const [dt, setDt] = useState(toLocal(preset?.datetime ? new Date(preset.datetime) : tomorrow))
  const [meetName, setMeetName] = useState(preset?.meet?.name ?? 'Pintu 1 GBK Senayan')
  const [pos, setPos] = useState(preset?.meet?.pos ?? settings.home)
  const [pace, setPace] = useState<Pace>(preset?.pace ?? 'sedang')
  const [km, setKm] = useState(preset?.distanceKm ?? 40)
  const [route, setRoute] = useState(preset?.route ?? '')
  const [notes, setNotes] = useState('')
  const [noDrop, setNoDrop] = useState(true)
  const [inv, setInv] = useState<string[]>(preset?.participants?.map((p) => p.friendId) ?? [])

  function submit() {
    const g: GroupRide = {
      id: uid(), title, datetime: new Date(dt).toISOString(), meet: { name: meetName, pos }, pace, distanceKm: km, route, notes, noDrop,
      participants: inv.map((id) => ({ friendId: id, rsvp: 'menunggu' })), myRsvp: 'ikut', host: 'me',
    }
    upsertGroupRide(g)
    onClose()
    toast('Gowes bareng dibuat — bagikan undangannya!')
    go('squad/' + g.id)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Buat gowes bareng">
      <div className="stack">
        <label className="field"><span className="mono">Judul</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="field"><span className="mono">Waktu kumpul</span><input className="input" type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} /></label>
        <label className="field"><span className="mono">Meet point</span><input className="input" value={meetName} onChange={(e) => setMeetName(e.target.value)} /></label>
        <div className="tiny muted">Ketuk peta untuk memindahkan titik kumpul, atau gunakan <a href="#/meet" onClick={onClose}>Titik Temu Adil</a>.</div>
        <BaseMap center={pos} zoom={14} className="map" onClick={setPos}>
          <MeetPin pos={pos} draggable onDrag={setPos} />
        </BaseMap>
        <div className="field"><span className="mono">Pace</span>
          <div className="chips">{(Object.keys(PACE) as Pace[]).map((p) => <button key={p} className={`chip ${pace === p ? 'on' : ''}`} onClick={() => setPace(p)}>{PACE[p].l} · {PACE[p].spd}</button>)}</div>
        </div>
        <label className="field"><span className="mono">Jarak · {km} km</span><input type="range" min={10} max={160} step={5} value={km} onChange={(e) => setKm(+e.target.value)} /></label>
        <label className="field"><span className="mono">Rute (opsional)</span><input className="input" value={route} placeholder="mis. GBK – Sudirman – Kota Tua – balik" onChange={(e) => setRoute(e.target.value)} /></label>
        <label className="field"><span className="mono">Catatan</span><textarea className="input" value={notes} placeholder="Bawa lampu, ban cadangan, sarapan bareng…" onChange={(e) => setNotes(e.target.value)} /></label>
        <div className="row between card sunk" style={{ padding: 14 }}>
          <div><div className="b">Mode no-drop</div><div className="tiny muted">Tidak ada yang ditinggal; peringatan jika ada yang tercecer</div></div>
          <Toggle on={noDrop} onChange={setNoDrop} label="No-drop" />
        </div>
        <div className="field"><span className="mono">Undang teman</span>
          <div className="chips">{friends.map((f) => (
            <button key={f.id} className={`chip ${inv.includes(f.id) ? 'on' : ''}`} onClick={() => setInv((t) => (t.includes(f.id) ? t.filter((x) => x !== f.id) : [...t, f.id]))} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Avatar name={f.name} color={f.color} c={f.char} size={20} />{f.name.split(' ')[0]}
            </button>
          ))}</div>
        </div>
        <button className="btn ink block" onClick={submit}><CalendarPlus size={16} /> Buat & undang</button>
      </div>
    </Sheet>
  )
}

const COLORS = ['#ff4d1f', '#111111', '#f5c518', '#2f6fed', '#1f9d6a', '#8a8a85', '#b04ad6']

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
        <BaseMap center={pos} zoom={11} className="map" onClick={setPos}><SmallPin pos={pos} color="#ff4d1f" /></BaseMap>
        <button className="btn ink block" disabled={!name.trim()} onClick={() => { onAdd({ id: uid(), name: name.trim(), color: COLORS[Math.floor(Math.random() * COLORS.length)], avgSpeed: spd, weeklyKm: 80, home: pos, homeLabel: area || 'Jakarta', char: seededChar(Date.now() % 1000) }); setName(''); setArea(''); onClose() }}>Tambah</button>
      </div>
    </Sheet>
  )
}
