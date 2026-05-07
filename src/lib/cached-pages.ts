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
 * Bezpečnosť: cache je shared across users. Iba dáta ktoré sú rovnaké
 * pre všetkých adminov v rovnakom firma scope idú sem. Per-user dáta
 * (napr. moje dovolenky) sa NESMÚ cachovať týmto layerom.
 */

// ── /admin (dashboard) ──────────────────────────────────────────────────
export const getAdminDashboardData = unstable_cache(
  async (mesiac: string) => {
    const admin = createSupabaseAdmin()
    const now = new Date()
    const cutoff = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]

    const [
      jazdyCelkom, jazdyOdoslane, jazdyMesiac,
      dovolenkyNaSchvalenie, cestyNove,
      aktivniZamestnanci, hlaseniaNove,
      posledneJazdy, posledneAudit, bliziaceSaKontroly,
    ] = await Promise.all([
      admin.from('jazdy').select('*', { count: 'exact', head: true }),
      admin.from('jazdy').select('*', { count: 'exact', head: true }).eq('stav', 'odoslana'),
      admin.from('jazdy').select('*', { count: 'exact', head: true }).eq('mesiac', mesiac),
      admin.from('dovolenky').select('*', { count: 'exact', head: true }).eq('stav', 'caka_na_schvalenie'),
      admin.from('sluzobne_cesty').select('*', { count: 'exact', head: true }).eq('stav', 'nova'),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('active', true).neq('role', 'tablet'),
      admin.from('vozidlo_hlasenia').select('*', { count: 'exact', head: true }).eq('stav', 'nove'),
      admin.from('jazdy').select('id, mesiac, km, stav, created_at, profile:profiles(full_name)').order('created_at', { ascending: false }).limit(5),
      admin.from('audit_log').select('*, profile:profiles!user_id(full_name)').order('created_at', { ascending: false }).limit(8),
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
  ['admin-dashboard'],
  { revalidate: 60, tags: ['dashboard', 'jazdy', 'dovolenky', 'cesty'] },
)

// ── /admin/jazdy ────────────────────────────────────────────────────────
export const getAdminJazdy = unstable_cache(
  async () => {
    const admin = createSupabaseAdmin()
    const { data } = await admin.from('jazdy')
      .select('*, profile:profiles(full_name)')
      .order('created_at', { ascending: false })
    return data || []
  },
  ['admin-jazdy'],
  { revalidate: 60, tags: ['jazdy'] },
)

// ── /admin/zamestnanci ──────────────────────────────────────────────────
export const getAdminZamestnanci = unstable_cache(
  async () => {
    const admin = createSupabaseAdmin()
    const [zResult, vResult, fResult] = await Promise.all([
      admin.from('profiles').select('*, vozidlo:vozidla!fk_profiles_vozidlo(*)').neq('role', 'tablet').order('full_name'),
      admin.from('vozidla').select('*').eq('aktivne', true).order('znacka'),
      admin.from('firmy').select('id, kod, nazov').eq('aktivna', true).order('poradie'),
    ])
    return {
      zamestnanci: zResult.data || [],
      vozidla: vResult.data || [],
      firmy: fResult.data || [],
    }
  },
  ['admin-zamestnanci'],
  { revalidate: 120, tags: ['zamestnanci'] },
)

// ── /admin/archiv ───────────────────────────────────────────────────────
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
// Vracia VŠETKY faktúry. Action getFakturyList ich potom filtruje per accessible firma scope.
export const getCachedFaktury = unstable_cache(
  async () => {
    const admin = createSupabaseAdmin()
    const { data } = await admin.from('faktury')
      .select('*, dodavatel:dodavatelia(nazov), firma:firmy(kod,nazov), nahral:profiles!nahral_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(500)
    return data || []
  },
  ['admin-faktury-all'],
  { revalidate: 30, tags: ['faktury'] },
)

export const getCachedDodavatelia = unstable_cache(
  async () => {
    const admin = createSupabaseAdmin()
    const { data } = await admin.from('dodavatelia').select('*').eq('aktivny', true).order('nazov').limit(500)
    return data || []
  },
  ['admin-dodavatelia-all'],
  { revalidate: 60, tags: ['dodavatelia'] },
)

// ── /admin/dovolenky — cache for non-IT-admin (per schvalovatel) ─────────
export const getCachedDovolenkyNaSchvalenieAll = unstable_cache(
  async () => {
    const admin = createSupabaseAdmin()
    const { data } = await admin.from('dovolenky')
      .select('*, profile:profiles!user_id(full_name), schvalovatel:profiles!schvalovatel_id(full_name)')
      .order('created_at', { ascending: false })
    return data || []
  },
  ['dovolenky-na-schvalenie-all'],
  { revalidate: 60, tags: ['dovolenky'] },
)
