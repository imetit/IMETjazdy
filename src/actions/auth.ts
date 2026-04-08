'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createSupabaseServer()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Nesprávny email alebo heslo' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single()
  const role = profile?.role
  if (role === 'admin' || role === 'it_admin') {
    redirect('/admin/jazdy')
  } else if (role === 'fleet_manager') {
    redirect('/fleet')
  } else {
    redirect('/')
  }
}

export async function logout() {
  const supabase = await createSupabaseServer()
  await supabase.auth.signOut()
  redirect('/login')
}
