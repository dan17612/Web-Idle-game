<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { locale } from '../i18n'
import { useAppToast } from '../composables/useAppToast'
import { CODE_LENGTH, sanitizeCode } from '../automationCheck'

// Prüf-Fenster der Autoklicker-Erkennung. Nicht wegklickbar: Bis die Zahl
// abgetippt ist, lehnt der Server Taps, Truhen und Shop-Käufe ab.
// Spec: docs/superpowers/specs/2026-10-06-autoklicker-erkennung-design.md

const game = useGameStore()
const appToast = useAppToast()

const I18N = {
  de: {
    title: 'Automatisierung erkannt',
    lead: 'Unser System hat Hinweise auf automatisiertes Spielen (z. B. Autoklicker oder Makros) festgestellt.',
    prompt: 'Bitte tippe diese Zahl ab, um weiterzuspielen:',
    placeholder: '4-stellige Zahl',
    confirm: 'Bestätigen',
    wrong: 'Falsche Zahl – noch {n} Versuche.',
    rotated: 'Zu viele Fehlversuche – hier ist eine neue Zahl.',
    error: 'Prüfung fehlgeschlagen, bitte erneut versuchen.',
    ticketTitle: 'Support-Ticket eröffnet',
    ticket: 'Für das Admin-Team wurde automatisch ein Support-Ticket eröffnet{num}. Nach der Eingabe kannst du dort im Support-Chat antworten.',
    noBan: 'Du wirst nicht automatisch gesperrt – nach der Eingabe spielst du ganz normal weiter.',
    solved: 'Danke! Du kannst weiterspielen.'
  },
  en: {
    title: 'Automation detected',
    lead: 'Our system found signs of automated play (e.g. auto clickers or macros).',
    prompt: 'Please type this number to keep playing:',
    placeholder: '4-digit number',
    confirm: 'Confirm',
    wrong: 'Wrong number – {n} attempts left.',
    rotated: 'Too many wrong attempts – here is a new number.',
    error: 'Check failed, please try again.',
    ticketTitle: 'Support ticket opened',
    ticket: 'A support ticket was opened automatically for the admin team{num}. After confirming you can reply in the support chat.',
    noBan: 'You are not banned automatically – after confirming you keep playing as usual.',
    solved: 'Thanks! You can keep playing.'
  },
  ru: {
    title: 'Обнаружена автоматизация',
    lead: 'Наша система обнаружила признаки автоматизированной игры (например, автокликер или макросы).',
    prompt: 'Введите это число, чтобы продолжить игру:',
    placeholder: '4-значное число',
    confirm: 'Подтвердить',
    wrong: 'Неверное число – осталось попыток: {n}.',
    rotated: 'Слишком много ошибок – вот новое число.',
    error: 'Проверка не удалась, попробуйте ещё раз.',
    ticketTitle: 'Открыт тикет поддержки',
    ticket: 'Для команды администраторов автоматически открыт тикет поддержки{num}. После подтверждения вы можете ответить в чате поддержки.',
    noBan: 'Автоматической блокировки нет – после подтверждения вы продолжаете играть как обычно.',
    solved: 'Спасибо! Можно играть дальше.'
  }
}

