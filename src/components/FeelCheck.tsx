import { useState } from 'react'
import { X, Info, ArrowRight } from 'lucide-react'
import { FeelFace, feelLabel, DetentSlider } from './Character'

/** Layar cek-rasa ala referensi “How was your experience?” */
export function FeelCheck({ open, initial = 0.7, initialRpe = 6, onClose, onSave }: { open: boolean; initial?: number; initialRpe?: number; onClose: () => void; onSave: (feel: number, rpe: number) => void }) {
  const [v, setV] = useState(initial)
  const [rpe, setRpe] = useState((initialRpe - 1) / 9)
  const [info, setInfo] = useState(false)
  if (!open) return null
  const rpeN = Math.round(1 + rpe * 9)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'var(--lime)', color: 'var(--lime-ink)', display: 'flex', flexDirection: 'column', padding: 'calc(16px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))', animation: 'up .3s' }} role="dialog" aria-modal>
      <div className="row between">
        <button className="iconbtn" style={{ background: 'rgba(0,0,0,.08)', color: 'inherit' }} onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        <button className="iconbtn" style={{ background: 'rgba(0,0,0,.08)', color: 'inherit' }} onClick={() => setInfo(!info)} aria-label="Info"><Info size={18} /></button>
      </div>
      <div style={{ maxWidth: 440, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 500, marginTop: 12, letterSpacing: '-0.01em' }}>Gimana rasanya ride tadi?</div>
        {info && <div className="small" style={{ textAlign: 'center', marginTop: 8, opacity: 0.75 }}>Kayuh mencocokkan rasa ini dengan Form-mu untuk menemukan “titik manis” — kondisi saat kamu paling menikmati gowes.</div>}
        <div style={{ display: 'grid', placeItems: 'center', marginTop: 18 }}><FeelFace v={v} size={Math.min(300, window.innerWidth - 60)} /></div>
        <div className="display" style={{ textAlign: 'center', fontSize: 64, opacity: 0.55, marginTop: 4 }}>{feelLabel(v)}</div>
        <div style={{ marginTop: 18 }}>
          <DetentSlider value={v} onChange={setV} labels={['Berat', 'Lumayan', 'Mantap']} accent="var(--lime-ink)" track="rgba(0,0,0,.08)" thumb={<svg width="16" height="10" viewBox="0 0 16 10"><path d="M2,2 Q8,10 14,2" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>} />
        </div>
        <div style={{ marginTop: 26 }}>
          <div className="row between"><span className="mono" style={{ color: 'inherit', opacity: 0.7 }}>Seberapa berat (RPE)</span><span className="dot" style={{ fontSize: 26 }}>{rpeN}<span style={{ opacity: 0.4 }}>/10</span></span></div>
          <div style={{ marginTop: 8 }}><DetentSlider value={rpe} onChange={setRpe} labels={['Santai', 'Sedang', 'Maks']} accent="#d2441c" track="rgba(0,0,0,.08)" /></div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="row" style={{ background: 'rgba(0,0,0,.07)', borderRadius: 999, padding: 6, marginTop: 20 }}>
          <span style={{ flex: 1, paddingLeft: 14, opacity: 0.6 }}>Bantu pelatihmu belajar</span>
          <button className="btn" style={{ background: 'var(--lime-ink)', color: 'var(--lime)' }} onClick={() => onSave(+v.toFixed(2), rpeN)}>Simpan <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  )
}
