import { z } from 'zod'

/**
 * Centralizované Zod schémy pre validáciu vstupov server actions.
 *
 * Použitie v server action:
 *
 *   import { FakturaCreateSchema } from '@/lib/validation/schemas'
 *
 *   export async function createFaktura(formData: FormData) {
 *     const parsed = FakturaCreateSchema.safeParse(Object.fromEntries(formData))
 *     if (!parsed.success) return { error: 'Neplatné vstupy', issues: parsed.error.flatten() }
 *     // teraz parsed.data je type-safe a všetky polia sú validované
 *   }
 *
 * Validácia rieši:
 * - Trust boundary medzi klientom a serverom (nikdy nedôverovať formData)
 * - SQL injection (cez typové constrainty — UUID, regex)
 * - Business invariants (suma > 0, datum format, enum hodnoty)
 * - DoS cez nekontrolovanú dĺžku stringov
 */

// ── Primitives ─────────────────────────────────────────────────────────
export const uuidSchema = z.string().uuid('Neplatné UUID')
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dátum musí byť YYYY-MM-DD')
export const dateTimeSchema = z.string().datetime({ offset: true, message: 'Neplatný ISO datetime' })
export const mesiacSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Mesiac musí byť YYYY-MM')
export const emailSchema = z.string().email('Neplatný email').max(255)
export const passwordSchema = z.string().min(8, 'Heslo min 8 znakov').max(128)
export const pinSchema = z.string().regex(/^\d{6}$/, 'PIN musí byť 6 číslic')
export const pinSchema4 = z.string().regex(/^\d{4}$/, 'PIN musí byť 4 číslice')  // legacy
export const ibanSchema = z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i, 'Neplatný IBAN').max(34)
export const icoSchema = z.string().regex(/^\d{8}$/, 'IČO musí byť 8 číslic')
export const dicSchema = z.string().regex(/^\d{10}$/, 'DIČ musí byť 10 číslic')
export const icDphSchema = z.string().regex(/^SK\d{10}$/i, 'IČ DPH musí byť SK + 10 číslic').optional().nullable()
export const spzSchema = z.string().min(5).max(15).regex(/^[A-Z0-9 -]+$/i, 'SPZ obsahuje neplatné znaky')

export const positiveDecimal = z.coerce.number().positive().finite()
export const nonNegativeDecimal = z.coerce.number().min(0).finite()
export const integerCoerce = z.coerce.number().int().finite()
export const positiveInteger = z.coerce.number().int().positive()

// ── Enums ──────────────────────────────────────────────────────────────
export const RoleEnum = z.enum(['zamestnanec', 'admin', 'fleet_manager', 'it_admin', 'fin_manager', 'tablet'])
export const TypUvazkuEnum = z.enum(['tpp', 'dohoda', 'brigada', 'extern', 'materska', 'rodicovska'])
export const MenaEnum = z.enum(['EUR', 'USD', 'CZK', 'GBP', 'PLN', 'HUF', 'CHF'])
export const SmerEnum = z.enum(['prichod', 'odchod'])
export const DovodEnum = z.enum(['praca', 'lekar', 'sluzobna_cesta', 'obed', 'dovolenka', 'ocr', 'sick_leave', 'nahradne_volno', 'neplatene_volno'])
export const ZdrojEnum = z.enum(['tablet', 'web', 'manual', 'system'])

// ── Entity schemas ─────────────────────────────────────────────────────

export const ZamestnanecCreateSchema = z.object({
  email: emailSchema,
  full_name: z.string().trim().min(2, 'Meno min 2 znaky').max(120),
  password: passwordSchema,
  role: RoleEnum.optional().default('zamestnanec'),
  vozidlo_id: uuidSchema.optional().nullable(),
})

export const ZamestnanecEmailUpdateSchema = z.object({
  profileId: uuidSchema,
  email: emailSchema,
})

export const ZamestnanecPasswordResetSchema = z.object({
  profileId: uuidSchema,
  newPassword: passwordSchema,
})

export const ZamestnanecFondSchema = z.object({
  tyzdnovyFond: z.coerce.number().positive().max(60),
  pracovneDniTyzdne: z.coerce.number().int().min(1).max(7),
})

export const DochadzkaManualSchema = z.object({
  user_id: uuidSchema,
  datum: dateSchema,
  smer: SmerEnum,
  dovod: DovodEnum,
  cas: dateTimeSchema,
})

export const DochadzkaKorekciaSchema = z.object({
  user_id: uuidSchema,
  datum: dateSchema,
  smer: SmerEnum,
  dovod: DovodEnum,
  cas: dateTimeSchema,
  korekcia_dovod: z.string().trim().min(3, 'Dôvod min 3 znaky').max(500),
})

