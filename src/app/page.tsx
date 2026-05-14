import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import {
  ArrowRight, Car, Clock, FileText, Calendar, Plane, Truck, FolderArchive,
  ShieldCheck, LockKeyhole, Database, Globe2, FileCheck, Eye, KeyRound,
  AlertTriangle, Server, Code2, Sparkles, Mail, ChevronRight, Check,
} from 'lucide-react'
import { createSupabaseServer } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'IMET Jazdy — HR a vozový park v jednom systéme',
  description:
    'Komplexný systém pre dochádzku, knihu jázd, mzdové podklady, faktúry, dovolenky a vozový park. Multi-firma, GDPR-ready, 2FA, EU hosting. Postavené pre slovenské firmy.',
  openGraph: {
    title: 'IMET Jazdy — HR a vozový park v jednom systéme',
    description:
      'Dochádzka, kniha jázd, faktúry, dovolenky, fleet — od jednej platformy. GDPR · 2FA · Audit-immutable · EU hosting.',
    type: 'website',
    locale: 'sk_SK',
    siteName: 'IMET Jazdy',
  },
  twitter: { card: 'summary_large_image', title: 'IMET Jazdy' },
}

export default async function HomePage() {
  // Logged-in users skip the landing — go straight to their dashboard
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
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-teal-500/30">
      <TopNav />
      <Hero />
      <TrustStrip />
      <Modules />
      <SecuritySection />
      <TechStack />
      <FAQ />
      <CTAPanel />
      <Footer />
    </div>
  )
}

/* ============================================================== */
/*  TOP NAV                                                       */
/* ============================================================== */

function TopNav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-white/5">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-1.5 shadow-lg shadow-black/40">
            <Image src="/imet-logo.png" alt="IMET" width={28} height={28} priority />
          </div>
          <span className="font-bold tracking-tight text-lg">IMET Jazdy</span>
        </Link>
        <div className="hidden md:flex items-center gap-7 text-sm text-slate-300">
          <a href="#moduly" className="hover:text-white transition-colors">Moduly</a>
          <a href="#bezpecnost" className="hover:text-white transition-colors">Bezpečnosť</a>
          <a href="#tech" className="hover:text-white transition-colors">Technológie</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-3">
          <a href="mailto:kontakt@imet.sk"
             className="hidden sm:inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors">
            <Mail size={14} /> Demo
          </a>
          <Link href="/login"
                className="inline-flex items-center gap-1.5 bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors shadow-lg shadow-black/40">
            Prihlásiť sa <ArrowRight size={14} />
          </Link>
        </div>
      </nav>
    </header>
  )
}

/* ============================================================== */
/*  HERO                                                          */
/* ============================================================== */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full
                        bg-[radial-gradient(closest-side,rgba(20,184,166,0.18),rgba(15,23,42,0)_70%)] blur-3xl" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full
                        bg-[radial-gradient(closest-side,rgba(139,92,246,0.12),rgba(15,23,42,0)_70%)] blur-3xl" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-400/30 bg-teal-500/10 text-teal-300 text-xs font-medium mb-8">
            <Sparkles size={12} /> Verzia 16 · pripravené pre korporát
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="block text-white">HR a vozový park.</span>
            <span className="block bg-gradient-to-br from-white via-teal-100 to-slate-400 bg-clip-text text-transparent">
              Jeden systém. Jedna pravda.
            </span>
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed">
            Dochádzka cez tablet kiosk, kniha jázd, mzdové podklady, faktúry, dovolenky, služobné
            cesty a vozový park — všetko v jednej aplikácii. Multi-firma scope, GDPR-ready,
            audit-immutable.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/login"
                  className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3.5 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-teal-500/30">
              Vyskúšať systém <ArrowRight size={16} />
            </Link>
            <a href="mailto:kontakt@imet.sk?subject=Žiadosť%20o%20demo%20—%20IMET%20Jazdy"
               className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 hover:bg-white/5 text-white px-6 py-3.5 rounded-lg text-sm font-semibold transition-colors">
              <Mail size={16} /> Vyžiadať demo
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><Check size={14} className="text-teal-400" /> Slovenská lokalizácia</span>
            <span className="flex items-center gap-1.5"><Check size={14} className="text-teal-400" /> 7 firiem v produkcii</span>
            <span className="flex items-center gap-1.5"><Check size={14} className="text-teal-400" /> EU hosting (Ireland + Frankfurt)</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================== */
/*  TRUST STRIP                                                   */
/* ============================================================== */

