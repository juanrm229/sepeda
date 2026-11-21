import { useEffect, type ReactNode } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from '../lib/types'
import { useStore } from '../lib/store'

export function useTheme(): 'dark' | 'light' {
  return useStore((s) => s.settings.theme)
}

export function BaseMap({ center, zoom = 13, children, className = 'map', onClick, fit }: { center: LatLng; zoom?: number; children?: ReactNode; className?: string; onClick?: (p: LatLng) => void; fit?: LatLng[] }) {
  const theme = useTheme()
  const url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  return (
    <div className={`${className} tiles-${theme}`}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl>
        <TileLayer key={theme} url={url} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' maxZoom={19} />
        {onClick && <ClickHandler onClick={onClick} />}
        {fit && fit.length > 0 && <Fit pts={fit} />}
        {children}
      </MapContainer>
    </div>
  )
}

function ClickHandler({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick([e.latlng.lat, e.latlng.lng]) })
  return null
}

function Fit({ pts }: { pts: LatLng[] }) {
  const map = useMap()
  const key = pts.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (pts.length === 1) map.setView(pts[0], Math.max(map.getZoom(), 14))
    else map.fitBounds(L.latLngBounds(pts), { padding: [36, 36] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}

export function Follow({ pos }: { pos: LatLng | null }) {
  const map = useMap()
  useEffect(() => { if (pos) map.panTo(pos, { animate: true }) }, [pos, map])
  return null
}

const icon = (html: string, size: number, anchor?: [number, number]) =>
  L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: anchor ?? [size / 2, size / 2] })

export function PersonPin({ pos, label, color, size = 34, onClick }: { pos: LatLng; label: string; color: string; size?: number; onClick?: () => void }) {
  return <Marker position={pos} icon={icon(`<div class="pin" style="width:${size}px;height:${size}px;background:${color}">${label}</div>`, size)} eventHandlers={onClick ? { click: onClick } : undefined} />
}

export function MeetPin({ pos, label = '★', draggable, onDrag }: { pos: LatLng; label?: string; draggable?: boolean; onDrag?: (p: LatLng) => void }) {
  return (
    <Marker position={pos} draggable={draggable} zIndexOffset={1000}
      icon={icon(`<div class="pin meet" style="width:40px;height:40px"><span>${label}</span></div>`, 40, [20, 44])}
      eventHandlers={onDrag ? { dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onDrag([ll.lat, ll.lng]) } } : undefined} />
  )
}

export function SmallPin({ pos, color = '#111', onClick }: { pos: LatLng; color?: string; onClick?: () => void }) {
  return <Marker position={pos} icon={icon(`<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`, 14)} eventHandlers={onClick ? { click: onClick } : undefined} />
}

export function LivePin({ pos }: { pos: LatLng }) {
  return <Marker position={pos} icon={icon('<div class="pulse"></div>', 18)} zIndexOffset={900} />
}

export function Route({ track, color = '#ff4d1f', weight = 4, dash }: { track: LatLng[]; color?: string; weight?: number; dash?: string }) {
  return <Polyline positions={track} pathOptions={{ color, weight, lineCap: 'round', lineJoin: 'round', dashArray: dash }} />
}

export function Ring({ center, km, color = '#ff4d1f' }: { center: LatLng; km: number; color?: string }) {
  return <Circle center={center} radius={km * 1000} pathOptions={{ color, weight: 1, fillOpacity: 0.06, dashArray: '4 6' }} />
}
