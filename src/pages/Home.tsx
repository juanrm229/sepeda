import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Wallet, CalendarDays, ChevronRight, Clock, Coffee, MapPin, Navigation, Scale, Share2, Sparkles, UserPlus, LineChart } from 'lucide-react'
import { useStore } from '../lib/store'
import type { GroupRide } from '../lib/types'
import { Avatar, Sheet, Swipe, toast } from '../components/UI'
import { HeadBadge } from '../components/Character'
import { GroupActionCard } from '../components/GroupActions'
import { openAjak, PACE } from '../components/AjakFlow'
import { useForecast } from '../lib/useForecast'
import { firstName, hhmm, journey, missedFriends, peopleOf, rsvpCount, squadSlots, SLOTS, whenText } from '../lib/meetup'
import { ArrivalBoard } from '../components/Arrival'
import { greeting, HARI, BULAN, HARI_PANJANG } from '../lib/util'
import { inviteLink, inviteText, shareOrCopy } from '../lib/share'
import { etaMin, haversine } from '../lib/geo'
import { timeline } from '../lib/plan'
import { go } from '../lib/router'
import { scoreLabel } from '../lib/weather'

const isFuture = (g: GroupRide) => new Date(g.datetime).getTime() > Date.now() - 4 * 3600000

export default function Home() {
  const { settings, char, groupRides, friends, avail, setMyRsvp, rides } = useStore()
  const [lateFor, setLateFor] = useState<GroupRide | null>(null)
  const fc = useForecast(settings.home)
  const upcoming = useMemo(() => groupRides.filter(isFuture).sort((a, b) => a.datetime.localeCompare(b.datetime)), [groupRides])
  const next = upcoming.find((g) => g.myRsvp === 'ikut')
  const invites = upcoming.filter((g) => g.myRsvp === 'menunggu' && g.host !== 'me')
  const slots = useMemo(() => squadSlots([{ id: 'me', avail }, ...friends.map((f) => ({ id: f.id, avail: f.avail }))], fc?.hours), [avail, friends, fc])
  const best = slots[0]
  const now = new Date()
  const nowHour = fc?.hours.find((h) => Math.abs(h.time.getTime() - now.getTime()) < 1800000)

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d })

  return (
    <div className="fadein">
      <MiniHeader next={next} />
      {/* Header */}
      <div className="hdr">
        <a href="#/karakter" className="hdr-who" title="Karakter & profil">
          <span className="hdr-av"><HeadBadge c={char} size={46} bg="var(--surface)" ring={false} /></span>
          <span style={{ minWidth: 0 }}>
            <span className="hdr-hi" style={{ display: 'block' }}>{greeting()},</span>
            <span className="hdr-name" style={{ display: 'block' }}>{firstName(settings.name)}</span>
          </span>
        </a>
        <div className="hdr-actions">
          <a href="#/patungan" className="iconbtn" aria-label="Patungan"><Wallet size={19} /></a>
          <a href="#/kapan" className="iconbtn" aria-label="Kapan semua bisa"><CalendarDays size={19} /></a>
          <a href="#/reminders" className="iconbtn bell" aria-label="Pengingat"><Bell size={19} />{invites.length > 0 && <i />}</a>
        </div>
      </div>

      {/* Kalimat hari ini */}
      <Sentence next={next} invites={invites} nowTemp={nowHour?.temp} nowLabel={nowHour ? scoreLabel(nowHour.score) : undefined} best={best} />

      {/* Strip hari */}
      <div className="weekstrip" style={{ marginTop: 22 }} role="list" aria-label="7 hari ke depan">
        {days.map((d, i) => {
          const rides = upcoming.filter((g) => new Date(g.datetime).toDateString() === d.toDateString() && g.myRsvp !== 'tidak')
          const going = rides.some((g) => g.myRsvp === 'ikut' || g.myRsvp === 'mungkin')
          return (
            <button key={i} role="listitem" className={`${i === 0 ? 'today' : ''} ${going ? 'has' : rides.length ? 'inv' : ''}`} aria-label={`${HARI_PANJANG[d.getDay()]} ${d.getDate()}${rides.length ? ': ' + rides.map((r) => r.title).join(', ') : ''}`}
              onClick={() => (rides[0] ? go('squad/' + rides[0].id) : openAjak({ datetime: (() => { const x = new Date(d); x.setHours(5, 30); return x.toISOString() })() }))}>
              <span className="wd">{HARI[d.getDay()]}</span>
              <span className="dn">{d.getDate()}{rides.length > 0 && i === 0 && <i />}</span>
            </button>
          )
        })}
      </div>

      {/* Ajakan berikutnya */}
      {next ? <NextCard g={next} onLate={() => setLateFor(next)} /> : (
        <div className="card hero section">
          <div className="mono">Belum ada rencana</div>
          <div className="display" style={{ fontSize: 28, marginTop: 8 }}>Ajak squad gowes,<br />cuma 10 detik.</div>
          {best && <p className="small muted" style={{ marginTop: 8 }}>Saran: {HARI_PANJANG[best.date.getDay()]} {SLOTS[best.slot].l.toLowerCase()} {hhmm(best.date)} · {best.free.length} orang free</p>}
          <button className="btn white block" style={{ marginTop: 16 }} onClick={() => openAjak(best ? { datetime: best.date.toISOString() } : undefined)}><UserPlus size={16} /> Ajak gowes</button>
        </div>
      )}

      {next && Date.now() > new Date(next.datetime).getTime() - 4 * 3600000 && <div className="section" style={{ marginTop: 12 }}><ArrivalBoard g={next} /></div>}

      {/* Undangan masuk */}
      {invites.length > 0 && (
        <div className="section">
          <div className="section-h"><h3>Undangan masuk</h3><span className="tag accent">{invites.length} baru</span></div>
          <div className="stack" style={{ gap: 18 }}>
            {invites.map((g) => {
              const host = friends.find((f) => f.id === g.host)
              const c = rsvpCount(g)
              return (
                <Swipe key={g.id} onRight={() => { setMyRsvp(g.id, 'ikut'); toast('🚲 Kamu ikut!', `Kabari ${host ? firstName(host.name) : 'host'} lewat link balasan`) }} onLeft={() => { setMyRsvp(g.id, 'tidak'); toast('Jawaban tersimpan', 'Lain kali ya') }} right="Ikut! 🚲" left="Skip">
                <div className="sticky-stack">
                  <i className="under" />
                  <div className="sticky">
                    <div className="row between">
                      <span className="row" style={{ gap: 8 }}>{host && <HeadBadge c={host.char} size={30} bg="#fff" ring={false} />}<span className="mono">dari {host ? firstName(host.name) : g.host}</span></span>
                      <span className="mono">{whenText(g.datetime)}</span>
                    </div>
                    <div className="hand" style={{ fontSize: 29, marginTop: 10 }}>{g.note ?? g.title}</div>
                    <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
                      <span className="tag">🚲 {g.title}</span><span className="tag">📍 {g.meet.name.split(' ').slice(0, 3).join(' ')}</span><span className="tag">{c.ikut} ikut</span>
                    </div>
                    <div className="grid3" style={{ marginTop: 14, gridTemplateColumns: '1.4fr 1fr 1fr' }}>
                      <button className="btn ink sm" onClick={() => { setMyRsvp(g.id, 'ikut'); toast('🚲 Kamu ikut!', `Kabari ${host ? firstName(host.name) : 'host'} lewat link balasan`); go('squad/' + g.id) }}>Ikut!</button>
                      <button className="btn ghost sm" onClick={() => go('squad/' + g.id)}>Detail</button>
                      <button className="btn ghost sm" onClick={() => { setMyRsvp(g.id, 'tidak'); toast('Jawaban tersimpan') }}>Skip</button>
                    </div>
                    <div className="swipe-hint">← geser untuk skip · geser untuk ikut →</div>
                  </div>
                </div>
                </Swipe>
              )
            })}
          </div>
        </div>
      )}

      {/* Alat ketemuan */}
      <div className="section">
        <div className="section-h"><h3>Ketemuan</h3></div>
        <div className="grid2">
          <Tool href="#/meet" icon={<Scale size={18} />} t="Titik temu adil" s="Nggak ada yang kejauhan" />
          <Tool href="#/kapan" icon={<CalendarDays size={18} />} t="Kapan semua bisa?" s={best ? `${HARI[best.date.getDay()]} ${SLOTS[best.slot].l.toLowerCase()} · ${best.free.length} free` : 'Cocokkan jadwal'} />
          <Tool href="#/rute" icon={<Coffee size={18} />} t="Rute & ngopi" s="Checkpoint + coffee break" />
          <Tool onClick={() => openAjak()} icon={<Sparkles size={18} />} t="Ajak kilat" s="Undangan + voting" dark />
        </div>
      </div>

      {/* Agenda singkat */}
      {upcoming.filter((g) => g !== next && !invites.includes(g)).length > 0 && (
        <div className="section">
          <div className="section-h"><h3>Agenda</h3><a href="#/squad">Semua <ChevronRight size={14} /></a></div>
          <div className="stack" style={{ gap: 8 }}>
            {upcoming.filter((g) => g !== next && !invites.includes(g)).slice(0, 3).map((g) => <AgendaRow key={g.id} g={g} />)}
          </div>
        </div>
      )}

      {/* Squad free */}
      {best && best.free.length > 1 && (
        <a href="#/kapan" className="card click section" style={{ display: 'block', textDecoration: 'none' }}>
          <div className="mono">Squad lagi free</div>
          <div className="row between" style={{ marginTop: 10 }}>
            <div>
              <div className="h2">{HARI_PANJANG[best.date.getDay()]} {SLOTS[best.slot].l.toLowerCase()}</div>
              <div className="small muted">{hhmm(best.date)} · {best.free.length} orang{best.score != null ? ` · cuaca ${best.score}` : ''}</div>
            </div>
            <div className="avatars">{best.free.slice(0, 5).map((id) => { const f = friends.find((x) => x.id === id); return id === 'me' ? <HeadBadge key={id} c={char} size={34} /> : f ? <HeadBadge key={id} c={f.char} size={34} /> : null })}</div>
          </div>
        </a>
      )}

      {/* Kimia squad */}
      {(() => { const m = missedFriends(friends, groupRides, rides, 14)[0]; return m ? (
        <div className="card section" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 12 }}>
            <HeadBadge c={m.f.char} size={46} bg="var(--surface-2)" />
            <div className="grow"><div className="mono">Kangen gowes bareng</div><div className="b" style={{ marginTop: 2 }}>{m.days == null ? `Belum pernah gowes bareng ${firstName(m.f.name)}` : `${m.days} hari nggak bareng ${firstName(m.f.name)}`}</div></div>
            <button className="btn ink sm" onClick={() => openAjak({ participants: [{ friendId: m.f.id, rsvp: 'menunggu' }] })}>Ajak</button>
          </div>
        </div>) : null })()}

      {/* Analisis: nanti */}
      <a href="#/insights" className="lrow section" style={{ marginBottom: 8 }}>
        <span className="ico"><LineChart size={17} /></span>
        <span className="grow"><span className="t" style={{ display: 'block' }}>Analisis ride</span><span className="s" style={{ display: 'block' }}>Segera: bagikan dari Strava, dijelaskan lebih dalam</span></span>
        <ChevronRight size={16} className="muted" />
      </a>

      <Sheet open={!!lateFor} onClose={() => setLateFor(null)} title="Kabari squad">
        {lateFor && <GroupActionCard g={lateFor} />}
      </Sheet>
    </div>
  )
}

