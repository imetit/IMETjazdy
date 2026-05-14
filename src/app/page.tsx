import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import {
  ArrowRight, Car, Clock, FileText, Calendar, Plane, Truck, FolderArchive,
} from 'lucide-react'
import { createSupabaseServer } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'IMET Jazdy — HR a vozový park v jednom systéme',
  description: 'Dochádzka, kniha jázd, faktúry, dovolenky, fleet. Jedna aplikácia, jedna pravda. Postavené pre slovenské firmy.',
  openGraph: {
    title: 'IMET Jazdy',
    description: 'Dochádzka, kniha jázd, faktúry, dovolenky, fleet. Jedna aplikácia.',
    type: 'website', locale: 'sk_SK', siteName: 'IMET Jazdy',
  },
  twitter: { card: 'summary_large_image' },
}

export default async function HomePage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = (profile as { role?: string } | null)?.role
    if (role === 'tablet') redirect('/dochadzka?smer=prichod')
    if (role === 'admin' || role === 'it_admin' || role === 'fin_manager') redirect('/admin')
    if (role === 'fleet_manager') redirect('/fleet')
    redirect('/moje')
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white antialiased selection:bg-teal-500/30 overflow-x-hidden">
      <Nav />
      <Hero />
      <Modules />
      <SecurityStat />
      <Closing />
    </div>
  )
}

/* ───────────────────────── NAV ───────────────────────── */

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
        <Link href="/login"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-200 hover:text-white transition-colors">
          Prihlásiť sa <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </nav>
    </header>
  )
}

/* ───────────────────────── HERO ───────────────────────── */

function Hero() {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      {/* Aurora blobs */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] rounded-full
                        bg-[radial-gradient(circle,rgba(20,184,166,0.45),transparent_60%)] blur-[100px] aurora-1" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full
                        bg-[radial-gradient(circle,rgba(139,92,246,0.35),transparent_60%)] blur-[100px] aurora-2" />
        <div className="absolute bottom-[-20%] left-[20%] w-[800px] h-[500px] rounded-full
                        bg-[radial-gradient(circle,rgba(244,114,182,0.20),transparent_60%)] blur-[120px] aurora-3" />
        {/* Faint grid */}
        <div className="absolute inset-0 opacity-[0.025]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,6,23,0.7)_100%)]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-32 text-center">
        <p className="reveal-up reveal-up-1 text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-300/80 mb-8">
          HR · Mzdy · Fleet
        </p>

        <h1 className="reveal-up reveal-up-2 font-bold tracking-[-0.04em] leading-[0.85] text-balance">
          <span className="block text-[clamp(3rem,11vw,11rem)]">Jedna aplikácia.</span>
          <span className="block text-[clamp(3rem,11vw,11rem)] bg-gradient-to-br from-teal-200 via-white to-violet-200 bg-clip-text text-transparent">
            Celá firma.
          </span>
        </h1>

        <p className="reveal-up reveal-up-3 mt-10 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed text-balance">
          Dochádzka. Kniha jázd. Faktúry. Dovolenky. Fleet.
          <br className="hidden sm:block" />
          Postavené pre slovenské firmy, audit-ready pre korporát.
        </p>

        <div className="reveal-up reveal-up-4 mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login"
                className="group btn-shine relative inline-flex items-center gap-2.5 bg-white text-slate-950 px-8 py-4 rounded-full text-[15px] font-semibold transition-all hover:shadow-2xl hover:shadow-white/20 hover:scale-[1.02]">
            <span className="relative z-10 flex items-center gap-2.5">
              Vstúpiť do systému
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <a href="mailto:kontakt@imet.sk?subject=IMET%20Jazdy%20—%20Demo"
             className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
            alebo si vyžiadajte demo →
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div aria-hidden className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 text-xs flex flex-col items-center gap-2 opacity-60">
        <div className="w-px h-10 bg-gradient-to-b from-transparent via-slate-500 to-transparent" />
        <span>Posúvaj</span>
      </div>
    </section>
  )
}

/* ───────────────────────── MODULES ───────────────────────── */

