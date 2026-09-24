// Sortierung der Ereignis-Karten auf der Startseite.
//
// Jede Karte trägt ihr Erscheinungsdatum (`released`, YYYY-MM-DD) und den
// verbleibenden Countdown (`remaining` in ms, 0 = ohne Ende).

export const EVENT_SORTS = ['newest', 'ending', 'name']
export const NEW_BADGE_DAYS = 14

function releasedMs(card) {
  const t = Date.parse(card?.released || '')
  return Number.isFinite(t) ? t : 0
}

export function sortEvents(cards, mode = 'newest', nameOf = (c) => c.id) {
  const list = cards.slice()
  if (mode === 'ending') {
    // Bald endende zuerst; Ereignisse ohne Ende ans Schluss, dort neueste zuerst.
    return list.sort((a, b) => {
      const ra = a.remaining > 0 ? a.remaining : Infinity
      const rb = b.remaining > 0 ? b.remaining : Infinity
      if (ra !== rb) return ra - rb
      return releasedMs(b) - releasedMs(a)
    })
  }
  if (mode === 'name') {
    return list.sort((a, b) => String(nameOf(a)).localeCompare(String(nameOf(b))))
  }
  return list.sort((a, b) => releasedMs(b) - releasedMs(a))
}

export function isNewEvent(card, now = Date.now()) {
  const t = releasedMs(card)
  return t > 0 && now - t < NEW_BADGE_DAYS * 86400000
}
