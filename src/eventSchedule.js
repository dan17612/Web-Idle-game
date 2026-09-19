// Auswertung des Event-Zeitplans aus `get_event_schedule`.
//
// Spiegelt public.event_is_active(): Ein Ereignis ohne Eintrag gilt als aktiv,
// sonst entscheiden enabled, starts_at und ends_at. Der Server bleibt die
// autoritative Quelle — das hier steuert nur, was die Oberfläche anzeigt.

export const EVENT_KEYS = {
  bossPath: 'boss_path',
  bossEndless: 'boss_endless',
  memory: 'memory_game',
  merge: 'merge_game',
  drift: 'drift_game',
  parkour: 'parkour_game',
  wordle: 'wordle_game',
  world: 'world_lobby',
  breeding: 'breeding_game'
}

export function eventInfo(schedule, key, now = Date.now()) {
  const cfg = schedule && typeof schedule === 'object' ? schedule[key] : null
  const showCountdown = !!(cfg && cfg.show_countdown !== false && cfg.ends_at)
  const endsAt = showCountdown ? new Date(cfg.ends_at).getTime() : 0

  let active = true
  if (cfg) {
    const ends = cfg.ends_at ? new Date(cfg.ends_at).getTime() : 0
    const starts = cfg.starts_at ? new Date(cfg.starts_at).getTime() : 0
    if (cfg.enabled === false) active = false
    else if (starts && starts > now) active = false
    else if (ends && ends <= now) active = false
  }

  return { active, ended: !active, endsAt, showCountdown }
}

export function remainingMs(schedule, key, now = Date.now()) {
  const { endsAt } = eventInfo(schedule, key, now)
  return endsAt ? Math.max(0, endsAt - now) : 0
}
