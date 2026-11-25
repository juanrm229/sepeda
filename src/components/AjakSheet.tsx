import { useEffect, useMemo, useState } from 'react'
import { PACE } from './AjakFlow'
import { ArrowLeft, ArrowRight, Check, Coffee, Crosshair, Home as HomeIcon, Loader2, MessageCircle, Scale, Share2, Sparkles, X } from 'lucide-react'
import { useStore } from '../lib/store'
import type { GroupRide, LatLng, Pace, PlaceRef } from '../lib/types'
import { BaseMap, MeetPin, AvatarPin, SmallPin } from './Map'
import { Avatar, Sheet, toast, celebrate } from './UI'
import { fairPointByTime, haversine } from '../lib/geo'
import { nearbyPlaces, nearbyMeetSpots, type Place } from '../lib/places'
import { firstName, hhmm, isFree, squadSlots, SLOTS } from '../lib/meetup'
import { useForecast } from '../lib/useForecast'
import { inviteLink, inviteText, shareOrCopy, waLink } from '../lib/share'
import { uid, HARI, BULAN } from '../lib/util'
import { go } from '../lib/router'
import { HeadBadge } from './Character'

const IDEAS = [
  { e: '☕', t: 'Coffee ride', km: 30, pace: 'santai' as Pace, note: 'Gowes santai, ujungnya ngopi.' },
  { e: '🌄', t: 'Gowes pagi', km: 40, pace: 'sedang' as Pace, note: 'Pagi-pagi biar nggak panas!' },
  { e: '⛰️', t: 'Nanjak bareng', km: 60, pace: 'kencang' as Pace, note: 'Siap-siap betis bicara 😄' },
  { e: '🌅', t: 'Sunset ride', km: 25, pace: 'santai' as Pace, note: 'Kejar senja, foto-foto.' },
  { e: '🏢', t: 'Commute bareng', km: 15, pace: 'sedang' as Pace, note: 'Berangkat kantor bareng, aman rame-rame.' },
]
const TIMES = ['05:00', '05:30', '06:00', '06:30', '07:00', '15:30', '16:00', '19:00']
const STEPS = ['Apa', 'Kapan', 'Siapa', 'Kumpul', 'Ngopi', 'Kirim']

const atTime = (day: Date, t: string) => { const d = new Date(day); const [h, m] = t.split(':').map(Number); d.setHours(h, m, 0, 0); return d }
const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

