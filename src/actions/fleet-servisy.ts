'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireFleetOrAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

export async function getServisy(filters?: { vozidloId?: string; typ?: string; stav?: string }) {
  const supabase = await createSupabaseServer()
  let query = supabase
    .from('vozidlo_servisy')
    .select('*, vozidlo:vozidla(id, znacka, variant, spz)')

  if (filters?.vozidloId) query = query.eq('vozidlo_id', filters.vozidloId)
  if (filters?.typ) query = query.eq('typ', filters.typ)
  if (filters?.stav) query = query.eq('stav', filters.stav)

  const { data, error } = await query.order('datum', { ascending: false })
  if (error) return { error: 'Chyba pri načítaní servisov' }
  return { data }
}

export async function getServisDetail(id: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('vozidlo_servisy')
    .select('*, vozidlo:vozidla(id, znacka, variant, spz), prilohy:servis_prilohy(*)')
    .eq('id', id)
    .single()

  if (error) return { error: 'Servis nenájdený' }
  return { data }
}

export async function createServis(formData: FormData) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const supabase = auth.supabase
  const vozidloId = formData.get('vozidlo_id') as string
  const kmPriServise = formData.get('km_pri_servise') ? parseInt(formData.get('km_pri_servise') as string) : null

  const { data: servis, error } = await supabase.from('vozidlo_servisy').insert({
    vozidlo_id: vozidloId,
    typ: formData.get('typ') as string,
    datum: formData.get('datum') as string,
    popis: formData.get('popis') as string,
    cena: formData.get('cena') ? parseFloat(formData.get('cena') as string) : null,
    dodavatel: formData.get('dodavatel') as string || null,
    stav: formData.get('stav') as string || 'planovane',
    km_pri_servise: kmPriServise,
  }).select().single()

  if (error || !servis) return { error: 'Chyba pri vytváraní servisu' }

  const files = formData.getAll('files') as File[]
  for (const file of files) {
    if (file.size === 0) continue
    const filePath = `${vozidloId}/servisy/${servis.id}/${uuidv4()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('fleet-documents')
      .upload(filePath, file)

    if (!uploadError) {
      await supabase.from('servis_prilohy').insert({
        servis_id: servis.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
      })
    }
  }

  if (kmPriServise) {
    await supabase.from('km_historia').insert({
      vozidlo_id: vozidloId,
      km: kmPriServise,
      zdroj: 'servis',
    })
    await supabase.from('vozidla').update({ aktualne_km: kmPriServise }).eq('id', vozidloId)
  }

  revalidatePath('/fleet/servisy')
  revalidatePath(`/fleet/vozidla/${vozidloId}`)
}

export async function updateServisStav(id: string, stav: string) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('vozidlo_servisy').update({ stav }).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii stavu' }
  revalidatePath('/fleet/servisy')
}

export async function deleteServis(id: string) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const supabase = auth.supabase
  const { data: prilohy } = await supabase
    .from('servis_prilohy')
    .select('file_path')
    .eq('servis_id', id)

  if (prilohy?.length) {
    await supabase.storage
      .from('fleet-documents')
      .remove(prilohy.map(p => p.file_path))
  }

  const { error } = await supabase.from('vozidlo_servisy').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní servisu' }
  revalidatePath('/fleet/servisy')
}
