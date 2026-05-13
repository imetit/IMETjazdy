import 'server-only'
import { unstable_cache } from 'next/cache'
import { createSupabaseAdmin } from './supabase-admin'

/**
 * Page-level cache vrstvy. Cieľ: full content TTFB pod 100ms na admin pages.
 *
 * Stratégia:
 * - Cache hit = ~5-15ms (Vercel data cache lookup)
 * - Cache miss = pôvodná latencia (raz za 60s alebo keď akcia revalidatuje tag)
 * - Server actions volajú revalidateTag('xxx') pri modifikácii dát
 *
 * MULTI-TENANT BEZPEČNOSŤ (Phase 1 fix):
 * - Každá cached funkcia má `firmaIdsKey: string` parameter, ktorý je súčasťou
 *   cache key. Admin firmy A a admin firmy B dostávajú samostatné cache entries.
 * - firmaIdsKey === '*' → it_admin scope = všetky firmy
 * - firmaIdsKey === 'uuid1,uuid2,...' → obmedzený set firma_id (zoradený)
 * - Volajúci (page.tsx) získava key cez buildFirmaScopeKey() v firma-scope.ts
 *
 * Pre tabuľky ktoré nemajú priamo firma_id (jazdy, dovolenky, vozidlo_kontroly...),
 * scope sa aplikuje cez `user_id IN <profiles z firmy>` predfilter.
 */

/** Vráti user IDs v scope firmaIds. null firmaIds → vráti null (it_admin scope). */
async function getUserIdsInScope(firmaIds: string[] | null): Promise<string[] | null> {
  if (firmaIds === null) return null
  if (firmaIds.length === 0) return []
  const admin = createSupabaseAdmin()
  const { data } = await admin.from('profiles').select('id').in('firma_id', firmaIds)
  return (data || []).map(p => p.id)
}

function parseFirmaIdsKey(key: string): string[] | null {
  if (key === '*') return null
  return key.split(',').filter(Boolean)
}

// ── /admin (dashboard) ──────────────────────────────────────────────────
// Cache key obsahuje firmaIdsKey → každý scope dostane samostatný cache entry.
// Mimo scope ostávajú: vozidlo_kontroly (vozidla nemajú firma_id; budú filtrovať
// na page-level alebo Phase 5 keď doplníme vozidla.firma_id).
export const getAdminDashboardData = unstable_cache(
  async (mesiac: string, firmaIdsKey: string) => {
    const admin = createSupabaseAdmin()
    const firmaIds = parseFirmaIdsKey(firmaIdsKey)
    const userIds = await getUserIdsInScope(firmaIds)

    const now = new Date()
    const cutoff = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]

    // Pre filter — empty set placeholder ak scope je '0 firiem'
    const NO_MATCH = '00000000-0000-0000-0000-000000000000'
    const userScope = userIds === null ? null : (userIds.length === 0 ? [NO_MATCH] : userIds)
    const firmaScope = firmaIds === null ? null : (firmaIds.length === 0 ? [NO_MATCH] : firmaIds)

    const jazdyCelkomQ = admin.from('jazdy').select('*', { count: 'exact', head: true })
    const jazdyOdoslaneQ = admin.from('jazdy').select('*', { count: 'exact', head: true }).eq('stav', 'odoslana')
    const jazdyMesiacQ = admin.from('jazdy').select('*', { count: 'exact', head: true }).eq('mesiac', mesiac)
    const dovolenkyQ = admin.from('dovolenky').select('*', { count: 'exact', head: true }).eq('stav', 'caka_na_schvalenie')
    const cestyQ = admin.from('sluzobne_cesty').select('*', { count: 'exact', head: true }).eq('stav', 'nova')
    const profQ = admin.from('profiles').select('*', { count: 'exact', head: true }).eq('active', true).neq('role', 'tablet')
    const hlaseniaQ = admin.from('vozidlo_hlasenia').select('*', { count: 'exact', head: true }).eq('stav', 'nove')
    const posledneJazdyQ = admin.from('jazdy').select('id, mesiac, km, stav, created_at, user_id, profile:profiles(full_name)').order('created_at', { ascending: false }).limit(5)
    const posledneAuditQ = admin.from('audit_log').select('*, profile:profiles!user_id(full_name)').order('created_at', { ascending: false }).limit(8)

    const [
      jazdyCelkom, jazdyOdoslane, jazdyMesiac,
      dovolenkyNaSchvalenie, cestyNove,
      aktivniZamestnanci, hlaseniaNove,
      posledneJazdy, posledneAudit, bliziaceSaKontroly,
    ] = await Promise.all([
      userScope ? jazdyCelkomQ.in('user_id', userScope) : jazdyCelkomQ,
      userScope ? jazdyOdoslaneQ.in('user_id', userScope) : jazdyOdoslaneQ,
      userScope ? jazdyMesiacQ.in('user_id', userScope) : jazdyMesiacQ,
      userScope ? dovolenkyQ.in('user_id', userScope) : dovolenkyQ,
      userScope ? cestyQ.in('user_id', userScope) : cestyQ,
      firmaScope ? profQ.in('firma_id', firmaScope) : profQ,
      userScope ? hlaseniaQ.in('user_id', userScope) : hlaseniaQ,
      userScope ? posledneJazdyQ.in('user_id', userScope) : posledneJazdyQ,
      userScope ? posledneAuditQ.in('user_id', userScope) : posledneAuditQ,
      // vozidlo_kontroly: vozidla nemajú firma_id → nefiltrujeme. Phase 5 doplní stĺpec.
      admin.from('vozidlo_kontroly').select('typ, platnost_do, vozidlo:vozidla(spz, znacka)')
        .lte('platnost_do', cutoff).gte('platnost_do', today)
        .order('platnost_do').limit(5),
    ])

    return {
      jazdyCelkom: jazdyCelkom.count ?? 0,
      jazdyOdoslane: jazdyOdoslane.count ?? 0,
      jazdyMesiac: jazdyMesiac.count ?? 0,
      dovolenkyNaSchvalenie: dovolenkyNaSchvalenie.count ?? 0,
      cestyNove: cestyNove.count ?? 0,
      aktivniZamestnanci: aktivniZamestnanci.count ?? 0,
      hlaseniaNove: hlaseniaNove.count ?? 0,
      posledneJazdy: posledneJazdy.data || [],
      posledneAudit: posledneAudit.data || [],
      bliziaceSaKontroly: bliziaceSaKontroly.data || [],
    }
  },
  ['admin-dashboard-v2'],  // bump key → invalidates pre-firma-scope cache
  { revalidate: 60, tags: ['dashboard', 'jazdy', 'dovolenky', 'cesty'] },
)

