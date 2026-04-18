<script setup>
import { reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const mode = ref('login')
const form = reactive({ email: '', username: '' })
const error = ref('')
const info = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  info.value = ''
  busy.value = true
  try {
    if (mode.value === 'signup') {
      if (!form.username || form.username.trim().length < 3) {
        throw new Error('Username mind. 3 Zeichen')
      }
      await auth.sendMagicLink(form.email.trim(), form.username.trim())
    } else {
      await auth.sendMagicLink(form.email.trim())
    }
    info.value = 'Link gesendet. Prüfe dein Postfach und öffne den Login-Link auf diesem Gerät.'
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

    <form class="card stack" @submit.prevent="submit">
      <input v-if="mode==='signup'" v-model="form.username" placeholder="Username" autocomplete="username" />
      <input v-model="form.email" type="email" placeholder="E-Mail" autocomplete="email" required />
      <button class="btn full" :disabled="busy">
        {{ busy ? '...' : (mode === 'login' ? 'Magic Link senden' : 'Konto anlegen & Link senden') }}
      </button>
      <p class="hint">Kein Passwort nötig — du bekommst einen Login-Link per E-Mail.</p>
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
</style>
