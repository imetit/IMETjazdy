import { NextResponse } from 'next/server'
import { requireScopedAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

/**
 * GDPR Right to Erasure (čl. 17): anonymizuje PII v profile.
 * Účtovné záznamy zostávajú s placeholder menom "Bývalý zamestnanec"
 * (zákonná retencia 10 rokov).
 *
 * POST /api/gdpr/delete/[userId]
 * Body: { reason: string, confirm: "ANONYMIZE-PERMANENT" }
 *
 * Vyžaduje admin/it_admin rolu A scope na target firma.
 */
export async function POST(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params

  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 403 })

  let body: { reason?: string; confirm?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Neplatné JSON body' }, { status: 400 })
  }

  if (!body.reason || body.reason.trim().length < 5) {
    return NextResponse.json({ error: 'reason field je povinný (min 5 znakov)' }, { status: 400 })
  }
  if (body.confirm !== 'ANONYMIZE-PERMANENT') {
    return NextResponse.json({
      error: 'Vyžaduje sa explicitný confirm="ANONYMIZE-PERMANENT" v body',
      hint: 'Toto je nevratná operácia — PII bude nahradené placeholder hodnotami.',
    }, { status: 400 })
  }

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.rpc('anonymize_user', {
    target_user_id: userId,
    reason: body.reason.trim(),
  })

  if (error) {
    return NextResponse.json({ error: `Chyba pri anonymizácii: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Užívateľ bol anonymizovaný. PII fields v profile sú nulled; účtovné záznamy ostávajú podľa zákonnej retencie.',
  })
}
