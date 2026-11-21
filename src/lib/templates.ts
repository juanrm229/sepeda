import type { RoutePlan } from './types'
import { uid } from './util'

export interface RouteTemplate { id: string; name: string; tag: string; level: 'Santai' | 'Sedang' | 'Berat'; emoji: string; desc: string; hour: number; plan: Omit<RoutePlan, 'id' | 'startTime'> }

/** Rute klasik Jabodetabek siap pakai — checkpoint & coffee break sudah diatur. */
export const TEMPLATES: RouteTemplate[] = [
  {
    id: 't-kotatua', name: 'Coffee Ride Kota Tua', tag: 'Datar · kopi', level: 'Santai', emoji: '☕', hour: 5, desc: 'Sudirman–Thamrin, foto di Monas, ngopi di Kota Tua, intip kapal pinisi Sunda Kelapa.',
    plan: { name: 'Coffee Ride Kota Tua', speed: 20, finish: null, start: { name: 'Bundaran HI', pos: [-6.1950, 106.8230] }, checkpoints: [
      { id: 'a1', name: 'Foto di Monas', pos: [-6.1754, 106.8272], kind: 'foto', stopMin: 10 },
      { id: 'a2', name: 'Ngopi di Taman Fatahillah', pos: [-6.1352, 106.8133], kind: 'kopi', stopMin: 30 },
      { id: 'a3', name: 'Pelabuhan Sunda Kelapa', pos: [-6.1240, 106.8095], kind: 'foto', stopMin: 10 },
    ] },
  },
  {
    id: 't-pancar', name: 'Sentul – Gunung Pancar', tag: 'Nanjak · ±1.000 m', level: 'Berat', emoji: '⛰️', hour: 5, desc: 'Tanjakan legendaris Sentul, rehat di Bukit Pelangi, kopi panas di hutan pinus Gunung Pancar.',
    plan: { name: 'Sentul – Gunung Pancar', speed: 17, finish: null, start: { name: 'Sentul Circuit', pos: [-6.5410, 106.8590] }, checkpoints: [
      { id: 'b1', name: 'Rehat Bukit Pelangi', pos: [-6.5880, 106.8820], kind: 'rehat', stopMin: 10 },
      { id: 'b2', name: 'Kopi di Gunung Pancar', pos: [-6.5905, 106.9050], kind: 'kopi', stopMin: 30 },
      { id: 'b3', name: 'Isi air Babakan Madang', pos: [-6.5700, 106.8800], kind: 'air', stopMin: 5 },
    ] },
  },
  {
    id: 't-pik', name: 'PIK Sunset Ride', tag: 'Datar · pantai', level: 'Sedang', emoji: '🌅', hour: 15, desc: 'Dari Senayan ke pesisir utara, kopi sambil menunggu matahari terbenam di PIK.',
    plan: { name: 'PIK Sunset Ride', speed: 23, finish: null, start: { name: 'GBK Senayan', pos: [-6.2186, 106.8026] }, checkpoints: [
      { id: 'c1', name: 'Isi air Grogol', pos: [-6.1670, 106.7900], kind: 'air', stopMin: 5 },
      { id: 'c2', name: 'Coffee break PIK', pos: [-6.1095, 106.7395], kind: 'kopi', stopMin: 35 },
    ] },
  },
  {
    id: 't-ancol', name: 'Monas – Ancol', tag: 'Datar · pemula', level: 'Santai', emoji: '🌊', hour: 6, desc: 'Rute pemula paling aman: Monas ke pantai Ancol, sarapan, lalu pulang santai.',
    plan: { name: 'Monas – Ancol', speed: 18, finish: null, start: { name: 'Monas (Silang Barat Daya)', pos: [-6.1780, 106.8230] }, checkpoints: [
      { id: 'd1', name: 'Sarapan di Ancol', pos: [-6.1225, 106.8350], kind: 'makan', stopMin: 35 },
    ] },
  },
  {
    id: 't-puncak', name: 'Puncak Klasik', tag: 'Nanjak · 1.400 mdpl', level: 'Berat', emoji: '🍵', hour: 4, desc: 'Ciawi ke Puncak Pass melewati kebun teh Gunung Mas. Makan siang di atas awan.',
    plan: { name: 'Puncak Klasik', speed: 15, finish: null, start: { name: 'Simpang Ciawi', pos: [-6.6550, 106.8460] }, checkpoints: [
      { id: 'e1', name: 'Rehat Gadog', pos: [-6.6590, 106.8700], kind: 'rehat', stopMin: 10 },
      { id: 'e2', name: 'Kebun teh Gunung Mas', pos: [-6.7050, 106.9850], kind: 'foto', stopMin: 15 },
      { id: 'e3', name: 'Makan di Puncak Pass', pos: [-6.7020, 107.0060], kind: 'makan', stopMin: 45 },
    ] },
  },
]

export function fromTemplate(t: RouteTemplate): RoutePlan {
  const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); d.setHours(t.hour, t.hour === 15 ? 30 : 0, 0, 0)
  return { ...t.plan, id: uid(), startTime: d.toISOString(), checkpoints: t.plan.checkpoints.map((c) => ({ ...c, id: uid() })) }
}
