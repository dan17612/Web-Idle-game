<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const newEmail = ref('')
const newUsername = ref('')
const newPassword = ref('')
const newPassword2 = ref('')
const newAvatar = ref('')
const deleteConfirm = ref('')
const busy = ref('')
const error = ref('')
const info = ref('')

const AVATAR_CHOICES = ['🐶','🐱','🐼','🦊','🐵','🐯','🦁','🐸','🐷','🐮','🦄','🐲','🦖','🐙','🐳','🦉','🦅','🐝','🐞','🌟','👑','🧙','🧛','🧑‍🚀','🤖','👾','🎮','🍕','🌈','🔥']

const currentEmail = computed(() => auth.user?.email || '')
const pendingEmail = computed(() => auth.user?.new_email || '')

function flash(msg, isError = false) {
  if (isError) {
    error.value = msg
    info.value = ''
  } else {
    info.value = msg
    error.value = ''
  }
  setTimeout(() => {
    if (isError) error.value = ''
    else info.value = ''
  }, 3500)
}

async function changeEmail() {
  const target = newEmail.value.trim()
  if (!target) return flash('E-Mail eingeben', true)
  if (target === currentEmail.value) return flash('Gleiche Adresse wie aktuell', true)
  busy.value = 'email'
  try {
    await auth.updateEmail(target)
    flash('Bestätigungs-Link gesendet. Beide Adressen müssen bestätigt werden.')
    newEmail.value = ''
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function changeUsername() {
  const target = newUsername.value.trim()
  if (!target) return flash('Username eingeben', true)
  busy.value = 'username'
  try {
    await auth.changeUsername(target)
    flash('Username geändert.')
    newUsername.value = ''
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function pickAvatar(emoji) {
  busy.value = 'avatar'
  try {
    await auth.setAvatar(emoji)
    flash('Avatar gesetzt.')
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function saveCustomAvatar() {
  const v = newAvatar.value.trim()
  if (!v) return flash('Emoji eingeben', true)
  await pickAvatar(v)
  newAvatar.value = ''
}

async function changePassword() {
  const p = newPassword.value
  const p2 = newPassword2.value
  if (!p || p.length < 6) return flash('Mind. 6 Zeichen', true)
  if (p !== p2) return flash('Passwörter stimmen nicht überein', true)
  busy.value = 'password'
  try {
    await auth.setPassword(p)
    flash('Passwort gespeichert.')
    newPassword.value = ''
    newPassword2.value = ''
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function linkGoogle() {
  if (auth.hasGoogleLinked) return flash('Google ist bereits verknüpft.')
  busy.value = 'google'
  try {
    await auth.linkGoogleIdentity()
    flash('Weiterleitung zu Google gestartet …')
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function unlinkGoogle() {
  if (!auth.hasGoogleLinked) return flash('Google ist nicht verknüpft.')
  busy.value = 'google-unlink'
  try {
    await auth.unlinkGoogleIdentity()
    flash('Google-Verknüpfung entfernt.')
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function requestData() {
  busy.value = 'export'
  try {
    const data = await auth.requestMyData()
    const payload = JSON.stringify(data ?? {}, null, 2)
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    a.href = url
    a.download = `zoo-empire-data-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    flash('Datenexport heruntergeladen.')
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function deleteAccount() {
  if (deleteConfirm.value.trim().toUpperCase() !== 'LOESCHEN') {
    return flash('Bitte zur Bestätigung LOESCHEN eingeben.', true)
  }
  busy.value = 'delete'
  try {
    await auth.deleteMyAccount()
    flash('Account gelöscht.')
    router.replace({ name: 'login' })
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function logout() {
  await auth.signOut()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="stack">
    <h1 class="title">Einstellungen</h1>

    <section class="card stack">
      <h2 style="margin:0">Konto</h2>
      <div class="row">
        <span>Avatar:</span>
        <b style="font-size:24px">{{ auth.profile?.avatar_emoji || '🐾' }}</b>
      </div>
      <div class="row"><span>Username:</span><b>{{ auth.profile?.username || '—' }}</b></div>
      <div class="row"><span>E-Mail:</span><b>{{ currentEmail }}</b></div>
      <div v-if="pendingEmail" class="row pending">
        <span>Ausstehend:</span><b>{{ pendingEmail }}</b>
      </div>
      <router-link class="hint-link" :to="{ name: 'privacy' }">Datenschutzerklärung</router-link>
    </section>

    <section class="card stack">
      <h2 style="margin:0">Avatar wählen</h2>
      <p class="hint">Wähle ein Emoji oder gib ein eigenes ein.</p>
      <div class="avatar-grid">
        <Button
          v-for="e in AVATAR_CHOICES"
          :key="e"
          class="avatar-cell"
          :class="{ active: auth.profile?.avatar_emoji === e }"
          :disabled="busy==='avatar'"
          @click="pickAvatar(e)"
        >{{ e }}</Button>
      </div>
      <div class="row" style="gap:6px">
        <InputText v-model="newAvatar" type="text" placeholder="🦖" maxlength="4" style="flex:1" />
        <Button class="btn secondary" :disabled="busy==='avatar'" @click="saveCustomAvatar">Setzen</Button>
      </div>
    </section>

    <p v-if="info" class="info">{{ info }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="card stack">
      <h2 style="margin:0">Username ändern</h2>
      <p class="hint">3-20 Zeichen, Buchstaben/Ziffern/_ . -</p>
      <InputText v-model="newUsername" type="text" placeholder="neuer_username" autocomplete="off" maxlength="20" />
      <Button class="btn" :disabled="busy==='username'" @click="changeUsername">
        {{ busy==='username' ? '...' : 'Username ändern' }}
      </Button>
    </section>

    <section class="card stack">
      <h2 style="margin:0">E-Mail ändern</h2>
      <p class="hint">Du erhältst einen Bestätigungs-Link per E-Mail. Beide Adressen (alt & neu) müssen bestätigt werden.</p>
      <InputText v-model="newEmail" type="email" placeholder="neue@adresse.de" autocomplete="email" />
      <Button class="btn" :disabled="busy==='email'" @click="changeEmail">
        {{ busy==='email' ? '...' : 'Bestätigungs-Link senden' }}
      </Button>
    </section>

    <section class="card stack">
      <h2 style="margin:0">Passwort</h2>
      <p class="hint">Setze oder ändere dein Passwort. Magic-Link-Login bleibt möglich.</p>
      <InputText v-model="newPassword" type="password" placeholder="Neues Passwort" autocomplete="new-password" />
      <InputText v-model="newPassword2" type="password" placeholder="Passwort wiederholen" autocomplete="new-password" />
      <Button class="btn" :disabled="busy==='password'" @click="changePassword">
        {{ busy==='password' ? '...' : 'Passwort speichern' }}
      </Button>
    </section>

    <section class="card stack">
      <h2 style="margin:0">Verknüpfte Konten</h2>
      <div class="row">
        <span>Google:</span>
        <b :class="auth.hasGoogleLinked ? 'linked-ok' : 'linked-no'">
          {{ auth.hasGoogleLinked ? 'Verknüpft' : 'Nicht verknüpft' }}
        </b>
      </div>
      <p class="hint">Verknüpfe dein Google-Konto, damit du dich auch mit Google anmelden kannst.</p>
      <div class="row account-actions">
        <Button class="btn" :disabled="busy==='google' || auth.hasGoogleLinked" @click="linkGoogle">
          {{ auth.hasGoogleLinked ? 'Bereits verknüpft' : busy==='google' ? '...' : 'Mit Google verknüpfen' }}
        </Button>
        <Button class="btn secondary" :disabled="busy==='google-unlink' || !auth.canUnlinkGoogle" @click="unlinkGoogle">
          {{ busy==='google-unlink' ? '...' : 'Verknüpfung aufheben' }}
        </Button>
      </div>
      <p class="hint">Du kannst die Verknüpfung jederzeit aufheben und dich weiter per Magic Link anmelden.</p>
    </section>

    <section class="card stack">
      <h2 style="margin:0">Daten anfordern</h2>
      <p class="hint">Lade deine gespeicherten Kontodaten als JSON-Datei herunter.</p>
      <Button class="btn secondary" :disabled="busy==='export'" @click="requestData">
        {{ busy==='export' ? '...' : 'Meine Daten herunterladen' }}
      </Button>
    </section>

    <section class="card stack danger-zone">
      <h2 style="margin:0">Account löschen</h2>
      <p class="hint">Diese Aktion ist endgültig. Gib zur Bestätigung LOESCHEN ein.</p>
      <InputText v-model="deleteConfirm" type="text" placeholder="LOESCHEN" autocomplete="off" />
      <Button class="btn danger" :disabled="busy==='delete'" @click="deleteAccount">
        {{ busy==='delete' ? '...' : 'Account endgültig löschen' }}
      </Button>
    </section>

    <section class="card stack">
      <Button class="btn danger" @click="logout">Abmelden</Button>
    </section>
  </div>
</template>

<style scoped>
.row { display: flex; justify-content: space-between; gap: 8px; }
.row.pending b { color: #e90; }
.hint { font-size: 12px; opacity: 0.75; margin: 0; }
.hint-link { font-size: 12px; color: var(--accent); text-decoration: underline; }
.info { color: #3a8; font-size: 14px; }
.btn.danger { background: #c33; color: #fff; }
.linked-ok { color: #3a8; }
.linked-no { color: #e90; }
.account-actions { justify-content: flex-start; gap: 8px; }
.danger-zone { border-color: #a33; }
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 6px;
}
.avatar-cell {
  background: #162048;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px 0;
  font-size: 22px;
  cursor: pointer;
  color: inherit;
  transition: transform 0.08s ease;
}
.avatar-cell:hover:not(:disabled) { transform: translateY(-2px); }
.avatar-cell.active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
</style>
