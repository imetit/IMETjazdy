'use server'

import { requireFleetOrAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export async function getTankovanie(vozidloId: string) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error, data: [] }

  const adminClient = createSupabaseAdmin()
  const { data, error } = await adminClient
    .from('vozidlo_tankovanie')
    .select('*, profile:profiles!created_by(full_name), tankova_karta:tankove_karty!tankova_karta_id(cislo_karty, typ)')
    .eq('vozidlo_id', vozidloId)
    .order('datum', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní tankovaní', data: [] }
  return { data: data || [] }
}

export async function createTankovanie(formData: FormData) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createSupabaseAdmin()

  const vozidloId = formData.get('vozidlo_id') as string
  const litrov = parseFloat(formData.get('litrov') as string)
  const cenaZaLiter = formData.get('cena_za_liter') ? parseFloat(formData.get('cena_za_liter') as string) : null
  const celkovaCena = formData.get('celkova_cena') ? parseFloat(formData.get('celkova_cena') as string) : 0
  const kmNaTachometri = formData.get('km_na_tachometri') ? parseInt(formData.get('km_na_tachometri') as string) : null
  const plnaNaplna = formData.get('plna_naplna') === 'true' || formData.get('plna_naplna') === 'on'
  const tankovaKartaId = formData.get('tankova_karta_id') as string || null

  const { data, error } = await adminClient.from('vozidlo_tankovanie').insert({
    vozidlo_id: vozidloId,
    datum: formData.get('datum') as string,
    litrov,
    cena_za_liter: cenaZaLiter,
    celkova_cena: celkovaCena,
    km_na_tachometri: kmNaTachometri,
    plna_naplna: plnaNaplna,
    tankova_karta_id: tankovaKartaId || null,
    poznamka: (formData.get('poznamka') as string) || null,
    created_by: auth.user.id,
  }).select().single()

  if (error) return { error: 'Chyba pri vytváraní tankovania' }

  await logAudit('tankovanie_vytvorene', 'vozidlo_tankovanie', data?.id, {
    vozidlo_id: vozidloId,
    litrov,
    celkova_cena: celkovaCena,
  })

  // Aktualizuj km na vozidle ak boli zadané
  if (kmNaTachometri) {
    await adminClient.from('km_historia').insert({
      vozidlo_id: vozidloId,
      km: kmNaTachometri,
      zdroj: 'manualne',
    })
    await adminClient.from('vozidla').update({ aktualne_km: kmNaTachometri }).eq('id', vozidloId)
  }

  revalidatePath(`/fleet/vozidla/${vozidloId}`)
  return { data }
}

export async function deleteTankovanie(id: string) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createSupabaseAdmin()

  const { error } = await adminClient.from('vozidlo_tankovanie').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní tankovania' }

  await logAudit('tankovanie_zmazane', 'vozidlo_tankovanie', id)

  revalidatePath('/fleet')
  return {}
}

export async function getSpotrebaStats(vozidloId: string): Promise<{ priemer: number | null }> {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { priemer: null }

  const adminClient = createSupabaseAdmin()

  // Načítaj všetky plné náplne zoradené podľa km
  const { data } = await adminClient
    .from('vozidlo_tankovanie')
    .select('litrov, km_na_tachometri')
    .eq('vozidlo_id', vozidloId)
    .eq('plna_naplna', true)
    .not('km_na_tachometri', 'is', null)
    .order('km_na_tachometri', { ascending: true })

  if (!data || data.length < 2) return { priemer: null }

  // Pre každý pár po sebe idúcich plných náplní vypočítaj spotrebu
  const spotreby: number[] = []
  for (let i = 1; i < data.length; i++) {
    const km1 = data[i - 1].km_na_tachometri!
    const km2 = data[i].km_na_tachometri!
    const litrov = data[i].litrov
    const vzdialenost = km2 - km1

    if (vzdialenost > 0 && litrov > 0) {
      spotreby.push((litrov / vzdialenost) * 100)
    }
  }

  if (spotreby.length === 0) return { priemer: null }

  const priemer = spotreby.reduce((a, b) => a + b, 0) / spotreby.length
  return { priemer: Math.round(priemer * 10) / 10 }
}
