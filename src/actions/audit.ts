'use server'

import { createSupabaseServer } from '@/lib/supabase-server'

export async function logAudit(akcia: string, tabulka?: string, zaznamId?: string, detail?: Record<string, any>) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('audit_log').insert({
    user_id: user?.id || null,
    akcia,
    tabulka: tabulka || null,
    zaznam_id: zaznamId || null,
    detail: detail || null,
  })
}

export async function getAuditLog(filters?: { tabulka?: string; limit?: number }) {
  const supabase = await createSupabaseServer()
  let query = supabase
    .from('audit_log')
    .select('*, profile:profiles!user_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(filters?.limit || 100)

  if (filters?.tabulka) query = query.eq('tabulka', filters.tabulka)

  const { data, error } = await query
  if (error) return { error: 'Chyba pri načítaní' }
  return { data }
}
