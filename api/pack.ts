/* =====================================================================
   PACK API — akun, sinkron, profil, teman, ajakan.
   Satu Vercel Function (Web handler). Penyimpanan: Vercel Blob, setiap
   dokumen dienkripsi AES-256-GCM dengan path HMAC yang tidak bisa ditebak.
   Tanpa BLOB_READ_WRITE_TOKEN (lokal) → disimpan di folder .data/.
   ===================================================================== */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'

const SECRET = process.env.PACK_SECRET || 'dev-secret-pack-local-only'
const BLOB = process.env.BLOB_READ_WRITE_TOKEN
const ENC_KEY = createHash('sha256').update(SECRET + ':enc').digest()
const LOCAL_DIR = process.env.PACK_DATA_DIR || join(process.cwd(), '.data')

/* ---------------- kripto ---------------- */
const h = (s: string, n = 32) => createHmac('sha256', SECRET).update(s).digest('hex').slice(0, n)
const b64u = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

function encrypt(obj: unknown): Buffer {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', ENC_KEY, iv)
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), ct])
}
function decrypt<T>(buf: Buffer): T {
  const d = createDecipheriv('aes-256-gcm', ENC_KEY, buf.subarray(0, 12))
  d.setAuthTag(buf.subarray(12, 28))
  return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8'))
}
const scrypt = (pw: string, salt: Buffer) => new Promise<Buffer>((res, rej) => _scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))))

function sign(uid: string, days = 90) {
  const body = b64u(Buffer.from(JSON.stringify({ uid, exp: Date.now() + days * 86400000 })))
  return body + '.' + b64u(createHmac('sha256', SECRET).update(body).digest())
}
function verify(token?: string | null): string | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const want = createHmac('sha256', SECRET).update(body).digest()
  const got = unb64u(sig)
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null
  try { const p = JSON.parse(unb64u(body).toString('utf8')); return p.exp > Date.now() ? p.uid : null } catch { return null }
}

/* ---------------- penyimpanan ---------------- */
interface Store { get<T>(path: string): Promise<T | null>; put(path: string, v: unknown): Promise<void>; list(prefix: string): Promise<string[]>; del(path: string): Promise<void> }

const localStore: Store = {
  async get(p) { try { return decrypt(await fs.readFile(join(LOCAL_DIR, p))) } catch { return null } },
  async put(p, v) { const f = join(LOCAL_DIR, p); await fs.mkdir(dirname(f), { recursive: true }); await fs.writeFile(f, encrypt(v)) },
  async list(prefix) { try { const d = join(LOCAL_DIR, prefix); return (await fs.readdir(d)).map((x) => prefix + x) } catch { return [] } },
  async del(p) { try { await fs.unlink(join(LOCAL_DIR, p)) } catch { /* */ } },
}

let blobMod: typeof import('@vercel/blob') | null = null
const blob = async () => (blobMod ??= await import('@vercel/blob'))
/*
 * Blob di-cache CDN (min. 60 dtk), jadi dokumen TIDAK pernah ditimpa:
 * setiap tulis membuat versi baru "<dok>/<waktu>-<acak>.bin" (URL unik, aman di-cache),
 * baca = ambil versi terbaru lewat list() (konsisten), versi lama dihapus.
 */
