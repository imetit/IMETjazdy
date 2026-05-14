'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { headers } from 'next/headers'

/**
 * Forensic audit log writer with IP + user-agent capture.
 *
 * Volá sa zo všetkých server actions ktoré menia stav. RLS migration Phase 1
 * zabezpečuje, že audit_log je immutable (DENY UPDATE/DELETE + trigger).
 *
 * IP/UA sa získavajú z requestu cez next/headers (server-only). Hodnoty
 * Cloudflare/Vercel-prefixované sa preferujú pred raw x-forwarded-for.
 */

async function getRequestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers()
    const ua = h.get('user-agent') || null
    // Cloudflare/Vercel real IP > x-forwarded-for[0] > x-real-ip
    const cf = h.get('cf-connecting-ip')
    const fwd = h.get('x-forwarded-for')
    const real = h.get('x-real-ip')
    const ip = (cf || (fwd ? fwd.split(',')[0].trim() : '') || real || null) as string | null
    return { ip, userAgent: ua }
  } catch {
    return { ip: null, userAgent: null }
  }
}

export async function logAudit(akcia: string, tabulka?: string, zaznamId?: string, detail?: Record<string, any>) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  const { ip, userAgent } = await getRequestMeta()

  await supabase.from('audit_log').insert({
    user_id: user?.id || null,
    akcia,
    tabulka: tabulka || null,
    zaznam_id: zaznamId || null,
    detail: detail || null,
    ip_address: ip,
    user_agent: userAgent,
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
