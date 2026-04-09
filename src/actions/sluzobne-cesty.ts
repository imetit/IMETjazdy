// src/actions/sluzobne-cesty.ts
'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function getMyCesty() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  const { data, error } = await supabase
    .from('sluzobne_cesty')
    .select('*, schvalovatel:profiles!schvalovatel_id(full_name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní' }
  return { data }
}

export async function createCesta(formData: FormData) {
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

  const { error } = await supabase.from('sluzobne_cesty').insert({
    user_id: user.id,
    datum_od: formData.get('datum_od') as string,
    datum_do: formData.get('datum_do') as string,
    ciel: formData.get('ciel') as string,
    ucel: formData.get('ucel') as string,
    doprava: formData.get('doprava') as string,
    predpokladany_km: formData.get('predpokladany_km') ? parseInt(formData.get('predpokladany_km') as string) : null,
    poznamka: formData.get('poznamka') as string || null,
    schvalovatel_id: schvalovatelId,
  })

  if (error) return { error: 'Chyba pri vytváraní žiadosti' }

  // Notify supervisor about new service trip request
  if (schvalovatelId) {
    const { data: zamestnanec } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    await supabase.from('notifikacie').insert({
      user_id: schvalovatelId,
      typ: 'cesta_nova',
      nadpis: 'Nová žiadosť o služobnú cestu',
      sprava: `${zamestnanec?.full_name || 'Zamestnanec'} žiada o cestu do ${formData.get('ciel')} (${formData.get('datum_od')} — ${formData.get('datum_do')})`,
      link: '/admin/sluzobne-cesty',
    })
  }

  revalidatePath('/sluzobna-cesta')
}

export async function updateSkutocneKm(cestaId: string, km: number) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('sluzobne_cesty').update({
    skutocny_km: km,
  }).eq('id', cestaId)

  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath('/sluzobna-cesta')
}

export async function getAllCesty(filter?: { stav?: string }) {
  const supabase = await createSupabaseServer()
  let query = supabase
    .from('sluzobne_cesty')
    .select('*, profile:profiles!user_id(full_name), schvalovatel:profiles!schvalovatel_id(full_name)')
    .order('created_at', { ascending: false })

  if (filter?.stav) query = query.eq('stav', filter.stav)

  const { data, error } = await query
  if (error) return { error: 'Chyba pri načítaní' }
  return { data }
}

export async function getCestaDetail(id: string) {
  const supabase = await createSupabaseServer()

  const { data: cesta } = await supabase
    .from('sluzobne_cesty')
    .select('*, profile:profiles!user_id(full_name, email), schvalovatel:profiles!schvalovatel_id(full_name)')
    .eq('id', id)
    .single()

  const { data: prikaz } = await supabase
    .from('cestovne_prikazy')
    .select('*')
    .eq('sluzobna_cesta_id', id)
    .single()

  return { cesta, prikaz }
}

export async function schvalCestu(id: string) {
  const supabase = await createSupabaseServer()

  // Update trip status
  const { error } = await supabase.from('sluzobne_cesty').update({
    stav: 'schvalena',
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri schvaľovaní' }

  // Auto-vytvorenie jazdy zo schválenej služobnej cesty
  const { data: cesta } = await supabase
    .from('sluzobne_cesty')
    .select('user_id, datum_od, predpokladany_km')
    .eq('id', id)
    .single()

  if (cesta) {
    // Získať vozidlo zamestnanca
    const { data: profile } = await supabase
      .from('profiles')
      .select('vozidlo_id')
      .eq('id', cesta.user_id)
      .single()

    if (profile?.vozidlo_id) {
      await supabase.from('jazdy').insert({
        user_id: cesta.user_id,
        mesiac: cesta.datum_od.substring(0, 7), // YYYY-MM
        km: cesta.predpokladany_km || 0,
        vozidlo_id: profile.vozidlo_id,
        odchod_z: '',
        prichod_do: '',
        cas_odchodu: '00:00',
        cas_prichodu: '00:00',
        stav: 'odoslana',
      })
    }

    // Notifikácia zamestnancovi
    await supabase.from('notifikacie').insert({
      user_id: cesta.user_id,
      typ: 'sluzobna_cesta',
      nadpis: 'Služobná cesta schválená',
      sprava: 'Vaša žiadosť o služobnú cestu bola schválená.',
      link: '/sluzobna-cesta',
    })
  }

  revalidatePath('/admin/sluzobne-cesty')
  revalidatePath('/sluzobna-cesta')
}

export async function zamietniCestu(id: string) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('sluzobne_cesty').update({
    stav: 'zamietnuta',
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri zamietnutí' }
  revalidatePath('/admin/sluzobne-cesty')
}

export async function ukoncCestu(id: string) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('sluzobne_cesty').update({
    stav: 'ukoncena',
  }).eq('id', id)

  if (error) return { error: 'Chyba' }
  revalidatePath('/admin/sluzobne-cesty')
  revalidatePath(`/admin/sluzobne-cesty/${id}`)
}
