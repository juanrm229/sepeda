import { useEffect, useState } from 'react'
import { Bike, Home as HomeIcon, MapPin, Zap } from 'lucide-react'
import { useStore } from '../lib/store'
import type { GroupRide, TripStatus } from '../lib/types'
import { HeadBadge, useTicker } from './Character'
import { toast } from './UI'
import { coffeeSync, firstName, hhmm, peopleOf } from '../lib/meetup'
import { etaMin, haversine } from '../lib/geo'
import { replyLink, replyText, waLink } from '../lib/share'
import { timeline } from '../lib/plan'

const ST: Record<TripStatus | 'belum', { l: string; c: string }> = {
  belum: { l: 'Belum berangkat', c: 'var(--muted)' },
  otw: { l: 'OTW', c: 'var(--accent)' },
  tiba: { l: 'Sudah tiba', c: 'var(--good)' },
  pulang: { l: 'Sampai rumah', c: 'var(--good)' },
}

/** Papan kedatangan hari-H ala bandara: siapa sudah berangkat, ETA, siapa sudah tiba, siapa sudah pulang. */
export function ArrivalBoard({ g, finished }: { g: GroupRide; finished?: boolean }) {
  const { friends, settings, char, setMyStatus } = useStore()
  const [, tick] = useState(0)
  useEffect(() => { const iv = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(iv) }, [])
  const people = peopleOf(g, friends, { name: settings.name, char, home: settings.home }).filter((p) => p.rsvp === 'ikut')
  const isHost = g.host === 'me'
  const myEta = new Date(Date.now() + etaMin(haversine(settings.home, g.meet.pos), 20) * 60000)
  const statusOf = (id: string): TripStatus | undefined => (id === 'me' ? g.myStatus : g.participants.find((p) => p.friendId === id)?.status)
  const etaOf = (id: string) => (id === 'me' ? (g.myStatus === 'otw' ? myEta.toISOString() : undefined) : g.participants.find((p) => p.friendId === id)?.eta)
  const arrived = people.filter((p) => statusOf(p.id) === 'tiba' || statusOf(p.id) === 'pulang').length

  function mine(st: TripStatus) {
    setMyStatus(g.id, st)
    if (isHost) { toast(st === 'otw' ? '🚴 Kamu OTW' : st === 'tiba' ? '📍 Kamu sudah tiba' : '🏠 Sampai rumah'); return }
    const rep = { rideId: g.id, name: settings.name, rsvp: 'ikut' as const, status: st, eta: st === 'otw' ? myEta.toISOString() : undefined, char, at: new Date().toISOString() }
    window.open(waLink(replyText(g, rep, replyLink(rep))), '_blank')
    toast('📨 Status siap dikirim', `Papan ${firstName(g.host)} ikut ter-update`)
  }

  return (
    <div className="card board">
      <div className="card-h">
        <div><div className="mono">{finished ? 'Pulang aman' : 'Papan kedatangan'} · live dari balasan</div><div className="b" style={{ marginTop: 2 }}>{finished ? `${people.filter((p) => statusOf(p.id) === 'pulang').length}/${people.length} sudah di rumah` : `${arrived}/${people.length} sudah di ${g.meet.name.split(' ').slice(0, 3).join(' ')}`}</div></div>
        <span className="tag"><i className="live" /> {hhmm(new Date())}</span>
      </div>
      <div className="board-rows">
        {people.map((p) => {
          const st = statusOf(p.id) ?? 'belum'
          const eta = etaOf(p.id)
          return (
            <div key={p.id} className={`board-row st-${st}`}>
              {p.char && <HeadBadge c={p.char} size={32} />}
              <span className="grow b">{p.me ? 'Kamu' : firstName(p.name)}</span>
              <span className="board-st" style={{ color: ST[st].c }}>{ST[st].l}{st === 'otw' && eta ? ` · ${hhmm(new Date(eta))}` : ''}</span>
            </div>
          )
        })}
      </div>
      <div className="grid3" style={{ marginTop: 14, gap: 8 }}>
        {finished
          ? <button className="btn ink sm span3" style={{ gridColumn: 'span 3' }} onClick={() => mine('pulang')}><HomeIcon size={14} /> Aku sudah sampai rumah</button>
          : <>
            <button className={`btn sm ${g.myStatus === 'otw' ? 'ink' : 'ghost'}`} onClick={() => mine('otw')}><Bike size={14} /> OTW</button>
            <button className={`btn sm ${g.myStatus === 'tiba' ? 'ink' : 'ghost'}`} onClick={() => mine('tiba')}><MapPin size={14} /> Tiba</button>
            <button className="btn sm ghost" onClick={() => mine('pulang')}><HomeIcon size={14} /> Pulang</button>
          </>}
      </div>
    </div>
  )
}

