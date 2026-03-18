import { AuthClient, type AuthChangeEvent, type Session } from '@supabase/auth-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export type { AuthChangeEvent, Session }

// Auth-only client (avoids bundling realtime, storage, postgrest, functions)
export const supabaseAuth: InstanceType<typeof AuthClient> | null =
  supabaseUrl && supabaseAnonKey
    ? new AuthClient({
        url: `${supabaseUrl}/auth/v1`,
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      })
    : null
