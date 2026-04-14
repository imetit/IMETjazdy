// src/actions/archiv.ts
'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export async function getAllDokumenty(filters?: { typ?: string; stav?: string; search?: string }) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const supabase = auth.supabase
  let query = supabase
    .from('dokumenty_archiv')
    .select('*, nahral:profiles!nahral_id(full_name)')
    .order('created_at', { ascending: false })

  if (filters?.typ) query = query.eq('typ', filters.typ)
  if (filters?.stav) query = query.eq('stav', filters.stav)
  if (filters?.search) {
    // Fulltext search using tsvector index
    query = query.textSearch('search_vector', filters.search, { type: 'plain' })
  }

  const { data, error } = await query
  if (error) return { error: 'Chyba pri načítaní dokumentov' }
  return { data }
}

export async function getDokument(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const supabase = auth.supabase
  const { data, error } = await supabase
    .from('dokumenty_archiv')
    .select('*, nahral:profiles!nahral_id(full_name), schvalovatel:profiles!schvalovatel_id(full_name)')
    .eq('id', id)
    .single()

  if (error) return { error: 'Dokument nenájdený' }
  return { data }
}

export async function uploadDokumentArchiv(formData: FormData) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Žiadny súbor' }
  if (file.size > 25 * 1024 * 1024) return { error: 'Súbor je príliš veľký. Maximum 25MB.' }

  // Upload file to storage
  const now = new Date()
  const path = `archiv/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${Date.now()}_${file.name}`

  const { error: uploadError } = await auth.supabase.storage
    .from('archiv')
    .upload(path, file)

  if (uploadError) return { error: 'Chyba pri nahrávaní súboru' }

  // Create DB record
  const tagy = (formData.get('tagy') as string || '').split(',').map(t => t.trim()).filter(Boolean)

  const { data: dokument, error } = await auth.supabase.from('dokumenty_archiv').insert({
    nazov: formData.get('nazov') as string,
    typ: formData.get('typ') as string,
    file_path: path,
    file_size: file.size,
    mime_type: file.type,
    popis: formData.get('popis') as string || null,
    tagy: tagy.length > 0 ? tagy : null,
    oddelenie: formData.get('oddelenie') as string || null,
    nahral_id: auth.user.id,
    suma: formData.get('suma') ? parseFloat(formData.get('suma') as string) : null,
    datum_splatnosti: formData.get('datum_splatnosti') as string || null,
    dodavatel: formData.get('dodavatel') as string || null,
    cislo_faktury: formData.get('cislo_faktury') as string || null,
  }).select('id').single()

  if (error) return { error: 'Chyba pri ukladaní dokumentu' }

  await logAudit('upload_dokumentu', 'dokumenty_archiv', dokument?.id, {
    nazov: formData.get('nazov'),
    typ: formData.get('typ'),
  })

  revalidatePath('/admin/archiv')
}

export async function updateDokumentStav(id: string, stav: string, schvalovatelId?: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const updateData: Record<string, unknown> = { stav }
  if (stav === 'schvaleny' || stav === 'zamietnuty') {
    updateData.schvalene_at = new Date().toISOString()
  }
  if (schvalovatelId) {
    updateData.schvalovatel_id = schvalovatelId
  }

  const { error } = await auth.supabase.from('dokumenty_archiv').update(updateData).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii' }

  // Audit log
  await logAudit(`dokument_${stav}`, 'dokumenty_archiv', id, { stav, schvalovatel_id: schvalovatelId })

  revalidatePath('/admin/archiv')
  revalidatePath(`/admin/archiv/${id}`)
}

export async function deleteDokumentArchiv(id: string, filePath: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  await auth.supabase.storage.from('archiv').remove([filePath])

  const { error } = await auth.supabase.from('dokumenty_archiv').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní' }

  await logAudit('zmazanie_dokumentu', 'dokumenty_archiv', id, { file_path: filePath })

  revalidatePath('/admin/archiv')
}
