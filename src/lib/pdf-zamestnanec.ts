import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const TYP_SKOLENIA_LABELS: Record<string, string> = {
  bozp: 'BOZP',
  opp: 'Ochrana pred poziarmi',
  vodicak: 'Vodicsky preukaz',
  odborne: 'Odborne skolenie',
  ine: 'Ine',
}

const TYP_UVAZKU_LABELS: Record<string, string> = {
  tpp: 'Trvaly pracovny pomer',
  dohoda: 'Dohoda (DoPc/DoVP)',
  brigada: 'Brigada (student)',
  extern: 'Externy konzultant',
  materska: 'Materska dovolenka',
  rodicovska: 'Rodicovska dovolenka',
}

const STAV_LABELS: Record<string, string> = {
  platne: 'Platne',
  blizi_sa: 'Blizi sa expiracia',
  expirovane: 'Expirovane',
}

export function generateZamestnanecPDF(
  profile: any,
  vozidlo: any,
  majetok: any[],
  licencie: any[],
  skolenia: any[],
  firma: any,
) {
  const doc = new jsPDF()
  let y = 14

  // Header
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('[LOGO]', 14, y)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  if (firma?.nazov) {
    doc.text(firma.nazov, 105, y, { align: 'center' })
    y += 8
  }

  doc.setFontSize(12)
  doc.text('ZAMESTNANECKA KARTA', 105, y, { align: 'center' })
  y += 10

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Datum: ${new Date().toLocaleDateString('sk-SK')}`, 196, 14, { align: 'right' })

  // Osobne udaje
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Osobne udaje', 14, y)
  y += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const lx = 14
  doc.text('Meno:', lx, y); doc.text(profile.full_name || '-', lx + 45, y); y += 5
  doc.text('Email:', lx, y); doc.text(profile.email || '-', lx + 45, y); y += 5
  doc.text('Pozicia:', lx, y); doc.text(profile.pozicia || '-', lx + 45, y); y += 5
  doc.text('Typ uvazku:', lx, y); doc.text(TYP_UVAZKU_LABELS[profile.typ_uvazku] || profile.typ_uvazku || '-', lx + 45, y); y += 5
  doc.text('Tyzdnovy fond:', lx, y); doc.text(`${profile.tyzdnovy_fond_hodiny || '-'} hod`, lx + 45, y); y += 5
  doc.text('Datum nastupu:', lx, y); doc.text(profile.datum_nastupu ? new Date(profile.datum_nastupu).toLocaleDateString('sk-SK') : '-', lx + 45, y); y += 8

  // Pracovne zaradenie
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Pracovne zaradenie', 14, y)
  y += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Firma:', lx, y); doc.text(firma?.nazov || '-', lx + 45, y); y += 5
  doc.text('Rola:', lx, y); doc.text(profile.role || '-', lx + 45, y); y += 5
  doc.text('Stav:', lx, y); doc.text(profile.active ? 'Aktivny' : 'Neaktivny', lx + 45, y); y += 8

  // Vozidlo
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Pridelene vozidlo', 14, y)
  y += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  if (vozidlo) {
    doc.text(`${vozidlo.znacka} ${vozidlo.variant} (${vozidlo.spz})`, lx, y)
    y += 8
  } else {
    doc.text('Ziadne pridelene vozidlo', lx, y)
    y += 8
  }

  // Majetok
  if (majetok.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Majetok', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Nazov', 'Typ', 'Cena']],
      body: majetok.map(m => [
        m.nazov,
        m.typ,
        m.obstaravacia_cena ? `${m.obstaravacia_cena.toFixed(2)} EUR` : '-',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // Licencie
  if (licencie.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Licencie', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Nazov', 'Platnost do']],
      body: licencie.map(l => [
        l.nazov,
        l.platnost_do ? new Date(l.platnost_do).toLocaleDateString('sk-SK') : '-',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // Skolenia
  if (skolenia.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Skolenia', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Typ', 'Nazov', 'Platnost do', 'Stav']],
      body: skolenia.map(s => [
        TYP_SKOLENIA_LABELS[s.typ] || s.typ,
        s.nazov,
        s.platnost_do ? new Date(s.platnost_do).toLocaleDateString('sk-SK') : '-',
        STAV_LABELS[s.stav] || s.stav,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // RFID
  if (y > 260) { doc.addPage(); y = 20 }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('RFID karty', 14, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Evidovane v systeme', lx, y)

  // Save
  const priezvisko = (profile.full_name || 'zamestnanec').split(' ').pop()?.toLowerCase() || 'zamestnanec'
  doc.save(`zamestnanecka-karta-${priezvisko}.pdf`)
}
