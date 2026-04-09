import jsPDF from 'jspdf'

interface ProtokolData {
  datum: string
  km_stav: number | null
  stav_vozidla: string | null
  poskodenia: string | null
  prislusenstvo: string | null
  poznamky: string | null
  odovzdavajuci?: { full_name: string } | null
  preberajuci?: { full_name: string } | null
}

interface VozidloData {
  znacka: string
  variant: string
  spz: string
  vin: string | null
}

export function generateProtokolPDF(
  protokol: ProtokolData,
  vozidlo: VozidloData,
  companyName?: string,
) {
  const doc = new jsPDF()
  let y = 20

  // Header
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  if (companyName) {
    doc.text(companyName, 105, y, { align: 'center' })
    y += 8
  }
  doc.text('ODOVZDAVACI PROTOKOL VOZIDLA', 105, y, { align: 'center' })
  y += 12

  // Separator line
  doc.setLineWidth(0.5)
  doc.line(14, y, 196, y)
  y += 10

  const lx = 14
  const vx = 70
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  // Vehicle info
  doc.setFont('helvetica', 'bold')
  doc.text('VOZIDLO', lx, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.text('Znacka/Model:', lx, y); doc.text(`${vozidlo.znacka} ${vozidlo.variant}`, vx, y); y += 5
  doc.text('SPZ:', lx, y); doc.text(vozidlo.spz, vx, y); y += 5
  doc.text('VIN:', lx, y); doc.text(vozidlo.vin || '-', vx, y); y += 5
  if (protokol.km_stav) {
    doc.text('Stav km:', lx, y); doc.text(`${protokol.km_stav.toLocaleString('sk-SK')} km`, vx, y); y += 5
  }
  y += 5

  // Transfer info
  doc.setFont('helvetica', 'bold')
  doc.text('ODOVZDANIE', lx, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.text('Datum:', lx, y); doc.text(new Date(protokol.datum).toLocaleDateString('sk-SK'), vx, y); y += 5
  doc.text('Odovzdavajuci:', lx, y); doc.text(protokol.odovzdavajuci?.full_name || '-', vx, y); y += 5
  doc.text('Preberajuci:', lx, y); doc.text(protokol.preberajuci?.full_name || '-', vx, y); y += 10

  // State
  if (protokol.stav_vozidla) {
    doc.setFont('helvetica', 'bold')
    doc.text('STAV VOZIDLA', lx, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    const stavLines = doc.splitTextToSize(protokol.stav_vozidla, 170)
    doc.text(stavLines, lx, y)
    y += stavLines.length * 5 + 5
  }

  // Damages
  if (protokol.poskodenia) {
    doc.setFont('helvetica', 'bold')
    doc.text('POSKODENIA', lx, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    const posLines = doc.splitTextToSize(protokol.poskodenia, 170)
    doc.text(posLines, lx, y)
    y += posLines.length * 5 + 5
  }

  // Equipment
  if (protokol.prislusenstvo) {
    doc.setFont('helvetica', 'bold')
    doc.text('PRISLUSENSTVO', lx, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    const prisLines = doc.splitTextToSize(protokol.prislusenstvo, 170)
    doc.text(prisLines, lx, y)
    y += prisLines.length * 5 + 5
  }

  // Notes
  if (protokol.poznamky) {
    doc.setFont('helvetica', 'bold')
    doc.text('POZNAMKY', lx, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    const pozLines = doc.splitTextToSize(protokol.poznamky, 170)
    doc.text(pozLines, lx, y)
    y += pozLines.length * 5 + 5
  }

  // Signatures
  y = Math.max(y + 10, 220)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Odovzdavajuci:', 14, y)
  doc.text('Preberajuci:', 120, y)
  y += 15
  doc.line(14, y, 90, y)
  doc.line(120, y, 196, y)
  y += 5
  doc.text(protokol.odovzdavajuci?.full_name || '', 52, y, { align: 'center' })
  doc.text(protokol.preberajuci?.full_name || '', 158, y, { align: 'center' })

  const datumStr = new Date(protokol.datum).toLocaleDateString('sk-SK').replace(/\./g, '-')
  doc.save(`protokol_${vozidlo.spz}_${datumStr}.pdf`)
}
