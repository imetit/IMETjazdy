import 'server-only'
import { createSupabaseAdmin } from './supabase-admin'
import { resolveCurrentApprover } from './auth-helpers'
import type { FakturyWorkflowConfig, Mena, FakturaStav, SecurityField } from './faktury-types'
import { ALLOWED_TRANSITIONS, SECURITY_FIELDS } from './faktury-types'

/**
 * Vráti userId schvaľovateľa pre daný stupeň podľa firma config.
 * Rieši konflikt záujmov — autor faktúry NEMÔŽE schvaľovať vlastnú.
 */
export async function resolveSchvalovatel(
  nahralId: string,
  firmaId: string,
  config: FakturyWorkflowConfig,
  stupen: 1 | 2,
): Promise<string | null> {
  const role = stupen === 1 ? config.schvalovatel_l1 : config.schvalovatel_l2
  const admin = createSupabaseAdmin()

  let candidateId: string | null = null

  if (role === 'nadriadeny') {
    candidateId = await resolveCurrentApprover(null as never, nahralId)
  } else if (role === 'fin_manager') {
    const { data } = await admin.from('profiles')
      .select('id')
      .eq('role', 'fin_manager')
      .eq('active', true)
      .or(`firma_id.eq.${firmaId},pristupne_firmy.cs.{${firmaId}}`)
      .limit(1).maybeSingle()
    candidateId = data?.id || null
  } else if (role === 'admin') {
    const { data } = await admin.from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('active', true)
      .or(`firma_id.eq.${firmaId},pristupne_firmy.cs.{${firmaId}}`)
      .limit(1).maybeSingle()
    candidateId = data?.id || null
  } else if (role === 'it_admin') {
    const { data } = await admin.from('profiles')
      .select('id')
      .eq('role', 'it_admin')
      .eq('active', true)
      .limit(1).maybeSingle()
    candidateId = data?.id || null
  } else if (role.startsWith('user:')) {
    candidateId = role.slice(5)
  }

  // Konflikt záujmov — autor nemôže schváliť seba samého
  if (candidateId === nahralId) {
    // Fallback na nadriadeného autora alebo it_admina
    const fallback = await resolveCurrentApprover(null as never, nahralId)
    if (fallback && fallback !== nahralId) return fallback
    const { data: itAdmin } = await admin.from('profiles')
      .select('id').eq('role', 'it_admin').eq('active', true).limit(1).maybeSingle()
    return itAdmin?.id || null
  }

  return candidateId
}

/**
 * Stiahne ECB kurz pre daný mena+datum.
 * 1. Skús lookup do kurzy_mien
 * 2. Ak neexistuje, fetch live z ECB API
 * 3. Ak ECB down, vráť null (UI ponúkne manual entry)
 */
export async function getEcbKurz(mena: Mena, datum: string): Promise<{ kurz: number; zdroj: 'ECB' | 'manual'; datum: string } | null> {
  if (mena === 'EUR') return { kurz: 1, zdroj: 'manual', datum }

  const admin = createSupabaseAdmin()

  // 1. Lookup v tabuľke (najnovší kurz <= datum)
  const { data: cached } = await admin.from('kurzy_mien')
    .select('kurz_k_eur, datum, zdroj')
    .eq('mena', mena)
    .lte('datum', datum)
    .order('datum', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (cached) {
    return { kurz: Number(cached.kurz_k_eur), zdroj: cached.zdroj as 'ECB' | 'manual', datum: cached.datum }
  }

  // 2. Live ECB fetch
  try {
    const r = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', {
      next: { revalidate: 3600 },
    })
    if (!r.ok) return null
    const xml = await r.text()
    const match = xml.match(new RegExp(`<Cube currency='${mena}' rate='([0-9.]+)'`))
    if (!match) return null
    // ECB rates: 1 EUR = X mena → konvertuj na 1 mena = (1/X) EUR
    const ecbRate = parseFloat(match[1])
    const kurz = 1 / ecbRate
    const todayStr = new Date().toISOString().split('T')[0]

    // Ulož do cache
    await admin.from('kurzy_mien').upsert({
      mena, kurz_k_eur: kurz, datum: todayStr, zdroj: 'ECB',
    }, { onConflict: 'mena,datum' })

    return { kurz, zdroj: 'ECB', datum: todayStr }
  } catch {
    return null
  }
}

/**
 * Validuje state transition + special case pre uhradena → stornovana.
 */
export function validateTransition(from: FakturaStav, to: FakturaStav): { ok: boolean; reason?: string; requires?: 'it_admin' } {
  if (ALLOWED_TRANSITIONS[from].includes(to)) {
    if (from === 'uhradena' && to === 'stornovana') {
      return { ok: true, requires: 'it_admin' }
    }
    return { ok: true }
  }
  return { ok: false, reason: `Neplatný prechod ${from} → ${to}` }
}

/**
 * Detekuje ktoré security polia sa zmenili medzi old a new objektom.
 */
export function detectSecurityChanges<T extends Partial<Record<SecurityField, unknown>>>(
  oldData: T,
  newData: Partial<T>,
): SecurityField[] {
  const changed: SecurityField[] = []
  for (const field of SECURITY_FIELDS) {
    if (field in newData && oldData[field] !== newData[field]) {
      changed.push(field)
    }
  }
  return changed
}

/**
 * Vypočíta DPH komponenty z 2 z 3 (suma_bez_dph, dph_suma, suma_celkom) + dph_sadzba.
 */
export function computeDphFromAny(input: {
  suma_bez_dph?: number | null
  dph_suma?: number | null
  suma_celkom?: number | null
  dph_sadzba: number
}): { suma_bez_dph: number; dph_suma: number; suma_celkom: number } {
  const r = input.dph_sadzba / 100
  if (input.suma_bez_dph != null && input.suma_celkom == null) {
    const s = input.suma_bez_dph
    return { suma_bez_dph: s, dph_suma: round(s * r), suma_celkom: round(s * (1 + r)) }
  }
  if (input.suma_celkom != null) {
    const c = input.suma_celkom
    const s = round(c / (1 + r))
    return { suma_bez_dph: s, dph_suma: round(c - s), suma_celkom: c }
  }
  if (input.dph_suma != null && input.suma_bez_dph != null) {
    const s = input.suma_bez_dph
    const d = input.dph_suma
    return { suma_bez_dph: s, dph_suma: d, suma_celkom: round(s + d) }
  }
  return { suma_bez_dph: 0, dph_suma: 0, suma_celkom: 0 }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Default firma_id pre user — ak má primárnu firmu, tú; inak prvú z pristupne_firmy; inak null.
 */
export async function getDefaultFirmaForUser(userId: string): Promise<string | null> {
  const admin = createSupabaseAdmin()
  const { data: profile } = await admin.from('profiles')
    .select('firma_id, pristupne_firmy')
    .eq('id', userId).maybeSingle()
  if (!profile) return null
  if (profile.firma_id) return profile.firma_id as string
  if (profile.pristupne_firmy && (profile.pristupne_firmy as string[]).length > 0) {
    return (profile.pristupne_firmy as string[])[0]
  }
  // Fallback — prvá aktívna firma
  const { data: firma } = await admin.from('firmy')
    .select('id').eq('aktivna', true).order('poradie').limit(1).maybeSingle()
  return firma?.id || null
}
