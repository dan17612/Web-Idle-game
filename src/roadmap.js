// Reine Logik der Roadmap (Ideen-Board mit Up-/Downvotes).
// Server-Spiegel: vote_idea / roadmap_view in
// supabase/migrations/20260928_roadmap_downvotes.sql

export const ROADMAP_DEFAULT_FILTER = 'idea'
export const ROADMAP_STATUSES = ['idea', 'planned', 'in_progress', 'done', 'rejected']

// Eigene Stimme: -1, 0 oder 1. Ältere View-Zeilen ohne my_value → my_vote.
export function myVoteOf(idea) {
  if (!idea) return 0
  const v = Number(idea.my_value)
  if (v === 1 || v === -1) return v
  if (idea.my_value == null && idea.my_vote) return 1
  return 0
}

export function upCountOf(idea) {
  if (!idea) return 0
  if (idea.up_count != null) return Number(idea.up_count) || 0
  return Math.max(0, Number(idea.vote_count) || 0)
}

export function downCountOf(idea) {
  return Number(idea?.down_count) || 0
}

export function ideaScore(idea) {
  if (!idea) return 0
  if (idea.up_count != null || idea.down_count != null) return upCountOf(idea) - downCountOf(idea)
  return Number(idea.vote_count) || 0
}

// Gleiche Richtung erneut = Stimme zurückziehen (wie im RPC).
export function nextVoteValue(current, clicked) {
  return Number(current) === clicked ? 0 : clicked
}

// Optimistisches Update: Zählerstände nach dem Wechsel von der aktuellen auf
// die neue eigene Stimme.
export function applyVote(idea, value) {
  const prev = myVoteOf(idea)
  let up = upCountOf(idea)
  let down = downCountOf(idea)
  if (prev === 1) up -= 1
  if (prev === -1) down -= 1
  if (value === 1) up += 1
  if (value === -1) down += 1
  up = Math.max(0, up)
  down = Math.max(0, down)
  return { up_count: up, down_count: down, vote_count: up - down, my_value: value, my_vote: value === 1 }
}

// Server-Antwort von vote_idea → Felder der View-Zeile.
export function voteResultToFields(data) {
  const up = Math.max(0, Number(data?.up) || 0)
  const down = Math.max(0, Number(data?.down) || 0)
  const mine = Number(data?.my_vote)
  const value = mine === 1 || mine === -1 ? mine : 0
  return { up_count: up, down_count: down, vote_count: up - down, my_value: value, my_vote: value === 1 }
}

export function filterAndSortIdeas(list, filter = 'all', sortBy = 'votes') {
  let out = Array.isArray(list) ? list.filter(Boolean) : []
  if (filter && filter !== 'all') out = out.filter((i) => i.status === filter)
  const time = (i) => new Date(i.created_at).getTime() || 0
  if (sortBy === 'votes') {
    out = [...out].sort((a, b) => ideaScore(b) - ideaScore(a) || time(b) - time(a))
  } else {
    out = [...out].sort((a, b) => time(b) - time(a))
  }
  return out
}

export function formatScore(n) {
  const num = Math.trunc(Number(n) || 0)
  if (num > 99) return '99+'
  if (num < -99) return '-99'
  return String(num)
}
