import type { Settings, Vozidlo, Paliva, JazdaTyp } from './types'

export function calcDurationMinutes(casOdchodu: string, casPrichodu: string): number {
  if (!casOdchodu || !casPrichodu) return 0
  const [oh, om] = casOdchodu.split(':').map(Number)
  const [ph, pm] = casPrichodu.split(':').map(Number)
  let diff = (ph * 60 + pm) - (oh * 60 + om)
  if (diff < 0) diff += 24 * 60
  return diff
}

export function calcStravneDoma(minutes: number, settings: Settings): number {
  const hours = minutes / 60
  if (hours >= 18) return settings.stravne_doma_nad18h
  if (hours > 12) return settings.stravne_doma_12do18h
  if (hours >= 5) return settings.stravne_doma_5do12h
  return settings.stravne_doma_do5h
}

export function calcStravneZahranicie(minutes: number, settings: Settings): number {
  const hours = minutes / 60
  if (hours > 12) return settings.stravne_zahr_nad12h
  if (hours >= 6) return settings.stravne_zahr_6do12h
  return settings.stravne_zahr_do6h
}

export function generateDocNumber(lastDocNumber: number): string {
  const year = new Date().getFullYear()
  const next = lastDocNumber + 1
  return `${year}-${String(next).padStart(3, '0')}`
}

export interface VyuctovanieResult {
  spotreba_litrov: number
  naklady_phm: number
  dph: number
  stravne: number
  vreckove: number
  naklady_celkom: number
  trvanie_minut: number
  sadzba_za_km: number
  cena_za_liter: number
  spotreba_pouzita: number
  palivo_typ: string
}

export function calculateVyuctovanie(
  typ: JazdaTyp,
  km: number,
  casOdchodu: string,
  casPrichodu: string,
  vozidlo: Vozidlo,
  paliva: Paliva,
  settings: Settings,
): VyuctovanieResult {
  const isZahranicie = typ.endsWith('zahranicie')
  const isSukromne = typ.startsWith('sukromne')
  const trvanie_minut = calcDurationMinutes(casOdchodu, casPrichodu)

  const stravne = isZahranicie
    ? calcStravneZahranicie(trvanie_minut, settings)
    : calcStravneDoma(trvanie_minut, settings)
  const vreckove = isZahranicie ? stravne * (settings.vreckove_percento / 100) : 0

  const palivoKey = vozidlo.palivo as keyof Omit<Paliva, 'id' | 'aktualizovane'>
  const cena_za_liter = paliva[palivoKey] as number
  const spotreba_pouzita = vozidlo.spotreba_tp

  if (isSukromne) {
    const sadzba_za_km = settings.sadzba_sukromne_auto
    const naklady_phm = km * sadzba_za_km
    const naklady_celkom = naklady_phm + stravne + vreckove
    return {
      spotreba_litrov: 0,
      naklady_phm,
      dph: 0,
      stravne,
      vreckove,
      naklady_celkom,
      trvanie_minut,
      sadzba_za_km,
      cena_za_liter,
      spotreba_pouzita,
      palivo_typ: vozidlo.palivo,
    }
  }

  const spotreba_litrov = (km / 100) * spotreba_pouzita
  const naklady_phm = spotreba_litrov * cena_za_liter
  const dphRate = settings.dph_phm / 100
  const dph = naklady_phm / (1 + dphRate) * dphRate
  const naklady_celkom = naklady_phm + stravne + vreckove

  return {
    spotreba_litrov,
    naklady_phm,
    dph,
    stravne,
    vreckove,
    naklady_celkom,
    trvanie_minut,
    sadzba_za_km: 0,
    cena_za_liter,
    spotreba_pouzita,
    palivo_typ: vozidlo.palivo,
  }
}
