import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { brand } from '@/lib/brand'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY)
  // Secret cez Authorization header (nie query string — secret v URL by skončil
  // vo Vercel access logoch, referreroch a proxy logoch).
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const notifications: { email: string; userId: string | null; subject: string; body: string; typ: string; vozidloId: string }[] = []

  const { data: kontroly } = await supabase
    .from('vozidlo_kontroly')
    .select('*, vozidlo:vozidla(id, spz, znacka, variant, priradeny_vodic_id)')

  const typLabels: Record<string, string> = { stk: 'STK', ek: 'EK', pzp: 'PZP', havarijne: 'Havarijné poistenie' }

  for (const k of kontroly || []) {
    if (!k.vozidlo) continue
    const expiry = new Date(k.platnost_do)
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if ([30, 14, 7].includes(diffDays)) {
      const { data: fleetManagers } = await supabase
        .from('profiles')
        .select('id, email')
        .in('role', ['fleet_manager', 'admin', 'it_admin', 'fin_manager'])
        .eq('active', true)

      const subject = `${typLabels[k.typ] || k.typ} - ${k.vozidlo.spz} expiruje o ${diffDays} dní`
      const body = `Vozidlo ${k.vozidlo.znacka} ${k.vozidlo.variant} (${k.vozidlo.spz}) má ${typLabels[k.typ]} platnú do ${k.platnost_do}. Zostáva ${diffDays} dní.`

      for (const fm of fleetManagers || []) {
        notifications.push({ email: fm.email, userId: fm.id, subject, body, typ: `kontrola_${k.typ}`, vozidloId: k.vozidlo.id })
      }

      // Upozorniť všetkých priradených vodičov vozidla (zdieľané vozidlá)
      const { data: vodici } = await supabase
        .from('vozidlo_vodici')
        .select('user_id, profile:profiles!user_id(id, email, active)')
        .eq('vozidlo_id', k.vozidlo.id)

      for (const vv of vodici || []) {
        const driver = (vv as any).profile
        if (driver?.active && driver?.email) {
          notifications.push({ email: driver.email, userId: driver.id, subject, body, typ: `kontrola_${k.typ}`, vozidloId: k.vozidlo.id })
        }
      }
    }
  }

  const { data: dokumenty } = await supabase
    .from('vozidlo_dokumenty')
    .select('*, vozidlo:vozidla(id, spz, znacka, variant)')
    .not('platnost_do', 'is', null)

  for (const d of dokumenty || []) {
    if (!d.vozidlo) continue
    const expiry = new Date(d.platnost_do)
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if ([30, 14, 7].includes(diffDays)) {
      const { data: fleetManagers } = await supabase
        .from('profiles')
        .select('id, email')
        .in('role', ['fleet_manager', 'admin', 'it_admin', 'fin_manager'])
        .eq('active', true)

      const subject = `Dokument "${d.nazov}" - ${d.vozidlo.spz} expiruje o ${diffDays} dní`
      const body = `Dokument "${d.nazov}" pre vozidlo ${d.vozidlo.znacka} ${d.vozidlo.variant} (${d.vozidlo.spz}) expiruje ${d.platnost_do}. Zostáva ${diffDays} dní.`

      for (const fm of fleetManagers || []) {
        notifications.push({ email: fm.email, userId: fm.id, subject, body, typ: 'dokument_expiracia', vozidloId: d.vozidlo.id })
      }
    }
  }

  // Check leasing end dates
  const { data: vozidlaLeasing } = await supabase
    .from('vozidla')
    .select('id, spz, znacka, variant, leasing_koniec')
    .not('leasing_koniec', 'is', null)

  for (const v of vozidlaLeasing || []) {
    const expiry = new Date(v.leasing_koniec)
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if ([30, 14, 7].includes(diffDays)) {
      const { data: fleetManagers } = await supabase
        .from('profiles')
        .select('id, email')
        .in('role', ['fleet_manager', 'admin', 'it_admin', 'fin_manager'])
        .eq('active', true)

      const subject = `Leasing - ${v.spz} končí o ${diffDays} dní`
      const body = `Vozidlo ${v.znacka} ${v.variant} (${v.spz}) má koniec leasingu ${v.leasing_koniec}. Zostáva ${diffDays} dní.`

      for (const fm of fleetManagers || []) {
        notifications.push({ email: fm.email, userId: fm.id, subject, body, typ: 'leasing_koniec', vozidloId: v.id })
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
        from: process.env.EMAIL_FROM || `${brand.shortName} Fleet <${brand.supportEmail}>`,
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

      if (n.userId) {
        await supabase.from('notifikacie').insert({
          user_id: n.userId,
          typ: 'fleet_expiry',
          nadpis: n.subject,
          sprava: n.body,
          link: '/fleet/kontroly',
        })
      }

      sent++
    } catch (e) {
      const { logger } = await import('@/lib/logger')
      logger.error('Fleet notification email send failed', e)
    }
  }

  return NextResponse.json({ sent, total: notifications.length })
}
