import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Lightweight health endpoint — pre uptime monitoring (StatusCake, BetterStack,
 * UptimeRobot). Vracia 200 ak app + DB + storage žijú.
 *
 * NEVRACIA žiadne sensitive údaje. Cache-Control: no-store.
 *
 * GET /api/health
 *   → 200 { ok: true, ts, latency: { db: 23 }, version: '...' }
 *   → 503 { ok: false, error: '...' }
 */
export async function GET() {
  const started = Date.now()
  try {
    const admin = createSupabaseAdmin()
    // Najľahšia query — 1 row z settings (RLS bypass cez service_role)
    const dbStart = Date.now()
    const { error } = await admin.from('settings').select('id').limit(1).maybeSingle()
    const dbMs = Date.now() - dbStart

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'db_error', latency: { db: dbMs } },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        ts: new Date().toISOString(),
        latency: { total: Date.now() - started, db: dbMs },
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
        region: process.env.VERCEL_REGION ?? 'local',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: 'exception' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
