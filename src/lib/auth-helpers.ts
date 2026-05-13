'use server'

import { createSupabaseServer } from './supabase-server'
import { getAccessibleFirmaIds } from './firma-scope'
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
 * Vyžaduje finančnú manažérku, admin alebo it_admin rolu.
 * Používať pri akciách, ktoré majú vidieť aj fin_manager (archív, reporty, schvaľovanie).
 */
export async function requireFinOrAdmin(): Promise<AuthResult & { error?: never } | { error: string }> {
  return requireRole(['fin_manager', 'admin', 'it_admin'])
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
 * Overí, že prihlásený user je nadriadený daného zamestnanca,
 * alebo je zastupujúci nadriadeného (profiles.zastupuje_id), alebo it_admin.
 *
 * Používa admin klient pre lookup nadriadeny_id — RLS na profiles dovoľuje
 * len self-read pre zamestnancov, takže manager (rola=zamestnanec) by inak
 * nemohol overiť svoju nadriadenosť. Verifikácia oprávnení sa stále robí
 * v aplikačnej vrstve (porovnanie s result.user.id).
 */
export async function requireNadriadeny(zamestnanecId: string): Promise<AuthResult & { error?: never } | { error: string }> {
  const result = await requireAuth()
  if ('error' in result) return result

  // it_admin môže všetko
  if (result.profile.role === 'it_admin') return result

  const { createSupabaseAdmin } = await import('./supabase-admin')
  const admin = createSupabaseAdmin()

  const { data: zamestnanec } = await admin
    .from('profiles')
    .select('nadriadeny_id')
    .eq('id', zamestnanecId)
    .single<{ nadriadeny_id: string | null }>()

  if (!zamestnanec?.nadriadeny_id) {
    return { error: 'Nie ste nadriadený tohto zamestnanca' }
  }

  // Priamy nadriadený
  if (zamestnanec.nadriadeny_id === result.user.id) return result

  // Zastupujúci: primárny nadriadený má zastupuje_id = ja
  const { data: primary } = await admin
    .from('profiles')
    .select('zastupuje_id')
    .eq('id', zamestnanec.nadriadeny_id)
    .single<{ zastupuje_id: string | null }>()

  if (primary?.zastupuje_id === result.user.id) return result

  return { error: 'Nie ste nadriadený tohto zamestnanca' }
}

/**
 * Vyžaduje admin/it_admin/fin_manager rolu A overí, že target zamestnanec
 * patrí do scope volajúceho (cez accessible firma IDs).
 *
 * - it_admin → vždy prejde (vidí všetky firmy)
 * - admin/fin_manager → target user musí mať firma_id ∈ accessibleFirmaIds(volajúci)
 *
 * Použiť pre KAŽDÚ admin akciu ktorá berie target userId/zamestnanecId.
 * Nahrádza naivný `requireAdmin()` ktorý cross-firma izoláciu neoveruje.
 */
export async function requireScopedAdmin(
  targetUserId: string,
): Promise<AuthResult & { error?: never } | { error: string }> {
  const result = await requireRole(['admin', 'it_admin', 'fin_manager'])
  if ('error' in result) return result

  if (result.profile.role === 'it_admin') return result

  const { createSupabaseAdmin } = await import('./supabase-admin')
  const admin = createSupabaseAdmin()

  const { data: target } = await admin
    .from('profiles')
    .select('firma_id')
    .eq('id', targetUserId)
    .single<{ firma_id: string | null }>()

  if (!target) return { error: 'Cieľový užívateľ nenájdený' }
  if (!target.firma_id) return { error: 'Cieľový užívateľ nemá priradenú firmu' }

  const accessible = await getAccessibleFirmaIds(result.user.id)
  if (accessible !== null && !accessible.includes(target.firma_id)) {
    return { error: 'Cieľový zamestnanec je mimo vášho scope' }
  }

  return result
}

/**
 * Asercia: target rekord s daným firma_id je v scope volajúceho.
 * Pre prípady kde priamo poznáme firma_id (faktúra, vozidlo, dokument...).
 */
export async function requireScopedFirma(
  targetFirmaId: string,
  allowedRoles: RoleType[] = ['admin', 'it_admin', 'fin_manager', 'fleet_manager'],
): Promise<AuthResult & { error?: never } | { error: string }> {
  const result = await requireRole(allowedRoles)
  if ('error' in result) return result
  if (result.profile.role === 'it_admin') return result

  const accessible = await getAccessibleFirmaIds(result.user.id)
  if (accessible !== null && !accessible.includes(targetFirmaId)) {
    return { error: 'Záznam je mimo vášho scope' }
  }
  return result
}

/**
 * Vráti ID aktuálneho schvaľovateľa pre daného zamestnanca.
 * Ak je priamy nadriadený dnes na schválenej dovolenke, vráti jeho zastupuje_id
 * (ak je nastavený). Inak vráti priameho nadriadeného. Môže vrátiť null ak nemá nikoho.
 */
export async function resolveCurrentApprover(
  _supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  zamestnanecId: string,
): Promise<string | null> {
  // Používame admin klient — RLS by inak blokovala čítanie nadriadeného
  // (zamestnanec nemôže čítať dovolenky/profil iného zamestnanca cez user-supabase klient).
  const { createSupabaseAdmin } = await import('./supabase-admin')
  const admin = createSupabaseAdmin()

  const { data: emp } = await admin
    .from('profiles')
    .select('nadriadeny_id')
    .eq('id', zamestnanecId)
    .single<{ nadriadeny_id: string | null }>()

  const primary = emp?.nadriadeny_id
  if (!primary) return null

  const today = new Date().toISOString().split('T')[0]

  const { data: onLeave } = await admin
    .from('dovolenky')
    .select('id')
    .eq('user_id', primary)
    .eq('stav', 'schvalena')
    .lte('datum_od', today)
    .gte('datum_do', today)
    .limit(1)

  if (onLeave && onLeave.length > 0) {
    const { data: primaryProfile } = await admin
      .from('profiles')
      .select('zastupuje_id')
      .eq('id', primary)
      .single<{ zastupuje_id: string | null }>()

    if (primaryProfile?.zastupuje_id) return primaryProfile.zastupuje_id
  }

  return primary
}
