'use server'

import bcrypt from 'bcryptjs'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import type { IdentifiedUser, DovodDochadzky, SmerDochadzky, ZdrojDochadzky, DochadzkaZaznam } from '@/lib/dochadzka-types'
import { calculateMesacnyStav } from '@/lib/dochadzka-utils'

/**
 * Phase 1 tablet token model:
 *   identifyByPin/Rfid → vytvorí tablet_identify_tokens row, vráti token
 *   recordDochadzka(token, ...) → atomic mark-as-used + extract user_id
 *
 * Predtým: recordDochadzka(userId, ...) — kde userId mohol byť poslaný klientom
 * priamo, t.j. authenticated user vie pípnuť kohokoľvek. Token model uzatvára
 * túto dieru — klient nikdy nepošle priamo user_id, server ho zistí z tokenu.
 */
async function issueTablet(targetUserId: string): Promise<{ token?: string; error?: string }> {
  const admin = createSupabaseAdmin()
  const { data, error } = await admin
    .from('tablet_identify_tokens')
    .insert({ user_id: targetUserId })
    .select('token')
    .single<{ token: string }>()
  if (error || !data) return { error: 'Chyba pri identifikácii (token)' }
  return { token: data.token }
}

export async function identifyByRfid(kodKarty: string): Promise<{ data?: IdentifiedUser; error?: string }> {
  // Rate-limit RFID brute-force (krátke karty môžu byť odhadnuteľné)
  const ip = await getClientIp()
  const rl = await checkRateLimit('identifyPin', `rfid:${ip}`)
  if (!rl.ok) return { error: `Príliš veľa pokusov. Skús o ${rl.retryAfter}s.` }

  const supabase = await createSupabaseServer()

  const { data: karta } = await supabase
    .from('rfid_karty')
    .select('user_id')
    .eq('kod_karty', kodKarty)
    .eq('aktivna', true)
    .single()

  if (!karta) return { error: 'Karta nenájdená' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, pracovny_fond_hodiny')
    .eq('id', karta.user_id)
    .eq('active', true)
    .single()

  if (!profile) return { error: 'Zamestnanec nenájdený' }

  // Phase 1 hardening: token namiesto rovno user_id
  const tok = await issueTablet(profile.id)
  if (tok.error || !tok.token) return { error: tok.error || 'Token error' }

  return {
    data: {
      id: profile.id,
      full_name: profile.full_name,
      pracovny_fond_hodiny: profile.pracovny_fond_hodiny || 8.5,
      token: tok.token,
    }
  }
}

export async function identifyByPin(pin: string): Promise<{ data?: IdentifiedUser; error?: string }> {
  // Anti brute-force: rate-limit per IP (5 pokusov / 5 min)
  const ip = await getClientIp()
  const rl = await checkRateLimit('identifyPin', `pin:${ip}`)
  if (!rl.ok) {
    return { error: `Príliš veľa pokusov o identifikáciu. Skús o ${rl.retryAfter}s.` }
  }

  // Validácia formátu — 6-digit (nový bcrypt flow), 4-digit pre legacy plaintext
  if (!/^\d{4,6}$/.test(pin)) return { error: 'PIN musí byť 4-6 číslic' }

  const admin = createSupabaseAdmin()

  // Phase 3 — nový bcrypt flow: skenuj profile_pins, bcrypt.compare
  // (N≈200, ≈50ms × 200 = 10s worst case. V praxi early-exit na prvý match.)
  const { data: hashes } = await admin
    .from('profile_pins')
    .select('user_id, pin_hash, pin_length')

  let userId: string | null = null
  for (const row of hashes || []) {
    // Skip rows where pin_length doesn't match (perf: 6-digit PIN nemôže
    // matchovať 4-digit hash a naopak)
    if (row.pin_length && row.pin_length !== pin.length) continue
    if (await bcrypt.compare(pin, row.pin_hash)) {
      userId = row.user_id
      break
    }
  }

  // Backwards-compat fallback: legacy plaintext profiles.pin
  // Po cutover (po reset PIN pre všetkých → drop profiles.pin column) → remove
  if (!userId) {
    const { data: legacy } = await admin
      .from('profiles')
      .select('id')
      .eq('pin', pin)
      .eq('active', true)
      .maybeSingle()
    if (legacy) userId = legacy.id
  }

  if (!userId) return { error: 'Nesprávny PIN' }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, pracovny_fond_hodiny')
    .eq('id', userId)
    .eq('active', true)
    .maybeSingle()

  if (!profile) return { error: 'Užívateľ deaktivovaný' }

  // Phase 1 hardening: jednorazový token (10 min TTL) — recordDochadzka nikdy
  // nedôveruje user_id z klienta.
  const tok = await issueTablet(profile.id)
  if (tok.error || !tok.token) return { error: tok.error || 'Token error' }

  return {
    data: {
      id: profile.id,
      full_name: profile.full_name,
      pracovny_fond_hodiny: profile.pracovny_fond_hodiny || 8.5,
      token: tok.token,
    }
  }
}

export async function getMesacnyStav(userId: string, fondHodiny: number) {
  const supabase = await createSupabaseServer()
  const now = new Date()
  const rok = now.getFullYear()
  const mesiac = now.getMonth()

  const startDate = `${rok}-${String(mesiac + 1).padStart(2, '0')}-01`
  const endDate = `${rok}-${String(mesiac + 1).padStart(2, '0')}-${new Date(rok, mesiac + 1, 0).getDate()}`

  const { data: zaznamy } = await supabase
    .from('dochadzka')
    .select('*')
    .eq('user_id', userId)
    .gte('datum', startDate)
    .lte('datum', endDate)
    .order('cas')

  return calculateMesacnyStav(
    (zaznamy || []) as DochadzkaZaznam[],
    rok,
    mesiac,
    fondHodiny
  )
}

/**
 * Záznam pípnutia z tabletu. Vyžaduje VALID single-use token z
 * identifyByPin/Rfid (max 10 min staré). user_id sa extrahuje z tokenu —
 * NIKDY z requestu. Predtým bola dochádzka falšovateľná: ľubovoľný
 * authenticated user mohol pípnuť kohokoľvek.
 */
export async function recordDochadzka(
  token: string,
  smer: SmerDochadzky,
  dovod: DovodDochadzky,
  zdroj: ZdrojDochadzky
) {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return { error: 'Chýba alebo neplatný identifikačný token' }
  }

  const admin = createSupabaseAdmin()

  // Atomická operácia: označ token ako použitý, vráť user_id (alebo prázdne)
  const { data: tokRow, error: tokErr } = await admin
    .from('tablet_identify_tokens')
    .update({ used: true })
    .eq('token', token)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .select('user_id')
    .single<{ user_id: string }>()

  if (tokErr || !tokRow) {
    return { error: 'Identifikácia vypršala. Prosím prilož kartu / zadaj PIN znovu.' }
  }

  const now = new Date()
  const datum = now.toISOString().split('T')[0]

  const { error } = await admin.from('dochadzka').insert({
    user_id: tokRow.user_id,
    datum,
    smer,
    dovod,
    cas: now.toISOString(),
    zdroj,
  })

  if (error) return { error: 'Chyba pri zápise dochádzky' }
  return { success: true }
}
