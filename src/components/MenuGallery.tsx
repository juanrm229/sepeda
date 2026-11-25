import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, ChevronLeft, ChevronRight, Loader2, Trash2, X } from 'lucide-react'
import type { LatLng } from '../lib/types'
import { addMenus, deleteMenu, useMenus } from '../lib/menus'
import { confirmDialog, toast } from './UI'

/** Foto menu kafe: unggah sekali, dipakai lagi tiap ngopi di sana. */
export function MenuGallery({ name, pos, big }: { name: string; pos?: LatLng; big?: boolean }) {
  const { list, key, reload } = useMenus(name, pos)
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    try { const n = await addMenus(key, name, files); toast(`📸 ${n} foto menu disimpan`, `Muncul lagi tiap ngopi di ${name}`); await reload() } catch { toast('Gagal menyimpan foto', 'Browser menolak penyimpanan lokal') }
    setBusy(false)
    if (input.current) input.current.value = ''
  }

  const h = big ? 132 : 84
  return (
    <div>
      <div className="menu-strip" style={{ gridAutoColumns: h * 0.78 }}>
        {list.map((m, i) => (
          <button key={m.id} className="menu-thumb" style={{ height: h }} onClick={() => setView(i)} aria-label={`Foto menu ${i + 1}`}>
            <img src={m.data} alt="" loading="lazy" />
          </button>
        ))}
        <button className="menu-thumb add" style={{ height: h }} onClick={() => input.current?.click()} disabled={busy} aria-label="Tambah foto menu">
          {busy ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
          <span>{list.length ? 'Tambah' : 'Foto menu'}</span>
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {!list.length && <p className="tiny muted" style={{ marginTop: 6 }}>Belum ada foto menu {name}. Foto sekali, semua squad bisa lihat sebelum nitip (tersimpan di HP ini).</p>}
      {view != null && list[view] && <Lightbox photos={list.map((x) => x.data)} start={view} title={name} onClose={() => setView(null)} onDelete={async (i) => { if (await confirmDialog('Hapus foto menu ini?', { ok: 'Hapus', danger: true })) { await deleteMenu(list[i].id); await reload(); setView(null) } }} />}
    </div>
  )
}

function Lightbox({ photos, start, title, onClose, onDelete }: { photos: string[]; start: number; title: string; onClose: () => void; onDelete: (i: number) => void }) {
  const [i, setI] = useState(start)
  const [zoom, setZoom] = useState(false)
  const x0 = useRef<number | null>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI((v) => Math.min(photos.length - 1, v + 1)); if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1)) }
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [photos.length, onClose])
  return createPortal(
    <div className="lightbox" role="dialog" aria-modal aria-label={`Menu ${title}`}
      onPointerDown={(e) => { x0.current = e.clientX }} onPointerUp={(e) => { if (x0.current == null || zoom) return; const dx = e.clientX - x0.current; if (Math.abs(dx) > 50) setI((v) => Math.max(0, Math.min(photos.length - 1, v + (dx < 0 ? 1 : -1)))); x0.current = null }}>
      <div className="row between lb-top">
        <span><b>{title}</b><span className="mono" style={{ color: 'rgba(255,255,255,.6)', marginLeft: 8 }}>{i + 1}/{photos.length}</span></span>
        <span className="row" style={{ gap: 8 }}>
          <button className="lb-btn" onClick={() => onDelete(i)} aria-label="Hapus foto"><Trash2 size={17} /></button>
          <button className="lb-btn" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </span>
      </div>
      <div className={`lb-img ${zoom ? 'zoom' : ''}`} onClick={() => setZoom(!zoom)}>
        <img key={i} src={photos[i]} alt={`Menu ${title} ${i + 1}`} />
      </div>
      {photos.length > 1 && <>
        <button className="lb-nav l" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="Sebelumnya"><ChevronLeft size={22} /></button>
        <button className="lb-nav r" disabled={i === photos.length - 1} onClick={() => setI(i + 1)} aria-label="Berikutnya"><ChevronRight size={22} /></button>
      </>}
      <p className="lb-hint">Ketuk untuk zoom · geser untuk foto lain</p>
    </div>,
    document.body,
  )
}
