// src/lib/cesty-types.ts

export type DopravaCesty = 'firemne_auto' | 'sukromne_auto' | 'vlak' | 'autobus' | 'lietadlo' | 'ine'
export type StavCesty = 'nova' | 'schvalena' | 'zamietnuta' | 'ukoncena' | 'zrusena'
export type StavPrikazu = 'navrh' | 'schvaleny' | 'vyplateny'

export interface SluzobnasCesta {
  id: string
  user_id: string
  datum_od: string
  datum_do: string
  ciel: string
  ucel: string
  doprava: DopravaCesty
  predpokladany_km: number | null
  skutocny_km: number | null
  stav: StavCesty
  schvalovatel_id: string | null
  schvalene_at: string | null
  poznamka: string | null
  created_at: string
  profile?: { full_name: string }
  schvalovatel?: { full_name: string }
}

export interface CestovnyPrikaz {
  id: string
  sluzobna_cesta_id: string
  cislo_prikazu: string | null
  dieta_suma: number
  km_nahrada: number
  ubytovanie: number
  ine_naklady: number
  celkom: number
  stav: StavPrikazu
  pdf_path: string | null
  created_at: string
}

export const DOPRAVA_LABELS: Record<DopravaCesty, string> = {
  firemne_auto: 'Firemné auto',
  sukromne_auto: 'Súkromné auto',
  vlak: 'Vlak',
  autobus: 'Autobus',
  lietadlo: 'Lietadlo',
  ine: 'Iné',
}

export const STAV_CESTY_LABELS: Record<StavCesty, string> = {
  nova: 'Nová',
  schvalena: 'Schválená',
  zamietnuta: 'Zamietnutá',
  ukoncena: 'Ukončená',
  zrusena: 'Zrušená',
}

export const STAV_CESTY_COLORS: Record<StavCesty, string> = {
  nova: 'bg-blue-100 text-blue-800',
  schvalena: 'bg-green-100 text-green-800',
  zamietnuta: 'bg-red-100 text-red-800',
  ukoncena: 'bg-gray-100 text-gray-800',
  zrusena: 'bg-gray-100 text-gray-500',
}

export const STAV_PRIKAZU_LABELS: Record<StavPrikazu, string> = {
  navrh: 'Návrh',
  schvaleny: 'Schválený',
  vyplateny: 'Vyplatený',
}

export const STAV_PRIKAZU_COLORS: Record<StavPrikazu, string> = {
  navrh: 'bg-orange-100 text-orange-800',
  schvaleny: 'bg-green-100 text-green-800',
  vyplateny: 'bg-blue-100 text-blue-800',
}
