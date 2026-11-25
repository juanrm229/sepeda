/* Server API lokal untuk pengembangan & QA: node --experimental-strip-types scripts/dev-api.mjs */
import http from 'node:http'
const mod = await import('../api/pack.ts')
const port = +(process.env.PORT || 8787)
http.createServer(async (req, res) => {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const request = new Request('http://local' + req.url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined })
  const r = req.method === 'POST' ? await mod.POST(request) : await mod.GET(request)
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()))
}).listen(port, () => console.log('PACK API lokal di http://localhost:' + port))
