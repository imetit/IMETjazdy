import { getAllTankoveKarty } from '@/actions/fleet-tankove-karty'
import { getVozidla } from '@/actions/fleet-vozidla'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import TankoveKartySection from '@/components/fleet/TankoveKartySection'
import ModuleHelp from '@/components/ModuleHelp'

export default async function FleetTankoveKartyPage() {
  const [kartyResult, vozidlaResult] = await Promise.all([
    getAllTankoveKarty(),
    getVozidla(),
  ])

  // Načítaj vodičov
  const adminClient = createSupabaseAdmin()
  const { data: vodici } = await adminClient
    .from('profiles')
    .select('id, full_name')
    .order('full_name')

  return (
    <div>
      <ModuleHelp title="Tankové karty">
        <p><strong>Čo tu nájdete:</strong> Evidencia všetkých firemných palivových kariet.</p>
        <p><strong>"Pridať kartu":</strong> Vytvorte novú kartu — číslo, typ (Shell/OMV/Slovnaft/Iná), priradenie k vozidlu ALEBO vodičovi (nie obom), mesačný limit, platnosť.</p>
        <p><strong>Stavy:</strong> Aktívna (zelená) — v prevádzke, Blokovaná (oranžová) — dočasne pozastavená, Zrušená (červená) — trvalo zrušená.</p>
        <p><strong>Priradenie:</strong> Karta sa priraďuje buď konkrétnemu vozidlu (tankovanie len pre toto auto) alebo vodičovi (môže tankovať do rôznych áut).</p>
      </ModuleHelp>
      <h1 className="text-2xl font-bold mb-6">Tankové karty</h1>
      <TankoveKartySection
        karty={(kartyResult.data as any) || []}
        vodici={vodici || []}
        vozidla={((vozidlaResult.data as any) || []).map((v: any) => ({
          id: v.id,
          spz: v.spz,
          znacka: v.znacka,
        }))}
      />
    </div>
  )
}