function Sentence({ next, invites, nowTemp, nowLabel, best }: { next?: GroupRide; invites: GroupRide[]; nowTemp?: number; nowLabel?: string; best?: ReturnType<typeof squadSlots>[number] }) {
  const { friends, char, settings } = useStore()
  const d = new Date()
  const going = next ? peopleOf(next, friends, { name: settings.name, char, home: settings.home }).filter((p) => p.rsvp === 'ikut' && !p.me) : []
  const pending = next ? rsvpCount(next).menunggu : 0
  return (
    <p className="sentence">
      {HARI_PANJANG[d.getDay()]} {d.getDate()} {BULAN[d.getMonth()]}.{' '}
      {nowTemp != null && <>Di luar <b>{Math.round(nowTemp)}°, {nowLabel?.toLowerCase()}</b>. </>}
      {next ? (
        <>
          <b>{whenText(next.datetime)}</b> kamu gowes <b>{next.title}</b>
          {going.length > 0 && <> bareng <span className="inl">{going.slice(0, 4).map((p) => p.char && <HeadBadge key={p.id} c={p.char} size={30} ring={false} />)}</span> <b>{going.length} teman</b></>}
          {pending > 0 && <>, {pending} belum jawab</>}.{' '}
        </>
      ) : best ? <>Squad paling banyak free <b>{HARI_PANJANG[best.date.getDay()]} {SLOTS[best.slot].l.toLowerCase()}</b>. </> : null}
      {invites.length > 0 && <>Ada <b>{invites.length} ajakan</b> <span className="inl">{invites.slice(0, 2).map((g) => { const h = friends.find((f) => f.id === g.host); return h && <HeadBadge key={g.id} c={h.char} size={30} ring={false} /> })}</span> nunggu jawabanmu.</>}
    </p>
  )
}

