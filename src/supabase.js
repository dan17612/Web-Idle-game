import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Supabase env vars fehlen. Kopiere .env.example nach .env und trage deine Keys ein.')
}

export const supabase = createClient(url || 'http://localhost', key || 'anon', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})
