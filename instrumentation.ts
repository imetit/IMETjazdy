// Next.js Instrumentation hook — registers Sentry per-runtime.
// Auto-discovered by Next.js when `experimental.instrumentationHook` is set
// (since Next 16 enabled by default).

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = (await import('@sentry/nextjs')).captureRequestError
