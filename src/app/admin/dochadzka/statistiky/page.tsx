import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { getStatistikyFirmy } from '@/actions/dochadzka-statistiky'
import StatistikyDashboard from '@/components/dochadzka/StatistikyDashboard'

export default async function Page() {
  const { profile } = await getSession()
  if (!profile) redirect('/login')

  const stats = await getStatistikyFirmy(undefined, 12)

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Štatistiky dochádzky</h2>
      <p className="text-sm text-gray-500 mb-4">Posledných 12 mesiacov, agregát všetkých prístupných firiem</p>
      <StatistikyDashboard
        mesacne={stats.mesacne}
        topPN={stats.topPN}
        pocetSchvalenychMesiacov={stats.pocetSchvalenychMesiacov}
        pocetUzavretychMesiacov={stats.pocetUzavretychMesiacov}
      />
    </div>
  )
}
