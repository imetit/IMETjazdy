import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import { PALIVO_LABELS } from '@/lib/types'
import type { Jazda, Vozidlo, JazdaStav } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*, vozidlo:vozidla(*)').eq('id', user.id).single()
  const { data: jazdy } = await supabase.from('jazdy').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)

  const allJazdy = (jazdy || []) as Jazda[]
  const vozidlo = profile?.vozidlo as Vozidlo | null

  const { count: cRozpracovana } = await supabase.from('jazdy').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('stav', 'rozpracovana')
  const { count: cOdoslana } = await supabase.from('jazdy').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('stav', 'odoslana')
  const { count: cSpracovana } = await supabase.from('jazdy').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('stav', 'spracovana')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <Link href="/nova-jazda" className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <PlusCircle size={16} /> Nová jazda
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Rozpracované</p>
          <p className="text-3xl font-bold text-yellow-600">{cRozpracovana || 0}</p>
        </div>
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Odoslané</p>
          <p className="text-3xl font-bold text-blue-600">{cOdoslana || 0}</p>
        </div>
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Spracované</p>
          <p className="text-3xl font-bold text-green-600">{cSpracovana || 0}</p>
        </div>
      </div>

      {vozidlo && (
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-5 mb-8">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Moje vozidlo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Značka:</span> <span className="font-medium">{vozidlo.znacka} {vozidlo.variant}</span></div>
            <div><span className="text-gray-500">ŠPZ:</span> <span className="font-mono font-medium">{vozidlo.spz}</span></div>
            <div><span className="text-gray-500">Palivo:</span> <span>{PALIVO_LABELS[vozidlo.palivo]}</span></div>
            <div><span className="text-gray-500">Spotreba:</span> <span>{vozidlo.spotreba_tp} l/100km</span></div>
          </div>
        </div>
      )}
      {!vozidlo && <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-8 text-sm">Nemáte priradené vozidlo. Kontaktujte administrátora.</div>}

      <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-base font-semibold text-gray-900">Posledné jazdy</h3></div>
        <table className="w-full table-striped">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mesiac</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trasa</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">KM</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stav</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Celkom</th>
          </tr></thead>
          <tbody>
            {allJazdy.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">Zatiaľ žiadne jazdy.</td></tr>}
            {allJazdy.map((j) => (
              <tr key={j.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-600">{j.mesiac}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{j.odchod_z}{j.cez ? ` → ${j.cez}` : ''} → {j.prichod_do}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">{j.km}</td>
                <td className="px-4 py-3"><StatusBadge stav={j.stav as JazdaStav} /></td>
                <td className="px-4 py-3 text-sm font-semibold text-primary text-right">{j.naklady_celkom ? `${Number(j.naklady_celkom).toFixed(2)} €` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
