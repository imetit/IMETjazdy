import 'server-only'
import { createSupabaseAdmin } from './supabase-admin'

/**
 * Vráti zoznam firma_id ku ktorým má používateľ prístup.
 * - it_admin → null = vidí všetky firmy
 * - fin_manager bez firma_id → vidí všetky aktívne firmy
 * - ostatní → svoja firma_id + pristupne_firmy[]
 */
export async function getAccessibleFirmaIds(userId: string): Promise<string[] | null> {
  const admin = createSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, firma_id, pristupne_firmy')
    .eq('id', userId)
    .single<{ role: string; firma_id: string | null; pristupne_firmy: string[] | null }>()

  if (!profile) return []
  if (profile.role === 'it_admin') return null

  const ids: string[] = []
  if (profile.firma_id) ids.push(profile.firma_id)
  if (profile.pristupne_firmy && Array.isArray(profile.pristupne_firmy)) {
    ids.push(...profile.pristupne_firmy)
  }

  if (profile.role === 'fin_manager' && ids.length === 0) {
    const { data: firmy } = await admin.from('firmy').select('id').eq('aktivna', true)
    return (firmy || []).map(f => f.id)
  }

  return [...new Set(ids)]
}

/** Helper: aplikuje firma scope na supabase query, vracia upravený query builder. */
export function applyFirmaScope<T extends { in: (col: string, vals: string[]) => T }>(
  query: T,
  firmaCol: string,
  accessibleFirmaIds: string[] | null,
): T {
  if (accessibleFirmaIds === null) return query
  return query.in(firmaCol, accessibleFirmaIds)
}

/**
 * Postavi deterministický cache key zo scope-u firma_id pre `unstable_cache`.
 *
 * - `null` (it_admin scope) → '*'
 * - Inak: zoradí UUIDy a spojí čiarkou → 'uuid1,uuid2,...'
 *
 * Cache key je stabilný pre dané scope (poradie nezáleží — vždy zoradíme),
 * a cross-firma cache leak je vylúčený (každý scope má vlastný entry).
 */
export function buildFirmaScopeKey(accessibleFirmaIds: string[] | null): string {
  if (accessibleFirmaIds === null) return '*'
  return [...new Set(accessibleFirmaIds)].sort().join(',')
}

/**
 * Convenience: získa accessible firma IDs pre usera a vráti hotový cache key.
 * Použiť v page.tsx pred volaním cached funkcie.
 */
export async function getFirmaScopeKeyForUser(userId: string): Promise<string> {
  const ids = await getAccessibleFirmaIds(userId)
  return buildFirmaScopeKey(ids)
}
