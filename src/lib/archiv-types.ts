// src/lib/archiv-types.ts

export type TypDokumentuArchiv = 'faktura' | 'zmluva' | 'objednavka' | 'dodaci_list' | 'ine'
export type StavDokumentuArchiv = 'nahrany' | 'caka_na_schvalenie' | 'schvaleny' | 'na_uhradu' | 'uhradeny' | 'zamietnuty' | 'nahradeny' | 'expirujuci'

export interface DokumentArchiv {
  id: string
  nazov: string
  typ: TypDokumentuArchiv
  file_path: string
  file_size: number | null
  mime_type: string | null
  popis: string | null
  tagy: string[] | null
  oddelenie: string | null
  nahral_id: string
  stav: StavDokumentuArchiv
  schvalovatel_id: string | null
  schvalene_at: string | null
  suma: number | null
  datum_splatnosti: string | null
  dodavatel: string | null
  cislo_faktury: string | null
  created_at: string
  nahral?: { full_name: string }
  schvalovatel?: { full_name: string }
  verzia?: number
  povodny_dokument_id?: string | null
  platnost_do?: string | null
  kategoria_id?: string | null
}

export interface ArchivKategoria {
  id: string
  nazov: string
  parent_id: string | null
  popis: string | null
  pristup_role: string[] | null
  poradie: number
  farba: string | null
  ikona: string | null
  created_at: string
}

export const TYP_DOKUMENTU_ARCHIV_LABELS: Record<TypDokumentuArchiv, string> = {
  faktura: 'Faktúra',
  zmluva: 'Zmluva',
  objednavka: 'Objednávka',
  dodaci_list: 'Dodací list',
  ine: 'Iné',
}

export const STAV_DOKUMENTU_ARCHIV_LABELS: Record<StavDokumentuArchiv, string> = {
  nahrany: 'Nahraný',
  caka_na_schvalenie: 'Čaká na schválenie',
  schvaleny: 'Schválený',
  na_uhradu: 'Na úhradu',
  uhradeny: 'Uhradený',
  zamietnuty: 'Zamietnutý',
  nahradeny: 'Nahradený',
  expirujuci: 'Expirujúci',
}

export const STAV_DOKUMENTU_ARCHIV_COLORS: Record<StavDokumentuArchiv, string> = {
  nahrany: 'bg-gray-100 text-gray-800',
  caka_na_schvalenie: 'bg-orange-100 text-orange-800',
  schvaleny: 'bg-green-100 text-green-800',
  na_uhradu: 'bg-blue-100 text-blue-800',
  uhradeny: 'bg-teal-100 text-teal-800',
  zamietnuty: 'bg-red-100 text-red-800',
  nahradeny: 'bg-gray-200 text-gray-600',
  expirujuci: 'bg-yellow-100 text-yellow-800',
}
