import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware optimization (2026-04-29):
 * - 1 supabase profile fetch per request (predtým 3-5 separátnych)
 * - Role je cachovaná v signed cookie (5 min TTL) — pri rýchlej navigácii sa preskočí DB query úplne
 * - Iba pri zmene role (login/logout) sa cache invaliduje
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
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: ROLE_TTL_MS / 1000,
  })
}

function clearRoleCookie(response: NextResponse) {
  response.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' })
}

export async function middleware(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname

  // IP whitelist pre /admin/* — iba ak je env nastavená
  if (pathname.startsWith('/admin')) {
    const whitelist = process.env.ADMIN_IP_WHITELIST
    if (whitelist) {
      const allowed = whitelist.split(',').map(s => s.trim()).filter(Boolean)
      const fwd = request.headers.get('x-forwarded-for') || ''
      const clientIp = fwd.split(',')[0].trim() || request.headers.get('x-real-ip') || ''
      if (clientIp && !allowed.includes(clientIp)) {
        return new NextResponse('Forbidden: IP not allowed', { status: 403 })
      }
    }
  }

  // Auth check (vždy potrebné kvôli session refresh tokenom)
  const { data: { user } } = await supabase.auth.getUser()

  // Neprihlásený → /login
  if (!user) {
    if (pathname !== '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const r = NextResponse.redirect(url)
      clearRoleCookie(r)
      return r
    }
    return supabaseResponse
  }

  // Cached role lookup (5-min cookie). Inak 1× DB query.
  let role: string | null = null
  const cached = readRoleCookie(request)
  if (cached && cached.userId === user.id) {
    role = cached.role
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role || null
    if (role) writeRoleCookie(supabaseResponse, role, user.id)
  }

  // Login → redirect to dashboard podľa role
  if (pathname === '/login') {
    const url = request.nextUrl.clone()
    if (role === 'tablet') {
      url.pathname = '/dochadzka'
      url.searchParams.set('smer', 'prichod')
    } else if (role === 'it_admin' || role === 'admin' || role === 'fin_manager') {
      url.pathname = '/admin'
    } else if (role === 'fleet_manager') {
      url.pathname = '/fleet'
    } else {
      url.pathname = '/'
    }
    return NextResponse.redirect(url)
  }

  // Tablet kiosk — iba /dochadzka
  if (role === 'tablet' && pathname !== '/dochadzka' && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dochadzka'
    url.searchParams.set('smer', 'prichod')
    return NextResponse.redirect(url)
  }

  // /admin/* — iba admin/it_admin/fin_manager
  if (pathname.startsWith('/admin')) {
    const adminRoles = ['admin', 'it_admin', 'fin_manager']
    if (!role || !adminRoles.includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // /fleet/* — fleet/admin/it_admin/fin_manager
  if (pathname.startsWith('/fleet')) {
    const fleetRoles = ['fleet_manager', 'it_admin', 'admin', 'fin_manager']
    if (!role || !fleetRoles.includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // /dochadzka — tablet UI iba pre tablet/admin/it_admin
  if (pathname === '/dochadzka') {
    const allowedRoles = ['tablet', 'admin', 'it_admin']
    if (!role || !allowedRoles.includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|js)$).*)'],
}
