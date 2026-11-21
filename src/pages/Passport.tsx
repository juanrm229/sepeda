import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { stamps, type Stamp } from '../lib/passport'
import { fmtDate } from '../lib/util'
import { Sheet, Top } from '../components/UI'
import { BaseMap, SmallPin } from '../components/Map'
import { HeadSticker } from '../components/Character'
import { go } from '../lib/router'

function StampArt({ s, size = 120, i = 0 }: { s: Stamp; size?: number; i?: number }) {
  const got = !!s.date
  const col = got ? s.lm.color : 'var(--muted)'
  const id = `sp-${s.lm.id}-${size}`
  const rot = [-8, 6, -3, 9, -6, 4, -10, 7, -4, 5][i % 10]
  return (
    <svg viewBox="-60 -60 120 120" width={size} height={size} style={{ transform: `rotate(${got ? rot : 0}deg)`, opacity: got ? 1 : 0.55, mixBlendMode: got ? 'multiply' : undefined }} className={got ? 'pop' : undefined} aria-label={s.lm.name}>
      <defs><path id={id} d="M-38,0 A38,38 0 1,1 38,0 A38,38 0 1,1 -38,0" /></defs>
      <circle r={54} fill="none" stroke={col} strokeWidth={got ? 3.5 : 2} strokeDasharray={got ? undefined : '5 5'} />
      <circle r={47} fill="none" stroke={col} strokeWidth={1.5} />
      <circle r={29} fill={got ? `color-mix(in srgb, ${s.lm.color} 14%, transparent)` : 'transparent'} stroke={col} strokeWidth={1.5} />
      <text fontSize={10} fontWeight={800} letterSpacing={2} fill={col} fontFamily="var(--f-mono)"><textPath href={`#${id}`} startOffset="0%">{(s.lm.name + ' • ' + s.lm.area + ' • ').toUpperCase()}</textPath></text>
      <text y={got ? 4 : 9} textAnchor="middle" fontSize={got ? 22 : 26} style={{ filter: got ? undefined : 'grayscale(1)' }}>{got ? s.lm.emoji : '?'}</text>
      {got && <text y={20} textAnchor="middle" fontSize={6.5} fill={col} fontFamily="var(--f-mono)" fontWeight={700}>{new Date(s.date!).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()}</text>}
    </svg>
  )
}

export default function Passport() {
  const { rides, char, settings } = useStore()
  const list = useMemo(() => stamps(rides), [rides])
  const got = list.filter((s) => s.date).length
  const [open, setOpen] = useState<Stamp | null>(null)
  const RAR = { umum: 'Umum', langka: 'Langka', legenda: 'Legenda' }
  return (
    <div className="fadein">
      <Top title="Paspor" sub="Stempel landmark" back />
      <div className="card passport">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="mono">Republik Pesepeda · Kayuh</div>
            <div className="display" style={{ fontSize: 30, marginTop: 4 }}>Paspor {settings.name}</div>
            <div className="small" style={{ marginTop: 4, opacity: 0.8 }}>{got} dari {list.length} landmark distempel</div>
          </div>
          <HeadSticker c={char} mood={got >= 6 ? 'semangat' : 'segar'} size={64} tilt={6} bg="#f6f0e0" />
        </div>
        <div className="meter dots" style={{ marginTop: 14 }}>{list.map((s) => <i key={s.lm.id} className={s.date ? 'a' : ''} />)}</div>
        <div className="mono" style={{ marginTop: 8 }}>{got >= 6 ? '✪ Lencana Penjelajah Paspor terbuka — item Visor siap dipakai' : `${6 - got} stempel lagi untuk Lencana Penjelajah Paspor`}</div>
      </div>

      <div className="stamps section">
        {list.map((s, i) => (
          <button key={s.lm.id} className="stamp-tile" onClick={() => setOpen(s)} aria-label={`${s.lm.name}${s.date ? ', sudah distempel' : ', belum'}`}>
            <StampArt s={s} i={i} size={112} />
            <div className="b small" style={{ marginTop: 4 }}>{s.lm.name}</div>
            <div className={`tag ${s.lm.rarity === 'legenda' ? 'accent' : s.lm.rarity === 'langka' ? 'ink' : ''}`} style={{ marginTop: 4 }}>{RAR[s.lm.rarity]}</div>
          </button>
        ))}
      </div>

      <div className="card section">
        <div className="mono" style={{ marginBottom: 10 }}>Peta landmark</div>
        <BaseMap center={[-6.35, 106.86]} zoom={9} className="map" fit={list.map((s) => s.lm.pos)}>
          {list.map((s) => <SmallPin key={s.lm.id} pos={s.lm.pos} color={s.date ? s.lm.color : '#9a9a95'} onClick={() => setOpen(s)} />)}
        </BaseMap>
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)}>
        {open && (
          <div className="stack" style={{ textAlign: 'center' }}>
            <div style={{ display: 'grid', placeItems: 'center' }}><StampArt s={open} size={180} /></div>
            <h3 className="display" style={{ fontSize: 28 }}>{open.lm.name}</h3>
            <div className="small muted">{open.lm.area} · {RAR[open.lm.rarity]}</div>
            {open.date ? (
              <>
                <p className="small ink2">Distempel {fmtDate(open.date)}. Mantap!</p>
                {open.rideId && <button className="btn ink" onClick={() => go('ride/' + open.rideId)}>Lihat ride-nya</button>}
              </>
            ) : (
              <>
                <p className="small ink2">Cara dapat: {open.lm.hint}. Lewati dalam radius ~1 km saat merekam ride.</p>
                <div className="grid2">
                  <a className="btn ghost" href={`https://www.google.com/maps/dir/?api=1&destination=${open.lm.pos[0]},${open.lm.pos[1]}&travelmode=bicycling`} target="_blank" rel="noreferrer">Navigasi</a>
                  <button className="btn accent" onClick={() => go('rute')}>Rencanakan rute</button>
                </div>
              </>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}
