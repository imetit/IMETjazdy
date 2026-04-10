import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, Car, Clock, Calendar, TrendingUp, FileText } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import { PALIVO_LABELS } from '@/lib/types'
import type { Jazda, Vozidlo, JazdaStav } from '@/lib/types'
import { calculateMesacnyStav, formatMinutyNaHodiny, isPracovnyDen } from '@/lib/dochadzka-utils'
import type { DochadzkaZaznam } from '@/lib/dochadzka-types'

export default async function DashboardPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const mesiac = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const rok = now.getFullYear()

  // Parallel data loading
  const [
    { data: profile },
    { data: jazdy },
    { data: mesiacJazdy },
    { count: cOdoslana },
    { data: dochadzkaZaznamy },
    { data: schvaleneDovolenky },
    { data: dovolenkaNarok },
  ] = await Promise.all([
    supabase.from('profiles').select('*, vozidlo:vozidla(*)').eq('id', user.id).single(),
    supabase.from('jazdy').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('jazdy').select('naklady_celkom').eq('user_id', user.id).eq('stav', 'spracovana').like('mesiac', `${mesiac}%`),
    supabase.from('jazdy').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('stav', 'odoslana'),
    supabase.from('dochadzka').select('*').eq('user_id', user.id).gte('datum', `${mesiac}-01`).lte('datum', `${mesiac}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`).order('cas'),
    supabase.from('dovolenky').select('datum_od, datum_do').eq('user_id', user.id).eq('stav', 'schvalena').eq('typ', 'dovolenka').gte('datum_od', `${rok}-01-01`).lte('datum_do', `${rok}-12-31`),
    supabase.from('dovolenky_naroky').select('narok_dni, prenesene_dni').eq('user_id', user.id).eq('rok', rok).single(),
  ])

  const allJazdy = (jazdy || []) as Jazda[]
  const vozidlo = profile?.vozidlo as Vozidlo | null
  const fondHodiny = profile?.pracovny_fond_hodiny || 8.5

  // Monthly trip costs
  const mesacneNaklady = (mesiacJazdy || []).reduce((sum: number, j: any) => sum + (j.naklady_celkom || 0), 0)

  // Attendance balance
  const stav = calculateMesacnyStav(
    (dochadzkaZaznamy || []) as DochadzkaZaznam[],
    now.getFullYear(),
    now.getMonth(),
    fondHodiny
  )

  // Leave balance
  let cerpaneDni = 0
  for (const d of schvaleneDovolenky || []) {
    const od = new Date(d.datum_od)
    const do_ = new Date(d.datum_do)
    const current = new Date(od)
    while (current <= do_) {
      if (isPracovnyDen(current)) cerpaneDni++
      current.setDate(current.getDate() + 1)
    }
  }
  const narokDni = dovolenkaNarok ? (dovolenkaNarok.narok_dni || 20) + (dovolenkaNarok.prenesene_dni || 0) : 20
  const zostatokDovolenky = narokDni - cerpaneDni

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Prehľad</h2>
        <Link href="/nova-jazda" className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <PlusCircle size={16} /> Nová jazda
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dochadzka-prehled" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg"><Clock size={18} className="text-teal-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Dochádzka</p>
              <p className={`text-lg font-bold ${stav.rozdiel_min >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatMinutyNaHodiny(stav.rozdiel_min)}
              </p>
            </div>
          </div>
        </Link>

        <Link href="/dovolenka" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Calendar size={18} className="text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Dovolenka</p>
              <p className="text-lg font-bold text-gray-900">{zostatokDovolenky} <span className="text-xs font-normal text-gray-400">z {narokDni} dní</span></p>
            </div>
          </div>
        </Link>

        <Link href="/moje-jazdy" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><TrendingUp size={18} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Náhrady ({mesiac})</p>
              <p className="text-lg font-bold text-gray-900">{mesacneNaklady > 0 ? `${mesacneNaklady.toFixed(2)} €` : '—'}</p>
            </div>
          </div>
        </Link>

        <Link href="/moje-jazdy" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg"><FileText size={18} className="text-orange-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Čaká na spracovanie</p>
              <p className="text-lg font-bold text-orange-600">{cOdoslana || 0}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Vehicle */}
      {vozidlo && (
        <Link href="/moje-vozidlo" className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <Car size={18} className="text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">Moje vozidlo</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Značka:</span> <span className="font-medium">{vozidlo.znacka} {vozidlo.variant}</span></div>
            <div><span className="text-gray-500">ŠPZ:</span> <span className="font-mono font-medium">{vozidlo.spz}</span></div>
            <div><span className="text-gray-500">Palivo:</span> <span>{PALIVO_LABELS[vozidlo.palivo]}</span></div>
            <div><span className="text-gray-500">Spotreba:</span> <span>{vozidlo.spotreba_tp} l/100km</span></div>
          </div>
        </Link>
      )}
      {!vozidlo && <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm">Nemáte priradené vozidlo. Kontaktujte administrátora.</div>}

      {/* Recent trips */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Posledné jazdy</h3>
          <Link href="/moje-jazdy" className="text-xs text-primary hover:underline">Všetky jazdy</Link>
        </div>
        <table className="w-full">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mesiac</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">KM</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stav</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Celkom</th>
          </tr></thead>
          <tbody>
            {allJazdy.length === 0 && <tr><td colSpan={4} className="text-center py-12 text-gray-400">Zatiaľ žiadne jazdy.</td></tr>}
            {allJazdy.map((j) => (
              <tr key={j.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-600">{j.mesiac}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right hidden sm:table-cell">{j.km}</td>
                <td className="px-4 py-3"><StatusBadge stav={j.stav as JazdaStav} /></td>
                <td className="px-4 py-3 text-sm font-semibold text-primary text-right">{j.naklady_celkom ? `${Number(j.naklady_celkom).toFixed(2)} €` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
