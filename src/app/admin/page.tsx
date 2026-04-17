import { createSupabaseServer } from '@/lib/supabase-server'
import Link from 'next/link'
import { FileText, Car, Calendar, Plane, Archive, Users, AlertTriangle, Clock, CheckCircle, FileWarning, GraduationCap } from 'lucide-react'
import { getExpiringDocuments } from '@/actions/archiv'
import { getExpiraceSkoleni } from '@/actions/skolenia'

export default async function AdminDashboard() {
  const supabase = await createSupabaseServer()
  const now = new Date()
  const mesiac = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Parallel data loading
  const [
    { count: jazdyCelkom },
    { count: jazdyOdoslane },
    { count: jazdyMesiac },
    { count: dovolenkyNaSchvalenie },
    { count: cestyNove },
    { count: aktivniZamestnanci },
    { count: hlaseniaNove },
    { data: posledneJazdy },
    { data: posledneAudit },
    { data: bliziaceSaKontroly },
    expiringDocsResult,
    skoleniaExpResult,
  ] = await Promise.all([
    supabase.from('jazdy').select('*', { count: 'exact', head: true }),
    supabase.from('jazdy').select('*', { count: 'exact', head: true }).eq('stav', 'odoslana'),
    supabase.from('jazdy').select('*', { count: 'exact', head: true }).eq('mesiac', mesiac),
    supabase.from('dovolenky').select('*', { count: 'exact', head: true }).eq('stav', 'caka_na_schvalenie'),
    supabase.from('sluzobne_cesty').select('*', { count: 'exact', head: true }).eq('stav', 'nova'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('active', true).neq('role', 'tablet'),
    supabase.from('vozidlo_hlasenia').select('*', { count: 'exact', head: true }).eq('stav', 'nove'),
    supabase.from('jazdy').select('id, mesiac, km, stav, created_at, profile:profiles(full_name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('audit_log').select('*, profile:profiles!user_id(full_name)').order('created_at', { ascending: false }).limit(8),
    supabase.from('vozidlo_kontroly').select('typ, platnost_do, vozidlo:vozidla(spz, znacka)')
      .lte('platnost_do', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
      .gte('platnost_do', now.toISOString().split('T')[0])
      .order('platnost_do')
      .limit(5),
    getExpiringDocuments(),
    getExpiraceSkoleni(),
  ])

  const expiringDocs = expiringDocsResult?.data || []
  const expiraceSkoleni = skoleniaExpResult.data || []

  const cards = [
    { label: 'Jazdy tento mesiac', value: jazdyCelkom ?? 0, sub: `${jazdyOdoslane ?? 0} čaká na spracovanie`, icon: FileText, color: 'text-blue-600 bg-blue-50', href: '/admin/jazdy' },
    { label: 'Dovolenky na schválenie', value: dovolenkyNaSchvalenie ?? 0, icon: Calendar, color: 'text-orange-600 bg-orange-50', href: '/admin/dovolenky' },
    { label: 'Nové služobné cesty', value: cestyNove ?? 0, icon: Plane, color: 'text-purple-600 bg-purple-50', href: '/admin/sluzobne-cesty' },
    { label: 'Hlásenia o problémoch', value: hlaseniaNove ?? 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50', href: '/fleet/hlasenia' },
    { label: 'Aktívni zamestnanci', value: aktivniZamestnanci ?? 0, icon: Users, color: 'text-teal-600 bg-teal-50', href: '/admin/zamestnanci' },
    { label: 'Jazdy (mesiac)', value: jazdyMesiac ?? 0, sub: mesiac, icon: Car, color: 'text-green-600 bg-green-50', href: '/admin/jazdy' },
  ]

  const auditLabels: Record<string, string> = {
    spracovanie_jazdy: 'Spracovaná jazda',
    vratenie_jazdy: 'Vrátená jazda',
    schvalenie_dovolenky: 'Schválená dovolenka',
    zamietnutie_dovolenky: 'Zamietnutá dovolenka',
    schvalenie_cesty: 'Schválená cesta',
    zamietnutie_cesty: 'Zamietnutá cesta',
    vytvorenie_zamestnanca: 'Nový zamestnanec',
    zmena_opravneni: 'Zmena oprávnení',
    upload_dokumentu: 'Nahraný dokument',
    zmazanie_dokumentu: 'Zmazaný dokument',
    zmena_drzitela: 'Zmena držiteľa vozidla',
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Prehľad systému</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
              </div>
              <div className={`p-2.5 rounded-lg ${card.color}`}>
                <card.icon size={20} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent trips */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Posledné jazdy</h3>
            <Link href="/admin/jazdy" className="text-xs text-primary hover:underline">Zobraziť všetky</Link>
          </div>
          <div className="space-y-3">
            {(posledneJazdy || []).map((j: any) => (
              <Link key={j.id} href={`/admin/jazdy/${j.id}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded">
                <div>
                  <p className="text-sm font-medium text-gray-900">{j.profile?.full_name}</p>
                  <p className="text-xs text-gray-400">{j.mesiac} · {j.km} km</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  j.stav === 'spracovana' ? 'bg-green-100 text-green-800' :
                  j.stav === 'odoslana' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {j.stav === 'spracovana' ? 'Spracovaná' : j.stav === 'odoslana' ? 'Odoslaná' : 'Rozpracovaná'}
                </span>
              </Link>
            ))}
            {(!posledneJazdy || posledneJazdy.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">Žiadne jazdy</p>
            )}
          </div>
        </div>

        {/* Audit log */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Posledné akcie</h3>
          <div className="space-y-3">
            {(posledneAudit || []).map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="mt-0.5 p-1 bg-gray-100 rounded">
                  <CheckCircle size={14} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{auditLabels[a.akcia] || a.akcia}</p>
                  <p className="text-xs text-gray-400">{a.profile?.full_name || 'Systém'} · {new Date(a.created_at).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            {(!posledneAudit || posledneAudit.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">Žiadne záznamy v audit logu</p>
            )}
          </div>
        </div>
      </div>

      {/* Expiring controls */}
      {bliziaceSaKontroly && bliziaceSaKontroly.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-orange-500" />
            <h3 className="font-semibold text-gray-900">Blížiace sa expirácie (30 dní)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bliziaceSaKontroly.map((k: any, i: number) => {
              const daysLeft = Math.ceil((new Date(k.platnost_do).getTime() - Date.now()) / 86400000)
              return (
                <div key={i} className={`p-3 rounded-lg border ${daysLeft <= 7 ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                  <p className="text-sm font-medium">{k.vozidlo?.spz} — {k.vozidlo?.znacka}</p>
                  <p className="text-xs text-gray-500">{k.typ.toUpperCase()} · platnosť do {new Date(k.platnost_do).toLocaleDateString('sk-SK')}</p>
                  <p className={`text-xs font-semibold mt-1 ${daysLeft <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                    {daysLeft <= 0 ? 'EXPIROVANÉ!' : `${daysLeft} dní`}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expiring documents */}
      {expiringDocs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileWarning size={18} className="text-orange-500" />
            <h3 className="font-semibold text-gray-900">Expirujúce dokumenty (30 dní)</h3>
            <Link href="/admin/archiv" className="ml-auto text-xs text-primary hover:underline">Zobraziť všetky</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiringDocs.map((d: any, i: number) => {
              const daysLeft = Math.ceil((new Date(d.platnost_do).getTime() - Date.now()) / 86400000)
              return (
                <Link key={i} href={`/admin/archiv/${d.id}`} className={`p-3 rounded-lg border ${daysLeft <= 7 ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'} hover:shadow-sm transition-shadow`}>
                  <p className="text-sm font-medium">{d.nazov}</p>
                  <p className="text-xs text-gray-500">{d.typ} · platnosť do {new Date(d.platnost_do).toLocaleDateString('sk-SK')}</p>
                  <p className={`text-xs font-semibold mt-1 ${daysLeft <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                    {daysLeft <= 0 ? 'EXPIROVANÉ!' : `${daysLeft} dní`}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Expiring trainings */}
      {expiraceSkoleni.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap size={18} className="text-orange-500" />
            <h3 className="font-semibold text-gray-900">Expirujúce školenia (30 dní)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiraceSkoleni.map((s: any, i: number) => {
              const daysLeft = Math.ceil((new Date(s.platnost_do).getTime() - Date.now()) / 86400000)
              return (
                <div key={i} className={`p-3 rounded-lg border ${daysLeft <= 7 ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                  <p className="text-sm font-medium">{s.profile?.full_name || 'Neznámy'}</p>
                  <p className="text-xs text-gray-500">{s.nazov} · platnosť do {new Date(s.platnost_do).toLocaleDateString('sk-SK')}</p>
                  <p className={`text-xs font-semibold mt-1 ${daysLeft <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                    {daysLeft <= 0 ? 'EXPIROVANÉ!' : `${daysLeft} dní`}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
