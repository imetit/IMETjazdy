import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import ModuleHelp from '@/components/ModuleHelp'
import type { Jazda, JazdaStav } from '@/lib/types'

export default async function MojeJazdyPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: jazdy } = await supabase.from('jazdy').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  const allJazdy = (jazdy || []) as Jazda[]
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div>
      <ModuleHelp title="Moje jazdy">
        <p><strong>Čo tu nájdete:</strong> Zoznam všetkých vašich jázd zoradených podľa dátumu.</p>
        <p><strong>Stavy:</strong> Rozpracovaná (môžete upraviť), Odoslaná (čaká na spracovanie), Spracovaná (náhrady vypočítané — kliknite pre detail).</p>
        <p><strong>Kliknutie na riadok:</strong> Otvorí detail jazdy s údajmi a vypočítanými náhradami.</p>
      </ModuleHelp>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Moje jazdy</h2>
      <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full table-striped">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Č. dokladu</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mesiac</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trasa</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">KM</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stav</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Celkom (€)</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dátum</th>
          </tr></thead>
          <tbody>
            {allJazdy.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Žiadne jazdy.</td></tr>}
            {allJazdy.map((j) => (
              <tr key={j.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm font-mono text-gray-700">{j.cislo_dokladu || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{j.mesiac}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{j.odchod_z}{j.cez ? ` → ${j.cez}` : ''} → {j.prichod_do}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">{j.km}</td>
                <td className="px-4 py-3"><StatusBadge stav={j.stav as JazdaStav} /></td>
                <td className="px-4 py-3 text-sm font-semibold text-primary text-right">{j.naklady_celkom ? Number(j.naklady_celkom).toFixed(2) : '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(j.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
