const TIER_ORDER = { normal: 0, gold: 1, diamond: 2, epic: 3, rainbow: 4 }

function isUpgrading(a, now) {
  if (!a || !a.upgrade_ready_at) return false
  return new Date(a.upgrade_ready_at).getTime() > now
}

/**
 * Gruppiert Tiere, die für das automatische Freilassen infrage kommen.
 *
 * Ausgeschlossen werden grundsätzlich:
 *  - Tiere, die gerade upgraden (upgrade_ready_at in der Zukunft)
 *  - Ausgerüstete Tiere (equipped === true)  → würden sonst fälschlicherweise
 *    aus dem lokalen State gelöscht, auch wenn der Server sie schützt
 *  - Das aktuelle Lieblingstier (favoriteId) → soll nie automatisch freigelassen werden
 *
 * @param {Array}  animals        – aktuelles Tier-Array aus dem Store
 * @param {Object} autoReleaseMap – { [species]: maxTier } Konfiguration
 * @param {number} [now]          – aktueller Timestamp (Standard: Date.now())
 * @param {string|null} [favoriteId] – ID des Lieblingstiers (Standard: null)
 */
export function groupAnimalsForAutoRelease(animals, autoReleaseMap, now = Date.now(), favoriteId = null) {
  const cfg = autoReleaseMap || {}
  const map = new Map()
  for (const a of animals || []) {
    if (isUpgrading(a, now)) continue
    if (a.equipped) continue           // ausgerüstete Tiere niemals freilassen
    if (a.id === favoriteId) continue  // Lieblingstier niemals freilassen
    const maxTier = cfg[a.species]
    const maxRank = TIER_ORDER[maxTier]
    if (maxRank == null) continue
    const tier = a.tier || 'normal'
    const rank = TIER_ORDER[tier]
    if (rank == null || rank > maxRank) continue
    const key = `${a.species}|${tier}`
    if (!map.has(key)) map.set(key, { species: a.species, tier, ids: [] })
    map.get(key).ids.push(a.id)
  }
  return [...map.values()]
}
