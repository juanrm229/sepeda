import type { Auth, PublicProfile } from './types'

/** Klien API PACK. Token disimpan di store (persist), dibaca lewat getter supaya tidak circular import. */
let tokenGetter: () => string | null = () => null
export const setTokenGetter = (f: () => string | null) => { tokenGetter = f }

export class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s } }

export async function call<T = any>(op: string, data: Record<string, unknown> = {}): Promise<T> {
  const t = tokenGetter()
  let r: Response
  try {
    r = await fetch('/api/pack', { method: 'POST', headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ op, ...data }) })
  } catch { throw new ApiError('Tidak ada koneksi. Coba lagi.', 0) }
  let j: any = null
  try { j = await r.json() } catch { /* */ }
  if (!r.ok) throw new ApiError(j?.error ?? 'Server sedang bermasalah', r.status)
  return j as T
}

export interface AuthResult { token: string; user: { uid: string; email: string }; profile: PublicProfile; state?: { state: any; updatedAt: string } | null }
export const api = {
  signup: (d: { email: string; password: string; name: string; char?: unknown; handle?: string; home?: unknown; homeLabel?: string }) => call<AuthResult>('signup', d),
  login: (email: string, password: string) => call<AuthResult>('login', { email, password }),
  me: () => call<{ profile: PublicProfile }>('me'),
  saveProfile: (profile: Partial<PublicProfile> & { showPay?: boolean }) => call<{ profile: PublicProfile }>('profile.save', { profile }),
  byHandle: (handle: string) => call<{ profile: PublicProfile }>('profile.byHandle', { handle }),
  profiles: (uids: string[]) => call<{ profiles: PublicProfile[] }>('profiles', { uids }),
  getState: () => call<{ state: any; updatedAt: string | null }>('state.get'),
  putState: (state: unknown, updatedAt: string) => call<{ ok: true }>('state.put', { state, updatedAt }),
  publish: (ride: unknown, invitees: string[]) => call<{ ok: true; invited: number }>('ride.publish', { ride, invitees }),
  getRide: (id: string) => call<{ ride: any; host: PublicProfile; replies: any[] }>('ride.get', { id }),
  reply: (id: string, reply: Record<string, unknown>) => call<{ ok: true }>('ride.reply', { id, reply }),
  inbox: () => call<{ rides: { ride: any; host: PublicProfile; at: string }[] }>('inbox'),
}
export type { Auth }
