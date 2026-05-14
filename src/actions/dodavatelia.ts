'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { requireFinOrAdmin } from '@/lib/auth-helpers'
import { getAccessibleFirmaIds, buildFirmaScopeKey } from '@/lib/firma-scope'
import { DodavatelCreateSchema, parseFormData } from '@/lib/validation/schemas'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from './audit'

function refresh() { updateTag('dodavatelia') }

export async function getDodavatelia(search?: string) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error, data: [] }
  const { getCachedDodavatelia } = await import('@/lib/cached-pages')
  const accessible = await getAccessibleFirmaIds(auth.user.id)
  const firmaIdsKey = buildFirmaScopeKey(accessible)
  const all = await getCachedDodavatelia(firmaIdsKey)
  if (!search || !search.trim()) return { data: all }
  const s = search.toLowerCase()
  const filtered = all.filter(d =>
    d.nazov?.toLowerCase().includes(s) ||
    d.ico?.toLowerCase().includes(s) ||
    d.dic?.toLowerCase().includes(s)
  )
  return { data: filtered }
}

export async function createDodavatel(formData: FormData) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }

  const parsed = parseFormData(DodavatelCreateSchema, formData)
  if (!parsed.ok) return { error: parsed.error }
  const d = parsed.data

  const admin = createSupabaseAdmin()
  const { data, error } = await admin.from('dodavatelia').insert({
    nazov: d.nazov,
    ico: d.ico ?? null,
    dic: d.dic ?? null,
    ic_dph: d.ic_dph ?? null,
    iban: d.iban ?? null,
    swift: (formData.get('swift') as string) || null,
    default_mena: d.default_mena,
    default_dph_sadzba: d.default_dph_sadzba,
    default_splatnost_dni: d.default_splatnost_dni,
    adresa: d.adresa ?? null,
    email: d.email ?? null,
    telefon: d.telefon ?? null,
    poznamka: d.poznamka ?? null,
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
