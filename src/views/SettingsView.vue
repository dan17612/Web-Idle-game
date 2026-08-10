<script setup>
import { ref, computed, onUnmounted } from 'vue'
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

const expanded = ref('')
function toggleExpand(key) {
  expanded.value = expanded.value === key ? '' : key
}

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
const friendRequestsEnabled = computed(() => auth.profile?.friend_requests_enabled !== false)

let flashTimer = null
function flash(msg, isError = false) {
  if (isError) {
    error.value = msg
    info.value = ''
  } else {
    info.value = msg
    error.value = ''
  }
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    info.value = ''
    error.value = ''
    flashTimer = null
  }, 3500)
}

onUnmounted(() => {
  if (flashTimer) clearTimeout(flashTimer)
})

async function changeEmail() {
  const target = newEmail.value.trim()
  if (!target) return flash(t('settingsFlash.enterEmail'), true)
  if (target === currentEmail.value) return flash(t('settingsFlash.sameEmail'), true)
  busy.value = 'email'
  try {
    await auth.updateEmail(target)
    flash(t('settingsFlash.emailConfirmSent'))
    newEmail.value = ''
    expanded.value = ''
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
    expanded.value = ''
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

async function setFriendRequestsEnabled(value) {
  if (!auth.profile || busy.value === 'friend-requests') return
  busy.value = 'friend-requests'
  try {
    await auth.setFriendRequestsEnabled(value)
    flash(t('settings.friendRequestsSaved'))
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
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
    expanded.value = ''
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
  if (deleteConfirm.value.trim().toUpperCase() !== 'LÖSCHEN') {
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
  <div class="settings-view">
    <header class="settings-head">
      <h1 class="settings-title">{{ t('settings.title') }}</h1>
      <Button
        class="settings-logout"
        :aria-label="t('settings.logout')"
        :title="t('settings.logout')"
        @click="logout"
      >
        <i class="pi pi-sign-out" />
      </Button>
    </header>

    <p v-if="info" class="flash flash-info">{{ info }}</p>
    <p v-if="error" class="flash flash-error">{{ error }}</p>

    <!-- ╭─ DARSTELLUNG ────────────────────────────────╮ -->
    <h2 class="cluster-head">{{ t('settings.clusterAppearance') }}</h2>
    <section class="card cluster">
      <div class="prefs">
        <div class="pref-row">
          <div class="pref-text">
            <span class="pref-title">{{ t('settings.languageTitle') }}</span>
            <span class="pref-desc">{{ t('settings.languageHint') }}</span>
          </div>
          <Select
            v-model="selectedLocale"
            :options="localeOptions"
            optionLabel="label"
            optionValue="code"
            class="pref-select"
          />
        </div>

        <div class="pref-sep" />

        <label class="pref-row pref-clickable" for="animations-enabled">
          <div class="pref-text">
            <span class="pref-title">{{ t('settings.animationsTitle') }}</span>
            <span class="pref-desc">{{ t('settings.animationsHint') }}</span>
          </div>
          <ToggleSwitch
            v-model="animationsEnabled"
            inputId="animations-enabled"
            :aria-label="t('settings.animationsLabel')"
          />
        </label>
      </div>
    </section>

    <!-- ╭─ PROFIL ────────────────────────────────────╮ -->
    <h2 class="cluster-head">{{ t('settings.clusterAccount') }}</h2>
    <section class="card cluster">
      <div class="profile-head">
        <div class="profile-avatar" @click="toggleExpand('avatar')">
          {{ auth.profile?.avatar_emoji || '🐾' }}
        </div>
        <div class="profile-meta">
          <div class="profile-name">{{ auth.profile?.username || '—' }}</div>
          <div class="profile-email">{{ currentEmail }}</div>
          <div v-if="pendingEmail" class="profile-pending">
            {{ t('settings.pending') }}: {{ pendingEmail }}
          </div>
        </div>
      </div>

      <div class="prefs">
        <!-- Avatar -->
        <button
          type="button"
          class="pref-row pref-clickable"
          :class="{ open: expanded === 'avatar' }"
          @click="toggleExpand('avatar')"
        >
          <div class="pref-text">
            <span class="pref-title">{{ t('settings.chooseAvatar') }}</span>
            <span class="pref-desc">{{ t('settings.chooseAvatarHint') }}</span>
          </div>
          <i class="pi pi-chevron-down pref-chevron" />
        </button>
        <div v-if="expanded === 'avatar'" class="pref-body">
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
          <div class="inline-row">
            <InputText v-model="newAvatar" type="text" placeholder="🦖" maxlength="4" class="grow" />
            <Button class="btn secondary" :disabled="busy==='avatar'" @click="saveCustomAvatar">{{ t('settings.set') }}</Button>
          </div>
        </div>

        <div class="pref-sep" />

        <!-- Username -->
        <button
          type="button"
          class="pref-row pref-clickable"
          :class="{ open: expanded === 'username' }"
          @click="toggleExpand('username')"
        >
          <div class="pref-text">
            <span class="pref-title">{{ t('settings.usernameChangeTitle') }}</span>
            <span class="pref-desc">{{ t('settings.usernameChangeHint') }}</span>
          </div>
          <i class="pi pi-chevron-down pref-chevron" />
        </button>
        <div v-if="expanded === 'username'" class="pref-body">
          <InputText v-model="newUsername" type="text" placeholder="neuer_username" autocomplete="off" maxlength="20" />
          <Button class="btn" :disabled="busy==='username'" @click="changeUsername">
            {{ busy==='username' ? t('common.loadingShort') : t('settings.usernameChangeAction') }}
          </Button>
        </div>

        <div class="pref-sep" />

        <!-- Email -->
        <button
          type="button"
          class="pref-row pref-clickable"
          :class="{ open: expanded === 'email' }"
          @click="toggleExpand('email')"
        >
          <div class="pref-text">
            <span class="pref-title">{{ t('settings.emailChangeTitle') }}</span>
            <span class="pref-desc">{{ t('settings.emailChangeHint') }}</span>
          </div>
          <i class="pi pi-chevron-down pref-chevron" />
        </button>
        <div v-if="expanded === 'email'" class="pref-body">
          <InputText v-model="newEmail" type="email" placeholder="neue@adresse.de" autocomplete="email" />
          <Button class="btn" :disabled="busy==='email'" @click="changeEmail">
            {{ busy==='email' ? t('common.loadingShort') : t('settings.emailChangeAction') }}
          </Button>
        </div>

        <div class="pref-sep" />

        <!-- Password -->
        <button
          type="button"
          class="pref-row pref-clickable"
          :class="{ open: expanded === 'password' }"
          @click="toggleExpand('password')"
        >
          <div class="pref-text">
            <span class="pref-title">{{ t('settings.passwordTitle') }}</span>
            <span class="pref-desc">{{ t('settings.passwordHint') }}</span>
          </div>
          <i class="pi pi-chevron-down pref-chevron" />
        </button>
        <div v-if="expanded === 'password'" class="pref-body">
          <InputText v-model="newPassword" type="password" :placeholder="t('settings.newPassword')" autocomplete="new-password" />
          <InputText v-model="newPassword2" type="password" :placeholder="t('settings.repeatPassword')" autocomplete="new-password" />
          <Button class="btn" :disabled="busy==='password'" @click="changePassword">
            {{ busy==='password' ? t('common.loadingShort') : t('settings.savePassword') }}
          </Button>
        </div>

        <div class="pref-sep" />

        <!-- Google -->
        <div class="pref-row">
          <div class="pref-text">
            <span class="pref-title">{{ t('settings.google') }}</span>
            <span class="pref-desc">{{ t('settings.linkGoogleHint') }}</span>
          </div>
          <span class="pref-status" :class="auth.hasGoogleLinked ? 'ok' : 'warn'">
            {{ auth.hasGoogleLinked ? t('settings.linked') : t('settings.notLinked') }}
          </span>
        </div>
        <div class="pref-body inline-row">
          <Button class="btn grow" :disabled="busy==='google' || auth.hasGoogleLinked" @click="linkGoogle">
            {{ auth.hasGoogleLinked ? t('settings.alreadyLinked') : busy==='google' ? t('common.loadingShort') : t('settings.linkGoogle') }}
          </Button>
          <Button class="btn secondary grow" :disabled="busy==='google-unlink' || !auth.canUnlinkGoogle" @click="unlinkGoogle">
            {{ busy==='google-unlink' ? t('common.loadingShort') : t('settings.unlinkGoogle') }}
          </Button>
        </div>
      </div>
    </section>

    <!-- ╭─ DATENSCHUTZ ───────────────────────────────╮ -->
    <h2 class="cluster-head">{{ t('settings.clusterPrivacy') }}</h2>
    <section class="card cluster">
      <div class="prefs">
        <label class="pref-row pref-clickable" for="friend-requests-enabled">
          <div class="pref-text">
            <span class="pref-title">{{ t('settings.friendRequestsEnabled') }}</span>
            <span class="pref-desc">{{ t('settings.friendRequestsHint') }}</span>
          </div>
          <ToggleSwitch
            :modelValue="friendRequestsEnabled"
            inputId="friend-requests-enabled"
            :disabled="busy==='friend-requests'"
            @update:modelValue="setFriendRequestsEnabled"
          />
        </label>

        <div class="pref-sep" />

        <router-link class="pref-row pref-clickable" :to="{ name: 'privacy' }">
          <div class="pref-text">
            <span class="pref-title">{{ t('settings.privacy') }}</span>
          </div>
          <i class="pi pi-chevron-right pref-chevron static" />
        </router-link>

        <div class="pref-sep" />

        <div class="pref-row">
          <div class="pref-text">
            <span class="pref-title">{{ t('settings.exportTitle') }}</span>
            <span class="pref-desc">{{ t('settings.exportHint') }}</span>
          </div>
          <Button class="btn secondary pref-action" :disabled="busy==='export'" @click="requestData">
            {{ busy==='export' ? t('common.loadingShort') : t('settings.exportAction') }}
          </Button>
        </div>
      </div>
    </section>

    <!-- ╭─ SUPPORT ───────────────────────────────────╮ -->
    <h2 class="cluster-head">{{ t('settings.clusterSupport') }}</h2>
    <section class="card cluster">
      <p class="cluster-desc">{{ t('settings.supportHint') }}</p>
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
      <label class="check-row">
        <Checkbox v-model="supportNotifyCopy" :binary="true" inputId="support-notify-copy" />
        <span>{{ t('settings.supportNotifyCopy') }}</span>
      </label>
      <Button class="btn" :disabled="busy==='support'" @click="submitSupport">
        {{ busy==='support' ? t('common.loadingShort') : t('settings.supportSubmit') }}
      </Button>
    </section>

    <!-- ╭─ GEFAHRENZONE ──────────────────────────────╮ -->
    <h2 class="cluster-head danger">{{ t('settings.clusterDanger') }}</h2>
    <section class="card cluster danger-zone">
      <p class="cluster-desc">{{ t('settings.deleteHint') }}</p>
      <button
        type="button"
        class="pref-row pref-clickable"
        :class="{ open: expanded === 'delete' }"
        @click="toggleExpand('delete')"
      >
        <div class="pref-text">
          <span class="pref-title danger">{{ t('settings.deleteAction') }}</span>
        </div>
        <i class="pi pi-chevron-down pref-chevron" />
      </button>
      <div v-if="expanded === 'delete'" class="pref-body">
        <InputText v-model="deleteConfirm" type="text" placeholder="LÖSCHEN" autocomplete="off" />
        <Button class="btn danger" :disabled="busy==='delete'" @click="deleteAccount">
          {{ busy==='delete' ? t('common.loadingShort') : t('settings.deleteAction') }}
        </Button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-5);
}

/* ── Header ───────────────────────────────────────────────── */
.settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin: var(--space-1) 0 var(--space-2);
}
.settings-title {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
}
.p-button.settings-logout {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 999px;
  background: rgba(239, 71, 111, 0.08);
  border: 1px solid rgba(239, 71, 111, 0.35);
  color: var(--danger);
  font-size: 16px;
}
.p-button.settings-logout:not(:disabled):hover {
  background: rgba(239, 71, 111, 0.18);
  border-color: var(--danger);
  color: var(--danger);
}

/* ── Flash ─────────────────────────────────────────────────── */
.flash {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: 12px;
  font-size: 14px;
}
.flash-info {
  background: rgba(46, 194, 114, 0.1);
  border: 1px solid rgba(46, 194, 114, 0.35);
  color: var(--accent-2);
}
.flash-error {
  background: rgba(239, 71, 111, 0.1);
  border: 1px solid rgba(239, 71, 111, 0.35);
  color: var(--danger);
}

/* ── Cluster headers ──────────────────────────────────────── */
.cluster-head {
  margin: var(--space-4) var(--space-3) var(--space-2);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
}
.cluster-head.danger { color: var(--danger); }
.cluster {
  margin-bottom: 0;
  padding: var(--space-2) var(--space-3);
}
.cluster-desc {
  margin: 0 0 var(--space-2);
  font-size: 13px;
  color: var(--muted);
  line-height: 1.4;
}

/* ── Prefs (row-based list) ───────────────────────────────── */
.prefs {
  display: flex;
  flex-direction: column;
}
.pref-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 56px;
  padding: var(--space-2) 0;
  background: transparent;
  border: none;
  color: inherit;
  text-align: left;
  width: 100%;
  text-decoration: none;
}
.pref-clickable {
  cursor: pointer;
  transition: opacity 0.12s ease;
}
.pref-clickable:hover { opacity: 0.85; }
.pref-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.pref-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.pref-title.danger { color: var(--danger); }
.pref-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.35;
}
.pref-chevron {
  color: var(--muted);
  font-size: 12px;
  transition: transform 0.18s ease;
  flex-shrink: 0;
}
.pref-row.open .pref-chevron { transform: rotate(180deg); }
.pref-chevron.static { transform: none !important; }
.pref-status {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  flex-shrink: 0;
}
.pref-status.ok {
  color: var(--accent-2);
  background: rgba(46, 194, 114, 0.12);
  border: 1px solid rgba(46, 194, 114, 0.35);
}
.pref-status.warn {
  color: #f0a312;
  background: rgba(255, 179, 71, 0.12);
  border: 1px solid rgba(255, 179, 71, 0.35);
}
.p-button.pref-action {
  padding: 8px 14px;
  font-size: 13px;
  flex-shrink: 0;
}
.pref-select { min-width: 130px; max-width: 50%; }
.pref-sep {
  height: 1px;
  background: var(--border);
  opacity: 0.45;
}
.pref-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) 0 var(--space-3);
}

