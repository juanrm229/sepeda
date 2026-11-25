import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Check, Wallet, CalendarDays, ChevronRight, Clock, Coffee, Scale, Sparkles, UserPlus, LineChart } from 'lucide-react'
import { openAuth } from '../lib/authUi'
import { defaultChar } from '../lib/avatar'
import { useStore } from '../lib/store'
import type { GroupRide } from '../lib/types'
import { Avatar, Sheet, Swipe, toast } from '../components/UI'
import { HeadBadge } from '../components/Character'
import { GroupActionCard } from '../components/GroupActions'
import { openAjak } from '../components/AjakFlow'
import { useForecast } from '../lib/useForecast'
import { firstName, hhmm, journey, missedFriends, peopleOf, rsvpCount, squadSlots, SLOTS, whenText } from '../lib/meetup'
import { ArrivalBoard } from '../components/Arrival'
import { greeting, HARI, HARI_PANJANG } from '../lib/util'
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
      {/* Header ala DailyLoop: sapaan + subjudul serif miring */}
      <div className="hdr">
        <a href="#/karakter" className="hdr-who" title="Karakter & profil">
          <span className="hdr-av"><HeadBadge c={char} size={48} bg="var(--surface)" ring={false} /></span>
          <span style={{ minWidth: 0 }}>
            <span className="hdr-name" style={{ display: 'block' }}>Hey, {firstName(settings.name) || 'kamu'} 👋</span>
            <span className="serif-i" style={{ display: 'block' }}>{next ? `${greeting()}, siap gowes?` : 'Ajak squad gowes, yuk!'}</span>
          </span>
        </a>
        <div className="hdr-actions">
          <a href="#/patungan" className="iconbtn" aria-label="Patungan"><Wallet size={19} /></a>
          <a href="#/reminders" className="iconbtn bell" aria-label="Pengingat"><Bell size={19} />{invites.length > 0 && <i />}</a>
        </div>
      </div>

      {/* Pemilih hari dalam kartu putih */}
      <div className="daycard" role="list" aria-label="7 hari ke depan">
        {days.map((d, i) => {
          const rds = upcoming.filter((g) => new Date(g.datetime).toDateString() === d.toDateString() && g.myRsvp !== 'tidak')
          const going = rds.some((g) => g.myRsvp === 'ikut' || g.myRsvp === 'mungkin')
          return (
            <button key={i} role="listitem" className={`${i === 0 ? 'today' : ''} ${going ? 'has' : rds.length ? 'inv' : ''}`} aria-label={`${HARI_PANJANG[d.getDay()]} ${d.getDate()}${rds.length ? ': ' + rds.map((r) => r.title).join(', ') : ''}`}
              onClick={() => (rds[0] ? go('squad/' + rds[0].id) : openAjak({ datetime: (() => { const x = new Date(d); x.setHours(5, 30); return x.toISOString() })() }))}>
              <span className="wd">{HARI[d.getDay()]}</span>
              <span className="dn">{d.getDate()}</span>
              <i />
            </button>
          )
        })}
      </div>

      {/* Undangan masuk */}
      {invites.length > 0 && (
        <div className="section" style={{ marginTop: 20 }}>
          <div className="section-h"><h3>Undangan masuk</h3><span className="tag accent">{invites.length} baru</span></div>
          <div className="stack" style={{ gap: 18 }}>
            {invites.map((g) => {
              const host = friends.find((f) => f.id === g.host)
              const c = rsvpCount(g)
              return (
                <Swipe key={g.id} onRight={() => { setMyRsvp(g.id, 'ikut'); toast('🚲 Kamu ikut!', g.remote ? `Langsung terkirim ke ${host ? firstName(host.name) : 'host'}` : `Kabari ${host ? firstName(host.name) : 'host'} lewat link balasan`) }} onLeft={() => { setMyRsvp(g.id, 'tidak'); toast('Jawaban tersimpan', 'Lain kali ya') }} right="Ikut! 🚲" left="Skip">
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
                      <button className="btn ink sm" onClick={() => { setMyRsvp(g.id, 'ikut'); toast('🚲 Kamu ikut!', g.remote ? `Langsung terkirim ke ${host ? firstName(host.name) : 'host'}` : `Kabari ${host ? firstName(host.name) : 'host'} lewat link balasan`); go('squad/' + g.id) }}>Ikut!</button>
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

      {/* Kartu hitam: kalimat ber-avatar (Tickr) + dua pil aksi (logistik) */}
      {next ? <NextHero g={next} onLate={() => setLateFor(next)} nowTemp={nowHour?.temp} nowLabel={nowHour ? scoreLabel(nowHour.score) : undefined} /> : (
        <div className="card hero section" style={{ padding: 22 }}>
          <div className="mono">Belum ada rencana</div>
          <p className="sentence" style={{ marginTop: 10 }}>{best && best.free.length > 1 ? <>Squad paling banyak free <b>{HARI_PANJANG[best.date.getDay()]} {SLOTS[best.slot].l.toLowerCase()}</b>, <b>{best.free.length} orang</b>.</> : <>Ajak squad gowes, <b>cuma 10 detik.</b></>}</p>
          <div className="hero-actions">
            <button className="btn white" onClick={() => openAjak(best && best.free.length > 1 ? { datetime: best.date.toISOString() } : undefined)}><UserPlus size={16} /> Ajak gowes</button>
            <a className="btn glass" href="#/kapan"><CalendarDays size={16} /> Kapan bisa?</a>
          </div>
        </div>
      )}

      {next && <TrackCard g={next} />}

      {next && Date.now() > new Date(next.datetime).getTime() - 4 * 3600000 && <div className="section" style={{ marginTop: 12 }}><ArrivalBoard g={next} /></div>}

      <StartChecklist />

      {/* Alat ketemuan */}
      <div className="section">
        <div className="section-h"><h3>Ketemuan</h3></div>
        <div className="grid2">
          <Tool href="#/meet" icon={<Scale size={18} />} t="Titik temu adil" s="Nggak ada yang kejauhan" />
          <Tool href="#/kapan" icon={<CalendarDays size={18} />} t="Kapan semua bisa?" s={best && best.free.length > 1 ? `${HARI[best.date.getDay()]} ${SLOTS[best.slot].l.toLowerCase()} · ${best.free.length} free` : 'Cocokkan jadwal'} />
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

function NextHero({ g, onLate, nowTemp, nowLabel }: { g: GroupRide; onLate: () => void; nowTemp?: number; nowLabel?: string }) {
  const { settings, char, friends } = useStore()
  const start = new Date(g.datetime)
  const going = peopleOf(g, friends, { name: settings.name, char, home: settings.home }).filter((p) => p.rsvp === 'ikut' && !p.me)
  const pending = rsvpCount(g).menunggu
  return (
    <div className="card hero section" style={{ padding: 22 }}>
      <div className="row between" style={{ cursor: 'pointer' }} onClick={() => go('squad/' + g.id)}>
        <span className="mono">Gowes berikutnya · {whenText(g.datetime).replace(/ \d\d\.\d\d$/, '')}</span>
        <span className="hero-go" aria-hidden><ChevronRight size={18} /></span>
      </div>
      <p className="sentence" style={{ marginTop: 12, cursor: 'pointer' }} onClick={() => go('squad/' + g.id)}>
        <b>{g.title}</b> kumpul <b>{hhmm(start)}</b> di {g.meet.name.split(' (')[0]}
        {going.length > 0 && <> bareng <span className="inl">{going.slice(0, 4).map((p) => p.char && <HeadBadge key={p.id} c={p.char} size={30} ring={false} />)}</span> <b>{going.length} teman</b></>}
        {pending > 0 && <>, {pending} belum jawab</>}.
        {nowTemp != null && <> Sekarang <b>{Math.round(nowTemp)}°</b>, {nowLabel?.toLowerCase()}.</>}
      </p>
      <div className="hero-actions">
        <button className="btn white" onClick={async () => { const r = await shareOrCopy(g.title, inviteText(g, inviteLink(g, settings.name, char, settings.pay))); if (r === 'copied') toast('🔗 Link undangan disalin') }}><UserPlus size={16} /> Ajak teman</button>
        <button className="btn white" onClick={onLate}><Clock size={16} /> Aku telat</button>
      </div>
    </div>
  )
}

/** Kartu pelacakan ala aplikasi logistik: dari → ke + stepper. */
function TrackCard({ g }: { g: GroupRide }) {
  const { settings } = useStore()
  const start = new Date(g.datetime)
  const dist = haversine(settings.home, g.meet.pos)
  const leave = new Date(start.getTime() - (etaMin(dist, 20) + 10) * 60000)
  const j = journey(g)
  const tl = g.plan ? timeline(g.plan) : null
  const timeOf = (k: string, i: number) => (i === 0 ? hhmm(start) : !tl ? '' : k === 'finish' ? hhmm(tl.finish) : hhmm(tl.rows[i - 1]?.arrive ?? start))
  const kopi = j.nodes.find((n) => n.kind === 'kopi')
  const to = kopi ?? j.nodes[j.nodes.length - 1]
  const nodes = j.nodes.length > 4 ? [j.nodes[0], ...(kopi ? [kopi] : []), j.nodes[j.nodes.length - 1]] : j.nodes
  const c = rsvpCount(g)
  return (
    <button className="trackcard section" onClick={() => go('squad/' + g.id)}>
      <div className="row between">
        <div><div className="mono">Kode ajakan</div><div className="b" style={{ marginTop: 2 }}>#{g.id.slice(0, 6).toUpperCase()}</div></div>
        <span className={`status-pill ${c.menunggu ? 'wait' : 'ok'}`}>{j.doneIdx >= 0 ? 'Sedang jalan' : c.menunggu ? 'Menunggu jawaban' : 'Siap berangkat'}</span>
      </div>
      <div className="track-ft">
        <div><div className="mono">Kumpul</div><div className="b">{g.meet.name.split(' (')[0]}</div><div className="tiny muted">{hhmm(start)} · berangkat {hhmm(leave)}</div></div>
        <div style={{ textAlign: 'right' }}><div className="mono">{kopi ? 'Ngopi' : 'Finish'}</div><div className="b">{to.name.split(' (')[0]}</div><div className="tiny muted">{timeOf(to.key, j.nodes.indexOf(to)) || '—'}</div></div>
      </div>
      <div className="stepper">
        {nodes.map((n, i) => {
          const idx = j.nodes.indexOf(n)
          return (
            <div key={n.key} className={`st ${idx <= j.doneIdx ? 'done' : idx === j.nowIdx ? 'now' : ''}`}>
              {i > 0 && <span className="bar" />}
              <span className="node">{idx <= j.doneIdx ? '✓' : ''}</span>
              <span className="lbl">{n.label}</span>
              <span className="tm">{timeOf(n.key, idx) || '—'}</span>
            </div>
          )
        })}
      </div>
    </button>
  )
}

/** Checklist mulai ala "3 of 5 done". */
function StartChecklist() {
  const { auth, friends, avail, groupRides, settings, char } = useStore()
  const [hide, setHide] = useState(() => { try { return localStorage.getItem('pack-start-hide') === '1' } catch { return false } })
  const items = [
    { t: 'Buat akun PACK', d: !!auth, act: () => openAuth('signup') },
    { t: 'Rapikan karaktermu', d: JSON.stringify(char) !== JSON.stringify(defaultChar), act: () => go('karakter') },
    { t: 'Tambah 2 teman', d: friends.length >= 2, act: () => go('squad') },
    { t: 'Tandai kapan kamu free', d: avail !== 0, act: () => go('kapan') },
    { t: 'Ajak gowes pertama', d: groupRides.some((g) => g.host === 'me'), act: () => openAjak() },
    { t: 'Simpan rekening patungan', d: !!settings.pay?.length, act: () => go('patungan') },
  ]
  const done = items.filter((x) => x.d).length
  if (hide || done === items.length) return null
  return (
    <div className="card section startlist">
      <div className="row between">
        <div><div className="mono">Mulai di PACK</div><div className="h2" style={{ marginTop: 4 }}>{done} dari {items.length} selesai</div></div>
        <button className="link" onClick={() => { setHide(true); try { localStorage.setItem('pack-start-hide', '1') } catch { /* */ } }}>Sembunyikan</button>
      </div>
      <div className="progress"><i style={{ width: `${(done / items.length) * 100}%` }} /></div>
      <div className="stack" style={{ gap: 2, marginTop: 8 }}>
        {items.map((x) => (
          <button key={x.t} className={`check-row ${x.d ? 'done' : ''}`} onClick={x.act} disabled={x.d}>
            <span className="check-c">{x.d && <Check size={13} />}</span>
            <span className="grow">{x.t}</span>
            {!x.d && <ChevronRight size={16} className="muted" />}
          </button>
        ))}
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
      <span className="row between"><span className="ico" style={dark ? { background: 'rgba(255,255,255,.12)', color: '#fff' } : undefined}>{icon}</span><ChevronRight size={17} style={{ opacity: 0.5 }} /></span>
      <span style={{ display: 'block', marginTop: 18 }}><span className="b" style={{ display: 'block', fontSize: 15, letterSpacing: '-0.02em' }}>{t}</span><span className="tiny" style={{ display: 'block', marginTop: 2, color: dark ? 'rgba(255,255,255,.62)' : 'var(--muted)' }}>{s}</span></span>
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
