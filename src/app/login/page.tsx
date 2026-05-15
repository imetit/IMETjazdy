import Link from 'next/link'
import Image from 'next/image'
import LoginForm from '@/components/LoginForm'
import { brand } from '@/lib/brand'

export const metadata = {
  title: 'Prihlásenie',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white antialiased overflow-hidden relative">
      {/* Aurora background — same vibe ako homepage hero */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] rounded-full
                        bg-[radial-gradient(circle,rgba(20,184,166,0.40),transparent_60%)] blur-[100px] aurora-1" />
        <div className="absolute top-[10%] right-[-15%] w-[600px] h-[600px] rounded-full
                        bg-[radial-gradient(circle,rgba(139,92,246,0.32),transparent_60%)] blur-[100px] aurora-2" />
        <div className="absolute bottom-[-20%] left-[15%] w-[700px] h-[500px] rounded-full
                        bg-[radial-gradient(circle,rgba(244,114,182,0.18),transparent_60%)] blur-[120px] aurora-3" />
        <div className="absolute inset-0 opacity-[0.025]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,6,23,0.75)_100%)]" />
      </div>

      {/* Top: minimal back to home */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-white rounded-lg p-1.5 shadow-lg shadow-black/40 transition-transform group-hover:scale-105">
            <Image src={brand.logoSrc} alt={brand.name} width={24} height={24} priority />
          </div>
          <span className="font-semibold tracking-tight text-sm">{brand.name}</span>
        </Link>
        <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
          ← Späť na úvod
        </Link>
      </header>

      {/* Centered glass card */}
      <main className="relative z-10 flex items-center justify-center px-4 py-12 min-h-[calc(100svh-100px)]">
        <div className="reveal-up reveal-up-1 w-full max-w-md">
          {/* Glow halo behind card */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.15),transparent_70%)] blur-2xl" />

          <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/40 p-8 sm:p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Vitajte späť</h1>
              <p className="mt-2 text-sm text-slate-400">Prihláste sa do svojho účtu</p>
            </div>

            <LoginForm />

            <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
              <p className="text-xs text-slate-500">
                Problém s prihlásením? Napíšte na{' '}
                <a href={`mailto:${brand.supportEmail}`} className="text-teal-300 hover:text-teal-200 transition-colors">{brand.supportEmail}</a>
              </p>
            </div>
          </div>

          {/* Sub-footer links */}
          <div className="mt-6 flex items-center justify-center gap-5 text-[11px] text-slate-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Ochrana údajov</Link>
            <span aria-hidden>·</span>
            <Link href="/terms" className="hover:text-white transition-colors">Podmienky</Link>
            <span aria-hidden>·</span>
            <Link href="/security" className="hover:text-white transition-colors">Bezpečnosť</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
