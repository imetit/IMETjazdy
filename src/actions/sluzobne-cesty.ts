// src/actions/sluzobne-cesty.ts
'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireNadriadeny, requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { isPracovnyDen } from '@/lib/dochadzka-utils'
import { logAudit } from './audit'

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  // Len vlastník alebo admin môže aktualizovať km
  const { data: cesta } = await supabase.from('sluzobne_cesty').select('user_id').eq('id', cestaId).single()
  if (!cesta) return { error: 'Cesta nenájdená' }
  if (cesta.user_id !== user.id) {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
  }

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

  // Načítame cestu pre overenie
  const { data: cestaData } = await supabase
    .from('sluzobne_cesty')
    .select('user_id, datum_od, datum_do, predpokladany_km, ciel')
    .eq('id', id)
    .single()

  if (!cestaData) return { error: 'Cesta nenájdená' }

  // Overenie že user je nadriadený alebo it_admin
  const auth = await requireNadriadeny(cestaData.user_id)
  if ('error' in auth) return auth

  // Update trip status
  const { error } = await supabase.from('sluzobne_cesty').update({
    stav: 'schvalena',
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri schvaľovaní' }

  // Auto-vytvorenie jazdy zo schválenej služobnej cesty
  const { data: profile } = await supabase
    .from('profiles')
    .select('vozidlo_id')
    .eq('id', cestaData.user_id)
    .single()

  if (profile?.vozidlo_id) {
    await supabase.from('jazdy').insert({
      user_id: cestaData.user_id,
      mesiac: cestaData.datum_od.substring(0, 7), // YYYY-MM
      km: cestaData.predpokladany_km || 0,
      vozidlo_id: profile.vozidlo_id,
      odchod_z: '',
      prichod_do: cestaData.ciel || '',
      cas_odchodu: '00:00',
      cas_prichodu: '00:00',
      stav: 'odoslana',
    })
  }

  // Vytvoriť záznamy v dochádzke pre schválenú cestu
  const od = new Date(cestaData.datum_od)
  const do_ = new Date(cestaData.datum_do)
  const current = new Date(od)
  while (current <= do_) {
    if (isPracovnyDen(current)) {
      const datum = current.toISOString().split('T')[0]
      const ranoCas = new Date(current)
      ranoCas.setHours(8, 0, 0, 0)
      const vecerCas = new Date(current)
      vecerCas.setHours(16, 30, 0, 0)

      await supabase.from('dochadzka').insert([
        {
          user_id: cestaData.user_id,
          datum,
          smer: 'prichod',
          dovod: 'sluzobna_cesta',
          cas: ranoCas.toISOString(),
          zdroj: 'system',
        },
        {
          user_id: cestaData.user_id,
          datum,
          smer: 'odchod',
          dovod: 'sluzobna_cesta',
          cas: vecerCas.toISOString(),
          zdroj: 'system',
        },
      ])
    }
    current.setDate(current.getDate() + 1)
  }

  // Notifikácia zamestnancovi
  await supabase.from('notifikacie').insert({
    user_id: cestaData.user_id,
    typ: 'sluzobna_cesta',
    nadpis: 'Služobná cesta schválená',
    sprava: 'Vaša žiadosť o služobnú cestu bola schválená.',
    link: '/sluzobna-cesta',
  })

  await logAudit('schvalenie_cesty', 'sluzobne_cesty', id, {
    zamestnanec_id: cestaData.user_id,
    ciel: cestaData.ciel,
    datum_od: cestaData.datum_od,
    datum_do: cestaData.datum_do,
  })

  revalidatePath('/admin/sluzobne-cesty')
  revalidatePath('/sluzobna-cesta')
}

export async function zamietniCestu(id: string) {
  const supabase = await createSupabaseServer()

  const { data: cesta } = await supabase
    .from('sluzobne_cesty')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!cesta) return { error: 'Cesta nenájdená' }

  const auth = await requireNadriadeny(cesta.user_id)
  if ('error' in auth) return auth

  const { error } = await supabase.from('sluzobne_cesty').update({
    stav: 'zamietnuta',
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri zamietnutí' }

  await logAudit('zamietnutie_cesty', 'sluzobne_cesty', id, { zamestnanec_id: cesta.user_id })

  revalidatePath('/admin/sluzobne-cesty')
}

export async function ukoncCestu(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('sluzobne_cesty').update({
    stav: 'ukoncena',
  }).eq('id', id)

  if (error) return { error: 'Chyba' }

  await logAudit('ukoncenie_cesty', 'sluzobne_cesty', id)

  revalidatePath('/admin/sluzobne-cesty')
  revalidatePath(`/admin/sluzobne-cesty/${id}`)
}
