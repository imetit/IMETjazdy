'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  Car, Fuel, FileText, FolderOpen, Settings, Scale, Users,
  LayoutDashboard, PlusCircle, LogOut, Wrench, ShieldCheck,
  AlertTriangle, Gauge, CarFront
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
    return `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-primary text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
    }`
  }

  const sectionLabel = (label: string) => (
    <p className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
  )

  return (
    <aside className="w-64 bg-sidebar-bg min-h-screen flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
        <div className="bg-white rounded-lg p-1.5 shrink-0">
          <Image src="/imet-logo.png" alt="IMET" width={36} height={36} />
        </div>
        <div>
          <h1 className="text-white text-lg font-bold tracking-tight">IMET</h1>
          <p className="text-gray-500 text-xs">Interný systém</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {sectionLabel('Kniha Jázd')}

        {isAdmin ? (
          <>
            <Link href="/admin/jazdy" className={linkClass('/admin/jazdy')}><FileText size={18} /> Prijaté jazdy</Link>
            <Link href="/admin/vozidla" className={linkClass('/admin/vozidla')}><Car size={18} /> Vozidlá</Link>
            <Link href="/admin/zamestnanci" className={linkClass('/admin/zamestnanci')}><Users size={18} /> Zamestnanci</Link>
            <Link href="/admin/paliva" className={linkClass('/admin/paliva')}><Fuel size={18} /> Ceny palív</Link>
            <Link href="/admin/sadzby" className={linkClass('/admin/sadzby')}><Scale size={18} /> Sadzby náhrad</Link>
          </>
        ) : (
          <>
            <Link href="/" className={linkClass('/')}><LayoutDashboard size={18} /> Dashboard</Link>
            <Link href="/nova-jazda" className={linkClass('/nova-jazda')}><PlusCircle size={18} /> Nová jazda</Link>
            <Link href="/moje-jazdy" className={linkClass('/moje-jazdy')}><FolderOpen size={18} /> Moje jazdy</Link>
          </>
        )}

        {(!isAdmin || isItAdmin) && (
          <>
            {sectionLabel('Vozový park')}

            {hasFleetAccess ? (
              <>
                <Link href="/fleet" className={linkClass('/fleet')}><Gauge size={18} /> Dashboard</Link>
                <Link href="/fleet/vozidla" className={linkClass('/fleet/vozidla')}><CarFront size={18} /> Vozidlá</Link>
                <Link href="/fleet/servisy" className={linkClass('/fleet/servisy')}><Wrench size={18} /> Servisy a opravy</Link>
                <Link href="/fleet/kontroly" className={linkClass('/fleet/kontroly')}><ShieldCheck size={18} /> Kontroly</Link>
                <Link href="/fleet/hlasenia" className={linkClass('/fleet/hlasenia')}><AlertTriangle size={18} /> Hlásenia</Link>
              </>
            ) : (
              <>
                <Link href="/moje-vozidlo" className={linkClass('/moje-vozidlo')}><CarFront size={18} /> Moje vozidlo</Link>
                <Link href="/nahlasit-problem" className={linkClass('/nahlasit-problem')}><AlertTriangle size={18} /> Nahlásiť problém</Link>
              </>
            )}
          </>
        )}
      </nav>

      <div className="px-3 pb-4 space-y-1">
        {(profile.role === 'admin' || isItAdmin) && (
          <Link href="/admin/nastavenia" className={linkClass('/admin/nastavenia')}><Settings size={18} /> Nastavenia</Link>
        )}
        <div className="border-t border-white/10 pt-3 mt-2">
          <p className="px-4 text-xs text-gray-500 mb-2 truncate">{profile.full_name}</p>
          <form action={logout}>
            <button type="submit" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors w-full">
              <LogOut size={18} /> Odhlásiť sa
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
