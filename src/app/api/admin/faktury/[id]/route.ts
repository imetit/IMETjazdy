import { NextResponse } from 'next/server'
import { getFakturaDetail } from '@/actions/faktury'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const result = await getFakturaDetail(id)
  if ('error' in result && result.error) return NextResponse.json({ error: result.error }, { status: 404 })
  return NextResponse.json(result.data)
}