export default function AjakSheet({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: Partial<GroupRide> }) {
  const { friends, settings, char, avail, upsertGroupRide } = useStore()
  const fc = useForecast(settings.home)
  const presetDate = preset?.datetime ? new Date(preset.datetime) : null
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState(preset?.title ?? 'Coffee ride')
  const [pace, setPace] = useState<Pace>(preset?.pace ?? 'santai')
  const [km, setKm] = useState(preset?.distanceKm ?? 30)
  const [note, setNote] = useState(preset?.note ?? 'Gowes santai, ujungnya ngopi.')
  const [day, setDay] = useState<Date>(() => { const d = presetDate ?? new Date(); if (!presetDate) d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); d.setHours(0, 0, 0, 0); return d })
  const [times, setTimes] = useState<string[]>([presetDate ? hm(presetDate) : '05:30'])
  const [vote, setVote] = useState(false)
  const [inv, setInv] = useState<string[]>(preset?.participants?.map((p) => p.friendId) ?? [])
  const [meet, setMeet] = useState<{ name: string; pos: LatLng }>(preset?.meet ?? { name: 'Pintu 1 GBK Senayan', pos: [-6.2186, 106.8026] })
  const [spots, setSpots] = useState<Place[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [cafes, setCafes] = useState<Place[] | null>(null)
  const [coffee, setCoffee] = useState<PlaceRef[]>(preset?.coffeeOptions ?? [])
  const [noDrop, setNoDrop] = useState(preset?.noDrop ?? true)
  const [created, setCreated] = useState<GroupRide | null>(null)

  const firstT = atTime(day, times[0] ?? '05:30')
  const slotOf = (t: Date) => (t.getHours() < 12 ? 0 : t.getHours() < 19 ? 1 : 2)
  const ranked = useMemo(() => squadSlots([{ id: 'me', avail }, ...friends.map((f) => ({ id: f.id, avail: f.avail }))], fc?.hours), [avail, friends, fc])
  const tip = ranked[0]
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d })

  const people = [{ id: 'me', pos: settings.home, spd: 25 }, ...friends.filter((f) => inv.includes(f.id)).map((f) => ({ id: f.id, pos: f.home, spd: f.avgSpeed }))]
  const fair = people.length > 1 ? fairPointByTime(people.map((p) => p.pos), people.map((p) => p.spd)) : null

  async function findSpots(p: LatLng) {
    setBusy(true); setSpots(null)
    try { setSpots(await nearbyMeetSpots(p, 1000)) } catch { setSpots([]) }
    setBusy(false)
  }
  async function findCafes() {
    setBusy(true); setCafes(null)
    try { setCafes(await nearbyPlaces(meet.pos, 'kopi', 2500)) } catch { setCafes([]) }
    setBusy(false)
  }
  useEffect(() => { if (step === 4 && cafes === null && !busy) findCafes() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [step])

  function build(): GroupRide {
    const opts = (vote ? times : times.slice(0, 1)).map((t) => atTime(day, t).toISOString()).sort()
    const dt = opts[0]
    const g: GroupRide = {
      id: preset?.id ?? uid(), title: title.trim() || 'Gowes bareng', datetime: dt, meet, pace, distanceKm: km, noDrop, note: note.trim() || undefined,
      participants: inv.map((id) => preset?.participants?.find((p) => p.friendId === id) ?? { friendId: id, rsvp: 'menunggu' as const }),
      myRsvp: 'ikut', host: 'me', timeOptions: opts.length > 1 ? opts : undefined, coffeeOptions: coffee.length ? coffee : undefined, myVote: opts.length > 1 || coffee.length > 1 ? { t: 0, c: coffee.length ? 0 : undefined } : undefined,
      route: preset?.route,
      plan: preset?.plan
        ? { ...preset.plan, start: meet, startTime: dt }
        : coffee.length
          ? { id: uid(), name: title, start: meet, finish: null, speed: PACE[pace].v, startTime: dt, checkpoints: [{ id: uid(), name: coffee[0].name, pos: coffee[0].pos, kind: 'kopi', stopMin: 25, place: coffee[0] }] }
          : undefined,
    }
    return g
  }

  function finish(mode: 'wa' | 'share' | 'save') {
    const g = build()
    upsertGroupRide(g)
    setCreated(g)
    const text = inviteText(g, inviteLink(g, settings.name, char))
    if (mode === 'wa') window.open(waLink(text), '_blank')
    if (mode === 'share') shareOrCopy(g.title, text).then((r) => r === 'copied' && toast('🔗 Undangan disalin', 'Tempel di grup WhatsApp squad'))
    celebrate(0.5)
    toast('🚲 Ajakan dibuat', inv.length ? `Menunggu jawaban ${inv.length} teman` : 'Bagikan linknya ke squad')
  }

  const canNext = [title.trim().length > 0, times.length > 0, true, !!meet.name.trim(), true, true][step]

  if (created) {
    return (
      <Sheet open={open} onClose={onClose}>
        <div className="stack" style={{ textAlign: 'center', paddingTop: 6 }}>
          <div className="ico round ink" style={{ margin: '0 auto', width: 56, height: 56 }}><Check size={26} /></div>
          <div className="qtitle">Ajakan terkirim.<br /><span>Tinggal tunggu jawaban.</span></div>
          <p className="small muted">Saat teman menjawab, mereka akan mengirim <b>link balasan</b> lewat WhatsApp. Ketuk link itu dan RSVP, vote jam, serta lokasi berangkat mereka otomatis masuk ke sini.</p>
          <button className="btn ink block lg" onClick={() => { onClose(); go('squad/' + created.id) }}>Lihat ajakan</button>
          <button className="btn ghost block" onClick={onClose}>Tutup</button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <button className="iconbtn" aria-label={step ? 'Kembali' : 'Tutup'} onClick={() => (step ? setStep(step - 1) : onClose())}>{step ? <ArrowLeft size={18} /> : <X size={18} />}</button>
        <span className="mono">{step + 1} / {STEPS.length} · {STEPS[step]}</span>
        <span style={{ width: 44 }} />
      </div>
      <div className="steps" style={{ marginBottom: 22 }}>{STEPS.map((s, i) => <i key={s} className={i <= step ? 'on' : ''} />)}</div>

      {step === 0 && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="qtitle">Mau gowes<br /><span>apa nih?</span></div>
          <div className="chips">
            {IDEAS.map((x) => <button key={x.t} className={`chip ${title === x.t ? 'on' : ''}`} onClick={() => { setTitle(x.t); setKm(x.km); setPace(x.pace); setNote(x.note) }}>{x.e} {x.t}</button>)}
          </div>
          <label className="field"><span className="mono">Nama ajakan</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <div className="field"><span className="mono">Pace</span>
            <div className="tabs" style={{ boxShadow: 'none' }}>
              <i className="tabs-ind" style={{ width: 'calc((100% - 8px) / 3)', transform: `translateX(${(['santai', 'sedang', 'kencang'] as Pace[]).indexOf(pace) * 100}%)` }} />
              {(Object.keys(PACE) as Pace[]).map((p) => <button key={p} className={pace === p ? 'on' : ''} onClick={() => setPace(p)}>{PACE[p].l}</button>)}
            </div>
            <span className="tiny muted">{PACE[pace].spd}{noDrop ? ' · no-drop: nggak ada yang ditinggal' : ''}</span>
          </div>
          <label className="field"><span className="mono">Jarak · {km} km</span><input type="range" min={10} max={160} step={5} value={km} onChange={(e) => setKm(+e.target.value)} /></label>
          <label className="field"><span className="mono">Pesan singkat (tampil di catatan undangan)</span>
            <textarea className="input hand" style={{ fontSize: 22, minHeight: 64 }} maxLength={90} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label className="row between card well" style={{ padding: 14 }}>
            <span><span className="b">No-drop</span><br /><span className="tiny muted">Rombongan menunggu yang tertinggal</span></span>
            <button type="button" className={`toggle ${noDrop ? 'on' : ''}`} aria-pressed={noDrop} aria-label="No-drop" onClick={() => setNoDrop(!noDrop)} />
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="qtitle">Kapan<br /><span>gowesnya?</span></div>
          {tip && (
            <button className="lrow" onClick={() => { const d = new Date(tip.date); d.setHours(0, 0, 0, 0); setDay(d); setTimes([hm(tip.date)]) }}>
              <span className="ico ink"><Sparkles size={17} /></span>
              <span className="grow"><span className="t" style={{ display: 'block' }}>{HARI[tip.date.getDay()]} {tip.date.getDate()} · {hhmm(tip.date)}</span><span className="s" style={{ display: 'block' }}>{tip.free.length} orang free{tip.score != null ? ` · cuaca ${tip.score}/100` : ''} · saran terbaik</span></span>
              <span className="pill-r">Pakai</span>
            </button>
          )}
          <div className="hscroll" style={{ gridAutoColumns: 56, gap: 8 }}>
            {days.map((d) => {
              const on = d.toDateString() === day.toDateString()
              return (
                <button key={d.toISOString()} onClick={() => setDay(d)} style={{ border: 0, borderRadius: 18, padding: '10px 0', background: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, boxShadow: on ? 'none' : 'var(--shadow)' }}>
                  <span className="mono" style={{ color: 'inherit', opacity: 0.7 }}>{HARI[d.getDay()]}</span>
                  <b style={{ fontSize: 18, letterSpacing: '-0.03em' }}>{d.getDate()}</b>
                </button>
              )
            })}
          </div>
          <div className="row between">
            <span className="mono">Jam kumpul{vote ? ' · pilih sampai 3' : ''}</span>
            <label className="row small" style={{ gap: 8 }}>Biar squad voting <button type="button" className={`toggle ${vote ? 'on' : ''}`} aria-pressed={vote} aria-label="Voting jam" onClick={() => { setVote(!vote); if (vote) setTimes(times.slice(0, 1)) }} /></label>
          </div>
          <div className="grid3" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {TIMES.map((t) => {
              const on = times.includes(t)
              const freeN = [{ avail }, ...friends].filter((f) => isFree(f.avail, day.getDay(), slotOf(atTime(day, t)))).length
              return (
                <button key={t} className={`chip ${on ? 'on' : ''}`} style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                  onClick={() => setTimes(vote ? (on ? times.filter((x) => x !== t) : times.length < 3 ? [...times, t].sort() : times) : [t])}>
                  <b style={{ fontSize: 15 }}>{t.replace(':', '.')}</b>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{freeN} free</span>
                </button>
              )
            })}
          </div>
          <label className="field"><span className="mono">Atau jam lain</span><input className="input" type="time" value={times[0] ?? ''} onChange={(e) => e.target.value && setTimes(vote ? [...new Set([e.target.value, ...times])].slice(0, 3).sort() : [e.target.value])} /></label>
          <p className="tiny muted">“free” = teman yang menandai {SLOTS[slotOf(firstT)].l.toLowerCase()} {HARI[day.getDay()]} sebagai waktu luang di <a href="#/kapan" onClick={onClose}>Kapan bisa?</a></p>
        </div>
      )}

      {step === 2 && (
        <div className="stack" style={{ gap: 14 }}>
          <div className="qtitle">Ajak<br /><span>siapa aja?</span></div>
          <div className="row between">
            <span className="mono">{inv.length} dipilih</span>
            <button className="link" onClick={() => setInv(friends.filter((f) => isFree(f.avail, day.getDay(), slotOf(firstT))).map((f) => f.id))}>Pilih semua yang free</button>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {friends.map((f) => {
              const on = inv.includes(f.id)
              const free = isFree(f.avail, day.getDay(), slotOf(firstT))
              return (
                <button key={f.id} className={`opt ${on ? 'on' : ''}`} onClick={() => setInv(on ? inv.filter((x) => x !== f.id) : [...inv, f.id])}>
                  <Avatar name={f.name} color={f.color} c={f.char} size={40} />
                  <span className="grow"><span className="b" style={{ display: 'block' }}>{f.name}</span><span className="tiny muted">{f.homeLabel} · {f.avgSpeed} km/j</span></span>
                  {free ? <span className="tag good">Free</span> : <span className="tag out">?</span>}
                  <span className="radio">{on && <Check size={12} />}</span>
                </button>
              )
            })}
          </div>
          <p className="tiny muted">Teman yang belum pakai Kayuh tetap bisa menjawab lewat link undangan — tanpa install, tanpa akun.</p>
        </div>
      )}

      {step === 3 && (
        <div className="stack" style={{ gap: 14 }}>
          <div className="qtitle">Kumpul<br /><span>di mana?</span></div>
          <div className="grid2" style={{ gap: 8 }}>
            <button className="lrow" disabled={!fair} style={{ opacity: fair ? 1 : 0.5 }} onClick={() => { if (fair) { setMeet({ name: 'Titik temu adil', pos: fair }); findSpots(fair) } }}>
              <span className="ico"><Scale size={17} /></span><span className="grow"><span className="t" style={{ display: 'block' }}>Adil</span><span className="s" style={{ display: 'block' }}>{fair ? 'buat semua' : 'ajak teman dulu'}</span></span>
            </button>
            <button className="lrow" onClick={() => { setMeet({ name: settings.homeLabel, pos: settings.home }); findSpots(settings.home) }}>
              <span className="ico"><HomeIcon size={17} /></span><span className="grow"><span className="t" style={{ display: 'block' }}>Dekat aku</span><span className="s" style={{ display: 'block' }}>{settings.homeLabel}</span></span>
            </button>
          </div>
          <BaseMap center={meet.pos} zoom={13} className="map short" onClick={(p) => setMeet({ name: meet.name, pos: p })} fit={inv.length ? [meet.pos, settings.home, ...friends.filter((f) => inv.includes(f.id)).map((f) => f.home)] : undefined}>
            <AvatarPin pos={settings.home} c={char} title="Rumahmu" size={28} />
            {friends.filter((f) => inv.includes(f.id)).map((f) => <AvatarPin key={f.id} pos={f.home} c={f.char} title={f.name} size={28} />)}
            {spots?.map((s) => <SmallPin key={s.id} pos={s.pos} onClick={() => setMeet({ name: s.name, pos: s.pos })} title={s.name} />)}
            <MeetPin pos={meet.pos} draggable onDrag={(p) => setMeet({ name: meet.name, pos: p })} />
          </BaseMap>
          <label className="field"><span className="mono">Nama titik kumpul</span><input className="input" value={meet.name} onChange={(e) => setMeet({ ...meet, name: e.target.value })} /></label>
          {!spots && <button className="btn ghost block" onClick={() => findSpots(meet.pos)} disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <Crosshair size={16} />} Cari minimarket/kafe nyata di sekitar pin</button>}
          {spots && spots.length > 0 && (
            <div className="stack" style={{ gap: 6 }}>
              {spots.slice(0, 5).map((s) => (
                <button key={s.id} className={`opt ${meet.name === s.name ? 'on' : ''}`} onClick={() => setMeet({ name: s.name, pos: s.pos })}>
                  <span className="grow"><span className="b" style={{ display: 'block' }}>{s.name}</span><span className="tiny muted">{s.kind} · {Math.round(s.dist * 1000)} m · {s.why}</span></span>
                  <span className="radio">{meet.name === s.name && <Check size={12} />}</span>
                </button>
              ))}
            </div>
          )}
          {spots && spots.length === 0 && <p className="tiny muted">Data tempat tidak terjangkau. Geser pin & tulis nama tempatnya.</p>}
        </div>
      )}

      {step === 4 && (
        <div className="stack" style={{ gap: 14 }}>
          <div className="qtitle">Ngopi<br /><span>di mana?</span></div>
          <p className="small muted">Pilih 1 tempat, atau sampai 3 biar squad voting. Tempat pertama jadi checkpoint coffee break.</p>
          {busy && !cafes && <div className="empty"><Loader2 size={18} className="spin" /> Mencari kedai kopi dekat {meet.name}…</div>}
          {cafes && cafes.length > 0 && (
            <div className="stack" style={{ gap: 6 }}>
              {cafes.slice(0, 7).map((c) => {
                const idx = coffee.findIndex((x) => x.name === c.name)
                return (
                  <button key={c.id} className={`opt ${idx >= 0 ? 'on' : ''}`} onClick={() => setCoffee(idx >= 0 ? coffee.filter((_, i) => i !== idx) : coffee.length < 3 ? [...coffee, { name: c.name, kind: c.kind, pos: c.pos, hours: c.hours }] : coffee)}>
                    <span className="ico"><Coffee size={16} /></span>
                    <span className="grow"><span className="b" style={{ display: 'block' }}>{c.name}</span><span className="tiny muted">{c.kind} · {haversine(meet.pos, c.pos).toFixed(1)} km dari kumpul{c.hours ? ' · ' + c.hours.slice(0, 22) : ''}</span></span>
                    <span className="radio">{idx >= 0 && <b style={{ fontSize: 10 }}>{idx + 1}</b>}</span>
                  </button>
                )
              })}
            </div>
          )}
          {cafes && cafes.length === 0 && <p className="tiny muted">Tidak bisa memuat kafe sekarang. Kamu bisa menambah coffee break nanti di perencana rute.</p>}
          {coffee.length > 0 && <div className="tag ink" style={{ alignSelf: 'flex-start' }}>{coffee.length > 1 ? `${coffee.length} opsi · squad voting` : `Ngopi di ${coffee[0].name}`}</div>}
          <button className="link" onClick={() => { setCoffee([]); setStep(5) }}>Lewati, tanpa ngopi</button>
        </div>
      )}

      {step === 5 && (() => {
        const g = build()
        const invited = friends.filter((f) => inv.includes(f.id))
        return (
          <div className="stack" style={{ gap: 16 }}>
            <div className="qtitle">Siap<br /><span>dikirim.</span></div>
            <div className="sticky-stack">
              <i className="under" /><i className="under u2" />
              <div className="sticky">
                <div className="row between"><span className="mono">Ajakan dari {firstName(settings.name)}</span><HeadBadge c={char} size={34} bg="#fff" ring={false} /></div>
                <div className="hand" style={{ fontSize: 30, marginTop: 8 }}>{g.title} <em>{HARI[firstT.getDay()]} {firstT.getDate()} {BULAN[firstT.getMonth()]}</em>, kumpul <em>{(g.timeOptions ?? [g.datetime]).map((t) => hhmm(new Date(t))).join(' / ')}</em></div>
                {g.note && <div className="hand" style={{ fontSize: 21, marginTop: 8, opacity: 0.8 }}>“{g.note}”</div>}
                <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
                  <span className="tag">📍 {meet.name}</span>
                  {coffee[0] && <span className="tag">☕ {coffee.length > 1 ? `${coffee.length} opsi kopi` : coffee[0].name}</span>}
                  <span className="tag">{km} km · {PACE[pace].l}</span>
                </div>
                {invited.length > 0 && <div className="row" style={{ marginTop: 12, gap: 8 }}><div className="avatars">{invited.slice(0, 6).map((f) => <Avatar key={f.id} name={f.name} color={f.color} c={f.char} size={28} />)}</div><span className="tiny">{invited.length} diajak</span></div>}
              </div>
            </div>
            <button className="btn ink block lg" onClick={() => finish('wa')}><MessageCircle size={17} /> Kirim ke WhatsApp</button>
            <div className="grid2">
              <button className="btn ghost" onClick={() => finish('share')}><Share2 size={16} /> Bagikan</button>
              <button className="btn ghost" onClick={() => finish('save')}><Check size={16} /> Simpan saja</button>
            </div>
          </div>
        )
      })()}

      {step < 5 && (
        <button className="btn ink block lg" style={{ marginTop: 22 }} disabled={!canNext} onClick={() => setStep(step + 1)}>
          Lanjut <ArrowRight size={17} />
        </button>
      )}
    </Sheet>
  )
}
