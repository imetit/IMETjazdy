'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AlertTriangle, RotateCw, Home } from 'lucide-react'
import { brand } from '@/lib/brand'

/**
 * Global error boundary — branded fallback page.
 * Next.js zavolá pri unhandled error v server component, page render, alebo
 * v root layoute (root je riešený osobitne).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Sentry instrumentation chytí toto automaticky cez captureRequestError + onRequestError hook
    if (process.env.NODE_ENV !== 'production') console.error('[error.tsx]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#020617] text-white antialiased flex items-center justify-center p-6 overflow-hidden relative">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] rounded-full
                        bg-[radial-gradient(circle,rgba(239,68,68,0.18),transparent_60%)] blur-[120px] aurora-1" />
        <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full
                        bg-[radial-gradient(circle,rgba(20,184,166,0.12),transparent_60%)] blur-[120px] aurora-2" />
      </div>

      <div className="relative w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 mb-6">
          <AlertTriangle size={28} className="text-red-300" strokeWidth={1.5} />
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-3">Niečo sa pokazilo</h1>
        <p className="text-slate-400 leading-relaxed mb-8">
          Stránku sa nepodarilo načítať. Skús to ešte raz alebo nás kontaktuj.
        </p>

        {error.digest && (
          <p className="font-mono text-[11px] text-slate-500 mb-8">
            Trace: <code className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">{error.digest}</code>
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="group inline-flex items-center gap-2 bg-white text-slate-950 px-6 py-3 rounded-full text-sm font-semibold hover:shadow-2xl hover:shadow-white/20 hover:scale-[1.02] transition-all">
            <RotateCw size={15} className="transition-transform group-hover:rotate-180" />
            Skús znovu
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 hover:bg-white/5 text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors">
            <Home size={15} /> Na úvod
          </Link>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.06] flex items-center justify-center gap-3 text-xs text-slate-500">
          <Image src={brand.wordmarkLightSrc} alt={brand.name} width={70} height={16} className="opacity-70" />
          <span>{brand.shortName}</span>
          <span aria-hidden>·</span>
          <a href={`mailto:${brand.supportEmail}`} className="hover:text-white transition-colors">{brand.supportEmail}</a>
        </div>
      </div>
    </div>
  )
}
