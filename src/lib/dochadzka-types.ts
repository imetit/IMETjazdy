export type SmerDochadzky = 'prichod' | 'odchod'

export type DovodDochadzky =
  | 'praca' | 'obed' | 'lekar' | 'lekar_doprovod'
  | 'sluzobne' | 'sluzobna_cesta' | 'prechod'
  | 'fajcenie' | 'sukromne' | 'dovolenka'

export type ZdrojDochadzky = 'pin' | 'rfid' | 'manual' | 'system'

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
