import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getAccessibleFirmaIds } from '@/lib/firma-scope'
import { getSession } from '@/lib/get-session'
import AdminDochadzkaClient from '@/components/dochadzka/AdminDochadzkaClient'
import ModuleHelp from '@/components/ModuleHelp'
import { getMesacneSumary, getVPraciDnes } from '@/actions/admin-dochadzka-mzdy'
import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{ mesiac?: string }>
}

export default async function AdminDochadzkaPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { profile } = await getSession()
  if (!profile) redirect('/login')

  const mesiac = params.mesiac || new Date().toISOString().slice(0, 7)
  const accessibleFirmaIds = await getAccessibleFirmaIds(profile.id)

  const admin = createSupabaseAdmin()
  let firmyQuery = admin.from('firmy').select('id, nazov, kod').eq('aktivna', true).order('poradie')
  if (accessibleFirmaIds !== null) {
    firmyQuery = firmyQuery.in('id', accessibleFirmaIds)
  }

  // Paralel SSR fetch — všetky dáta naraz aby user videl všetko po prvom renderi
  const [firmyRes, uzavierkyRes, sumaryRes, vPraciRes] = await Promise.all([
    firmyQuery,
    admin.from('dochadzka_uzavierka').select('firma_id, mesiac, stav').eq('mesiac', mesiac),
    getMesacneSumary(mesiac),
    getVPraciDnes(),
  ])

  return (
    <div>
      <ModuleHelp title="Prehľad dochádzky pre mzdy">
        <p><strong>Čo tu nájdete:</strong> Dochádzka všetkých zamestnancov vašich firiem za vybraný mesiac.</p>
        <p><strong>KPI widgety:</strong> Klik na &quot;Auto-doplnené&quot; alebo &quot;Anomálie&quot; vyfiltruje len tie záznamy.</p>
        <p><strong>Filtre:</strong> Mesiac, firmy (multi-select), status (kompletní / neúplní / s anomáliami / schválení).</p>
        <p><strong>Klik na riadok:</strong> Otvorí detail zamestnanca s mesačným výkazom — tam môžete editovať záznamy s povinným dôvodom korektúry.</p>
        <p><strong>Bulk schválenie:</strong> Označte zamestnancov a kliknite &quot;Schváliť vybraných&quot;, alebo schválte celú firmu jedným klikom v stavovom banneri.</p>
        <p><strong>Stavy uzávierky:</strong> Otvorený → Na kontrolu → Uzavretý. Po uzavretí žiadne ďalšie úpravy (okrem IT admina).</p>
      </ModuleHelp>

      <AdminDochadzkaClient
        firmy={firmyRes.data || []}
        initialMesiac={mesiac}
        uzavierky={uzavierkyRes.data || []}
        initialSumary={sumaryRes.data || []}
        initialVPraci={vPraciRes.data || []}
      />
    </div>
  )
}
