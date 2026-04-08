'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

export async function getDokumenty(vozidloId: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('vozidlo_dokumenty')
    .select('*')
    .eq('vozidlo_id', vozidloId)
    .order('created_at', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní dokumentov' }
  return { data }
}

export async function uploadDokument(formData: FormData) {
  const supabase = await createSupabaseServer()
  const vozidloId = formData.get('vozidlo_id') as string
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Žiadny súbor' }

  const filePath = `${vozidloId}/dokumenty/${uuidv4()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('fleet-documents').upload(filePath, file)
  if (uploadError) return { error: 'Chyba pri nahrávaní súboru' }

  const { error } = await supabase.from('vozidlo_dokumenty').insert({
    vozidlo_id: vozidloId,
    typ: formData.get('typ') as string,
    nazov: formData.get('nazov') as string,
    file_path: filePath,
    file_size: file.size,
    platnost_do: formData.get('platnost_do') as string || null,
  })
  if (error) return { error: 'Chyba pri ukladaní dokumentu' }
  revalidatePath(`/fleet/vozidla/${vozidloId}`)
}

export async function deleteDokument(id: string, filePath: string) {
  const supabase = await createSupabaseServer()
  await supabase.storage.from('fleet-documents').remove([filePath])
  const { error } = await supabase.from('vozidlo_dokumenty').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní dokumentu' }
  revalidatePath('/fleet/vozidla')
}
