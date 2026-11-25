/** Logo PACK: huruf P yang lengkungnya pin lokasi, titik oranye = titik kumpul. */
export function LogoMark({ size = 32, invert = false, animate = false }: { size?: number; invert?: boolean; animate?: boolean }) {
  const bg = invert ? '#ffffff' : '#0d0d0d'
  const fg = invert ? '#0d0d0d' : '#ffffff'
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden className={animate ? 'logo-anim' : undefined} style={{ display: 'block', flexShrink: 0 }}>
      <rect width="512" height="512" rx="120" fill={bg} />
      <g transform="translate(-6 -6)">
        <path className="lg-stem" d="M176 150 V392" stroke={fg} strokeWidth="72" strokeLinecap="round" fill="none" />
        <circle className="lg-ring" cx="262" cy="216" r="86" stroke={fg} strokeWidth="72" fill="none" />
        <circle className="lg-dot" cx="262" cy="216" r="27" fill="#ff5a1f" />
      </g>
    </svg>
  )
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return <span className="wordmark" style={{ fontSize: size }}>PACK<i /></span>
}

export function Logo({ size = 30 }: { size?: number }) {
  return <span className="brand"><LogoMark size={size} /><Wordmark size={size * 0.72} /></span>
}
