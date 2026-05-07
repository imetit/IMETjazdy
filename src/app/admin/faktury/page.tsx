import FakturyTable from '@/components/faktury/FakturyTable'
import ModuleHelp from '@/components/ModuleHelp'
import { getFakturyList } from '@/actions/faktury'

export default async function AdminFakturyPage() {
  const result = await getFakturyList()
  const data = 'data' in result ? result.data : []

  return (
    <div>
      <ModuleHelp title="Faktúry — schvaľovanie a úhrada">
        <p><strong>Workflow:</strong> Rozpracovaná → Čaká na schválenie → Schválená → Na úhradu → Uhradená.</p>
        <p><strong>Per firma config:</strong> Každá firma má vlastné pravidlá v <code>/admin/firmy/[id]/faktury-pravidla</code>.</p>
        <p><strong>Multi-currency:</strong> Faktúra v inej mene = ECB kurz fixovaný pri schválení.</p>
        <p><strong>Re-approval:</strong> Po schválení edit suma/dodávateľa = automatický návrat na schválenie.</p>
        <p><strong>Dobropis:</strong> Pri uhradenej s chybou — vytvor dobropis (negatívna suma, viaže sa na pôvodnú).</p>
      </ModuleHelp>
      <FakturyTable initialData={data as never} />
    </div>
  )
}
