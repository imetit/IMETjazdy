import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware optimization (2026-05-05):
 * - FAST PATH: ak je platný `imet_role_cache` cookie, preskočíme `supabase.auth.getUser()`
 *   úplne (žiadny network call do Supabase auth API). Šetrí ~80-150ms per request.
 * - Bezpečnosť: server actions stále volajú requireAuth() ktorý overuje session cez DB.
 *   Cookie je httpOnly, takže nie je dostupný cez XSS.
 * - SLOW PATH (po expirácii cookie alebo pri loginu): plný auth check + role lookup,
 *   pri jednom roundtripe sa updatuje session aj cache.
 */

const ROLE_COOKIE = 'imet_role_cache'
const ROLE_TTL_MS = 5 * 60 * 1000 // 5 min

function readRoleCookie(request: NextRequest): { role: string; userId: string } | null {
  const raw = request.cookies.get(ROLE_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { role: string; userId: string; ts: number }
    if (Date.now() - parsed.ts > ROLE_TTL_MS) return null
    return { role: parsed.role, userId: parsed.userId }
  } catch { return null }
}

function writeRoleCookie(response: NextResponse, role: string, userId: string) {
  response.cookies.set(ROLE_COOKIE, JSON.stringify({ role, userId, ts: Date.now() }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ROLE_TTL_MS / 1000,
  })
}

function clearRoleCookie(response: NextResponse) {
  response.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' })
}

function checkAdminIpWhitelist(request: NextRequest): NextResponse | null {
  const whitelist = process.env.ADMIN_IP_WHITELIST
  if (!whitelist) return null
  const allowed = whitelist.split(',').map(s => s.trim()).filter(Boolean)
  const fwd = request.headers.get('x-forwarded-for') || ''
  const clientIp = fwd.split(',')[0].trim() || request.headers.get('x-real-ip') || ''
  if (clientIp && !allowed.includes(clientIp)) {
    return new NextResponse('Forbidden: IP not allowed', { status: 403 })
  }
  return null
}

function applyRoleRouting(request: NextRequest, role: string | null): NextResponse | null {
  const pathname = request.nextUrl.pathname

  if (pathname === '/login' && role) {
    const url = request.nextUrl.clone()
    if (role === 'tablet') {
      url.pathname = '/dochadzka'
      url.searchParams.set('smer', 'prichod')
    } else if (role === 'it_admin' || role === 'admin' || role === 'fin_manager') {
      url.pathname = '/admin'
    } else if (role === 'fleet_manager') {
      url.pathname = '/fleet'
    } else {
      url.pathname = '/moje'
    }
    return NextResponse.redirect(url)
  }

  if (role === 'tablet' && pathname !== '/dochadzka' && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dochadzka'
    url.searchParams.set('smer', 'prichod')
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/admin')) {
    const adminRoles = ['admin', 'it_admin', 'fin_manager']
    if (!role || !adminRoles.includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/fleet')) {
    const fleetRoles = ['fleet_manager', 'it_admin', 'admin', 'fin_manager']
    if (!role || !fleetRoles.includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  if (pathname === '/dochadzka') {
    const allowedRoles = ['tablet', 'admin', 'it_admin']
    if (!role || !allowedRoles.includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return null
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/admin')) {
    const blocked = checkAdminIpWhitelist(request)
    if (blocked) return blocked
  }

  // FAST PATH — cookie cache valid → preskočíme Supabase úplne
  const cached = readRoleCookie(request)
  if (cached) {
    const redirect = applyRoleRouting(request, cached.role)
    return redirect ?? NextResponse.next()
  }

  // SLOW PATH — žiadny cache, plný auth check
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Verejne dostupné cesty (homepage, legal, login, health, OG, well-known)
  const PUBLIC_PATHS = ['/', '/login', '/privacy', '/terms', '/security']
  const isPublicPath =
    PUBLIC_PATHS.includes(pathname) ||
    pathname === '/api/health' ||
    pathname.startsWith('/.well-known/') ||
    pathname.startsWith('/opengraph-image') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'

  if (!user) {
    if (!isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const r = NextResponse.redirect(url)
      clearRoleCookie(r)
      return r
    }
    return supabaseResponse
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = profile?.role || null
  if (role) writeRoleCookie(supabaseResponse, role, user.id)

  const redirect = applyRoleRouting(request, role)
  return redirect ?? supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|manifest.json|robots.txt|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|js|css|woff|woff2|ttf|map)$).*)',
  ],
}
