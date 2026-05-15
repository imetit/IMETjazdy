'use client'

import { useState, useEffect, useCallback, useRef, useMemo, type ComponentType } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  Car, FileText, FolderOpen, Settings, Users,
  LayoutDashboard, PlusCircle, LogOut, Wrench, ShieldCheck,
  AlertTriangle, Gauge, CarFront, ShieldAlert, CreditCard,
  Clock, Calendar, BarChart3, Plane, Archive, Bell, Monitor,
  Menu, X, HelpCircle, Search, ChevronDown, ChevronUp,
  KeyRound, Palette, ShieldQuestion,
} from 'lucide-react'
import { logout } from '@/actions/auth'
import ThemeToggle from '@/components/ThemeToggle'
import { brand } from '@/lib/brand'
import type { Profile, ModulId } from '@/lib/types'

interface Props {
  profile: Profile
  moduly: { modul: string; pristup: string }[]
  notifCount?: number
}

type LucideIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>

interface NavItemDef {
  href: string
  icon: LucideIcon
  label: string
  exact?: boolean
  external?: boolean
}

interface SectionDef {
  key: string
  label: string
  when: boolean
  items: NavItemDef[]
}

const COLLAPSED_KEY = 'imet-sidebar-collapsed-v1'

export default function Sidebar({ profile, moduly, notifCount = 0 }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isItAdmin = profile.role === 'it_admin'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false) }, [pathname])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY)
      if (saved) setCollapsed(new Set(JSON.parse(saved)))
    } catch { /* noop */ }
  }, [])

  // Persist collapsed state
  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed])) }
    catch { /* noop */ }
  }, [collapsed])

  // ⌘K / Ctrl+K focuses search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('')
        searchInputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Outside click closes user menu
  useEffect(() => {
    if (!userMenuOpen) return
    function onClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [userMenuOpen])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  function hasAccess(modul: ModulId): boolean {
    if (isItAdmin) return true
    return moduly.some(m => m.modul === modul)
  }
  function canEdit(modul: ModulId): boolean {
    if (isItAdmin) return true
    return moduly.some(m => m.modul === modul && (m.pristup === 'edit' || m.pristup === 'admin'))
  }

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

  // ─── Build section definitions (data-driven for filterability) ───
  const sections: SectionDef[] = useMemo(() => {
    const out: SectionDef[] = []
    if (hasAccess('jazdy')) {
      out.push({
        key: 'jazdy', label: 'Kniha jázd', when: true,
        items: canEdit('jazdy')
          ? [{ href: '/admin/jazdy', icon: FileText, label: 'Prijaté jazdy' }]
          : [
              { href: '/moje', icon: LayoutDashboard, label: 'Prehľad' },
              { href: '/nova-jazda', icon: PlusCircle, label: 'Nová jazda' },
              { href: '/moje-jazdy', icon: FolderOpen, label: 'Moje jazdy' },
            ],
      })
    }
    if (hasAccess('vozovy_park')) {
      out.push({
        key: 'fleet', label: 'Vozový park', when: true,
        items: canEdit('vozovy_park')
          ? [
              { href: '/fleet', icon: Gauge, label: 'Dashboard', exact: true },
              { href: '/fleet/vozidla', icon: CarFront, label: 'Vozidlá' },
              { href: '/fleet/servisy', icon: Wrench, label: 'Servisy a opravy' },
              { href: '/fleet/kontroly', icon: ShieldCheck, label: 'Kontroly' },
              { href: '/fleet/hlasenia', icon: AlertTriangle, label: 'Hlásenia' },
              { href: '/fleet/tankove-karty', icon: CreditCard, label: 'Tankové karty' },
              { href: '/fleet/reporty', icon: BarChart3, label: 'Reporty' },
            ]
          : [
              { href: '/moje-vozidlo', icon: CarFront, label: 'Moje vozidlo' },
              { href: '/nahlasit-problem', icon: AlertTriangle, label: 'Nahlásiť problém' },
              { href: '/nahlasit-udalost', icon: ShieldAlert, label: 'Poistná udalosť' },
            ],
      })
    }
    if (hasAccess('zamestnanecka_karta')) {
      out.push({
        key: 'karta', label: 'Zamestnanecká karta', when: true,
        items: [{ href: '/moja-karta', icon: CreditCard, label: 'Moja karta' }],
      })
    }
    if (hasAccess('dochadzka') || hasAccess('dovolenky')) {
      out.push({
        key: 'dochadzka', label: 'Dochádzka', when: true,
        items: canEdit('dochadzka')
          ? [
              { href: '/admin/dochadzka', icon: Clock, label: 'Prehľad dochádzky', exact: true },
              { href: '/admin/dochadzka/uzavierka', icon: FileText, label: 'Mesačná uzávierka' },
              { href: '/admin/dochadzka/ziadosti', icon: AlertTriangle, label: 'Žiadosti o korekciu' },
              { href: '/admin/dovolenky', icon: Calendar, label: 'Schvaľovanie dovoleniek' },
              { href: '/admin/dochadzka/reporty', icon: BarChart3, label: 'Reporty' },
              { href: '/admin/dochadzka/statistiky', icon: BarChart3, label: 'Štatistiky' },
              { href: '/admin/dochadzka/import', icon: FileText, label: 'Bulk import' },
              { href: '/dochadzka?smer=prichod&demo=1', icon: Monitor, label: 'Tablet preview', external: true },
            ]
          : [
              { href: '/dochadzka-prehled', icon: Clock, label: 'Moja dochádzka' },
              ...(hasAccess('dovolenky') ? [{ href: '/dovolenka', icon: Calendar, label: 'Moja dovolenka' }] : []),
            ],
      })
    }
    if (hasAccess('sluzobne_cesty')) {
      out.push({
        key: 'cesty', label: 'Služobné cesty', when: true,
        items: canEdit('sluzobne_cesty')
          ? [{ href: '/admin/sluzobne-cesty', icon: Plane, label: 'Prehľad ciest' }]
          : [{ href: '/sluzobna-cesta', icon: Plane, label: 'Moje cesty' }],
      })
    }
    if (hasAccess('archiv')) {
      out.push({
        key: 'faktury', label: 'Faktúry', when: true,
        items: [
          { href: '/admin/faktury', icon: FileText, label: 'Všetky faktúry', exact: true },
          { href: '/admin/faktury?stav=caka_na_schvalenie', icon: Clock, label: 'Čakajú na schválenie' },
          { href: '/admin/faktury?overdue=1', icon: AlertTriangle, label: 'Po splatnosti' },
          { href: '/admin/faktury/nahrat', icon: PlusCircle, label: 'Nahrať faktúru' },
          { href: '/admin/faktury/reporty', icon: BarChart3, label: 'Cashflow + reporty' },
          { href: '/admin/faktury/dodavatelia', icon: Users, label: 'Dodávatelia' },
        ],
      })
      out.push({
        key: 'archiv', label: 'Archív dokumentov', when: true,
        items: [{ href: '/admin/archiv', icon: Archive, label: 'Dokumenty' }],
      })
    }
    if (hasAccess('admin_zamestnanci') || hasAccess('admin_nastavenia')) {
      const adminItems: NavItemDef[] = []
      if (hasAccess('admin_zamestnanci')) {
        adminItems.push({ href: '/admin/zamestnanci', icon: Users, label: 'Zamestnanci' })
        adminItems.push({ href: '/admin/vozidla', icon: Car, label: 'Vozidlá' })
      }
      adminItems.push({ href: '/admin/reporty', icon: BarChart3, label: 'Reporty' })
      if (hasAccess('admin_nastavenia')) {
        adminItems.push({ href: '/admin/nastavenia', icon: Settings, label: 'Nastavenia' })
      }
      out.push({ key: 'admin', label: 'Administrácia', when: true, items: adminItems })
    }
    if (isItAdmin || ['admin', 'fin_manager'].includes(profile.role)) {
      out.push({
        key: 'help', label: 'Pomoc', when: true,
        items: [{ href: '/admin/manual', icon: HelpCircle, label: 'Manuál systému' }],
      })
    }
    return out.filter(s => s.when)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.role, moduly])

  // ─── Filter items by search ───
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections.map(s => ({ ...s, items: s.items }))
    const q = searchQuery.toLowerCase().trim()
    return sections
      .map(s => ({ ...s, items: s.items.filter(it => it.label.toLowerCase().includes(q)) }))
      .filter(s => s.items.length > 0)
  }, [sections, searchQuery])

  const isSearching = searchQuery.trim().length > 0

  function toggleSection(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  /* ─── NavItem — Linear-style with smooth active indicator ─── */
  function NavItem({ item }: { item: NavItemDef }) {
    const active = isLinkActive(item.href, { exact: item.exact })
    const Icon = item.icon
    const cls = `group relative flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-[15px] font-medium leading-tight transition-all duration-150
      ${active
        ? 'text-white bg-white/[0.06]'
        : 'text-slate-300 hover:text-white hover:bg-white/[0.03]'}`
    const content = (
      <>
        <span
          aria-hidden
          className={`absolute -left-[10px] top-2 bottom-2 w-[3px] rounded-r-full bg-teal-400 transition-all duration-200
            ${active ? 'opacity-100 shadow-[0_0_10px_rgba(45,212,191,0.6)]' : 'opacity-0 -translate-x-1'}`}
        />
        <Icon
          size={19}
          strokeWidth={1.85}
          className={`shrink-0 transition-all duration-150 ${active ? 'text-teal-300 scale-105' : 'text-slate-400 group-hover:text-slate-200'}`}
        />
        <span className="truncate">{item.label}</span>
      </>
    )
    return item.external ? (
      <a href={item.href} target="_blank" rel="noopener" className={cls}>{content}</a>
    ) : (
      <Link href={item.href} className={cls}>{content}</Link>
    )
  }

  const userInitial = profile.full_name?.charAt(0)?.toUpperCase() || '?'
  const userRole = profile.pozicia || (isItAdmin ? 'IT Administrátor' : profile.role === 'admin' ? 'Administrátor' : profile.role === 'fin_manager' ? 'Finančný manažér' : profile.role === 'fleet_manager' ? 'Fleet manažér' : 'Zamestnanec')

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center gap-3 group min-w-0">
            <div className="bg-white rounded-lg p-2 shadow-md shadow-black/40 transition-transform group-hover:scale-105 shrink-0">
              <Image src={brand.logoSrc} alt={brand.name} width={26} height={26} priority />
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-base font-semibold tracking-tight leading-none truncate">{brand.name}</h1>
              <p className="text-slate-500 text-[11px] font-medium leading-none mt-2 uppercase tracking-[0.15em]">Interný systém</p>
            </div>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/notifikacie"
              aria-label={`Notifikácie${notifCount > 0 ? ` (${notifCount} neprečítaných)` : ''}`}
              className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-white/[0.05]"
            >
              <Bell size={18} strokeWidth={1.85} />
              {notifCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={closeMobile}
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-white/[0.05]"
              aria-label="Zavrieť menu"
            >
              <X size={20} strokeWidth={1.85} />
            </button>
          </div>
        </div>

        {/* ⌘K Search */}
        <div className="relative">
          <Search size={15} strokeWidth={1.85} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Hľadaj..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            spellCheck={false}
            className="w-full pl-9 pr-14 py-2.5 bg-white/[0.03] border border-white/[0.07] rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:bg-white/[0.05] focus:border-teal-400/30 transition-all"
            aria-label="Hľadať v navigácii"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }}
              aria-label="Vyčistiť"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-200 transition-colors rounded"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 px-1.5 py-0.5 rounded border border-white/[0.07] bg-white/[0.03] font-mono pointer-events-none select-none">⌘K</kbd>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-1 overflow-y-auto overscroll-contain">
        {filteredSections.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-400">Žiadne výsledky pre <span className="text-white font-medium">&quot;{searchQuery}&quot;</span></p>
          </div>
        )}
        {filteredSections.map((section, idx) => {
          const isCollapsed = !isSearching && collapsed.has(section.key)
          return (
            <div key={section.key} className={idx === 0 ? 'mt-2' : 'mt-5'}>
              <button
                type="button"
                onClick={() => !isSearching && toggleSection(section.key)}
                disabled={isSearching}
                aria-expanded={!isCollapsed}
                className="w-full flex items-center justify-between px-4 pb-2 group"
              >
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                  {section.label}
                </span>
                {!isSearching && (
                  <ChevronDown
                    size={13}
                    strokeWidth={2}
                    className={`text-slate-600 group-hover:text-slate-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                )}
              </button>
              <div
                className={`overflow-hidden transition-[max-height] duration-200 ease-out ${
                  isCollapsed ? 'max-h-0' : 'max-h-[1500px]'
                }`}
              >
                <div className="space-y-0.5">
                  {section.items.map(item => <NavItem key={item.href} item={item} />)}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer — user menu */}
      <div className="px-2 pt-2 pb-3 border-t border-white/[0.05]">
        <div className="relative" ref={userMenuRef}>
          {/* User button */}
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-teal-500/20 shrink-0 ring-1 ring-white/10">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate leading-tight">{profile.full_name}</p>
              <p className="text-[12px] text-slate-400 truncate leading-tight mt-1">{userRole}</p>
            </div>
            <ChevronUp
              size={15}
              strokeWidth={2}
              className={`text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${userMenuOpen ? '' : 'rotate-180'}`}
            />
          </button>

          {/* User menu popover */}
          {userMenuOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-[#0a0f1e] border border-white/[0.08] shadow-2xl shadow-black/60 p-2 z-50 backdrop-blur-xl animate-scale-in origin-bottom"
            >
              <Link
                href="/profil/mfa"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:text-white hover:bg-white/[0.05] transition-colors"
                role="menuitem"
              >
                <KeyRound size={17} strokeWidth={1.85} className="text-slate-400" />
                Dvojfaktorové overenie
              </Link>
              <Link
                href="/security"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:text-white hover:bg-white/[0.05] transition-colors"
                role="menuitem"
              >
                <ShieldQuestion size={17} strokeWidth={1.85} className="text-slate-400" />
                Bezpečnostná politika
              </Link>
              <div className="my-1.5 border-t border-white/[0.05]" />
              <div className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200">
                <Palette size={17} strokeWidth={1.85} className="text-slate-400" />
                <span className="flex-1">Téma</span>
                <ThemeToggle />
              </div>
              <div className="my-1.5 border-t border-white/[0.05]" />
              <form action={logout}>
                <button
                  type="submit"
                  role="menuitem"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:text-red-200 hover:bg-red-500/[0.1] transition-colors"
                >
                  <LogOut size={17} strokeWidth={1.85} />
                  Odhlásiť sa
                </button>
              </form>
            </div>
          )}
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

      {/* Sidebar shell
        * Desktop: flex child v h-screen overflow-hidden parente → sidebar je natiahnutý
        *   na 100vh a nikdy sa neskroluje s obsahom. Iba <main> má interný scroll.
        * Mobile: fixed inset-y-0 → off-canvas drawer s backdropom. */}
      <aside
        className={`
          bg-[#020617] flex flex-col shrink-0 border-r border-white/[0.05]
          md:relative md:inset-auto md:h-screen md:w-[290px] md:translate-x-0
          fixed inset-y-0 left-0 z-50 w-[290px] transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:transition-none
        `}
      >
        {/* Subtle aurora glow (depth) */}
        <div aria-hidden className="pointer-events-none absolute top-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.10),transparent_70%)] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-[-100px] right-[-50px] w-[250px] h-[250px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.08),transparent_70%)] blur-3xl" />
        <div className="relative flex flex-col flex-1 min-h-0">
          {sidebarContent}
        </div>
      </aside>
    </>
  )
}