function NextCard({ g, onLate }: { g: GroupRide; onLate: () => void }) {
  const { settings, char } = useStore()
  const start = new Date(g.datetime)
  const dist = haversine(settings.home, g.meet.pos)
  const leave = new Date(start.getTime() - (etaMin(dist, 20) + 10) * 60000)
  const j = journey(g)
  const tl = g.plan ? timeline(g.plan) : null
  const timeOf = (k: string, i: number) => (i === 0 ? hhmm(start) : !tl ? '' : k === 'finish' ? hhmm(tl.finish) : hhmm(tl.rows[i - 1]?.arrive ?? start))
  const nodes = j.nodes.length > 4 ? [j.nodes[0], ...j.nodes.filter((n) => n.kind === 'kopi').slice(0, 1), j.nodes[j.nodes.length - 1]] : j.nodes
  return (
    <div className="card hero section" style={{ padding: 20 }}>
      <div className="row between" style={{ cursor: 'pointer' }} onClick={() => go('squad/' + g.id)}>
        <div style={{ minWidth: 0 }}>
          <div className="mono">Gowes berikutnya · {whenText(g.datetime).replace(/ \d\d\.\d\d$/, '')}</div>
          <div className="display" style={{ fontSize: 30, marginTop: 8 }}>{g.title}</div>
          <div className="small muted" style={{ marginTop: 6 }}><MapPin size={12} style={{ verticalAlign: -1 }} /> {g.meet.name}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="big" style={{ fontSize: 34 }}>{hhmm(start)}</div>
          <div className="mono">{g.distanceKm} km · {PACE[g.pace].l}</div>
        </div>
      </div>
      <div className="stepper" style={{ marginTop: 22 }}>
        {nodes.map((n, i) => {
          const idx = j.nodes.indexOf(n)
          return (
            <div key={n.key} className={`st ${idx <= j.doneIdx ? 'done' : idx === j.nowIdx ? 'now' : ''}`}>
              {i > 0 && <span className="bar" />}
              <span className="node">{idx <= j.doneIdx ? '✓' : ''}</span>
              <span className="lbl">{n.label === 'Ngopi' ? '☕ ' + n.name.split(' ').slice(0, 2).join(' ') : n.label}</span>
              <span className="tm">{timeOf(n.key, idx) || '—'}</span>
            </div>
          )
        })}
      </div>
      <div className="row" style={{ marginTop: 18, gap: 8, background: 'rgba(255,255,255,.07)', borderRadius: 16, padding: '10px 12px' }}>
        <Navigation size={15} />
        <span className="small grow">Berangkat dari rumah <b>{hhmm(leave)}</b> · {dist.toFixed(1)} km</span>
      </div>
      <div className="grid3" style={{ marginTop: 14, gap: 8 }}>
        <button className="btn white sm" onClick={() => go('squad/' + g.id)}>Detail</button>
        <button className="btn glass sm" onClick={async () => { const r = await shareOrCopy(g.title, inviteText(g, inviteLink(g, settings.name, char, settings.pay))); if (r === 'copied') toast('🔗 Link undangan disalin') }}><Share2 size={14} /> Ajak</button>
        <button className="btn glass sm" onClick={onLate}><Clock size={14} /> Telat</button>
      </div>
    </div>
  )
}

