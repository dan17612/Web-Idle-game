import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Supabase env vars fehlen. Kopiere .env.example nach .env und trage deine Keys ein.')
}

// detectSessionInUrl: false — wir parsen den Hash selbst in main.js,
// weil wir createWebHashHistory nutzen (URL: /#/…) und Supabase-Tokens
// im gleichen Hash landen (/#access_token=… bzw. /#/access_token=…).
export const supabase = createClient(url || 'http://localhost', key || 'anon', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'implicit' }
})

export const AUTH_REDIRECT_URL = window.location.origin + '/'
