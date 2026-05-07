'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  Car, FileText, FolderOpen, Settings, Users,
  LayoutDashboard, PlusCircle, LogOut, Wrench, ShieldCheck,
  AlertTriangle, Gauge, CarFront, ShieldAlert, CreditCard,
  Clock, Calendar, BarChart3, Plane, Archive, Bell, Monitor,
  Menu, X, HelpCircle
} from 'lucide-react'
import { logout } from '@/actions/auth'
import ThemeToggle from '@/components/ThemeToggle'
import type { Profile, ModulId } from '@/lib/types'

interface Props {
  profile: Profile
  moduly: { modul: string; pristup: string }[]
  notifCount?: number
}

export default function Sidebar({ profile, moduly, notifCount = 0 }: Props) {
  const pathname = usePathname()
  const isItAdmin = profile.role === 'it_admin'
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // Check if user has access to a module
  function hasAccess(modul: ModulId): boolean {
    if (isItAdmin) return true
    return moduly.some(m => m.modul === modul)
  }

  function canEdit(modul: ModulId): boolean {
    if (isItAdmin) return true
    return moduly.some(m => m.modul === modul && (m.pristup === 'edit' || m.pristup === 'admin'))
  }

  const linkClass = (href: string) => {
    const isActive = pathname === href || (href !== '/' && (pathname.startsWith(href + '/') || pathname.startsWith(href + '?')))
    return `group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-white/15 text-white shadow-lg shadow-white/5 backdrop-blur-sm'
        : 'text-slate-400 hover:text-white hover:bg-white/8'
    }`
  }

  const iconClass = (href: string) => {
    const isActive = pathname === href || (href !== '/' && (pathname.startsWith(href + '/') || pathname.startsWith(href + '?')))
    return `transition-all duration-200 ${isActive ? 'text-teal-300' : 'text-slate-500 group-hover:text-slate-300'}`
  }

  const sectionLabel = (label: string) => (
    <p className="px-4 pt-5 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em]">{label}</p>
  )

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl p-2 shadow-md">
              <Image src="/imet-logo.png" alt="IMET" width={28} height={28} />
            </div>
            <div>
              <h1 className="text-white text-lg font-bold tracking-tight">IMET</h1>
              <p className="text-slate-500 text-[11px] font-medium">Interný systém</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Notification bell */}
            <Link href="/notifikacie" className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/8">
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </Link>
            {/* Close button - mobile only */}
            <button
              type="button"
              onClick={closeMobile}
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/8"
              aria-label="Zavrieť menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">

        {/* ═══ KNIHA JÁZD ═══ */}
        {hasAccess('jazdy') && (
          <>
            {sectionLabel('Kniha jázd')}
            {canEdit('jazdy') ? (
              <Link href="/admin/jazdy" className={linkClass('/admin/jazdy')}>
                <FileText size={19} className={iconClass('/admin/jazdy')} /> Prijaté jazdy
              </Link>
            ) : (
              <>
                <Link href="/" className={linkClass('/')}>
                  <LayoutDashboard size={19} className={iconClass('/')} /> Prehľad
                </Link>
                <Link href="/nova-jazda" className={linkClass('/nova-jazda')}>
                  <PlusCircle size={19} className={iconClass('/nova-jazda')} /> Nová jazda
                </Link>
                <Link href="/moje-jazdy" className={linkClass('/moje-jazdy')}>
                  <FolderOpen size={19} className={iconClass('/moje-jazdy')} /> Moje jazdy
                </Link>
              </>
            )}
          </>
        )}

        {/* ═══ VOZOVÝ PARK ═══ */}
        {hasAccess('vozovy_park') && (
          <>
            {sectionLabel('Vozový park')}
            {canEdit('vozovy_park') ? (
              <>
                <Link href="/fleet" className={linkClass('/fleet')}>
                  <Gauge size={19} className={iconClass('/fleet')} /> Dashboard
                </Link>
                <Link href="/fleet/vozidla" className={linkClass('/fleet/vozidla')}>
                  <CarFront size={19} className={iconClass('/fleet/vozidla')} /> Vozidlá
                </Link>
                <Link href="/fleet/servisy" className={linkClass('/fleet/servisy')}>
                  <Wrench size={19} className={iconClass('/fleet/servisy')} /> Servisy a opravy
                </Link>
                <Link href="/fleet/kontroly" className={linkClass('/fleet/kontroly')}>
                  <ShieldCheck size={19} className={iconClass('/fleet/kontroly')} /> Kontroly
                </Link>
                <Link href="/fleet/hlasenia" className={linkClass('/fleet/hlasenia')}>
                  <AlertTriangle size={19} className={iconClass('/fleet/hlasenia')} /> Hlásenia
                </Link>
                <Link href="/fleet/tankove-karty" className={linkClass('/fleet/tankove-karty')}>
                  <CreditCard size={19} className={iconClass('/fleet/tankove-karty')} /> Tankové karty
                </Link>
                <Link href="/fleet/reporty" className={linkClass('/fleet/reporty')}>
                  <BarChart3 size={19} className={iconClass('/fleet/reporty')} /> Reporty
                </Link>
              </>
            ) : (
              <>
                <Link href="/moje-vozidlo" className={linkClass('/moje-vozidlo')}>
                  <CarFront size={19} className={iconClass('/moje-vozidlo')} /> Moje vozidlo
                </Link>
                <Link href="/nahlasit-problem" className={linkClass('/nahlasit-problem')}>
                  <AlertTriangle size={19} className={iconClass('/nahlasit-problem')} /> Nahlásiť problém
                </Link>
                <Link href="/nahlasit-udalost" className={linkClass('/nahlasit-udalost')}>
                  <ShieldAlert size={19} className={iconClass('/nahlasit-udalost')} /> Poistná udalosť
                </Link>
              </>
            )}
          </>
        )}

        {/* ═══ ZAMESTNANECKÁ KARTA ═══ */}
        {hasAccess('zamestnanecka_karta') && (
          <>
            {sectionLabel('Zamestnanecká karta')}
            <Link href="/moja-karta" className={linkClass('/moja-karta')}>
              <CreditCard size={19} className={iconClass('/moja-karta')} /> Moja karta
            </Link>
          </>
        )}

        {/* ═══ DOCHÁDZKA (vrátane dovoleniek) ═══ */}
        {(hasAccess('dochadzka') || hasAccess('dovolenky')) && (
          <>
            {sectionLabel('Dochádzka')}
            {canEdit('dochadzka') ? (
              <>
                <Link href="/admin/dochadzka" className={linkClass('/admin/dochadzka')}>
                  <Clock size={19} className={iconClass('/admin/dochadzka')} /> Prehľad dochádzky
                </Link>
                <Link href="/admin/dochadzka/uzavierka" className={linkClass('/admin/dochadzka/uzavierka')}>
                  <FileText size={19} className={iconClass('/admin/dochadzka/uzavierka')} /> Mesačná uzávierka
                </Link>
                <Link href="/admin/dochadzka/ziadosti" className={linkClass('/admin/dochadzka/ziadosti')}>
                  <AlertTriangle size={19} className={iconClass('/admin/dochadzka/ziadosti')} /> Žiadosti o korekciu
                </Link>
                <Link href="/admin/dovolenky" className={linkClass('/admin/dovolenky')}>
                  <Calendar size={19} className={iconClass('/admin/dovolenky')} /> Schvaľovanie dovoleniek
                </Link>
                <Link href="/admin/dochadzka/reporty" className={linkClass('/admin/dochadzka/reporty')}>
                  <BarChart3 size={19} className={iconClass('/admin/dochadzka/reporty')} /> Reporty
                </Link>
                <Link href="/admin/dochadzka/statistiky" className={linkClass('/admin/dochadzka/statistiky')}>
                  <BarChart3 size={19} className={iconClass('/admin/dochadzka/statistiky')} /> Štatistiky
                </Link>
                <Link href="/admin/dochadzka/import" className={linkClass('/admin/dochadzka/import')}>
                  <FileText size={19} className={iconClass('/admin/dochadzka/import')} /> Bulk import
                </Link>
                <a href="/dochadzka?smer=prichod&demo=1" target="_blank" className={linkClass('/dochadzka')}>
                  <Monitor size={19} className={iconClass('/dochadzka')} /> Tablet preview
                </a>
              </>
            ) : (
              <>
                <Link href="/dochadzka-prehled" className={linkClass('/dochadzka-prehled')}>
                  <Clock size={19} className={iconClass('/dochadzka-prehled')} /> Moja dochádzka
                </Link>
                {hasAccess('dovolenky') && (
                  <Link href="/dovolenka" className={linkClass('/dovolenka')}>
                    <Calendar size={19} className={iconClass('/dovolenka')} /> Moja dovolenka
                  </Link>
                )}
              </>
            )}
          </>
        )}

        {/* ═══ SLUŽOBNÉ CESTY ═══ */}
        {hasAccess('sluzobne_cesty') && (
          <>
            {sectionLabel('Služobné cesty')}
            {canEdit('sluzobne_cesty') ? (
              <Link href="/admin/sluzobne-cesty" className={linkClass('/admin/sluzobne-cesty')}>
                <Plane size={19} className={iconClass('/admin/sluzobne-cesty')} /> Prehľad ciest
              </Link>
            ) : (
              <Link href="/sluzobna-cesta" className={linkClass('/sluzobna-cesta')}>
                <Plane size={19} className={iconClass('/sluzobna-cesta')} /> Moje cesty
              </Link>
            )}
          </>
        )}

        {/* ═══ FAKTÚRY ═══ */}
        {hasAccess('archiv') && (
          <>
            {sectionLabel('Faktúry')}
            <Link href="/admin/faktury" className={linkClass('/admin/faktury')}>
              <FileText size={19} className={iconClass('/admin/faktury')} /> Všetky faktúry
            </Link>
            <Link href="/admin/faktury?stav=caka_na_schvalenie" className={linkClass('/admin/faktury')}>
              <Clock size={19} className={iconClass('/admin/faktury')} /> Čakajú na schválenie
            </Link>
            <Link href="/admin/faktury?overdue=1" className={linkClass('/admin/faktury')}>
              <AlertTriangle size={19} className={iconClass('/admin/faktury')} /> Po splatnosti
            </Link>
            <Link href="/admin/faktury/nahrat" className={linkClass('/admin/faktury/nahrat')}>
              <PlusCircle size={19} className={iconClass('/admin/faktury/nahrat')} /> Nahrať faktúru
            </Link>
            <Link href="/admin/faktury/dodavatelia" className={linkClass('/admin/faktury/dodavatelia')}>
              <Users size={19} className={iconClass('/admin/faktury/dodavatelia')} /> Dodávatelia
            </Link>
          </>
        )}

        {/* ═══ ARCHÍV DOKUMENTOV ═══ */}
        {hasAccess('archiv') && (
          <>
            {sectionLabel('Archív dokumentov')}
            <Link href="/admin/archiv" className={linkClass('/admin/archiv')}>
              <Archive size={19} className={iconClass('/admin/archiv')} /> Dokumenty
            </Link>
          </>
        )}

        {/* ═══ ADMINISTRÁCIA ═══ */}
        {(hasAccess('admin_zamestnanci') || hasAccess('admin_nastavenia')) && (
          <>
            {sectionLabel('Administrácia')}
            {hasAccess('admin_zamestnanci') && (
              <>
                <Link href="/admin/zamestnanci" className={linkClass('/admin/zamestnanci')}>
                  <Users size={19} className={iconClass('/admin/zamestnanci')} /> Zamestnanci
                </Link>
                <Link href="/admin/vozidla" className={linkClass('/admin/vozidla')}>
                  <Car size={19} className={iconClass('/admin/vozidla')} /> Vozidlá
                </Link>
              </>
            )}
            <Link href="/admin/reporty" className={linkClass('/admin/reporty')}>
              <BarChart3 size={19} className={iconClass('/admin/reporty')} /> Reporty
            </Link>
            {hasAccess('admin_nastavenia') && (
              <Link href="/admin/nastavenia" className={linkClass('/admin/nastavenia')}>
                <Settings size={19} className={iconClass('/admin/nastavenia')} /> Nastavenia
              </Link>
            )}
          </>
        )}

        {/* ═══ POMOC ═══ */}
        {(isItAdmin || ['admin', 'fin_manager'].includes(profile.role)) && (
          <>
            {sectionLabel('Pomoc')}
            <Link href="/admin/manual" className={linkClass('/admin/manual')}>
              <HelpCircle size={19} className={iconClass('/admin/manual')} /> Manuál systému
            </Link>
          </>
        )}
      </nav>

      {/* Bottom — user profile */}
      <div className="px-3 pb-4">
        <div className="border-t border-white/8 pt-4 px-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
              {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
              <p className="text-[11px] text-slate-500 truncate">{profile.pozicia || (isItAdmin ? 'IT Administrátor' : 'Zamestnanec')}</p>
            </div>
          </div>
          <ThemeToggle />
          <form action={logout}>
            <button type="submit" className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-white hover:bg-white/8 transition-all duration-200">
              <LogOut size={15} /> Odhlásiť sa
            </button>
          </form>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-slate-800 text-white shadow-lg hover:bg-slate-700 transition-colors"
        aria-label="Otvoriť menu"
      >
        <Menu size={22} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - mobile: overlay, desktop: static */}
      <aside
        className={`
          gradient-sidebar min-h-screen flex flex-col shrink-0 border-r border-white/5
          md:w-72 md:relative md:translate-x-0
          fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:transition-none
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
