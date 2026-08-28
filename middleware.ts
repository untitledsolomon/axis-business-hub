import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Allow signup page
  if (request.nextUrl.pathname.startsWith('/signup')) {
    return
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Exclude static assets AND all API routes. API routes (webhooks like
    // /api/paddle/webhook, third-party callbacks, etc.) must never be
    // gated by this page-level session redirect — external callers have
    // no Supabase session cookie and were being bounced to /login with a
    // 307 before ever reaching the route handler. Each API route is
    // responsible for its own auth (e.g. verifying the Paddle webhook
    // signature) rather than relying on this middleware.
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
