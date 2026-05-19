const DAY_MS = 24 * 3600 * 1000

export function qualifySupportTickets(tickets, now = Date.now()) {
  const list = Array.isArray(tickets) ? tickets : []
  return list.filter((t) => {
    if (!t) return false
    if (t.status !== 'closed') return true
    if (!t.closed_at) return false
    return now - new Date(t.closed_at).getTime() < DAY_MS
  })
}

export function hasUnseenReply(tickets, seenMap = {}, now = Date.now()) {
  const map = seenMap || {}
  return qualifySupportTickets(tickets, now).some(
    (t) => t.status === 'replied' && t.replied_at && map[t.id] !== t.replied_at
  )
}

export function buildSeenMap(tickets, seenMap = {}, now = Date.now()) {
  const next = { ...(seenMap || {}) }
  for (const t of qualifySupportTickets(tickets, now)) {
    if (t.status === 'replied' && t.replied_at) next[t.id] = t.replied_at
  }
  return next
}

export function hasUnseenAdminMessage(tickets, seenMap = {}) {
  const list = Array.isArray(tickets) ? tickets : []
  const map = seenMap || {}
  return list.some((t) => t && t.last_user_message_at && map[t.id] !== t.last_user_message_at)
}

export function buildAdminSeenMap(tickets, seenMap = {}) {
  const list = Array.isArray(tickets) ? tickets : []
  const next = { ...(seenMap || {}) }
  for (const t of list) {
    if (t && t.last_user_message_at) next[t.id] = t.last_user_message_at
  }
  return next
}

export function isUnansweredForDigest(ticket, latestMessage, now = Date.now()) {
  if (!ticket || ticket.status !== 'open' || ticket.reminder_sent_at) return false
  if (!latestMessage || latestMessage.sender !== 'user' || !latestMessage.created_at) return false
  return now - new Date(latestMessage.created_at).getTime() >= 24 * 3600 * 1000
}
