'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  Car, Fuel, FileText, FolderOpen, Settings, Scale, Users,
  LayoutDashboard, PlusCircle, LogOut, Wrench, ShieldCheck,
  AlertTriangle, Gauge, CarFront, ShieldAlert, CreditCard
} from 'lucide-react'
import { logout } from '@/actions/auth'
import type { Profile } from '@/lib/types'

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const isItAdmin = profile.role === 'it_admin'
  const isAdmin = profile.role === 'admin' || isItAdmin
  const isFleetManager = profile.role === 'fleet_manager' || isItAdmin
  const hasFleetAccess = isFleetManager

  const linkClass = (href: string) => {
    const isActive = pathname === href || (href !== '/' && (pathname.startsWith(href + '/') || pathname.startsWith(href + '?')))
    return `group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
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
    <p className="px-4 pt-6 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em]">{label}</p>
  )

  const roleLabel = () => {
    switch (profile.role) {
      case 'it_admin': return 'IT Administrátor'
      case 'admin': return 'Administrátor'
      case 'fleet_manager': return 'Fleet Manager'
      default: return 'Zamestnanec'
    }
  }

  const roleBadgeColor = () => {
    switch (profile.role) {
      case 'it_admin': return 'bg-teal-500/20 text-teal-300 border-teal-500/30'
      case 'admin': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'fleet_manager': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  return (
    <aside className="w-72 gradient-sidebar min-h-screen flex flex-col shrink-0 border-r border-white/5">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl p-2 shadow-md">
            <Image src="/imet-logo.png" alt="IMET" width={28} height={28} />
          </div>
          <div>
            <h1 className="text-white text-lg font-bold tracking-tight">IMET</h1>
            <p className="text-slate-500 text-[11px] font-medium">Interný systém</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        {sectionLabel('Kniha Jázd')}

        {isAdmin ? (
          <>
            <Link href="/admin/jazdy" className={linkClass('/admin/jazdy')}>
              <FileText size={19} className={iconClass('/admin/jazdy')} /> Prijaté jazdy
            </Link>
            <Link href="/admin/vozidla" className={linkClass('/admin/vozidla')}>
              <Car size={19} className={iconClass('/admin/vozidla')} /> Vozidlá
            </Link>
            <Link href="/admin/zamestnanci" className={linkClass('/admin/zamestnanci')}>
              <Users size={19} className={iconClass('/admin/zamestnanci')} /> Zamestnanci
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
              <LayoutDashboard size={19} className={iconClass('/')} /> Dashboard
            </Link>
            <Link href="/nova-jazda" className={linkClass('/nova-jazda')}>
              <PlusCircle size={19} className={iconClass('/nova-jazda')} /> Nová jazda
            </Link>
            <Link href="/moje-jazdy" className={linkClass('/moje-jazdy')}>
              <FolderOpen size={19} className={iconClass('/moje-jazdy')} /> Moje jazdy
            </Link>
            <Link href="/moja-karta" className={linkClass('/moja-karta')}>
              <CreditCard size={19} className={iconClass('/moja-karta')} /> Moja karta
            </Link>
          </>
        )}

        {(!isAdmin || isItAdmin) && (
          <>
            {sectionLabel('Vozový park')}

            {hasFleetAccess ? (
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
                <Link href="/nahlasit-udalost" className={linkClass('/nahlasit-udalost')}>
                  <ShieldAlert size={19} className={iconClass('/nahlasit-udalost')} /> Poistná udalosť
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
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-2">
        {(profile.role === 'admin' || isItAdmin) && (
          <Link href="/admin/nastavenia" className={linkClass('/admin/nastavenia')}>
            <Settings size={19} className={iconClass('/admin/nastavenia')} /> Nastavenia
          </Link>
        )}
        <div className="border-t border-white/8 pt-4 mt-2 px-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
              {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
              <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadgeColor()}`}>
                {roleLabel()}
              </span>
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
