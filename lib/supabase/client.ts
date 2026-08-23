import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // During static builds or environments without env vars, return a
    // lightweight no-op client that is chainable and thenable. This avoids
    // throwing at build/prerender time while preserving runtime behaviour
    // when the real env vars are present.
    //
    // Important: this client is only intended to make static prerendering
    // succeed. Runtime usage requires proper NEXT_PUBLIC_SUPABASE_* env
    // variables; otherwise API calls will return empty results.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const noopQuery: Record<string, unknown> & { then?: (res: any) => any } = {
      select: () => noopQuery,
      eq: () => noopQuery,
      gte: () => noopQuery,
      lte: () => noopQuery,
      order: () => noopQuery,
      single: async () => ({ data: null, error: null }),
      update: () => ({ select: async () => ({ data: null, error: null }) }),
      delete: async () => ({ data: null, error: null }),
      insert: async () => ({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: null, error: null }),
    }

    const noopClient: Record<string, unknown> = {
      from: () => noopQuery,
      rpc: async () => ({ data: null, error: null }),
      auth: {
        getSession: async () => ({ data: null }),
      },
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return noopClient as unknown as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(url, key)
}