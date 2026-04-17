export const TYP_SKOLENIA_LABELS: Record<string, string> = {
  bozp: 'BOZP',
  opp: 'Ochrana pred požiarmi',
  vodicak: 'Vodičský preukaz',
  odborne: 'Odborné školenie',
  ine: 'Iné',
}

export const STAV_SKOLENIA_LABELS: Record<string, string> = {
  platne: 'Platné',
  blizi_sa: 'Blíži sa expirácia',
  expirovane: 'Expirované',
}

export const STAV_SKOLENIA_COLORS: Record<string, string> = {
  platne: 'bg-green-100 text-green-800',
  blizi_sa: 'bg-orange-100 text-orange-800',
  expirovane: 'bg-red-100 text-red-800',
}
