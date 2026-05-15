import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import {
  ArrowRight, ChevronRight, Check, Bell, Mail,
  Receipt, Globe, Building2,
  Fingerprint, Activity,
  Users, UserCheck, CalendarDays,
  Truck, ShieldAlert,
  GitBranch, Search,
  Car, FileSpreadsheet, FileCheck2, LockKeyhole, Eye, KeyRound,
} from 'lucide-react'
import { createSupabaseServer } from '@/lib/supabase-server'
import { brand, mailto } from '@/lib/brand'

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: 'Elektronické schvaľovanie faktúr, dochádzka cez tablet, kniha jázd, dovolenky cez nadriadeného, vozový park so STK eskaláciami, archív dokumentov. Pre slovenské firmy.',
  openGraph: {
    title: brand.name, type: 'website', locale: 'sk_SK', siteName: brand.name,
    description: 'Elektronické schvaľovanie · Tablet kiosk · Kniha jázd · Vozový park · Archív',
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
      <SpotlightFaktury />
      <SpotlightDochadzka />
      <SpotlightHierarchia />
      <SpotlightFleet />
      <SpotlightArchiv />
      <BentoMore />
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
            <Image src={brand.logoSrc} alt={brand.name} width={26} height={26} priority />
          </div>
          <span className="font-semibold tracking-tight text-[15px]">{brand.name}</span>
        </Link>
        <Link href="/login"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-200 hover:text-white transition-colors">
          Prihlásiť sa <ArrowRight size={14} />
        </Link>
      </nav>
    </header>
  )
}

/* ───────────────────────── HERO ───────────────────────── */

function Hero() {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] rounded-full
                        bg-[radial-gradient(circle,rgba(20,184,166,0.45),transparent_60%)] blur-[100px] aurora-1" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full
                        bg-[radial-gradient(circle,rgba(139,92,246,0.35),transparent_60%)] blur-[100px] aurora-2" />
        <div className="absolute bottom-[-20%] left-[20%] w-[800px] h-[500px] rounded-full
                        bg-[radial-gradient(circle,rgba(244,114,182,0.20),transparent_60%)] blur-[120px] aurora-3" />
        <div className="absolute inset-0 opacity-[0.025]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,6,23,0.7)_100%)]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-32 text-center">
        <p className="reveal-up reveal-up-1 text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-300/80 mb-8">
          HR · Mzdy · Fleet · Archív
        </p>

        <h1 className="reveal-up reveal-up-2 font-bold tracking-[-0.04em] leading-[0.9] text-balance">
          <span className="block text-[clamp(3rem,11vw,11rem)] pb-2">Jedna aplikácia.</span>
          <span className="block text-[clamp(3rem,11vw,11rem)] pb-4 bg-gradient-to-br from-teal-200 via-white to-violet-200 bg-clip-text text-transparent">
            Celá firma.
          </span>
        </h1>

        <p className="reveal-up reveal-up-3 mt-10 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed text-balance">
          Elektronické schvaľovanie faktúr. Dochádzka cez tablet. Kniha jázd s automatickým výpočtom náhrad.
          Vozový park so STK eskaláciami. Archív dokumentov s ACL a verzionovaním.
        </p>

        <div className="reveal-up reveal-up-4 mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login"
                className="group btn-shine relative inline-flex items-center gap-2.5 bg-white text-slate-950 px-8 py-4 rounded-full text-[15px] font-semibold transition-all hover:shadow-2xl hover:shadow-white/20 hover:scale-[1.02]">
            <span className="relative z-10 flex items-center gap-2.5">
              Vstúpiť do systému
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <a href={mailto(`${brand.name} — Demo`)}
             className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
            alebo si vyžiadajte demo →
          </a>
        </div>
      </div>

      <div aria-hidden className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-30">
        <div className="w-px h-14 bg-gradient-to-b from-transparent via-white to-transparent" />
      </div>
    </section>
  )
}

/* ───────────────────────── SPOTLIGHT: FAKTÚRY ───────────────────────── */

