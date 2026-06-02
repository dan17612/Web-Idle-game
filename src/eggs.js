import { reactive } from 'vue'
import { supabase } from './supabase'

export { rarityInfo, sortByRarity, formatDropChance } from './eggRarity.js'

export const EGG_TYPES = reactive({})

export async function loadEggCatalog() {
  const { data } = await supabase.from('egg_types')
    .select('egg_type, name, emoji, price_coins, incubation_minutes, shop_visible, enabled')
  for (const k of Object.keys(EGG_TYPES)) delete EGG_TYPES[k]
  for (const r of data || []) {
    EGG_TYPES[r.egg_type] = { ...r }
  }
}
