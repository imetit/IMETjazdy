import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { isPracovnyDen } from '@/lib/dochadzka-utils'
import { calculateFond } from '@/lib/dochadzka-fond'

export const runtime = 'nodejs'
export const maxDuration = 60

function authorized(req: Request): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 })
  return runAutoPip()
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 })
  return runAutoPip()
}

async function runAutoPip() {
  const admin = createSupabaseAdmin()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const datum = yesterday.toISOString().split('T')[0]

  if (!isPracovnyDen(yesterday)) {
    return NextResponse.json({ ok: true, skipped: 'weekend_or_holiday', datum })
  }

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, firma_id, role, pracovny_fond_hodiny, fond_per_den, auto_pip_enabled')
    .eq('active', true)
    .neq('role', 'tablet')

  let processed = 0
  const autoDoplnene: string[] = []

  for (const p of profiles || []) {
    if (p.auto_pip_enabled === false) continue

    // Skip ak má dovolenku/PN/OČR
    const { data: dov } = await admin
      .from('dovolenky').select('id')
      .eq('user_id', p.id).eq('stav', 'schvalena')
      .lte('datum_od', datum).gte('datum_do', datum).limit(1)
    if (dov && dov.length > 0) continue

    // Skip ak má cestu
    const { data: cesta } = await admin
      .from('sluzobne_cesty').select('id')
      .eq('user_id', p.id).eq('stav', 'schvalena')
      .lte('datum_od', datum).gte('datum_do', datum).limit(1)
    if (cesta && cesta.length > 0) continue

    // Načítaj záznamy
    const { data: zaznamy } = await admin
      .from('dochadzka').select('id, smer, dovod, cas')
      .eq('user_id', p.id).eq('datum', datum)
      .order('cas', { ascending: true })

    if (!zaznamy || zaznamy.length === 0) continue

    const last = zaznamy[zaznamy.length - 1]
    if (last.smer !== 'prichod') continue
    if (last.dovod !== 'praca') continue

    const firstPrichod = zaznamy.find(z => z.smer === 'prichod')
    if (firstPrichod && new Date(firstPrichod.cas).getHours() >= 18) continue

    const fond = calculateFond(p, yesterday)
    const prichodTime = new Date(last.cas)
    let odchodTime = new Date(prichodTime.getTime() + fond * 60 * 60 * 1000)
    const eod = new Date(yesterday); eod.setHours(23, 59, 0, 0)
    if (odchodTime > eod) odchodTime = eod

    const { error: insertErr } = await admin.from('dochadzka').insert({
      user_id: p.id, datum, smer: 'odchod', dovod: 'praca',
      cas: odchodTime.toISOString(), zdroj: 'auto', auto_doplnene: true,
    })
    if (insertErr) {
      console.error(`auto-pip ${p.id}: ${insertErr.message}`)
      continue
    }

    await admin.from('notifikacie').insert({
      user_id: p.id,
      typ: 'dochadzka_auto_pip',
      nadpis: 'Auto-doplnený odchod',
      sprava: `Včera (${datum}) ste sa zabudli odpípnuť. Systém doplnil odchod o ${odchodTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}. Ak je čas iný, kontaktujte mzdárku.`,
      link: '/dochadzka-prehled',
    })

    autoDoplnene.push(p.full_name)
    processed++
  }

  // Bulk notifikácia mzdárkam
  if (autoDoplnene.length > 0) {
    const { data: mzdarky } = await admin
      .from('profiles').select('id')
      .in('role', ['admin', 'it_admin', 'fin_manager']).eq('active', true)
    for (const m of mzdarky || []) {
      await admin.from('notifikacie').insert({
        user_id: m.id,
        typ: 'dochadzka_auto_pip',
        nadpis: `Auto-doplnené ${processed} záznamov`,
        sprava: `Za ${datum} bolo auto-doplnené ${processed} odchodov: ${autoDoplnene.slice(0, 5).join(', ')}${autoDoplnene.length > 5 ? '…' : ''}`,
        link: '/admin/dochadzka',
      })
    }
  }

  return NextResponse.json({ ok: true, datum, processed, autoDoplnene })
}
