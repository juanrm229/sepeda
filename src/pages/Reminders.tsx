import { useEffect, useState, type ReactNode } from 'react'
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
  const { reminders, upsertReminder, deleteReminder, bikes, settings } = useStore()
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
    if (r === 'granted') { notify('Notifikasi aktif 🚲', 'Kayuh akan mengingatkanmu sesuai jadwal.'); toast('Notifikasi aktif') }
    else toast('Izin notifikasi tidak diberikan. Gunakan ekspor kalender.')
  }

  return (
    <div className="fadein">
      <Top title="Pengingat" sub="Jadwal & perawatan" right={<button className="btn ink sm" onClick={() => setEdit({ id: uid(), kind: 'ride', title: '', time: '05:30', days: [6], enabled: true })}><Plus size={15} /> Baru</button>} />

      <div className="row-d">
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
                  <div key={r.id} className="li" style={{ opacity: r.enabled ? 1 : 0.5 }}>
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
            <button className="btn ghost" onClick={() => notify('Tes pengingat 🚲', 'Begini tampilan pengingat dari Kayuh.').then((ok) => !ok && toast('Aktifkan izin notifikasi dulu'))}><Bell size={16} /> Tes notifikasi</button>
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

function EditSheet({ r, onClose, onSave, onDelete }: { r: Reminder | null; onClose: () => void; onSave: (r: Reminder) => void; onDelete: (id: string) => void }) {
  const [x, setX] = useState<Reminder | null>(r)
  useEffect(() => setX(r), [r])
  if (!x) return null
  const exists = useStore.getState().reminders.some((y) => y.id === x.id)
  return (
    <Sheet open={!!r} onClose={onClose} title={exists ? 'Ubah pengingat' : 'Pengingat baru'}>
      <div className="stack">
        <div className="chips">{(Object.keys(KIND) as ReminderKind[]).map((k) => <button key={k} className={`chip ${x.kind === k ? 'on' : ''}`} onClick={() => setX({ ...x, kind: k })}>{KIND[k].l}</button>)}</div>
        <label className="field"><span className="mono">Judul</span><input className="input" value={x.title} placeholder="mis. Gowes pagi ke CFD" onChange={(e) => setX({ ...x, title: e.target.value })} /></label>
        <label className="field"><span className="mono">Jam</span><input className="input" type="time" value={x.time} onChange={(e) => setX({ ...x, time: e.target.value })} /></label>
        <div className="field"><span className="mono">Hari</span>
          <div className="daypick">{HARI.map((h, i) => <button key={h} className={x.days.includes(i) ? 'on' : ''} onClick={() => setX({ ...x, days: x.days.includes(i) ? x.days.filter((d) => d !== i) : [...x.days, i].sort() })}>{h}</button>)}</div>
        </div>
        <div className="grid2" style={{ marginTop: 6 }}>
          {exists ? <button className="btn ghost" style={{ color: 'var(--bad)' }} onClick={() => onDelete(x.id)}><Trash2 size={16} /> Hapus</button> : <button className="btn ghost" onClick={onClose}><BellOff size={16} /> Batal</button>}
          <button className="btn ink" disabled={!x.title.trim() || !x.days.length} onClick={() => onSave(x)}>Simpan</button>
        </div>
      </div>
    </Sheet>
  )
}
