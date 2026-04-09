'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function getMyNotifikacie() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], count: 0 }

  const { data } = await supabase
    .from('notifikacie')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { count } = await supabase
    .from('notifikacie')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('precitane', false)

  return { data: data || [], count: count || 0 }
}

export async function markNotifikaciaRead(id: string) {
  const supabase = await createSupabaseServer()
  await supabase.from('notifikacie').update({ precitane: true }).eq('id', id)
  revalidatePath('/')
}

export async function markAllRead() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('notifikacie').update({ precitane: true }).eq('user_id', user.id).eq('precitane', false)
  revalidatePath('/')
}

export async function createNotifikacia(userId: string, typ: string, nadpis: string, sprava?: string, link?: string) {
  const supabase = await createSupabaseServer()
  await supabase.from('notifikacie').insert({
    user_id: userId,
    typ,
    nadpis,
    sprava: sprava || null,
    link: link || null,
  })
}
