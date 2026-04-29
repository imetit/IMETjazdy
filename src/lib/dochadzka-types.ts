export type SmerDochadzky = 'prichod' | 'odchod'

export type DovodDochadzky =
  | 'praca' | 'obed' | 'lekar' | 'lekar_doprovod'
  | 'sluzobne' | 'sluzobna_cesta' | 'prechod'
  | 'fajcenie' | 'sukromne' | 'dovolenka'

export type ZdrojDochadzky = 'pin' | 'rfid' | 'manual' | 'system' | 'auto'

export interface DochadzkaZaznam {
  id: string
  user_id: string
  datum: string
  smer: SmerDochadzky
  dovod: DovodDochadzky
  cas: string
  zdroj: ZdrojDochadzky
  poznamka: string | null
  created_at: string
  auto_doplnene?: boolean
  korekcia_dovod?: string | null
  povodny_cas?: string | null
  upravil_id?: string | null
  upravene_at?: string | null
}

export type StavUzavierky = 'otvoreny' | 'na_kontrolu' | 'uzavrety'

export interface DochadzkaUzavierka {
  id: string
  firma_id: string
  mesiac: string
  stav: StavUzavierky
  na_kontrolu_at: string | null
  na_kontrolu_by: string | null
  uzavrety_at: string | null
  uzavrety_by: string | null
  prelomenie_dovod: string | null
  prelomil_id: string | null
  prelomil_at: string | null
}

export interface SchvaleneHodiny {
  id: string
  user_id: string
  mesiac: string
  schvaleny_at: string
  schvaleny_by: string
  poznamka: string | null
}

export type StavZiadosti = 'caka_na_schvalenie' | 'schvalena' | 'zamietnuta'

export interface KorekciaZiadost {
  id: string
  user_id: string
  datum: string
  povodny_zaznam_id: string | null
  navrh_smer: SmerDochadzky | null
  navrh_dovod: string | null
  navrh_cas: string | null
  poznamka_zamestnanec: string
  stav: StavZiadosti
  vybavila_id: string | null
  vybavila_at: string | null
  poznamka_mzdarka: string | null
  created_at: string
}

export type AnomalyTyp = 'chyba_odchod' | 'auto_doplnene' | 'neuplny_mesiac'
  | 'podozrivy_cas' | 'dlhy_blok' | 'duplicitny' | 'kolizia_dovolenka' | 'praca_vo_sviatok'

export interface AnomalyType {
  typ: AnomalyTyp
  severita: 'low' | 'medium' | 'high'
  datum: string
  popis: string
  zaznam_id?: string
}

export interface PriplatkySumar {
  nocna_hod: number
  sobota_hod: number
  nedela_hod: number
  sviatok_hod: number
  nadcas_hod: number
}

export interface MesacnySumar {
  user_id: string
  full_name: string
  firma_id: string | null
  pozicia: string | null
  fond_min: number
  odpracovane_min: number
  rozdiel_min: number
  dovolenka_dni: number
  pn_dni: number
  ocr_dni: number
  sviatky_dni: number
  nadcas_hod: number
  auto_doplnene_count: number
  schvalene: boolean
  ma_anomalie: boolean
}

export interface IdentifiedUser {
  id: string
  full_name: string
  pracovny_fond_hodiny: number
}

export interface MesacnyStav {
  odpracovane_min: number
  fond_min: number
  rozdiel_min: number
}

export const DOVOD_LABELS: Record<DovodDochadzky, string> = {
  praca: 'Práca',
  obed: 'Obed',
  lekar: 'Lekár',
  lekar_doprovod: 'Lekár doprovod',
  sluzobne: 'Služobné',
  sluzobna_cesta: 'Služobná cesta',
  prechod: 'Prechod',
  fajcenie: 'Fajčenie',
  sukromne: 'Súkromné',
  dovolenka: 'Dovolenka',
}

export function labelForSmer(dovod: DovodDochadzky, smer: SmerDochadzky): string {
  if (dovod === 'praca') return smer === 'prichod' ? 'Začiatok práce' : 'Koniec práce'
  if (dovod === 'sluzobna_cesta') return smer === 'prichod' ? 'Návrat z cesty' : 'Služobná cesta'
  if (dovod === 'obed') return smer === 'prichod' ? 'Návrat z obeda' : 'Obed'
  if (dovod === 'lekar') return smer === 'prichod' ? 'Návrat od lekára' : 'Lekár'
  if (dovod === 'sluzobne') return smer === 'prichod' ? 'Návrat služobne' : 'Služobné'
  return DOVOD_LABELS[dovod]
}

export const DOVODY_PRE_SMER: Record<SmerDochadzky, DovodDochadzky[]> = {
  prichod: ['praca', 'obed', 'lekar', 'lekar_doprovod', 'sluzobne', 'sluzobna_cesta', 'sukromne', 'prechod'],
  odchod:  ['praca', 'sluzobna_cesta', 'obed', 'lekar', 'lekar_doprovod', 'sluzobne', 'sukromne', 'fajcenie', 'prechod'],
}

export const DOVOD_ICONS: Record<DovodDochadzky, string> = {
  praca: '💼',
  obed: '🍽️',
  lekar: '🏥',
  lekar_doprovod: '🚑',
  sluzobne: '📋',
  sluzobna_cesta: '🚗',
  prechod: '🔄',
  fajcenie: '🚬',
  sukromne: '🏠',
  dovolenka: '🏖️',
}

// Lucide ikony používané na tablete (profesionálny vzhľad)
// Import v komponentoch kvôli tree-shakingu
export const DOVOD_LUCIDE: Record<DovodDochadzky, string> = {
  praca: 'Briefcase',
  obed: 'Utensils',
  lekar: 'Stethoscope',
  lekar_doprovod: 'HeartHandshake',
  sluzobne: 'ClipboardList',
  sluzobna_cesta: 'Car',
  prechod: 'Repeat',
  fajcenie: 'Cigarette',
  sukromne: 'Home',
  dovolenka: 'Palmtree',
}
