const RARITY = {
  common:    { color: '#9ca3af', emoji: '⚪', order: 0, label: { de: 'Common',    en: 'Common',    ru: 'Обычная'    } },
  uncommon:  { color: '#22c55e', emoji: '🟢', order: 1, label: { de: 'Uncommon',  en: 'Uncommon',  ru: 'Необычная'  } },
  rare:      { color: '#3b82f6', emoji: '🔵', order: 2, label: { de: 'Rare',      en: 'Rare',      ru: 'Редкая'     } },
  epic:      { color: '#a855f7', emoji: '🟣', order: 3, label: { de: 'Epic',      en: 'Epic',      ru: 'Эпическая'  } },
  legendary: { color: '#f59e0b', emoji: '🟡', order: 4, label: { de: 'Legendary', en: 'Legendary', ru: 'Легендарная' } }
}

export function rarityInfo(r) {
  return RARITY[r] || RARITY.common
}

export function sortByRarity(list) {
  return [...list].sort((a, b) => rarityInfo(a.rarity).order - rarityInfo(b.rarity).order)
}

export function formatDropChance(drop, allDrops) {
  const total = allDrops.reduce((s, d) => s + (d.weight || 0), 0)
  if (!total) return '0%'
  return Math.round((drop.weight / total) * 100) + '%'
}
