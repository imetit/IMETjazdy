import * as Sentry from '@sentry/nextjs'

const DSN = process.env.SENTRY_DSN

const PII_PATTERNS = [
  /\b\d{6,}\b/g,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g,
  /Bearer\s+[A-Za-z0-9_.\-+/=]+/g,
]

function scrubPii(s: string): string {
  let out = s
  for (const p of PII_PATTERNS) out = out.replace(p, '[REDACTED]')
  return out
}

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,

    beforeSend(event) {
      if (event.message) event.message = scrubPii(event.message)
      if (event.breadcrumbs) {
        for (const b of event.breadcrumbs) {
          if (b.message) b.message = scrubPii(b.message)
          if (b.data) {
            for (const k of Object.keys(b.data)) {
              if (typeof b.data[k] === 'string') b.data[k] = scrubPii(b.data[k])
            }
          }
        }
      }
      if (event.request) {
        delete event.request.data
        delete event.request.query_string
        delete event.request.cookies
        if (event.request.headers) {
          delete event.request.headers.authorization
          delete event.request.headers.cookie
        }
      }
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.stacktrace?.frames) {
            for (const f of ex.stacktrace.frames) {
              if (f.vars) f.vars = undefined
            }
          }
        }
      }
      return event
    },
  })
}
