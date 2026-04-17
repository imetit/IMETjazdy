// Slovenské sadzby cestovných náhrad (platné od 2024)
// Zdroj: Opatrenie MPSVR SR

// Stravné pri tuzemskej služobnej ceste (€)
export const STRAVNE_SADZBY = {
  do5h: 0,        // Do 5 hodín — bez nároku
  od5do12h: 7.80, // 5 až 12 hodín
  nad12h: 11.60,  // Nad 12 hodín
}

// Sadzba za použitie súkromného motorového vozidla (€/km)
export const KM_SADZBA_SUKROMNE = 0.239

// Sadzba za použitie firemného vozidla — len PHM
// (počíta sa z ceny paliva a spotreby, nie paušálne)

/**
 * Vypočíta diéty podľa SK legislatívy
 * @param datumOd - dátum začiatku cesty
 * @param datumDo - dátum konca cesty
 * @returns suma diét v EUR
 */
export function calculateDiety(datumOd: string, datumDo: string): number {
  const od = new Date(datumOd)
  const do_ = new Date(datumDo)

  // Počet dní cesty
  const diffMs = do_.getTime() - od.getTime()
  const celeDni = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (celeDni <= 0) {
    // Jednodňová cesta — predpokladáme 5-12h
    return STRAVNE_SADZBY.od5do12h
  }

  // Viacdňová cesta
  // Prvý a posledný deň: 5-12h sadzba
  // Stredné dni: nad 12h sadzba
  const stredneDni = Math.max(0, celeDni - 1)
  return (2 * STRAVNE_SADZBY.od5do12h) + (stredneDni * STRAVNE_SADZBY.nad12h)
}

/**
 * Vypočíta km náhradu za súkromné vozidlo
 */
export function calculateKmNahrada(km: number): number {
  return Math.round(km * KM_SADZBA_SUKROMNE * 100) / 100
}

/**
 * Vypočíta celkové cestovné náhrady
 */
export function calculateCestovneNahrady(
  datumOd: string,
  datumDo: string,
  km: number,
  doprava: string,
): { dieta: number; kmNahrada: number; celkom: number } {
  const dieta = calculateDiety(datumOd, datumDo)
  const kmNahrada = doprava === 'sukromne_auto' ? calculateKmNahrada(km) : 0

  return {
    dieta: Math.round(dieta * 100) / 100,
    kmNahrada,
    celkom: Math.round((dieta + kmNahrada) * 100) / 100,
  }
}

/**
 * Enhanced diet calculation supporting international trips and hourly breakdown.
 */
export function calculateDietyEnhanced(
  datumOd: string,
  datumDo: string,
  casOd: string,
  casDo: string,
  krajina?: string,
  zahranicneSadzby?: { plna_dieta: number; kratena_50: number } | null,
): { dieta: number; breakdown: string } {
  const od = new Date(`${datumOd}T${casOd || '00:00'}`)
  const do_ = new Date(`${datumDo}T${casDo || '23:59'}`)
  const hodin = Math.max(0, (do_.getTime() - od.getTime()) / (1000 * 60 * 60))

  if (krajina && krajina !== 'SK' && zahranicneSadzby) {
    if (hodin <= 6) return { dieta: 0, breakdown: `${hodin.toFixed(1)}h zahraničná (${krajina}) — bez nároku (do 6h)` }
    if (hodin <= 12) return { dieta: zahranicneSadzby.kratena_50, breakdown: `${hodin.toFixed(1)}h zahraničná (${krajina}) — 50% sadzba: ${zahranicneSadzby.kratena_50} EUR` }
    return { dieta: zahranicneSadzby.plna_dieta, breakdown: `${hodin.toFixed(1)}h zahraničná (${krajina}) — plná sadzba: ${zahranicneSadzby.plna_dieta} EUR` }
  }

  // Domestic trip
  if (hodin < 5) return { dieta: 0, breakdown: `${hodin.toFixed(1)}h domáca — bez nároku (do 5h)` }
  if (hodin <= 12) return { dieta: STRAVNE_SADZBY.od5do12h, breakdown: `${hodin.toFixed(1)}h domáca — ${STRAVNE_SADZBY.od5do12h} EUR (5-12h)` }
  return { dieta: STRAVNE_SADZBY.nad12h, breakdown: `${hodin.toFixed(1)}h domáca — ${STRAVNE_SADZBY.nad12h} EUR (nad 12h)` }
}
