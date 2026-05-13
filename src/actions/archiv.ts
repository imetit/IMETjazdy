// src/actions/archiv.ts
'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { validateUpload } from '@/lib/upload-validator'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export async function getAllDokumenty(filters?: { typ?: string; stav?: string; search?: string; kategoria_id?: string }) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const supabase = auth.supabase
  let query = supabase
    .from('dokumenty_archiv')
    .select('*, nahral:profiles!nahral_id(full_name)')
    .order('created_at', { ascending: false })

  if (filters?.typ) query = query.eq('typ', filters.typ)
  if (filters?.stav) query = query.eq('stav', filters.stav)
  if (filters?.kategoria_id) query = query.eq('kategoria_id', filters.kategoria_id)
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
  const v = validateUpload(file, { category: 'any', maxSizeMb: 25 })
  if (!v.ok) return { error: v.error }

  // Upload file to storage
  const now = new Date()
  const path = `archiv/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${v.safePath}`

  const { error: uploadError } = await auth.supabase.storage
    .from('archiv')
    .upload(path, file, { contentType: file.type })

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
    kategoria_id: formData.get('kategoria_id') as string || null,
    platnost_do: formData.get('platnost_do') as string || null,
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

export async function uploadNewVersion(povodnyId: string, formData: FormData) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  // Get original document
  const { data: original, error: origErr } = await auth.supabase
    .from('dokumenty_archiv')
    .select('*')
    .eq('id', povodnyId)
    .single()

  if (origErr || !original) return { error: 'Pôvodný dokument nenájdený' }

  const file = formData.get('file') as File
  const v = validateUpload(file, { category: 'any', maxSizeMb: 25 })
  if (!v.ok) return { error: v.error }

  // Upload new file
  const now = new Date()
  const path = `archiv/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${v.safePath}`

  const { error: uploadError } = await auth.supabase.storage
    .from('archiv')
    .upload(path, file, { contentType: file.type })

  if (uploadError) return { error: 'Chyba pri nahrávaní súboru' }

  // Determine root document id
  const rootId = original.povodny_dokument_id || original.id

  // Create new version record
  const { data: newDoc, error: insertErr } = await auth.supabase.from('dokumenty_archiv').insert({
    nazov: original.nazov,
    typ: original.typ,
    file_path: path,
    file_size: file.size,
    mime_type: file.type,
    popis: original.popis,
    tagy: original.tagy,
    oddelenie: original.oddelenie,
    nahral_id: auth.user.id,
    dodavatel: original.dodavatel,
    cislo_faktury: original.cislo_faktury,
    kategoria_id: original.kategoria_id,
    platnost_do: original.platnost_do,
    povodny_dokument_id: rootId,
    verzia: (original.verzia || 1) + 1,
  }).select('id').single()

  if (insertErr) return { error: 'Chyba pri ukladaní novej verzie' }

  // Mark old document as replaced
  await auth.supabase.from('dokumenty_archiv')
    .update({ stav: 'nahradeny' })
    .eq('id', povodnyId)

  await logAudit('nova_verzia_dokumentu', 'dokumenty_archiv', newDoc?.id, {
    povodny_id: povodnyId,
    verzia: (original.verzia || 1) + 1,
  })

  revalidatePath('/admin/archiv')
  revalidatePath(`/admin/archiv/${povodnyId}`)
  return { data: newDoc }
}

export async function getDocumentVersions(dokumentId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  // Get the document first
  const { data: doc } = await auth.supabase
    .from('dokumenty_archiv')
    .select('id, povodny_dokument_id')
    .eq('id', dokumentId)
    .single()

  if (!doc) return { error: 'Dokument nenájdený' }

  // Find the root document id
  const rootId = doc.povodny_dokument_id || doc.id

  // Get all versions: the root + all that reference the root
  const { data, error } = await auth.supabase
    .from('dokumenty_archiv')
    .select('id, nazov, verzia, created_at, file_path, stav, nahral:profiles!nahral_id(full_name)')
    .or(`id.eq.${rootId},povodny_dokument_id.eq.${rootId}`)
    .order('verzia', { ascending: true })

  if (error) return { error: 'Chyba pri načítaní verzií' }
  return { data }
}

export async function getExpiringDocuments() {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const now = new Date()
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const { data, error } = await auth.supabase
    .from('dokumenty_archiv')
    .select('id, nazov, typ, platnost_do, created_at, nahral:profiles!nahral_id(full_name)')
    .not('platnost_do', 'is', null)
    .lte('platnost_do', in30Days)
    .gte('platnost_do', today)
    .neq('stav', 'nahradeny')
    .order('platnost_do')

  if (error) return { error: 'Chyba pri načítaní expirujúcich dokumentov' }
  return { data }
}