const vdir = (p: string) => p.replace(/\.bin$/, '') + '/'
const vname = () => String(Date.now()).padStart(14, '0') + '-' + randomBytes(4).toString('hex') + '.bin'
async function listAll(prefix: string) {
  const { list } = await blob()
  const out: { pathname: string; url: string }[] = []
  let cursor: string | undefined
  do { const r = await list({ prefix, cursor, token: BLOB, limit: 1000 }); out.push(...r.blobs.map((x) => ({ pathname: x.pathname, url: x.url }))); cursor = r.hasMore ? r.cursor : undefined } while (cursor)
  return out
}
async function fetchDoc<T>(url: string): Promise<T | null> {
  const r = await fetch(url)
  return r.ok ? decrypt<T>(Buffer.from(await r.arrayBuffer())) : null
}
const blobStore: Store & { getAll<T>(prefix: string): Promise<T[]> } = {
  async get<T>(p: string) {
    try {
      const vs = (await listAll(vdir(p))).sort((x, y) => x.pathname.localeCompare(y.pathname))
      const last = vs[vs.length - 1]
      return last ? await fetchDoc<T>(last.url) : null
    } catch { return null }
  },
  async put(p, v) {
    const { put, del } = await blob()
    const dir = vdir(p)
    const name = dir + vname()
    await put(name, encrypt(v), { access: 'public', token: BLOB, addRandomSuffix: false, contentType: 'application/octet-stream' } as Parameters<typeof put>[2])
    try { const old = (await listAll(dir)).filter((x) => x.pathname < name); if (old.length) await del(old.map((x) => x.url), { token: BLOB }) } catch { /* bersih-bersih bisa lain kali */ }
  },
  async list(prefix) {
    const docs = new Set((await listAll(prefix)).map((x) => x.pathname.replace(/\/[^/]+\.bin$/, '.bin')))
    return [...docs]
  },
  async getAll<T>(prefix: string) {
    const latest = new Map<string, { pathname: string; url: string }>()
    for (const x of await listAll(prefix)) { const doc = x.pathname.replace(/\/[^/]+\.bin$/, ''); const cur = latest.get(doc); if (!cur || x.pathname > cur.pathname) latest.set(doc, x) }
    return (await Promise.all([...latest.values()].map((x) => fetchDoc<T>(x.url).catch(() => null)))).filter(Boolean) as T[]
  },
  async del(p) { const { del } = await blob(); try { const vs = await listAll(vdir(p)); if (vs.length) await del(vs.map((x) => x.url), { token: BLOB }) } catch { /* */ } },
}
const localGetAll = async <T,>(prefix: string) => (await Promise.all((await localStore.list(prefix)).map((f) => localStore.get<T>(f)))).filter(Boolean) as T[]
const db: Store = BLOB ? blobStore : localStore
const getAll = <T,>(prefix: string): Promise<T[]> => (BLOB ? blobStore.getAll<T>(prefix) : localGetAll<T>(prefix))

const P = {
  email: (e: string) => `acct/${h('email:' + e.toLowerCase())}.bin`,
  handle: (x: string) => `hdl/${h('handle:' + x.toLowerCase())}.bin`,
  profile: (uid: string) => `prof/${h('profile:' + uid)}.bin`,
  state: (uid: string) => `state/${h('state:' + uid)}.bin`,
  ride: (id: string) => `ride/${h('ride:' + id)}.bin`,
  replyDir: (id: string) => `rep/${h('rep:' + id)}/`,
  reply: (id: string, who: string) => `rep/${h('rep:' + id)}/${h('who:' + who, 24)}.bin`,
  inboxDir: (uid: string) => `inb/${h('inb:' + uid)}/`,
  inbox: (uid: string, id: string) => `inb/${h('inb:' + uid)}/${h('ride:' + id, 24)}.bin`,
}

/* ---------------- tipe ---------------- */
interface Account { uid: string; email: string; hash: string; salt: string; createdAt: string }
interface Profile { uid: string; handle: string; name: string; char?: unknown; homeLabel?: string; home?: [number, number]; avgSpeed?: number; avail?: number; pay?: unknown[]; showPay?: boolean; updatedAt: string }
interface RideDoc { ride: Record<string, unknown> & { id: string }; hostUid: string; invitees: string[]; updatedAt: string }

const HANDLE_RE = /^[a-z0-9_.]{3,20}$/
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
const fail = (msg: string, status = 400) => json({ error: msg }, status)
const pub = (p: Profile | null, withPay = false) => (p ? { uid: p.uid, handle: p.handle, name: p.name, char: p.char, homeLabel: p.homeLabel, home: p.home, avgSpeed: p.avgSpeed, avail: p.avail, pay: withPay && p.showPay !== false ? p.pay : undefined, updatedAt: p.updatedAt } : null)

async function uniqueHandle(base: string) {
  const b = (base.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '').slice(0, 14) || 'rider')
  for (let i = 0; i < 20; i++) {
    const c = i === 0 ? b : `${b}${Math.floor(Math.random() * 900 + 100)}`
    if (c.length >= 3 && !(await db.get(P.handle(c)))) return c
  }
  return b + randomBytes(3).toString('hex')
}

