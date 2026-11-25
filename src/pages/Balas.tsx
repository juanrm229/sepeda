import { useEffect, useRef, useState } from 'react'
import { Check, MapPin } from 'lucide-react'
import { useStore } from '../lib/store'
import { parseReply } from '../lib/share'
import { mergeReply, hhmm, firstName } from '../lib/meetup'
import { Top, toast } from '../components/UI'
import { HeadBadge } from '../components/Character'
import { go } from '../lib/router'
import { haversine } from '../lib/geo'

/** Host membuka link balasan teman → RSVP, vote, catatan, karakter & titik berangkat masuk otomatis. */
export default function Balas({ code }: { code: string }) {
  const { groupRides, friends, upsertGroupRide } = useStore()
  const r = parseReply(code)
  const g = r ? groupRides.find((x) => x.id === r.rideId) : undefined
  const done = useRef(false)
  const [res, setRes] = useState<{ who: string; isNew: boolean } | null>(null)

  useEffect(() => {
    if (!r || !g || done.current) return
    done.current = true
    const m = mergeReply(g, friends, r)
    upsertGroupRide(m.g)
    setRes({ who: m.who, isNew: m.isNew })
    toast(r.rsvp === 'ikut' ? `✅ ${firstName(m.who)} ikut!` : `Jawaban ${firstName(m.who)} masuk`, g.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!r) return <div><Top title="Balasan tidak valid" back="" /><div className="empty">Link balasan rusak atau terpotong.</div></div>
  if (!g) return (
    <div><Top title="Ajakan tidak ditemukan" back="" />
      <div className="card"><p className="small">Balasan dari <b>{r.name}</b> untuk ajakan yang tidak ada di HP ini. Link balasan hanya bisa dibuka di HP yang membuat ajakannya.</p></div>
    </div>
  )

  const label = r.rsvp === 'ikut' ? 'Ikut' : r.rsvp === 'mungkin' ? 'Mungkin' : 'Tidak ikut'
  return (
    <div className="fadein">
      <Top title="Balasan masuk" sub={g.title} back="" />
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ display: 'inline-block', position: 'relative' }}>
          {r.char ? <HeadBadge c={r.char} size={96} bg="var(--surface-2)" ring={false} /> : <span className="ico round" style={{ width: 96, height: 96 }} />}
          <span className="ico round ink" style={{ position: 'absolute', right: -4, bottom: -4, width: 34, height: 34, boxShadow: '0 0 0 3px var(--surface)' }}><Check size={16} /></span>
        </div>
        <div className="qtitle" style={{ marginTop: 14 }}>{res?.who ?? r.name}<br /><span>{label.toLowerCase()}.</span></div>
        {r.note && <div className="hand" style={{ fontSize: 24, marginTop: 10 }}>“{r.note}”</div>}
        <div className="row wrap" style={{ gap: 6, justifyContent: 'center', marginTop: 14 }}>
          {r.vote?.t != null && g.timeOptions?.[r.vote.t] && <span className="tag">🕐 vote {hhmm(new Date(g.timeOptions[r.vote.t]))}</span>}
          {r.vote?.c != null && g.coffeeOptions?.[r.vote.c] && <span className="tag">☕ {g.coffeeOptions[r.vote.c].name}</span>}
          {r.from && <span className="tag"><MapPin size={11} /> berangkat ±{haversine(r.from, g.meet.pos).toFixed(0)} km dari kumpul</span>}
          {res?.isNew && <span className="tag accent">peserta baru</span>}
        </div>
        {r.from && <p className="tiny muted" style={{ marginTop: 12 }}>Titik berangkat {firstName(r.name)} dipakai untuk titik temu adil & jemput berantai.</p>}
        <button className="btn ink block lg" style={{ marginTop: 18 }} onClick={() => go('squad/' + g.id)}>Lihat ajakan</button>
      </div>
    </div>
  )
}
