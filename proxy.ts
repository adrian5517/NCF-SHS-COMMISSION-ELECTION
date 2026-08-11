import { updateSession } from '@/lib/supabase/proxy'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Student kiosk: guarded by its own signed cookie, never touches Supabase.
  if (pathname.startsWith('/ballot')) {
    if (!request.cookies.get('ncf_student_session')) {
      return NextResponse.redirect(new URL('/vote', request.url))
    }
    return NextResponse.next()
  }

  // Staff routes: refresh/validate the Supabase session (single refresher),
  // redirecting to /login when the session is stale or revoked.
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
