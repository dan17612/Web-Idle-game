<script setup>
import { reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../supabase'

const auth = useAuthStore()
const mode = ref('login')         // 'login' | 'signup'
const method = ref('magic')       // 'magic' | 'password'
const form = reactive({ email: '', username: '', password: '' })
const error = ref('')
const info = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  info.value = ''
  busy.value = true
  try {
    const email = form.email.trim()
    if (mode.value === 'signup') {
      const uname = form.username.trim()
      if (uname.length < 3) throw new Error('Username mind. 3 Zeichen')
      const escaped = uname.replace(/[\\_%]/g, '\\$&')
      const { data: existing } = await supabase.from('profiles')
        .select('username').ilike('username', escaped).maybeSingle()
      if (existing) throw new Error('Username ist bereits vergeben (Groß-/Kleinschreibung wird ignoriert).')
      if (method.value === 'password') {
        if (!form.password || form.password.length < 6) throw new Error('Passwort mind. 6 Zeichen')
        await auth.signUpWithPassword(email, form.password, uname)
        info.value = 'Konto angelegt. Bestätige ggf. die E-Mail und melde dich dann an.'
      } else {
        await auth.sendMagicLink(email, uname)
        info.value = 'Link gesendet. Öffne ihn auf diesem Gerät.'
      }
    } else {
      if (method.value === 'password') {
        if (!form.password) throw new Error('Passwort eingeben')
        await auth.signInWithPassword(email, form.password)
        info.value = 'Angemeldet.'
      } else {
        await auth.sendMagicLink(email)
        info.value = 'Link gesendet. Prüfe dein Postfach.'
      }
    }
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="hero">🐾</div>
    <h1 class="title" style="text-align:center">Zoo Empire</h1>
    <p class="subtitle" style="text-align:center">Sammle Tiere, verdiene Münzen, tausche mit Freunden.</p>

    <div class="tabs">
      <button :class="{ active: mode==='login' }" @click="mode='login'">Login</button>
      <button :class="{ active: mode==='signup' }" @click="mode='signup'">Registrieren</button>
    </div>

    <div class="method-tabs">
      <button class="method-btn" :class="{ active: method==='magic' }" @click="method='magic'">✉️ Magic Link</button>
      <button class="method-btn" :class="{ active: method==='password' }" @click="method='password'">🔒 Passwort</button>
    </div>

    <form class="card stack" @submit.prevent="submit">
      <input v-if="mode==='signup'" v-model="form.username" placeholder="Username" autocomplete="username" />
      <input v-model="form.email" type="email" placeholder="E-Mail" autocomplete="email" required />
      <input
        v-if="method==='password'"
        v-model="form.password"
        type="password"
        :placeholder="mode==='signup' ? 'Passwort (min. 6 Zeichen)' : 'Passwort'"
        :autocomplete="mode==='signup' ? 'new-password' : 'current-password'"
      />
      <button class="btn full" :disabled="busy">
        {{ busy ? '...' :
          method==='magic'
            ? (mode === 'login' ? 'Magic Link senden' : 'Konto anlegen & Link senden')
            : (mode === 'login' ? 'Anmelden' : 'Konto anlegen') }}
      </button>
      <p class="hint">
        {{ method==='magic'
          ? 'Kein Passwort nötig — du bekommst einen Login-Link per E-Mail.'
          : 'Optional: Passwort-Anmeldung. Magic Link bleibt verfügbar.' }}
      </p>
      <p v-if="info" class="info">{{ info }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.auth-wrap { padding: 30px 4px; }
.hero { text-align: center; font-size: 72px; margin-top: 20px; }
.hint { font-size: 12px; opacity: 0.7; text-align: center; margin: 0; }
.info { color: #3a8; font-size: 14px; }
.method-tabs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
  margin: 10px 0;
}
.method-btn {
  background: #162048; border: 1px solid var(--border); border-radius: 10px;
  padding: 8px; color: inherit; cursor: pointer; font-weight: 600;
}
.method-btn.active { border-color: var(--accent); background: #1d2a5e; }
</style>
