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

  // Use the local JWT as the immediate fallback, but prefer a bounded live
  // check so revoked sessions are noticed without recreating the old login
  // loop when edge-to-Supabase latency is high.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  let user = session?.user ?? null

  if (user) {
    const timeout = new Promise<{ timedOut: true }>((resolve) => {
      setTimeout(() => resolve({ timedOut: true }), 1500)
    })
    const liveResult = await Promise.race([
      supabase.auth.getUser().then(({ data }) => ({ user: data.user ?? null })),
      timeout,
    ])
    if (!('timedOut' in liveResult)) user = liveResult.user
  }

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
