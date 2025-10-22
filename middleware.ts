import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Next.js Middleware for server-side route protection
 *
 * This runs at the edge before any page renders, ensuring:
 * - Authenticated routes are protected
 * - Unauthenticated users are redirected to login
 * - No flash of protected content
 */

export async function middleware(req: NextRequest) {
  try {
    console.log('[middleware] Request received:', req.nextUrl.pathname)
    const res = NextResponse.next()

    // Check for required Supabase environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('[middleware] Env check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      url: supabaseUrl ? `${supabaseUrl.slice(0, 20)}...` : 'missing'
    })

    if (!supabaseUrl || !supabaseKey) {
      console.error('[middleware] Missing required Supabase environment variables')
      console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
      // Allow request through but log error - prevents complete site failure
      return res
    }

    console.log('[middleware] Creating Supabase client...')
    const supabase = createMiddlewareClient({ req, res })
    console.log('[middleware] Supabase client created successfully')

    // Get the current session
    console.log('[middleware] Getting session...')
    const {
      data: { session },
    } = await supabase.auth.getSession()
    console.log('[middleware] Session retrieved:', { hasSession: !!session })

    const { pathname } = req.nextUrl
    console.log('[middleware] Processing pathname:', pathname)

    // Define protected routes that require authentication
    const protectedRoutes = [
      '/dashboard',
      '/import',
      '/review',
      '/purchase',
      '/download',
      '/account',
    ]

    // Define public routes that don't require authentication
    const publicRoutes = ['/', '/login', '/signup', '/auth/callback']

    // Check if the current path starts with any protected route
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    )

    // Check if the current path starts with any public route
    const isPublicRoute = publicRoutes.some((route) => pathname === route)

    // If accessing a protected route without a session, redirect to login
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/login', req.url)
      // Preserve the intended destination for redirect after login
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If accessing login/signup while already logged in, redirect to dashboard
    if ((pathname === '/login' || pathname === '/signup') && session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    console.log('[middleware] Request processed successfully')
    return res
  } catch (error) {
    console.error('[middleware] Error caught:', error)
    console.error('[middleware] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    // Return the response to prevent complete failure
    return NextResponse.next()
  }
}

/**
 * Configure which paths the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
