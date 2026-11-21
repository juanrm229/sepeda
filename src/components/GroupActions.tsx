import { useState } from 'react'
import { Clock, CalendarClock, X, UserPlus, MapPin } from 'lucide-react'
import { useStore } from '../lib/store'
import type { GroupRide } from '../lib/types'
import { fmtDate, relDay } from '../lib/util'
import { inviteLink, inviteText, shareOrCopy, waLink } from '../lib/share'
import { Avatar, toast } from './UI'
import { go } from '../lib/router'

/** Kartu merah ala Kyugo: peserta + aksi cepat (telat, jadwal ulang, batal, ajak). */
export function GroupActionCard({ g, compact }: { g: GroupRide; compact?: boolean }) {
  const { friends, settings, setMyRsvp, upsertGroupRide, char } = useStore()
  const [late, setLate] = useState(15)
  const going = g.participants.filter((p) => p.rsvp === 'ikut').map((p) => friends.find((f) => f.id === p.friendId)).filter(Boolean)
  const start = new Date(g.datetime)
  const eta = new Date(start.getTime() + late * 60000)
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`

  const sendLate = () => {
    const text = `🙏 Maaf, aku telat ±${late} menit ke ${g.meet.name} (${g.title}). Perkiraan sampai ${hhmm(eta)}.${g.noDrop ? ' Tunggu ya, no-drop 😄' : ' Jalan duluan aja, nanti aku kejar!'}`
    window.open(waLink(text), '_blank')
    toast('⏱️ Kabar telat disiapkan', `ETA ${hhmm(eta)} · dikirim lewat WhatsApp`)
  }
  const reschedule = () => {
    const d = new Date(start.getTime() + 30 * 60000)
    upsertGroupRide({ ...g, datetime: d.toISOString() })
    toast('📅 Jadwal digeser 30 menit', `Kumpul jam ${hhmm(d)}. Kabari squad lewat tombol Ajak.`)
  }

  return (
    <div className="card accent" style={{ padding: compact ? 16 : 18 }}>
      <div className="row between" style={{ cursor: 'pointer' }} onClick={() => go('squad/' + g.id)}>
        <div style={{ minWidth: 0 }}>
          <div className="mono" style={{ color: '#fff' }}>{relDay(g.datetime)} · {hhmm(start)}</div>
          <div className="display" style={{ fontSize: 26, marginTop: 4 }}>{g.title}</div>
          <div className="small" style={{ opacity: 0.9, marginTop: 4 }}><MapPin size={12} style={{ verticalAlign: -1 }} /> {g.meet.name}</div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0, background: 'rgba(0,0,0,.2)', borderRadius: 18, padding: '8px 12px' }}>
          <div className="mono" style={{ color: '#fff', fontSize: 9 }}>{fmtDate(g.datetime).split(',')[0]}</div>
          <div className="dot" style={{ fontSize: 28 }}>{start.getDate()}</div>
        </div>
      </div>

      <div className="row" style={{ background: 'rgba(0,0,0,.14)', borderRadius: 999, padding: 6, marginTop: 14, gap: 8 }}>
        <div className="avatars" style={{ paddingLeft: 4 }}>
          <Avatar name={settings.name} color="#111" c={char} size={30} />
          {going.slice(0, 4).map((f) => f && <Avatar key={f.id} name={f.name} color={f.color} c={f.char} size={30} />)}
        </div>
        <span className="small" style={{ flex: 1 }}>{going.length + (g.myRsvp === 'ikut' ? 1 : 0)} ikut</span>
        <button className="btn sm" style={{ background: 'rgba(0,0,0,.22)', color: '#fff' }} onClick={async () => { const r = await shareOrCopy(g.title, inviteText(g, inviteLink(g, settings.name))); if (r === 'copied') toast('🔗 Link undangan disalin') }}><UserPlus size={14} /> Ajak</button>
      </div>

      <div className="row" style={{ marginTop: 12, gap: 8 }}>
        <span className="mono" style={{ color: '#fff', flexShrink: 0 }}>Telat</span>
        <div className="row" style={{ background: 'rgba(0,0,0,.14)', borderRadius: 999, padding: 4, gap: 2, flex: 1, justifyContent: 'space-between' }}>
          {[5, 15, 30].map((m) => (
            <button key={m} onClick={() => setLate(m)} style={{ flex: 1, border: 0, borderRadius: 999, padding: '6px 0', background: late === m ? '#fff' : 'transparent', color: late === m ? '#111' : '#fff', fontWeight: 700 }}>
              {m}<span style={{ fontSize: 9, fontWeight: 500, marginLeft: 2 }}>mnt</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid3" style={{ marginTop: 14 }}>
        {[
          { i: <X size={20} />, l: 'Batal ikut', f: () => { setMyRsvp(g.id, 'tidak'); toast('Kamu batal ikut', 'Squad akan melihat RSVP-mu') } },
          { i: <CalendarClock size={20} />, l: 'Geser 30m', f: reschedule },
          { i: <Clock size={20} />, l: 'Aku telat', f: sendLate },
        ].map((a) => (
          <button key={a.l} onClick={a.f} style={{ border: 0, background: 'rgba(0,0,0,.2)', color: '#fff', borderRadius: 999, aspectRatio: '1', maxWidth: 84, width: '100%', margin: '0 auto', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 4 }}>
            {a.i}<span className="mono" style={{ color: '#fff', fontSize: 8.5 }}>{a.l}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
