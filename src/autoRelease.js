const TIER_ORDER = { normal: 0, gold: 1, diamond: 2, epic: 3, rainbow: 4 }

function isUpgrading(a, now = Date.now()) {
  if (!a || !a.upgrade_ready_at) return false
  const readyAt = new Date(a.upgrade_ready_at).getTime()
  return Number.isFinite(readyAt) && readyAt > now
}

export function groupAnimalsForAutoRelease(animals, autoReleaseMap, now = Date.now()) {
  const cfg = autoReleaseMap || {}
  const map = new Map()
  for (const a of animals || []) {
    if (isUpgrading(a, now)) continue
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
