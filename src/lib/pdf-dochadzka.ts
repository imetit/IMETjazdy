// src/lib/pdf-dochadzka.ts
import jsPDF from 'jspdf'

interface DennyRiadok {
  datum: string
  prichod: string | null
  odchod: string | null
  odpracovane_min: number
  fajcenie_min: number
  dovody: string[]
  typ_dna: string
}

export function generateMesacnyVykazPDF(
  userName: string,
  mesiac: string,
  fondHodiny: number,
  dni: DennyRiadok[],
  companyName?: string,
) {
  const doc = new jsPDF()
  const [rok, mes] = mesiac.split('-').map(Number)
  let y = 15

  // Header
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  if (companyName) {
    doc.text(companyName, 105, y, { align: 'center' })
    y += 7
  }
  doc.text('MESACNY VYKAZ DOCHADZKY', 105, y, { align: 'center' })
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Zamestnanec: ${userName}`, 14, y)
  doc.text(`Obdobie: ${mes}/${rok}`, 140, y)
  y += 5
  doc.text(`Pracovny fond: ${fondHodiny}h/den`, 14, y)
  y += 8

  // Table header
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const cols = [14, 40, 60, 80, 110, 140, 165]
  doc.text('Datum', cols[0], y)
  doc.text('Den', cols[1], y)
  doc.text('Prichod', cols[2], y)
  doc.text('Odchod', cols[3], y)
  doc.text('Odpracovane', cols[4], y)
  doc.text('Fajcenie', cols[5], y)
  doc.text('Typ', cols[6], y)
  y += 2
  doc.line(14, y, 196, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  let celkoveMin = 0
  let celkoveFajcMin = 0

  for (const den of dni) {
    if (y > 270) {
      doc.addPage()
      y = 15
    }

    const dateObj = new Date(den.datum)
    const dayName = dateObj.toLocaleDateString('sk-SK', { weekday: 'short' })
    const dateStr = dateObj.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' })
    const odprStr = den.odpracovane_min > 0 ? `${Math.floor(den.odpracovane_min / 60)}h ${den.odpracovane_min % 60}m` : ''
    const fajcStr = den.fajcenie_min > 0 ? `${den.fajcenie_min}m` : ''
    const typMap: Record<string, string> = { pracovny: '', vikend: 'V', sviatok: 'S', dovolenka: 'D' }

    if (den.typ_dna === 'vikend' || den.typ_dna === 'sviatok') {
      doc.setTextColor(180, 180, 180)
    }

    doc.text(dateStr, cols[0], y)
    doc.text(dayName, cols[1], y)
    doc.text(den.prichod || '', cols[2], y)
    doc.text(den.odchod || '', cols[3], y)
    doc.text(odprStr, cols[4], y)
    doc.text(fajcStr, cols[5], y)
    doc.text(typMap[den.typ_dna] || '', cols[6], y)

    doc.setTextColor(0, 0, 0)
    celkoveMin += den.odpracovane_min
    celkoveFajcMin += den.fajcenie_min
    y += 4
  }

  // Summary
  y += 4
  doc.line(14, y, 196, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.text('CELKOM:', cols[0], y)
  doc.text(`${Math.floor(celkoveMin / 60)}h ${celkoveMin % 60}m`, cols[4], y)
  doc.text(`${celkoveFajcMin}m`, cols[5], y)

  y += 8
  doc.setFont('helvetica', 'normal')
  const fondMesiac = dni.filter(d => d.typ_dna === 'pracovny').length * fondHodiny
  const rozdiel = celkoveMin - fondMesiac * 60
  doc.text(`Fond mesiac: ${fondMesiac}h`, 14, y)
  doc.text(`Rozdiel: ${rozdiel >= 0 ? '+' : ''}${Math.floor(rozdiel / 60)}h ${Math.abs(rozdiel % 60)}m`, 80, y)

  y += 15
  doc.text(`Datum vytvorenia: ${new Date().toLocaleDateString('sk-SK')}`, 14, y)
  doc.text('Podpis: ___________________________', 120, y)

  doc.save(`vykaz_${userName.replace(/\s/g, '_')}_${mesiac}.pdf`)
}
