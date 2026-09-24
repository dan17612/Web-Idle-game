import { reactive } from 'vue'
import { supabase } from './supabase'

export { rarityInfo, sortByRarity, formatDropChance } from './eggRarity.js'

export const EGG_TYPES = reactive({})
export const EGG_DROP_SPECIES = reactive(new Set())

export async function loadEggDropSpecies() {
  const { data, error } = await supabase.from('egg_drop_pool').select('species')
  if (error) return // Netzfehler: bisherigen Stand behalten
  EGG_DROP_SPECIES.clear()
  for (const r of data || []) EGG_DROP_SPECIES.add(r.species)
}

export async function loadEggCatalog() {
  const { data, error } = await supabase.from('egg_types')
    .select('egg_type, name, emoji, price_coins, incubation_minutes, shop_visible, enabled')
  // Netzfehler (z. B. direkt nach App-Rückkehr): Katalog nicht leeren.
  if (error) return
  for (const k of Object.keys(EGG_TYPES)) delete EGG_TYPES[k]
  for (const r of data || []) {
    EGG_TYPES[r.egg_type] = { ...r }
  }
  await loadEggDropSpecies()
}
