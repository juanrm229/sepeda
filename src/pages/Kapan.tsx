import { useMemo, useState } from 'react'
import { MessageCircle, Plus, Sparkles } from 'lucide-react'
import { useStore } from '../lib/store'
import { Avatar, Top, toast } from '../components/UI'
import { HeadBadge } from '../components/Character'
import { openAjak } from '../components/AjakFlow'
import { bit, firstName, hhmm, isFree, SLOTS, squadSlots } from '../lib/meetup'
import { useForecast } from '../lib/useForecast'
import { HARI, HARI_PANJANG } from '../lib/util'
import { waLink } from '../lib/share'

const ORDER = [1, 2, 3, 4, 5, 6, 0] // tampil Senin dulu

/** "Kapan semua bisa?" — waktu luang squad × cuaca → slot emas. */
export default function Kapan() {
  const { avail, setAvail, friends, char, settings } = useStore()
  const fc = useForecast(settings.home)
  const [sel, setSel] = useState<string[]>(['me', ...friends.map((f) => f.id)])
  const members = [{ id: 'me', avail, name: 'Kamu', c: char }, ...friends.map((f) => ({ id: f.id, avail: f.avail, name: f.name, c: f.char }))].filter((m) => sel.includes(m.id))
  const slots = useMemo(() => squadSlots(members, fc?.hours), [members, fc]) // eslint-disable-line react-hooks/exhaustive-deps
  const top = slots.slice(0, 3)
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d })
  const max = Math.max(1, members.length)

  const mine = ORDER.flatMap((d) => [0, 1, 2].filter((s) => isFree(avail, d, s)).map((s) => `${HARI[d]} ${SLOTS[s].l.toLowerCase()}`))

  return (
    <div className="fadein">
      <Top title="Kapan semua bisa?" sub="Cocokkan jadwal" back />

      <p className="sentence" style={{ fontSize: 22 }}>
        {top[0] ? <>Paling pas: <b>{HARI_PANJANG[top[0].date.getDay()]} {SLOTS[top[0].slot].l.toLowerCase()}, {hhmm(top[0].date)}</b>. <b>{top[0].free.length} dari {members.length}</b> orang free{top[0].score != null ? <>, cuaca <b>{top[0].score}/100</b></> : null}.</> : 'Tandai waktu luangmu dulu.'}
      </p>

      {/* Slot terbaik */}
      <div className="stack section" style={{ gap: 8 }}>
        {top.map((s, i) => (
          <div key={s.date.toISOString()} className={`card ${i === 0 ? 'hero' : ''}`} style={{ padding: 16 }}>
            <div className="row between">
              <div style={{ minWidth: 0 }}>
                <div className="mono">{i === 0 ? '✦ Slot emas' : `Alternatif ${i}`}</div>
                <div className="h2" style={{ marginTop: 4 }}>{HARI_PANJANG[s.date.getDay()]} {s.date.getDate()} · {SLOTS[s.slot].l} {hhmm(s.date)}</div>
                <div className="small muted" style={{ marginTop: 2 }}>{s.free.length}/{members.length} free{s.score != null ? ` · cuaca ${s.score}` : ' · cuaca belum tersedia'}</div>
              </div>
              <button className={`btn sm ${i === 0 ? 'white' : 'ink'}`} onClick={() => openAjak({ datetime: s.date.toISOString(), participants: s.free.filter((x) => x !== 'me').map((id) => ({ friendId: id, rsvp: 'menunggu' as const })) })}><Plus size={14} /> Ajak</button>
            </div>
            <div className="avatars" style={{ marginTop: 12 }}>
              {s.free.map((id) => { const m = members.find((x) => x.id === id); return m ? <HeadBadge key={id} c={m.c} size={30} ring /> : null })}
            </div>
          </div>
        ))}
      </div>

      {/* Peta panas squad */}
      <div className="card section">
        <div className="card-h"><div><div className="mono">7 hari ke depan</div><div className="b" style={{ marginTop: 2 }}>Siapa free kapan</div></div><Sparkles size={16} /></div>
        <div className="pillgrid">
          <div className="pg-row"><span />{days.map((d) => <span key={d.toISOString()} className="pg-h">{HARI[d.getDay()]}<br />{d.getDate()}</span>)}</div>
          {SLOTS.map((sl, si) => (
            <div key={sl.l} className="pg-row">
              <span className="pg-l">{sl.l}</span>
              {days.map((d) => {
                const date = new Date(d); date.setHours(sl.h, sl.m)
                const n = members.filter((m) => isFree(m.avail, d.getDay(), si)).length
                const isBest = top[0] && top[0].date.getTime() === date.getTime()
                const pastSlot = date.getTime() < Date.now()
                return <span key={d.toISOString()} className={`pg heat ${isBest ? 'best' : ''}`} title={`${n} free`} style={{ background: n ? `color-mix(in srgb, var(--ink) ${Math.round(18 + (n / max) * 82)}%, var(--surface-2))` : 'var(--surface-2)', color: n / max > 0.45 ? 'var(--bg)' : 'var(--ink)', opacity: pastSlot ? 0.35 : 1 }}>{n || ''}</span>
              })}
            </div>
          ))}
        </div>
        <div className="chips" style={{ marginTop: 16 }}>
          {[{ id: 'me', name: 'Kamu', c: char, color: '#111' }, ...friends.map((f) => ({ id: f.id, name: f.name, c: f.char, color: f.color }))].map((p) => (
            <button key={p.id} className={`chip ${sel.includes(p.id) ? 'on' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: 5 }} onClick={() => setSel(sel.includes(p.id) ? sel.filter((x) => x !== p.id) : [...sel, p.id])}>
              <Avatar name={p.name} color={p.color} c={p.c} size={22} />{firstName(p.name)}
            </button>
          ))}
        </div>
      </div>

      {/* Waktu luangku */}
      <div className="card section">
        <div className="card-h"><div><div className="mono">Waktu luangku · tiap minggu</div><div className="b" style={{ marginTop: 2 }}>Ketuk untuk menandai</div></div></div>
        <div className="pillgrid">
          <div className="pg-row"><span />{ORDER.map((d) => <span key={d} className="pg-h">{HARI[d]}</span>)}</div>
          {SLOTS.map((sl, si) => (
            <div key={sl.l} className="pg-row">
              <span className="pg-l">{sl.l}<br /><span>{sl.range}</span></span>
              {ORDER.map((d) => {
                const on = isFree(avail, d, si)
                return <button key={d} className={`pg ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`${HARI_PANJANG[d]} ${sl.l}`} onClick={() => setAvail(avail ^ bit(d, si))}>{on ? '✓' : ''}</button>
              })}
            </div>
          ))}
        </div>
        <a className="btn ghost block" style={{ marginTop: 16 }} href={waLink(`🚲 Jadwal free gowesku: ${mine.join(', ') || '—'}. Kamu kapan? Isi juga di Kayuh biar gampang cocokin 😄 ${location.origin}`)} target="_blank" rel="noreferrer" onClick={() => toast('Jadwalmu siap dibagikan')}><MessageCircle size={16} /> Bagikan jadwal free-ku</a>
      </div>
      <p className="tiny muted" style={{ marginTop: 12 }}>Waktu luang teman di sini masih contoh. Sinkron otomatis antar-HP ada di roadmap (butuh server).</p>
    </div>
  )
}
