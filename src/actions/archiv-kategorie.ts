// src/actions/archiv-kategorie.ts
'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export async function getKategorie() {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const { data, error } = await auth.supabase
    .from('archiv_kategorie')
    .select('*')
    .order('poradie')

  if (error) return { error: 'Chyba pri načítaní kategórií' }
  return { data }
}

export async function createKategoria(nazov: string, parentId?: string, pristupRole?: string[]) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  // Get max poradie
  const { data: maxRow } = await auth.supabase
    .from('archiv_kategorie')
    .select('poradie')
    .order('poradie', { ascending: false })
    .limit(1)
    .single()

  const poradie = (maxRow?.poradie ?? 0) + 1

  const { data, error } = await auth.supabase
    .from('archiv_kategorie')
    .insert({
      nazov,
      parent_id: parentId || null,
      pristup_role: pristupRole || null,
      poradie,
    })
    .select('id')
    .single()

  if (error) return { error: 'Chyba pri vytváraní kategórie' }

  await logAudit('vytvorenie_kategorie', 'archiv_kategorie', data?.id, { nazov })
  revalidatePath('/admin/archiv')
  return { data }
}

export async function updateKategoria(id: string, updateData: { nazov?: string; pristup_role?: string[]; poradie?: number }) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const { error } = await auth.supabase
    .from('archiv_kategorie')
    .update(updateData)
    .eq('id', id)

  if (error) return { error: 'Chyba pri aktualizácii kategórie' }

  await logAudit('aktualizacia_kategorie', 'archiv_kategorie', id, updateData)
  revalidatePath('/admin/archiv')
}

export async function deleteKategoria(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  // Find "Ostatné" category
  const { data: ostatne } = await auth.supabase
    .from('archiv_kategorie')
    .select('id')
    .eq('nazov', 'Ostatné')
    .single()

  if (!ostatne) return { error: 'Kategória "Ostatné" nenájdená' }

  // Move documents to "Ostatné"
  await auth.supabase
    .from('dokumenty_archiv')
    .update({ kategoria_id: ostatne.id })
    .eq('kategoria_id', id)

  // Delete the category
  const { error } = await auth.supabase
    .from('archiv_kategorie')
    .delete()
    .eq('id', id)

  if (error) return { error: 'Chyba pri mazaní kategórie' }

  await logAudit('zmazanie_kategorie', 'archiv_kategorie', id)
  revalidatePath('/admin/archiv')
}