// ── /admin/jazdy ────────────────────────────────────────────────────────
export const getAdminJazdy = unstable_cache(
  async (firmaIdsKey: string) => {
    const admin = createSupabaseAdmin()
    const firmaIds = parseFirmaIdsKey(firmaIdsKey)
    const userIds = await getUserIdsInScope(firmaIds)

    let q = admin.from('jazdy')
      .select('*, profile:profiles(full_name)')
      .order('created_at', { ascending: false })
    if (userIds !== null) {
      if (userIds.length === 0) return []
      q = q.in('user_id', userIds)
    }
    const { data } = await q
    return data || []
  },
  ['admin-jazdy-v2'],
  { revalidate: 60, tags: ['jazdy'] },
)

// ── /admin/zamestnanci ──────────────────────────────────────────────────
export const getAdminZamestnanci = unstable_cache(
  async (firmaIdsKey: string) => {
    const admin = createSupabaseAdmin()
    const firmaIds = parseFirmaIdsKey(firmaIdsKey)

    let zQ = admin.from('profiles').select('*, vozidlo:vozidla!fk_profiles_vozidlo(*)').neq('role', 'tablet').order('full_name')
    if (firmaIds !== null) {
      if (firmaIds.length === 0) return { zamestnanci: [], vozidla: [], firmy: [] }
      zQ = zQ.in('firma_id', firmaIds)
    }
    const [zResult, vResult, fResult] = await Promise.all([
      zQ,
      admin.from('vozidla').select('*').eq('aktivne', true).order('znacka'),
      // firmy: vždy len v scope (it_admin vidí všetky)
      firmaIds === null
        ? admin.from('firmy').select('id, kod, nazov').eq('aktivna', true).order('poradie')
        : admin.from('firmy').select('id, kod, nazov').eq('aktivna', true).in('id', firmaIds).order('poradie'),
    ])
    return {
      zamestnanci: zResult.data || [],
      vozidla: vResult.data || [],
      firmy: fResult.data || [],
    }
  },
  ['admin-zamestnanci-v2'],
  { revalidate: 120, tags: ['zamestnanci'] },
)

// ── /admin/archiv ───────────────────────────────────────────────────────
// dokumenty_archiv nemá firma_id. Necháme global cache, ale audit log doplníme
// v Phase 5 doplnením firma_id column do dokumenty_archiv.
export const getAdminArchiv = unstable_cache(
  async (kategoriaId?: string) => {
    const admin = createSupabaseAdmin()
    let qFiltered = admin.from('dokumenty_archiv').select('*, kategoria:archiv_kategorie(*)').order('created_at', { ascending: false })
    if (kategoriaId) qFiltered = qFiltered.eq('kategoria_id', kategoriaId)

    const [filtered, all, kategorie] = await Promise.all([
      qFiltered,
      kategoriaId
        ? admin.from('dokumenty_archiv').select('id, kategoria_id')
        : Promise.resolve({ data: null }),
      admin.from('archiv_kategorie').select('*').order('poradie'),
    ])
    const allDocs = all.data ?? filtered.data ?? []
    const counts: Record<string, number> = {}
    for (const d of allDocs) {
      if (d.kategoria_id) counts[d.kategoria_id] = (counts[d.kategoria_id] || 0) + 1
    }
    return {
      dokumenty: filtered.data || [],
      kategorie: kategorie.data || [],
      counts,
    }
  },
  ['admin-archiv'],
  { revalidate: 60, tags: ['archiv'] },
)

