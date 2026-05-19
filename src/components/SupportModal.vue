<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { locale } from '../i18n'

const emit = defineEmits(['close'])
const auth = useAuthStore()

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
    status_closed: 'Geschlossen'
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
    status_closed: 'Closed'
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
    status_closed: 'Закрыт'
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
        <div class="subtitle" style="margin:2px 0 6px">
          {{ tx('from') }}: {{ fmtDateTime(ticket.created_at) }}
        </div>
        <div class="ticket-subject">{{ ticket.subject }}</div>
        <pre class="ticket-msg">{{ ticket.message }}</pre>
        <div v-if="ticket.admin_reply" class="ticket-reply">
          <div class="subtitle" style="margin:0 0 4px">
            {{ tx('reply') }} · {{ fmtDateTime(ticket.replied_at) }}
          </div>
          <pre class="ticket-msg" style="background:rgba(120,200,160,0.08)">{{ ticket.admin_reply }}</pre>
        </div>
      </div>

      <Button class="btn full" @click="emit('close')">{{ tx('close') }}</Button>
    </div>
  </div>
</template>

<style scoped>
.support-modal {
  background: var(--card, #161b2b);
  border: 1px solid var(--border, rgba(255,255,255,0.1));
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
.subtitle { color: var(--muted, #9aa3b2); font-size: 13px; margin: 0; }
.ticket-card {
  background: rgba(0,0,0,0.25);
  border: 1px solid var(--border, rgba(255,255,255,0.1));
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
  color: var(--accent, #ffd166);
}
.ticket-subject { font-weight: 700; margin: 6px 0 4px; }
.ticket-msg {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  background: rgba(255,255,255,0.04);
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
.btn.full { width: 100%; }
.btn.small { padding: 4px 10px; }
</style>
