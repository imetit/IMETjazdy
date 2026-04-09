'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

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
    // Počítame len pracovné dni (bez víkendov a sviatkov)
    for (let dt = new Date(od); dt <= do_; dt.setDate(dt.getDate() + 1)) {
      const day = dt.getDay()
      if (day !== 0 && day !== 6) cerpaneDni++ // Po-Pi
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
  const { error } = await supabase.from('dovolenky').update({
    stav: 'schvalena',
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri schvaľovaní' }

  // Notifikácia zamestnancovi
  const { data: dovolenka } = await supabase.from('dovolenky').select('user_id, datum_od, datum_do').eq('id', id).single()
  if (dovolenka) {
    await supabase.from('notifikacie').insert({
      user_id: dovolenka.user_id,
      typ: 'dovolenka_schvalena',
      nadpis: 'Dovolenka schválená',
      sprava: `Vaša dovolenka ${dovolenka.datum_od} — ${dovolenka.datum_do} bola schválená.`,
      link: '/dovolenka',
    })
  }

  revalidatePath('/admin/dovolenky')
  revalidatePath('/dovolenka')
}

export async function zamietniDovolenku(id: string, dovod: string) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('dovolenky').update({
    stav: 'zamietnuta',
    dovod_zamietnutia: dovod,
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri zamietnutí' }

  // Notifikácia zamestnancovi
  const { data: dovolenka } = await supabase.from('dovolenky').select('user_id, datum_od, datum_do').eq('id', id).single()
  if (dovolenka) {
    await supabase.from('notifikacie').insert({
      user_id: dovolenka.user_id,
      typ: 'dovolenka_zamietnuta',
      nadpis: 'Dovolenka zamietnutá',
      sprava: `Vaša dovolenka ${dovolenka.datum_od} — ${dovolenka.datum_do} bola zamietnutá. Dôvod: ${dovod}`,
      link: '/dovolenka',
    })
  }

  revalidatePath('/admin/dovolenky')
  revalidatePath('/dovolenka')
}
