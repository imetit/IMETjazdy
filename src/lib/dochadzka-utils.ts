import type { DochadzkaZaznam } from './dochadzka-types'

const SVIATKY: [number, number][] = [
  [0, 1], [0, 6], [4, 1], [4, 8], [6, 5], [7, 29],
  [8, 1], [8, 15], [10, 1], [10, 17], [11, 24], [11, 25], [11, 26],
]

const VELKONOCNE: Record<number, [number, number][]> = {
  2025: [[3, 18], [3, 21]],
  2026: [[3, 3], [3, 6]],
  2027: [[2, 26], [2, 29]],
  2028: [[3, 14], [3, 17]],
  2029: [[2, 30], [3, 2]],
  2030: [[3, 19], [3, 22]],
}

export function isSviatok(date: Date): boolean {
  const m = date.getMonth()
  const d = date.getDate()
  const y = date.getFullYear()
  if (SVIATKY.some(([sm, sd]) => sm === m && sd === d)) return true
  const velk = VELKONOCNE[y]
  if (velk && velk.some(([vm, vd]) => vm === m && vd === d)) return true
  return false
}

export function isPracovnyDen(date: Date): boolean {
  const day = date.getDay()
  if (day === 0 || day === 6) return false
  return !isSviatok(date)
}

export function getPracovneDni(rok: number, mesiac: number): number {
  let count = 0
  const daysInMonth = new Date(rok, mesiac + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    if (isPracovnyDen(new Date(rok, mesiac, d))) count++
  }
  return count
}

export function getMesacnyFond(rok: number, mesiac: number, fondHodiny: number): number {
  return getPracovneDni(rok, mesiac) * fondHodiny * 60
}

export function calculateDenneOdpracovane(zaznamy: DochadzkaZaznam[]): number {
  if (zaznamy.length === 0) return 0

  const sorted = [...zaznamy].sort((a, b) => new Date(a.cas).getTime() - new Date(b.cas).getTime())

  let pracaMin = 0
  let fajcenieMin = 0
  let malObed = false
  let lastPrichod: Date | null = null

  for (let i = 0; i < sorted.length; i++) {
    const z = sorted[i]
    const cas = new Date(z.cas)

    if (z.smer === 'prichod') {
      if (z.dovod === 'obed') malObed = true
      if (['praca', 'obed', 'fajcenie', 'prechod'].includes(z.dovod)) {
        lastPrichod = cas
      }
    } else if (z.smer === 'odchod' && lastPrichod) {
      const blokMin = (cas.getTime() - lastPrichod.getTime()) / 60000

      if (z.dovod === 'obed') malObed = true

      pracaMin += blokMin
      lastPrichod = null
    }

    if (z.smer === 'odchod' && z.dovod === 'fajcenie') {
      const next = sorted.slice(i + 1).find(n => n.smer === 'prichod')
      if (next) {
        fajcenieMin += (new Date(next.cas).getTime() - cas.getTime()) / 60000
      }
    }
  }

  const obedOdpocet = malObed ? 0 : 30

  return Math.max(0, Math.round(pracaMin - fajcenieMin - obedOdpocet))
}

export function calculateMesacnyStav(
  zaznamy: DochadzkaZaznam[],
  rok: number,
  mesiac: number,
  fondHodiny: number
): { odpracovane_min: number; fond_min: number; rozdiel_min: number } {
  const dny = new Map<string, DochadzkaZaznam[]>()
  for (const z of zaznamy) {
    const key = z.datum
    if (!dny.has(key)) dny.set(key, [])
    dny.get(key)!.push(z)
  }

  let celkoveMin = 0
  for (const denneZaznamy of dny.values()) {
    celkoveMin += calculateDenneOdpracovane(denneZaznamy)
  }

  const dnes = new Date()
  const fondMesiac = getMesacnyFond(rok, mesiac, fondHodiny)

  let fondDoTeraz = fondMesiac
  if (dnes.getFullYear() === rok && dnes.getMonth() === mesiac) {
    let pracDniDoTeraz = 0
    for (let d = 1; d <= dnes.getDate(); d++) {
      if (isPracovnyDen(new Date(rok, mesiac, d))) pracDniDoTeraz++
    }
    fondDoTeraz = pracDniDoTeraz * fondHodiny * 60
  }

  return {
    odpracovane_min: celkoveMin,
    fond_min: fondDoTeraz,
    rozdiel_min: celkoveMin - fondDoTeraz,
  }
}

export function formatMinutyNaHodiny(min: number): string {
  const absMin = Math.abs(min)
  const h = Math.floor(absMin / 60)
  const m = absMin % 60
  const prefix = min < 0 ? '-' : '+'
  return `${prefix}${h}h ${m.toString().padStart(2, '0')}min`
}
