import type { GroupRide, Reminder } from './types'

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const esc = (s: string) => s.replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n')

function wrap(events: string[]) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PACK//ID', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n')
}

export function groupRideICS(g: GroupRide): string {
  const start = new Date(g.datetime)
  const hours = Math.max(1, g.distanceKm / (g.pace === 'kencang' ? 28 : g.pace === 'sedang' ? 24 : 20))
  const end = new Date(start.getTime() + (hours + 0.5) * 3600000)
  const ev = [
    'BEGIN:VEVENT', `UID:${g.id}@kayuh`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc('🚲 ' + g.title)}`, `LOCATION:${esc(g.meet.name)}`, `GEO:${g.meet.pos[0]};${g.meet.pos[1]}`,
    `DESCRIPTION:${esc(`${g.distanceKm} km · pace ${g.pace}${g.route ? '\nRute: ' + g.route : ''}${g.notes ? '\n' + g.notes : ''}\nMaps: https://maps.google.com/?q=${g.meet.pos[0]},${g.meet.pos[1]}`)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT12H', 'ACTION:DISPLAY', 'DESCRIPTION:Siapkan sepeda & cas lampu malam ini', 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Berangkat ke meet point', 'END:VALARM',
    'END:VEVENT',
  ]
  return wrap(ev)
}

export function remindersICS(list: Reminder[]): string {
  const events = list.filter((r) => r.enabled && r.days.length).map((r) => {
    const [h, m] = r.time.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    while (!r.days.includes(d.getDay())) d.setDate(d.getDate() + 1)
    const end = new Date(d.getTime() + 15 * 60000)
    return ['BEGIN:VEVENT', `UID:${r.id}@kayuh`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`, `RRULE:FREQ=WEEKLY;BYDAY=${r.days.map((x) => BYDAY[x]).join(',')}`, `SUMMARY:${esc(r.title)}`, 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(r.title)}`, 'END:VALARM', 'END:VEVENT'].join('\r\n')
  })
  return wrap(events)
}

export function download(name: string, content: string, type = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function gpx(name: string, track: [number, number][], startIso: string): string {
  const t0 = new Date(startIso).getTime()
  const pts = track.map(([la, lo], i) => `<trkpt lat="${la.toFixed(6)}" lon="${lo.toFixed(6)}"><time>${new Date(t0 + i * 30000).toISOString()}</time></trkpt>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="PACK" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${name.replace(/[<&]/g, '')}</name><trkseg>${pts}</trkseg></trk></gpx>`
}
