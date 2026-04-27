<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { localePreference, setLocale, t, LOCALE_OPTIONS } from '../i18n'
import { animationsEnabled } from '../composables/useAnimations'

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

const supportSubject = ref('')
const supportMessage = ref('')
const supportNotifyCopy = ref(false)

const AVATAR_CHOICES = ['🐶','🐱','🐼','🦊','🐵','🐯','🦁','🐸','🐷','🐮','🦄','🐲','🦖','🐙','🐳','🦉','🦅','🐝','🐞','🌟','👑','🧙','🧛','🧑‍🚀','🤖','👾','🎮','🍕','🌈','🔥']

const currentEmail = computed(() => auth.user?.email || '')
const pendingEmail = computed(() => auth.user?.new_email || '')
const localeOptions = computed(() =>
  LOCALE_OPTIONS.map((code) => ({ code, label: t(`languages.${code}`) }))
)
const selectedLocale = computed({
  get: () => localePreference.value,
  set: (value) => {
    setLocale(value)
    flash(t('settings.languageSaved'))
  }
})

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
  if (!target) return flash(t('settingsFlash.enterEmail'), true)
  if (target === currentEmail.value) return flash(t('settingsFlash.sameEmail'), true)
  busy.value = 'email'
  try {
    await auth.updateEmail(target)
    flash(t('settingsFlash.emailConfirmSent'))
    newEmail.value = ''
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function changeUsername() {
  const target = newUsername.value.trim()
  if (!target) return flash(t('settingsFlash.enterUsername'), true)
  busy.value = 'username'
  try {
    await auth.changeUsername(target)
    flash(t('settingsFlash.usernameChanged'))
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
    flash(t('settingsFlash.avatarSet'))
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function saveCustomAvatar() {
  const v = newAvatar.value.trim()
  if (!v) return flash(t('settingsFlash.enterEmoji'), true)
  await pickAvatar(v)
  newAvatar.value = ''
}

async function changePassword() {
  const p = newPassword.value
  const p2 = newPassword2.value
  if (!p || p.length < 6) return flash(t('settingsFlash.passwordMin'), true)
  if (p !== p2) return flash(t('settingsFlash.passwordMismatch'), true)
  busy.value = 'password'
  try {
    await auth.setPassword(p)
    flash(t('settingsFlash.passwordSaved'))
    newPassword.value = ''
    newPassword2.value = ''
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function linkGoogle() {
  if (auth.hasGoogleLinked) return flash(t('settingsFlash.googleAlreadyLinked'))
  busy.value = 'google'
  try {
    await auth.linkGoogleIdentity()
    flash(t('settingsFlash.redirectToGoogle'))
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function unlinkGoogle() {
  if (!auth.hasGoogleLinked) return flash(t('storeErrors.googleNotLinked'))
  busy.value = 'google-unlink'
  try {
    await auth.unlinkGoogleIdentity()
    flash(t('settingsFlash.googleUnlinked'))
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
    flash(t('settingsFlash.dataExportDownloaded'))
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function deleteAccount() {
  if (deleteConfirm.value.trim().toUpperCase() !== 'LOESCHEN') {
    return flash(t('settingsFlash.typeDeleteToConfirm'), true)
  }
  busy.value = 'delete'
  try {
    await auth.deleteMyAccount()
    flash(t('settingsFlash.accountDeleted'))
    router.replace({ name: 'login' })
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}

async function submitSupport() {
  const subject = supportSubject.value.trim()
  const message = supportMessage.value.trim()
  if (!subject) return flash(t('settings.supportEnterSubject'), true)
  if (!message) return flash(t('settings.supportEnterMessage'), true)
  busy.value = 'support'
  try {
    const res = await auth.submitSupportTicket(subject, message, supportNotifyCopy.value)
    const number = res?.ticket_number || '?'
    const key = res?.notified_user ? 'settings.supportSentWithMail' : 'settings.supportSent'
    flash(t(key, { number }))
    supportSubject.value = ''
    supportMessage.value = ''
    supportNotifyCopy.value = false
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
    <h1 class="title">{{ t('settings.title') }}</h1>

    <section class="card stack">
      <h2 style="margin:0">{{ t('settings.languageTitle') }}</h2>
      <p class="hint">{{ t('settings.languageHint') }}</p>
      <Select
        v-model="selectedLocale"
        :options="localeOptions"
        optionLabel="label"
        optionValue="code" />
    </section>

    <section class="card stack">
      <h2 style="margin:0">{{ t('settings.animationsTitle') }}</h2>
      <p class="hint">{{ t('settings.animationsHint') }}</p>
      <label class="row" style="gap:8px; justify-content:flex-start; align-items:center">
        <Checkbox v-model="animationsEnabled" :binary="true" inputId="anim-toggle" />
        <span style="font-size:14px">{{ t('settings.animationsLabel') }}</span>
      </label>
    </section>

    <section class="card stack">
      <h2 style="margin:0">{{ t('settings.account') }}</h2>
      <div class="row">
        <span>{{ t('settings.avatar') }}:</span>
        <b style="font-size:24px">{{ auth.profile?.avatar_emoji || '🐾' }}</b>
      </div>
      <div class="row"><span>{{ t('settings.username') }}:</span><b>{{ auth.profile?.username || '—' }}</b></div>
      <div class="row"><span>{{ t('settings.email') }}:</span><b>{{ currentEmail }}</b></div>
      <div v-if="pendingEmail" class="row pending">
        <span>{{ t('settings.pending') }}:</span><b>{{ pendingEmail }}</b>
      </div>
      <router-link class="hint-link" :to="{ name: 'privacy' }">{{ t('settings.privacy') }}</router-link>
    </section>

    <section class="card stack">
      <h2 style="margin:0">{{ t('settings.chooseAvatar') }}</h2>
      <p class="hint">{{ t('settings.chooseAvatarHint') }}</p>
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
        <Button class="btn secondary" :disabled="busy==='avatar'" @click="saveCustomAvatar">{{ t('settings.set') }}</Button>
      </div>
    </section>

    <p v-if="info" class="info">{{ info }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="card stack">
      <h2 style="margin:0">{{ t('settings.usernameChangeTitle') }}</h2>
      <p class="hint">{{ t('settings.usernameChangeHint') }}</p>
      <InputText v-model="newUsername" type="text" placeholder="neuer_username" autocomplete="off" maxlength="20" />
      <Button class="btn" :disabled="busy==='username'" @click="changeUsername">
        {{ busy==='username' ? t('common.loadingShort') : t('settings.usernameChangeAction') }}
      </Button>
    </section>

    <section class="card stack">
      <h2 style="margin:0">{{ t('settings.emailChangeTitle') }}</h2>
      <p class="hint">{{ t('settings.emailChangeHint') }}</p>
      <InputText v-model="newEmail" type="email" placeholder="neue@adresse.de" autocomplete="email" />
      <Button class="btn" :disabled="busy==='email'" @click="changeEmail">
        {{ busy==='email' ? t('common.loadingShort') : t('settings.emailChangeAction') }}
      </Button>
    </section>

    <section class="card stack">
      <h2 style="margin:0">{{ t('settings.passwordTitle') }}</h2>
      <p class="hint">{{ t('settings.passwordHint') }}</p>
      <InputText v-model="newPassword" type="password" :placeholder="t('settings.newPassword')" autocomplete="new-password" />
      <InputText v-model="newPassword2" type="password" :placeholder="t('settings.repeatPassword')" autocomplete="new-password" />
      <Button class="btn" :disabled="busy==='password'" @click="changePassword">
        {{ busy==='password' ? t('common.loadingShort') : t('settings.savePassword') }}
      </Button>
    </section>

    <section class="card stack">
      <h2 style="margin:0">{{ t('settings.linkedAccounts') }}</h2>
      <div class="row">
        <span>{{ t('settings.google') }}:</span>
        <b :class="auth.hasGoogleLinked ? 'linked-ok' : 'linked-no'">
          {{ auth.hasGoogleLinked ? t('settings.linked') : t('settings.notLinked') }}
        </b>
      </div>
      <p class="hint">{{ t('settings.linkGoogleHint') }}</p>
      <div class="row account-actions">
        <Button class="btn" :disabled="busy==='google' || auth.hasGoogleLinked" @click="linkGoogle">
          {{ auth.hasGoogleLinked ? t('settings.alreadyLinked') : busy==='google' ? t('common.loadingShort') : t('settings.linkGoogle') }}
        </Button>
        <Button class="btn secondary" :disabled="busy==='google-unlink' || !auth.canUnlinkGoogle" @click="unlinkGoogle">
          {{ busy==='google-unlink' ? t('common.loadingShort') : t('settings.unlinkGoogle') }}
        </Button>
      </div>
      <p class="hint">{{ t('settings.unlinkHint') }}</p>
    </section>

    <section class="card stack">
      <h2 style="margin:0">{{ t('settings.supportTitle') }}</h2>
      <p class="hint">{{ t('settings.supportHint') }}</p>
      <InputText
        v-model="supportSubject"
        type="text"
        :placeholder="t('settings.supportSubjectPlaceholder')"
        maxlength="200"
      />
      <Textarea
        v-model="supportMessage"
        :placeholder="t('settings.supportMessagePlaceholder')"
        rows="5"
        maxlength="5000"
        autoResize
      />
      <label class="row" style="gap:8px; justify-content:flex-start; align-items:center">
        <Checkbox v-model="supportNotifyCopy" :binary="true" inputId="support-notify-copy" />
        <span style="font-size:13px">{{ t('settings.supportNotifyCopy') }}</span>
      </label>
      <Button class="btn" :disabled="busy==='support'" @click="submitSupport">
        {{ busy==='support' ? t('common.loadingShort') : t('settings.supportSubmit') }}
      </Button>
    </section>

    <section class="card stack">
      <h2 style="margin:0">{{ t('settings.exportTitle') }}</h2>
      <p class="hint">{{ t('settings.exportHint') }}</p>
      <Button class="btn secondary" :disabled="busy==='export'" @click="requestData">
        {{ busy==='export' ? t('common.loadingShort') : t('settings.exportAction') }}
      </Button>
    </section>

    <section class="card stack danger-zone">
      <h2 style="margin:0">{{ t('settings.deleteTitle') }}</h2>
      <p class="hint">{{ t('settings.deleteHint') }}</p>
      <InputText v-model="deleteConfirm" type="text" placeholder="LOESCHEN" autocomplete="off" />
      <Button class="btn danger" :disabled="busy==='delete'" @click="deleteAccount">
        {{ busy==='delete' ? t('common.loadingShort') : t('settings.deleteAction') }}
      </Button>
    </section>

    <section class="card stack">
      <Button class="btn danger" @click="logout">{{ t('settings.logout') }}</Button>
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
