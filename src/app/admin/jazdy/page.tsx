import { createSupabaseServer } from '@/lib/supabase-server'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import type { Jazda, JazdaStav } from '@/lib/types'

export default async function AdminJazdyPage() {
  const supabase = await createSupabaseServer()
  const { data: jazdy } = await supabase.from('jazdy').select('*, profile:profiles(full_name)').order('created_at', { ascending: false })
  const allJazdy = (jazdy || []) as (Jazda & { profile: { full_name: string } })[]
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Prijaté jazdy</h2>
      <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full table-striped">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Č. dokladu</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Zamestnanec</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mesiac</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trasa</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">KM</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stav</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Celkom (€)</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dátum</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Akcie</th>
          </tr></thead>
          <tbody>
            {allJazdy.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-gray-400">Žiadne jazdy.</td></tr>}
            {allJazdy.map((j) => (
              <tr key={j.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm font-mono text-gray-700">{j.cislo_dokladu || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{j.profile?.full_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{j.mesiac}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{j.odchod_z}{j.cez ? ` → ${j.cez}` : ''} → {j.prichod_do}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">{j.km}</td>
                <td className="px-4 py-3"><StatusBadge stav={j.stav as JazdaStav} /></td>
                <td className="px-4 py-3 text-sm font-semibold text-primary text-right">{j.naklady_celkom ? Number(j.naklady_celkom).toFixed(2) : '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(j.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/jazdy/${j.id}`} className="text-gray-400 hover:text-primary p-1 transition-colors inline-flex"><Eye size={16} /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
