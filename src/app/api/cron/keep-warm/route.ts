import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 10

function authorized(req: Request): boolean {
  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true
  // Vercel Cron pošle request bez Authorization, identifikuje sa cez user-agent
  const ua = req.headers.get('user-agent') || ''
  return ua.toLowerCase().includes('vercel-cron')
}

async function fetchEcbKurzy() {
  try {
    const r = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml')
    if (!r.ok) return { ok: false, count: 0 }
    const xml = await r.text()
    const meny = ['CZK', 'USD', 'GBP', 'PLN', 'HUF', 'CHF']
    const today = new Date().toISOString().split('T')[0]
    const admin = createSupabaseAdmin()
    let count = 0
    for (const mena of meny) {
      const match = xml.match(new RegExp(`<Cube currency='${mena}' rate='([0-9.]+)'`))
      if (!match) continue
      const ecbRate = parseFloat(match[1])
      const kurz = 1 / ecbRate
      const { error } = await admin.from('kurzy_mien').upsert(
        { mena, kurz_k_eur: kurz, datum: today, zdroj: 'ECB' },
        { onConflict: 'mena,datum' }
      )
      if (!error) count++
    }
    return { ok: true, count }
  } catch (e) {
    return { ok: false, count: 0, error: String(e) }
  }
}

async function ping() {
  const admin = createSupabaseAdmin()
  const start = Date.now()
  const { error } = await admin.from('settings').select('id').limit(1)
  const ms = Date.now() - start

  // Fetch ECB kurzy (mimo critical path — chyba neblokuje keep-warm)
  const ecb = await fetchEcbKurzy()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, ms, ecb }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ms, ecb, ts: new Date().toISOString() })
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 })
  return ping()
}

export async function POST(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 })
  return ping()
}
