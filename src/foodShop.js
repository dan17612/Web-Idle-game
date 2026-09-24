// Futter-Tab: verfügbare Futter (laut get_shop.food_available) zuerst, nach
// Preis; danach die gerade nicht angebotenen – ausgegraut wie ausverkaufte Tiere.
export function foodShopList(foods, available) {
  const avail = new Set(Array.isArray(available) ? available : [])
  return (foods || [])
    .filter((f) => f && f.enabled !== false)
    .map((f) => ({
      ...f,
      rarity: f.rarity || 'common',
      available: avail.has(f.food)
    }))
    .sort((a, b) =>
      Number(b.available) - Number(a.available) ||
      Number(a.cost || 0) - Number(b.cost || 0)
    )
}

export function isFoodNotAvailableError(e) {
  return /food not available/i.test(String(e?.message || e || ''))
}
