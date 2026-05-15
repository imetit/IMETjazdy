'use server'

import { z } from 'zod'
import { updateTag } from 'next/cache'
import { requireFinOrAdmin, requireScopedFirma } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { ibanSchema, uuidSchema, MenaEnum } from '@/lib/validation/schemas'

const BankovyUcetCreateSchema = z.object({
  firma_id: uuidSchema,
  nazov: z.string().trim().min(2).max(100),
  iban: ibanSchema,
  swift: z.string().trim().max(20).optional().nullable(),
  banka: z.string().trim().max(80).optional().nullable(),
  mena: MenaEnum.optional().default('EUR'),
  poradie: z.coerce.number().int().min(0).max(999).optional().default(0),
  poznamka: z.string().max(500).optional().nullable(),
})

function refresh() { updateTag('bankove_ucty') }

export async function getBankoveUctyForFirma(firmaId: string) {
  const auth = await requireScopedFirma(firmaId, ['admin', 'it_admin', 'fin_manager'])
  if ('error' in auth) return { error: auth.error, data: [] }
  const admin = createSupabaseAdmin()
  const { data, error } = await admin.from('bankove_ucty')
    .select('*').eq('firma_id', firmaId).eq('aktivny', true)
    .order('poradie')
  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

export async function createBankovyUcet(formData: FormData) {
  // Zod parse — validuje IBAN regex, UUID firma_id, currency enum
  const parsed = BankovyUcetCreateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Neplatné vstupy' }
  }
  const d = parsed.data

  // Scope check — musíš mať fin/admin rolu A scope na cieľovú firmu
  const auth = await requireScopedFirma(d.firma_id, ['admin', 'it_admin', 'fin_manager'])
  if ('error' in auth) return { error: auth.error }

  const admin = createSupabaseAdmin()
  const { error } = await admin.from('bankove_ucty').insert({
    firma_id: d.firma_id, nazov: d.nazov, iban: d.iban,
    swift: d.swift ?? null,
    banka: d.banka ?? null,
    mena: d.mena,
    poradie: d.poradie,
    poznamka: d.poznamka ?? null,
  })
  if (error) return { error: 'Chyba: ' + error.message }
  refresh()
  return { data: { ok: true } }
}

export async function deactivateBankovyUcet(id: string) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()
  // Načítaj firma_id najprv pre scope check
  const { data: ucet } = await admin.from('bankove_ucty').select('firma_id').eq('id', id).maybeSingle()
  if (!ucet) return { error: 'Účet nenájdený' }
  const scoped = await requireScopedFirma(ucet.firma_id, ['admin', 'it_admin', 'fin_manager'])
  if ('error' in scoped) return { error: scoped.error }

  await admin.from('bankove_ucty').update({ aktivny: false }).eq('id', id)
  refresh()
  return { data: { ok: true } }
}