export function AgendaRow({ g }: { g: GroupRide }) {
  const { friends, settings, char } = useStore()
  const d = new Date(g.datetime)
  const ppl = peopleOf(g, friends, { name: settings.name, char, home: settings.home }).filter((p) => p.rsvp === 'ikut')
  const status = g.myRsvp === 'ikut' ? <span className="pill-r">Ikut</span> : g.myRsvp === 'menunggu' ? <span className="tag accent">Jawab</span> : g.myRsvp === 'mungkin' ? <span className="tag warn">Mungkin</span> : <span className="tag">Tidak</span>
  return (
    <button className="lrow" onClick={() => go('squad/' + g.id)} style={{ opacity: new Date(g.datetime).getTime() < Date.now() - 4 * 3600000 ? 0.55 : 1 }}>
      <span className="ico" style={{ flexDirection: 'column', width: 46, height: 46, gap: 0 }}><span className="mono" style={{ fontSize: 9 }}>{HARI[d.getDay()]}</span><b style={{ fontSize: 17, lineHeight: 1 }}>{d.getDate()}</b></span>
      <span className="grow">
        <span className="t" style={{ display: 'block' }}>{g.title}</span>
        <span className="s" style={{ display: 'block' }}>{hhmm(d)} · {g.meet.name}</span>
      </span>
      <span className="avatars hide-m-sm">{ppl.slice(0, 3).map((p) => p.char && <Avatar key={p.id} name={p.name} color={p.color} c={p.char} size={26} />)}</span>
      {status}
    </button>
  )
}

