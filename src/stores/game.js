import { defineStore } from 'pinia'
import { supabase } from '../supabase'
import { SPECIES, loadCatalog, animalRate, isUpgrading, tierInfo } from '../animals'
import { useAuthStore } from './auth'

const TAP_MAX = 10

export const useGameStore = defineStore('game', {
  state: () => ({
    coins: 0,
    animals: [],
    equipSlots: 1,
    favoriteAnimalId: null,
    tapLevel: 1,
    tapCapLevel: 1,
    offlineLevel: 1,
    lastCollected: null,
    loading: false,
    tickCoins: 0,
    tapsUsed: 0,
    tapsMax: TAP_MAX,
    tapsNextReset: 0,
    petBoostMultiplier: 1,
    petBoostUntil: 0,
    serverOffset: 0,
    catalogLoaded: false
  }),
  getters: {
    favoriteAnimal(state) {
      return state.animals.find(a => a.id === state.favoriteAnimalId) || null
    },
    tapMultiplier(state) {
      return 1 + (state.tapLevel - 1) * 0.25
    },
    nextTapCost(state) {
      return Math.floor(100 * Math.pow(3, state.tapLevel - 1))
    },
    nextCapCost(state) {
      return Math.floor(150 * Math.pow(3, state.tapCapLevel - 1))
    },
    // Offline: Basis 2h, pro Level +30min, hart gecappt bei 8h (Server-Limit).
    maxOfflineHours(state) {
      return Math.min(8, 2 + (state.offlineLevel - 1) * 0.5)
    },
    nextOfflineCost(state) {
      return Math.floor(500 * Math.pow(2.5, state.offlineLevel - 1))
    },
    offlineMaxed() {
      return this.maxOfflineHours >= 8
    },
    baseRate(state) {
      return state.animals
        .filter(a => a.equipped && !isUpgrading(a))
        .reduce((sum, a) => sum + animalRate(a), 0)
    },
    boostActive(state) {
      return (Date.now() + state.serverOffset) < state.petBoostUntil
    },
    activeMultiplier(state) {
      return this.boostActive ? state.petBoostMultiplier : 1
    },
    favoriteBoostActive(state) {
      const fav = this.favoriteAnimal
      return this.boostActive && !!fav && !!fav.equipped && !isUpgrading(fav)
    },
    ratePerSec(state) {
      const fav = this.favoriteAnimal
      let total = 0
      for (const a of state.animals) {
        if (!a.equipped || isUpgrading(a)) continue
        const r = animalRate(a)
        const isFav = fav && a.id === fav.id
        total += r * (isFav && this.boostActive ? state.petBoostMultiplier : 1)
      }
      return total
    },
    rateForAnimal(state) {
      return (a) => {
        if (isUpgrading(a)) return 0
        const r = animalRate(a)
        const isFav = state.favoriteAnimalId === a.id
        return r * (isFav && this.boostActive ? state.petBoostMultiplier : 1)
      }
    },
    displayCoins(state) {
      return state.coins + state.tickCoins
    },
    equippedCount(state) {
      return state.animals.filter(a => a.equipped).length
    },
    freeSlots(state) {
      return Math.max(0, state.equipSlots - state.animals.filter(a => a.equipped).length)
    },
    tapsRemaining(state) {
      return Math.max(0, state.tapsMax - state.tapsUsed)
    }
  },
  actions: {
    async ensureCatalog() {
      if (this.catalogLoaded) return
      await loadCatalog()
      this.catalogLoaded = true
    },
    async load() {
      const auth = useAuthStore()
      if (!auth.user) return
      this.loading = true
      await this.ensureCatalog()
      const [{ data: p }, { data: animals }, tapStatus] = await Promise.all([
        supabase.from('profiles').select('coins, last_collected_at, equip_slots, favorite_animal_id, tap_level, tap_cap_level, offline_level').eq('id', auth.user.id).maybeSingle(),
        supabase.from('animals').select('*').eq('owner_id', auth.user.id).order('acquired_at'),
        supabase.rpc('get_tap_status', { p_max: TAP_MAX })
      ])
      this.coins = Number(p?.coins ?? 0)
      this.equipSlots = Number(p?.equip_slots ?? 1)
      this.favoriteAnimalId = p?.favorite_animal_id || null
      this.tapLevel = Number(p?.tap_level ?? 1)
      this.tapCapLevel = Number(p?.tap_cap_level ?? 1)
      this.offlineLevel = Number(p?.offline_level ?? 1)
      this.lastCollected = p?.last_collected_at ? new Date(p.last_collected_at) : new Date()
      this.animals = animals || []
      if (!this.favoriteAnimalId && this.animals.length > 0) {
        const first = this.animals.find(a => a.equipped) || this.animals[0]
        if (first) this.setFavoriteAnimal(first.id).catch(() => {})
      }
      if (tapStatus?.data) this.applyTapStatus(tapStatus.data)
      this.applyOffline()
      this.loading = false
    },
    applyTapStatus(data) {
      this.tapsUsed = Number(data.taps_used ?? 0)
      this.tapsMax = Number(data.taps_max ?? TAP_MAX)
      this.tapsNextReset = new Date(data.next_reset).getTime()
      this.petBoostMultiplier = Number(data.boost_multiplier ?? 1)
      this.petBoostUntil = data.boost_until ? new Date(data.boost_until).getTime() : 0
      if (data.server_now) this.serverOffset = new Date(data.server_now).getTime() - Date.now()
    },
    applyOffline() {
      if (!this.lastCollected) return
      const capSec = this.maxOfflineHours * 3600
      const elapsed = Math.min((Date.now() - this.lastCollected.getTime()) / 1000, capSec)
      const earned = Math.floor(this.baseRate * Math.max(elapsed, 0))
      if (earned > 0) this.tickCoins += earned
    },
    tick(dt) {
      this.tickCoins += this.ratePerSec * dt
      if (this.tapsNextReset && Date.now() + this.serverOffset >= this.tapsNextReset) {
        this.tapsUsed = 0
        this.tapsNextReset = this.tapsNextReset + 5 * 60 * 1000
      }
    },
    async persist() {
      const auth = useAuthStore()
      if (!auth.user) return
      const pending = Math.floor(this.tickCoins)
      if (pending <= 0 && this.lastCollected && (Date.now() - this.lastCollected.getTime()) < 15000) return
      this.coins += pending
      this.tickCoins -= pending
      const { data, error } = await supabase.rpc('collect_offline', { p_coins: pending })
      if (!error && data?.coins != null) this.coins = Number(data.coins)
      this.lastCollected = new Date()
    },
    async tapEarn() {
      if (this.tapsUsed >= this.tapsMax) throw new Error('Tap-Limit erreicht')
      this.tapsUsed += 1
      const { data, error } = await supabase.rpc('tap_earn', { p_max: TAP_MAX })
      if (error) {
        this.tapsUsed = Math.max(0, this.tapsUsed - 1)
        if (/limit/i.test(error.message)) await this.refreshTapStatus()
        throw error
      }
      this.coins = Number(data.coins)
      this.tapsUsed = Math.max(this.tapsUsed, Number(data.taps_used))
      this.tapsNextReset = new Date(data.next_reset).getTime()
      if (data.server_now) this.serverOffset = new Date(data.server_now).getTime() - Date.now()
      return data
    },
    async refreshTapStatus() {
      const { data } = await supabase.rpc('get_tap_status', { p_max: TAP_MAX })
      if (data) this.applyTapStatus(data)
    },
    async upgradeTap(kind = 'mul') {
      const { data, error } = await supabase.rpc('upgrade_tap', { p_kind: kind })
      if (error) throw error
      this.coins = Number(data.coins)
      if (data.tap_level != null) this.tapLevel = Number(data.tap_level)
      if (data.tap_cap_level != null) this.tapCapLevel = Number(data.tap_cap_level)
      if (data.taps_max != null) this.tapsMax = Number(data.taps_max)
      return data
    },
    async upgradeOffline() {
      await this.persist()
      const cost = this.nextOfflineCost
      if (this.displayCoins < cost) throw new Error('Nicht genug Münzen')
      if (this.maxOfflineHours >= 8) throw new Error('Maximales Offline-Limit erreicht')
      const { data, error } = await supabase.rpc('upgrade_offline')
      if (error) throw error
      if (data?.coins != null) this.coins = Number(data.coins)
      if (data?.offline_level != null) this.offlineLevel = Number(data.offline_level)
      return data
    },
    async startTierUpgrade(animalIds, targetTier) {
      await this.persist()
      const { data, error } = await supabase.rpc('start_tier_upgrade', { p_animal_ids: animalIds, p_target_tier: targetTier })
      if (error) throw error
      await this.load()
      return data
    },
    async feedPet(foodKey) {
      await this.persist()
      const { data, error } = await supabase.rpc('feed_pet', { p_food: foodKey })
      if (error) throw error
      this.coins = Number(data.coins)
      this.petBoostMultiplier = Number(data.boost_multiplier)
      this.petBoostUntil = new Date(data.boost_until).getTime()
      if (data.server_now) this.serverOffset = new Date(data.server_now).getTime() - Date.now()
      return data
    },
    async buyAnimal(speciesKey) {
      const info = SPECIES[speciesKey]
      if (!info) throw new Error('Unbekannte Spezies')
      await this.persist()
      if (this.displayCoins < info.cost) throw new Error('Nicht genug Münzen')
      const { data, error } = await supabase.rpc('buy_animal', { p_species: speciesKey, p_cost: info.cost })
      if (error) throw error
      this.coins = Number(data?.coins ?? this.coins - info.cost)
      if (data?.animal) {
        this.animals.push(data.animal)
        if (!this.favoriteAnimalId) this.favoriteAnimalId = data.animal.id
      } else await this.load()
      return data
    },
    async equipAnimal(animalId) {
      const { error } = await supabase.rpc('equip_animal', { p_animal_id: animalId })
      if (error) throw error
      const a = this.animals.find(x => x.id === animalId)
      if (a) a.equipped = true
    },
    async unequipAnimal(animalId) {
      await this.persist()
      const { error } = await supabase.rpc('unequip_animal', { p_animal_id: animalId })
      if (error) throw error
      const a = this.animals.find(x => x.id === animalId)
      if (a) a.equipped = false
    },
    async setFavoriteAnimal(animalId) {
      const prev = this.favoriteAnimalId
      this.favoriteAnimalId = animalId
      const { error } = await supabase.rpc('set_favorite_animal', { p_animal_id: animalId })
      if (error) { this.favoriteAnimalId = prev; throw error }
    },
    async buyEquipSlot() {
      await this.persist()
      const { data, error } = await supabase.rpc('buy_equip_slot')
      if (error) throw error
      this.coins = Number(data?.coins ?? this.coins)
      this.equipSlots = Number(data?.equip_slots ?? this.equipSlots)
      return data
    },
    async sendCoins(recipientUsername, amount) {
      await this.persist()
      const { data, error } = await supabase.rpc('send_coins', {
        p_recipient: recipientUsername,
        p_amount: Math.floor(amount)
      })
      if (error) throw error
      this.coins = Number(data?.sender_balance ?? this.coins - amount)
      return data
    }
  }
})
