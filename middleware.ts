import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // IP whitelist pre /admin/*  (iba ak je env premenná ADMIN_IP_WHITELIST nastavená)
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

  if (!user && pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    if (profile?.role === 'tablet') {
      url.pathname = '/dochadzka'
      url.searchParams.set('smer', 'prichod')
    } else if (profile?.role === 'it_admin' || profile?.role === 'admin' || profile?.role === 'fin_manager') {
      url.pathname = '/admin'
    } else if (profile?.role === 'fleet_manager') {
      url.pathname = '/fleet'
    } else {
      url.pathname = '/'
    }
    return NextResponse.redirect(url)
  }

  // Kiosk režim: role=tablet môže ísť iba na /dochadzka (+ /login a auth API)
  if (user && pathname !== '/dochadzka' && pathname !== '/login' && !pathname.startsWith('/api/')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'tablet') {
      const url = request.nextUrl.clone()
      url.pathname = '/dochadzka'
      url.searchParams.set('smer', 'prichod')
      return NextResponse.redirect(url)
    }
  }

  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const adminRoles = ['admin', 'it_admin', 'fin_manager']
    if (!profile?.role || !adminRoles.includes(profile.role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  if (user && pathname.startsWith('/fleet')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const fleetRoles = ['fleet_manager', 'it_admin', 'admin', 'fin_manager']
    if (!profile?.role || !fleetRoles.includes(profile.role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Dochádzka tablet route — only tablet/admin/it_admin can access /dochadzka (tablet UI)
  // /dochadzka-prehled and /dovolenka are employee routes under (zamestnanec) layout — NOT blocked
  if (user && pathname === '/dochadzka') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['tablet', 'admin', 'it_admin']
    if (!profile || !allowedRoles.includes(profile.role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
