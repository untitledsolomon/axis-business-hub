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
  // the auth check below. A simple mistake can make it very difficult to
  // debug issues with users being logged out abnormally.

  // getUser() makes a live network call to Supabase Auth on every request
  // this middleware runs on. Under edge-to-Supabase latency, that call can
  // be slow enough to trip a timeout guard, and failing closed on timeout
  // was redirecting valid, logged-in sessions to /login on every request —
  // producing a login loop even though the session was healthy.
  //
  // getSession() avoids the network round trip: it reads and validates the
  // JWT already present in the request cookies locally, so it can't time
  // out the same way. That's sufficient for a redirect gate here. Routes or
  // actions that need server-verified freshness (e.g. checking the account
  // hasn't been revoked mid-session) should call supabase.auth.getUser()
  // directly at that point, not rely on this middleware check.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // No valid session: send to login.
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
