import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

/**
 * Shared shell pre /privacy, /terms, /security — dark theme s aurora pozadím,
 * vizuálne konzistentný s landing a login. Žiadne `prose` class — Tailwind
 * utilities pre presnú typografiu na dark bg.
 */
export default function LegalShell({
  title, updated, children,
}: {
  title: string
  updated?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#020617] text-white antialiased selection:bg-teal-500/30 overflow-x-hidden">
      {/* Aurora pozadie (jemnejšie ako landing) */}
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-15%] w-[600px] h-[600px] rounded-full
                        bg-[radial-gradient(circle,rgba(20,184,166,0.18),transparent_60%)] blur-[120px] aurora-1" />
        <div className="absolute top-[40%] right-[-15%] w-[500px] h-[500px] rounded-full
                        bg-[radial-gradient(circle,rgba(139,92,246,0.14),transparent_60%)] blur-[120px] aurora-2" />
        <div className="absolute inset-0 opacity-[0.02]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_30%,rgba(2,6,23,0.85)_100%)]" />
      </div>

      <Nav />

      <main className="relative max-w-3xl mx-auto px-6 pt-32 pb-24">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-8 group">
          <ArrowRight size={12} className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
          Späť na úvod
        </Link>

        <header className="mb-12 pb-12 border-b border-white/[0.06]">
          <h1 className="text-4xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.05]">{title}</h1>
          {updated && (
            <p className="mt-4 text-xs text-slate-500 font-mono">
              Posledná aktualizácia: {updated}
            </p>
          )}
        </header>

        <article className="legal-body">{children}</article>
      </main>

      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="absolute inset-0 backdrop-blur-xl bg-[#020617]/60 border-b border-white/[0.06]" />
      <nav className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-white rounded-lg p-1.5 shadow-lg shadow-black/40 transition-transform group-hover:scale-105">
            <Image src="/imet-logo.png" alt="IMET" width={26} height={26} priority />
          </div>
          <span className="font-semibold tracking-tight text-[15px]">IMET Jazdy</span>
        </Link>
        <Link href="/login" className="text-[13px] font-medium text-slate-200 hover:text-white transition-colors">
          Prihlásiť sa →
        </Link>
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-md p-1"><Image src="/imet-logo.png" alt="IMET" width={18} height={18} /></div>
          <span>© {new Date().getFullYear()} IMET, a.s.</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-white transition-colors">Ochrana údajov</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Podmienky</Link>
          <Link href="/security" className="hover:text-white transition-colors">Bezpečnosť</Link>
        </div>
      </div>
    </footer>
  )
}
