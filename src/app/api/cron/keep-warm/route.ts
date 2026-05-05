import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 10

function authorized(req: Request): boolean {
  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true
  // Vercel Cron pošle request bez Authorization, identifikuje sa cez user-agent
  const ua = req.headers.get('user-agent') || ''
  return ua.toLowerCase().includes('vercel-cron')
}

async function ping() {
  const admin = createSupabaseAdmin()
  const start = Date.now()
  const { error } = await admin.from('settings').select('id').limit(1)
  const ms = Date.now() - start
  if (error) {
    return NextResponse.json({ ok: false, error: error.message, ms }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ms, ts: new Date().toISOString() })
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 })
  return ping()
}

export async function POST(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 })
  return ping()
}
