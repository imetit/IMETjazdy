'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireNadriadeny, resolveCurrentApprover } from '@/lib/auth-helpers'
import { DovolenkaCreateSchema, parseFormData } from '@/lib/validation/schemas'
import { revalidatePath, updateTag } from 'next/cache'
import { isPracovnyDen } from '@/lib/dochadzka-utils'
import { logAudit } from './audit'

export async function getMyDovolenky() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  const { data, error } = await supabase
    .from('dovolenky')
    .select('*, schvalovatel:profiles!schvalovatel_id(full_name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní dovoleniek' }
  return { data }
}

export async function createDovolenka(formData: FormData) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  // Zod validácia (datum_od ≤ datum_do invariant je v schéme cez .refine)
  const parsed = parseFormData(DovolenkaCreateSchema, formData)
  if (!parsed.ok) return { error: parsed.error }
  const d = parsed.data

  // Aktuálny schvaľovateľ (zohľadní zastupujúceho ak je primárny na dovolenke)
  let schvalovatelId = await resolveCurrentApprover(supabase, user.id)
  if (!schvalovatelId) {
    const { data: admin } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'it_admin')
      .eq('active', true)
      .limit(1)
      .single<{ id: string }>()
    schvalovatelId = admin?.id || null
  }

  if (d.pol_dna && d.datum_od !== d.datum_do) {
    return { error: 'Pol dňa je možné iba pri žiadosti na jeden deň' }
  }

  const { error } = await supabase.from('dovolenky').insert({
    user_id: user.id,
    datum_od: d.datum_od,
    datum_do: d.datum_do,
    typ: d.typ,
    poznamka: d.poznamka ?? null,
    schvalovatel_id: schvalovatelId,
    pol_dna: d.pol_dna,
    cast_dna: d.pol_dna ? (d.cast_dna ?? null) : null,
  })

  if (error) return { error: 'Chyba pri vytváraní žiadosti' }

  // Notify supervisor about new leave request
  if (schvalovatelId) {
    const { data: zamestnanec } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    await supabase.from('notifikacie').insert({
      user_id: schvalovatelId,
      typ: 'dovolenka_nova',
      nadpis: 'Nová žiadosť o dovolenku',
      sprava: `${zamestnanec?.full_name || 'Zamestnanec'} žiada o dovolenku ${d.datum_od} — ${d.datum_do}`,
      link: '/admin/dovolenky',
    })
  }

  revalidatePath('/dovolenka')
}

export async function getMyDovolenkaNarok() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  const rok = new Date().getFullYear()
  const { data } = await supabase
    .from('dovolenky_naroky')
    .select('*')
    .eq('user_id', user.id)
    .eq('rok', rok)
    .single()

  const { data: schvalene } = await supabase
    .from('dovolenky')
    .select('datum_od, datum_do, pol_dna')
    .eq('user_id', user.id)
    .eq('stav', 'schvalena')
    .eq('typ', 'dovolenka')
    .gte('datum_od', `${rok}-01-01`)
    .lte('datum_do', `${rok}-12-31`)

  let cerpaneDni = 0
  for (const d of (schvalene || []) as Array<{ datum_od: string; datum_do: string; pol_dna?: boolean }>) {
    if (d.pol_dna) {
      // Pol dňa = 0.5 dňa, iba ak je to pracovný deň
      const deň = new Date(d.datum_od)
      if (isPracovnyDen(deň)) cerpaneDni += 0.5
      continue
    }
    const od = new Date(d.datum_od)
    const do_ = new Date(d.datum_do)
    const current = new Date(od)
    while (current <= do_) {
      if (isPracovnyDen(current)) cerpaneDni++
      current.setDate(current.getDate() + 1)
    }
  }

  const narok = data ? data.narok_dni + (data.prenesene_dni || 0) : 20
  return { data: { narok, cerpane: cerpaneDni, zostatok: narok - cerpaneDni } }
}

export async function getDovolenkyNaSchvalenie() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('dovolenky')
    .select('*, profile:profiles!user_id(full_name), schvalovatel:profiles!schvalovatel_id(full_name)')
    .order('created_at', { ascending: false })

  if (profile?.role !== 'it_admin') {
    query = query.eq('schvalovatel_id', user.id)
  }

  const { data, error } = await query
  if (error) return { error: 'Chyba pri načítaní dovoleniek' }
  return { data }
}