/* ---------------- operasi ---------------- */
type Ctx = { uid: string | null; body: Record<string, any> }
const ops: Record<string, (c: Ctx) => Promise<Response>> = {
  async health() { return json({ ok: true, store: BLOB ? 'blob' : 'local' }) },

  async signup({ body }) {
    const email = String(body.email ?? '').trim().toLowerCase()
    const pw = String(body.password ?? '')
    const name = String(body.name ?? '').trim().slice(0, 40)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Email tidak valid')
    if (pw.length < 6) return fail('Password minimal 6 karakter')
    if (!name) return fail('Nama wajib diisi')
    if (await db.get(P.email(email))) return fail('Email sudah terdaftar. Masuk saja.', 409)
    const uid = 'u_' + randomBytes(9).toString('hex')
    const salt = randomBytes(16)
    const acct: Account = { uid, email, hash: (await scrypt(pw, salt)).toString('hex'), salt: salt.toString('hex'), createdAt: new Date().toISOString() }
    const handle = await uniqueHandle(String(body.handle || name))
    const prof: Profile = { uid, handle, name, char: body.char, homeLabel: body.homeLabel, home: body.home, avgSpeed: 24, avail: 0, showPay: true, updatedAt: new Date().toISOString() }
    await db.put(P.email(email), acct)
    await db.put(P.handle(handle), { uid })
    await db.put(P.profile(uid), prof)
    return json({ token: sign(uid), user: { uid, email }, profile: pub(prof, true) })
  },

  async login({ body }) {
    const email = String(body.email ?? '').trim().toLowerCase()
    const acct = await db.get<Account>(P.email(email))
    if (!acct) return fail('Email atau password salah', 401)
    const got = await scrypt(String(body.password ?? ''), Buffer.from(acct.salt, 'hex'))
    if (!timingSafeEqual(got, Buffer.from(acct.hash, 'hex'))) return fail('Email atau password salah', 401)
    const [prof, st] = await Promise.all([db.get<Profile>(P.profile(acct.uid)), db.get<{ state: unknown; updatedAt: string }>(P.state(acct.uid))])
    return json({ token: sign(acct.uid), user: { uid: acct.uid, email: acct.email }, profile: pub(prof, true), state: st })
  },

  async me({ uid }) {
    if (!uid) return fail('Belum masuk', 401)
    return json({ profile: pub(await db.get<Profile>(P.profile(uid)), true) })
  },

  async 'profile.save'({ uid, body }) {
    if (!uid) return fail('Belum masuk', 401)
    const cur = await db.get<Profile>(P.profile(uid))
    if (!cur) return fail('Profil tidak ditemukan', 404)
    const p = body.profile ?? {}
    const next: Profile = { ...cur, updatedAt: new Date().toISOString() }
    if (typeof p.name === 'string' && p.name.trim()) next.name = p.name.trim().slice(0, 40)
    for (const k of ['char', 'homeLabel', 'home', 'avgSpeed', 'avail', 'pay', 'showPay'] as const) if (p[k] !== undefined) (next as any)[k] = p[k]
    if (typeof p.handle === 'string' && p.handle.toLowerCase() !== cur.handle) {
      const hd = p.handle.toLowerCase()
      if (!HANDLE_RE.test(hd)) return fail('Username 3–20 huruf kecil, angka, titik atau garis bawah')
      if (await db.get(P.handle(hd))) return fail('Username sudah dipakai', 409)
      await db.put(P.handle(hd), { uid })
      await db.del(P.handle(cur.handle))
      next.handle = hd
    }
    await db.put(P.profile(uid), next)
    return json({ profile: pub(next, true) })
  },

  async 'profile.byHandle'({ body }) {
    const hd = String(body.handle ?? '').replace(/^@/, '').toLowerCase()
    const ref = await db.get<{ uid: string }>(P.handle(hd))
    if (!ref) return fail('Username tidak ditemukan', 404)
    return json({ profile: pub(await db.get<Profile>(P.profile(ref.uid)), false) })
  },

  async profiles({ uid, body }) {
    if (!uid) return fail('Belum masuk', 401)
    const ids: string[] = Array.isArray(body.uids) ? body.uids.slice(0, 60) : []
    const list = await Promise.all(ids.map((x) => db.get<Profile>(P.profile(x))))
    return json({ profiles: list.filter(Boolean).map((p) => pub(p, true)) })
  },

  async 'state.get'({ uid }) {
    if (!uid) return fail('Belum masuk', 401)
    return json((await db.get(P.state(uid))) ?? { state: null, updatedAt: null })
  },

  async 'state.put'({ uid, body }) {
    if (!uid) return fail('Belum masuk', 401)
    const updatedAt = String(body.updatedAt ?? new Date().toISOString())
    await db.put(P.state(uid), { state: body.state, updatedAt })
    return json({ ok: true, updatedAt })
  },

  async 'ride.publish'({ uid, body }) {
    if (!uid) return fail('Belum masuk', 401)
    const ride = body.ride
    if (!ride?.id) return fail('Ajakan tidak valid')
    const prev = await db.get<RideDoc>(P.ride(ride.id))
    if (prev && prev.hostUid !== uid) return fail('Bukan ajakanmu', 403)
    const invitees: string[] = Array.isArray(body.invitees) ? body.invitees.filter((x: unknown) => typeof x === 'string').slice(0, 40) : []
    await db.put(P.ride(ride.id), { ride, hostUid: uid, invitees, updatedAt: new Date().toISOString() } satisfies RideDoc)
    const fresh = invitees.filter((x) => !prev?.invitees.includes(x))
    await Promise.all(fresh.map((x) => db.put(P.inbox(x, ride.id), { rideId: ride.id, from: uid, at: new Date().toISOString() })))
    return json({ ok: true, invited: fresh.length })
  },

  async 'ride.get'({ body }) {
    const doc = await db.get<RideDoc>(P.ride(String(body.id ?? '')))
    if (!doc) return fail('Ajakan tidak ditemukan', 404)
    const replies = await getAll(P.replyDir(doc.ride.id))
    const host = await db.get<Profile>(P.profile(doc.hostUid))
    return json({ ride: doc.ride, host: pub(host, true), replies, updatedAt: doc.updatedAt })
  },

  async 'ride.reply'({ uid, body }) {
    const id = String(body.id ?? '')
    const doc = await db.get<RideDoc>(P.ride(id))
    if (!doc) return fail('Ajakan tidak ditemukan', 404)
    const r = body.reply ?? {}
    const who = uid ?? 'guest:' + String(r.name ?? '').toLowerCase().slice(0, 40)
    if (!uid && !r.name) return fail('Nama wajib diisi')
    const rec = { ...r, uid: uid ?? undefined, name: String(r.name ?? '').slice(0, 40), at: new Date().toISOString() }
    await db.put(P.reply(id, who), rec)
    return json({ ok: true })
  },

  async inbox({ uid }) {
    if (!uid) return fail('Belum masuk', 401)
    const entries = await getAll<{ rideId: string; from: string; at: string }>(P.inboxDir(uid))
    const rides = await Promise.all(entries.map(async (e) => {
      const doc = await db.get<RideDoc>(P.ride(e.rideId))
      if (!doc) return null
      const host = await db.get<Profile>(P.profile(doc.hostUid))
      return { ride: doc.ride, host: pub(host, true), at: e.at }
    }))
    return json({ rides: rides.filter(Boolean) })
  },
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, any> = {}
  try { body = await request.json() } catch { return fail('Body bukan JSON') }
  const op = String(body.op ?? '')
  const fn = ops[op]
  if (!fn) return fail('Operasi tidak dikenal', 404)
  const auth = request.headers.get('authorization')
  const uid = verify(auth?.startsWith('Bearer ') ? auth.slice(7) : null)
  try { return await fn({ uid, body }) } catch (e) { console.error('pack api', op, e); return fail('Server sedang bermasalah, coba lagi', 500) }
}

export async function GET(): Promise<Response> {
  return ops.health({ uid: null, body: {} })
}
