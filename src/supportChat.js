// Reine Logik des Support-Chats. Ein Gespräch = ein Support-Ticket
// (support_tickets + support_ticket_messages, siehe 20260519_support_thread.sql).

export const SUPPORT_CATEGORIES = [
  { key: 'bug', emoji: '🐞' },
  { key: 'question', emoji: '❓' },
  { key: 'feedback', emoji: '💡' },
  { key: 'account', emoji: '👤' }
]

export const SUPPORT_MESSAGE_MAX = 5000
export const SUPPORT_SUBJECT_MAX = 80

// Betreff automatisch aus Kategorie + erster Zeile der Nachricht bauen,
// damit Spieler kein eigenes Betreff-Feld ausfüllen müssen.
export function buildTicketSubject(categoryLabel, message, max = SUPPORT_SUBJECT_MAX) {
  const firstLine = String(message || '')
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean) || ''
  const label = String(categoryLabel || '').trim()
  const raw = label ? (firstLine ? `${label}: ${firstLine}` : label) : firstLine
  const clean = raw.replace(/\s+/g, ' ').trim()
  if (!clean) return 'Support'
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean
}

export function canSendMessage(text) {
  const len = String(text || '').trim().length
  return len > 0 && len <= SUPPORT_MESSAGE_MAX
}

function lastActivity(t) {
  const times = [t.last_message_at, t.replied_at, t.created_at]
    .map((s) => (s ? new Date(s).getTime() : 0))
    .filter((n) => Number.isFinite(n))
  return times.length ? Math.max(...times) : 0
}

// Offene/beantwortete Gespräche zuerst, jeweils neueste Aktivität zuerst.
export function sortConversations(tickets) {
  const list = Array.isArray(tickets) ? tickets.filter(Boolean) : []
  return [...list].sort((a, b) => {
    const ca = a.status === 'closed' ? 1 : 0
    const cb = b.status === 'closed' ? 1 : 0
    if (ca !== cb) return ca - cb
    return lastActivity(b) - lastActivity(a)
  })
}

// Beim Öffnen: jüngstes nicht geschlossenes Gespräch, sonst null (= neues Anliegen).
export function pickActiveTicketId(tickets) {
  const open = sortConversations(tickets).find((t) => t.status !== 'closed')
  return open ? open.id : null
}

// Wer hat im Chat geantwortet? Ältere Nachrichten ohne gespeicherten Namen
// zeigen nur die Rolle (Admin = Entwickler, Sub-Admin = Support-Team).
export function replyAuthor(message) {
  if (!message || message.sender === 'user') return null
  const role = message.sender_role === 'subadmin' ? 'subadmin' : 'admin'
  const name = String(message.sender_name || '').trim() || null
  return { name, role, icon: role === 'subadmin' ? '🛡️' : '🛠️' }
}
