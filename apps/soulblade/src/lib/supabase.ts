import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 필요합니다.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
