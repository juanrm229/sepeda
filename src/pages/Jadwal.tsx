import { useState } from 'react'
import { Check } from 'lucide-react'
import { useStore } from '../lib/store'
import { parseAvail } from '../lib/share'
import { firstName, isFree, SLOTS } from '../lib/meetup'
import { Top, toast, celebrate } from '../components/UI'
import { HeadBadge } from '../components/Character'
import { HARI, uid } from '../lib/util'
import { go } from '../lib/router'
import { randomChar } from '../lib/avatar'

const ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Membuka link jadwal free teman → waktu luangnya masuk ke "Kapan semua bisa?". */
export default function Jadwal({ code }: { code: string }) {
  const { friends, updateFriendAvail, addFriend, settings, onboarded, finishOnboarding } = useStore()
  const a = parseAvail(code)
  const [done, setDone] = useState(false)
  if (!a) return <div><Top title="Link jadwal tidak valid" back="" /><div className="empty">Link rusak atau terpotong.</div></div>
  const lower = a.name.toLowerCase()
  const match = friends.find((f) => f.name.toLowerCase() === lower) ?? friends.find((f) => firstName(f.name).toLowerCase() === firstName(lower))
  const self = onboarded && settings.name.toLowerCase() === lower

  function save() {
    if (!onboarded) finishOnboarding(false)
    if (match) updateFriendAvail(match.id, a!.mask)
    else addFriend({ id: uid(), name: a!.name, color: '#8a8a85', avgSpeed: 23, weeklyKm: 60, home: settings.home, homeLabel: 'Belum diatur', char: a!.char ?? randomChar(a!.name), avail: a!.mask })
    setDone(true); celebrate(0.5)
    toast(`📅 Jadwal ${firstName(a!.name)} tersimpan`, 'Dipakai untuk mencari slot emas squad')
  }

  return (
    <div className="fadein">
      <Top title="Jadwal free teman" sub="Kapan semua bisa?" back="" />
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        {a.char && <div style={{ display: 'inline-block' }}><HeadBadge c={a.char} size={88} bg="var(--surface-2)" ring={false} /></div>}
        <div className="qtitle" style={{ marginTop: 12 }}>{a.name}<br /><span>bisa gowes di sini.</span></div>
      </div>
      <div className="card section" style={{ marginTop: 12 }}>
        <div className="pillgrid">
          <div className="pg-row"><span />{ORDER.map((d) => <span key={d} className="pg-h">{HARI[d]}</span>)}</div>
          {SLOTS.map((sl, si) => (
            <div key={sl.l} className="pg-row"><span className="pg-l">{sl.l}</span>{ORDER.map((d) => <span key={d} className={`pg ${isFree(a.mask, d, si) ? 'on' : ''}`}>{isFree(a.mask, d, si) ? '✓' : ''}</span>)}</div>
          ))}
        </div>
      </div>
      {self ? <p className="small muted section" style={{ textAlign: 'center' }}>Ini jadwalmu sendiri 🙂</p> : done ? (
        <button className="btn ink block lg section" onClick={() => go('kapan')}><Check size={17} /> Lihat slot emas squad</button>
      ) : (
        <button className="btn ink block lg section" onClick={save}>{match ? `Perbarui jadwal ${firstName(match.name)}` : `Tambah ${firstName(a.name)} ke squad`}</button>
      )}
    </div>
  )
}
