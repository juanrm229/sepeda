import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { refreshRide, useSyncStatus } from '../lib/sync'
import { Bell, CalendarPlus, Check, Clock, Coffee, Copy, MessageCircle, Navigation, Radio, Share2, Trash2, CloudRain, Thermometer, Wind, Route as RouteIcon, Users, Crown } from 'lucide-react'
import { useStore } from '../lib/store'
import type { CharConfig, GroupRide, LatLng, Rsvp } from '../lib/types'
import { etaMin, haversine, trackLength } from '../lib/geo'
import { fmtDate } from '../lib/util'
import { Avatar, confirmDialog, Sheet, toast, Top, celebrate } from '../components/UI'
import { AvatarPin, BaseMap, MeetPin, Route, SmallPin } from '../components/Map'
import { download, groupRideICS } from '../lib/ics'
import { inviteLink, inviteText, replyLink, replyText, shareOrCopy, waLink } from '../lib/share'
import { makeLoop } from '../lib/seed'
import { go } from '../lib/router'
import { useForecast } from '../lib/useForecast'
import { GroupActionCard } from '../components/GroupActions'
import { CP_KIND, gmapsDirections, timeline } from '../lib/plan'
import { notify, speak } from '../lib/notify'
import { PACE } from '../components/AjakFlow'
import { firstName, hhmm, journey, peopleOf, regroupPoints, rsvpCount, tally, weatherShift, whenText } from '../lib/meetup'
import { HeadBadge } from '../components/Character'
import { OrdersCard } from '../components/Orders'
import { ArrivalBoard, CoffeeSyncCard } from '../components/Arrival'
import { QRInvite } from '../components/QRInvite'

const RSVP_L: Record<Rsvp, string> = { ikut: 'Ikut', mungkin: 'Mungkin', tidak: 'Tidak', menunggu: 'Belum jawab' }

