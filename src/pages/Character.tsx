import { useMemo, useRef, useState } from 'react'
import { Download, Shuffle, Lock, Sparkles, Swords, HardHat, Glasses, Medal, Settings } from 'lucide-react'
import { useStore } from '../lib/store'
import type { CharConfig } from '../lib/types'
import { characterLevel, moodOf, OPTIONS, PART_TABS, QUEST, reqText, riderClass, riderStats, unlocked, JERSEY_COLORS, HAIR_COLORS, SKINS } from '../lib/character'
import { levelTitle } from '../lib/analytics'
import { fmt } from '../lib/util'
import { HeadArt, HeadSticker, HoloOrb, Portrait } from '../components/Character'
import { celebrate, toast, Top } from '../components/UI'
import type { Mood } from '../lib/character'

const Spark = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <svg width={28 * s} height={28 * s} viewBox="-14 -14 28 28" style={{ position: 'absolute', left: x, top: y }} aria-hidden>
    <path d="M0,-13 Q2,-2 13,0 Q2,2 0,13 Q-2,2 -13,0 Q-2,-2 0,-13 Z" fill="var(--ink)" />
  </svg>
)

export default function Character() {
  const { char, setChar, rides, settings, upsertReminder } = useStore()
  const [tab, setTab] = useState<keyof CharConfig>('hair')
  const [tilt, setTilt] = useState({ x: 0, y: 0, on: false })
  const [preview, setPreview] = useState<Mood | null>(null)
  const lv = characterLevel(rides)
  const stats = useMemo(() => riderStats(rides), [rides])
  const cls = riderClass(stats)
  const { mood, line } = moodOf(rides, settings)
  const svgRef = useRef<HTMLDivElement>(null)

  const opts = OPTIONS[tab]
  const pick = (k: keyof CharConfig, i: number) => {
    const o = OPTIONS[k][i]
    if (!unlocked(o, lv.lvl, lv.got)) { toast('🔒 Masih terkunci', `Buka dengan ${reqText(o)}`); return }
    setChar({ ...char, [k]: i })
  }
  const randomize = () => {
    const next = { ...char }
    for (const k of Object.keys(OPTIONS) as (keyof CharConfig)[]) {
      const ok = OPTIONS[k].map((o, i) => [o, i] as const).filter(([o]) => unlocked(o, lv.lvl, lv.got))
      next[k] = ok[Math.floor(Math.random() * ok.length)][1]
    }
    setChar(next)
  }

  async function downloadPng() {
    const svg = svgRef.current?.querySelector('svg')
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg).replace(/var\(--f-ui\)/g, 'Inter Tight')
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
    await img.decode()
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350
    const g = c.getContext('2d')!
    g.fillStyle = '#e8e7e3'; g.fillRect(0, 0, 1080, 1350)
    g.drawImage(img, 140, 120, 800, 1000)
    g.fillStyle = '#111'; g.font = '800 64px "Bricolage Grotesque"'; g.textAlign = 'center'
    g.fillText(cls.main.name, 540, 1200)
    g.font = '700 28px "Space Mono"'; g.fillText(`LV. ${lv.lvl} · KAYUH`, 540, 1260)
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
              {([['headgear', <HardHat key="h" size={24} />, 'Kepala'], ['glasses', <Glasses key="g" size={24} />, 'Kacamata'], ['acc', <Medal key="m" size={24} />, 'Aksesori']] as const).map(([k, ic, l]) => (
                <button key={k} className={`slot ${char[k] === 0 ? 'empty' : ''}`} onClick={() => setTab(k)} aria-label={l} title={`${l}: ${OPTIONS[k][char[k]].l}`}>{ic}</button>
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

          <div id="quest" className="card ink">
            <div className="mono">Quest minggu ini · perkuat {cls.weakest.l.toLowerCase()}</div>
            <div style={{ fontWeight: 600, fontSize: 18, marginTop: 6 }}>{QUEST[cls.weakest.k]}</div>
            <div className="small" style={{ opacity: 0.7, marginTop: 4 }}>Stat terlemahmu adalah {cls.weakest.l.toLowerCase()} ({cls.weakest.v}). Pesepeda seimbang lebih jarang cedera dan lebih cepat naik level.</div>
            <button className="btn accent sm" style={{ marginTop: 12 }} onClick={() => { upsertReminder({ id: 'quest-' + cls.weakest.k, kind: 'ride', title: QUEST[cls.weakest.k].replace('Quest: ', '⚔ '), time: '06:00', days: [6], enabled: true }); toast('⚔️ Quest diterima', 'Pengingat dipasang Sabtu 06.00'); celebrate(0.7) }}>Terima quest</button>
          </div>

          <div className="card">
            <div className="row between" style={{ marginBottom: 12 }}>
              <span className="mono">Lemari karakter</span>
              <div className="row" style={{ gap: 6 }}>
                <button className="iconbtn" onClick={randomize} aria-label="Acak"><Shuffle size={16} /></button>
                <button className="iconbtn" style={{ background: 'var(--ink)', color: 'var(--bg)' }} onClick={downloadPng} aria-label="Unduh"><Download size={16} /></button>
              </div>
            </div>
            <div className="seg-tabs">{PART_TABS.map((t) => <button key={t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>{t.l}</button>)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 10, marginTop: 14 }}>
              {opts.map((o, i) => {
                const ok = unlocked(o, lv.lvl, lv.got)
                const preview = { ...char, [tab]: i, ...(tab === 'hair' || tab === 'hairColor' ? { headgear: 0 } : {}) }
                return (
                  <button key={i} className={`tile ${char[tab] === i ? 'on' : ''} ${ok ? '' : 'locked'}`} onClick={() => pick(tab, i)} aria-label={o.l} title={ok ? o.l : `${o.l} — ${reqText(o)}`}>
                    <TilePreview k={tab} c={preview} i={i} />
                    {!ok ? <span className="lock"><Lock size={9} style={{ verticalAlign: -1 }} /> {reqText(o)}</span> : <span className="lock" style={{ color: 'var(--muted)' }}>{o.l}</span>}
                  </button>
                )
              })}
            </div>
            <p className="tiny muted" style={{ marginTop: 12 }}>Item langka terbuka saat naik level atau mendapat lencana. Gowes lebih banyak = lemari lebih lengkap.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TilePreview({ k, c, i }: { k: keyof CharConfig; c: CharConfig; i: number }) {
  if (k === 'jerseyColor' || k === 'skin' || k === 'hairColor') {
    const col = k === 'jerseyColor' ? JERSEY_COLORS[i] : k === 'skin' ? SKINS[i] : HAIR_COLORS[i]
    return <span style={{ width: 44, height: 44, borderRadius: '50%', background: col, border: '2.5px solid #111', marginBottom: 14 }} />
  }
  if (k === 'jersey' || k === 'acc') return <Portrait c={c} size={66} style={{ marginBottom: 12 }} />
  return <svg viewBox="40 22 120 130" width="78%" style={{ marginBottom: 12 }}><HeadArt c={c} sw={5} /></svg>
}
