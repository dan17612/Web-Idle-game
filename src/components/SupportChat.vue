<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { locale } from '../i18n'
import { useAppToast } from '../composables/useAppToast'
import { useReturnRefresh } from '../composables/useReturnRefresh'
import {
  SUPPORT_CATEGORIES, SUPPORT_MESSAGE_MAX, buildTicketSubject, canSendMessage,
  sortConversations, pickActiveTicketId, replyAuthor
} from '../supportChat'

const I18N = {
  de: {
    introTitle: '💬 Direkt an den Entwickler',
    introText: 'Bug gefunden, Frage oder Feedback? Schreib einfach los – die Antwort kommt hier im Chat und zusätzlich per E-Mail.',
    newChat: 'Neu',
    dev: 'Entwickler',
    role_admin: 'Entwickler',
    role_subadmin: 'Support-Team',
    welcome: '👋 Hi! Was kann ich für dich tun? Beschreib kurz, was los ist – bei Bugs gern mit dem, was du vorher gemacht hast.',
    topic: 'Worum geht’s?',
    cat_bug: 'Bug',
    cat_question: 'Frage',
    cat_feedback: 'Feedback',
    cat_account: 'Konto',
    newPlaceholder: 'Deine Nachricht …',
    replyPlaceholder: 'Antworten …',
    send: 'Senden',
    sentNew: 'Nachricht gesendet ({number}). Ich melde mich!',
    waiting: '✓ Angekommen – die Antwort erscheint hier.',
    reopenHint: 'Dieses Gespräch ist geschlossen – deine Nachricht öffnet es wieder.',
    keyHint: 'Strg/⌘ + Enter zum Senden',
    loading: 'Lädt …',
    status_open: 'Offen',
    status_replied: 'Beantwortet',
    status_closed: 'Geschlossen'
  },
  en: {
    introTitle: '💬 Straight to the developer',
    introText: 'Found a bug, have a question or feedback? Just write – the reply shows up here in the chat and by email.',
    newChat: 'New',
    dev: 'Developer',
    role_admin: 'Developer',
    role_subadmin: 'Support team',
    welcome: '👋 Hi! How can I help? Briefly describe what’s going on – for bugs, ideally what you did right before.',
    topic: 'What is it about?',
    cat_bug: 'Bug',
    cat_question: 'Question',
    cat_feedback: 'Feedback',
    cat_account: 'Account',
    newPlaceholder: 'Your message …',
    replyPlaceholder: 'Reply …',
    send: 'Send',
    sentNew: 'Message sent ({number}). I’ll get back to you!',
    waiting: '✓ Received – the reply will show up here.',
    reopenHint: 'This conversation is closed – your message reopens it.',
    keyHint: 'Ctrl/⌘ + Enter to send',
    loading: 'Loading …',
    status_open: 'Open',
    status_replied: 'Replied',
    status_closed: 'Closed'
  },
  ru: {
    introTitle: '💬 Напрямую разработчику',
    introText: 'Нашёл баг, есть вопрос или отзыв? Просто напиши – ответ появится здесь в чате и придёт на e-mail.',
    newChat: 'Новый',
    dev: 'Разработчик',
    role_admin: 'Разработчик',
    role_subadmin: 'Команда поддержки',
    welcome: '👋 Привет! Чем могу помочь? Коротко опиши, что случилось – для багов лучше с тем, что ты делал перед этим.',
    topic: 'О чём речь?',
    cat_bug: 'Баг',
    cat_question: 'Вопрос',
    cat_feedback: 'Отзыв',
    cat_account: 'Аккаунт',
    newPlaceholder: 'Твоё сообщение …',
    replyPlaceholder: 'Ответить …',
    send: 'Отправить',
    sentNew: 'Сообщение отправлено ({number}). Я отвечу!',
    waiting: '✓ Получено – ответ появится здесь.',
    reopenHint: 'Этот разговор закрыт – твоё сообщение снова откроет его.',
    keyHint: 'Ctrl/⌘ + Enter – отправить',
    loading: 'Загрузка …',
    status_open: 'Открыт',
    status_replied: 'Отвечен',
    status_closed: 'Закрыт'
  }
}