function SpotlightFaktury() {
  return (
    <Spotlight align="left" tag="01 · Elektronické schvaľovanie" title="Faktúry s viacstupňovým workflow." copy={
      <>
        Dvojstupňové schválenie podľa limitu firmy. Multi-currency s automatickými ECB kurzami.
        Konflikt záujmov check — nemôžete schváliť vlastnú. Dobropisy, force-storno, eskalácia po splatnosti.
        IBAN šifrovaný at-rest cez Supabase Vault.
      </>
    } bullets={[
      '5 stavov: rozpracovaná → čaká → schválená → na úhradu → uhradená',
      'Per-firma workflow config (limit, schvaľovateľ L1/L2, uhrádzateľ)',
      'Eskalácie 3 / 7 / 14 / 30 dní po splatnosti — automatické notif',
      'Audit log immutable per faktúra (kto, kedy, IP, user-agent)',
    ]}>
      <FakturaWorkflowVisual />
    </Spotlight>
  )
}

function FakturaWorkflowVisual() {
  const steps = [
    { label: 'Rozpracovaná', color: 'slate' },
    { label: 'Čaká L1', color: 'amber' },
    { label: 'Čaká L2', color: 'amber' },
    { label: 'Schválená', color: 'teal' },
    { label: 'Uhradená', color: 'violet' },
  ]
  const colors: Record<string, string> = {
    slate: 'bg-slate-700/40 text-slate-300 border-slate-600/30',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    teal:  'bg-teal-500/10 text-teal-300 border-teal-500/30',
    violet: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  }
  return (
    <div className="relative">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-6 space-y-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">F-2026/00342</span>
          <span className="px-2 py-1 rounded bg-violet-500/10 text-violet-300 border border-violet-500/30 font-mono">
            <Globe className="inline mr-1" size={11} /> USD → EUR · ECB 1.0892
          </span>
        </div>
        <div>
          <div className="text-sm text-slate-400 mb-1">Suma celkom</div>
          <div className="text-3xl font-bold tracking-tight">12 847,50 €</div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {steps.map((s, i) => (
            <span key={i} className="contents">
              <span className={`px-3 py-1.5 rounded-full text-[11px] font-medium border ${colors[s.color]}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <ChevronRight size={12} className="text-slate-600" />}
            </span>
          ))}
        </div>
        <div className="pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <div className="text-slate-500">Schvaľoval L1</div>
            <div className="text-slate-300 mt-0.5">M. Mažárová · 13:42</div>
          </div>
          <div>
            <div className="text-slate-500">Schvaľoval L2</div>
            <div className="text-slate-300 mt-0.5">M. Maťas · 14:11</div>
          </div>
        </div>
      </div>
      <div aria-hidden className="absolute -inset-4 -z-10 bg-gradient-to-br from-teal-500/10 via-transparent to-violet-500/10 blur-2xl rounded-3xl" />
    </div>
  )
}

/* ───────────────────────── SPOTLIGHT: DOCHÁDZKA ───────────────────────── */

function SpotlightDochadzka() {
  return (
    <Spotlight align="right" tag="02 · Tablet kiosk" title="Dochádzka cez PIN alebo RFID." copy={
      <>
        Tablet pri vchode. Zamestnanec priloží kartu alebo zadá PIN, vyberie dôvod (práca, obed, lekár,
        cesta) a pípne. Server overí jednorazový token — žiadne falšovanie cudzej dochádzky.
        Anomálie sa detegujú automaticky, korekcie cez mzdárku s povinným dôvodom.
      </>
    } bullets={[
      'Anti-fraud: single-use 10-min token (PIN/RFID nedôveruje klientovi)',
      'Rate-limit 5 pokusov / 5 min per IP cez Upstash Redis',
      'Auto-doplnenie odchodu o 00:30 ak zamestnanec zabudol',
      'Mzdové podklady pre PROLIM / Cézar / Magma — XLSX export',
    ]}>
      <TabletKioskVisual />
    </Spotlight>
  )
}

function TabletKioskVisual() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-5">
          <span>DOCHÁDZKA · TABLET</span>
          <span>{'08:34:22'}</span>
        </div>
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30">
          <div className="w-10 h-10 rounded-full bg-teal-500/30 flex items-center justify-center">
            <Fingerprint size={18} className="text-teal-200" />
          </div>
          <div>
            <div className="font-semibold text-sm">Ján Novák</div>
            <div className="text-[11px] text-teal-300/80 flex items-center gap-1">
              <Check size={11} /> Identifikovaný · token vygenerovaný
            </div>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mb-2">Dôvod príchodu</div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {['Práca', 'Obed', 'Lekár', 'Cesta', 'Súkromne', 'Prechod'].map((d, i) => (
            <button key={d} className={`py-2.5 rounded-lg border text-center ${i === 0 ? 'border-teal-400/40 bg-teal-500/10 text-teal-200' : 'border-white/[0.06] bg-white/[0.02] text-slate-300'}`}>
              {d}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 text-[11px] text-amber-300/80">
          <Activity size={12} /> Anomália: dlhý blok 9h+ — bude označený
        </div>
      </div>
      <div aria-hidden className="absolute -inset-4 -z-10 bg-gradient-to-br from-violet-500/10 via-transparent to-teal-500/10 blur-2xl rounded-3xl" />
    </div>
  )
}

/* ───────────────────────── SPOTLIGHT: HIERARCHIA ───────────────────────── */

function SpotlightHierarchia() {
  return (
    <Spotlight align="left" tag="03 · Cez nadriadeného" title="Schvaľovanie s automatickým zastupovaním." copy={
      <>
        Žiadosti o dovolenku a služobnú cestu idú priamemu nadriadenému podľa hierarchie.
        Ak je manažér na schválenej dovolenke práve dnes, systém automaticky predá schválenie
        zástupcovi (zastupuje_id). Pri schválení vznikajú záznamy v dochádzke.
      </>
    } bullets={[
      'Hierarchia nadriadeny_id s detekciou cyklov',
      'Pol-dňová dovolenka (dopoludnie / popoludnie)',
      'OČR, PN, sick leave, náhradné voľno, neplatené voľno',
      'Auto-flow do dochádzky pri schválení (insert per deň)',
    ]}>
      <HierarchyVisual />
    </Spotlight>
  )
}

function HierarchyVisual() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-6">
        <div className="space-y-3">
          {/* Žiadateľ */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/20 border border-slate-600/30">
            <Users size={16} className="text-slate-400" />
            <div className="flex-1">
              <div className="text-sm font-medium">J. Novák · žiadosť o dovolenku</div>
              <div className="text-[11px] text-slate-500">17. — 21. máj 2026 (5 dní)</div>
            </div>
            <CalendarDays size={14} className="text-slate-500" />
          </div>

          <div className="flex justify-center">
            <ChevronRight size={14} className="text-slate-600 rotate-90" />
          </div>

          {/* Nadriadený (on leave) */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 relative">
            <UserCheck size={16} className="text-amber-300/60" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-400 line-through">M. Šimkovič</div>
              <div className="text-[11px] text-amber-300/80">na dovolenke do 19. mája — predáva ďalej</div>
            </div>
          </div>

          <div className="flex justify-center">
            <ChevronRight size={14} className="text-slate-600 rotate-90" />
          </div>

          {/* Zástupca (auto-resolved) */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30">
            <UserCheck size={16} className="text-teal-300" />
            <div className="flex-1">
              <div className="text-sm font-medium">M. Maťas <span className="text-[10px] text-teal-300/80 font-normal ml-1">· zastupuje</span></div>
              <div className="text-[11px] text-teal-300 flex items-center gap-1">
                <Check size={11} /> Schválené · 5× záznam v dochádzke vytvorený
              </div>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden className="absolute -inset-4 -z-10 bg-gradient-to-br from-amber-500/10 via-transparent to-teal-500/10 blur-2xl rounded-3xl" />
    </div>
  )
}

/* ───────────────────────── SPOTLIGHT: FLEET ───────────────────────── */

function SpotlightFleet() {
  return (
    <Spotlight align="right" tag="04 · Vozový park" title="Eskalácie kontrol 30 / 14 / 7 dní vopred." copy={
      <>
        STK, EK, PZP, havarijné poistenie, leasing — všetko s plánovaním a eskalačnými notifikáciami.
        Servisy s ďalším termínom (km + dátum), poistné udalosti s rozpočtom plnenia,
        M:N vodiči, tachometer záznamy, hlásenia porúch.
      </>
    } bullets={[
      'STK / EK / PZP / havarijné — 4 typy kontrol s expiráciami',
      'Auto-notif 30 / 14 / 7 dní pre fleet managera + priradených vodičov',
      'Tankovacie karty na vozidlo ALEBO na vodiča (DB constraint)',
      'Hlásenia porúch s prioritou (norm / vysoká / kritická)',
    ]}>
      <FleetEscalationVisual />
    </Spotlight>
  )
}

function FleetEscalationVisual() {
  const items = [
    { typ: 'STK', spz: 'BA-123XY', vehicle: 'Toyota Corolla', days: 30, color: 'amber' },
    { typ: 'PZP', spz: 'BA-447KK', vehicle: 'VW Passat',      days: 14, color: 'orange' },
    { typ: 'EK',  spz: 'BA-829HJ', vehicle: 'Škoda Octavia',  days: 7,  color: 'red' },
  ]
  const colors: Record<string, string> = {
    amber: 'border-amber-500/30 bg-amber-500/5',
    orange: 'border-orange-500/40 bg-orange-500/10',
    red: 'border-red-500/50 bg-red-500/10',
  }
  const badge: Record<string, string> = {
    amber: 'bg-amber-500/15 text-amber-300',
    orange: 'bg-orange-500/15 text-orange-300',
    red: 'bg-red-500/20 text-red-300',
  }
  return (
    <div className="relative">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-6">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-4">
          <span>VOZIDLO_KONTROLY · BLÍŽIACE SA</span>
          <ShieldAlert size={12} className="text-amber-300" />
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${colors[it.color]}`}>
              <Truck size={16} className={badge[it.color].split(' ')[1]} />
              <div className="flex-1">
                <div className="text-sm font-medium">{it.typ} · <span className="font-mono">{it.spz}</span></div>
                <div className="text-[11px] text-slate-400">{it.vehicle}</div>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${badge[it.color]}`}>
                {it.days} dní
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-slate-400">
          <Bell size={12} /> Email + in-app notif fleet_managerovi a priradeným vodičom
        </div>
      </div>
      <div aria-hidden className="absolute -inset-4 -z-10 bg-gradient-to-br from-red-500/10 via-transparent to-amber-500/10 blur-2xl rounded-3xl" />
    </div>
  )
}

/* ───────────────────────── SPOTLIGHT: ARCHÍV ───────────────────────── */

function SpotlightArchiv() {
  return (
    <Spotlight align="left" tag="05 · Archív dokumentov" title="Verzionované zmluvy, certifikáty, doklady." copy={
      <>
        Centrálny archív s kategóriami a ACL — Zmluvy, Faktúry, BOZP, Vodičské, GDPR.
        Každý dokument má verzie (povodny_dokument_id chain), platnosť do (s expirácia
        notifikáciami), schvaľovací workflow a integráciu s faktúrami/zamestnancami/vozidlami.
      </>
    } bullets={[
      'Verzionovanie — chain v1 → v2 → v3 s linkom na predchodcu',
      'Per-kategória ACL (Zmluvy = fin_manager + admin, BOZP = všetci)',
      'Fulltext search v názvoch a metadátach + filter podľa typu',
      'Expirácie 30 dní vopred — list na dashboarde + email',
    ]}>
      <ArchivVersionsVisual />
    </Spotlight>
  )
}

function ArchivVersionsVisual() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] text-slate-500 font-mono mb-1">DOKUMENTY_ARCHIV</div>
            <div className="text-sm font-semibold">Pracovná zmluva · J. Novák</div>
          </div>
          <span className="px-2 py-1 rounded bg-violet-500/10 text-violet-300 text-[10px] font-mono border border-violet-500/30">
            Zmluvy
          </span>
        </div>

        <div className="space-y-2">
          {[
            { v: 'v1', date: '12. 03. 2024', status: 'archivovaný', muted: true },
            { v: 'v2', date: '01. 09. 2025', status: 'archivovaný', muted: true },
            { v: 'v3', date: '15. 04. 2026', status: 'platný', muted: false, expires: '15. 04. 2028' },
          ].map((doc) => (
            <div key={doc.v} className={`flex items-center gap-3 p-2.5 rounded-lg border ${doc.muted ? 'border-white/[0.04] bg-white/[0.01] opacity-50' : 'border-teal-500/30 bg-teal-500/5'}`}>
              <GitBranch size={14} className={doc.muted ? 'text-slate-500' : 'text-teal-300'} />
              <div className="flex-1">
                <div className="text-[12px] font-mono">{doc.v} · {doc.date}</div>
                {doc.expires && <div className="text-[10px] text-slate-400">platnosť do {doc.expires}</div>}
              </div>
              <span className={`text-[10px] ${doc.muted ? 'text-slate-500' : 'text-teal-300'}`}>{doc.status}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-slate-400">
          <Search size={12} /> Fulltext · kategórie · expirácie
        </div>
      </div>
      <div aria-hidden className="absolute -inset-4 -z-10 bg-gradient-to-br from-violet-500/10 via-transparent to-teal-500/10 blur-2xl rounded-3xl" />
    </div>
  )
}

/* ───────────────────────── BENTO MORE ───────────────────────── */

function BentoMore() {
  const cards = [
    {
      icon: Car, tag: 'Kniha jázd',
      title: 'Mesačné výúčtovanie',
      desc: 'Automatický výpočet náhrad podľa § 7 zákona 283/2002. Spotreba podľa TP, palivo podľa nákupu, kilometre, PHM. PDF aj XLSX export.',
    },
    {
      icon: FileSpreadsheet, tag: 'Mzdové podklady',
      title: 'PROLIM · Cézar · Magma',
      desc: 'XLSX export hodín, dovoleniek, PN, OČR, sviatkov, nadčasov za mesiac per zamestnanec. Formula-injection safe.',
    },
    {
      icon: Building2, tag: 'Multi-firma',
      title: '7 firiem · scope all the way down',
      desc: 'Per-firma cache keys, per-firma RLS, per-firma workflow config. Admin firmy A fyzicky nevidí dáta firmy B.',
    },
    {
      icon: FileCheck2, tag: 'GDPR',
      title: 'Čl. 15 + 17 endpointy',
      desc: 'GET /api/gdpr/export/[userId] vracia ZIP s kompletnými dátami. POST /api/gdpr/delete anonymizuje cez DB SECURITY DEFINER fn.',
    },
    {
      icon: LockKeyhole, tag: 'IBAN encrypted',
      title: 'AES-256 at-rest',
      desc: 'pgcrypto + Supabase Vault. Decrypt iba pre fin_manager / admin / it_admin cez RLS-gated views. Plaintext nikdy neopustí DB.',
    },
    {
      icon: Eye, tag: 'Audit log',
      title: 'Immutable na úrovni triggera',
      desc: 'BEFORE UPDATE / DELETE trigger blokuje aj service_role. IP + user-agent na každom zázname. Retencia 7 rokov.',
    },
    {
      icon: KeyRound, tag: '2FA TOTP',
      title: 'Povinné pre admin role',
      desc: 'Google Authenticator / Authy / 1Password. Enroll cez /profil/mfa, recovery cez IT admina. Backed by Supabase Auth.',
    },
    {
      icon: Receipt, tag: 'Cashflow',
      title: 'Predikcia úhrad',
      desc: 'Forecast podľa splatnosti faktúr za nasledujúce mesiace. Per-firma scope. Auto-update pri zmene statusu faktúry.',
    },
  ]

  return (
    <section className="relative py-32">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.015] to-transparent" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-14">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-300/80 mb-4">
            06 · A ďalej
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[0.95]">
            Pre tých čo si pýtajú detaily.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((c, i) => {
            const Icon = c.icon
            return (
              <div key={i} className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 hover:border-teal-400/30 hover:bg-white/[0.04] transition-all duration-300">
                <Icon size={20} strokeWidth={1.5} className="text-teal-300/80 mb-4 transition-transform group-hover:scale-110" />
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">{c.tag}</div>
                <h3 className="text-base font-semibold tracking-tight mb-1.5">{c.title}</h3>
                <p className="text-[12px] text-slate-400 leading-relaxed">{c.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── SHARED SPOTLIGHT WRAPPER ───────────────────────── */

function Spotlight({
  align, tag, title, copy, bullets, children,
}: {
  align: 'left' | 'right'
  tag: string
  title: string
  copy: React.ReactNode
  bullets: string[]
  children: React.ReactNode  // visual
}) {
  return (
    <section className="relative py-24 md:py-32">
      <div className="relative max-w-6xl mx-auto px-6">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center ${align === 'right' ? 'lg:[&>*:first-child]:order-2' : ''}`}>
          {/* Text */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-300/80 mb-4">{tag}</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[0.95]">{title}</h2>
            <p className="mt-6 text-base md:text-lg text-slate-400 leading-relaxed">{copy}</p>
            <ul className="mt-6 space-y-2.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-slate-300">
                  <Check size={16} className="text-teal-400 mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Visual */}
          <div>{children}</div>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── SECURITY STAT ───────────────────────── */

function SecurityStat() {
  const principles = [
    {
      icon: Building2,
      title: 'Tenant izolácia',
      desc: 'RLS politiky na DB úrovni. Per-firma cache keys. requireScopedAdmin guards v každej admin akcii. Admin firmy A fyzicky nevidí dáta firmy B.',
    },
    {
      icon: Eye,
      title: 'Immutable forensics',
      desc: 'BEFORE UPDATE/DELETE trigger na audit_log blokuje aj service_role. IP + user-agent pri každom zázname. 7-ročná retencia podľa SR zákonov.',
    },
    {
      icon: LockKeyhole,
      title: 'Encryption at-rest',
      desc: 'IBAN cez pgcrypto + Supabase Vault (AES-256). Decrypt-on-read view s RLS gating — len fin_manager / admin / it_admin uvidia plaintext.',
    },
    {
      icon: FileCheck2,
      title: 'GDPR native, nie bolt-on',
      desc: 'Endpointy /api/gdpr/export (čl. 15 → ZIP) a /api/gdpr/delete (čl. 17 → SECURITY DEFINER anonymize). Retention politika v retention_policies tabuľke.',
    },
  ]
  const chips = ['Sentry PII scrub', 'Rate limit (Upstash)', 'CSP + HSTS', 'CI npm audit + gitleaks', 'Externý pentest ready', '2FA TOTP', 'Soft-delete + grace']

  return (
    <section className="relative py-32 md:py-44 overflow-hidden border-t border-white/[0.06]">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full
                        bg-[radial-gradient(circle,rgba(20,184,166,0.10),transparent_60%)] blur-3xl aurora-3" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        {/* HEADER */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-300/80 mb-6">
            07 · Bezpečnosť
          </p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-[-0.04em] leading-[0.95]">
            Audit-grade.{' '}
            <span className="bg-gradient-to-br from-slate-500 to-slate-700 bg-clip-text text-transparent">
              By default.
            </span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-slate-400 leading-relaxed">
            6-agentový paralelný bezpečnostný audit identifikoval{' '}
            <span className="text-white font-semibold">13 critical + 10 medium</span> findings.
            Všetkých <span className="text-teal-300 font-semibold">23 je vyriešených</span> ešte
            pred prvým enterprise nasadením — verifikovateľné cez commit history v repo.
          </p>
        </div>

        {/* GIANT STAT (leading-none + explicit pb to prevent descender clip) */}
        <div className="text-center mt-20">
          <span className="block font-bold tracking-[-0.05em] leading-none pb-6
                            text-[clamp(5rem,17vw,14rem)]
                            bg-gradient-to-br from-white via-teal-200 to-violet-300
                            bg-clip-text text-transparent">
            13 / 13
          </span>
          <p className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-slate-200">
            critical findings vyriešených.{' '}
            <span className="text-slate-500 font-normal">0 zostáva otvorených.</span>
          </p>
        </div>

        {/* PRINCIPLES (left) + AUDIT LOG MOCK (right) */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="space-y-7">
            {principles.map((p) => {
              const Icon = p.icon
              return (
                <div key={p.title} className="flex gap-4">
                  <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                    <Icon size={17} className="text-teal-300" strokeWidth={1.6} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold tracking-tight text-white">{p.title}</h3>
                    <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <AuditLogVisual />
        </div>

        {/* BOTTOM: chips + CTAs */}
        <div className="mt-20 pt-10 border-t border-white/[0.06] flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {chips.map(c => (
              <span key={c} className="px-3 py-1.5 rounded-full text-[11px] font-medium border border-white/10 bg-white/[0.03] text-slate-300">
                {c}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/security" className="inline-flex items-center gap-1.5 text-sm text-teal-300 hover:text-white transition-colors whitespace-nowrap">
              Security policy <ArrowRight size={14} />
            </Link>
            <span aria-hidden className="text-slate-700">·</span>
            <a href="/.well-known/security.txt" className="text-sm text-slate-400 hover:text-white transition-colors whitespace-nowrap">
              security.txt
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function AuditLogVisual() {
  const rows = [
    { time: '14:34:22', user: 'MM', userColor: 'teal',   akcia: 'faktura_approve',  ip: '10.0.42.118' },
    { time: '14:31:05', user: 'MM', userColor: 'teal',   akcia: 'gdpr_export',      ip: '10.0.42.118' },
    { time: '14:28:51', user: 'MŠ', userColor: 'violet', akcia: 'dochadzka_korek',  ip: '87.244.198.x' },
    { time: '14:11:30', user: 'IT', userColor: 'amber',  akcia: 'zmena_roly',       ip: '10.0.42.118' },
    { time: '13:58:17', user: 'MM', userColor: 'teal',   akcia: 'faktura_paid',     ip: '10.0.42.118' },
  ]
  const userColors: Record<string, string> = {
    teal: 'bg-teal-500/10 border-teal-500/30 text-teal-200',
    violet: 'bg-violet-500/10 border-violet-500/30 text-violet-200',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
  }
  return (
    <div className="relative">
      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            audit_log
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 font-mono tracking-[0.15em]">
            IMMUTABLE
          </span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-[11px] font-mono">
              <span className="text-slate-500 w-[58px] shrink-0">{r.time}</span>
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[9px] shrink-0 ${userColors[r.userColor]}`}>
                {r.user}
              </span>
              <span className="text-teal-300/80 flex-1 truncate min-w-0">{r.akcia}</span>
              <span className="text-slate-500 text-[10px] truncate shrink-0 hidden sm:inline w-[96px] text-right">{r.ip}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.01] flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed">
          <ShieldAlert size={11} className="text-teal-400 shrink-0 mt-0.5" />
          <span>BEFORE UPDATE/DELETE trigger blokuje aj <code className="text-slate-400">service_role</code> · IP + user_agent capture · 7-year retention</span>
        </div>
      </div>
      <div aria-hidden className="absolute -inset-4 -z-10 bg-gradient-to-br from-teal-500/10 via-transparent to-violet-500/10 blur-2xl rounded-3xl" />
    </div>
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
          <h2 className="text-5xl md:text-7xl font-bold tracking-[-0.04em] leading-[0.92] pb-2">
            <span className="block">Začnime.</span>
          </h2>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-xl mx-auto">
            Cloud SaaS pre menšie firmy. On-premise deployment do vlastnej Vercel + Supabase pre korporát.
            <br className="hidden sm:block" />
            Ponuka šitá na vašu firmu do 24 hodín.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={mailto(`${brand.name} — záujem o ponuku`)}
               className="group btn-shine inline-flex items-center gap-2 bg-white text-slate-950 px-7 py-3.5 rounded-full text-sm font-semibold transition-all hover:shadow-2xl hover:shadow-white/20 hover:scale-[1.02]">
              <span className="relative z-10 flex items-center gap-2">
                <Mail size={14} />
                {brand.supportEmail}
              </span>
            </a>
            <Link href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
              alebo sa prihlásiť <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-6 max-w-xl mx-auto text-center text-xs text-slate-500">
            <div>
              <p className="text-2xl font-bold text-white">~24h</p>
              <p className="mt-1">odpoveď</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">~1 deň</p>
              <p className="mt-1">on-prem setup</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">99,5%</p>
              <p className="mt-1">cieľová SLA</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-md p-1"><Image src={brand.logoSrc} alt={brand.name} width={18} height={18} /></div>
            <span>© {new Date().getFullYear()} {brand.vendor}</span>
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
