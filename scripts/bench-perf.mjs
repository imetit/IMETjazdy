// Bench: zmeria TTFB na autentifikovaných stránkach po prihlásení
// Spustenie: node scripts/bench-perf.mjs

const SUPA_URL = 'https://yotjzvykdpxkwfegjrkr.supabase.co'
const SUPA_REF = 'yotjzvykdpxkwfegjrkr'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdGp6dnlrZHB4a3dmZWdqcmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Njg5NzUsImV4cCI6MjA5MTE0NDk3NX0.DJumZllMu84jpJNa3-Y8KcAR883RAItzTMIRVxSeGgk'
const APP = 'https://imetjazdy-work.vercel.app'

const PATHS = ['/login', '/admin', '/admin/jazdy', '/admin/dochadzka', '/admin/dovolenky', '/admin/zamestnanci', '/admin/archiv', '/api/health']
const API_PATHS = ['/api/admin/jazdy', '/api/admin/zamestnanci', '/api/admin/dovolenky', '/api/admin/archiv', '/api/admin/dashboard', '/api/admin/dochadzka/sumary']
const RUNS = 5

async function login() {
  const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'it@imet.sk', password: 'Admin123!' }),
  })
  const sess = await r.json()
  if (!sess.access_token) throw new Error('Login failed: ' + JSON.stringify(sess))
  return sess
}

function buildCookieHeader(sess) {
  const wrap = {
    access_token: sess.access_token,
    refresh_token: sess.refresh_token,
    expires_in: sess.expires_in,
    expires_at: sess.expires_at,
    token_type: sess.token_type,
    user: sess.user,
  }
  const b64 = 'base64-' + Buffer.from(JSON.stringify(wrap)).toString('base64')
  // @supabase/ssr supports chunked cookies (.0, .1, ...). Single cookie is fine if <4KB.
  // For safety, use chunked even when small.
  const CHUNK = 3000
  const parts = []
  for (let i = 0; i < b64.length; i += CHUNK) parts.push(b64.slice(i, i + CHUNK))
  return parts.map((v, i) => `sb-${SUPA_REF}-auth-token.${i}=${v}`).join('; ')
}

async function bench(path, cookieHeader) {
  const start = Date.now()
  const res = await fetch(`${APP}${path}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
    redirect: 'manual',
  })
  const headersMs = Date.now() - start  // user vidí skeleton tu (Streaming SSR)
  await res.arrayBuffer()
  const fullMs = Date.now() - start  // celý content sa vyriešil
  return { headersMs, fullMs, code: res.status }
}

async function run() {
  console.log('=== Login...')
  const sess = await login()
  const cookieHeader = buildCookieHeader(sess)
  console.log('  ✓ logged in as', sess.user?.email, 'JWT', sess.access_token.length, 'bytes')
  console.log('  cookie header length:', cookieHeader.length)
  console.log('')

  // Warm-up: jeden request aby sa vytvorila role cache cookie
  console.log('=== Warm-up (vytvorí imet_role_cache cookie cez SLOW path)...')
  let firstSet = null
  const warmRes = await fetch(`${APP}/admin`, {
    headers: { Cookie: cookieHeader },
    redirect: 'manual',
  })
  await warmRes.arrayBuffer()
  const setCookies = warmRes.headers.getSetCookie?.() || []
  const roleCookie = setCookies.find(c => c.startsWith('imet_role_cache='))
  if (roleCookie) {
    firstSet = roleCookie.split(';')[0]
    console.log('  ✓ získali sme imet_role_cache cookie')
  } else {
    console.log('  ✗ imet_role_cache nebol nastavený! (slow path zlyhal?)')
  }

  // Cookie pre fast path = pôvodné supabase + role cache
  const fastCookieHeader = firstSet ? `${cookieHeader}; ${firstSet}` : cookieHeader

  console.log('=== STRÁNKY (full HTML, SSR) ===')
  console.log('  Path                         | first-byte (skeleton)| full content')
  console.log('  ' + '-'.repeat(85))
  for (const path of PATHS) {
    const headers = []
    const full = []
    for (let i = 0; i < RUNS; i++) {
      const r = await bench(path, fastCookieHeader)
      headers.push(r.headersMs); full.push(r.fullMs)
    }
    const min = (a) => Math.min(...a)
    const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
    console.log(`  ${path.padEnd(28)} | min/med ${String(min(headers)).padStart(3)}/${String(med(headers)).padStart(3)}ms       | min/med ${min(full)}/${med(full)}ms`)
  }

  console.log('')
  console.log('=== API ENDPOINTY (čo SWR fetchne na pozadí — pre user instant z cache) ===')
  console.log('  Endpoint                     | TTFB JSON (warm)')
  console.log('  ' + '-'.repeat(60))
  for (const path of API_PATHS) {
    const full = []
    for (let i = 0; i < RUNS; i++) {
      const r = await bench(path, fastCookieHeader)
      full.push(r.fullMs)
    }
    const min = (a) => Math.min(...a)
    const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
    console.log(`  ${path.padEnd(28)} | min/med ${min(full)}/${med(full)}ms`)
  }
  console.log('')
  console.log('* SWR cache hit = ~5ms in-memory v prehliadači. User-perceived: INSTANT.')
}

run().catch(e => { console.error(e); process.exit(1) })
