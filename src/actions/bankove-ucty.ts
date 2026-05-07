'use server'

import { updateTag } from 'next/cache'
import { requireFinOrAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

function refresh() { updateTag('bankove_ucty') }

export async function getBankoveUctyForFirma(firmaId: string) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error, data: [] }
  const admin = createSupabaseAdmin()
  const { data, error } = await admin.from('bankove_ucty')
    .select('*').eq('firma_id', firmaId).eq('aktivny', true)
    .order('poradie')
  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

export async function createBankovyUcet(formData: FormData) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()

  const firmaId = formData.get('firma_id') as string
  const nazov = formData.get('nazov') as string
  const iban = formData.get('iban') as string
  if (!firmaId || !nazov || !iban) return { error: 'Firma, názov a IBAN sú povinné' }

  const { error } = await admin.from('bankove_ucty').insert({
    firma_id: firmaId, nazov, iban,
    swift: (formData.get('swift') as string) || null,
    banka: (formData.get('banka') as string) || null,
    mena: (formData.get('mena') as string) || 'EUR',
    poradie: parseInt((formData.get('poradie') as string) || '0'),
    poznamka: (formData.get('poznamka') as string) || null,
  })
  if (error) return { error: 'Chyba: ' + error.message }
  refresh()
  return { data: { ok: true } }
}

export async function deactivateBankovyUcet(id: string) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()
  await admin.from('bankove_ucty').update({ aktivny: false }).eq('id', id)
  refresh()
  return { data: { ok: true } }
}
