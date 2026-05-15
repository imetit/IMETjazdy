'use server'

import { randomInt } from 'crypto'
import bcrypt from 'bcryptjs'
import { requireScopedAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

/**
 * Generate 6-digit PIN cez CSPRNG (crypto.randomInt). Math.random je predikovateľné.
 * 6-digit = 1 000 000 kombinácií, kombinované s rate-limit 5/5min cez Upstash
 * (lib/rate-limit.ts) → brute-force prakticky nemožný.
 */
function generatePin(): string {
  return String(randomInt(100000, 1000000))
}

const BCRYPT_COST = 10

/**
 * Resetuje PIN zamestnanca:
 * 1. Generuje 6-digit cez CSPRNG
 * 2. bcrypt hash s cost 10 (≈ 60-80ms — akceptovateľné pre admin akciu)
 * 3. Uloží do profile_pins (separate tabuľka, RLS deny-all, len service_role)
 * 4. Vymaže plaintext profiles.pin (počas cutover)
 * 5. Audit log + notifikácia (BEZ PIN-u v správe — admin musí komunikovať
 *    PIN priamo zamestnancovi mimo systému)
 *
 * Návratovka { pin } sa zobrazí RAZ adminovi v UI — admin musí PIN bezpečne
 * odovzdať zamestnancovi.
 */
export async function resetPin(targetUserId: string): Promise<{ pin?: string; error?: string }> {
  const auth = await requireScopedAdmin(targetUserId)
  if ('error' in auth) return { error: auth.error }

  const admin = createSupabaseAdmin()

  // Vygeneruj unikátny PIN — kolízie skontrolujeme cez bcrypt compare, ale
  // pre malé N (≈200 PINov) je kolízia astronomická pri 6-digit. Aj tak
  // retry-uj 3× pre istotu.
  let plain = ''
  let attempts = 0
  while (attempts < 3) {
    plain = generatePin()
    // Skontroluj kolíziu (linear scan, akceptovateľné pre N≈200)
    const { data: rows } = await admin.from('profile_pins').select('pin_hash')
    let collision = false
    for (const r of rows || []) {
      if (await bcrypt.compare(plain, r.pin_hash)) { collision = true; break }
    }
    if (!collision) break
    attempts++
  }
  if (attempts >= 3) return { error: 'Nepodarilo sa vygenerovať unikátny PIN — skús znova' }

  const hash = await bcrypt.hash(plain, BCRYPT_COST)

  const { error: upsertErr } = await admin.from('profile_pins').upsert({
    user_id: targetUserId,
    pin_hash: hash,
    pin_length: 6,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (upsertErr) return { error: 'Chyba pri uložení PIN hashu' }

  // Vymaž starý plaintext PIN z profiles (po overení že hash je uložený)
  await admin.from('profiles').update({ pin: null }).eq('id', targetUserId)

  await logAudit('pin_reset', 'profiles', targetUserId, { reset_by: auth.user.id, hash_method: 'bcrypt', pin_length: 6 })

  // Notifikácia BEZ plaintext PIN-u v správe — admin musí PIN komunikovať
  // bezpečným kanálom (osobne, šifrovaná správa).
  await admin.from('notifikacie').insert({
    user_id: targetUserId,
    typ: 'pin_reset',
    nadpis: 'Nový PIN pre dochádzku',
    sprava: 'Mzdárka ti vygenerovala nový PIN. PIN dostaneš osobne alebo cez bezpečný kanál.',
    link: '/moja-karta',
  })

  revalidatePath(`/admin/zamestnanci/${targetUserId}`)
  return { pin: plain }  // admin uvidí raz v UI
}
