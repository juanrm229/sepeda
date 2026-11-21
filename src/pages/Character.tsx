import { useMemo, useState } from 'react'
import { Download, Shuffle, Lock, Swords, Scissors, Palette, Settings, Check, Ban, Undo2 } from 'lucide-react'
import { useStore } from '../lib/store'
import type { CharConfig } from '../lib/types'
import { characterLevel, moodOf, QUEST, riderClass, riderStats } from '../lib/character'
import { applyPick, avatarUri, drawAvatar, isUnlocked, lockKey, lockOf, randomChar, reqLabel, TABS, VARIANTS, variantLabel, type TabDef } from '../lib/avatar'
import { levelTitle, streakWeeks } from '../lib/analytics'
import { fmt } from '../lib/util'
import { HeadSticker } from '../components/Character'
import { CharacterCard } from '../components/CharacterCard'
import { celebrate, toast, Top } from '../components/UI'
import type { Mood } from '../lib/character'

export default function Character() {
  const { char, setChar, rides, settings, upsertReminder } = useStore()
  const [tabK, setTabK] = useState<TabDef['k']>('hair')
  const [undo, setUndo] = useState<CharConfig | null>(null)
  const tab = TABS.find((t) => t.k === tabK)!
  const setTab = (k: TabDef['k']) => setTabK(k)
  const [preview, setPreview] = useState<Mood | null>(null)
  const lv = characterLevel(rides)
  const stats = useMemo(() => riderStats(rides), [rides])
  const cls = riderClass(stats)
  const { mood, line } = moodOf(rides, settings)
  const totalKm = rides.reduce((a, r) => a + r.distanceKm, 0)
  const streak = streakWeeks(rides)

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
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H
    const g = c.getContext('2d')!
    const rr = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r) }
    g.fillStyle = '#e8e7e3'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#f6f5f2'; rr(60, 60, 960, 1230, 64); g.fill()
    g.fillStyle = `#${char.bg ?? 'e9e2d0'}`; rr(90, 90, 900, 780, 46); g.fill()
    g.save(); rr(90, 90, 900, 780, 46); g.clip()
    g.fillStyle = 'rgba(0,0,0,.07)'
    for (let x = 100; x < 990; x += 30) for (let y = 100; y < 870; y += 30) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill() }
    await drawAvatar(g, char, 170, 140, 740, mood)
    g.restore()
    g.fillStyle = '#111'; g.font = '700 84px "Bricolage Grotesque"'; g.textAlign = 'left'
    g.fillText(settings.name, 120, 990)
    g.fillStyle = '#4f4e4a'; g.font = '500 38px "Inter Tight"'; g.fillText(`${cls.main.emblem} ${cls.main.name} · Level ${lv.lvl}`, 120, 1050)
    g.fillStyle = '#d6d5cf'; g.fillRect(120, 1100, 840, 2)
    g.fillStyle = '#64635d'; g.font = '700 26px "Space Mono"'
    g.fillText(`${fmt(totalKm)} KM`, 120, 1160); g.fillText(`STREAK ${streak} MGG`, 440, 1160); g.fillText('KAYUH', 820, 1160)
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'kartu-kayuh.png'; a.click()
    toast('🖼️ Kartu diunduh', 'Siap dibagikan ke WhatsApp/IG')
  }

  return (
    <div className="fadein">
      <Top title="Karakter" sub={`lvl up ↑ · ${levelTitle(lv.lvl)}`} right={<a href="#/profile" className="iconbtn" aria-label="Profil & pengaturan"><Settings size={18} /></a>} />
      <div className="row-d">
        <div className="stack">
          <CharacterCard c={char} mood={preview ?? mood} name={settings.name} className={cls.main.name} emblem={cls.main.emblem} subClass={cls.sub.name}
            lvl={lv.lvl} xpCur={lv.cur} xpNext={lv.next} totalKm={totalKm} streak={streak} line={line} />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost" style={{ flex: 1 }} onClick={() => { setTab('hair'); document.getElementById('lemari')?.scrollIntoView({ behavior: 'smooth' }) }}><Scissors size={15} /> Ubah tampilan</button>
            <button className="btn ghost" style={{ flex: 1 }} onClick={() => { setTab('bg'); document.getElementById('lemari')?.scrollIntoView({ behavior: 'smooth' }) }}><Palette size={15} /> Latar kartu</button>
            <button className="btn ink circle" onClick={downloadPng} aria-label="Unduh kartu"><Download size={16} /></button>
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
