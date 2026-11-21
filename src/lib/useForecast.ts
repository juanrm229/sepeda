import { useEffect, useState } from 'react'
import type { LatLng } from './types'
import { getForecast, type Forecast } from './weather'

let cache: { key: string; at: number; data: Forecast } | null = null

export function useForecast(pos: LatLng) {
  const key = pos.map((x) => x.toFixed(2)).join(',')
  const [data, setData] = useState<Forecast | null>(cache && cache.key === key ? cache.data : null)
  useEffect(() => {
    if (cache && cache.key === key && Date.now() - cache.at < 20 * 60000) { setData(cache.data); return }
    let alive = true
    getForecast(pos).then((d) => { cache = { key, at: Date.now(), data: d }; if (alive) setData(d) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return data
}
