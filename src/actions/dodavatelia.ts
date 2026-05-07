'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { requireFinOrAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from './audit'

function refresh() { updateTag('dodavatelia') }

export async function getDodavatelia(search?: string) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error, data: [] }
  const admin = createSupabaseAdmin()

  let q = admin.from('dodavatelia').select('*').eq('aktivny', true).order('nazov')
  if (search && search.trim()) {
    q = q.or(`nazov.ilike.%${search}%,ico.ilike.%${search}%,dic.ilike.%${search}%`)
  }
  const { data, error } = await q.limit(100)
  if (error) return { error: error.message, data: [] }
  return { data: data || [] }
}

export async function createDodavatel(formData: FormData) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()

  const nazov = (formData.get('nazov') as string)?.trim()
  if (!nazov) return { error: 'Názov je povinný' }

  const { data, error } = await admin.from('dodavatelia').insert({
    nazov,
    ico: (formData.get('ico') as string) || null,
    dic: (formData.get('dic') as string) || null,
    ic_dph: (formData.get('ic_dph') as string) || null,
    iban: (formData.get('iban') as string) || null,
    swift: (formData.get('swift') as string) || null,
    default_mena: (formData.get('default_mena') as string) || 'EUR',
    default_dph_sadzba: parseFloat((formData.get('default_dph_sadzba') as string) || '20'),
    default_splatnost_dni: parseInt((formData.get('default_splatnost_dni') as string) || '14'),
    adresa: (formData.get('adresa') as string) || null,
    email: (formData.get('email') as string) || null,
    telefon: (formData.get('telefon') as string) || null,
    poznamka: (formData.get('poznamka') as string) || null,
  }).select('id').single()

  if (error) return { error: 'Chyba: ' + error.message }
  await logAudit('dodavatel_create', 'dodavatelia', data.id)
  refresh()
  return { data: { id: data.id } }
}

export async function updateDodavatel(id: string, data: Partial<{
  nazov: string; ico: string | null; dic: string | null; ic_dph: string | null
  iban: string | null; default_mena: string; default_dph_sadzba: number
  default_splatnost_dni: number; aktivny: boolean
  adresa: string | null; email: string | null; telefon: string | null; poznamka: string | null
}>) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()

  const { error } = await admin.from('dodavatelia').update(data).eq('id', id)
  if (error) return { error: 'Chyba: ' + error.message }
  await logAudit('dodavatel_update', 'dodavatelia', id)
  refresh()
  return { data: { id } }
}

export async function getDodavatelStats(id: string) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()

  const { data } = await admin.from('faktury')
    .select('id, suma_celkom_eur, datum_splatnosti, stav')
    .eq('dodavatel_id', id)

  const total = (data || []).length
  const sumEur = (data || []).reduce((s, f) => s + Math.abs(Number(f.suma_celkom_eur || 0)), 0)
  const lastDate = (data || []).map(f => f.datum_splatnosti).sort().pop() || null

  return { data: { total, sumEur, lastDate } }
}
