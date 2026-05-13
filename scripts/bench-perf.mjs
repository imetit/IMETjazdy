// Bench: zmeria TTFB na autentifikovaných stránkach po prihlásení
// Spustenie: node scripts/bench-perf.mjs
//
// Vyžaduje v .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SCRIPT_TEST_EMAIL
//   SCRIPT_TEST_PASSWORD
//   BENCH_APP_URL (optional, default https://imetjazdy-work.vercel.app)

import { readFileSync } from 'fs'

function loadEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return
  try {
    const content = readFileSync('.env.local', 'utf8')
    for (const line of content.split('\n')) {
      const [key, ...vals] = line.split('=')
      if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
    }
  } catch {
    // .env.local nie je povinné, ak su premenne uz nastavene
  }
}
loadEnv()

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const EMAIL = process.env.SCRIPT_TEST_EMAIL
const PASSWORD = process.env.SCRIPT_TEST_PASSWORD
const APP = process.env.BENCH_APP_URL || 'https://imetjazdy-work.vercel.app'

if (!SUPA_URL || !ANON || !EMAIL || !PASSWORD) {
  console.error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SCRIPT_TEST_EMAIL, SCRIPT_TEST_PASSWORD')
  process.exit(1)
}

const SUPA_REF = new URL(SUPA_URL).hostname.split('.')[0]

const PATHS = ['/login', '/admin', '/admin/jazdy', '/admin/dochadzka', '/admin/dovolenky', '/admin/zamestnanci', '/admin/archiv', '/api/health']
const API_PATHS = ['/api/admin/jazdy', '/api/admin/zamestnanci', '/api/admin/dovolenky', '/api/admin/archiv', '/api/admin/dashboard', '/api/admin/dochadzka/sumary']
const RUNS = 5

async function login() {
  const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
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
  const headersMs = Date.now() - start
  await res.arrayBuffer()
  const fullMs = Date.now() - start
  return { headersMs, fullMs, code: res.status }
}

async function run() {
  console.log('=== Login...')
  const sess = await login()
  const cookieHeader = buildCookieHeader(sess)
  console.log('  ✓ logged in as', sess.user?.email, 'JWT', sess.access_token.length, 'bytes')
  console.log('  cookie header length:', cookieHeader.length)
  console.log('')

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
  console.log('=== API ENDPOINTY ===')
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
