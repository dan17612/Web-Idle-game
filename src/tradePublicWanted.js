export function wantedAnimalItems(trade) {
  if (Array.isArray(trade?.wanted_animals)) {
    return trade.wanted_animals
      .map((item) => ({
        species: item?.species || '',
        tier: item?.tier || 'normal',
        qty: Math.max(0, Math.floor(Number(item?.qty) || 0))
      }))
      .filter((item) => item.species && item.qty > 0)
  }
  if (trade?.wanted_animals && typeof trade.wanted_animals === 'object') {
    return wantedAnimalItems({ wanted_animals: Object.values(trade.wanted_animals) })
  }
  if (trade?.wanted_species && wantedQty(trade) > 0) {
    return [{ species: trade.wanted_species, tier: wantedTier(trade), qty: wantedQty(trade) }]
  }
  return []
}

export function wantedQty(trade) {
  return Math.max(0, Math.floor(Number(trade?.wanted_qty) || 0))
}

export function wantedTier(trade) {
  return trade?.wanted_tier || 'normal'
}

export function hasWantedAnimals(trade) {
  return wantedAnimalItems(trade).length > 0
}

export function groupMatchesWanted(group, trade) {
  if (!hasWantedAnimals(trade)) return true
  return wantedAnimalItems(trade).some((item) =>
    group?.species === item.species && (group?.tier || 'normal') === item.tier
  )
}

export function wantedCountSatisfied(selectedAnimals, trade) {
  if (!hasWantedAnimals(trade)) return true
  return wantedAnimalItems(trade).every((item) => {
    const count = (selectedAnimals || []).filter((animal) =>
      animal?.species === item.species && (animal?.tier || 'normal') === item.tier
    ).length
    return count >= item.qty
  })
}

export function wantedSelectionExact(selectedAnimals, trade) {
  const wanted = wantedAnimalItems(trade)
  if (!wanted.length) return true
  const selected = selectedAnimals || []
  const wantedTotal = wanted.reduce((sum, item) => sum + item.qty, 0)
  if (selected.length !== wantedTotal) return false

  return wanted.every((item) => {
    const count = selected.filter((animal) =>
      animal?.species === item.species && (animal?.tier || 'normal') === item.tier
    ).length
    return count === item.qty
  })
}

export function pickWantedAnimals(availableAnimals, trade) {
  const wanted = wantedAnimalItems(trade)
  if (!wanted.length) return []

  const picked = []
  for (const item of wanted) {
    const matches = (availableAnimals || []).filter((animal) =>
      animal?.species === item.species && (animal?.tier || 'normal') === item.tier
    )
    if (matches.length < item.qty) return []
    picked.push(...matches.slice(0, item.qty))
  }
  return picked
}