export async function schvalDovolenku(id: string) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  // Načítame dovolenku pre overenie oprávnení
  const { data: dovolenka } = await supabase
    .from('dovolenky')
    .select('user_id, datum_od, datum_do, schvalovatel_id')
    .eq('id', id)
    .single()

  if (!dovolenka) return { error: 'Dovolenka nenájdená' }

  // Overenie že user je schvaľovateľ alebo it_admin
  const auth = await requireNadriadeny(dovolenka.user_id)
  if ('error' in auth) return auth

  // Zamedziť aby si niekto schválil vlastnú žiadosť
  // (napr. po zmene nadriadeny_id = self, alebo it_admin žiada o vlastnú dovolenku)
  if (dovolenka.user_id === auth.user.id) {
    return { error: 'Nemôžete schváliť vlastnú žiadosť o dovolenku' }
  }

  const { error } = await supabase.from('dovolenky').update({
    stav: 'schvalena',
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri schvaľovaní' }

  // Vytvoriť záznamy v dochádzke pre schválenú dovolenku
  // Batch-fetch existujúcich práca záznamov za celé obdobie (namiesto N+1)
  const od = new Date(dovolenka.datum_od)
  const do_ = new Date(dovolenka.datum_do)

  const { data: existujuce } = await supabase
    .from('dochadzka')
    .select('datum')
    .eq('user_id', dovolenka.user_id)
    .eq('dovod', 'praca')
    .gte('datum', dovolenka.datum_od)
    .lte('datum', dovolenka.datum_do)

  const dniSPracou = new Set((existujuce || []).map((r: { datum: string }) => r.datum))

  const inserts: Array<Record<string, unknown>> = []
  const current = new Date(od)
  while (current <= do_) {
    if (isPracovnyDen(current)) {
      const datum = current.toISOString().split('T')[0]
      if (!dniSPracou.has(datum)) {
        const ranoCas = new Date(current)
        ranoCas.setHours(8, 0, 0, 0)
        const vecerCas = new Date(current)
        vecerCas.setHours(16, 30, 0, 0)
        inserts.push(
          { user_id: dovolenka.user_id, datum, smer: 'prichod', dovod: 'dovolenka', cas: ranoCas.toISOString(), zdroj: 'system' },
          { user_id: dovolenka.user_id, datum, smer: 'odchod', dovod: 'dovolenka', cas: vecerCas.toISOString(), zdroj: 'system' },
        )
      }
    }
    current.setDate(current.getDate() + 1)
  }

  if (inserts.length > 0) {
    // Admin klient — RLS na dochádzku povoľuje INSERT len admin/tablet rolám,
    // takže manager (zamestnanec) by inak nemohol vytvárať záznamy.
    const { createSupabaseAdmin } = await import('@/lib/supabase-admin')
    const admin = createSupabaseAdmin()
    await admin.from('dochadzka').insert(inserts)
  }

  // Notifikácia zamestnancovi
  await supabase.from('notifikacie').insert({
    user_id: dovolenka.user_id,
    typ: 'dovolenka_schvalena',
    nadpis: 'Dovolenka schválená',
    sprava: `Vaša dovolenka ${dovolenka.datum_od} — ${dovolenka.datum_do} bola schválená.`,
    link: '/dovolenka',
  })

  await logAudit('schvalenie_dovolenky', 'dovolenky', id, {
    zamestnanec_id: dovolenka.user_id,
    datum_od: dovolenka.datum_od,
    datum_do: dovolenka.datum_do,
  })

  revalidatePath('/admin/dovolenky')
  revalidatePath('/dovolenka')
  updateTag('dovolenky')
  updateTag('dashboard')
  updateTag('dochadzka')
}

export async function zamietniDovolenku(id: string, dovod: string) {
  const supabase = await createSupabaseServer()

  // Načítame dovolenku pre overenie
  const { data: dovolenka } = await supabase
    .from('dovolenky')
    .select('user_id, datum_od, datum_do')
    .eq('id', id)
    .single()

  if (!dovolenka) return { error: 'Dovolenka nenájdená' }

  const auth = await requireNadriadeny(dovolenka.user_id)
  if ('error' in auth) return auth

  if (dovolenka.user_id === auth.user.id) {
    return { error: 'Nemôžete zamietnuť vlastnú žiadosť o dovolenku' }
  }

  const { error } = await supabase.from('dovolenky').update({
    stav: 'zamietnuta',
    dovod_zamietnutia: dovod,
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri zamietnutí' }

  // Notifikácia zamestnancovi
  await supabase.from('notifikacie').insert({
    user_id: dovolenka.user_id,
    typ: 'dovolenka_zamietnuta',
    nadpis: 'Dovolenka zamietnutá',
    sprava: `Vaša dovolenka ${dovolenka.datum_od} — ${dovolenka.datum_do} bola zamietnutá. Dôvod: ${dovod}`,
    link: '/dovolenka',
  })

  await logAudit('zamietnutie_dovolenky', 'dovolenky', id, { zamestnanec_id: dovolenka.user_id, dovod })

  revalidatePath('/admin/dovolenky')
  revalidatePath('/dovolenka')
  updateTag('dovolenky')
  updateTag('dashboard')
  updateTag('dochadzka')
}
