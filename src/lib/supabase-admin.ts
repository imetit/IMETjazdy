import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client with service role key.
 * Use ONLY for operations that require admin privileges:
 * - Creating/deleting users (auth.admin.*)
 * - Bypassing RLS for admin operations
 *
 * NEVER expose this client to the browser.
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
