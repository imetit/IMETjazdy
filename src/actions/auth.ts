'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createSupabaseServer()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Nesprávny email alebo heslo' }
  const { data: profile } = await supabase.from('profiles').select('role').single()
  redirect(profile?.role === 'admin' ? '/admin/jazdy' : '/')
}

export async function logout() {
  const supabase = await createSupabaseServer()
  await supabase.auth.signOut()
  redirect('/login')
}
