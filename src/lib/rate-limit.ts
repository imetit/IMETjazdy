import 'server-only'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { headers } from 'next/headers'

/**
 * Centralizovaný rate-limiter cez Upstash Redis.
 *
 * Nastavenie:
 *   1. Vercel → Storage → Upstash → Create Redis database
 *   2. Vercel automaticky pridá `UPSTASH_REDIS_REST_URL` a `UPSTASH_REDIS_REST_TOKEN`
 *      do projektu (Marketplace integrácia)
 *   3. Pri lokálnom deve: `vercel env pull .env.local`
 *
 * Ak env nie sú nastavené, limiter degraduje na "vždy povol" (s console.warn),
 * aby sa app nezablokovala pri prvom deploy. V produkcii treba env nastaviť.
 */

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

const redis = url && token ? new Redis({ url, token }) : null

if (!redis && process.env.NODE_ENV === 'production') {
  // V produkcii bez Upstash → init-time warning. Nepoužívame logger.ts tu
  // kvôli kruhovej závislosti (logger → Sentry → môže potrebovať rate-limit
  // v budúcnosti). console.warn pre tento jediný init signál je OK.
  // eslint-disable-next-line no-console
  console.warn('[rate-limit] UPSTASH_REDIS_* env premenné chýbajú; rate limit DEAKTIVOVANÝ')
}

/**
 * Definované limitery. Kľúč:
 * - identifyPin: anti brute-force tablet PIN (krátke okno, prísne)
 * - login: anti brute-force prihlásenie
 * - generalWrite: ochrana state-changing server actions
 * - fileUpload: limit pri uploade súborov (DoS via storage flood)
 * - gdprExport: drahá operácia, agresívny limit
 */
export const limiters = redis ? {
  identifyPin: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(5, '5 m'), prefix: 'rl:pin' }),
  login: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(10, '15 m'), prefix: 'rl:login' }),
  generalWrite: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(60, '1 m'), prefix: 'rl:write' }),
  fileUpload: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(20, '1 m'), prefix: 'rl:upload' }),
  gdprExport: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(3, '1 h'), prefix: 'rl:gdpr' }),
} : null

export type LimiterName = 'identifyPin' | 'login' | 'generalWrite' | 'fileUpload' | 'gdprExport'

/**
 * Klient IP z request headerov. Pre Vercel/Cloudflare správne extrahuje real IP.
 * Pre development vráti '127.0.0.1'.
 */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers()
    const fwd = h.get('x-forwarded-for') || ''
    const real = h.get('x-real-ip') || ''
    const cf = h.get('cf-connecting-ip') || ''
    return cf || fwd.split(',')[0].trim() || real || '127.0.0.1'
  } catch {
    return '127.0.0.1'
  }
}

/**
 * Skontroluje rate limit. Vráti { ok: true } alebo { ok: false, retryAfter }.
 * Ak rate limit nie je nakonfigurovaný (chýbajú env), vždy povolí.
 *
 * Použitie:
 *   const rl = await checkRateLimit('login', clientIp)
 *   if (!rl.ok) return { error: `Príliš veľa pokusov, skús o ${rl.retryAfter}s` }
 */
export async function checkRateLimit(
  limiterName: LimiterName,
  key: string,
): Promise<{ ok: true } | { ok: false; retryAfter: number; remaining: number }> {
  if (!limiters) return { ok: true }
  const limiter = limiters[limiterName]
  const r = await limiter.limit(key)
  if (r.success) return { ok: true }
  return {
    ok: false,
    retryAfter: Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)),
    remaining: r.remaining,
  }
}
