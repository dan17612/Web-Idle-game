export function boardColumns(cardCount) {
  const n = Number(cardCount) || 0
  if (n <= 0) return 4
  return Math.min(6, Math.ceil(Math.sqrt(n)))
}

export function isMyTurn(state) {
  if (!state) return false
  return !!state.turn_player_id && state.turn_player_id === state.me
}

export function turnSecondsLeft(state, nowMs) {
  if (!state || !state.turn_expires_at) return 0
  const skew = state.server_now ? Date.now() - new Date(state.server_now).getTime() : 0
  const expires = new Date(state.turn_expires_at).getTime()
  const remaining = expires - (nowMs - skew)
  return Math.max(0, Math.round(remaining / 1000))
}

export function canStartGame(state) {
  if (!state || state.status !== 'lobby') return false
  if (state.host_id !== state.me) return false
  return Array.isArray(state.players) && state.players.length >= 2
}

export function pickFnError({ data, error, body }) {
  if (data && data.error) return data.error
  if (body && body.error) return body.error
  if (error && error.message) return error.message
  return 'Fehler'
}

export function sortedPlayers(state) {
  const list = Array.isArray(state?.players) ? [...state.players] : []
  return list.sort((a, b) => (a.seat || 0) - (b.seat || 0))
}