export default function SquadDetail({ id }: { id: string }) {
  const { groupRides, friends, settings, setMyRsvp, setMyVote, deleteGroupRide, upsertGroupRide, upsertReminder, checkin, char } = useStore()
  const g = groupRides.find((x) => x.id === id)
  const fc = useForecast(g?.meet.pos ?? settings.home)
  const [late, setLate] = useState(false)
  const [shareFrom, setShareFrom] = useState(true)
  const [replyNote, setReplyNote] = useState('')
  const [lastMsg, setLastMsg] = useState<string | null>(null)
  const auth = useStore((s) => s.auth)
  const sync = useSyncStatus()
  const [live, setLive] = useState(false)
  useEffect(() => {
    if (!auth || !g) return
    let on = true
    const run = () => refreshRide(id).then((ok) => on && setLive(!!ok))
    run(); const iv = setInterval(run, 40000)
    return () => { on = false; clearInterval(iv) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!auth])
  if (!g) return <div><Top title="Tidak ditemukan" back="squad" /><div className="empty">Ajakan ini sudah dihapus.</div></div>

  const isHost = g.host === 'me'
  const hostF = friends.find((f) => f.id === g.host)
  const hostName = isHost ? 'kamu' : hostF ? firstName(hostF.name) : g.host
  const start = new Date(g.datetime)
  const myDist = haversine(settings.home, g.meet.pos)
  const myEta = etaMin(myDist, 20)
  const leave = new Date(start.getTime() - (myEta + 10) * 60000)
  const hour = fc?.hours.find((h) => Math.abs(h.time.getTime() - start.getTime()) < 1800000)
  const link = inviteLink(g, settings.name, char, settings.pay)
  const text = inviteText(g, link)
  const people = peopleOf(g, friends, { name: settings.name, char, home: settings.home })
  const count = rsvpCount(g)
  const tl = g.plan ? timeline(g.plan) : null
  const j = journey(g)
  const vt = tally(g)
  const finishAt = tl ? tl.finish : new Date(start.getTime() + (g.distanceKm / PACE[g.pace].v) * 3600000 + 30 * 60000)
  const rideWindow = Date.now() > start.getTime() - 45 * 60000 && Date.now() < finishAt.getTime() + 3 * 3600000
  const past = Date.now() > finishAt.getTime() + 3 * 3600000
  const status = past ? 'Selesai' : j.doneIdx >= 0 ? 'Sedang jalan' : rideWindow ? 'Hampir mulai' : count.menunggu ? 'Menunggu jawaban' : 'Siap berangkat'
  const dayOf = Date.now() > start.getTime() - 4 * 3600000 && Date.now() < finishAt.getTime() + 8 * 3600000
  const shift = isHost && !past ? weatherShift(fc?.hours, start) : null
  const regroup = g.noDrop && g.plan ? regroupPoints(g.plan, 10) : []
  const rowTime = (i: number) => (i === 0 ? start : j.nodes[i].key === 'finish' ? finishAt : tl?.rows[i - 1]?.arrive ?? null)

  function leaveReminder() {
    const hh = String(leave.getHours()).padStart(2, '0'), mm = String(leave.getMinutes()).padStart(2, '0')
    upsertReminder({ id: 'gr-' + g!.id, kind: 'ride', title: `Berangkat ke ${g!.meet.name} (${g!.title})`, time: `${hh}:${mm}`, days: [leave.getDay()], enabled: true })
    toast(`Pengingat berangkat ${hh}.${mm} dipasang ⏰`)
  }

  function doCheckin(i: number) {
    const n = j.nodes[i]
    const on = !j.ck[n.key]
    checkin(g!.id, n.key, on)
    if (!on) return
    const nextN = j.nodes[i + 1]
    const nt = rowTime(i + 1)
    const msg = n.key === 'finish'
      ? `🏁 Rombongan *${g!.title}* sudah finish di ${n.name}. Terima kasih semua! 🙌`
      : `📍 Rombongan *${g!.title}* ${i === 0 ? 'sudah kumpul & berangkat dari' : 'sudah sampai di'} ${n.name} (${hhmm(new Date())}).${nextN ? ` Berikutnya: ${nextN.name}${nt ? ` ±${hhmm(nt)}` : ''}.` : ''}`
    toast(n.key === 'finish' ? '🏁 Finish!' : `✓ Check-in ${n.label}`, 'Ketuk “Kabari grup” untuk kirim status')
    if (n.key === 'finish') celebrate(0.8)
    setLastMsg(msg)
  }
  function pickWinner() {
    const next: GroupRide = { ...g! }
    if (vt.tLead >= 0 && g!.timeOptions) next.datetime = g!.timeOptions[vt.tLead]
    if (vt.cLead >= 0 && g!.coffeeOptions) {
      const c = g!.coffeeOptions[vt.cLead]
      const plan = g!.plan ?? { id: 'p-' + g!.id, name: g!.title, start: g!.meet, finish: null, speed: PACE[g!.pace].v, startTime: next.datetime, checkpoints: [] }
      const others = plan.checkpoints.filter((x) => x.kind !== 'kopi')
      next.plan = { ...plan, startTime: next.datetime, checkpoints: [{ id: 'kopi-' + g!.id, name: c.name, pos: c.pos, kind: 'kopi', stopMin: 25, place: c }, ...others], legsKm: undefined }
    }
    next.timeOptions = undefined; next.coffeeOptions = undefined
    upsertGroupRide(next)
    toast('🗳 Hasil voting ditetapkan', `${whenText(next.datetime)}${vt.cLead >= 0 && g!.coffeeOptions ? ' · ☕ ' + g!.coffeeOptions[vt.cLead].name : ''}`)
  }

  function sendReply(r: Rsvp) {
    setMyRsvp(g!.id, r)
    const rep = { rideId: g!.id, name: settings.name, rsvp: r, vote: g!.myVote, from: shareFrom ? settings.home : undefined, note: replyNote.trim() || undefined, char, at: new Date().toISOString() }
    window.open(waLink(replyText(g!, rep, replyLink(rep))), '_blank')
    toast('📨 Balasan disiapkan', `Kirim ke ${hostName} — jawabanmu otomatis masuk di HP-nya`)
  }

  const meetFit: LatLng[] = [g.meet.pos, ...people.filter((p) => p.rsvp !== 'tidak' && p.home).map((p) => p.home!)]

  return (
    <div className="fadein">
      <Top title={g.title} sub={`${whenText(g.datetime)} · ${PACE[g.pace].l}`} back="squad"
        right={<button className="iconbtn" aria-label="Bagikan undangan" onClick={async () => { const r = await shareOrCopy(g.title, text); if (r === 'copied') toast('🔗 Link undangan disalin') }}><Share2 size={18} /></button>} />

      <div className="row-d">
        <div className="stack" style={{ gap: 14 }}>
          {/* Kartu status ala pelacakan */}
          <div className="card hero" style={{ padding: 20 }}>
            <div className="row between">
              <div>
                <div className="mono">Ajakan dari {hostName}</div>
                <div className="row" style={{ gap: 8, marginTop: 6 }}><span className="big" style={{ fontSize: 22 }}>#{g.id.slice(0, 6).toUpperCase()}</span><button className="iconbtn" style={{ width: 30, height: 30, background: 'rgba(255,255,255,.1)', color: '#fff', boxShadow: 'none' }} aria-label="Salin link" onClick={() => { navigator.clipboard?.writeText(link); toast('🔗 Link disalin') }}><Copy size={13} /></button></div>
              </div>
              <span className="tag">{(j.doneIdx >= 0 && !past) || live ? <i className="live" /> : null}{status}</span>
            </div>
            <div className="stepper" style={{ marginTop: 22 }}>
              {(j.nodes.length > 5 ? [j.nodes[0], ...j.nodes.slice(1, -1).filter((n, i, a) => n.kind === 'kopi' || i === 0 || i === a.length - 1).slice(0, 3), j.nodes[j.nodes.length - 1]] : j.nodes).map((n, i) => {
                const idx = j.nodes.indexOf(n)
                const t = rowTime(idx)
                return (
                  <div key={n.key} className={`st ${idx <= j.doneIdx ? 'done' : idx === j.nowIdx && (rideWindow || j.doneIdx >= 0) ? 'now' : ''}`}>
                    {i > 0 && <span className="bar" />}
                    <span className="node">{idx <= j.doneIdx ? '✓' : ''}</span>
                    <span className="lbl">{n.label}</span>
                    <span className="tm">{t ? hhmm(t) : '—'}</span>
                  </div>
                )
              })}
            </div>
            {rideWindow && j.nowIdx < j.nodes.length && !j.ck['finish'] ? (
              <button className="btn white block" style={{ marginTop: 18 }} onClick={() => doCheckin(j.nowIdx)}><Check size={16} /> Check-in: {j.nodes[j.nowIdx].name}</button>
            ) : (
              <div className="grid2" style={{ marginTop: 18, gap: 8 }}>
                <a className="btn white" href={waLink(text)} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Ke grup WA</a>
                <button className="btn glass" onClick={() => setLate(true)}><Clock size={16} /> Telat?</button>
              </div>
            )}
            {lastMsg && <a className="btn glass block" style={{ marginTop: 8 }} href={waLink(lastMsg)} target="_blank" rel="noreferrer" onClick={() => setLastMsg(null)}><MessageCircle size={16} /> Kabari grup: status terbaru</a>}
          </div>

          {dayOf && g.myRsvp === 'ikut' && <ArrivalBoard g={g} finished={Date.now() > finishAt.getTime()} />}

          {shift && (
            <div className="card shift">
              <div className="mono">Cuaca berubah · saran geser</div>
              <div className="h2" style={{ marginTop: 6 }}>Geser ke {hhmm(shift.to.time)}?</div>
              <p className="small muted" style={{ marginTop: 4 }}>Hujan {shift.from.rain}% di jam kumpul → {shift.to.rain}% jam {hhmm(shift.to.time)} (skor {shift.to.score}).</p>
              <button className="btn ink block" style={{ marginTop: 12 }} onClick={() => {
                const d = shift.to.time.toISOString()
                upsertGroupRide({ ...g, datetime: d, plan: g.plan ? { ...g.plan, startTime: d } : g.plan })
                window.open(waLink(`☔ Update *${g.title}*: hujan ${shift.from.rain}% di jam ${hhmm(start)}, kita geser ke *${hhmm(shift.to.time)}* (hujan ${shift.to.rain}%). Titik kumpul tetap ${g.meet.name}. ${link}`), '_blank')
                toast('🌤 Jadwal digeser', `Kumpul ${hhmm(shift.to.time)} · kabar dikirim ke grup`)
              }}>Geser & kabari grup</button>
            </div>
          )}

          {/* RSVP */}
          <div className="card">
            <div className="card-h"><span className="mono">Kamu ikut?</span><span className="small muted">{count.ikut} ikut · {count.menunggu} belum jawab</span></div>
            <div className="tabs">
              <i className="tabs-ind" style={{ width: 'calc((100% - 8px) / 3)', transform: `translateX(${Math.max(0, ['ikut', 'mungkin', 'tidak'].indexOf(g.myRsvp)) * 100}%)`, opacity: g.myRsvp === 'menunggu' ? 0 : 1 }} />
              {(['ikut', 'mungkin', 'tidak'] as Rsvp[]).map((r) => <button key={r} className={g.myRsvp === r ? 'on' : ''} onClick={() => { setMyRsvp(g.id, r); toast(r === 'ikut' ? 'Sip, sampai ketemu! 🚲' : 'RSVP diperbarui') }}>{RSVP_L[r]}</button>)}
            </div>
            {!isHost && g.remote && auth && (
              <div className="row" style={{ marginTop: 12, gap: 8 }}><span className="tag good"><Check size={12} /> {g.myRsvp === 'menunggu' ? 'Pilih jawaban — langsung terkirim' : sync === 'saving' ? 'Mengirim…' : `Terkirim ke ${hostName}`}</span><span className="tiny muted">tanpa WhatsApp</span></div>
            )}
            {!isHost && !(g.remote && auth) && (
              <div className="stack" style={{ marginTop: 14, gap: 10 }}>
                <div className="divider" style={{ margin: 0 }} />
                <div className="b">Kabari {hostName}</div>
                <p className="tiny muted">Balasanmu dikirim lewat WhatsApp berisi link. Saat {hostName} mengetuknya, RSVP, vote & karaktermu otomatis masuk ke daftar peserta — tanpa server.</p>
                <input className="input" placeholder="Pesan singkat (opsional)" maxLength={120} value={replyNote} onChange={(e) => setReplyNote(e.target.value)} />
                <label className="row between small"><span>Bagikan perkiraan titik berangkat (±1 km) untuk titik temu adil</span><button type="button" className={`toggle ${shareFrom ? 'on' : ''}`} aria-pressed={shareFrom} aria-label="Bagikan titik berangkat" onClick={() => setShareFrom(!shareFrom)} /></label>
                <button className="btn ink block" onClick={() => sendReply(g.myRsvp === 'menunggu' ? 'ikut' : g.myRsvp)}><MessageCircle size={16} /> Kirim jawaban “{RSVP_L[g.myRsvp === 'menunggu' ? 'ikut' : g.myRsvp]}” ke {hostName}</button>
              </div>
            )}
          </div>

          {/* Voting */}
          {(g.timeOptions?.length || g.coffeeOptions?.length) ? (
            <div className="card">
              <div className="card-h"><div><div className="mono">Voting squad · {vt.voters} suara</div><div className="b" style={{ marginTop: 2 }}>Pilih yang paling pas</div></div>{isHost && <button className="btn ink sm" onClick={pickWinner}><Crown size={14} /> Tetapkan</button>}</div>
              {g.timeOptions && g.timeOptions.length > 1 && (
                <div className="stack" style={{ gap: 8 }}>
                  <span className="mono">Jam kumpul</span>
                  {g.timeOptions.map((t, i) => {
                    const n = vt.t[i] ?? 0, max = Math.max(1, ...vt.t)
                    const on = g.myVote?.t === i
                    return (
                      <button key={t} className={`opt ${on ? 'on' : ''}`} onClick={() => setMyVote(g.id, { t: i })}>
                        <i className="fill" style={{ width: `${(n / max) * 100}%` }} />
                        <span className="radio">{on && <Check size={12} />}</span>
                        <span className="grow"><span className="b">{hhmm(new Date(t))}</span> <span className="small muted">{fmtDate(t)}</span></span>
                        <span className="b">{n}</span>{i === vt.tLead && n > 0 && <Crown size={14} />}
                      </button>
                    )
                  })}
                </div>
              )}
              {g.coffeeOptions && g.coffeeOptions.length > 0 && (
                <div className="stack" style={{ gap: 8, marginTop: g.timeOptions && g.timeOptions.length > 1 ? 16 : 0 }}>
                  <span className="mono">Ngopi di</span>
                  {g.coffeeOptions.map((c, i) => {
                    const n = vt.c[i] ?? 0, max = Math.max(1, ...vt.c)
                    const on = g.myVote?.c === i
                    return (
                      <button key={c.name + i} className={`opt ${on ? 'on' : ''}`} onClick={() => setMyVote(g.id, { c: i })}>
                        <i className="fill" style={{ width: `${(n / max) * 100}%` }} />
                        <span className="radio">{on && <Check size={12} />}</span>
                        <span className="grow"><span className="b">☕ {c.name}</span> <span className="small muted">{c.kind}</span></span>
                        <span className="b">{n}</span>{i === vt.cLead && n > 0 && <Crown size={14} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}

          {(g.plan?.checkpoints.some((c) => c.kind === 'kopi' || c.kind === 'makan') || g.coffeeOptions?.length || g.orders?.length) ? <OrdersCard g={g} /> : null}

          {g.plan && <CoffeeSyncCard g={g} />}

          {/* Timeline perjalanan */}
          <div className="card">
            <div className="card-h">
              <div><div className="mono">Perjalanan · checkpoint</div><div className="b" style={{ marginTop: 2 }}>{g.plan?.checkpoints.length ? `${g.plan.checkpoints.length} checkpoint${tl ? ` · ±${tl.totalKm.toFixed(0)} km` : ''}` : 'Belum ada checkpoint'}</div></div>
              <button className="btn sm" onClick={() => go('rute/g/' + g.id)}><Coffee size={14} /> {g.plan?.checkpoints.length ? 'Atur' : 'Tambah'}</button>
            </div>
            <div className="vtl">
              {j.nodes.map((n, i) => {
                const t = rowTime(i)
                const cp = g.plan?.checkpoints.find((c) => c.id === n.key)
                const row = tl?.rows.find((r) => r.c.id === n.key)
                const done = i <= j.doneIdx
                return (
                  <div key={n.key} className={`vtl-row ${done ? 'done' : i === j.nowIdx && j.doneIdx >= 0 ? 'now' : ''}`}>
                    <div className="vtl-time">{t ? <><b>{hhmm(t)}</b><small>{j.ck[n.key] ? 'tiba ' + hhmm(new Date(j.ck[n.key])) : ''}</small></> : <small>—</small>}</div>
                    <div className="vtl-rail"><span className="n">{done ? '✓' : ''}</span><span className="ln" /></div>
                    <div className="vtl-body">
                      <div className="row between" style={{ alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0 }}>
                          <div className="t">{cp ? CP_KIND[cp.kind].emoji + ' ' : n.key === 'start' ? '🟢 ' : '🏁 '}{n.name}</div>
                          <div className="s">{cp ? `${CP_KIND[cp.kind].l} · ${cp.stopMin} mnt${row ? ` · km ${row.km.toFixed(1)}` : ''}` : n.key === 'start' ? 'Titik kumpul' : 'Selesai'}</div>
                        </div>
                        {(rideWindow || done) && <button className={`btn sm ${done ? '' : 'ghost'}`} style={{ padding: '6px 10px', flexShrink: 0 }} onClick={() => doCheckin(i)} aria-pressed={done}>{done ? '✓' : 'Check-in'}</button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {regroup.length > 0 && (
              <div style={{ margin: '4px 0 10px' }}>
                <div className="mono" style={{ marginBottom: 8 }}>No-drop · titik kumpul ulang tiap 10 km</div>
                <div className="chips">{regroup.map((r) => <a key={r.km} className="chip" href={`https://maps.google.com/?q=${r.pos[0].toFixed(5)},${r.pos[1].toFixed(5)}`} target="_blank" rel="noreferrer">⏸ km {r.km}</a>)}</div>
              </div>
            )}
            {g.plan && <a className="btn ghost block" style={{ marginTop: 6 }} href={gmapsDirections(g.plan)} target="_blank" rel="noreferrer"><Navigation size={16} /> Buka rute di Google Maps</a>}
          </div>

          <BaseMap center={g.meet.pos} zoom={12} className="map" fit={meetFit}>
            {people.filter((p) => p.rsvp !== 'tidak' && p.home).map((p) => (
              <Fragment key={p.id}>
                <Route track={[p.home!, g.meet.pos]} color="#0d0d0d" weight={1.5} dash="2 6" />
                {p.char && <AvatarPin pos={p.home!} c={p.char} title={`Berangkat: ${p.name}`} size={32} />}
              </Fragment>
            ))}
            {g.plan && <Route track={g.plan.geometry ?? [g.plan.start.pos, ...g.plan.checkpoints.map((c) => c.pos), (g.plan.finish ?? g.plan.start).pos]} color="#0d0d0d" weight={3.5} />}
            {g.plan?.checkpoints.map((c) => <SmallPin key={c.id} pos={c.place?.pos ?? c.pos} color="#d2441c" title={c.name} />)}
            {regroup.map((r) => <SmallPin key={'rg' + r.km} pos={r.pos} color="#9a9a93" title={`Titik kumpul ulang km ${r.km}`} />)}
            <MeetPin pos={g.meet.pos} />
          </BaseMap>
        </div>

        <div className="stack" style={{ marginTop: 0, gap: 14 }}>
          {/* Berangkat */}
          <div className="card">
            <div className="row between">
              <div>
                <div className="mono">Kamu harus berangkat</div>
                <div className="big" style={{ fontSize: 40, marginTop: 8 }}>{hhmm(leave)}</div>
                <div className="small muted" style={{ marginTop: 6 }}>{myDist.toFixed(1)} km · ±{myEta} mnt gowes + 10 mnt buffer</div>
              </div>
              <button className="btn ink sm" onClick={leaveReminder}><Bell size={14} /> Ingatkan</button>
            </div>
            {hour && (
              <div className="grid3" style={{ marginTop: 16, gap: 8 }}>
                <div className="stat"><Thermometer size={14} /><div className="big" style={{ fontSize: 20 }}>{Math.round(hour.temp)}°</div><div className="s">saat kumpul</div></div>
                <div className="stat"><CloudRain size={14} /><div className="big" style={{ fontSize: 20 }}>{hour.rain}%</div><div className="s">hujan</div></div>
                <div className="stat"><Wind size={14} /><div className="big" style={{ fontSize: 20 }}>{Math.round(hour.wind)}</div><div className="s">km/j angin</div></div>
              </div>
            )}
            {hour && hour.rain > 50 && <p className="small" style={{ marginTop: 10 }}>☔ Peluang hujan tinggi — pertimbangkan majukan jam atau bawa jas hujan.</p>}
          </div>

          {/* Peserta */}
          <div className="card">
            <div className="card-h"><div><div className="mono">Peserta</div><div className="b" style={{ marginTop: 2 }}>{count.ikut} ikut · {count.mungkin} mungkin</div></div><Users size={18} /></div>
            <div className="list">
              {people.map((p) => {
                const d = p.home ? haversine(p.home, g.meet.pos) : null
                return (
                  <div key={p.id} className="li" style={{ alignItems: 'flex-start' }}>
                    <Avatar name={p.name} color={p.color} c={p.char} size={38} />
                    <div className="grow">
                      <div className="t">{p.me ? 'Kamu' : p.name}{p.id === g.host || (p.me && isHost) ? <span className="tag" style={{ marginLeft: 6 }}>host</span> : null}</div>
                      <div className="tiny muted">{d != null ? `${d.toFixed(1)} km · ±${etaMin(d, p.spd * 0.8)} mnt ke kumpul` : 'Lokasi berangkat belum dibagikan'}{p.vote?.t != null && g.timeOptions?.[p.vote.t] ? ` · vote ${hhmm(new Date(g.timeOptions[p.vote.t]))}` : ''}</div>
                      {p.note && <div className="hand" style={{ fontSize: 18, marginTop: 2 }}>“{p.note}”</div>}
                    </div>
                    <span className={`tag ${p.rsvp === 'ikut' ? 'good' : p.rsvp === 'tidak' ? 'bad' : p.rsvp === 'mungkin' ? 'warn' : 'out'}`}>{RSVP_L[p.rsvp]}</span>
                  </div>
                )
              })}
            </div>
            {isHost && count.menunggu > 0 && <a className="btn ghost block" style={{ marginTop: 10 }} href={waLink(`⏰ Halo! Jangan lupa jawab ajakan *${g.title}* (${whenText(g.datetime)}) ya. Cuma 10 detik: ${link}`)} target="_blank" rel="noreferrer"><Bell size={15} /> Colek yang belum jawab ({count.menunggu})</a>}
          </div>

          {/* Undang & simpan */}
          <div className="card">
            <div className="mono" style={{ marginBottom: 12 }}>Bagikan & simpan</div>
            <div className="stack" style={{ gap: 8 }}>
              <a className="btn ink" href={waLink(text)} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Kirim undangan ke grup WhatsApp</a>
              <div className="grid2">
                <button className="btn ghost" onClick={() => { download(`${g.title}.ics`, groupRideICS(g)); toast('Ditambahkan ke kalender', 'Alarm H-12 jam & H-1 jam') }}><CalendarPlus size={16} /> Kalender</button>
                <a className="btn ghost" href={`https://www.google.com/maps/dir/?api=1&destination=${g.meet.pos[0]},${g.meet.pos[1]}&travelmode=bicycling`} target="_blank" rel="noreferrer"><Navigation size={16} /> Ke kumpul</a>
              </div>
              <div className="grid2">
                <a className="btn ghost" href={waLink(familyText(g, rowTime, j))} target="_blank" rel="noreferrer"><RouteIcon size={16} /> Untuk keluarga</a>
                <QRInvite link={link} title={g.title} />
              </div>
            </div>
          </div>

          <LiveSquad g={g} />

          {isHost && (
            <button className="btn ghost" style={{ color: 'var(--bad)' }} onClick={async () => { if (await confirmDialog('Hapus ajakan ini?', { body: 'Undangan yang sudah terkirim tidak ikut terhapus di HP teman.', ok: 'Hapus', danger: true })) { deleteGroupRide(g.id); toast('🗑️ Ajakan dihapus'); go('squad') } }}><Trash2 size={16} /> Hapus ajakan</button>
          )}
        </div>
      </div>

      <Sheet open={late} onClose={() => setLate(false)} title="Kabari squad">
        <GroupActionCard g={g} />
      </Sheet>
    </div>
  )
}

function familyText(g: GroupRide, rowTime: (i: number) => Date | null, j: ReturnType<typeof journey>) {
  const lines = j.nodes.map((n, i) => { const t = rowTime(i); return `${n.key === 'start' ? '🟢' : n.key === 'finish' ? '🏁' : '📍'} ${t ? hhmm(t) : '--.--'} ${n.name}` })
  return `🚲 Aku gowes *${g.title}* ${whenText(g.datetime)} bareng squad.\n\nPerkiraan jadwal:\n${lines.join('\n')}\n\nKalau ada apa-apa aku kabari dari checkpoint. 🙏`
}

/** Simulasi radar squad: posisi tiap anggota di rute + peringatan no-drop. */
function LiveSquad({ g }: { g: GroupRide }) {
  const { friends, settings, char: myChar } = useStore()
  const [on, setOn] = useState(false)
  const [t, setT] = useState(0)
  const [alert, setAlert] = useState<string | null>(null)
  const alerted = useRef<Set<string>>(new Set())
  const route = useMemo(() => makeLoop(g.meet.pos, Math.min(g.distanceKm, 40), () => 0.5, 300), [g])
  const total = useMemo(() => trackLength(route), [route])
  const members = useMemo(() => [
    { id: 'me', name: settings.name, k: 1, c: myChar as CharConfig | undefined },
    ...g.participants.filter((p) => p.rsvp !== 'tidak').map((p, i) => { const f = friends.find((x) => x.id === p.friendId); return { id: p.friendId, name: f?.name ?? p.name ?? 'Tamu', k: i === g.participants.length - 1 ? 0.86 : 0.97 + ((i * 7) % 6) / 100, c: p.char ?? f?.char } }),
  ], [g, friends, settings.name, myChar])

  useEffect(() => {
    if (!on) return
    const iv = window.setInterval(() => setT((x) => x + 1), 300)
    return () => clearInterval(iv)
  }, [on])

  const posAt = (frac: number): LatLng => route[Math.min(route.length - 1, Math.max(0, Math.floor(frac * (route.length - 1))))]
  const fracs = members.map((m) => Math.min(1, (t / 260) * m.k))
  const lead = Math.max(...fracs)

  useEffect(() => {
    if (!on || !g.noDrop) return
    members.forEach((m, i) => {
      const gapKm = (lead - fracs[i]) * total
      if (gapKm > 0.6 && !alerted.current.has(m.id)) {
        alerted.current.add(m.id)
        const msg = `${firstName(m.name)} tertinggal ${Math.round(gapKm * 1000)} m — rombongan pelankan / tunggu di titik aman`
        setAlert(msg); notify('No-drop alert', msg); speak(msg)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  return (
    <div className="card">
      <div className="card-h">
        <div><div className="mono">Radar squad · demo</div><div className="b" style={{ marginTop: 2 }}>Lihat posisi rombongan</div></div>
        <button className="btn sm ink" onClick={() => { setOn(!on); if (!on) { setT(0); alerted.current.clear(); setAlert(null) } }}><Radio size={14} /> {on ? 'Stop' : 'Simulasikan'}</button>
      </div>
      {on && (
        <>
          <BaseMap center={g.meet.pos} zoom={13} className="map short" fit={route}>
            <Route track={route} color="#9a9a93" weight={3} />
            {members.map((m, i) => m.c && <AvatarPin key={m.id} pos={posAt(fracs[i])} c={m.c} title={m.name} ring={m.id === 'me' ? '#0d0d0d' : '#fff'} size={30} />)}
          </BaseMap>
          <div className="stack" style={{ gap: 8, marginTop: 12 }}>
            {members.map((m, i) => (
              <div key={m.id} className="row small" style={{ gap: 8 }}>
                {m.c && <HeadBadge c={m.c} size={22} />}
                <span style={{ flex: 1 }}>{firstName(m.name)}</span>
                <span className="mono">{(fracs[i] * total).toFixed(1)} km · {lead - fracs[i] < 0.005 ? 'depan' : `-${Math.round((lead - fracs[i]) * total * 1000)} m`}</span>
              </div>
            ))}
          </div>
          {alert && <div className="card well small" style={{ marginTop: 12, padding: 12 }}>⚠ {alert}</div>}
        </>
      )}
      <p className="tiny muted" style={{ marginTop: 10 }}>Posisi real-time antar-HP butuh server sinkron (ada di roadmap).</p>
    </div>
  )
}
