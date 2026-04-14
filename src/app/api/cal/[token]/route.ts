// iCal feed per zamestnanec: subscribe URL do Outlook / Office 365 / Google Calendar
// Verejný endpoint, chránený UUID tokenom. Vracia VCALENDAR (text/calendar).

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function toICalDate(d: string): string {
  // YYYY-MM-DD → YYYYMMDD (all-day event)
  return d.replace(/-/g, '')
}

function addDay(d: string): string {
  const dt = new Date(d)
  dt.setDate(dt.getDate() + 1)
  return dt.toISOString().split('T')[0].replace(/-/g, '')
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const cleanToken = token.replace(/\.ics$/, '')

  if (!/^[0-9a-f-]{36}$/i.test(cleanToken)) {
    return new NextResponse('Invalid token', { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('ical_token', cleanToken)
    .single()

  if (!profile) return new NextResponse('Not found', { status: 404 })

  const { data: dovolenky } = await supabase
    .from('dovolenky')
    .select('id, datum_od, datum_do, typ, stav, poznamka')
    .eq('user_id', profile.id)
    .in('stav', ['schvalena', 'caka_na_schvalenie'])

  const { data: cesty } = await supabase
    .from('sluzobne_cesty')
    .select('id, datum_od, datum_do, ciel, ucel, stav')
    .eq('user_id', profile.id)
    .in('stav', ['schvalena', 'nova', 'ukoncena'])

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const lines: string[] = []
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//IMET//IMET System//SK')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push(`X-WR-CALNAME:IMET — ${esc(profile.full_name)}`)
  lines.push('X-WR-TIMEZONE:Europe/Bratislava')

  for (const d of dovolenky || []) {
    const summary = d.stav === 'schvalena' ? 'Dovolenka' : 'Dovolenka (žiadosť)'
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:dovolenka-${d.id}@imet.sk`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART;VALUE=DATE:${toICalDate(d.datum_od)}`)
    lines.push(`DTEND;VALUE=DATE:${addDay(d.datum_do)}`)
    lines.push(`SUMMARY:${esc(summary)} — ${esc(d.typ)}`)
    if (d.poznamka) lines.push(`DESCRIPTION:${esc(d.poznamka)}`)
    lines.push(`STATUS:${d.stav === 'schvalena' ? 'CONFIRMED' : 'TENTATIVE'}`)
    lines.push('END:VEVENT')
  }

  for (const c of cesty || []) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:cesta-${c.id}@imet.sk`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART;VALUE=DATE:${toICalDate(c.datum_od)}`)
    lines.push(`DTEND;VALUE=DATE:${addDay(c.datum_do)}`)
    lines.push(`SUMMARY:${esc('Služobná cesta: ' + (c.ciel || ''))}`)
    if (c.ucel) lines.push(`DESCRIPTION:${esc(c.ucel)}`)
    lines.push(`STATUS:${c.stav === 'schvalena' || c.stav === 'ukoncena' ? 'CONFIRMED' : 'TENTATIVE'}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  const body = lines.join('\r\n') + '\r\n'

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `inline; filename="imet-${profile.id}.ics"`,
    },
  })
}
