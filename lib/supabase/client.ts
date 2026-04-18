import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a dummy client for build time if env vars are missing
    // This allows static generation to proceed
    return {} as unknown as SupabaseClient
  }

  return createBrowserClient(url, key)
}