/* ── Profile head ─────────────────────────────────────────── */
.profile-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0 var(--space-3);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-2);
}
.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--card-2), var(--card-2));
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s ease;
}
.profile-avatar:hover { border-color: var(--accent); }
.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.profile-name {
  font-weight: 800;
  font-size: 17px;
  color: var(--text);
}
.profile-email {
  font-size: 13px;
  color: var(--muted);
  word-break: break-all;
}
.profile-pending {
  font-size: 12px;
  color: #e90;
  word-break: break-all;
}

/* ── Inline rows ──────────────────────────────────────────── */
.inline-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.grow { flex: 1; min-width: 0; }

/* ── Check row (non-toggle) ───────────────────────────────── */
.check-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 13px;
  padding: var(--space-1) 0;
}

/* ── Avatar picker ────────────────────────────────────────── */
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: var(--space-1);
}
.avatar-cell {
  background: var(--card-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px 0;
  font-size: 22px;
  cursor: pointer;
  color: inherit;
  transition: transform 0.08s ease;
  aspect-ratio: 1;
}
.avatar-cell:hover:not(:disabled) { transform: translateY(-2px); }
.avatar-cell.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent) inset;
}

/* ── Danger zone ──────────────────────────────────────────── */
.danger-zone { border-color: rgba(239, 71, 111, 0.45); }
</style>
