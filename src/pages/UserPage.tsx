import { useEffect, useState } from 'react'
import { Check, Loader2, UserPlus } from 'lucide-react'
import { useStore } from '../lib/store'
import { api } from '../lib/api'
import type { PublicProfile } from '../lib/types'
import { friendFromProfile } from '../lib/sync'
import { firstName, isFree, SLOTS } from '../lib/meetup'
import { HARI } from '../lib/util'
import { Top, toast, celebrate } from '../components/UI'
import { AvatarImg } from '../components/Character'
import { go } from '../lib/router'
import type { CharConfig } from '../lib/types'

const ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Profil publik @username — tambah teman lewat link. */
export default function UserPage({ handle }: { handle: string }) {
  const { friends, addFriend, auth, onboarded } = useStore()
  const [p, setP] = useState<PublicProfile | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { api.byHandle(handle).then((r) => setP(r.profile)).catch((e) => setErr(e.message)) }, [handle])
  const already = p && friends.some((f) => f.uid === p.uid)
  const self = p && auth?.uid === p.uid

  if (err) return <div><Top title="Tidak ditemukan" back="" /><div className="empty">{err}</div></div>
  if (!p) return <div><Top title={'@' + handle} back="" /><div className="empty"><Loader2 className="spin" /></div></div>
  return (
    <div className="fadein">
      <Top title={'@' + p.handle} sub="Profil PACK" back="" />
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div className="char-stage" style={{ background: `#${(p.char as CharConfig | undefined)?.bg ?? 'e9e2d0'}`, maxWidth: 220, margin: '0 auto' }}>{p.char ? <AvatarImg c={p.char as CharConfig} mood="semangat" size={170} className="ccard-avatar" label={p.name} /> : null}</div>
        <div className="qtitle" style={{ marginTop: 14 }}>{p.name}<br /><span>{p.homeLabel || 'Pesepeda PACK'}</span></div>
      </div>
      {p.avail ? (
        <div className="card section" style={{ marginTop: 12 }}>
          <div className="mono" style={{ marginBottom: 10 }}>Biasanya free</div>
          <div className="pillgrid">
            <div className="pg-row"><span />{ORDER.map((d) => <span key={d} className="pg-h">{HARI[d]}</span>)}</div>
            {SLOTS.map((sl, si) => <div key={sl.l} className="pg-row"><span className="pg-l">{sl.l}</span>{ORDER.map((d) => <span key={d} className={`pg ${isFree(p.avail, d, si) ? 'on' : ''}`}>{isFree(p.avail, d, si) ? '✓' : ''}</span>)}</div>)}
          </div>
        </div>
      ) : null}
      <div className="section">
        {self ? <p className="small muted" style={{ textAlign: 'center' }}>Ini profilmu. Bagikan link ini supaya teman bisa menambahkanmu.</p>
          : already ? <button className="btn ghost block lg" onClick={() => go('squad')}><Check size={17} /> Sudah jadi teman · lihat squad</button>
            : <button className="btn ink block lg" onClick={() => { addFriend(friendFromProfile(p)); celebrate(0.6); toast(`🤝 ${firstName(p.name)} masuk squad`, auth ? 'Ajakanmu akan langsung muncul di app-nya' : 'Buat akun supaya ajakan langsung masuk ke app-nya'); go(onboarded ? 'squad' : '') }}><UserPlus size={17} /> Tambah {firstName(p.name)} ke squad</button>}
      </div>
    </div>
  )
}
