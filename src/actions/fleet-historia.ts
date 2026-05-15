'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireFleetOrAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'

export async function getHistoriaDrzitelov(vozidloId: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('vozidlo_historia_drzitelov')
    .select('*, profile:profiles(id, full_name, email)')
    .eq('vozidlo_id', vozidloId)
    .order('datum_od', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní histórie' }
  return { data }
}

export async function getOdovzdavacieProtokoly(vozidloId: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('odovzdavacie_protokoly')
    .select('*, odovzdavajuci:profiles!odovzdavajuci_id(id, full_name), preberajuci:profiles!preberajuci_id(id, full_name)')
    .eq('vozidlo_id', vozidloId)
    .order('datum', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní protokolov' }
  return { data }
}

export async function createOdovzdavaciProtokol(formData: FormData) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()
  const vozidloId = formData.get('vozidlo_id') as string
  const odovzdavajuciId = formData.get('odovzdavajuci_id') as string || null
  const preberajuciId = formData.get('preberajuci_id') as string || null

  const { error } = await supabase.from('odovzdavacie_protokoly').insert({
    vozidlo_id: vozidloId,
    odovzdavajuci_id: odovzdavajuciId,
    preberajuci_id: preberajuciId,
    datum: formData.get('datum') as string,
    km_stav: formData.get('km_stav') ? parseInt(formData.get('km_stav') as string) : null,
    stav_vozidla: formData.get('stav_vozidla') as string || null,
    poskodenia: formData.get('poskodenia') as string || null,
    prislusenstvo: formData.get('prislusenstvo') as string || null,
    poznamky: formData.get('poznamky') as string || null,
  })
  if (error) return { error: 'Chyba pri vytváraní protokolu' }

  // Update owner history — close previous, open new
  if (odovzdavajuciId) {
    await supabase.from('vozidlo_historia_drzitelov')
      .update({ datum_do: formData.get('datum') as string })
      .eq('vozidlo_id', vozidloId)
      .eq('user_id', odovzdavajuciId)
      .is('datum_do', null)
  }

  if (preberajuciId) {
    await supabase.from('vozidlo_historia_drzitelov').insert({
      vozidlo_id: vozidloId,
      user_id: preberajuciId,
      datum_od: formData.get('datum') as string,
    })

    // Update vehicle assignment
    await supabase.from('vozidla').update({
      priradeny_vodic_id: preberajuciId,
      datum_pridelenia: formData.get('datum') as string,
    }).eq('id', vozidloId)
  }

  revalidatePath(`/fleet/vozidla/${vozidloId}`)
  revalidatePath('/fleet/vozidla')
}
