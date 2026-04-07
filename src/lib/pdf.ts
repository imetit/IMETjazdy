import jsPDF from 'jspdf'
import type { Jazda, Vozidlo, Settings, JazdaTyp } from './types'
import { PALIVO_LABELS } from './types'

const PRINT_TITLES: Record<JazdaTyp, string> = {
  firemne_doma: 'NAHRADY ZA POUZITIE VOZIDLA: DOMACA PRACOVNA CESTA',
  firemne_zahranicie: 'NAHRADY ZA POUZITIE VOZIDLA: ZAHRANICNA PRACOVNA CESTA',
  sukromne_doma: 'NAHRADY ZA POUZITIE SUKROMNEHO VOZIDLA: DOMACA PRACOVNA CESTA',
  sukromne_zahranicie: 'NAHRADY ZA POUZITIE SUKROMNEHO VOZIDLA: ZAHRANICNA PRACOVNA CESTA',
}

export function generateVyuctovaniePDF(
  jazda: Jazda,
  vozidlo: Vozidlo,
  settings: Settings,
  employeeName: string,
  logoDataUrl?: string,
) {
  const doc = new jsPDF()
  const typ = jazda.typ as JazdaTyp
  const isSukromne = typ.startsWith('sukromne')
  const isZahranicie = typ.endsWith('zahranicie')

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 14, 10, 15, 15)
  }
  let y = 14
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  if (settings.company_name) {
    doc.text(settings.company_name, 105, y, { align: 'center' })
    y += 6
  }
  doc.setFontSize(10)
  doc.text(PRINT_TITLES[typ], 105, y, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Doklad c.: ${jazda.cislo_dokladu || '-'}`, 196, 14, { align: 'right' })
  doc.text(jazda.mesiac, 196, 19, { align: 'right' })
  y = Math.max(y + 10, 32)

  const lx = 14
  doc.setFontSize(9)
  doc.text('Meno:', lx, y); doc.text(employeeName, lx + 40, y); y += 5
  doc.text('Odchod z:', lx, y); doc.text(jazda.odchod_z, lx + 40, y); y += 5
  doc.text('Prichod do:', lx, y); doc.text(jazda.prichod_do, lx + 40, y); y += 5
  doc.text('Cez:', lx, y); doc.text(jazda.cez || '-', lx + 40, y); y += 5
  doc.text('Vzdialenost:', lx, y); doc.text(`${jazda.km} km`, lx + 40, y); y += 8

  doc.text('Vozidlo:', lx, y); doc.text(`${vozidlo.znacka} ${vozidlo.variant}`, lx + 40, y); y += 5
  doc.text('SPZ:', lx, y); doc.text(vozidlo.spz, lx + 40, y); y += 5
  doc.text('Spotreba TP:', lx, y); doc.text(`${vozidlo.spotreba_tp} l/100km`, lx + 40, y); y += 5
  doc.text('PHM:', lx, y); doc.text(PALIVO_LABELS[vozidlo.palivo] || '', lx + 40, y); y += 5

  if (!isSukromne) {
    doc.text('Cena/L:', lx, y); doc.text(`${(jazda.cena_za_liter || 0).toFixed(3)} EUR`, lx + 40, y); y += 5
    const spotreba = (jazda.km / 100) * (jazda.spotreba_pouzita || 0)
    doc.text('Spotreba celkom:', lx, y); doc.text(`${spotreba.toFixed(2)} L`, lx + 40, y); y += 10
  } else {
    doc.text('Sadzba za 1km:', lx, y); doc.text(`${(jazda.sadzba_za_km || 0).toFixed(3)} EUR`, lx + 40, y); y += 10
  }

  doc.setFont('helvetica', 'bold')
  if (isSukromne) {
    doc.text('Nahrada za km:', lx, y); doc.text(`${(jazda.naklady_phm || 0).toFixed(2)} EUR`, lx + 80, y); y += 5
  } else {
    doc.text('Nahrada za PHM:', lx, y); doc.text(`${(jazda.naklady_phm || 0).toFixed(2)} EUR`, lx + 80, y); y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const dphRate = settings.dph_phm / 100
    const dph = (jazda.naklady_phm || 0) / (1 + dphRate) * dphRate
    doc.text(`  Z toho DPH ${settings.dph_phm}%:`, lx, y); doc.text(`${dph.toFixed(2)} EUR`, lx + 80, y); y += 4
    doc.text('  PHM bez DPH:', lx, y); doc.text(`${((jazda.naklady_phm || 0) - dph).toFixed(2)} EUR`, lx + 80, y); y += 5
    doc.setFontSize(9)
  }

  doc.setFont('helvetica', 'normal')
  if ((jazda.stravne || 0) > 0) {
    doc.text('Stravne:', lx, y); doc.text(`${(jazda.stravne || 0).toFixed(2)} EUR`, lx + 80, y); y += 5
  }
  if (isZahranicie && (jazda.vreckove || 0) > 0) {
    doc.text(`Vreckove (${settings.vreckove_percento}%):`, lx, y); doc.text(`${(jazda.vreckove || 0).toFixed(2)} EUR`, lx + 80, y); y += 5
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Nahrada celkom:', lx, y); doc.text(`${(jazda.naklady_celkom || 0).toFixed(2)} EUR`, lx + 80, y); y += 15

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Datum vytvorenia: ${new Date().toLocaleDateString('sk-SK')}`, 14, y)
  doc.text('Podpis: ___________________________', 120, y)

  doc.save(`vyuctovanie_${jazda.cislo_dokladu || 'draft'}_${typ}.pdf`)
}
