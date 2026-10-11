<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { locale } from '../i18n'
import { useAppToast } from '../composables/useAppToast'
import { formatLegalVersion } from '../legal'

// Pflicht-Zustimmung zu Nutzungsbedingungen und Datenschutz. Nicht wegklickbar.
// Auf /terms und /privacy blendet App.vue das Fenster aus (src/legal.js).
// Spec: docs/superpowers/specs/2026-10-11-regelwerk-zustimmung-design.md

const game = useGameStore()
const auth = useAuthStore()
const router = useRouter()
const appToast = useAppToast()

const I18N = {
  de: {
    title: 'Regeln und Datenschutz',
    lead: 'Bevor du weiterspielst, lies bitte unsere Nutzungsbedingungen und die Datenschutzerklärung und stimme ihnen zu.',
    updated: 'Wir haben unsere Regeln überarbeitet (Stand {date}). Bitte stimme der neuen Fassung zu.',
    summaryTitle: 'Das Wichtigste in Kürze',
    summary: [
      'Spiel selbst: keine Makros, Autoklicker, Bots oder Skripte, auch nicht über Nacht.',
      'Ein Konto pro Person, keine Zweitkonten zum Zuschieben.',
      'Kein Handel mit Spielinhalten gegen echtes Geld.',
      'Respektvoller Umgang mit anderen Spielern und dem Support.',
      'Bei Verstößen: Verwarnung, Entfernen der dadurch erlangten Vorteile oder Sperre.'
    ],
    terms: 'Nutzungsbedingungen lesen',
    privacy: 'Datenschutzerklärung lesen',
    check: 'Ich habe die Nutzungsbedingungen und die Datenschutzerklärung gelesen und stimme ihnen zu.',
    accept: 'Zustimmen und weiterspielen',
    decline: 'Ablehnen und abmelden',
    error: 'Speichern hat nicht geklappt, bitte versuch es noch einmal.',
    done: 'Danke! Viel Spaß beim Spielen.'
  },
  en: {
    title: 'Rules and privacy',
    lead: 'Before you keep playing, please read our terms of use and privacy policy and accept them.',
    updated: 'We have updated our rules (version {date}). Please accept the new version.',
    summaryTitle: 'The key points',
    summary: [
      'Play yourself: no macros, auto clickers, bots or scripts, not even overnight.',
      'One account per person, no second accounts to push items around.',
      'No trading of game content for real money.',
      'Treat other players and the support team with respect.',
      'Violations lead to a warning, removal of the gained advantages or a ban.'
    ],
    terms: 'Read the terms of use',
    privacy: 'Read the privacy policy',
    check: 'I have read the terms of use and the privacy policy and accept them.',
    accept: 'Accept and keep playing',
    decline: 'Decline and log out',
    error: 'Saving failed, please try again.',
    done: 'Thanks! Have fun playing.'
  },
  ru: {
    title: 'Правила и конфиденциальность',
    lead: 'Прежде чем продолжить игру, прочитайте, пожалуйста, условия использования и политику конфиденциальности и примите их.',
    updated: 'Мы обновили правила (редакция от {date}). Пожалуйста, примите новую редакцию.',
    summaryTitle: 'Главное коротко',
    summary: [
      'Играйте сами: никаких макросов, автокликеров, ботов и скриптов, в том числе ночью.',
      'Один аккаунт на человека, без вторых аккаунтов для передачи ресурсов.',
      'Никакой торговли игровыми ценностями за реальные деньги.',
      'Уважительное отношение к игрокам и поддержке.',
      'За нарушения: предупреждение, удаление полученных преимуществ или блокировка.'
    ],
    terms: 'Читать условия использования',
    privacy: 'Читать политику конфиденциальности',
    check: 'Я прочитал(а) условия использования и политику конфиденциальности и принимаю их.',
    accept: 'Принять и продолжить',
    decline: 'Отклонить и выйти',
    error: 'Не удалось сохранить, попробуйте ещё раз.',
    done: 'Спасибо! Приятной игры.'
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  const value = dict[key] ?? I18N.en[key]
  if (Array.isArray(value)) return value
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const status = computed(() => game.legalStatus)
const isUpdate = computed(() => Boolean(status.value?.acceptedVersion))
const checked = ref(false)
const busy = ref('')
const feedback = ref('')

async function accept() {
  if (!checked.value || busy.value) return
  busy.value = 'accept'
  feedback.value = ''
  try {
    await game.acceptLegal()
    appToast.ok(tx('done'))
  } catch {
    feedback.value = tx('error')
  } finally {
    busy.value = ''
  }
}

async function decline() {
  if (busy.value) return
  busy.value = 'decline'
  try {
    await auth.signOut()
    game.legalStatus = null
    router.push({ name: 'login' })
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="lc-backdrop" role="dialog" aria-modal="true" :aria-label="tx('title')">
      <div class="lc-dialog card">
        <div class="lc-icon">📜</div>
        <h2 class="lc-title">{{ tx('title') }}</h2>
        <p class="lc-lead">
          {{ isUpdate ? tx('updated', { date: formatLegalVersion(status?.currentVersion) }) : tx('lead') }}
        </p>

        <div class="lc-summary">
          <div class="lc-summary-title">{{ tx('summaryTitle') }}</div>
          <ul>
            <li v-for="item in tx('summary')" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div class="lc-links">
          <router-link class="lc-link" :to="{ name: 'terms' }">📄 {{ tx('terms') }}</router-link>
          <router-link class="lc-link" :to="{ name: 'privacy' }">🔒 {{ tx('privacy') }}</router-link>
        </div>

        <label class="lc-check">
          <input v-model="checked" type="checkbox" :disabled="!!busy" />
          <span>{{ tx('check') }}</span>
        </label>

        <Button
          type="button"
          class="btn full lc-accept"
          :disabled="!checked || !!busy"
          @click="accept"
        >
          {{ busy === 'accept' ? '…' : tx('accept') }}
        </Button>
        <div v-if="feedback" class="lc-feedback">{{ feedback }}</div>
        <button type="button" class="lc-decline" :disabled="!!busy" @click="decline">
          {{ tx('decline') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lc-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(16px + var(--safe-top)) 16px calc(16px + var(--safe-bot));
  background: var(--overlay-strong);
  backdrop-filter: blur(6px);
  touch-action: manipulation;
}
.lc-dialog {
  width: min(420px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 22px 18px 16px;
  text-align: center;
  animation: lcIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.lc-icon { font-size: 48px; line-height: 1; margin-bottom: 6px; }
.lc-title { margin: 0 0 6px; font-size: 21px; font-weight: 900; color: var(--heading); }
.lc-lead { margin: 0 0 12px; font-size: 13px; font-weight: 700; color: var(--text); }
.lc-summary {
  text-align: left;
  padding: 10px 12px;
  border-radius: 14px;
  border: 2px dashed var(--border);
  background: var(--card-2);
  color: var(--text);
  font-size: 12.5px;
  font-weight: 700;
}
.lc-summary-title { font-weight: 900; color: var(--heading); margin-bottom: 4px; }
.lc-summary ul { margin: 0; padding-left: 18px; display: grid; gap: 3px; }
.lc-links { display: grid; gap: 8px; margin: 12px 0; }
.lc-link {
  display: block;
  padding: 10px 12px;
  border-radius: 14px;
  border: 2px solid var(--border);
  background: var(--card);
  color: var(--heading);
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  text-align: left;
}
.lc-check {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
}
.lc-check input {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  accent-color: var(--accent);
}
.lc-accept { font-weight: 900; }
.lc-feedback { margin-top: 8px; color: var(--danger); font-size: 13px; font-weight: 800; }
.lc-decline {
  margin-top: 10px;
  padding: 6px 10px;
  border: 0;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}
.lc-decline:disabled { opacity: 0.5; cursor: default; }
@keyframes lcIn {
  from { transform: translateY(20px) scale(0.94); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
</style>