function tx(key, vars = {}) {
  const dict = I18N[locale.value] || I18N.en
  let value = dict[key]
  if (value == null) value = I18N.en[key]
  return String(value ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const check = computed(() => game.automationCheck)
const digits = computed(() => (check.value?.code || '').split(''))
const input = ref('')
const busy = ref(false)
const feedback = ref('')
const inputEl = ref(null)

const ticketText = computed(() =>
  tx('ticket', { num: check.value?.ticketNumber ? ` (${check.value.ticketNumber})` : '' })
)

function focusInput() {
  nextTick(() => inputEl.value?.focus?.())
}

function onInput(e) {
  const clean = sanitizeCode(e.target.value)
  // Direkt ins DOM schreiben: gleicher Ref-Wert würde sonst nicht neu gerendert.
  e.target.value = clean
  input.value = clean
  feedback.value = ''
}

async function submit() {
  if (busy.value || input.value.length !== CODE_LENGTH) return
  busy.value = true
  feedback.value = ''
  try {
    const res = await game.verifyAutomationCode(input.value)
    if (res?.ok) {
      appToast.ok(tx('solved'))
      return
    }
    input.value = ''
    if (inputEl.value) inputEl.value.value = ''
    const left = Math.max(0, (check.value?.maxAttempts || 5) - (check.value?.attempts || 0))
    feedback.value = res?.rotated ? tx('rotated') : tx('wrong', { n: left })
  } catch {
    feedback.value = tx('error')
  } finally {
    busy.value = false
    focusInput()
  }
}

// Neue Prüfung oder neuer Code → Eingabe leeren.
watch(() => check.value?.code, () => {
  input.value = ''
  if (inputEl.value) inputEl.value.value = ''
})

onMounted(focusInput)
</script>

<template>
  <Teleport to="body">
    <div v-if="check" class="ac-backdrop" role="dialog" aria-modal="true" :aria-label="tx('title')">
      <div class="ac-dialog card">
        <div class="ac-icon">🤖</div>
        <h2 class="ac-title">{{ tx('title') }}</h2>
        <p class="ac-lead">{{ tx('lead') }}</p>

        <p class="ac-prompt">{{ tx('prompt') }}</p>
        <div class="ac-code" :aria-label="digits.join(' ')">
          <span v-for="(d, i) in digits" :key="i + d" class="ac-digit" :class="'tilt-' + i">{{ d }}</span>
        </div>

        <form class="ac-form" @submit.prevent="submit">
          <input
            ref="inputEl"
            class="ac-input"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            :maxlength="CODE_LENGTH"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            :placeholder="tx('placeholder')"
            :disabled="busy"
            @input="onInput"
          />
          <Button
            type="submit"
            class="btn full ac-submit"
            :disabled="busy || input.length !== CODE_LENGTH"
          >
            {{ busy ? '…' : tx('confirm') }}
          </Button>
        </form>
        <div v-if="feedback" class="ac-feedback">{{ feedback }}</div>

        <div class="ac-ticket">
          <div class="ac-ticket-title">🎫 {{ tx('ticketTitle') }}</div>
          <div>{{ ticketText }}</div>
          <div class="ac-noban">{{ tx('noBan') }}</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ac-backdrop {
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
.ac-dialog {
  width: min(400px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 22px 18px 18px;
  text-align: center;
  animation: acIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ac-icon { font-size: 52px; line-height: 1; margin-bottom: 6px; }
.ac-title { margin: 0 0 6px; font-size: 21px; font-weight: 900; color: var(--heading); }
.ac-lead { margin: 0 0 14px; font-size: 13px; font-weight: 700; color: var(--text); }
.ac-prompt { margin: 0 0 8px; font-size: 13px; font-weight: 800; color: var(--muted); }
.ac-code {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
  user-select: none;
  -webkit-user-select: none;
}
.ac-digit {
  width: 52px;
  height: 62px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  border: 2px solid var(--accent-soft);
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, var(--mix-base)), color-mix(in srgb, var(--accent) 24%, var(--mix-base)));
  box-shadow: 0 4px 0 var(--accent-shade);
  color: var(--accent-ink);
  font-family: var(--font-round);
  font-size: 34px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.ac-digit.tilt-0 { transform: rotate(-4deg); }
.ac-digit.tilt-1 { transform: rotate(3deg) translateY(2px); }
.ac-digit.tilt-2 { transform: rotate(-2deg) translateY(-1px); }
.ac-digit.tilt-3 { transform: rotate(5deg); }
.ac-form { display: flex; flex-direction: column; gap: 10px; }
.ac-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 2px solid var(--border);
  background: var(--card-2);
  color: var(--heading);
  font-size: 22px;
  font-weight: 900;
  text-align: center;
  letter-spacing: 0.4em;
  outline: none;
}
.ac-input::placeholder { font-size: 14px; letter-spacing: normal; font-weight: 700; color: var(--muted); }
.ac-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent); }
.ac-submit { font-weight: 900; }
.ac-feedback { margin-top: 8px; color: var(--danger); font-size: 13px; font-weight: 800; }
.ac-ticket {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 2px dashed var(--border);
  background: var(--card-2);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}
.ac-ticket-title { font-weight: 900; color: var(--info-ink); margin-bottom: 2px; }
.ac-noban { margin-top: 6px; color: var(--success-ink); font-weight: 800; }
.app-dark .ac-digit { color: var(--accent-deep); }
@keyframes acIn {
  from { transform: translateY(20px) scale(0.94); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
</style>
