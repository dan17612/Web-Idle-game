<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const mode = ref('login')
const form = reactive({ email: '', password: '', username: '' })
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (mode.value === 'login') {
      await auth.signIn(form.email, form.password)
    } else {
      if (!form.username || form.username.length < 3) throw new Error('Username mind. 3 Zeichen')
      await auth.signUp(form.email, form.password, form.username.trim())
    }
    await auth.loadProfile()
    router.replace({ name: 'game' })
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
      <input v-model="form.password" type="password" placeholder="Passwort" autocomplete="current-password" required />
      <button class="btn full" :disabled="busy">
        {{ busy ? '...' : (mode === 'login' ? 'Einloggen' : 'Konto erstellen') }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.auth-wrap { padding: 30px 4px; }
.hero { text-align: center; font-size: 72px; margin-top: 20px; }
</style>
