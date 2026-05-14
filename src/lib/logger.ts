import 'server-only'
import * as Sentry from '@sentry/nextjs'

/**
 * Structured logger s automatickým PII scrubbingom.
 *
 * Pattern:
 *   import { logger } from '@/lib/logger'
 *   logger.info('User signed in', { userId })  // ok — userId je UUID, ne PII
 *   logger.error('SMTP failed', err, { recipient: '[email scrubbed]' })
 *
 * Pravidlá:
 * - NIKDY nelogovať plné emaily, full_name, IBAN, PIN, JWT, hesla
 * - userId/UUID je v poriadku
 * - errory ide cez Sentry s `captureException`; metadata cez setContext
 *
 * V dev → console. V prod → Sentry (ak je DSN nastavený) + console fallback.
 */

const PII_PATTERNS = [
  /\b\d{6,}\b/g,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g,
  /Bearer\s+[A-Za-z0-9_.\-+/=]+/g,
]

function scrub(s: string): string {
  let out = s
  for (const p of PII_PATTERNS) out = out.replace(p, '[REDACTED]')
  return out
}

function scrubMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === 'string') out[k] = scrub(v)
    else if (v instanceof Error) out[k] = scrub(v.message)
    else out[k] = v
  }
  return out
}

interface LogMeta { [key: string]: unknown }

class Logger {
  info(msg: string, meta?: LogMeta) {
    const cleanMsg = scrub(msg)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${cleanMsg}`, meta ? scrubMeta(meta) : '')
    }
    Sentry.addBreadcrumb({
      level: 'info', message: cleanMsg,
      data: meta ? scrubMeta(meta) : undefined,
    })
  }

  warn(msg: string, meta?: LogMeta) {
    const cleanMsg = scrub(msg)
    console.warn(`[WARN] ${cleanMsg}`, meta ? scrubMeta(meta) : '')
    Sentry.captureMessage(cleanMsg, {
      level: 'warning',
      extra: meta ? scrubMeta(meta) : undefined,
    })
  }

  error(msg: string, err?: unknown, meta?: LogMeta) {
    const cleanMsg = scrub(msg)
    console.error(`[ERROR] ${cleanMsg}`, err)
    if (err instanceof Error) {
      Sentry.captureException(err, {
        extra: { context: cleanMsg, ...(meta ? scrubMeta(meta) : {}) },
      })
    } else {
      Sentry.captureMessage(cleanMsg, {
        level: 'error',
        extra: { err: err ? String(err) : null, ...(meta ? scrubMeta(meta) : {}) },
      })
    }
  }
}

export const logger = new Logger()
