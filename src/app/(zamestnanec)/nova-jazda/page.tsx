import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import JazdaForm from '@/components/JazdaForm'
import type { Vozidlo } from '@/lib/types'

export default async function NovaJazdaPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  let vozidlo = null
  if (profile?.vozidlo_id) {
    const { data: v } = await supabase.from('vozidla').select('*').eq('id', profile.vozidlo_id).single()
    vozidlo = v
  }

  if (!vozidlo) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nová jazda</h2>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm">Nemáte priradené vozidlo. Kontaktujte administrátora.</div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Nová jazda</h2>
      <JazdaForm vozidlo={vozidlo as Vozidlo} userName={profile!.full_name} />
    </div>
  )
}
