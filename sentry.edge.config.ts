import * as Sentry from '@sentry/nextjs'

const DSN = process.env.SENTRY_DSN

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.05,  // edge má menej requestov, šetríme quotu
    sendDefaultPii: false,
  })
}
