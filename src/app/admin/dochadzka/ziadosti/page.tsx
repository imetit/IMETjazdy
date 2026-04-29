import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/get-session'
import { getAccessibleFirmaIds } from '@/lib/firma-scope'
import { redirect } from 'next/navigation'
import KorekciaZiadostiInbox from '@/components/dochadzka/KorekciaZiadostiInbox'

export default async function Page() {
  const { profile } = await getSession()
  if (!profile) redirect('/login')

  const admin = createSupabaseAdmin()
  const accessible = await getAccessibleFirmaIds(profile.id)

  // Načítaj žiadosti zo zamestnancov v scope
  let usersQuery = admin.from('profiles').select('id').eq('active', true)
  if (accessible !== null) {
    if (accessible.length === 0) return <div className="p-8 text-gray-500">Žiadne firmy v scope</div>
    usersQuery = usersQuery.in('firma_id', accessible)
  }
  const { data: users } = await usersQuery
  const userIds = (users || []).map(u => u.id)

  const { data: ziadosti } = await admin
    .from('dochadzka_korekcia_ziadosti')
    .select('*, profile:profiles!user_id(full_name, firma_id)')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Žiadosti o korekciu dochádzky</h2>
      <KorekciaZiadostiInbox ziadosti={(ziadosti as never) || []} />
    </div>
  )
}
