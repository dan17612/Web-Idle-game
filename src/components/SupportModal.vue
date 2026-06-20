<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { locale } from '../i18n'

const emit = defineEmits(['close'])
const auth = useAuthStore()

const replyText = ref({})
const sending = ref('')
const sendError = ref('')

const I18N = {
  de: {
    title: '🎫 Meine Support-Tickets',
    subtitle: 'Deine Anfragen. Antworten kommen zusätzlich per E-Mail.',
    empty: 'Keine aktiven Tickets.',
    from: 'Erstellt',
    reply: 'Antwort vom Support',
    close: 'Schließen',
    status_open: 'Offen',
    status_replied: 'Beantwortet',
    status_closed: 'Geschlossen',
    replyPlaceholder: 'Nachricht an den Support …',
    send: 'Senden',
    reopenHint: 'Deine Antwort öffnet das Ticket erneut.'
  },
  en: {
    title: '🎫 My support tickets',
    subtitle: 'Your requests. Replies are also emailed to you.',
    empty: 'No active tickets.',
    from: 'Created',
    reply: 'Support reply',
    close: 'Close',
    status_open: 'Open',
    status_replied: 'Replied',
    status_closed: 'Closed',
    replyPlaceholder: 'Message to support …',
    send: 'Send',
    reopenHint: 'Your reply reopens this ticket.'
  },
  ru: {
    title: '🎫 Мои тикеты поддержки',
    subtitle: 'Твои обращения. Ответы также приходят на e-mail.',
    empty: 'Нет активных тикетов.',
    from: 'Создан',
    reply: 'Ответ поддержки',
    close: 'Закрыть',
    status_open: 'Открыт',
    status_replied: 'Отвечен',
    status_closed: 'Закрыт',
    replyPlaceholder: 'Сообщение в поддержку …',
    send: 'Отправить',
    reopenHint: 'Твой ответ снова откроет тикет.'
  }
}

function tx(key) {
  const lang = I18N[locale.value] ? locale.value : 'en'
  return I18N[lang][key] ?? I18N.en[key] ?? key
}

function fmtDateTime(s) {
  if (!s) return ''
  try { return new Date(s).toLocaleString() } catch { return String(s) }
}

onMounted(async () => {
  await auth.loadMySupportTickets()
  auth.markSupportRepliesSeen()
  for (const ticket of auth.qualifiedSupportTickets) {
    auth.loadTicketThread(ticket.id)
  }
})

let sendErrorTimer = null
async function sendReply(ticket) {
  const text = (replyText.value[ticket.id] || '').trim()
  if (!text || sending.value) return
  sending.value = ticket.id
  sendError.value = ''
  if (sendErrorTimer) { clearTimeout(sendErrorTimer); sendErrorTimer = null }
  try {
    await auth.replyToTicket(ticket.id, text)
    replyText.value[ticket.id] = ''
  } catch (e) {
    sendError.value = e.message
    sendErrorTimer = setTimeout(() => {
      sendError.value = ''
      sendErrorTimer = null
    }, 4000)
  } finally {
    sending.value = ''
  }
}

onUnmounted(() => {
  if (sendErrorTimer) clearTimeout(sendErrorTimer)
})
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="support-modal">
      <div class="sm-head">
        <h2 style="margin:0">{{ tx('title') }}</h2>
        <Button class="btn secondary small" @click="emit('close')">✕</Button>
      </div>
      <p class="subtitle">{{ tx('subtitle') }}</p>

      <div v-if="!auth.qualifiedSupportTickets.length" class="subtitle" style="text-align:center;padding:16px">
        {{ tx('empty') }}
      </div>

      <div
        v-for="ticket in auth.qualifiedSupportTickets"
        :key="ticket.id"
        class="ticket-card"
      >
        <div class="ticket-top">
          <span class="ticket-num">{{ ticket.ticket_number }}</span>
          <span class="pill" :class="`status-${ticket.status}`">
            {{ tx(`status_${ticket.status}`) }}
          </span>
        </div>
        <div class="ticket-subject">{{ ticket.subject }}</div>

        <div class="thread">
          <div
            v-for="m in (auth.ticketThreads[ticket.id] || [])"
            :key="m.id"
            class="bubble"
            :class="m.sender === 'user' ? 'bubble-user' : 'bubble-admin'"
          >
            <pre class="bubble-body">{{ m.body }}</pre>
            <div class="bubble-time">{{ fmtDateTime(m.created_at) }}</div>
          </div>
        </div>

        <Textarea
          v-model="replyText[ticket.id]"
          rows="2"
          maxlength="5000"
          :placeholder="tx('replyPlaceholder')"
          style="width:100%"
        />
        <div v-if="ticket.status === 'closed'" class="subtitle" style="margin:4px 0 0">
          {{ tx('reopenHint') }}
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:6px">
          <Button
            class="btn small"
            :disabled="sending === ticket.id"
            @click="sendReply(ticket)"
          >
            {{ sending === ticket.id ? '…' : tx('send') }}
          </Button>
        </div>
      </div>

      <p v-if="sendError" class="subtitle" style="color:#ff6b6b;text-align:center">
        {{ sendError }}
      </p>

      <Button class="btn full" @click="emit('close')">{{ tx('close') }}</Button>
    </div>
  </div>
</template>

<style scoped>
.support-modal {
  background: var(--card, var(--card-2));
  border: 1px solid var(--border, rgba(140, 105, 35, 0.1));
  border-radius: 16px;
  padding: 18px;
  width: min(560px, 94vw);
  max-height: 88vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sm-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.subtitle { color: var(--muted, var(--muted)); font-size: 13px; margin: 0; }
.ticket-card {
  background: rgba(0,0,0,0.25);
  border: 1px solid var(--border, rgba(140, 105, 35, 0.1));
  border-radius: 12px;
  padding: 12px;
}
.ticket-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.ticket-num {
  font-family: monospace;
  font-size: 13px;
  color: var(--accent, var(--accent));
}
.ticket-subject { font-weight: 700; margin: 6px 0 4px; }
.ticket-msg {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  background: rgba(140, 105, 35, 0.04);
  border-radius: 8px;
  padding: 8px;
  margin: 4px 0 0;
}
.ticket-reply { margin-top: 8px; }
.pill {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid;
}
.pill.status-open { border-color: #ffb86b; color: #ffb86b; }
.pill.status-replied { border-color: #6bd4ff; color: #6bd4ff; }
.pill.status-closed { border-color: #888; color: #aaa; }
.thread {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}
.bubble {
  max-width: 85%;
  border-radius: 10px;
  padding: 6px 9px;
}
.bubble-user {
  align-self: flex-end;
  background: rgba(244, 169, 18, 0.14);
  border: 1px solid rgba(244, 169, 18, 0.35);
}
.bubble-admin {
  align-self: flex-start;
  background: rgba(120, 200, 160, 0.10);
  border: 1px solid rgba(120, 200, 160, 0.30);
}
.bubble-body {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  margin: 0;
}
.bubble-time {
  font-size: 11px;
  color: var(--muted, var(--muted));
  margin-top: 2px;
}
.row { display: flex; gap: 6px; }
.btn.full { width: 100%; }
.btn.small { padding: 4px 10px; }
</style>
