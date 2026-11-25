import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RadialClock } from '../charts/Charts'
import { Bell, BellOff, CalendarPlus, Plus, Trash2, Bike, Wrench, Droplets, Sparkles } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Reminder, ReminderKind } from '../lib/types'
import { HARI, uid } from '../lib/util'
import { Sheet, Toggle, toast, Top } from '../components/UI'
import { askPermission, nextOccurrence, notifSupported, notify } from '../lib/notify'
import { download, remindersICS } from '../lib/ics'
import { useForecast } from '../lib/useForecast'
import { bestWindow } from '../lib/weather'

const KIND: Record<ReminderKind, { l: string; icon: ReactNode }> = {
  ride: { l: 'Jadwal gowes', icon: <Bike size={16} /> },
  maintenance: { l: 'Perawatan', icon: <Wrench size={16} /> },
  hydration: { l: 'Nutrisi & minum', icon: <Droplets size={16} /> },
  custom: { l: 'Lainnya', icon: <Bell size={16} /> },
}

export default function Reminders() {
  const { reminders, upsertReminder, deleteReminder, bikes, settings, groupRides } = useStore()
  const [dayOff, setDayOff] = useState(0)
  const [perm, setPerm] = useState<string>(notifSupported() ? Notification.permission : 'unsupported')
  const [edit, setEdit] = useState<Reminder | null>(null)
  const fc = useForecast(settings.home)
  const win = fc ? bestWindow(fc.hours, 2) : null

  const sorted = [...reminders].sort((a, b) => (nextOccurrence(a)?.getTime() ?? 9e15) - (nextOccurrence(b)?.getTime() ?? 9e15))
  const worn = bikes.flatMap((b) => b.components.filter((c) => c.usedKm / c.lifeKm > 0.85).map((c) => ({ b, c })))

  // Saran pintar
  const smart: { title: string; body: string; make: () => Reminder }[] = []
  if (win) {
    const h = win.start.getHours()
    const pre = new Date(win.start.getTime() - 45 * 60000)
    smart.push({
      title: `Cuaca terbaik ${String(h).padStart(2, '0')}.00 ${win.start.getDate() === new Date().getDate() ? 'hari ini' : 'besok'}`,
      body: `Skor ${win.score}. Pasang alarm 45 menit sebelumnya supaya sempat siap-siap.`,
      make: () => ({ id: uid(), kind: 'ride', title: `Siap-siap: jendela gowes terbaik ${String(h).padStart(2, '0')}.00`, time: `${String(pre.getHours()).padStart(2, '0')}:${String(pre.getMinutes()).padStart(2, '0')}`, days: [pre.getDay()], enabled: true }),
    })
  }
  worn.slice(0, 2).forEach(({ b, c }) => smart.push({
    title: `${c.name} di ${b.name.split('—')[0].trim()} sudah ${Math.round((c.usedKm / c.lifeKm) * 100)}%`,
    body: 'Jadwalkan ke bengkel Sabtu ini sebelum ride panjang.',
    make: () => ({ id: uid(), kind: 'maintenance', title: `Bawa sepeda ke bengkel: ganti ${c.name.toLowerCase()}`, time: '09:00', days: [6], enabled: true }),
  }))
  smart.push({
    title: 'Carbo-loading sebelum ride panjang',
    body: 'Malam sebelum ride ≥ 60 km: makan karbohidrat cukup & minum 500 ml.',
    make: () => ({ id: uid(), kind: 'hydration', title: 'Makan malam karbo + minum 500 ml (besok ride panjang)', time: '19:00', days: [6], enabled: true }),
  })

  async function enable() {
    const r = await askPermission()
    setPerm(r)
    if (r === 'granted') { notify('Notifikasi aktif 🚲', 'PACK akan mengingatkanmu sesuai jadwal.'); toast('Notifikasi aktif') }
    else toast('Izin notifikasi tidak diberikan. Gunakan ekspor kalender.')
  }

  return (
    <div className="fadein">
      <Top title="Pengingat" sub="Jadwal & perawatan" right={<button className="btn ink sm" onClick={() => setEdit({ id: uid(), kind: 'ride', title: '', time: '05:30', days: [6], enabled: true })}><Plus size={15} /> Baru</button>} />

      <DayDial dayOff={dayOff} setDayOff={setDayOff} reminders={reminders} groupRides={groupRides} fc={fc} />

      <div className="row-d section">
        <div className="stack">
          {perm !== 'granted' && (
            <div className="card accent">
              <div className="row between">
                <div><div className="b">Aktifkan notifikasi</div><div className="small" style={{ opacity: 0.85 }}>Supaya pengingat muncul walau app tidak dibuka di depan.</div></div>
                <button className="btn sm" style={{ background: '#fff', color: '#111' }} onClick={enable} disabled={perm === 'unsupported'}>{perm === 'unsupported' ? 'Tidak didukung' : 'Aktifkan'}</button>
              </div>
            </div>
          )}

          <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            <div className="list">
              {sorted.length === 0 && <div className="empty">Belum ada pengingat.</div>}
              {sorted.map((r) => {
                const n = nextOccurrence(r)
                return (
                  <div key={r.id} className={`li ${r.enabled ? '' : 'is-off'}`}>
                    <div className="ico" style={{ background: 'var(--sunken)' }}>{KIND[r.kind].icon}</div>
                    <div className="grow" onClick={() => setEdit(r)} style={{ cursor: 'pointer' }}>
                      <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                        <span className="dot" style={{ fontSize: 26 }}>{r.time.replace(':', '.')}</span>
                        <span className="mono">{r.days.length === 7 ? 'Setiap hari' : r.days.map((d) => HARI[d]).join(' ')}</span>
                      </div>
                      <div className="small" style={{ marginTop: 2 }}>{r.title}</div>
                      {n && r.enabled && <div className="tiny muted">Berikutnya: {n.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</div>}
                    </div>
                    <Toggle on={r.enabled} onChange={(v) => upsertReminder({ ...r, enabled: v })} label="Aktif" />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid2">
            <button className="btn ghost" onClick={() => { download('kayuh-pengingat.ics', remindersICS(reminders)); toast('File kalender diunduh, buka untuk menambahkan ke Google/Apple Calendar') }}><CalendarPlus size={16} /> Ekspor ke kalender</button>
            <button className="btn ghost" onClick={() => notify('Tes pengingat 🚲', 'Begini tampilan pengingat dari PACK.').then((ok) => !ok && toast('Aktifkan izin notifikasi dulu'))}><Bell size={16} /> Tes notifikasi</button>
          </div>
          <p className="tiny muted">Tips: ekspor ke kalender membuat pengingat tetap berbunyi walau browser ditutup — alarm dikelola oleh kalender HP-mu.</p>
        </div>

        <div className="stack" style={{ marginTop: 0 }}>
          <div className="section-h hide-d" style={{ marginTop: 18 }}><h3>Saran pintar</h3><Sparkles size={16} /></div>
          {smart.map((s, i) => (
            <div key={i} className={`card ${i === 0 ? 'ink' : ''}`}>
              <div className="b">{s.title}</div>
              <div className="small" style={{ opacity: 0.75, marginTop: 4 }}>{s.body}</div>
              <button className={`btn sm ${i === 0 ? 'accent' : 'ink'}`} style={{ marginTop: 12 }} onClick={() => { upsertReminder(s.make()); toast('Pengingat ditambahkan') }}><Plus size={14} /> Pasang pengingat</button>
            </div>
          ))}
        </div>
      </div>

      <EditSheet r={edit} onClose={() => setEdit(null)} onSave={(r) => { upsertReminder(r); setEdit(null); toast('Tersimpan') }} onDelete={(id) => { deleteReminder(id); setEdit(null) }} />
    </div>
  )
}

function Wheel({ value, max, step = 1, onChange }: { value: number; max: number; step?: number; onChange: (v: number) => void }) {
  const st = useRef<{ y: number; v: number } | null>(null)
  const wrap = (v: number) => ((v % (max + 1)) + (max + 1)) % (max + 1)
  const p = (v: number) => String(wrap(v)).padStart(2, '0')
  return (
    <div className="wheel" role="spinbutton" aria-valuenow={value} tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'ArrowUp') onChange(wrap(value + step)); if (e.key === 'ArrowDown') onChange(wrap(value - step)) }}
      onWheel={(e) => onChange(wrap(value + (e.deltaY > 0 ? step : -step)))}
      onPointerDown={(e) => { (e.currentTarget as Element).setPointerCapture(e.pointerId); st.current = { y: e.clientY, v: value } }}
      onPointerMove={(e) => { if (!st.current) return; const d = Math.round((st.current.y - e.clientY) / 28); onChange(wrap(st.current.v + d * step)) }}
      onPointerUp={() => (st.current = null)}>
      <span className="ghost" onClick={() => onChange(wrap(value - step))}>{p(value - step)}</span>
      <span className="cur">{p(value)}</span>
      <span className="ghost" onClick={() => onChange(wrap(value + step))}>{p(value + step)}</span>
    </div>
  )
}

function EditSheet({ r, onClose, onSave, onDelete }: { r: Reminder | null; onClose: () => void; onSave: (r: Reminder) => void; onDelete: (id: string) => void }) {
  const reminders = useStore((s) => s.reminders)
  const [x, setX] = useState<Reminder | null>(r)
  useEffect(() => setX(r), [r])
  if (!x) return null
  const exists = reminders.some((y) => y.id === x.id)
  const [h, m] = x.time.split(':').map(Number)
  const setTime = (hh: number, mm: number) => setX({ ...x, time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` })
  return (
    <Sheet open={!!r} onClose={onClose} className="yellowsheet">
      <div className="stack">
        <div className="row between"><h3 style={{ fontSize: 26 }}>{exists ? 'Ubah' : 'Buat'}</h3><span className="mono">{KIND[x.kind].l}</span></div>
        <div className="row" style={{ justifyContent: 'center', gap: 6, margin: '4px 0 0' }}>
          <Wheel value={h} max={23} onChange={(v) => setTime(v, m)} />
          <span className="cur" style={{ fontSize: 80, fontWeight: 300, paddingBottom: 6 }}>:</span>
          <Wheel value={m - (m % 5)} max={55} step={5} onChange={(v) => setTime(h, v)} />
        </div>
        <div style={{ height: 3, background: 'rgba(0,0,0,.12)', borderRadius: 9, position: 'relative', margin: '0 30px' }}><i style={{ position: 'absolute', left: `${((h * 60 + m) / 1440) * 100}%`, top: -6, width: 3, height: 15, background: '#ff3b1f', borderRadius: 2 }} /></div>
        <div className="chips" style={{ justifyContent: 'center' }}>{(Object.keys(KIND) as ReminderKind[]).map((k) => <button key={k} className={`chip ${x.kind === k ? 'on' : ''}`} style={{ borderColor: 'rgba(0,0,0,.2)' }} onClick={() => setX({ ...x, kind: k })}>{KIND[k].l}</button>)}</div>
        <input className="input" style={{ background: 'rgba(255,255,255,.55)', border: 0 }} value={x.title} placeholder="mis. Gowes pagi ke CFD" onChange={(e) => setX({ ...x, title: e.target.value })} />
        <div className="daypick" style={{ justifyContent: 'center' }}>{HARI.map((hh, i) => <button key={hh} style={{ borderColor: 'rgba(0,0,0,.2)' }} className={x.days.includes(i) ? 'on' : ''} onClick={() => setX({ ...x, days: x.days.includes(i) ? x.days.filter((d) => d !== i) : [...x.days, i].sort() })}>{hh}</button>)}</div>
        <div className="row between" style={{ marginTop: 10 }}>
          <button className="btn circle" style={{ background: 'rgba(0,0,0,.08)' }} aria-label={exists ? 'Hapus' : 'Batal'} onClick={() => (exists ? onDelete(x.id) : onClose())}>{exists ? <Trash2 size={18} /> : <BellOff size={18} />}</button>
          <span className="mono">{x.days.length ? `${x.days.length} hari / minggu` : 'Pilih hari'}</span>
          <button className="btn ink circle" aria-label="Simpan" disabled={!x.title.trim() || !x.days.length} onClick={() => onSave(x)}>✓</button>
        </div>
      </div>
    </Sheet>
  )
}

function DayDial({ dayOff, setDayOff, reminders, groupRides, fc }: { dayOff: number; setDayOff: (n: number) => void; reminders: Reminder[]; groupRides: { id: string; title: string; datetime: string }[]; fc: ReturnType<typeof useForecast> }) {
  const d = new Date(); d.setDate(d.getDate() + dayOff)
  const dow = d.getDay()
  const rs = reminders.filter((r) => r.enabled && r.days.includes(dow))
  const gs = groupRides.filter((g) => new Date(g.datetime).toDateString() === d.toDateString())
  const dayHours = fc?.hours.filter((h) => h.time.toDateString() === d.toDateString()) ?? []
  const win = dayHours.length ? bestWindow(dayHours, 2) : null
  const sr = 5.7, ss = 17.85
  const toH = (t: string) => { const [a, b] = t.split(':').map(Number); return a + b / 60 }
  const nextR = [...rs].sort((a, b) => toH(a.time) - toH(b.time)).find((r) => dayOff > 0 || toH(r.time) > new Date().getHours() + new Date().getMinutes() / 60)
  return (
    <div className="card dial-card">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="display" style={{ fontSize: 26 }}>{dayOff === 0 ? 'Harimu' : HARI_LONG[dow]}</div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
              <div><div className="mono" style={{ fontSize: 8 }}>{HARI[dow]}</div><div className="num" style={{ fontSize: 22 }}>{d.getDate()}</div></div>
            </div>
            {win && <span className="tag accent">☀ {String(win.start.getHours()).padStart(2, '0')}–{String(win.end.getHours()).padStart(2, '0')} terbaik</span>}
          </div>
        </div>
        <div className="legend" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <span><i style={{ background: 'var(--yellow)', height: 6 }} />Terang</span>
          <span><i style={{ background: 'var(--accent)', height: 6 }} />Cuaca terbaik</span>
        </div>
      </div>
      <div style={{ display: 'grid', placeItems: 'center', margin: '8px 0' }}>
        <RadialClock size={290} now={dayOff === 0}
          arcs={[{ from: sr, to: ss, color: 'color-mix(in srgb, var(--yellow) 70%, transparent)' }, ...(win ? [{ from: win.start.getHours(), to: win.end.getHours(), color: 'var(--accent)' }] : [])]}
          pins={[...rs.map((r) => ({ h: toH(r.time), label: `${r.time.replace(':', '.')} ${r.kind === 'ride' ? '🚲' : r.kind === 'maintenance' ? '🔧' : r.kind === 'hydration' ? '💧' : '⏰'}`, dark: true })), ...gs.map((g) => ({ h: new Date(g.datetime).getHours() + new Date(g.datetime).getMinutes() / 60, label: '👥 ' + g.title.split(' ')[0], color: '#d2441c' }))]}
          center={nextR ? <div><div className="mono">berikutnya</div><div className="dot" style={{ fontSize: 40, marginTop: 4 }}>{nextR.time.replace(':', '.')}</div><div className="tiny muted" style={{ maxWidth: 130, margin: '4px auto 0' }}>{nextR.title}</div></div> : <div><div className="mono">kosong</div><div className="tiny muted">Tidak ada pengingat</div></div>} />
      </div>
      <div className="row" style={{ justifyContent: 'space-between', gap: 4 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const x = new Date(); x.setDate(x.getDate() + i)
          const has = reminders.some((r) => r.enabled && r.days.includes(x.getDay())) || groupRides.some((g) => new Date(g.datetime).toDateString() === x.toDateString())
          return (
            <button key={i} onClick={() => setDayOff(i)} style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${dayOff === i ? 'var(--accent)' : 'var(--line)'}`, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', padding: 0, position: 'relative' }}>
              <span><span className="mono" style={{ fontSize: 7.5, display: 'block', color: dayOff === i ? 'var(--ink)' : undefined, fontWeight: dayOff === i ? 700 : undefined }}>{HARI[x.getDay()]}</span><span style={{ fontWeight: 600, fontSize: 14 }}>{x.getDate()}</span></span>
              {has && <i style={{ position: 'absolute', bottom: -6, width: 5, height: 5, borderRadius: 9, background: 'var(--accent)' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const HARI_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
