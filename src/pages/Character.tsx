import { useMemo, useRef, useState } from 'react'
import { Download, Shuffle, Lock, Sparkles, Swords, Glasses, Scissors, Palette, Settings, Check, Ban, Undo2 } from 'lucide-react'
import { useStore } from '../lib/store'
import type { CharConfig } from '../lib/types'
import { characterLevel, moodOf, QUEST, riderClass, riderStats } from '../lib/character'
import { applyPick, avatarUri, drawAvatar, isUnlocked, lockKey, lockOf, randomChar, reqLabel, TABS, VARIANTS, variantLabel, type TabDef } from '../lib/avatar'
import { levelTitle } from '../lib/analytics'
import { fmt } from '../lib/util'
import { HeadSticker, HoloOrb, Portrait } from '../components/Character'
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
  const [undo, setUndo] = useState<CharConfig | null>(null)
  const tab = TABS.find((t) => t.k === tabK)!
  const setTab = (k: TabDef['k']) => setTabK(k)
  const [tilt, setTilt] = useState({ x: 0, y: 0, on: false })
  const [preview, setPreview] = useState<Mood | null>(null)
  const lv = characterLevel(rides)
  const stats = useMemo(() => riderStats(rides), [rides])
  const cls = riderClass(stats)
  const { mood, line } = moodOf(rides, settings)
  const svgRef = useRef<HTMLDivElement>(null)

  const pick = (value: string | null) => {
    const key = value ? lockKey(tab.k, value) : ''
    if (value && !isUnlocked(key, lv.lvl, lv.got)) { toast('🔒 Masih terkunci', `Buka dengan ${reqLabel(key)}`); return }
    setUndo(char)
    setChar(applyPick(char, tab, value))
  }
  const randomize = () => { setUndo(char); setChar(randomChar()) }
  const current = tab.kind === 'toggles' ? null : (char as unknown as Record<string, string | null>)[tab.k]
  const currentLabel = tab.kind === 'variant' ? (current ? variantLabel(tab.k, current) : 'Tanpa') : tab.kind === 'color' ? `#${current}` : [char.freckles && 'Bintik', char.flowers && 'Bunga'].filter(Boolean).join(' + ') || 'Tidak ada'
  const lockedCount = (() => {
    const keys = tab.kind === 'variant' ? VARIANTS[tab.k].map((v) => lockKey(tab.k, v)) : tab.kind === 'color' ? tab.palette.map((h) => lockKey(tab.k, h)) : ['extras:flowers']
    return { total: keys.filter((k) => lockOf(k)).length, locked: keys.filter((k) => !isUnlocked(k, lv.lvl, lv.got)).length }
  })()

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
              {([['hair', <Scissors key="h" size={22} />, 'Rambut', true], ['glasses', <Glasses key="g" size={22} />, 'Kacamata', !!char.glasses], ['hairColor', <Palette key="p" size={22} />, 'Warna', true]] as const).map(([k, ic, l, filled]) => (
                <button key={k} className={`slot ${filled ? '' : 'empty'}`} onClick={() => { setTab(k); document.getElementById('lemari')?.scrollIntoView({ behavior: 'smooth' }) }} aria-label={`Ubah ${l}`}>{ic}</button>
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
              <div><span className="mono">Lemari karakter</span><div className="small muted" style={{ marginTop: 2 }}>{tab.l}: <b className="ink2">{currentLabel}</b></div></div>
              <div className="row" style={{ gap: 6 }}>
                <button className="iconbtn" disabled={!undo} onClick={() => { if (undo) { setChar(undo); setUndo(null) } }} aria-label="Urungkan"><Undo2 size={16} /></button>
                <button className="iconbtn" onClick={randomize} aria-label="Acak"><Shuffle size={16} /></button>
                <button className="iconbtn" style={{ background: 'var(--ink)', color: 'var(--bg)' }} onClick={downloadPng} aria-label="Unduh"><Download size={16} /></button>
              </div>
            </div>
            <div className="seg-tabs">{TABS.map((t) => <button key={t.k} className={tabK === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>{t.l}</button>)}</div>

            {tab.kind === 'variant' && (
              <div className="wardrobe" style={{ marginTop: 14 }}>
                {tab.optional && (
                  <button className={`tile ${!current ? 'on' : ''}`} onClick={() => pick(null)} aria-label="Tanpa" aria-pressed={!current}>
                    <Ban size={22} className="muted" /><span className="lock" style={{ color: 'var(--muted)' }}>Tanpa</span>
                  </button>
                )}
                {VARIANTS[tab.k].map((v) => {
                  const key = lockKey(tab.k, v)
                  const ok = isUnlocked(key, lv.lvl, lv.got)
                  const on = current === v
                  const label = variantLabel(tab.k, v)
                  return (
                    <button key={v} className={`tile ${on ? 'on' : ''} ${ok ? '' : 'locked'}`} onClick={() => pick(v)} aria-pressed={on} aria-label={ok ? label : `${label}, terkunci: ${reqLabel(key)}`} title={ok ? label : `${label} — ${reqLabel(key)}`}>
                      <img src={avatarUri(applyPick(char, tab, v))} alt="" draggable={false} decoding="async" />
                      {!ok && <span className="lock" aria-hidden><Lock size={9} style={{ verticalAlign: -1 }} /> {reqLabel(key)}</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {tab.kind === 'color' && (
              <div style={{ marginTop: 16 }}>
                <div className="swatches">
                  {tab.palette.map((h) => {
                    const key = lockKey(tab.k, h)
                    const ok = isUnlocked(key, lv.lvl, lv.got)
                    const on = current === h
                    return (
                      <button key={h} className={`swatch ${on ? 'on' : ''} ${ok ? '' : 'locked'}`} style={{ background: `#${h}` }} onClick={() => pick(h)} aria-pressed={on} aria-label={ok ? `Warna #${h}` : `Warna #${h}, terkunci: ${reqLabel(key)}`} title={ok ? `#${h}` : reqLabel(key)}>
                        {on && <Check size={16} color={parseInt(h.slice(0, 2), 16) + parseInt(h.slice(2, 4), 16) + parseInt(h.slice(4, 6), 16) > 420 ? '#111' : '#fff'} />}
                        {!ok && <Lock size={12} color="#fff" />}
                      </button>
                    )
                  })}
                </div>
                <label className="row" style={{ gap: 10, marginTop: 14 }}>
                  <input type="color" value={`#${current}`} onChange={(e) => { setUndo(char); setChar(applyPick(char, tab, e.target.value.slice(1))) }} aria-label={`Warna bebas untuk ${tab.l.toLowerCase()}`} style={{ width: 44, height: 36, border: 0, background: 'none', padding: 0 }} />
                  <span className="small ink2">Warna bebas</span>
                </label>
                <div className="row" style={{ gap: 10, marginTop: 14 }}>
                  {(['oke', 'segar', 'lelah'] as Mood[]).map((m) => <img key={m} src={avatarUri(char, m)} alt="" width={72} height={72} style={{ borderRadius: 18, background: 'var(--surface-2)' }} />)}
                </div>
              </div>
            )}

            {tab.kind === 'toggles' && (
              <div className="wardrobe" style={{ marginTop: 14 }}>
                {([['freckles', 'Bintik', char.freckles], ['flowers', 'Bunga rambut', char.flowers]] as const).map(([k, l, on]) => {
                  const key = lockKey('extras', k)
                  const ok = isUnlocked(key, lv.lvl, lv.got)
                  return (
                    <button key={k} className={`tile ${on ? 'on' : ''} ${ok ? '' : 'locked'}`} onClick={() => pick(k)} aria-pressed={on} aria-label={ok ? l : `${l}, terkunci: ${reqLabel(key)}`}>
                      <img src={avatarUri({ ...char, [k]: true })} alt="" draggable={false} />
                      {on && <span className="tile-check"><Check size={12} /></span>}
                      <span className="lock" style={ok ? { color: 'var(--muted)' } : undefined}>{ok ? l : <><Lock size={9} style={{ verticalAlign: -1 }} /> {reqLabel(key)}</>}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <p className="tiny muted" style={{ marginTop: 12 }}>{lockedCount.locked ? `${lockedCount.locked} pilihan ${tab.l.toLowerCase()} masih terkunci — naik level & kumpulkan lencana untuk membukanya.` : lockedCount.total ? 'Semua pilihan langka di sini sudah kamu buka ✦' : 'Semua pilihan di sini terbuka.'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
