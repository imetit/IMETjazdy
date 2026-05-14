import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Daily retention cron. Spúšťa sa cez Vercel Cron Jobs (Authorization: Bearer CRON_SECRET).
 *
 * Akcie:
 *  1. Hard-delete profilov anonymizovaných pred viac ako 30 dní
 *  2. Mazanie expired tablet identify tokens
 *  3. (Phase 5+) staré audit_log podľa retention_policies
 *  4. (Phase 5+) staré notifikacie podľa retention_policies
 *
 * Konfigurácia retencie: tabuľka `retention_policies` (Phase 4 migrácia).
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const admin = createSupabaseAdmin()
  const results: Record<string, number | string> = {}

  // 1. Hard-delete anonymizovaných po retenčnom okne (default 30 dní)
  const { data: policy } = await admin.from('retention_policies')
    .select('retention_dni')
    .eq('kategoria', 'anonymizovani_useri')
    .eq('active', true)
    .single<{ retention_dni: number }>()

  const dni = policy?.retention_dni ?? 30
  const cutoff = new Date(Date.now() - dni * 86400000).toISOString()

  const { data: toDelete } = await admin.from('profiles')
    .select('id')
    .lt('anonymized_at', cutoff)
    .not('anonymized_at', 'is', null)

  for (const p of toDelete || []) {
    const { error } = await admin.auth.admin.deleteUser(p.id)
    if (error) {
      results[`delete_error_${p.id}`] = error.message
    }
  }
  results.profiles_hard_deleted = (toDelete || []).length

  // 2. Tablet tokens cleanup (cez SQL function bez RLS issues)
  try {
    const { data: tokDeleted } = await admin.rpc('cleanup_old_tablet_tokens')
    results.tablet_tokens_deleted = (tokDeleted as unknown as number) ?? 0
  } catch (e) {
    results.tablet_tokens_error = String(e)
  }

  // 3. TODO Phase 5: audit_log starý nad 7 rokov — vyžaduje SECURITY DEFINER
  //    funkciu ktorá nastaví session-local app.audit_maintenance='allow' pred
  //    DELETE. Aktuálne audit log nevymazáva (immutable trigger).

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    ...results,
  })
}