export const FakturaCreateSchema = z.object({
  cislo_faktury: z.string().trim().min(1).max(50),
  firma_id: uuidSchema,
  dodavatel_id: uuidSchema.optional().nullable(),
  dodavatel_nazov: z.string().trim().min(1).max(200).optional(),
  mena: MenaEnum.default('EUR'),
  dph_sadzba: z.coerce.number().min(0).max(100).default(20),
  datum_splatnosti: dateSchema,
  datum_vystavenia: dateSchema.optional().nullable(),
  datum_doruceni: dateSchema.optional().nullable(),
  iban: ibanSchema.optional().nullable(),
  je_dobropis: z.coerce.boolean().default(false),
  povodna_faktura_id: uuidSchema.optional().nullable(),
})

export const JazdaCreateSchema = z.object({
  mesiac: mesiacSchema,
  odchod_z: z.string().trim().max(200).default(''),
  prichod_do: z.string().trim().max(200).default(''),
  cez: z.string().trim().max(200).optional().nullable(),
  km: z.coerce.number().nonnegative().max(100000, 'Príliš veľa km'),
  cas_odchodu: z.string().regex(/^\d{2}:\d{2}$/).default('00:00'),
  cas_prichodu: z.string().regex(/^\d{2}:\d{2}$/).default('00:00'),
  stav: z.enum(['rozpracovana', 'odoslana', 'spracovana']).default('rozpracovana'),
})

export const DovolenkaCreateSchema = z.object({
  datum_od: dateSchema,
  datum_do: dateSchema,
  typ: z.enum(['dovolenka', 'ocr', 'sick_leave', 'nahradne_volno', 'neplatene_volno']).default('dovolenka'),
  pol_dna: z.coerce.boolean().default(false),
  cast_dna: z.enum(['dopoludnie', 'popoludnie']).optional().nullable(),
  poznamka: z.string().max(500).optional().nullable(),
}).refine(d => d.datum_od <= d.datum_do, { message: 'datum_od musí byť ≤ datum_do', path: ['datum_do'] })

export const CestaCreateSchema = z.object({
  datum_od: dateSchema,
  datum_do: dateSchema,
  ciel: z.string().trim().min(2).max(200),
  ucel: z.string().trim().min(2).max(500),
  doprava: z.enum(['firemne_auto', 'sukromne_auto', 'vlak', 'autobus', 'lietadlo', 'mhd', 'ine']),
  predpokladany_km: z.coerce.number().int().min(0).max(20000).optional().nullable(),
  poznamka: z.string().max(1000).optional().nullable(),
  typ_cesty: z.enum(['domaca', 'zahranicna']).optional().default('domaca'),
  krajina: z.string().length(2).optional().nullable(),
  mena: MenaEnum.optional().default('EUR'),
}).refine(d => d.datum_od <= d.datum_do, { message: 'datum_od musí byť ≤ datum_do', path: ['datum_do'] })

export const DodavatelCreateSchema = z.object({
  nazov: z.string().trim().min(2).max(200),
  ico: icoSchema.optional().nullable(),
  dic: dicSchema.optional().nullable(),
  ic_dph: icDphSchema,
  iban: ibanSchema.optional().nullable(),
  default_mena: MenaEnum.optional().default('EUR'),
  default_dph_sadzba: z.coerce.number().min(0).max(100).default(20),
  default_splatnost_dni: z.coerce.number().int().min(0).max(365).default(14),
  email: emailSchema.optional().nullable(),
  telefon: z.string().max(40).optional().nullable(),
  adresa: z.string().max(500).optional().nullable(),
  poznamka: z.string().max(1000).optional().nullable(),
})

/**
 * Pomocná funkcia pre server actions: validuje FormData proti schéme a vráti
 * typovo bezpečné dáta alebo error.
 */
export function parseFormData<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): { ok: true; data: z.infer<T> } | { ok: false; error: string; issues: z.inferFlattenedErrors<T> } {
  const obj: Record<string, unknown> = {}
  for (const [k, v] of formData.entries()) {
    // Multi-value polia (napr. files[]) — necháme len prvé pre teraz; špeciálne
    // handle by mali volajúci.
    if (obj[k] === undefined) obj[k] = v
  }
  const parsed = schema.safeParse(obj)
  if (!parsed.success) {
    const flat = parsed.error.flatten() as z.inferFlattenedErrors<T>
    const firstField = Object.keys(flat.fieldErrors)[0]
    const firstMsg = firstField ? (flat.fieldErrors as Record<string, string[]>)[firstField]?.[0] : flat.formErrors?.[0]
    return { ok: false, error: firstMsg || 'Neplatné vstupy', issues: flat }
  }
  return { ok: true, data: parsed.data }
}
