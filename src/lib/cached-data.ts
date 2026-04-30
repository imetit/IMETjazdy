import 'server-only'
import { unstable_cache } from 'next/cache'
import { createSupabaseAdmin } from './supabase-admin'

/**
 * Cache pre statické dáta ktoré sa málo menia.
 * Šetrí Supabase round-trips (každý ~165ms z fra1 do US).
 *
 * Invalidácia:
 *   import { revalidateTag } from 'next/cache'
 *   revalidateTag('firmy')
 */

export const getFirmyAll = unstable_cache(
  async () => {
    const admin = createSupabaseAdmin()
    const { data } = await admin.from('firmy').select('*').eq('aktivna', true).order('poradie')
    return data || []
  },
  ['firmy-all'],
  { tags: ['firmy'], revalidate: 300 }, // 5 min
)

export const getFirmaById = unstable_cache(
  async (id: string) => {
    const admin = createSupabaseAdmin()
    const { data } = await admin.from('firmy').select('*').eq('id', id).maybeSingle()
    return data
  },
  ['firma-by-id'],
  { tags: ['firmy'], revalidate: 300 },
)

export const getSettingsAll = unstable_cache(
  async () => {
    const admin = createSupabaseAdmin()
    const { data } = await admin.from('settings').select('*').single()
    return data
  },
  ['settings-all'],
  { tags: ['settings'], revalidate: 300 },
)

export const getArchivKategorie = unstable_cache(
  async () => {
    const admin = createSupabaseAdmin()
    const { data } = await admin.from('archiv_kategorie').select('*').order('poradie')
    return data || []
  },
  ['archiv-kategorie'],
  { tags: ['archiv-kategorie'], revalidate: 600 }, // 10 min
)
