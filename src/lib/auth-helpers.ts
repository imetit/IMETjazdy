'use server'

import { createSupabaseServer } from './supabase-server'
import type { Profile } from './types'

export type RoleType = Profile['role']

interface AuthResult {
  user: { id: string }
  profile: Profile
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>
}

/**
 * Vyžaduje prihláseného používateľa a vráti jeho profil + supabase klienta.
 * Ak nie je prihlásený, vráti error.
 */
export async function requireAuth(): Promise<AuthResult & { error?: never } | { error: string }> {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profil nenájdený' }

  return { user, profile: profile as Profile, supabase }
}

/**
 * Vyžaduje konkrétnu rolu. Vracia error ak user nemá jednu z povolených rolí.
 */
export async function requireRole(roles: RoleType[]): Promise<AuthResult & { error?: never } | { error: string }> {
  const result = await requireAuth()
  if ('error' in result) return result

  if (!roles.includes(result.profile.role)) {
    return { error: 'Nedostatočné oprávnenia' }
  }

  return result
}

/**
 * Vyžaduje admin rolu (admin alebo it_admin).
 */
export async function requireAdmin(): Promise<AuthResult & { error?: never } | { error: string }> {
  return requireRole(['admin', 'it_admin'])
}

/**
 * Vyžaduje fleet manager alebo admin rolu.
 */
export async function requireFleetOrAdmin(): Promise<AuthResult & { error?: never } | { error: string }> {
  return requireRole(['fleet_manager', 'admin', 'it_admin'])
}

/**
 * Overí, že prihlásený user je vlastníkom záznamu ALEBO admin.
 */
export async function requireOwnerOrAdmin(ownerId: string): Promise<AuthResult & { error?: never } | { error: string }> {
  const result = await requireAuth()
  if ('error' in result) return result

  if (result.user.id !== ownerId && !['admin', 'it_admin'].includes(result.profile.role)) {
    return { error: 'Nedostatočné oprávnenia' }
  }

  return result
}

/**
 * Overí, že prihlásený user je nadriadený daného zamestnanca ALEBO it_admin.
 */
export async function requireNadriadeny(zamestnanecId: string): Promise<AuthResult & { error?: never } | { error: string }> {
  const result = await requireAuth()
  if ('error' in result) return result

  // it_admin môže všetko
  if (result.profile.role === 'it_admin') return result

  // Overíme nadriadený vzťah
  const { data: zamestnanec } = await result.supabase
    .from('profiles')
    .select('nadriadeny_id')
    .eq('id', zamestnanecId)
    .single()

  if (!zamestnanec || zamestnanec.nadriadeny_id !== result.user.id) {
    return { error: 'Nie ste nadriadený tohto zamestnanca' }
  }

  return result
}
