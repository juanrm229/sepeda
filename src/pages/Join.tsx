import { useState } from 'react'
import { Check, MessageCircle } from 'lucide-react'
import { useStore } from '../lib/store'
import { parseInvite, replyLink, replyText, waLink } from '../lib/share'
import { fmtDate, HARI, BULAN } from '../lib/util'
import { celebrate, toast, Top } from '../components/UI'
import { BaseMap, MeetPin, Route, SmallPin } from '../components/Map'
import { HeadBadge } from '../components/Character'
import { CP_KIND } from '../lib/plan'
import { PACE } from '../components/AjakFlow'
import { go } from '../lib/router'
import { firstName, hhmm } from '../lib/meetup'
import type { Rsvp, Vote } from '../lib/types'
import { QUICK_ITEMS } from '../lib/money'
import { api } from '../lib/api'
import { refreshRide } from '../lib/sync'
import { PayCard } from '../components/PayAccounts'

export default function Join({ code }: { code: string }) {
  const { upsertGroupRide, groupRides, settings, char, onboarded, finishOnboarding, updateSettings } = useStore()
  const g = parseInvite(code)
  const existing = g ? groupRides.find((x) => x.id === g.id) : undefined
  const [vote, setVote] = useState<Vote>(existing?.myVote ?? { t: g?.timeOptions ? 0 : undefined, c: g?.coffeeOptions?.length ? 0 : undefined })
  const [answer, setAnswer] = useState<Rsvp | null>(existing && existing.myRsvp !== 'menunggu' ? existing.myRsvp : null)
  const [name, setName] = useState(onboarded ? settings.name : '')
  const [note, setNote] = useState('')
  const [shareFrom, setShareFrom] = useState(onboarded)
  const [item, setItem] = useState('')
  const [itemNote, setItemNote] = useState('')
  const [sent, setSent] = useState<'idle' | 'busy' | 'ok' | 'no'>('idle')
  if (!g) return <div><Top title="Undangan tidak valid" back="" /><div className="empty">Link undangan rusak atau terpotong. Minta kirim ulang ya.</div></div>

  const d = new Date(g.datetime)
  const host = firstName(g.host)
  if (existing?.host === 'me') return (
    <div><Top title="Ini ajakanmu sendiri" back="" />
      <div className="card"><p className="small">Link ini untuk teman-temanmu. Buka detailnya untuk melihat siapa yang sudah menjawab.</p><button className="btn ink block" style={{ marginTop: 14 }} onClick={() => go('squad/' + existing.id)}>Lihat ajakan</button></div>
    </div>
  )

  function pick(r: Rsvp) {
    if (!onboarded) { finishOnboarding(false); if (name.trim()) updateSettings({ name: name.trim() }) }
    upsertGroupRide({ ...(existing ?? g!), myRsvp: r, myVote: vote })
    setAnswer(r)
    setSent('busy')
    const nm = (name.trim() || useStore.getState().settings.name)
    api.reply(g!.id, { name: nm, rsvp: r, vote, char, note: note.trim() || undefined, from: shareFrom && onboarded ? settings.home.map((x) => +x.toFixed(2)) : undefined, order: item.trim() && r !== 'tidak' ? { item: item.trim(), note: itemNote.trim() || undefined, price: QUICK_ITEMS.find((q) => q.item === item.trim())?.price } : undefined })
      .then(() => { setSent('ok'); if (useStore.getState().auth) refreshRide(g!.id) }).catch(() => setSent('no'))
    if (r === 'ikut') celebrate(0.7)
  }
  function send() {
    const rep = { rideId: g!.id, name: (name.trim() || settings.name), rsvp: answer!, vote, from: shareFrom && onboarded ? settings.home : undefined, note: note.trim() || undefined, char, at: new Date().toISOString(), order: item.trim() && answer !== 'tidak' ? { item: item.trim(), note: itemNote.trim() || undefined, price: QUICK_ITEMS.find((q) => q.item === item.trim())?.price } : undefined }
    window.open(waLink(replyText(g!, rep, replyLink(rep))), '_blank')
    toast('📨 Balasan siap dikirim', `Pilih chat ${host} di WhatsApp`)
  }

  return (
    <div className="fadein">
      <Top title="Kamu diajak gowes" sub={`dari ${host}`} back="" />

      <div className="sticky-stack">
        <i className="under" /><i className="under u2" />
        <div className="sticky">
          <div className="row between">
            <span className="row" style={{ gap: 8 }}>{g.hostChar && <HeadBadge c={g.hostChar} size={36} bg="#fff" ring={false} />}<span className="mono">{host} mengajak</span></span>
            <span className="mono">{HARI[d.getDay()]} {d.getDate()} {BULAN[d.getMonth()]}</span>
          </div>
          <div className="hand" style={{ fontSize: 32, marginTop: 10 }}>{g.note ?? `${g.title}, yuk!`}</div>
          <div className="hand" style={{ fontSize: 23, marginTop: 6, opacity: 0.8 }}><em>{g.title}</em> · kumpul <em>{(g.timeOptions ?? [g.datetime]).map((t) => hhmm(new Date(t))).join(' / ')}</em></div>
          <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
            <span className="tag">📍 {g.meet.name}</span><span className="tag">{g.distanceKm} km</span><span className="tag">{PACE[g.pace]?.l}</span>{g.noDrop && <span className="tag">No-drop</span>}
          </div>
        </div>
      </div>

      {g.timeOptions && g.timeOptions.length > 1 && (
        <div className="card section">
          <div className="mono" style={{ marginBottom: 10 }}>Kamu bisanya jam berapa?</div>
          <div className="stack" style={{ gap: 8 }}>
            {g.timeOptions.map((t, i) => (
              <button key={t} className={`opt ${vote.t === i ? 'on' : ''}`} onClick={() => setVote({ ...vote, t: i })}>
                <span className="radio">{vote.t === i && <Check size={12} />}</span>
                <span className="grow"><span className="b">{hhmm(new Date(t))}</span> <span className="small muted">{fmtDate(t)}</span></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {g.coffeeOptions && g.coffeeOptions.length > 0 && (
        <div className="card section" style={{ marginTop: 12 }}>
          <div className="mono" style={{ marginBottom: 10 }}>Ngopi di mana?</div>
          <div className="stack" style={{ gap: 8 }}>
            {g.coffeeOptions.map((c, i) => (
              <button key={c.name + i} className={`opt ${vote.c === i ? 'on' : ''}`} onClick={() => setVote({ ...vote, c: i })}>
                <span className="radio">{vote.c === i && <Check size={12} />}</span>
                <span className="grow"><span className="b">☕ {c.name}</span> <span className="small muted">{c.kind}</span></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(g.coffeeOptions?.length || g.plan?.checkpoints.some((c) => c.kind === 'kopi' || c.kind === 'makan')) && (
        <div className="card section" style={{ marginTop: 12 }}>
          <div className="mono" style={{ marginBottom: 4 }}>Mau nitip apa? (opsional)</div>
          <p className="tiny muted" style={{ marginBottom: 10 }}>{host} yang pesankan semua di tempat ngopi. Titipanmu ikut di jawaban.</p>
          <div className="chips">{QUICK_ITEMS.slice(0, 7).map((q) => <button key={q.item} className={`chip ${item === q.item ? 'on' : ''}`} onClick={() => setItem(item === q.item ? '' : q.item)}>{q.item}</button>)}</div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <input className="input" placeholder="Pesanan lain…" value={item} maxLength={60} onChange={(e) => setItem(e.target.value)} />
            <input className="input" placeholder="Catatan (less sugar…)" value={itemNote} maxLength={80} onChange={(e) => setItemNote(e.target.value)} />
          </div>
        </div>
      )}

      {g.plan && g.plan.checkpoints.length > 0 && (
        <div className="card section" style={{ marginTop: 12 }}>
          <div className="mono" style={{ marginBottom: 12 }}>Rute · {g.plan.checkpoints.length} checkpoint</div>
          <div className="vtl">
            {[{ id: 's', name: g.meet.name, e: '🟢', s: 'Kumpul ' + hhmm(d) }, ...g.plan.checkpoints.map((c) => ({ id: c.id, name: c.name, e: CP_KIND[c.kind]?.emoji ?? '📍', s: `${CP_KIND[c.kind]?.l ?? ''} · ${c.stopMin} mnt` }))].map((r) => (
              <div key={r.id} className="vtl-row" style={{ gridTemplateColumns: '26px 1fr', minHeight: 48 }}>
                <div className="vtl-rail"><span className="n" /><span className="ln" /></div>
                <div className="vtl-body"><div className="t">{r.e} {r.name}</div><div className="s">{r.s}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section" style={{ marginTop: 12 }}>
        <BaseMap center={g.meet.pos} zoom={13} className="map short" fit={g.plan ? [g.meet.pos, ...g.plan.checkpoints.map((c) => c.pos)] : undefined}>
          {g.plan && <Route track={[g.meet.pos, ...g.plan.checkpoints.map((c) => c.pos), (g.plan.finish ?? g.plan.start).pos]} color="#0d0d0d" weight={3} dash="6 8" />}
          {g.plan?.checkpoints.map((c) => <SmallPin key={c.id} pos={c.pos} color="#d2441c" title={c.name} />)}
          <MeetPin pos={g.meet.pos} />
        </BaseMap>
      </div>

      {!answer ? (
        <div className="card section">
          {!onboarded && <label className="field" style={{ marginBottom: 14 }}><span className="mono">Nama kamu (supaya {host} tahu)</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Salsa" /></label>}
          <div className="mono" style={{ marginBottom: 10 }}>Kamu ikut?</div>
          <div className="grid3" style={{ gridTemplateColumns: '1.5fr 1fr 1fr' }}>
            <button className="btn ink lg" disabled={!onboarded && !name.trim()} onClick={() => pick('ikut')}>Ikut!</button>
            <button className="btn ghost" disabled={!onboarded && !name.trim()} onClick={() => pick('mungkin')}>Mungkin</button>
            <button className="btn ghost" disabled={!onboarded && !name.trim()} onClick={() => pick('tidak')}>Nggak</button>
          </div>
        </div>
      ) : (
        <div className="card section">
          <div className="row" style={{ gap: 12 }}>
            <span className="ico round ink"><Check size={18} /></span>
            <div><div className="b">Jawabanmu: {answer === 'ikut' ? 'Ikut' : answer === 'mungkin' ? 'Mungkin' : 'Tidak ikut'}</div><div className="tiny muted">Tersimpan di Agenda. Sekarang kabari {host}.</div></div>
          </div>
          <input className="input" style={{ marginTop: 14 }} placeholder="Pesan singkat (opsional)" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
          {onboarded && <label className="row between small" style={{ marginTop: 12 }}><span>Bagikan perkiraan titik berangkat (±1 km) untuk titik temu adil</span><button type="button" className={`toggle ${shareFrom ? 'on' : ''}`} aria-pressed={shareFrom} aria-label="Bagikan titik berangkat" onClick={() => setShareFrom(!shareFrom)} /></label>}
          {item.trim() && answer !== 'tidak' && <div className="tag" style={{ marginTop: 12 }}>🧾 Nitip: {item}{itemNote ? ` · ${itemNote}` : ''}</div>}
          {sent === 'ok' ? (
            <div className="card well" style={{ marginTop: 14, padding: 14 }}><div className="row" style={{ gap: 10 }}><span className="ico round ink"><Check size={16} /></span><div><div className="b">Terkirim langsung ke {host}</div><div className="tiny muted">Muncul di daftar pesertanya. Nggak perlu kirim WA.</div></div></div></div>
          ) : (
            <button className="btn ink block lg" style={{ marginTop: 14 }} onClick={send} disabled={sent === 'busy'}><MessageCircle size={17} /> Kirim jawaban ke {host}</button>
          )}
          {sent === 'ok' && <button className="link" style={{ marginTop: 8 }} onClick={send}>Kabari juga lewat WhatsApp</button>}
          {g.hostPay?.length ? <div className="stack" style={{ gap: 6, marginTop: 14 }}><span className="mono">Rekening {host} untuk patungan</span>{g.hostPay.map((a) => <PayCard key={a.id} a={a} />)}</div> : null}
          <div className="grid2" style={{ marginTop: 8 }}>
            <button className="btn ghost" onClick={() => setAnswer(null)}>Ubah jawaban</button>
            <button className="btn ghost" onClick={() => go('squad/' + g.id)}>Lihat ajakan</button>
          </div>
        </div>
      )}
      <p className="tiny muted" style={{ marginTop: 12, textAlign: 'center' }}>PACK menyimpan semuanya di HP-mu. Tanpa akun, tanpa server.</p>
    </div>
  )
}
