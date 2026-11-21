import { useMemo, useRef, useState } from 'react'
import { Download, Shuffle, Lock, Sparkles, Swords, HardHat, Glasses, Shirt, Settings, Search, Check, Ban, Undo2 } from 'lucide-react'
import { useStore } from '../lib/store'
import type { CharConfig } from '../lib/types'
import { characterLevel, moodOf, QUEST, riderClass, riderStats } from '../lib/character'
import { applyPick, CATS, drawAvatar, isUnlocked, lockOf, PART, randomChar, reqLabel, TABS, type TabDef } from '../lib/avatar'
import { levelTitle } from '../lib/analytics'
import { fmt } from '../lib/util'
import { AvatarSvg, HeadSticker, HoloOrb, Portrait } from '../components/Character'
import { celebrate, toast, Top } from '../components/UI'
import type { Mood } from '../lib/character'

const Spark = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <svg width={28 * s} height={28 * s} viewBox="-14 -14 28 28" style={{ position: 'absolute', left: x, top: y }} aria-hidden>
    <path d="M0,-13 Q2,-2 13,0 Q2,2 0,13 Q-2,2 -13,0 Q-2,-2 0,-13 Z" fill="var(--ink)" />
  </svg>
)

export default function Character() {
  const { char, setChar, rides, settings, upsertReminder } = useStore()
  const [tabK, setTabK] = useState<TabDef['k']>('hair')
  const [q, setQ] = useState('')
  const [undo, setUndo] = useState<CharConfig | null>(null)
  const tab = TABS.find((t) => t.k === tabK)!
  const setTab = (k: TabDef['k']) => { setTabK(k); setQ('') }
  const [tilt, setTilt] = useState({ x: 0, y: 0, on: false })
  const [preview, setPreview] = useState<Mood | null>(null)
  const lv = characterLevel(rides)
  const stats = useMemo(() => riderStats(rides), [rides])
  const cls = riderClass(stats)
  const { mood, line } = moodOf(rides, settings)
  const svgRef = useRef<HTMLDivElement>(null)

  const pick = (id: string | null) => {
    if (id && !isUnlocked(id, lv.lvl, lv.got)) { toast('🔒 Masih terkunci', `Buka dengan ${reqLabel(id)}`); return }
    setUndo(char)
    setChar(applyPick(char, tab, id))
  }
  const randomize = () => { setUndo(char); setChar(randomChar()) }
  const items = CATS[tab.cat].filter((p) => !q || p.l.toLowerCase().includes(q.toLowerCase()))
  const selected = (id: string) => {
    if (tab.k === 'details' || tab.k === 'acc') { const p = PART[id]; return p.slot ? (char as unknown as Record<string, string | null>)[p.slot] === id : char[tab.k].includes(id) }
    return (char as unknown as Record<string, string | null>)[tab.k] === id
  }
  const current = tab.k === 'details' || tab.k === 'acc' ? null : (char as unknown as Record<string, string | null>)[tab.k]

  async function downloadPng() {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350
    const g = c.getContext('2d')!
    g.fillStyle = '#e8e7e3'; g.fillRect(0, 0, 1080, 1350)
    g.fillStyle = '#f6f5f2'; g.beginPath(); g.arc(540, 560, 430, 0, Math.PI * 2); g.fill()
    g.save(); g.beginPath(); g.arc(540, 560, 430, 0, Math.PI * 2); g.clip()
    await drawAvatar(g, char, 110, 130, 860, mood)
    g.restore()
    g.lineWidth = 8; g.strokeStyle = '#111'; g.beginPath(); g.arc(540, 560, 430, 0, Math.PI * 2); g.stroke()
    g.fillStyle = '#111'; g.font = '800 64px "Bricolage Grotesque"'; g.textAlign = 'center'
    g.fillText(cls.main.name, 540, 1130)
    g.font = '700 28px "Space Mono"'; g.fillText(`LV. ${lv.lvl} · ${settings.name.toUpperCase()} · KAYUH`, 540, 1190)
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'karakter-kayuh.png'; a.click()
    toast('🖼️ Karakter diunduh', 'Pakai sebagai foto profil WhatsApp/IG')
  }

  return (
    <div className="fadein">
      <Top title="Karakter" sub={`lvl up ↑ · ${levelTitle(lv.lvl)}`} right={<a href="#/profile" className="iconbtn" aria-label="Profil & pengaturan"><Settings size={18} /></a>} />
      <div className="row-d">
        <div className="stack">
          <div className="card outline tiltcard" style={{ padding: '18px 18px 22px', overflow: 'hidden', transform: `perspective(900px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`, ['--sheen' as string]: tilt.on ? 0.55 : 0, ['--sx' as string]: `${50 + tilt.x * 4}%` }}
            onPointerMove={(e) => { if (e.pointerType !== 'mouse') return; const r = e.currentTarget.getBoundingClientRect(); setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 10, y: -((e.clientY - r.top) / r.height - 0.5) * 10, on: true }) }}
            onPointerLeave={() => setTilt({ x: 0, y: 0, on: false })}>
            <div className="row between">
              <span className="mono">No. {String(lv.lvl).padStart(3, '0')} · Kartu pesepeda</span>
              <span className="tag ink">{cls.main.emblem} {cls.sub.name}</span>
            </div>
            <div ref={svgRef} style={{ position: 'relative', display: 'grid', placeItems: 'center', minHeight: 300, marginTop: 10 }}>
              <Spark x={10} y={30} s={1.3} /><Spark x={42} y={70} s={0.7} /><Spark x={286} y={220} s={1.2} /><Spark x={318} y={196} s={0.6} />
              <HoloOrb size={270}><Portrait c={char} mood={preview ?? mood} size={230} style={{ marginBottom: -8 }} /></HoloOrb>
            </div>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <div className="display" style={{ fontSize: 40 }}>{cls.main.name}</div>
              <div style={{ marginTop: 6, fontSize: 17 }}>lv. {lv.lvl} <span className="muted small">({fmt(lv.xp)} exp)</span></div>
            </div>
            <div className="xpbar" style={{ marginTop: 16 }}><i style={{ width: `${(lv.cur / lv.next) * 100}%` }} /></div>
            <div className="row between mono ink" style={{ marginTop: 8 }}><span>{fmt(lv.cur)} exp</span><span>{fmt(lv.next)} exp</span></div>
            <button className="btn rpg block" style={{ marginTop: 16 }} onClick={() => document.getElementById('quest')?.scrollIntoView({ behavior: 'smooth' })}><Sparkles size={15} /> Ambil quest naik level <Sparkles size={15} /></button>
            <div className="row" style={{ justifyContent: 'center', gap: 14, marginTop: 16 }}>
              {([['hat', <HardHat key="h" size={24} />, 'Topi'], ['eyewear', <Glasses key="g" size={24} />, 'Kacamata'], ['shirt', <Shirt key="m" size={24} />, 'Baju']] as const).map(([k, ic, l]) => (
                <button key={k} className={`slot ${!char[k] ? 'empty' : ''}`} onClick={() => { setTab(k); document.getElementById('lemari')?.scrollIntoView({ behavior: 'smooth' }) }} aria-label={l} title={`${l}: ${char[k] ? PART[char[k]!].l : 'kosong'}`}>{ic}</button>
              ))}
            </div>
          </div>

          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <HeadSticker c={char} mood={mood} size={58} tilt={-6} />
            <div className="bubble" style={{ marginLeft: 6 }}>{line}</div>
          </div>

          <div className="card">
            <div className="mono" style={{ marginBottom: 12 }}>Ekspresi · ketuk untuk pratinjau</div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              {(['semangat', 'segar', 'oke', 'lelah', 'kangen'] as Mood[]).map((m, i) => (
                <button key={m} onClick={() => setPreview(preview === m ? null : m)} style={{ background: 'none', border: 0, padding: 0, textAlign: 'center' }} aria-label={m}>
                  <HeadSticker c={char} mood={m} size={54} tilt={[-8, 5, -3, 7, -5][i]} bg={m === mood ? 'var(--yellow)' : (preview === m ? 'var(--accent-2)' : 'var(--surface-2)')} />
                  <div className="mono" style={{ marginTop: 8, fontSize: 9, color: m === mood ? 'var(--ink)' : undefined }}>{m}{m === mood ? ' ●' : ''}</div>
                </button>
              ))}
            </div>
            <p className="tiny muted" style={{ marginTop: 10 }}>Ekspresi asli mengikuti kondisi tubuhmu (titik kuning). Gowes rutin = karakter bahagia.</p>
          </div>
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          <div className="card">
            <div className="card-h">
              <div><div className="mono">Kelas pesepeda · dari data 60 hari</div><div style={{ fontWeight: 600, fontSize: 18, marginTop: 2 }}>{cls.main.emblem} {cls.main.name} <span className="muted">· {cls.sub.name}</span></div></div>
              <Swords size={18} />
            </div>
            <div className="small ink2">{cls.main.tagline} <b>Kekuatan spesial:</b> {cls.main.power}.</div>
            <div className="stack" style={{ gap: 12, marginTop: 16 }}>
              {stats.map((st) => (
                <div key={st.k}>
                  <div className="row between"><span className="mono ink">{st.l}</span><span className="dot" style={{ fontSize: 20 }}>{st.v}</span></div>
                  <div className="meter dots" style={{ marginTop: 6 }}>{Array.from({ length: 20 }, (_, i) => <i key={i} className={i < Math.round(st.v / 5) ? (st.k === cls.main.id ? 'a' : 'f') : ''} />)}</div>
                  <div className="tiny muted" style={{ marginTop: 3 }}>{st.hint}</div>
                </div>
              ))}
            </div>
          </div>

          <a href="#/paspor" className="card click passport" style={{ textDecoration: 'none' }}>
            <div className="row between"><div><div className="mono">Paspor landmark</div><div className="display" style={{ fontSize: 22, marginTop: 4 }}>Koleksi stempel</div></div><span style={{ fontSize: 34 }}>✪</span></div>
            <div className="small" style={{ opacity: 0.8, marginTop: 6 }}>Gowes melewati Monas, Kota Tua, Gunung Pancar, dan lainnya untuk mengisi paspormu.</div>
          </a>

          <div id="quest" className="card ink">
            <div className="mono">Quest minggu ini · perkuat {cls.weakest.l.toLowerCase()}</div>
            <div style={{ fontWeight: 600, fontSize: 18, marginTop: 6 }}>{QUEST[cls.weakest.k]}</div>
            <div className="small" style={{ opacity: 0.7, marginTop: 4 }}>Stat terlemahmu adalah {cls.weakest.l.toLowerCase()} ({cls.weakest.v}). Pesepeda seimbang lebih jarang cedera dan lebih cepat naik level.</div>
            <button className="btn accent sm" style={{ marginTop: 12 }} onClick={() => { upsertReminder({ id: 'quest-' + cls.weakest.k, kind: 'ride', title: QUEST[cls.weakest.k].replace('Quest: ', '⚔ '), time: '06:00', days: [6], enabled: true }); toast('⚔️ Quest diterima', 'Pengingat dipasang Sabtu 06.00'); celebrate(0.7) }}>Terima quest</button>
          </div>

          <div className="card" id="lemari">
            <div className="row between" style={{ marginBottom: 12 }}>
              <div><span className="mono">Lemari karakter · 512 item</span><div className="small muted" style={{ marginTop: 2 }}>{current ? <>Terpilih: <b className="ink2">{PART[current]?.l}</b></> : tab.multi ? 'Bisa pilih beberapa sekaligus' : 'Tanpa item'}</div></div>
              <div className="row" style={{ gap: 6 }}>
                <button className="iconbtn" disabled={!undo} onClick={() => { if (undo) { setChar(undo); setUndo(null) } }} aria-label="Urungkan"><Undo2 size={16} /></button>
                <button className="iconbtn" onClick={randomize} aria-label="Acak"><Shuffle size={16} /></button>
                <button className="iconbtn" style={{ background: 'var(--ink)', color: 'var(--bg)' }} onClick={downloadPng} aria-label="Unduh"><Download size={16} /></button>
              </div>
            </div>
            <div className="seg-tabs">{TABS.map((t) => <button key={t.k} className={tabK === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>{t.l}{t.k === 'hijab' && char.hijab ? ' •' : ''}</button>)}</div>
            <div className="row" style={{ background: 'var(--surface-2)', borderRadius: 999, padding: '2px 4px 2px 12px', marginTop: 12 }}>
              <Search size={15} className="muted" />
              <input className="input" style={{ border: 0, background: 'transparent', padding: '9px 10px' }} placeholder={`Cari ${tab.l.toLowerCase()}… (${CATS[tab.cat].length})`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Cari ${tab.l}`} />
            </div>
            {tab.k === 'hijab' && char.hair && <p className="tiny muted" style={{ marginTop: 8 }}>Memilih hijab menyembunyikan rambut & anting. Topi tetap bisa dipakai di atas hijab.</p>}
            {tab.k === 'hair' && char.hijab && <p className="tiny muted" style={{ marginTop: 8 }}>Memilih rambut akan melepas hijab.</p>}
            <div className="wardrobe" style={{ marginTop: 12 }}>
              {(tab.optional || tab.multi) && !q && (
                <button className={`tile ${!current && !(tab.multi && char[tab.k as 'details' | 'acc'].length) ? 'on' : ''}`} onClick={() => pick(null)} aria-label="Tanpa">
                  <Ban size={22} className="muted" style={{ marginBottom: 12 }} /><span className="lock" style={{ color: 'var(--muted)' }}>Tanpa</span>
                </button>
              )}
              {items.map((p) => {
                const ok = isUnlocked(p.id, lv.lvl, lv.got)
                const on = selected(p.id)
                const base = on ? char : applyPick(char, tab, p.id)
                const prev = tab.k === 'hair' || tab.k === 'hijab' || tab.k === 'earrings' ? { ...base, hat: null } : base
                return (
                  <button key={p.id} className={`tile ${on ? 'on' : ''} ${ok ? '' : 'locked'}`} onClick={() => pick(p.id)} aria-label={ok ? p.l : `${p.l}, terkunci: ${reqLabel(p.id)}`} aria-pressed={on} title={ok ? p.l : `${p.l} — ${reqLabel(p.id)}`}>
                    <AvatarSvg c={prev} view={tab.focus === 'body' ? [40, 230, 432] : [96, 26, 320]} size={96} label={p.l} />
                    {on && tab.multi && <span className="tile-check"><Check size={12} /></span>}
                    {!ok && <span className="lock" aria-hidden><Lock size={9} style={{ verticalAlign: -1 }} /> {reqLabel(p.id)}</span>}
                  </button>
                )
              })}
              {items.length === 0 && <div className="empty" style={{ gridColumn: '1 / -1' }}>Tidak ada “{q}”.</div>}
            </div>
            <p className="tiny muted" style={{ marginTop: 12 }}>{(() => { const n = CATS[tab.cat].filter((p) => !isUnlocked(p.id, lv.lvl, lv.got)).length; return n ? `${n} item ${tab.l.toLowerCase()} masih terkunci — naik level & kumpulkan lencana untuk membukanya.` : CATS[tab.cat].some((p) => lockOf(p.id)) ? 'Semua item langka di kategori ini sudah kamu buka ✦' : 'Semua item di kategori ini terbuka.' })()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