// ── /admin/dochadzka — getMesacneSumary cache ────────────────────────────
// Podpisová funkcia volaná z page po auth checku. Cache key = mesiac + firmaIds.
export const getCachedMesacneSumary = unstable_cache(
  async (mesiac: string, firmaIdsKey: string) => {
    const { computeMesacneSumary } = await import('./dochadzka-sumary')
    const firmaIds = firmaIdsKey === '*' ? null : firmaIdsKey.split(',')
    return computeMesacneSumary(mesiac, firmaIds)
  },
  ['mesacne-sumary'],
  { revalidate: 60, tags: ['dochadzka'] },
)

// ── /admin/dochadzka — getVPraciDnes cache ───────────────────────────────
export const getCachedVPraciDnes = unstable_cache(
  async (firmaIdsKey: string): Promise<{ data: Array<{ id: string; full_name: string; prichod_cas: string }> }> => {
    const admin = createSupabaseAdmin()
    const today = new Date().toISOString().split('T')[0]
    const firmaIds = firmaIdsKey === '*' ? null : firmaIdsKey.split(',')

    let profQ = admin.from('profiles').select('id, full_name').eq('active', true).neq('role', 'tablet')
    if (firmaIds) profQ = profQ.in('firma_id', firmaIds)
    const { data: profiles } = await profQ
    const userIds = (profiles || []).map(p => p.id)
    if (userIds.length === 0) return { data: [] }

    const { data: zaznamy } = await admin.from('dochadzka')
      .select('user_id, smer, cas')
      .in('user_id', userIds).eq('datum', today)
      .order('cas', { ascending: true })

    const lastByUser = new Map<string, { smer: string; cas: string }>()
    for (const z of zaznamy || []) lastByUser.set(z.user_id, z)

    const result: Array<{ id: string; full_name: string; prichod_cas: string }> = []
    for (const p of profiles || []) {
      const last = lastByUser.get(p.id)
      if (last && last.smer === 'prichod') {
        result.push({ id: p.id, full_name: p.full_name, prichod_cas: last.cas })
      }
    }
    return { data: result }
  },
  ['v-praci-dnes'],
  { revalidate: 30, tags: ['dochadzka'] },
)

// ── /admin/faktury — cached list ─────────────────────────────────────────
// Faktury majú firma_id priamo → filtrujeme v cache podľa scope.
export const getCachedFaktury = unstable_cache(
  async (firmaIdsKey: string) => {
    const admin = createSupabaseAdmin()
    const firmaIds = parseFirmaIdsKey(firmaIdsKey)

    let q = admin.from('faktury')
      .select('*, dodavatel:dodavatelia(nazov), firma:firmy(kod,nazov), nahral:profiles!nahral_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(500)
    if (firmaIds !== null) {
      if (firmaIds.length === 0) return []
      q = q.in('firma_id', firmaIds)
    }
    const { data } = await q
    return data || []
  },
  ['admin-faktury-v2'],
  { revalidate: 30, tags: ['faktury'] },
)

// Dodavatelia majú firma_id (multi-tenant supplier list per firma).
export const getCachedDodavatelia = unstable_cache(
  async (firmaIdsKey: string) => {
    const admin = createSupabaseAdmin()
    const firmaIds = parseFirmaIdsKey(firmaIdsKey)

    let q = admin.from('dodavatelia').select('*').eq('aktivny', true).order('nazov').limit(500)
    if (firmaIds !== null) {
      if (firmaIds.length === 0) return []
      q = q.in('firma_id', firmaIds)
    }
    const { data } = await q
    return data || []
  },
  ['admin-dodavatelia-v2'],
  { revalidate: 60, tags: ['dodavatelia'] },
)

// ── /admin/dovolenky — cache for non-IT-admin (per schvalovatel) ─────────
// Dovolenky nemajú firma_id, len user_id. Filter cez profile.firma_id.
export const getCachedDovolenkyNaSchvalenieAll = unstable_cache(
  async (firmaIdsKey: string) => {
    const admin = createSupabaseAdmin()
    const firmaIds = parseFirmaIdsKey(firmaIdsKey)
    const userIds = await getUserIdsInScope(firmaIds)

    let q = admin.from('dovolenky')
      .select('*, profile:profiles!user_id(full_name), schvalovatel:profiles!schvalovatel_id(full_name)')
      .order('created_at', { ascending: false })
    if (userIds !== null) {
      if (userIds.length === 0) return []
      q = q.in('user_id', userIds)
    }
    const { data } = await q
    return data || []
  },
  ['dovolenky-na-schvalenie-v2'],
  { revalidate: 60, tags: ['dovolenky'] },
)
