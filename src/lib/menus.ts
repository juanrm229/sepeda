import { useCallback, useEffect, useState } from 'react'
import type { LatLng } from './types'

/* =====================================================================
   Foto menu kafe — disimpan di IndexedDB (bukan localStorage, karena
   besar), dikompres ke ±1400 px JPEG. Kunci = nama + posisi dibulatkan,
   jadi foto menu dipakai ulang setiap kali ngopi di tempat yang sama.
   ===================================================================== */

export interface MenuPhoto { id: string; placeKey: string; placeName: string; data: string; w: number; h: number; at: string }

const DB = 'pack-media', STORE = 'menus'
export const placeKey = (name: string, pos?: LatLng) => `${name.trim().toLowerCase().replace(/\s+/g, ' ')}@${pos ? pos.map((x) => x.toFixed(3)).join(',') : ''}`

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (!('indexedDB' in window)) return rej(new Error('no-idb'))
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => { const s = r.result.createObjectStore(STORE, { keyPath: 'id' }); s.createIndex('placeKey', 'placeKey') }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((res, rej) => { const t = db.transaction(STORE, mode); const q = fn(t.objectStore(STORE)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error) })
}

export async function listMenus(key: string): Promise<MenuPhoto[]> {
  try { return ((await tx('readonly', (s) => s.index('placeKey').getAll(key))) as MenuPhoto[]).sort((a, b) => a.at.localeCompare(b.at)) } catch { return [] }
}
export async function allMenuCounts(): Promise<Record<string, number>> {
  try {
    const all = (await tx('readonly', (s) => s.getAll())) as MenuPhoto[]
    return all.reduce<Record<string, number>>((m, x) => { m[x.placeKey] = (m[x.placeKey] ?? 0) + 1; m[x.placeName.trim().toLowerCase()] = (m[x.placeName.trim().toLowerCase()] ?? 0) + 1; return m }, {})
  } catch { return {} }
}
export async function deleteMenu(id: string) { try { await tx('readwrite', (s) => s.delete(id)) } catch { /* */ } }

/** Kompres gambar → dataURL JPEG. */
export function compress(file: File, max = 1400, q = 0.72): Promise<{ data: string; w: number; h: number }> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * k), h = Math.round(img.height * k)
      const c = document.createElement('canvas'); c.width = w; c.height = h
      c.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      res({ data: c.toDataURL('image/jpeg', q), w, h })
    }
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')) }
    img.src = url
  })
}

export async function addMenus(key: string, placeName: string, files: FileList | File[]): Promise<number> {
  let n = 0
  for (const f of Array.from(files).slice(0, 8)) {
    if (!f.type.startsWith('image/')) continue
    const { data, w, h } = await compress(f)
    const ph: MenuPhoto = { id: Math.random().toString(36).slice(2, 10), placeKey: key, placeName, data, w, h, at: new Date().toISOString() }
    await tx('readwrite', (s) => s.put(ph))
    n++
  }
  return n
}

/** Foto menu suatu tempat; cocok juga berdasarkan nama saja bila posisi sedikit beda. */
export function useMenus(name: string | undefined, pos?: LatLng) {
  const key = name ? placeKey(name, pos) : ''
  const [list, setList] = useState<MenuPhoto[]>([])
  const reload = useCallback(async () => {
    if (!name) return setList([])
    const exact = await listMenus(key)
    if (exact.length) return setList(exact)
    try {
      const all = (await tx('readonly', (s) => s.getAll())) as MenuPhoto[]
      setList(all.filter((x) => x.placeName.trim().toLowerCase() === name.trim().toLowerCase()))
    } catch { setList([]) }
  }, [key, name])
  useEffect(() => { reload() }, [reload])
  return { list, key, reload }
}
