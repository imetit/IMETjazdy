'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from './audit'

export interface ImportRow {
  email: string
  datum: string         // YYYY-MM-DD
  smer: 'prichod' | 'odchod'
  dovod: string
  cas: string           // ISO datetime
}

export async function importHistorickyhDochadzku(rows: ImportRow[]): Promise<{
  inserted: number
  skipped: number
  errors: string[]
}> {
  const auth = await requireAdmin()
  if ('error' in auth) return { inserted: 0, skipped: 0, errors: [auth.error || 'Auth error'] }

  const admin = createSupabaseAdmin()

  // Načítaj všetkých emailov → user_id
  const emails = [...new Set(rows.map(r => r.email))]
  const { data: profiles } = await admin.from('profiles').select('id, email').in('email', emails)
  const emailToId = new Map<string, string>()
  for (const p of profiles || []) {
    if (p.email) emailToId.set(p.email, p.id)
  }

  const errors: string[] = []
  const toInsert: Record<string, unknown>[] = []
  let skipped = 0

  for (const row of rows) {
    const userId = emailToId.get(row.email)
    if (!userId) { errors.push(`${row.email}: profil nenájdený`); skipped++; continue }
    if (!['prichod', 'odchod'].includes(row.smer)) { errors.push(`${row.email} ${row.datum}: neplatný smer`); skipped++; continue }
    if (!['praca', 'obed', 'lekar', 'lekar_doprovod', 'sluzobne', 'sluzobna_cesta', 'prechod', 'fajcenie', 'sukromne', 'dovolenka'].includes(row.dovod)) {
      errors.push(`${row.email} ${row.datum}: neplatný dôvod ${row.dovod}`); skipped++; continue
    }
    toInsert.push({
      user_id: userId,
      datum: row.datum,
      smer: row.smer,
      dovod: row.dovod,
      cas: row.cas,
      zdroj: 'manual',
      korekcia_dovod: 'Bulk import historickej dochádzky',
      upravil_id: auth.user.id,
      upravene_at: new Date().toISOString(),
    })
  }

  let inserted = 0
  if (toInsert.length > 0) {
    // Po dávkach 500
    for (let i = 0; i < toInsert.length; i += 500) {
      const batch = toInsert.slice(i, i + 500)
      const { error, data } = await admin.from('dochadzka').insert(batch).select('id')
      if (error) errors.push(`Batch ${i}: ${error.message}`)
      else inserted += data?.length || 0
    }
  }

  await logAudit('dochadzka_bulk_import', 'dochadzka', auth.user.id, { inserted, skipped, errors_count: errors.length })

  return { inserted, skipped, errors: errors.slice(0, 50) }
}
