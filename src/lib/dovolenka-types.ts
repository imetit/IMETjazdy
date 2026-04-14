export type TypDovolenky = 'dovolenka' | 'sick_leave' | 'ocr' | 'nahradne_volno' | 'neplatene_volno'
export type StavDovolenky = 'caka_na_schvalenie' | 'schvalena' | 'zamietnuta'
export type CastDna = 'dopoludnie' | 'popoludnie'

export interface Dovolenka {
  id: string
  user_id: string
  datum_od: string
  datum_do: string
  typ: TypDovolenky
  poznamka: string | null
  stav: StavDovolenky
  schvalovatel_id: string | null
  schvalene_at: string | null
  dovod_zamietnutia: string | null
  pol_dna: boolean
  cast_dna: CastDna | null
  created_at: string
  profile?: { full_name: string }
  schvalovatel?: { full_name: string }
}

export interface DovolenkaNarok {
  id: string
  user_id: string
  rok: number
  narok_dni: number
  prenesene_dni: number
}

export const TYP_DOVOLENKY_LABELS: Record<TypDovolenky, string> = {
  dovolenka: 'Dovolenka',
  sick_leave: 'PN',
  ocr: 'OČR',
  nahradne_volno: 'Náhradné voľno',
  neplatene_volno: 'Neplatené voľno',
}

export const CAST_DNA_LABELS: Record<CastDna, string> = {
  dopoludnie: 'Dopoludnie',
  popoludnie: 'Popoludnie',
}

export const STAV_DOVOLENKY_LABELS: Record<StavDovolenky, string> = {
  caka_na_schvalenie: 'Čaká na schválenie',
  schvalena: 'Schválená',
  zamietnuta: 'Zamietnutá',
}

export const STAV_DOVOLENKY_COLORS: Record<StavDovolenky, string> = {
  caka_na_schvalenie: 'bg-orange-100 text-orange-800',
  schvalena: 'bg-green-100 text-green-800',
  zamietnuta: 'bg-red-100 text-red-800',
}
