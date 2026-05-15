// src/actions/sluzobne-cesty.ts
'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireNadriadeny, requireAdmin, resolveCurrentApprover } from '@/lib/auth-helpers'
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

  // Zod validácia (date_od ≤ date_do invariant je v schéme cez .refine)
  const { CestaCreateSchema, parseFormData } = await import('@/lib/validation/schemas')
  const parsed = parseFormData(CestaCreateSchema, formData)
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

  const { error } = await supabase.from('sluzobne_cesty').insert({
    user_id: user.id,
    datum_od: d.datum_od,
    datum_do: d.datum_do,
    ciel: d.ciel,
    ucel: d.ucel,
    doprava: d.doprava,
    predpokladany_km: d.predpokladany_km ?? null,
    poznamka: d.poznamka ?? null,
    typ_cesty: d.typ_cesty,
    krajina: d.krajina ?? 'SK',
    mena: d.mena,
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
      sprava: `${zamestnanec?.full_name || 'Zamestnanec'} žiada o cestu do ${d.ciel} (${d.datum_od} — ${d.datum_do})`,
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
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const supabase = auth.supabase
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
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error, cesta: null, prikaz: null }
  const supabase = auth.supabase

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

  if (cestaData.user_id === auth.user.id) {
    return { error: 'Nemôžete schváliť vlastnú služobnú cestu' }
  }

  // Update trip status
  const { error } = await supabase.from('sluzobne_cesty').update({
    stav: 'schvalena',
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri schvaľovaní' }

  // Admin klient — RLS na profiles/jazdy/dochádzku povoľuje INSERT len admin rolám,
  // takže manager (zamestnanec) by inak nemohol auto-flow vytvárať.
  const { createSupabaseAdmin } = await import('@/lib/supabase-admin')
  const admin = createSupabaseAdmin()

  // Auto-vytvorenie jazdy zo schválenej služobnej cesty
  const { data: profile } = await admin
    .from('profiles')
    .select('vozidlo_id')
    .eq('id', cestaData.user_id)
    .single()

  if (profile?.vozidlo_id) {
    await admin.from('jazdy').insert({
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
  const dochadzkaInserts: Array<Record<string, unknown>> = []
  const current = new Date(od)
  while (current <= do_) {
    if (isPracovnyDen(current)) {
      const datum = current.toISOString().split('T')[0]
      const ranoCas = new Date(current)
      ranoCas.setHours(8, 0, 0, 0)
      const vecerCas = new Date(current)
      vecerCas.setHours(16, 30, 0, 0)

      dochadzkaInserts.push(
        { user_id: cestaData.user_id, datum, smer: 'prichod', dovod: 'sluzobna_cesta', cas: ranoCas.toISOString(), zdroj: 'system' },
        { user_id: cestaData.user_id, datum, smer: 'odchod', dovod: 'sluzobna_cesta', cas: vecerCas.toISOString(), zdroj: 'system' },
      )
    }
    current.setDate(current.getDate() + 1)
  }
  if (dochadzkaInserts.length > 0) {
    await admin.from('dochadzka').insert(dochadzkaInserts)
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

  if (cesta.user_id === auth.user.id) {
    return { error: 'Nemôžete zamietnuť vlastnú služobnú cestu' }
  }

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

export async function reviewCestaDoklad(dokladId: string, stav: 'schvaleny' | 'zamietnuty') {
  const { requireFinOrAdmin } = await import('@/lib/auth-helpers')
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return auth

  const { createSupabaseAdmin } = await import('@/lib/supabase-admin')
  const admin = createSupabaseAdmin()
  const { error } = await admin.from('cesta_doklady').update({ stav }).eq('id', dokladId)
  if (error) return { error: 'Chyba pri aktualizácii dokladu' }

  await logAudit('review_dokladu', 'cesta_doklady', dokladId, { stav })

  revalidatePath('/admin/sluzobne-cesty')
}

export async function updateVyuctovanieStav(cestaId: string, stav: string) {
  const { requireFinOrAdmin } = await import('@/lib/auth-helpers')
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return auth

  const { createSupabaseAdmin } = await import('@/lib/supabase-admin')
  const admin = createSupabaseAdmin()
  const { error } = await admin.from('sluzobne_cesty').update({ vyuctovanie_stav: stav }).eq('id', cestaId)
  if (error) return { error: 'Chyba pri aktualizácii vyúčtovania' }

  await logAudit('vyuctovanie_cesty', 'sluzobne_cesty', cestaId, { stav })

  revalidatePath('/admin/sluzobne-cesty')
}

export async function getCestaDoklady(cestaId: string) {
  const { requireFinOrAdmin } = await import('@/lib/auth-helpers')
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { data: [] }

  const { data } = await auth.supabase
    .from('cesta_doklady')
    .select('*')
    .eq('sluzobna_cesta_id', cestaId)
    .order('created_at')

  return { data: data || [] }
}
