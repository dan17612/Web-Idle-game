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
