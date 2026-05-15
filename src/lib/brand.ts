/**
 * Branding — centralizovaný white-label config.
 *
 * Defaultne aplikácia beží ako "TatraSoft Orbit" (vendor TatraSoft s.r.o.).
 * Pre on-prem deployment (napr. IMET) override cez NEXT_PUBLIC_BRAND_* env premenné.
 *
 * Príklad .env pre IMET inštaláciu:
 *   NEXT_PUBLIC_BRAND_NAME="Imet Systems"
 *   NEXT_PUBLIC_BRAND_SHORT_NAME="Imet"
 *   NEXT_PUBLIC_BRAND_VENDOR="IMET, a.s."
 *   NEXT_PUBLIC_BRAND_SUPPORT_EMAIL="kontakt@imet.sk"
 *   NEXT_PUBLIC_BRAND_LOGO_SRC="/imet-logo.png"
 *
 * Všetky polia sú NEXT_PUBLIC_ aby boli dostupné aj v client components
 * (sú to verejné texty, nie tajomstvá).
 */
export const brand = {
  /** Plný produktový názov v UI titulkoch, e-mailoch, OG cards. */
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'TatraSoft Orbit',
  /** Skrátená verzia (sidebar header, nav bar, mobil). */
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT_NAME || 'Orbit',
  /** Tagline pod nadpisom — kto/čo to je. */
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE || 'HR a vozový park v jednom systéme',
  /** Spoločnosť ktorá produkt vyvíja/distribuuje — copyright, právne stránky. */
  vendor: process.env.NEXT_PUBLIC_BRAND_VENDOR || 'TatraSoft s.r.o.',
  /** Verejný kontakt — login footer, error pages, "ozvať sa". */
  supportEmail: process.env.NEXT_PUBLIC_BRAND_SUPPORT_EMAIL || 'hello@tatrasoft.sk',
  /** Logo asset path — pre on-prem klientov ktorí chcú svoje logo. */
  logoSrc: process.env.NEXT_PUBLIC_BRAND_LOGO_SRC || '/imet-logo.png',
  /** Primárna doména produktu — sitemap, OG, canonical. */
  domain: process.env.NEXT_PUBLIC_BRAND_DOMAIN || 'tatrasoft-orbit.vercel.app',
} as const

/** mailto: link s príp. subject parametrom (URL-encoded). */
export function mailto(subject?: string) {
  const base = `mailto:${brand.supportEmail}`
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base
}
