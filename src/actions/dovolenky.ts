'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireAuth, requireNadriadeny } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
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

  const datumOd = new Date(formData.get('datum_od') as string)
  const datumDo = new Date(formData.get('datum_do') as string)
  if (datumOd > datumDo) return { error: 'Dátum od musí byť pred dátumom do' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nadriadeny_id')
    .eq('id', user.id)
    .single()

  let schvalovatelId = profile?.nadriadeny_id || null
  if (!schvalovatelId) {
    const { data: admin } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'it_admin')
      .eq('active', true)
      .limit(1)
      .single()
    schvalovatelId = admin?.id || null
  }

  const { error } = await supabase.from('dovolenky').insert({
    user_id: user.id,
    datum_od: formData.get('datum_od') as string,
    datum_do: formData.get('datum_do') as string,
    typ: formData.get('typ') as string,
    poznamka: formData.get('poznamka') as string || null,
    schvalovatel_id: schvalovatelId,
  })

  if (error) return { error: 'Chyba pri vytváraní žiadosti' }

  // Notify supervisor about new leave request
  if (schvalovatelId) {
    const { data: zamestnanec } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    await supabase.from('notifikacie').insert({
      user_id: schvalovatelId,
      typ: 'dovolenka_nova',
      nadpis: 'Nová žiadosť o dovolenku',
      sprava: `${zamestnanec?.full_name || 'Zamestnanec'} žiada o dovolenku ${formData.get('datum_od')} — ${formData.get('datum_do')}`,
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
    .select('datum_od, datum_do')
    .eq('user_id', user.id)
    .eq('stav', 'schvalena')
    .eq('typ', 'dovolenka')
    .gte('datum_od', `${rok}-01-01`)
    .lte('datum_do', `${rok}-12-31`)

  let cerpaneDni = 0
  for (const d of schvalene || []) {
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

  const { error } = await supabase.from('dovolenky').update({
    stav: 'schvalena',
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri schvaľovaní' }

  // Vytvoriť záznamy v dochádzke pre schválenú dovolenku
  const od = new Date(dovolenka.datum_od)
  const do_ = new Date(dovolenka.datum_do)
  const current = new Date(od)
  while (current <= do_) {
    if (isPracovnyDen(current)) {
      const datum = current.toISOString().split('T')[0]
      // Skontrolujeme či už existuje záznam na ten deň
      const { data: existujuci } = await supabase
        .from('dochadzka')
        .select('id')
        .eq('user_id', dovolenka.user_id)
        .eq('datum', datum)
        .eq('dovod', 'praca')
        .limit(1)

      // Ak zamestnanec nemal záznam práce na ten deň, vytvoríme dovolenku
      if (!existujuci || existujuci.length === 0) {
        const ranoCas = new Date(current)
        ranoCas.setHours(8, 0, 0, 0)
        const vecerCas = new Date(current)
        vecerCas.setHours(16, 30, 0, 0)

        await supabase.from('dochadzka').insert([
          {
            user_id: dovolenka.user_id,
            datum,
            smer: 'prichod',
            dovod: 'dovolenka',
            cas: ranoCas.toISOString(),
            zdroj: 'system',
          },
          {
            user_id: dovolenka.user_id,
            datum,
            smer: 'odchod',
            dovod: 'dovolenka',
            cas: vecerCas.toISOString(),
            zdroj: 'system',
          },
        ])
      }
    }
    current.setDate(current.getDate() + 1)
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
}