/** Kopi Sinkron: jam start per pace supaya semua tiba bareng di kedai kopi. */
export function CoffeeSyncCard({ g }: { g: GroupRide }) {
  const { friends, settings, char } = useStore()
  const t = useTicker(true)
  if (!g.plan) return null
  const tl = timeline(g.plan)
  const ci = g.plan.checkpoints.findIndex((c) => c.kind === 'kopi' || c.kind === 'makan')
  if (ci < 0) return null
  const km = tl.rows[ci].km
  const people = peopleOf(g, friends, { name: settings.name, char, home: settings.home, spd: 25 })
  const sync = coffeeSync(people, km, new Date(g.datetime))
  const cafe = g.plan.checkpoints[ci].place?.name ?? g.plan.checkpoints[ci].name
  if (!sync) return null
  const text = `☕ *Kopi Sinkron — ${g.title}*\nBiar semua tiba bareng di ${cafe} ±${hhmm(sync.arrive)}:\n${sync.groups.map((s) => `• ${s.label} (${s.people.map((p) => (p.me ? settings.name : firstName(p.name))).join(', ')}): start ${hhmm(s.startAt)}${s.extraKm > 0.5 ? ` — atau start bareng + putaran ${s.extraKm.toFixed(0)} km` : ''}`).join('\n')}`
  return (
    <div className="card">
      <div className="card-h">
        <div><div className="mono">Kopi Sinkron · beda pace, tiba bareng</div><div className="b" style={{ marginTop: 2 }}>Semua sampai {cafe} {hhmm(sync.arrive)}</div></div>
        <Zap size={17} />
      </div>
      <div className="sync">
        {sync.groups.map((s) => {
          const t0 = sync.groups[0].startAt.getTime(), span = sync.arrive.getTime() - t0
          const st = (s.startAt.getTime() - t0) / span
          const ph = (t % 4.2) / 3.4
          const pos = Math.max(0, Math.min(1, (ph - st) / (1 - st)))
          return (
          <div key={s.label} className="sync-row">
            <div className="sync-lane"><i style={{ width: `${pos * 100}%` }} /><span className="sync-dot" style={{ left: `${pos * 100}%` }}>{s.people[0]?.char && <HeadBadge c={s.people[0].char} size={22} ring={false} />}</span><span className="sync-cup">☕</span></div>
            <div className="row between" style={{ marginTop: 8 }}>
              <span className="row" style={{ gap: 8 }}><span className="avatars">{s.people.slice(0, 4).map((p) => p.char && <HeadBadge key={p.id} c={p.char} size={26} />)}</span><span className="small b">{s.label} · {s.speed.toFixed(0)} km/j</span></span>
              <span className="big" style={{ fontSize: 20 }}>{hhmm(s.startAt)}</span>
            </div>
            {s.extraKm > 0.5 && <div className="tiny muted" style={{ marginTop: 2 }}>atau start bareng {hhmm(sync.groups[0].startAt)} + putaran bonus {s.extraKm.toFixed(0)} km</div>}
          </div>
        )})}
      </div>
      <a className="btn ghost block" style={{ marginTop: 12 }} href={waLink(text)} target="_blank" rel="noreferrer">Kirim rencana ke grup</a>
    </div>
  )
}

