// src/app/admin/archiv/nahrat/page.tsx
import ArchivUploadForm from '@/components/archiv/ArchivUploadForm'
import ModuleHelp from '@/components/ModuleHelp'

export default function AdminArchivNahratPage() {
  return (
    <div>
      <ModuleHelp title="Nahrať dokument do archívu">
        <p><strong>Súbor:</strong> Vyberte alebo pretiahnite súbor (PDF, DOC, XLS, JPG, PNG — max 25MB). Môžete vybrať viacero súborov naraz.</p>
        <p><strong>Kategória:</strong> Zaraďte dokument do kategórie (Zmluvy, Faktúry, BOZP, HR...).</p>
        <p><strong>Typ:</strong> Faktúra, Zmluva, Objednávka, Dodací list, Iné.</p>
        <p><strong>Pre faktúry:</strong> Zadajte dodávateľa, číslo faktúry, sumu a splatnosť.</p>
        <p><strong>Platnosť do:</strong> Voliteľný dátum expirácie — systém upozorní keď sa blíži koniec platnosti.</p>
        <p><strong>Tagy:</strong> Voliteľné kľúčové slová oddelené čiarkou pre lepšie vyhľadávanie.</p>
      </ModuleHelp>
      <ArchivUploadForm />
    </div>
  )
}
