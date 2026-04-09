'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  Car, Fuel, FileText, FolderOpen, Settings, Scale, Users,
  LayoutDashboard, PlusCircle, LogOut, Wrench, ShieldCheck,
  AlertTriangle, Gauge, CarFront, ShieldAlert, CreditCard,
  Clock, Calendar, BarChart3, Plane, Archive, Bell, Monitor
} from 'lucide-react'
import { logout } from '@/actions/auth'
import type { Profile, ModulId } from '@/lib/types'

interface Props {
  profile: Profile
  moduly: { modul: string; pristup: string }[]
  notifCount?: number
}

export default function Sidebar({ profile, moduly, notifCount = 0 }: Props) {
  const pathname = usePathname()
  const isItAdmin = profile.role === 'it_admin'

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

  return (
    <aside className="w-72 gradient-sidebar min-h-screen flex flex-col shrink-0 border-r border-white/5">
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
          {/* Notification bell */}
          <Link href="/notifikacie" className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/8">
            <Bell size={18} />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">

        {/* ═══ KNIHA JÁZD ═══ */}
        {hasAccess('jazdy') && (
          <>
            {sectionLabel('Kniha jázd')}
            {canEdit('jazdy') ? (
              <>
                <Link href="/admin/jazdy" className={linkClass('/admin/jazdy')}>
                  <FileText size={19} className={iconClass('/admin/jazdy')} /> Prijaté jazdy
                </Link>
                <Link href="/admin/paliva" className={linkClass('/admin/paliva')}>
                  <Fuel size={19} className={iconClass('/admin/paliva')} /> Ceny palív
                </Link>
                <Link href="/admin/sadzby" className={linkClass('/admin/sadzby')}>
                  <Scale size={19} className={iconClass('/admin/sadzby')} /> Sadzby náhrad
                </Link>
              </>
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
                <Link href="/admin/dovolenky" className={linkClass('/admin/dovolenky')}>
                  <Calendar size={19} className={iconClass('/admin/dovolenky')} /> Schvaľovanie dovoleniek
                </Link>
                <Link href="/admin/dochadzka/reporty" className={linkClass('/admin/dochadzka/reporty')}>
                  <BarChart3 size={19} className={iconClass('/admin/dochadzka/reporty')} /> Reporty
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
            {hasAccess('admin_nastavenia') && (
              <Link href="/admin/nastavenia" className={linkClass('/admin/nastavenia')}>
                <Settings size={19} className={iconClass('/admin/nastavenia')} /> Nastavenia
              </Link>
            )}
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
          <form action={logout}>
            <button type="submit" className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-white hover:bg-white/8 transition-all duration-200">
              <LogOut size={15} /> Odhlásiť sa
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