function Tool({ href, onClick, icon, t, s, dark }: { href?: string; onClick?: () => void; icon: React.ReactNode; t: string; s: string; dark?: boolean }) {
  const inner = (
    <>
      <span className={`ico ${dark ? '' : ''}`} style={dark ? { background: 'rgba(255,255,255,.12)', color: '#fff' } : undefined}>{icon}</span>
      <span style={{ display: 'block', marginTop: 14 }}><span className="b" style={{ display: 'block', fontSize: 15, letterSpacing: '-0.02em' }}>{t}</span><span className="tiny" style={{ display: 'block', marginTop: 2, color: dark ? 'rgba(255,255,255,.62)' : 'var(--muted)' }}>{s}</span></span>
    </>
  )
  const cls = `card click ${dark ? 'hero' : ''}`
  const st: React.CSSProperties = { display: 'block', textDecoration: 'none', padding: 16, textAlign: 'left', border: 0, width: '100%' }
  return href ? <a href={href} className={cls} style={st}>{inner}</a> : <button className={cls} style={st} onClick={onClick}>{inner}</button>
}

const ZC = ['', 'var(--sunken)', 'color-mix(in srgb, var(--ink) 35%, transparent)', 'color-mix(in srgb, var(--ink) 60%, transparent)', 'var(--ink)', 'var(--accent)']
/** Strip zona mini (dipakai di Riwayat). */
export function ZoneStrip({ zones, w = 70 }: { zones?: number[]; w?: number }) {
  if (!zones?.length) return null
  return <span style={{ display: 'flex', width: w, height: 22, alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>{zones.filter((_, i) => i % 2 === 0).map((z, i) => <i key={i} style={{ flex: 1, height: `${z * 20}%`, background: ZC[z], borderRadius: 1.5 }} />)}</span>
}

/** Header ringkas yang muncul saat digulir (ala Tickr). */
function MiniHeader({ next }: { next?: GroupRide }) {
  const { char } = useStore()
  const [on, setOn] = useState(false)
  useEffect(() => {
    const f = () => setOn(window.scrollY > 170)
    f(); window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  return createPortal(
    <div className={`minihdr ${on ? 'on' : ''}`} aria-hidden={!on}>
      <HeadBadge c={char} size={30} ring={false} />
      {next ? <button className="minihdr-chip" tabIndex={on ? 0 : -1} onClick={() => go('squad/' + next.id)}><b>{whenText(next.datetime)}</b> · {next.title}</button> : <span className="b">PACK</span>}
    </div>,
    document.body,
  )
}
