import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_COOKIE_HINT = '-auth-token'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isStaffRoute = pathname.startsWith('/admin') || pathname.startsWith('/watch')
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.includes(AUTH_COOKIE_HINT))

  // Public kiosk routes and anonymous traffic skip Supabase entirely. The
  // proxy must be the ONLY layer that refreshes the Supabase session: it can
  // write Set-Cookie on the response, while a server-component render cannot
  // (lib/supabase/server.ts swallows the write). Refreshing here AND in the
  // Node RSC layer (Edge vs Node processes) races Supabase's single-use
  // refresh tokens and produces "refresh_token_not_found".
  if (!isStaffRoute || !hasAuthCookie) return NextResponse.next({ request })

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Stale or revoked session — the refresh token was rotated away or the
    // session was signed out elsewhere. Clear the dead cookies and send staff
    // to the login page instead of letting the protected page 500.
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    for (const cookie of request.cookies.getAll()) {
      if (!cookie.name.includes(AUTH_COOKIE_HINT)) continue
      request.cookies.delete(cookie.name)
      supabaseResponse.cookies.set(cookie.name, '', { path: '/', maxAge: 0 })
    }
    return NextResponse.redirect(loginUrl)
  }

  // IMPORTANT: return supabaseResponse (fresh cookies included) so the
  // browser keeps the rotated tokens and the RSC layer doesn't re-refresh.
  return supabaseResponse
}
