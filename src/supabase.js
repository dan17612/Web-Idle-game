import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Supabase env vars fehlen. Kopiere .env.example nach .env und trage deine Keys ein.')
}

// iOS (WKWebView/Safari) cached GET-Requests von Supabase aggressiv im
// URL-Cache. Dadurch liefert der „Aktualisieren"-Knopf oben rechts nach
// einem erneuten load() veraltete Daten aus dem Cache – erst ein kompletter
// App-Neustart leert diesen. cache: 'no-store' erzwingt bei jedem Request
// einen echten Netzabruf, damit Daten immer aktuell sind.
const noStoreFetch = (input, init = {}) =>
  fetch(input, { ...init, cache: 'no-store' })

// detectSessionInUrl: false — wir parsen den Hash selbst in main.js,
// weil wir createWebHashHistory nutzen (URL: /#/…) und Supabase-Tokens
// im gleichen Hash landen (/#access_token=… bzw. /#/access_token=…).
export const supabase = createClient(url || 'http://localhost', key || 'anon', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'implicit' },
  global: { fetch: noStoreFetch }
})

// Native (Android/iOS) nutzt Custom-URL-Scheme als Deep Link.
// Web nutzt aktuelle Origin (z. B. https://zooempire.schiller.pw/).
export const NATIVE_AUTH_REDIRECT_URL = 'pw.schiller.zooempire://auth/callback'
export const AUTH_REDIRECT_URL = Capacitor.isNativePlatform()
  ? NATIVE_AUTH_REDIRECT_URL
  : window.location.origin + '/'
