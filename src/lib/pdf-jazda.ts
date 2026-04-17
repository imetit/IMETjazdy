import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Jazda, Settings, JazdaTyp } from './types'
import { PALIVO_LABELS, TYP_LABELS } from './types'

export function generateJazdaPDF(
  jazda: Jazda & { profile?: { full_name: string }; vozidlo?: { znacka: string; variant: string; spz: string; palivo: string; spotreba_tp: number } },
  settings: Settings,
) {
  const doc = new jsPDF()
  const typ = (jazda.typ || 'firemne_doma') as JazdaTyp
  const isSukromne = typ.startsWith('sukromne')
  const isZahranicie = typ.endsWith('zahranicie')
  const employeeName = jazda.profile?.full_name || ''

  // Header
  let y = 14
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('[LOGO]', 14, y)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  if (settings.company_name) {
    doc.text(settings.company_name, 105, y, { align: 'center' })
    y += 7
  }

  doc.setFontSize(11)
  doc.text('CESTOVNY PRIKAZ', 105, y, { align: 'center' })
  y += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(TYP_LABELS[typ] || '', 105, y, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`Doklad c.: ${jazda.cislo_dokladu || '-'}`, 196, 14, { align: 'right' })
  doc.text(jazda.mesiac, 196, 19, { align: 'right' })

  y = Math.max(y + 12, 38)

  // Employee & route info
  const lx = 14
  doc.setFontSize(9)
  doc.text('Meno:', lx, y); doc.text(employeeName, lx + 40, y); y += 5
  doc.text('Mesiac:', lx, y); doc.text(jazda.mesiac, lx + 40, y); y += 5
  doc.text('Odchod z:', lx, y); doc.text(jazda.odchod_z, lx + 40, y); y += 5
  doc.text('Prichod do:', lx, y); doc.text(jazda.prichod_do, lx + 40, y); y += 5
  if (jazda.cez) {
    doc.text('Cez:', lx, y); doc.text(jazda.cez, lx + 40, y); y += 5
  }
  doc.text('Vzdialenost:', lx, y); doc.text(`${jazda.km} km`, lx + 40, y); y += 5
  doc.text('Cas odchodu:', lx, y); doc.text(jazda.cas_odchodu || '-', lx + 40, y); y += 5
  doc.text('Cas prichodu:', lx, y); doc.text(jazda.cas_prichodu || '-', lx + 40, y); y += 8

  // Vehicle info
  if (jazda.vozidlo) {
    doc.text('Vozidlo:', lx, y); doc.text(`${jazda.vozidlo.znacka} ${jazda.vozidlo.variant}`, lx + 40, y); y += 5
    doc.text('SPZ:', lx, y); doc.text(jazda.vozidlo.spz, lx + 40, y); y += 5
    doc.text('Palivo:', lx, y); doc.text(PALIVO_LABELS[jazda.vozidlo.palivo as keyof typeof PALIVO_LABELS] || jazda.vozidlo.palivo, lx + 40, y); y += 5
    doc.text('Spotreba TP:', lx, y); doc.text(`${jazda.vozidlo.spotreba_tp} l/100km`, lx + 40, y); y += 8
  }

  // Cost breakdown
  doc.setFont('helvetica', 'bold')
  doc.text('Vyuctovanie nakladov:', lx, y); y += 6
  doc.setFont('helvetica', 'normal')

  if (isSukromne) {
    doc.text('Sadzba za 1 km:', lx, y); doc.text(`${(jazda.sadzba_za_km || 0).toFixed(3)} EUR`, lx + 80, y); y += 5
    doc.text('Nahrada za km:', lx, y); doc.text(`${(jazda.naklady_phm || 0).toFixed(2)} EUR`, lx + 80, y); y += 5
  } else {
    doc.text('Cena za liter:', lx, y); doc.text(`${(jazda.cena_za_liter || 0).toFixed(3)} EUR`, lx + 80, y); y += 5
    const spotreba = jazda.skutocna_spotreba_litrov || 0
    doc.text('Spotreba celkom:', lx, y); doc.text(`${spotreba.toFixed(2)} L`, lx + 80, y); y += 5
    doc.text('Naklady PHM:', lx, y); doc.text(`${(jazda.naklady_phm || 0).toFixed(2)} EUR`, lx + 80, y); y += 5
  }

  if ((jazda.stravne || 0) > 0) {
    doc.text('Stravne:', lx, y); doc.text(`${(jazda.stravne || 0).toFixed(2)} EUR`, lx + 80, y); y += 5
  }
  if (isZahranicie && (jazda.vreckove || 0) > 0) {
    doc.text(`Vreckove (${settings.vreckove_percento}%):`, lx, y); doc.text(`${(jazda.vreckove || 0).toFixed(2)} EUR`, lx + 80, y); y += 5
  }

  y += 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('CELKOM:', lx, y); doc.text(`${(jazda.naklady_celkom || 0).toFixed(2)} EUR`, lx + 80, y); y += 15

  // Signatures
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Datum: ${new Date().toLocaleDateString('sk-SK')}`, 14, y)
  y += 10
  doc.text('Podpis zamestnanca: ___________________________', 14, y)
  doc.text('Podpis schvalovatel: ___________________________', 110, y)

  doc.save(`cestovny_prikaz_${jazda.cislo_dokladu || jazda.id}.pdf`)
}

export function generateMesacnySumarPDF(
  zamestnanceMeno: string,
  mesiac: string,
  jazdy: Jazda[],
  settings: Settings,
  firma?: { nazov: string } | null,
) {
  const doc = new jsPDF()

  // Header
  let y = 14
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(firma?.nazov || settings.company_name || '', 105, y, { align: 'center' })
  y += 8
  doc.setFontSize(11)
  doc.text('MESACNY SUMAR JAZD', 105, y, { align: 'center' })
  y += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Zamestnanec: ${zamestnanceMeno}`, 14, y)
  doc.text(`Mesiac: ${mesiac}`, 196, y, { align: 'right' })
  y += 8

  // Table
  const tableData = jazdy.map((j, i) => [
    String(i + 1),
    j.cislo_dokladu || '-',
    j.created_at ? new Date(j.created_at).toLocaleDateString('sk-SK') : '-',
    `${j.odchod_z}${j.cez ? ' - ' + j.cez : ''} - ${j.prichod_do}`,
    String(j.km),
    `${(j.naklady_phm || 0).toFixed(2)}`,
    `${(j.stravne || 0).toFixed(2)}`,
    `${(j.naklady_celkom || 0).toFixed(2)}`,
  ])

  // Totals
  const totalKm = jazdy.reduce((s, j) => s + (j.km || 0), 0)
  const totalPhm = jazdy.reduce((s, j) => s + (j.naklady_phm || 0), 0)
  const totalStravne = jazdy.reduce((s, j) => s + (j.stravne || 0), 0)
  const totalCelkom = jazdy.reduce((s, j) => s + (j.naklady_celkom || 0), 0)

  tableData.push([
    '', '', '', 'SPOLU',
    String(totalKm),
    totalPhm.toFixed(2),
    totalStravne.toFixed(2),
    totalCelkom.toFixed(2),
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'Doklad', 'Datum', 'Trasa', 'KM', 'PHM (EUR)', 'Stravne (EUR)', 'Celkom (EUR)']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    didParseCell: (data) => {
      // Bold last row (totals)
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [235, 235, 235]
      }
    },
  })

  const finalY = (doc as any).lastAutoTable?.finalY || y + 50
  doc.setFontSize(9)
  doc.text(`Datum: ${new Date().toLocaleDateString('sk-SK')}`, 14, finalY + 15)
  doc.text('Podpis: ___________________________', 120, finalY + 15)

  const safeMonth = mesiac.replace(/\s+/g, '_')
  doc.save(`sumar_jazd_${zamestnanceMeno.replace(/\s+/g, '_')}_${safeMonth}.pdf`)
}
