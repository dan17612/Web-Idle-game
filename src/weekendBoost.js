// Wochenend-Bonus: Samstag und Sonntag (Berliner Zeit) sind seltene Tiere in
// Truhen und Shop-Rotation häufiger, Küken, Huhn und Hase seltener.
//
// Spiegel: _weekend_boost_active / _weekend_factor in
// supabase/migrations/20261014_wochenend_bonus.sql
// (src/weekendBoostSql.test.js vergleicht beide Seiten).

export const WEEKEND_TIME_ZONE = 'Europe/Berlin'
export const WEEKEND_WEAK_SPECIES = ['chick', 'chicken', 'rabbit']
export const WEEKEND_WEAK_FACTOR = 0.5
export const WEEKEND_RARE_RARITIES = ['rare', 'epic', 'legendary']
export const WEEKEND_RARE_FACTOR = 2

export function weekendFactor(species, rarity) {
  if (WEEKEND_WEAK_SPECIES.includes(species)) return WEEKEND_WEAK_FACTOR
  if (WEEKEND_RARE_RARITIES.includes(rarity)) return WEEKEND_RARE_FACTOR
  return 1
}

export function isWeekendBoost(date = new Date()) {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: WEEKEND_TIME_ZONE, weekday: 'short' })
    .format(date)
  return day === 'Sat' || day === 'Sun'
}