function tx(key, vars = {}) {
  const lang = I18N[locale.value] ? locale.value : 'en'
  const value = I18N[lang][key] ?? I18N.en[key] ?? key
  return String(value).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const POLL_MS = 15_000

const auth = useAuthStore()
const toast = useAppToast()

const activeId = ref(null) // null = neues Anliegen
const draft = ref('')
const category = ref('')
const busyKey = ref('')
const threadEl = ref(null)

const conversations = computed(() => sortConversations(auth.mySupportTickets))
const activeTicket = computed(() =>
  activeId.value ? conversations.value.find((c) => c.id === activeId.value) || null : null
)
const messages = computed(() => (activeTicket.value ? auth.ticketThreads[activeTicket.value.id] || [] : []))
const threadLoaded = computed(() => !!activeTicket.value && !!auth.ticketThreads[activeTicket.value.id])
const lastIsUser = computed(() => messages.value.length > 0 && messages.value[messages.value.length - 1].sender === 'user')
const canSend = computed(() => canSendMessage(draft.value))

function fmtTime(s) {
  if (!s) return ''
  try {
    return new Date(s).toLocaleString(locale.value, {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return String(s)
  }
}

async function load(initial = false) {
  await auth.loadMySupportTickets()
  if (initial) {
    activeId.value = pickActiveTicketId(auth.mySupportTickets)
  } else if (activeId.value && !auth.mySupportTickets.some((t) => t.id === activeId.value)) {
    activeId.value = null
  }
  if (activeId.value) await auth.loadTicketThread(activeId.value)
  auth.markSupportRepliesSeen()
}

async function openConversation(id) {
  if (activeId.value === id) return
  activeId.value = id
  draft.value = ''
  if (id) await auth.loadTicketThread(id)
  auth.markSupportRepliesSeen()
}

async function send() {
  const text = draft.value.trim()
  if (!canSendMessage(text) || busyKey.value) return
  busyKey.value = 'send'
  try {
    if (activeTicket.value) {
      await auth.replyToTicket(activeTicket.value.id, text)
    } else {
      const cat = SUPPORT_CATEGORIES.find((c) => c.key === category.value)
      const label = cat ? `${cat.emoji} ${tx('cat_' + cat.key)}` : ''
      const res = await auth.submitSupportTicket(buildTicketSubject(label, text), text, false)
      await auth.loadMySupportTickets()
      activeId.value = res?.id || pickActiveTicketId(auth.mySupportTickets)
      if (activeId.value) await auth.loadTicketThread(activeId.value)
      category.value = ''
      toast.ok(tx('sentNew', { number: res?.ticket_number || '' }))
    }
    draft.value = ''
  } catch (e) {
    toast.err(e)
  } finally {
    busyKey.value = ''
  }
}

function onKey(e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    send()
  }
}

async function scrollToBottom() {
  await nextTick()
  const el = threadEl.value
  if (el) el.scrollTop = el.scrollHeight
}

watch(() => [activeId.value, messages.value.length], scrollToBottom)

// Solange der Chat offen ist, gelten frisch geladene Antworten als gelesen
// (auch wenn replyToTicket die Ticketliste neu lädt).
watch(() => auth.mySupportTickets, () => auth.markSupportRepliesSeen())

useReturnRefresh(() => load())

let pollTimer = null
onMounted(async () => {
  await load(true)
  scrollToBottom()
  pollTimer = setInterval(() => {
    if (document.visibilityState !== 'visible' || busyKey.value) return
    load().catch(() => {})
  }, POLL_MS)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <section class="support-chat">
    <div class="card chat-intro">
      <div class="intro-title">{{ tx('introTitle') }}</div>
      <p class="intro-text">{{ tx('introText') }}</p>
    </div>

    <div v-if="conversations.length" class="conv-bar">
      <button
        type="button"
        class="conv-chip conv-new"
        :class="{ active: !activeTicket }"
        @click="openConversation(null)"
      >＋ {{ tx('newChat') }}</button>
      <button
        v-for="c in conversations"
        :key="c.id"
        type="button"
        class="conv-chip"
        :class="{ active: activeId === c.id, closed: c.status === 'closed' }"
        @click="openConversation(c.id)"
      >
        <span class="conv-dot" :data-status="c.status"></span>
        <span class="conv-subject">{{ c.subject }}</span>
      </button>
    </div>

    <div class="card chat-card">
      <div v-if="activeTicket" class="chat-head">
        <div class="chat-head-main">
          <span class="chat-subject">{{ activeTicket.subject }}</span>
          <span class="chat-num">{{ activeTicket.ticket_number }}</span>
        </div>
        <span class="status-pill" :data-status="activeTicket.status">
          {{ tx('status_' + activeTicket.status) }}
        </span>
      </div>

      <div ref="threadEl" class="thread">
        <template v-if="!activeTicket">
          <div class="bubble dev">
            <div class="bubble-who">🛠️ {{ tx('dev') }}</div>
            <div class="bubble-body">{{ tx('welcome') }}</div>
          </div>
        </template>
        <template v-else>
          <div v-if="!threadLoaded" class="thread-note">{{ tx('loading') }}</div>
          <div
            v-for="m in messages"
            :key="m.id"
            class="bubble"
            :class="m.sender === 'user' ? 'me' : ['dev', replyAuthor(m).role]"
          >
            <div v-if="replyAuthor(m)" class="bubble-who">
              {{ replyAuthor(m).icon }}
              <template v-if="replyAuthor(m).name">{{ replyAuthor(m).name }} · </template>{{ tx('role_' + replyAuthor(m).role) }}
            </div>
            <div class="bubble-body">{{ m.body }}</div>
            <div class="bubble-time">{{ fmtTime(m.created_at) }}</div>
          </div>
          <div v-if="activeTicket.status === 'open' && lastIsUser" class="thread-note">
            {{ tx('waiting') }}
          </div>
        </template>
      </div>

      <div v-if="!activeTicket" class="cat-row">
        <span class="cat-label">{{ tx('topic') }}</span>
        <button
          v-for="c in SUPPORT_CATEGORIES"
          :key="c.key"
          type="button"
          class="cat-chip"
          :class="{ active: category === c.key }"
          @click="category = category === c.key ? '' : c.key"
        >{{ c.emoji }} {{ tx('cat_' + c.key) }}</button>
      </div>

      <div class="composer">
        <Textarea
          v-model="draft"
          class="composer-input"
          rows="2"
          autoResize
          :maxlength="SUPPORT_MESSAGE_MAX"
          :placeholder="activeTicket ? tx('replyPlaceholder') : tx('newPlaceholder')"
          @keydown="onKey"
        />
        <Button
          class="btn send-btn"
          :disabled="!canSend || busyKey === 'send'"
          :aria-label="tx('send')"
          :title="tx('send')"
          @click="send"
        >{{ busyKey === 'send' ? '…' : '➤' }}</Button>
      </div>
      <p class="composer-hint">
        {{ activeTicket?.status === 'closed' ? tx('reopenHint') : tx('keyHint') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.chat-intro { padding: 12px 14px; }
.intro-title { font-weight: 800; font-size: 16px; color: var(--heading); }
.intro-text { margin: 4px 0 0; font-size: 13px; color: var(--muted); font-weight: 600; line-height: 1.4; }

.conv-bar {
  display: flex; gap: 6px;
  overflow-x: auto; scrollbar-width: none;
  padding: 2px 2px 10px;
}
.conv-bar::-webkit-scrollbar { display: none; }
.conv-chip {
  flex: 0 0 auto;
  display: inline-flex; align-items: center; gap: 6px;
  max-width: 190px;
  padding: 6px 12px;
  font-size: 12px; font-weight: 700;
  color: var(--muted);
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
}
.conv-chip.active { color: var(--heading); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--mix-base)); }
.conv-chip.closed:not(.active) { opacity: 0.65; }
.conv-new { color: var(--accent-deep); }
.conv-subject { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conv-dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.conv-dot[data-status="replied"] { background: var(--accent-2); }
.conv-dot[data-status="closed"] { background: var(--muted); }

.chat-card { padding: 12px; }
.chat-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding-bottom: 10px; margin-bottom: 8px;
  border-bottom: 2px dashed var(--border);
}
.chat-head-main { display: flex; flex-direction: column; min-width: 0; }
.chat-subject { font-weight: 800; color: var(--heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-num { font-family: monospace; font-size: 11px; color: var(--muted); }
.status-pill {
  flex: 0 0 auto;
  font-size: 11px; font-weight: 800;
  padding: 2px 9px; border-radius: 999px;
  border: 1px solid var(--accent);
  color: var(--accent-deep);
}
.status-pill[data-status="replied"] { border-color: var(--accent-2); color: var(--success-ink); }
.status-pill[data-status="closed"] { border-color: var(--border); color: var(--muted); }

.thread {
  display: flex; flex-direction: column; gap: 8px;
  min-height: 140px; max-height: 50vh;
  overflow-y: auto;
  padding: 4px 2px 8px;
}
.bubble {
  max-width: 86%;
  padding: 8px 11px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.4;
}
.bubble.me {
  align-self: flex-end;
  background: color-mix(in srgb, var(--accent) 18%, var(--mix-base));
  border: 2px solid color-mix(in srgb, var(--accent) 40%, transparent);
  border-bottom-right-radius: 6px;
}
.bubble.dev {
  align-self: flex-start;
  background: var(--card-2);
  border: 2px solid var(--border);
  border-bottom-left-radius: 6px;
}
.bubble-who { font-size: 11px; font-weight: 800; color: var(--accent-deep); margin-bottom: 2px; }
.bubble.dev.subadmin .bubble-who { color: var(--info-ink); }
.bubble-body { white-space: pre-wrap; word-break: break-word; color: var(--text); }
.bubble-time { font-size: 10px; color: var(--muted); margin-top: 3px; text-align: right; font-weight: 600; }
.thread-note { align-self: center; font-size: 12px; color: var(--muted); font-weight: 700; padding: 2px 8px; }

.cat-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 4px 0 8px; }
.cat-label { font-size: 12px; font-weight: 800; color: var(--muted); margin-right: 2px; }
.cat-chip {
  padding: 5px 10px;
  font-size: 12px; font-weight: 700;
  color: var(--muted);
  background: var(--card-2);
  border: 2px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
}
.cat-chip.active { color: var(--heading); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, var(--mix-base)); }

.composer { display: flex; align-items: flex-end; gap: 8px; margin-top: 4px; }
.composer-input { flex: 1; min-width: 0; max-height: 160px; overflow-y: auto; resize: none; }
.send-btn {
  flex: 0 0 auto;
  width: 50px; height: 50px;
  padding: 0 !important;
  font-size: 20px;
  border-radius: 16px;
}
.composer-hint { margin: 6px 2px 0; font-size: 11px; color: var(--muted); font-weight: 600; }
</style>
