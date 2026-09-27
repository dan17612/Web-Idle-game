// Eier-Maschine mit mehreren Brutplätzen — reine Logik.
// Spiegel der Platzanzahl: supabase/migrations/20260927_eier_zwei_brutplaetze.sql
// (check (slot between 1 and 2), generate_series(1, 2), 'max_slots', 2).

export const EGG_SLOTS = 2

const EMPTY = Object.freeze({ active: false, slots: [], maxSlots: 1 })

function toTime(v) {
  const t = v ? new Date(v).getTime() : NaN
  return Number.isFinite(t) ? t : null
}

// get_incubation_status → { active, maxSlots, slots: [{ slot, active, egg_type, started_at, ready_at }] }.
// Versteht das neue Format (slots[]) und das alte (nur Top-Level-Felder,
// Server vor der Migration → genau ein Platz).
export function normalizeIncubation(data) {
  if (!data || typeof data !== 'object') {
    return { ...EMPTY, slots: [{ slot: 1, active: false }] }
  }
  const hasSlots = Array.isArray(data.slots)
  const maxSlots = hasSlots
    ? Math.min(EGG_SLOTS, Math.max(1, Math.floor(Number(data.max_slots) || EGG_SLOTS)))
    : 1
  const raw = hasSlots ? data.slots : (data.active ? [{ ...data, slot: data.slot || 1 }] : [])

  const bySlot = new Map()
  for (const s of raw) {
    const n = Number(s?.slot)
    if (!Number.isInteger(n) || n < 1 || n > maxSlots) continue
    if (toTime(s.ready_at) == null) continue
    bySlot.set(n, {
      slot: n,
      active: true,
      egg_type: s.egg_type || null,
      started_at: s.started_at || null,
      ready_at: s.ready_at,
    })
  }

  const slots = []
  for (let n = 1; n <= maxSlots; n++) slots.push(bySlot.get(n) || { slot: n, active: false })
  return { active: bySlot.size > 0, maxSlots, slots }
}

export function slotRemainingMs(slot, nowMs) {
  if (!slot?.active) return 0
  return Math.max(0, toTime(slot.ready_at) - nowMs)
}

export function slotReady(slot, nowMs) {
  return !!slot?.active && slotRemainingMs(slot, nowMs) === 0
}

// Fortschritt 0..1 aus Start/Ende; ohne Startzeit über die Brutdauer in Minuten.
export function slotProgress(slot, nowMs, fallbackMinutes = 60) {
  if (!slot?.active) return 0
  const end = toTime(slot.ready_at)
  const start = toTime(slot.started_at) ?? end - Math.max(1, fallbackMinutes) * 60_000
  const total = end - start
  if (total <= 0) return 1
  return Math.max(0, Math.min(1, (nowMs - start) / total))
}

export function freeSlots(state) {
  return (state?.slots || []).filter((s) => !s.active).length
}
