'use client'

import { useState, useEffect, useCallback, type ComponentType } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  Car, FileText, FolderOpen, Settings, Users,
  LayoutDashboard, PlusCircle, LogOut, Wrench, ShieldCheck,
  AlertTriangle, Gauge, CarFront, ShieldAlert, CreditCard,
  Clock, Calendar, BarChart3, Plane, Archive, Bell, Monitor,
  Menu, X, HelpCircle,
} from 'lucide-react'
import { logout } from '@/actions/auth'
import ThemeToggle from '@/components/ThemeToggle'
import type { Profile, ModulId } from '@/lib/types'

interface Props {
  profile: Profile
  moduly: { modul: string; pristup: string }[]
  notifCount?: number
}

type LucideIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>

export default function Sidebar({ profile, moduly, notifCount = 0 }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isItAdmin = profile.role === 'it_admin'
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Body scroll lock on mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  function hasAccess(modul: ModulId): boolean {
    if (isItAdmin) return true
    return moduly.some(m => m.modul === modul)
  }
  function canEdit(modul: ModulId): boolean {
    if (isItAdmin) return true
    return moduly.some(m => m.modul === modul && (m.pristup === 'edit' || m.pristup === 'admin'))
  }

  // Active detection — exact match by default; with ?stav=foo musí matchnúť aj query
  const isLinkActive = (href: string, opts: { exact?: boolean } = {}) => {
    const [hrefPath, hrefQuery] = href.split('?')
    if (hrefQuery) {
      if (pathname !== hrefPath) return false
      const linkParams = new URLSearchParams(hrefQuery)
      for (const [k, v] of linkParams) {
        if (searchParams.get(k) !== v) return false
      }
      return true
    }
    if (opts.exact) {
      return pathname === hrefPath && !searchParams.get('stav') && !searchParams.get('overdue')
    }
    return pathname === hrefPath || (hrefPath !== '/' && pathname.startsWith(hrefPath + '/'))
  }

  /* ─── NavItem — reusable, modern Linear/Vercel-style ─── */
  function NavItem({
    href, icon: Icon, label, exact, external, badge,
  }: {
    href: string
    icon: LucideIcon
    label: string
    exact?: boolean
    external?: boolean
    badge?: number
  }) {
    const active = isLinkActive(href, { exact })
    const cls = `group relative flex items-center gap-3 mx-2 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150
      ${active
        ? 'text-white bg-white/[0.05]'
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.025]'}`
    const content = (
      <>
        {/* Active left bar (3px wide teal, subtle glow) */}
        <span
          aria-hidden
          className={`absolute -left-[10px] top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-teal-400 transition-opacity duration-200
            ${active ? 'opacity-100 shadow-[0_0_10px_rgba(45,212,191,0.6)]' : 'opacity-0'}`}
        />
        <Icon
          size={17}
          strokeWidth={1.75}
          className={`shrink-0 transition-colors duration-150 ${active ? 'text-teal-300' : 'text-slate-500 group-hover:text-slate-300'}`}
        />
        <span className="truncate">{label}</span>
        {typeof badge === 'number' && badge > 0 && (
          <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-semibold border border-teal-500/30">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </>
    )
    return external ? (
      <a href={href} target="_blank" rel="noopener" className={cls}>{content}</a>
    ) : (
      <Link href={href} className={cls}>{content}</Link>
    )
  }

  function SectionLabel({ label }: { label: string }) {
    return (
      <div className="mx-3 mt-5 mb-1.5 first:mt-2">
        <p className="text-[10px] font-semibold text-slate-500/70 uppercase tracking-[0.18em]">
          {label}
        </p>
      </div>
    )
  }

  const sidebarContent = (
    <>
      {/* Header — logo + notification + close (mobile) */}
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-white rounded-lg p-1.5 shadow-md shadow-black/40 transition-transform group-hover:scale-105">
              <Image src="/imet-logo.png" alt="IMET" width={24} height={24} priority />
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-[15px] font-semibold tracking-tight leading-none">IMET</h1>
              <p className="text-slate-500 text-[10px] font-medium leading-none mt-1.5 uppercase tracking-wider">Interný systém</p>
            </div>
          </Link>
          <div className="flex items-center gap-0.5">
            <Link
              href="/notifikacie"
              aria-label={`Notifikácie${notifCount > 0 ? ` (${notifCount} neprečítaných)` : ''}`}
              className="relative p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
            >
              <Bell size={16} strokeWidth={1.75} />
              {notifCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={closeMobile}
              className="md:hidden p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
              aria-label="Zavrieť menu"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {/* ─── KNIHA JÁZD ─── */}
        {hasAccess('jazdy') && (
          <>
            <SectionLabel label="Kniha jázd" />
            {canEdit('jazdy') ? (
              <NavItem href="/admin/jazdy" icon={FileText} label="Prijaté jazdy" />
            ) : (
              <>
                <NavItem href="/moje" icon={LayoutDashboard} label="Prehľad" />
                <NavItem href="/nova-jazda" icon={PlusCircle} label="Nová jazda" />
                <NavItem href="/moje-jazdy" icon={FolderOpen} label="Moje jazdy" />
              </>
            )}
          </>
        )}

        {/* ─── VOZOVÝ PARK ─── */}
        {hasAccess('vozovy_park') && (
          <>
            <SectionLabel label="Vozový park" />
            {canEdit('vozovy_park') ? (
              <>
                <NavItem href="/fleet" icon={Gauge} label="Dashboard" exact />
                <NavItem href="/fleet/vozidla" icon={CarFront} label="Vozidlá" />
                <NavItem href="/fleet/servisy" icon={Wrench} label="Servisy a opravy" />
                <NavItem href="/fleet/kontroly" icon={ShieldCheck} label="Kontroly" />
                <NavItem href="/fleet/hlasenia" icon={AlertTriangle} label="Hlásenia" />
                <NavItem href="/fleet/tankove-karty" icon={CreditCard} label="Tankové karty" />
                <NavItem href="/fleet/reporty" icon={BarChart3} label="Reporty" />
              </>
            ) : (
              <>
                <NavItem href="/moje-vozidlo" icon={CarFront} label="Moje vozidlo" />
                <NavItem href="/nahlasit-problem" icon={AlertTriangle} label="Nahlásiť problém" />
                <NavItem href="/nahlasit-udalost" icon={ShieldAlert} label="Poistná udalosť" />
              </>
            )}
          </>
        )}

        {/* ─── ZAMESTNANECKÁ KARTA ─── */}
        {hasAccess('zamestnanecka_karta') && (
          <>
            <SectionLabel label="Zamestnanecká karta" />
            <NavItem href="/moja-karta" icon={CreditCard} label="Moja karta" />
          </>
        )}

        {/* ─── DOCHÁDZKA ─── */}
        {(hasAccess('dochadzka') || hasAccess('dovolenky')) && (
          <>
            <SectionLabel label="Dochádzka" />
            {canEdit('dochadzka') ? (
              <>
                <NavItem href="/admin/dochadzka" icon={Clock} label="Prehľad dochádzky" exact />
                <NavItem href="/admin/dochadzka/uzavierka" icon={FileText} label="Mesačná uzávierka" />
                <NavItem href="/admin/dochadzka/ziadosti" icon={AlertTriangle} label="Žiadosti o korekciu" />
                <NavItem href="/admin/dovolenky" icon={Calendar} label="Schvaľovanie dovoleniek" />
                <NavItem href="/admin/dochadzka/reporty" icon={BarChart3} label="Reporty" />
                <NavItem href="/admin/dochadzka/statistiky" icon={BarChart3} label="Štatistiky" />
                <NavItem href="/admin/dochadzka/import" icon={FileText} label="Bulk import" />
                <NavItem href="/dochadzka?smer=prichod&demo=1" icon={Monitor} label="Tablet preview" external />
              </>
            ) : (
              <>
                <NavItem href="/dochadzka-prehled" icon={Clock} label="Moja dochádzka" />
                {hasAccess('dovolenky') && <NavItem href="/dovolenka" icon={Calendar} label="Moja dovolenka" />}
              </>
            )}
          </>
        )}

        {/* ─── SLUŽOBNÉ CESTY ─── */}
        {hasAccess('sluzobne_cesty') && (
          <>
            <SectionLabel label="Služobné cesty" />
            {canEdit('sluzobne_cesty') ? (
              <NavItem href="/admin/sluzobne-cesty" icon={Plane} label="Prehľad ciest" />
            ) : (
              <NavItem href="/sluzobna-cesta" icon={Plane} label="Moje cesty" />
            )}
          </>
        )}

        {/* ─── FAKTÚRY ─── */}
        {hasAccess('archiv') && (
          <>
            <SectionLabel label="Faktúry" />
            <NavItem href="/admin/faktury" icon={FileText} label="Všetky faktúry" exact />
            <NavItem href="/admin/faktury?stav=caka_na_schvalenie" icon={Clock} label="Čakajú na schválenie" />
            <NavItem href="/admin/faktury?overdue=1" icon={AlertTriangle} label="Po splatnosti" />
            <NavItem href="/admin/faktury/nahrat" icon={PlusCircle} label="Nahrať faktúru" />
            <NavItem href="/admin/faktury/reporty" icon={BarChart3} label="Cashflow + reporty" />
            <NavItem href="/admin/faktury/dodavatelia" icon={Users} label="Dodávatelia" />
          </>
        )}

        {/* ─── ARCHÍV ─── */}
        {hasAccess('archiv') && (
          <>
            <SectionLabel label="Archív dokumentov" />
            <NavItem href="/admin/archiv" icon={Archive} label="Dokumenty" />
          </>
        )}

        {/* ─── ADMINISTRÁCIA ─── */}
        {(hasAccess('admin_zamestnanci') || hasAccess('admin_nastavenia')) && (
          <>
            <SectionLabel label="Administrácia" />
            {hasAccess('admin_zamestnanci') && (
              <>
                <NavItem href="/admin/zamestnanci" icon={Users} label="Zamestnanci" />
                <NavItem href="/admin/vozidla" icon={Car} label="Vozidlá" />
              </>
            )}
            <NavItem href="/admin/reporty" icon={BarChart3} label="Reporty" />
            {hasAccess('admin_nastavenia') && (
              <NavItem href="/admin/nastavenia" icon={Settings} label="Nastavenia" />
            )}
          </>
        )}

        {/* ─── POMOC ─── */}
        {(isItAdmin || ['admin', 'fin_manager'].includes(profile.role)) && (
          <>
            <SectionLabel label="Pomoc" />
            <NavItem href="/admin/manual" icon={HelpCircle} label="Manuál systému" />
          </>
        )}
      </nav>

      {/* Footer — user + actions */}
      <div className="px-3 pt-2 pb-3 border-t border-white/[0.05]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-[12px] font-semibold shadow-md shadow-teal-500/20 shrink-0">
            {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium text-slate-100 truncate leading-tight">{profile.full_name}</p>
            <p className="text-[10.5px] text-slate-500 truncate leading-tight mt-0.5">
              {profile.pozicia || (isItAdmin ? 'IT Administrátor' : 'Zamestnanec')}
            </p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <div className="flex-1"><ThemeToggle /></div>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Odhlásiť sa"
              title="Odhlásiť sa"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <LogOut size={15} strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Otvoriť menu"
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-[#020617] text-white shadow-lg shadow-black/40 border border-white/[0.06] hover:bg-slate-900 transition-colors"
      >
        <Menu size={20} strokeWidth={1.75} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      {/* Sidebar shell */}
      <aside
        className={`
          bg-[#020617] min-h-screen flex flex-col shrink-0 border-r border-white/[0.05]
          md:w-[260px] md:relative md:translate-x-0
          fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:transition-none
        `}
      >
        {/* Subtle aurora glow at top — adds depth */}
        <div aria-hidden className="pointer-events-none absolute top-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.10),transparent_70%)] blur-3xl" />
        <div className="relative flex flex-col flex-1 min-h-0">
          {sidebarContent}
        </div>
      </aside>
    </>
  )
}
