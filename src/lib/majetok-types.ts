export type TypMajetku = 'pc' | 'monitor' | 'telefon' | 'tablet' | 'prislusenstvo' | 'ine'
export type StavMajetku = 'pridelene' | 'vratene' | 'vyradene'

export interface ZamestnanecMajetok {
  id: string
  user_id: string
  typ: TypMajetku
  nazov: string
  seriove_cislo: string | null
  obstaravacia_cena: number | null
  datum_pridelenia: string | null
  stav: StavMajetku
  poznamka: string | null
  created_at: string
}

export interface ZamestnanecLicencia {
  id: string
  user_id: string
  nazov: string
  typ: string | null
  kluc: string | null
  platnost_od: string | null
  platnost_do: string | null
  cena: number | null
  poznamka: string | null
  created_at: string
}

export const TYP_MAJETKU_LABELS: Record<TypMajetku, string> = {
  pc: 'PC / Notebook',
  monitor: 'Monitor',
  telefon: 'Telefón',
  tablet: 'Tablet',
  prislusenstvo: 'Príslušenstvo',
  ine: 'Iné',
}

export const STAV_MAJETKU_LABELS: Record<StavMajetku, string> = {
  pridelene: 'Pridelené',
  vratene: 'Vrátené',
  vyradene: 'Vyradené',
}
