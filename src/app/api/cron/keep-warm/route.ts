import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 10

function authorized(req: Request): boolean {
  // Iba Bearer secret — user-agent fallback bol spoofovateľný (akýkoľvek
  // externý request s "vercel-cron" v UA by prešiel). Vercel cron natively
  // posiela Authorization: Bearer ${CRON_SECRET} ak je nastavený v config.
  const auth = req.headers.get('authorization')
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
}

async function checkOverdueFaktury() {
  const admin = createSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]
  const sevenDays = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  // Po splatnosti — eskalácia podľa dni (3, 7, 14)
  const { data: overdue } = await admin.from('faktury')
    .select('id, cislo_faktury, dodavatel_nazov, datum_splatnosti, suma_celkom_eur, firma_id, nahral_id')
    .in('stav', ['schvalena', 'na_uhradu'])
    .lt('datum_splatnosti', today)

  let notifyCount = 0
  for (const f of overdue || []) {
    const days = Math.floor((Date.now() - new Date(f.datum_splatnosti).getTime()) / 86400000)
    if (![3, 7, 14, 30].includes(days)) continue

    const { data: managers } = await admin.from('profiles')
      .select('id')
      .in('role', ['admin', 'fin_manager', 'it_admin'])
      .eq('active', true)
      .or(`firma_id.eq.${f.firma_id},pristupne_firmy.cs.{${f.firma_id}}`)

    for (const m of managers || []) {
      await admin.from('notifikacie').insert({
        user_id: m.id,
        typ: 'faktura_po_splatnosti',
        nadpis: `Faktúra ${days} dní po splatnosti`,
        sprava: `${f.cislo_faktury} · ${f.dodavatel_nazov} · ${Math.abs(Number(f.suma_celkom_eur || 0)).toFixed(2)} €`,
        link: `/admin/faktury/${f.id}`,
      })
      notifyCount++
    }
  }

  // Blízka splatnosť — 7 dní vopred
  const { data: nearDue } = await admin.from('faktury')
    .select('id, cislo_faktury, dodavatel_nazov, datum_splatnosti, suma_celkom_eur, firma_id')
    .in('stav', ['schvalena', 'na_uhradu'])
    .eq('datum_splatnosti', sevenDays)

  for (const f of nearDue || []) {
    const { data: managers } = await admin.from('profiles')
      .select('id')
      .in('role', ['admin', 'fin_manager', 'it_admin'])
      .eq('active', true)
      .or(`firma_id.eq.${f.firma_id},pristupne_firmy.cs.{${f.firma_id}}`)
    for (const m of managers || []) {
      await admin.from('notifikacie').insert({
        user_id: m.id,
        typ: 'faktura_blizka_splatnost',
        nadpis: 'Faktúra splatná o 7 dní',
        sprava: `${f.cislo_faktury} · ${f.dodavatel_nazov}`,
        link: `/admin/faktury/${f.id}`,
      })
      notifyCount++
    }
  }

  return { overdue: (overdue || []).length, nearDue: (nearDue || []).length, notifyCount }
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

  // Fetch ECB kurzy + overdue check (mimo critical path)
  const [ecb, overdue] = await Promise.all([
    fetchEcbKurzy(),
    checkOverdueFaktury(),
  ])

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, ms, ecb, overdue }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ms, ecb, overdue, ts: new Date().toISOString() })
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 })
  return ping()
}

export async function POST(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 })
  return ping()
}
