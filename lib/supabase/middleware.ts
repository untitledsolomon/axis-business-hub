import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake can make it very difficult to
  // debug issues with users being logged out abnormally.

  // getUser() makes a live network call to Supabase Auth on every request
  // this middleware runs on. Without a timeout, a slow/hanging Auth response
  // can block the request all the way to Vercel's edge middleware limit,
  // producing a 504 MIDDLEWARE_INVOCATION_TIMEOUT for every route. Race it
  // against a hard timeout so we fail fast instead of hanging.
  const AUTH_TIMEOUT_MS = 5000

  let user = null
  let authTimedOut = false

  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('auth.getUser() timed out')), AUTH_TIMEOUT_MS)
      ),
    ])
    user = result.data.user
  } catch (err) {
    authTimedOut = true
    console.error('[middleware] auth.getUser() failed or timed out:', err)
  }

  if (
    (!user || authTimedOut) &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // No user (or the auth check itself failed/timed out): fail closed and
    // send to login rather than risk letting an unauthenticated request
    // through to financial data.
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as is. If you're creating a
  // new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but remember that it needs to depart from the current response!
  // If you are not allowed to use the cookies.setAll() method, you can use the following code:
  // supabaseResponse.cookies.getAll().forEach((cookie) => {
  //   myNewResponse.cookies.set(cookie.name, cookie.value, cookie.options)
  // })

  return supabaseResponse
}
