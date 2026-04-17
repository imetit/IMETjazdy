import { getAllTankoveKarty } from '@/actions/fleet-tankove-karty'
import { getVozidla } from '@/actions/fleet-vozidla'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import TankoveKartySection from '@/components/fleet/TankoveKartySection'

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
