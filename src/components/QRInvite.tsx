import { useState } from 'react'
import { QrCode } from 'lucide-react'
import qrcode from 'qrcode-generator'
import { Sheet } from './UI'

/** QR undangan — untuk yang baru gabung langsung di titik kumpul. */
export function QRInvite({ link, title }: { link: string; title: string }) {
  const [open, setOpen] = useState(false)
  let svg = ''
  if (open) { try { const q = qrcode(0, 'L'); q.addData(link); q.make(); svg = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) } catch { svg = '' } }
  return (
    <>
      <button className="btn ghost" onClick={() => setOpen(true)}><QrCode size={16} /> QR undangan</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Scan untuk gabung">
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          {svg ? <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="small muted">Link terlalu panjang untuk QR.</p>}
          <div className="b">{title}</div>
          <p className="small muted">Tunjukkan di titik kumpul. Yang scan langsung bisa jawab, voting & nitip kopi tanpa install.</p>
        </div>
      </Sheet>
    </>
  )
}
