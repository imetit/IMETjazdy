import type { Profile } from './types'

/**
 * Vráti pracovný fond v hodinách pre konkrétny dátum.
 * Ak má profile fond_per_den (napr. {"po": 8.5, "ut": 8.5, ...}), použije podľa dňa týždňa.
 * Inak vráti pracovny_fond_hodiny alebo default 8.5.
 */
export function calculateFond(
  profile: Pick<Profile, 'pracovny_fond_hodiny' | 'fond_per_den'>,
  datum: Date,
): number {
  const fondPerDen = profile.fond_per_den
  if (fondPerDen && typeof fondPerDen === 'object') {
    const days = ['ne', 'po', 'ut', 'st', 'stv', 'pi', 'so']
    const key = days[datum.getDay()]
    if (typeof fondPerDen[key] === 'number') return fondPerDen[key]
  }
  return profile.pracovny_fond_hodiny ?? 8.5
}
