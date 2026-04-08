export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'zamestnanec' | 'admin' | 'fleet_manager' | 'it_admin'
  vozidlo_id: string | null
  active: boolean
  created_at: string
}

export interface Vozidlo {
  id: string
  znacka: string
  variant: string
  spz: string
  druh: 'osobne' | 'nakladne'
  palivo: PalivoTyp
  spotreba_tp: number
  objem_motora: number
  aktivne: boolean
  vin: string | null
  rok_vyroby: number | null
  farba: string | null
  typ_vozidla: string
  stav: string
  stredisko: string | null
  aktualne_km: number
  priradeny_vodic_id: string | null
  obstaravacia_cena: number | null
  leasing_koniec: string | null
  datum_pridelenia: string | null
  created_at: string
}

export type PalivoTyp = 'diesel' | 'premium_diesel' | 'benzin_e10' | 'benzin_e5' | 'lpg' | 'elektro'

export interface Paliva {
  id: string
  diesel: number
  premium_diesel: number
  benzin_e10: number
  benzin_e5: number
  lpg: number
  elektro: number
  aktualizovane: string | null
}

export type JazdaTyp = 'firemne_doma' | 'firemne_zahranicie' | 'sukromne_doma' | 'sukromne_zahranicie'
export type JazdaStav = 'rozpracovana' | 'odoslana' | 'spracovana'

export interface Jazda {
  id: string
  cislo_dokladu: string | null
  user_id: string
  typ: JazdaTyp | null
  mesiac: string
  odchod_z: string
  prichod_do: string
  cez: string | null
  km: number
  vozidlo_id: string
  cas_odchodu: string
  cas_prichodu: string
  stav: JazdaStav
  spotreba_pouzita: number | null
  palivo_typ: string | null
  cena_za_liter: number | null
  sadzba_za_km: number | null
  stravne: number | null
  vreckove: number | null
  naklady_phm: number | null
  naklady_celkom: number | null
  skutocna_spotreba_litrov: number | null
  skutocna_cena_phm: number | null
  komentar: string | null
  spracovane_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  profile?: Profile
  vozidlo?: Vozidlo
  prilohy?: JazdaPriloha[]
}

export interface JazdaPriloha {
  id: string
  jazda_id: string
  file_name: string
  file_path: string
  file_size: number
  created_at: string
}

export interface Settings {
  id: string
  company_name: string
  last_doc_number: number
  sadzba_sukromne_auto: number
  stravne_doma_do5h: number
  stravne_doma_5do12h: number
  stravne_doma_12do18h: number
  stravne_doma_nad18h: number
  stravne_zahr_do6h: number
  stravne_zahr_6do12h: number
  stravne_zahr_nad12h: number
  vreckove_percento: number
  dph_phm: number
  dph_ubytovanie: number
}

export const PALIVO_LABELS: Record<PalivoTyp, string> = {
  diesel: 'Diesel',
  premium_diesel: 'Prémiový Diesel',
  benzin_e10: 'Benzín E10 (95)',
  benzin_e5: 'Benzín E5 (100)',
  lpg: 'LPG',
  elektro: 'Elektro',
}

export const TYP_LABELS: Record<JazdaTyp, string> = {
  firemne_doma: 'Firemné auto: Doma',
  firemne_zahranicie: 'Firemné auto: Zahraničie',
  sukromne_doma: 'Súkromné auto: Doma',
  sukromne_zahranicie: 'Súkromné auto: Zahraničie',
}

export const STAV_LABELS: Record<JazdaStav, string> = {
  rozpracovana: 'Rozpracovaná',
  odoslana: 'Odoslaná',
  spracovana: 'Spracovaná',
}
