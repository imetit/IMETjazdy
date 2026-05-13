'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { validateUpload } from '@/lib/upload-validator'
import { requireFleetOrAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'

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
  // Authz check chýbal úplne — pridávame, aby nikto bez fleet/admin role
  // nemohol uploadovať dokument k vozidlu.
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()
  const vozidloId = formData.get('vozidlo_id') as string
  if (!vozidloId) return { error: 'vozidlo_id chýba' }

  const file = formData.get('file') as File
  const v = validateUpload(file, { category: 'document', maxSizeMb: 25 })
  if (!v.ok) return { error: v.error }

  const filePath = `${vozidloId}/dokumenty/${v.safePath}`
  const { error: uploadError } = await supabase.storage.from('fleet-documents').upload(filePath, file, {
    contentType: file.type,
  })
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
