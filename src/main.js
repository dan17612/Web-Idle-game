import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { supabase } from './supabase'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Select from 'primevue/select'
import './styles.css'
import 'primeicons/primeicons.css'
// Zoom global deaktivieren (Pinch, Double-Tap, Gesture-Zoom).
function disableZoomGestures() {
  let lastTouchEnd = 0

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault()
  }, { passive: false })

  document.addEventListener('touchend', (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) e.preventDefault()
    lastTouchEnd = now
  }, { passive: false })

  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false })
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false })
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false })
  document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false })

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) e.preventDefault()
  }, { passive: false })
}

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
  app.use(PrimeVue, {
    theme: {
      preset: Aura
    }
  })
  app.component('Button', Button)
  app.component('InputText', InputText)
  app.component('Textarea', Textarea)
  app.component('Checkbox', Checkbox)
  app.component('Select', Select)

  const auth = useAuthStore(pinia)
  await auth.init()

  app.use(router)
  app.mount('#app')
}

disableZoomGestures()
bootstrap()

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW register failed', err))
  })
}
