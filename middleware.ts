import { updateSession } from '@/lib/supabase/proxy'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Student kiosk ballot: needs the student session cookie (the page fully verifies the JWT).
  if (pathname.startsWith('/ballot')) {
    if (!request.cookies.get('ncf_student_session')) {
      return NextResponse.redirect(new URL('/vote', request.url))
    }
    return NextResponse.next()
  }

  // Staff areas: refresh the Supabase session and require a logged-in user.
  const response = await updateSession(request)
  if (pathname.startsWith('/admin') || pathname.startsWith('/watch')) {
    const hasAuth = request.cookies.getAll().some((c) => c.name.includes('-auth-token'))
    if (!hasAuth) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
