import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { supabase } from './supabase'
import './styles.css'

// Supabase magic-link Redirects kommen als Fragment zurück.
// Weil wir createWebHashHistory nutzen, können Tokens in einer der Formen landen:
//   https://host/#access_token=…&refresh_token=…
//   https://host/#/access_token=…&refresh_token=…
//   https://host/#/#access_token=…&refresh_token=…
// Wir extrahieren access_token/refresh_token robust und setzen die Session manuell.
async function consumeAuthRedirect() {
  const raw = window.location.hash + window.location.search
  if (!raw) return
  const match = raw.match(/(access_token|error_description|error_code)=/)
  if (!match) return

  // Ab der ersten Token-Position parsen, führende #/? trimmen.
  const tail = raw.slice(match.index).replace(/^[#/?&]+/, '')
  const params = new URLSearchParams(tail)

  const errorDesc = params.get('error_description')
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')

  try {
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token })
    } else if (errorDesc) {
      console.warn('Supabase auth redirect error:', errorDesc)
    }
  } catch (e) {
    console.error('setSession failed', e)
  } finally {
    // URL säubern, damit Router nicht „access_token=…“ als Pfad interpretiert.
    history.replaceState(null, '', window.location.pathname + '#/')
  }
}

async function bootstrap() {
  await consumeAuthRedirect()

  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  const auth = useAuthStore(pinia)
  await auth.init()

  app.use(router)
  app.mount('#app')
}

bootstrap()

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW register failed', err))
  })
}
