// src/lib/pdf-cestovny-prikaz.ts
import jsPDF from 'jspdf'

interface CestaData {
  ciel: string
  ucel: string
  datum_od: string
  datum_do: string
  doprava: string
  skutocny_km: number | null
  predpokladany_km: number | null
  profile?: { full_name: string }
}

interface PrikazData {
  cislo_prikazu: string | null
  dieta_suma: number
  km_nahrada: number
  ubytovanie: number
  ine_naklady: number
  celkom: number
  stav: string
}

const DOPRAVA_SK: Record<string, string> = {
  firemne_auto: 'Firemne auto',
  sukromne_auto: 'Sukromne auto',
  vlak: 'Vlak',
  autobus: 'Autobus',
  lietadlo: 'Lietadlo',
  ine: 'Ine',
}

export function generateCestovnyPrikazPDF(
  cesta: CestaData,
  prikaz: PrikazData,
  companyName?: string,
) {
  const doc = new jsPDF()
  let y = 20

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  if (companyName) {
    doc.text(companyName, 105, y, { align: 'center' })
    y += 8
  }
  doc.text('CESTOVNY PRIKAZ', 105, y, { align: 'center' })
  y += 6
  if (prikaz.cislo_prikazu) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`c. ${prikaz.cislo_prikazu}`, 105, y, { align: 'center' })
  }
  y += 10

  doc.setLineWidth(0.5)
  doc.line(14, y, 196, y)
  y += 10

  const lx = 14
  const vx = 70
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  doc.setFont('helvetica', 'bold')
  doc.text('ZAMESTNANEC', lx, y); y += 7
  doc.setFont('helvetica', 'normal')
  doc.text('Meno:', lx, y); doc.text(cesta.profile?.full_name || '', vx, y); y += 10

  doc.setFont('helvetica', 'bold')
  doc.text('SLUZOBNA CESTA', lx, y); y += 7
  doc.setFont('helvetica', 'normal')
  doc.text('Ciel:', lx, y); doc.text(cesta.ciel, vx, y); y += 5
  doc.text('Ucel:', lx, y); doc.text(cesta.ucel, vx, y); y += 5
  doc.text('Datum:', lx, y); doc.text(`${new Date(cesta.datum_od).toLocaleDateString('sk-SK')} — ${new Date(cesta.datum_do).toLocaleDateString('sk-SK')}`, vx, y); y += 5
  doc.text('Doprava:', lx, y); doc.text(DOPRAVA_SK[cesta.doprava] || cesta.doprava, vx, y); y += 5
  doc.text('KM:', lx, y); doc.text(`${cesta.skutocny_km || cesta.predpokladany_km || '—'}`, vx, y); y += 10

  doc.setFont('helvetica', 'bold')
  doc.text('NAHRADY', lx, y); y += 7
  doc.setFont('helvetica', 'normal')
  doc.text('Diety:', lx, y); doc.text(`${prikaz.dieta_suma.toFixed(2)} EUR`, vx, y); y += 5
  doc.text('KM nahrada:', lx, y); doc.text(`${prikaz.km_nahrada.toFixed(2)} EUR`, vx, y); y += 5
  doc.text('Ubytovanie:', lx, y); doc.text(`${prikaz.ubytovanie.toFixed(2)} EUR`, vx, y); y += 5
  doc.text('Ine naklady:', lx, y); doc.text(`${prikaz.ine_naklady.toFixed(2)} EUR`, vx, y); y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('CELKOM:', lx, y); doc.text(`${prikaz.celkom.toFixed(2)} EUR`, vx, y); y += 15

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Datum vytvorenia: ${new Date().toLocaleDateString('sk-SK')}`, 14, y)
  y += 15
  doc.text('Zamestnanec: ___________________________', 14, y)
  doc.text('Schvalil: ___________________________', 120, y)

  const name = (cesta.profile?.full_name || 'cesta').replace(/\s/g, '_')
  doc.save(`cestovny_prikaz_${prikaz.cislo_prikazu || name}.pdf`)
}
