import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const notifications: { email: string; subject: string; body: string; typ: string; vozidloId: string }[] = []

  const { data: kontroly } = await supabase
    .from('vozidlo_kontroly')
    .select('*, vozidlo:vozidla(id, spz, znacka, variant, priradeny_vodic_id)')

  const typLabels: Record<string, string> = { stk: 'STK', ek: 'EK', pzp: 'PZP', havarijne: 'Havarijné poistenie' }

  for (const k of kontroly || []) {
    const expiry = new Date(k.platnost_do)
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if ([30, 14, 7].includes(diffDays)) {
      const { data: fleetManagers } = await supabase
        .from('profiles')
        .select('email')
        .in('role', ['fleet_manager', 'admin'])

      const subject = `${typLabels[k.typ] || k.typ} - ${k.vozidlo.spz} expiruje o ${diffDays} dní`
      const body = `Vozidlo ${k.vozidlo.znacka} ${k.vozidlo.variant} (${k.vozidlo.spz}) má ${typLabels[k.typ]} platnú do ${k.platnost_do}. Zostáva ${diffDays} dní.`

      for (const fm of fleetManagers || []) {
        notifications.push({ email: fm.email, subject, body, typ: `kontrola_${k.typ}`, vozidloId: k.vozidlo.id })
      }

      if (k.vozidlo.priradeny_vodic_id && ['stk', 'ek'].includes(k.typ)) {
        const { data: driver } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', k.vozidlo.priradeny_vodic_id)
          .single()

        if (driver) {
          notifications.push({ email: driver.email, subject, body, typ: `kontrola_${k.typ}`, vozidloId: k.vozidlo.id })
        }
      }
    }
  }

  const { data: dokumenty } = await supabase
    .from('vozidlo_dokumenty')
    .select('*, vozidlo:vozidla(id, spz, znacka, variant)')
    .not('platnost_do', 'is', null)

  for (const d of dokumenty || []) {
    const expiry = new Date(d.platnost_do)
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if ([30, 14, 7].includes(diffDays)) {
      const { data: fleetManagers } = await supabase
        .from('profiles')
        .select('email')
        .in('role', ['fleet_manager', 'admin'])

      const subject = `Dokument "${d.nazov}" - ${d.vozidlo.spz} expiruje o ${diffDays} dní`
      const body = `Dokument "${d.nazov}" pre vozidlo ${d.vozidlo.znacka} ${d.vozidlo.variant} (${d.vozidlo.spz}) expiruje ${d.platnost_do}. Zostáva ${diffDays} dní.`

      for (const fm of fleetManagers || []) {
        notifications.push({ email: fm.email, subject, body, typ: 'dokument_expiracia', vozidloId: d.vozidlo.id })
      }
    }
  }

  let sent = 0
  for (const n of notifications) {
    const { data: existing } = await supabase
      .from('notifikacie_log')
      .select('id')
      .eq('typ', n.typ)
      .eq('vozidlo_id', n.vozidloId)
      .eq('adresat_email', n.email)
      .gte('odoslane_at', today.toISOString().split('T')[0])
      .limit(1)

    if (existing?.length) continue

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'IMET Fleet <fleet@imet.sk>',
        to: n.email,
        subject: n.subject,
        text: n.body,
      })

      await supabase.from('notifikacie_log').insert({
        typ: n.typ,
        vozidlo_id: n.vozidloId,
        adresat_email: n.email,
        predmet: n.subject,
      })
      sent++
    } catch (e) {
      console.error('Email send failed:', e)
    }
  }

  return NextResponse.json({ sent, total: notifications.length })
}