function TrustStrip() {
  const stats = [
    { v: '13/13', l: 'security findings vyriešených' },
    { v: '7+', l: 'firiem v produkcii' },
    { v: '250+', l: 'aktívnych zamestnancov' },
    { v: '99,5%', l: 'cieľová mesačná dostupnosť' },
  ]
  return (
    <section className="relative border-y border-white/5 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <div key={i} className="text-center md:text-left">
            <p className="text-3xl md:text-4xl font-bold tracking-tight text-white">{s.v}</p>
            <p className="mt-1 text-sm text-slate-400">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ============================================================== */
/*  MODULES                                                       */
/* ============================================================== */

function Modules() {
  const items = [
    {
      icon: Clock, title: 'Dochádzka',
      desc: 'Tablet kiosk s PIN/RFID, auto-detekcia anomálií, korekcie, mzdové podklady pre PROLIM/Cézar/Magma. Hierarchia nadriadený → zástupca → admin.',
    },
    {
      icon: Car, title: 'Kniha jázd',
      desc: 'Mesačné výúčtovania, automatický výpočet náhrad podľa zákona č. 283/2002, PDF/XLSX export, kontextové linky na vozidlá a cesty.',
    },
    {
      icon: FileText, title: 'Faktúry',
      desc: 'Multi-currency s ECB kurzami, viacstupňový workflow schválenia, dobropisy, automatické notifikácie pred splatnosťou, IBAN šifrovaný at-rest.',
    },
    {
      icon: Calendar, title: 'Dovolenky',
      desc: 'Žiadosť cez nadriadeného, automatické zastupovanie, polovičné dni, OČR/PN/náhradné voľno. Synchronizuje sa do dochádzky.',
    },
    {
      icon: Plane, title: 'Služobné cesty',
      desc: 'Domáce + zahraničné, preddavky, stravné podľa krajiny, doklady so sumami v mene cesty, auto-flow do dochádzky.',
    },
    {
      icon: Truck, title: 'Vozový park',
      desc: 'STK / EK / havarijné / PZP s eskaláciou 30/14/7 dní, M:N vodiči, plánovanie servisu, poistné udalosti, tankovacie karty.',
    },
    {
      icon: FolderArchive, title: 'Archív',
      desc: 'Versionované dokumenty, kategórie s ACL, fulltext, expirácie, integrácia s faktúrami a kontextom (zamestnanec/vozidlo/cesta).',
    },
  ]

  return (
    <section id="moduly" className="bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide">Moduly</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            Sedem oblastí, jedna kódová báza, žiadne export-import medzi nástrojmi.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Každý modul rozumie kontextu ostatných. Faktúra môže byť linknutá na vozidlo,
            cestu, zamestnanca alebo školenie. Dovolenka automaticky vygeneruje záznamy
            v dochádzke. Jedno login, jedna pravda.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it, i) => {
            const Icon = it.icon
            return (
              <div key={i}
                   className="group relative rounded-2xl border border-slate-200/80 bg-white p-7 hover:border-teal-400/60 hover:shadow-xl hover:shadow-teal-500/5 transition-all">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-teal-50 text-teal-700 mb-5">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{it.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{it.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ============================================================== */
/*  SECURITY                                                      */
/* ============================================================== */

function SecuritySection() {
  const pillars: Array<{ icon: typeof ShieldCheck; title: string; desc: string }> = [
    {
      icon: FileCheck, title: 'GDPR-ready endpointy',
      desc: 'Right to access (čl. 15) — ZIP export užívateľských dát. Right to erasure (čl. 17) — anonymizácia cez DB SECURITY DEFINER funkciu.',
    },
    {
      icon: KeyRound, title: '2FA / MFA TOTP',
      desc: 'Povinné pre admin, fin_manager a it_admin roly. Google Authenticator, Authy, 1Password kompatibilné. Recovery cez IT admina.',
    },
    {
      icon: Eye, title: 'Audit log immutable',
      desc: 'DB trigger blokuje UPDATE/DELETE vrátane service_role. Zaznamenáva user, IP, user-agent. Retencia 7 rokov podľa SR legislatívy.',
    },
    {
      icon: LockKeyhole, title: 'IBAN šifrovaný at-rest',
      desc: 'pgcrypto + Supabase Vault, AES-256. Decrypt iba pre role fin_manager/admin/it_admin cez RLS-gated views. Plaintext nikdy neopustí DB.',
    },
    {
      icon: ShieldCheck, title: 'Multi-tenant izolácia',
      desc: 'Per-firma cache keys, requireScopedAdmin guards, RLS politiky na DB úrovni. Admin firmy A fyzicky nevidí dáta firmy B.',
    },
    {
      icon: AlertTriangle, title: 'Rate limit + brute-force guard',
      desc: 'Upstash Redis limity na PIN (5/5min), login, write akcie. PostgREST .or() escape. Žiadne secrety v query string.',
    },
    {
      icon: Database, title: 'Soft-delete + retencia',
      desc: 'Deaktivácia + 30-dňový grace window pred hard-delete. Účtovné záznamy podľa zákona 431/2002 (10 rokov) zachované s placeholder menom.',
    },
    {
      icon: Server, title: 'Sentry s PII scrubbing',
      desc: 'Error tracking bez emailov, IBANov, PINov, JWT v stack tracoch. sendDefaultPii=false. Request body / cookies / Authorization scrub-nuté.',
    },
  ]

  return (
    <section id="bezpecnost" className="relative overflow-hidden border-y border-white/5">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[700px] h-[700px] rounded-full
                        bg-[radial-gradient(closest-side,rgba(20,184,166,0.10),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-400 uppercase tracking-wide">Bezpečnosť</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Pripravené na audit veľkej korporácie.
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Tento systém prešiel 6-agentovým paralelným bezpečnostným auditom. <strong className="text-white">
            13 critical findings, 10 medium</strong> — všetky vyriešené pred deploy do enterprise prostredia.
            Pozri si <a href="/security" className="text-teal-400 hover:text-teal-300 underline underline-offset-2">security policy</a> alebo
            stiahni <a href="/.well-known/security.txt" className="text-teal-400 hover:text-teal-300 underline underline-offset-2">security.txt</a>.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((p, i) => {
            const Icon = p.icon
            return (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 p-6 transition-colors">
                <Icon size={22} className="text-teal-400 mb-4" />
                <h3 className="text-sm font-semibold text-white tracking-tight">{p.title}</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Compliance badges row */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: 'GDPR', s: 'Čl. 15 + 17 endpointy' },
            { l: 'CSP + HSTS', s: 'A skóre securityheaders.com' },
            { l: 'CI security gates', s: 'npm audit · gitleaks · dependabot' },
            { l: 'EU-only hosting', s: 'Supabase Ireland · Vercel Frankfurt' },
          ].map((b, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-slate-900/40 p-4 text-center">
              <p className="text-sm font-bold text-white">{b.l}</p>
              <p className="mt-1 text-xs text-slate-400">{b.s}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================== */
/*  TECH STACK                                                    */
/* ============================================================== */

function TechStack() {
  const stack = [
    { name: 'Next.js 16', desc: 'App Router + Server Components' },
    { name: 'React 19', desc: 'Modern hooks + transitions' },
    { name: 'TypeScript 5', desc: 'Type-safe end-to-end' },
    { name: 'Supabase', desc: 'Postgres 17 + Auth + Storage (EU)' },
    { name: 'Vercel', desc: 'Edge runtime, Frankfurt (fra1)' },
    { name: 'Tailwind 4', desc: 'Design system + tokens' },
    { name: 'Zod', desc: 'Runtime input validation' },
    { name: 'Sentry', desc: 'Error tracking s PII scrubbing' },
    { name: 'Upstash Redis', desc: 'Rate limiting at edge' },
    { name: 'Playwright', desc: 'E2E auth + tenant testy' },
    { name: 'Resend', desc: 'Transakčné emaily' },
    { name: 'pgcrypto + Vault', desc: 'Column-level encryption' },
  ]
  return (
    <section id="tech" className="bg-white text-slate-900 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide">Stack</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            Postavené na špičkových technológiách.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Žiadny self-managed Postgres v jednom regióne. Žiadny PHP legacy. Moderný stack
            ktorý škáluje od 50 do 50 000 zamestnancov bez prepisovania.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {stack.map((s, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 hover:border-slate-300 hover:bg-white transition-colors">
              <p className="font-mono text-sm font-bold text-slate-900">{s.name}</p>
              <p className="mt-1 text-xs text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================== */
/*  FAQ                                                           */
/* ============================================================== */

function FAQ() {
  const faqs = [
    {
      q: 'Kto za týmto systémom stojí?',
      a: 'IMET, a.s. (Bratislava). Systém vznikol z reálnej internej potreby — pre 7 prepojených firiem a 250+ zamestnancov. Používame ho každý deň, nie je to vendor-marketing.',
    },
    {
      q: 'Pre koľko ľudí to škáluje?',
      a: 'Architektúra (Supabase Postgres + Vercel edge + per-firma cache scope) je pripravená na 10 000+ zamestnancov. V produkcii aktuálne 250+; benchmarky ukazujú dostatočnú rezervu na 10×.',
    },
    {
      q: 'Kde sú uložené naše dáta?',
      a: 'Databáza: Supabase EU-West (Ireland, AWS). Edge: Vercel Frankfurt (fra1). Emaily: Resend (USA — len transakcie, nie samotné dáta). Sentry: EU región, navyše s PII scrubbingom. Žiadne osobné dáta neopúšťajú EU.',
    },
    {
      q: 'Aké sú náklady?',
      a: 'Licencia závisí od počtu zamestnancov, modulov a SLA. Pre presnú cenu napíšte na kontakt@imet.sk — odpovedáme do 24 hodín.',
    },
    {
      q: 'Môžem si systém samostatne hosťovať?',
      a: 'Áno — pre licenčných odberateľov je systém deploynuteľný do vášho vlastného Vercel + Supabase projektu. Setup cca 1 deň. SBOM (CycloneDX) súčasťou release balíčka.',
    },
    {
      q: 'Spravuje to externý pentester?',
      a: 'Pred ostrým predajom korporátnemu klientovi áno — odporúčame Citadelo, Nethemba alebo bug bounty platformu. Aktuálne výsledky interného 6-agent auditu + remediácie sú publikované v repo plánoch.',
    },
    {
      q: 'Čo ak nájdem zraniteľnosť?',
      a: <>Pošlite na <a href="mailto:security@imet.sk" className="text-teal-600 underline">security@imet.sk</a> alebo pozrite <Link href="/security" className="text-teal-600 underline">security policy</Link>. Coordinated disclosure, safe harbor pre good-faith research, acknowledgement do 48h.</>,
    },
  ]

  return (
    <section id="faq" className="bg-white text-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide">FAQ</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Často kladené otázky</h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => (
            <details key={i} className="group rounded-xl border border-slate-200 bg-slate-50/40 open:bg-white open:shadow-sm transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 select-none">
                <span className="font-semibold text-slate-900">{f.q}</span>
                <ChevronRight size={18} className="text-slate-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================== */
/*  CTA PANEL                                                     */
/* ============================================================== */

function CTAPanel() {
  return (
    <section className="relative overflow-hidden border-t border-white/5">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full
                        bg-[radial-gradient(closest-side,rgba(20,184,166,0.15),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
          Pripravený nasadiť to do vlastnej firmy?
        </h2>
        <p className="mt-5 text-lg text-slate-300 max-w-2xl mx-auto">
          Napíšte nám pár viet o vašej firme — počet zamestnancov, koľko vozidiel,
          ktoré moduly potrebujete. Ozveme sa s konkrétnou ponukou do 24 hodín.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a href="mailto:kontakt@imet.sk?subject=Záujem%20o%20nasadenie%20—%20IMET%20Jazdy"
             className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3.5 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-teal-500/30">
            <Mail size={16} /> kontakt@imet.sk
          </a>
          <Link href="/login"
                className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 hover:bg-white/5 text-white px-6 py-3.5 rounded-lg text-sm font-semibold transition-colors">
            Mám už účet — prihlásiť sa <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ============================================================== */
/*  FOOTER                                                        */
/* ============================================================== */

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white rounded-lg p-1.5"><Image src="/imet-logo.png" alt="IMET" width={24} height={24} /></div>
            <span className="font-bold tracking-tight text-white">IMET Jazdy</span>
          </div>
          <p className="text-slate-400 leading-relaxed max-w-sm">
            HR + vozový park v jednej platforme. Postavené pre slovenské firmy,
            pripravené na korporátne due diligence.
          </p>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Produkt</p>
          <ul className="space-y-2 text-slate-400">
            <li><a href="#moduly" className="hover:text-white">Moduly</a></li>
            <li><a href="#bezpecnost" className="hover:text-white">Bezpečnosť</a></li>
            <li><a href="#tech" className="hover:text-white">Technológie</a></li>
            <li><a href="#faq" className="hover:text-white">FAQ</a></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Právne</p>
          <ul className="space-y-2 text-slate-400">
            <li><Link href="/privacy" className="hover:text-white">Ochrana údajov</Link></li>
            <li><Link href="/terms" className="hover:text-white">Podmienky</Link></li>
            <li><Link href="/security" className="hover:text-white">Bezpečnostná politika</Link></li>
            <li><a href="/.well-known/security.txt" className="hover:text-white">security.txt</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} IMET, a.s. Všetky práva vyhradené.</p>
          <p className="flex items-center gap-2">
            <Code2 size={13} /> Postavené s Next.js & Supabase v EU
            <span aria-hidden className="mx-1">·</span>
            <Globe2 size={13} /> Hosting: Vercel Frankfurt
          </p>
        </div>
      </div>
    </footer>
  )
}
