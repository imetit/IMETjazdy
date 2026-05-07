// src/lib/faktury-types.ts
// Spec: docs/superpowers/specs/2026-05-07-faktury-modul-design.md

export type FakturaStav =
  | 'rozpracovana'
  | 'caka_na_schvalenie'
  | 'schvalena'
  | 'zamietnuta'
  | 'na_uhradu'
  | 'uhradena'
  | 'stornovana'

export type Mena = 'EUR' | 'CZK' | 'USD' | 'GBP' | 'PLN' | 'HUF' | 'CHF'

export type SchvalovatelRole = 'nadriadeny' | 'fin_manager' | 'admin' | 'it_admin' | string

export interface FakturyWorkflowConfig {
  stupne: 1 | 2
  limit_auto_eur: number
  schvalovatel_l1: SchvalovatelRole
  schvalovatel_l2: SchvalovatelRole
  uhradzuje: SchvalovatelRole
}

export interface Faktura {
  id: string
  cislo_faktury: string
  variabilny_symbol: string | null
  konstantny_symbol: string | null
  specificky_symbol: string | null
  je_dobropis: boolean
  povodna_faktura_id: string | null

  dodavatel_id: string | null
  dodavatel_nazov: string
  dodavatel_ico: string | null

  mena: Mena
  suma_bez_dph: number | null
  dph_sadzba: number
  dph_suma: number | null
  suma_celkom: number
  kurz_k_eur: number | null
  suma_celkom_eur: number | null
  kurz_zdroj: 'ECB' | 'manual' | 'NBS' | null
  kurz_datum: string | null

  iban: string | null

  datum_vystavenia: string | null
  datum_doruceni: string | null
  datum_splatnosti: string
  datum_uhrady: string | null
  datum_zdanitelneho_plnenia: string | null

  stav: FakturaStav
  aktualny_stupen: 1 | 2
  version: number

  file_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null

  firma_id: string
  vozidlo_id: string | null
  servis_id: string | null
  tankova_karta_id: string | null
  cesta_id: string | null
  zamestnanec_id: string | null
  skolenie_id: string | null
  poistna_udalost_id: string | null
  bankovy_ucet_id: string | null
  kategoria_id: string | null

  popis: string | null
  poznamka: string | null
  oddelenie: string | null
  tagy: string[] | null

  nahral_id: string
  posol_na_schvalenie_at: string | null
  schvalil_l1_id: string | null
  schvalene_l1_at: string | null
  schvalil_l2_id: string | null
  schvalene_l2_at: string | null
  zamietol_id: string | null
  zamietnute_at: string | null
  zamietnutie_dovod: string | null
  uhradil_id: string | null
  uhradene_at: string | null
  stornoval_id: string | null
  stornovane_at: string | null
  storno_dovod: string | null

  created_at: string
  updated_at: string
}

export interface Dodavatel {
  id: string
  nazov: string
  ico: string | null
  dic: string | null
  ic_dph: string | null
  iban: string | null
  swift: string | null
  default_mena: Mena
  default_dph_sadzba: number
  default_splatnost_dni: number | null
  adresa: string | null
  email: string | null
  telefon: string | null
  poznamka: string | null
  aktivny: boolean
  created_at: string
  updated_at: string
}

export interface BankovyUcet {
  id: string
  firma_id: string
  nazov: string
  iban: string
  swift: string | null
  banka: string | null
  mena: Mena
  aktivny: boolean
  poradie: number | null
  poznamka: string | null
}

export interface KurzMen {
  id: string
  mena: Mena
  kurz_k_eur: number
  datum: string
  zdroj: 'ECB' | 'NBS' | 'manual'
}

export interface FakturaAuditEntry {
  id: string
  faktura_id: string
  user_id: string | null
  akcia: string
  povodny_stav: FakturaStav | null
  novy_stav: FakturaStav | null
  zmenene_polia: Record<string, { old: unknown; new: unknown }> | null
  poznamka: string | null
  ip_address: string | null
  created_at: string
}

export const FAKTURA_STAV_LABELS: Record<FakturaStav, string> = {
  rozpracovana: 'Rozpracovaná',
  caka_na_schvalenie: 'Čaká na schválenie',
  schvalena: 'Schválená',
  zamietnuta: 'Zamietnutá',
  na_uhradu: 'Na úhradu',
  uhradena: 'Uhradená',
  stornovana: 'Stornovaná',
}

export const FAKTURA_STAV_COLORS: Record<FakturaStav, string> = {
  rozpracovana: 'bg-gray-100 text-gray-800',
  caka_na_schvalenie: 'bg-orange-100 text-orange-800',
  schvalena: 'bg-green-100 text-green-800',
  zamietnuta: 'bg-red-100 text-red-800',
  na_uhradu: 'bg-blue-100 text-blue-800',
  uhradena: 'bg-teal-100 text-teal-800',
  stornovana: 'bg-gray-200 text-gray-500',
}

export const MENA_SYMBOLS: Record<Mena, string> = {
  EUR: '€', CZK: 'Kč', USD: '$', GBP: '£', PLN: 'zł', HUF: 'Ft', CHF: 'CHF',
}

export const VSETKY_MENY: Mena[] = ['EUR', 'CZK', 'USD', 'GBP', 'PLN', 'HUF', 'CHF']

// Polia ktoré po zmene spustia re-approval keď je faktúra schválená/na úhradu
export const SECURITY_FIELDS = [
  'suma_celkom', 'suma_bez_dph', 'dph_sadzba', 'dph_suma', 'mena', 'kurz_k_eur',
  'dodavatel_id', 'dodavatel_nazov', 'iban', 'variabilny_symbol', 'cislo_faktury',
  'datum_splatnosti', 'file_path',
] as const

export type SecurityField = typeof SECURITY_FIELDS[number]

// Allowed transitions matrix — MUSÍ matchovať DB trigger faktury_state_guard_fn
export const ALLOWED_TRANSITIONS: Record<FakturaStav, FakturaStav[]> = {
  rozpracovana: ['caka_na_schvalenie', 'stornovana'],
  caka_na_schvalenie: ['schvalena', 'caka_na_schvalenie', 'zamietnuta', 'stornovana'],
  schvalena: ['na_uhradu', 'uhradena', 'caka_na_schvalenie', 'stornovana'],
  zamietnuta: ['caka_na_schvalenie', 'stornovana'],
  na_uhradu: ['uhradena', 'schvalena', 'caka_na_schvalenie', 'stornovana'],
  uhradena: ['stornovana'], // iba it_admin force
  stornovana: [],
}

export function canTransition(from: FakturaStav, to: FakturaStav): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function formatSuma(suma: number, mena: Mena): string {
  const symbol = MENA_SYMBOLS[mena] || mena
  const formatted = new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(suma))
  const sign = suma < 0 ? '-' : ''
  return `${sign}${formatted} ${symbol}`
}