function Modules() {
  const items = [
    { icon: Clock, t: 'Dochádzka', s: 'Tablet kiosk · PIN/RFID · mzdové podklady' },
    { icon: Car, t: 'Kniha jázd', s: 'Mesačné výúčtovania · náhrady · PDF/XLSX' },
    { icon: FileText, t: 'Faktúry', s: 'Multi-currency · ECB · viacstupňové schválenie' },
    { icon: Calendar, t: 'Dovolenky', s: 'Cez nadriadeného · zastupovanie · OČR/PN' },
    { icon: Plane, t: 'Služobné cesty', s: 'Domáce + zahraničné · doklady · stravné' },
    { icon: Truck, t: 'Vozový park', s: 'STK/EK/PZP · servis · poistné · tachometer' },
    { icon: FolderArchive, t: 'Archív', s: 'Verzionované doklady · expirácie · fulltext' },
  ]

  return (
    <section className="relative py-32 md:py-44">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-300/80 mb-6">
            Sedem oblastí
          </p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-[-0.03em] leading-[0.95]">
            Žiadne <span className="text-slate-500">export-import</span>
            <br />medzi nástrojmi.
          </h2>
          <p className="mt-6 text-lg text-slate-400 max-w-xl">
            Faktúra vie o vozidle. Cesta vie o doklade. Dovolenka generuje dochádzku.
            Jedno login, jedna pravda.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it, i) => {
            const Icon = it.icon
            return (
              <div key={i}
                   className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-7 hover:border-teal-400/30 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5">
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500
                                bg-gradient-to-br from-teal-500/5 via-transparent to-violet-500/5 pointer-events-none" />
                <Icon size={26} strokeWidth={1.5} className="text-teal-300/80 mb-6 transition-transform group-hover:scale-110 group-hover:text-teal-300" />
                <h3 className="text-xl font-semibold tracking-tight">{it.t}</h3>
                <p className="mt-2 text-[13px] text-slate-400 leading-relaxed">{it.s}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── SECURITY STAT ───────────────────────── */

function SecurityStat() {
  const chips = ['GDPR', '2FA TOTP', 'Audit immutable', 'IBAN encrypted', 'EU hosting', 'Multi-tenant RLS']
  return (
    <section className="relative py-32 md:py-44 overflow-hidden">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full
                        bg-[radial-gradient(circle,rgba(20,184,166,0.12),transparent_60%)] blur-3xl aurora-3" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-300/80 mb-6">
          Bezpečnosť
        </p>

        <div className="font-bold leading-[0.85] tracking-[-0.05em]">
          <span className="text-[clamp(6rem,18vw,16rem)] bg-gradient-to-br from-white via-teal-200 to-violet-300 bg-clip-text text-transparent">
            13 / 13
          </span>
        </div>

        <p className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight">
          critical security findings vyriešených
        </p>
        <p className="mt-4 text-base text-slate-400 max-w-xl mx-auto">
          Po 6-agentovom paralelnom audite. Pripravené pred deploy do enterprise prostredia —
          ešte pred externým pentestom.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {chips.map(c => (
            <span key={c} className="px-4 py-2 rounded-full text-xs font-medium border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:border-white/20 transition-colors">
              {c}
            </span>
          ))}
        </div>

        <div className="mt-12">
          <Link href="/security"
                className="inline-flex items-center gap-1.5 text-sm text-teal-300 hover:text-white transition-colors">
            Security policy <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── CLOSING + FOOTER ───────────────────────── */

function Closing() {
  return (
    <>
      <section className="relative py-32 md:py-44 overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full
                          bg-[radial-gradient(circle,rgba(20,184,166,0.20),transparent_60%)] blur-3xl aurora-1" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] rounded-full
                          bg-[radial-gradient(circle,rgba(139,92,246,0.18),transparent_60%)] blur-3xl aurora-2" />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-5xl md:text-7xl font-bold tracking-[-0.04em] leading-[0.9]">
            <span className="block">Začnime.</span>
          </h2>
          <p className="mt-6 text-lg text-slate-400">
            Napíšte počet zamestnancov, vozidiel, moduly.
            <br className="hidden sm:block" />
            Ozveme sa s ponukou do 24 hodín.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="mailto:kontakt@imet.sk?subject=IMET%20Jazdy%20—%20záujem"
               className="group btn-shine inline-flex items-center gap-2 bg-white text-slate-950 px-7 py-3.5 rounded-full text-sm font-semibold transition-all hover:shadow-2xl hover:shadow-white/20 hover:scale-[1.02]">
              <span className="relative z-10">kontakt@imet.sk</span>
            </a>
            <Link href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
              alebo sa prihlásiť <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
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
    </>
  )
}
