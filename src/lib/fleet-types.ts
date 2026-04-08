export type TypVozidla = 'osobne' | 'uzitkove' | 'ine'
export type StavVozidla = 'aktivne' | 'vyradene' | 'servis'
export type TypDokumentu = 'technicky_preukaz' | 'pzp' | 'havarijne' | 'leasing' | 'ine'
export type TypServisu = 'servis' | 'porucha' | 'nehoda' | 'udrzba'
export type StavServisu = 'planovane' | 'prebieha' | 'dokoncene'
export type TypKontroly = 'stk' | 'ek' | 'pzp' | 'havarijne'
export type PrioritaHlasenia = 'nizka' | 'normalna' | 'vysoka' | 'kriticka'
export type StavHlasenia = 'nove' | 'prebieha' | 'vyriesene'
export type ZdrojKm = 'manualne' | 'jazda' | 'servis'

export interface VozidloDokument {
  id: string
  vozidlo_id: string
  typ: TypDokumentu
  nazov: string
  file_path: string
  file_size: number | null
  platnost_do: string | null
  created_at: string
}

export interface VozidloServis {
  id: string
  vozidlo_id: string
  typ: TypServisu
  datum: string
  popis: string
  cena: number | null
  dodavatel: string | null
  stav: StavServisu
  km_pri_servise: number | null
  created_at: string
  prilohy?: ServisPriloha[]
  vozidlo?: import('@/lib/types').Vozidlo
}

export interface ServisPriloha {
  id: string
  servis_id: string
  file_name: string
  file_path: string
  file_size: number | null
  created_at: string
}

export interface VozidloKontrola {
  id: string
  vozidlo_id: string
  typ: TypKontroly
  datum_vykonania: string
  platnost_do: string
  poznamka: string | null
  created_at: string
  vozidlo?: import('@/lib/types').Vozidlo
}

export interface KmZaznam {
  id: string
  vozidlo_id: string
  km: number
  datum: string
  zdroj: ZdrojKm
  created_at: string
}

export interface VozidloHlasenie {
  id: string
  vozidlo_id: string
  user_id: string
  popis: string
  priorita: PrioritaHlasenia
  stav: StavHlasenia
  created_at: string
  profile?: import('@/lib/types').Profile
  vozidlo?: import('@/lib/types').Vozidlo
}

export interface NotifikaciaLog {
  id: string
  typ: string
  vozidlo_id: string | null
  adresat_email: string
  predmet: string
  odoslane_at: string
  stav: string
}

export interface VozidloVServise {
  id: string
  znacka: string
  variant: string
  spz: string
  servis?: { typ: string; popis: string; datum: string; stav: string; dodavatel: string | null }
}

export interface PoisteniePrehled {
  vozidlo: { id: string; znacka: string; variant: string; spz: string }
  pzp?: { platnost_do: string }
  havarijne?: { platnost_do: string }
}

export interface FleetDashboardData {
  celkomVozidiel: number
  aktivne: number
  vServise: number
  vyradene: number
  vozidlaVServise: VozidloVServise[]
  bliziaceSaKontroly: (VozidloKontrola & { vozidlo: import('@/lib/types').Vozidlo })[]
  poistenie: PoisteniePrehled[]
  noveHlasenia: number
  mesacneNaklady: number
  rocneNaklady: number
  najnakladnejsie: { vozidlo: import('@/lib/types').Vozidlo; naklady: number }[]
}

export const TYP_VOZIDLA_LABELS: Record<TypVozidla, string> = {
  osobne: 'Osobné',
  uzitkove: 'Úžitkové',
  ine: 'Iné',
}

export const STAV_VOZIDLA_LABELS: Record<StavVozidla, string> = {
  aktivne: 'Aktívne',
  vyradene: 'Vyradené',
  servis: 'V servise',
}

export const TYP_DOKUMENTU_LABELS: Record<TypDokumentu, string> = {
  technicky_preukaz: 'Technický preukaz',
  pzp: 'PZP',
  havarijne: 'Havarijné poistenie',
  leasing: 'Leasing / Zmluva',
  ine: 'Iné',
}

export const TYP_SERVISU_LABELS: Record<TypServisu, string> = {
  servis: 'Servis',
  porucha: 'Porucha',
  nehoda: 'Nehoda',
  udrzba: 'Údržba',
}

export const STAV_SERVISU_LABELS: Record<StavServisu, string> = {
  planovane: 'Plánované',
  prebieha: 'Prebieha',
  dokoncene: 'Dokončené',
}

export const TYP_KONTROLY_LABELS: Record<TypKontroly, string> = {
  stk: 'STK',
  ek: 'EK',
  pzp: 'PZP',
  havarijne: 'Havarijné',
}

export const PRIORITA_LABELS: Record<PrioritaHlasenia, string> = {
  nizka: 'Nízka',
  normalna: 'Normálna',
  vysoka: 'Vysoká',
  kriticka: 'Kritická',
}

export const STAV_HLASENIA_LABELS: Record<StavHlasenia, string> = {
  nove: 'Nové',
  prebieha: 'Prebieha',
  vyriesene: 'Vyriešené',
}
