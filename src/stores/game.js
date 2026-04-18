import { defineStore } from 'pinia'
import { supabase } from '../supabase'
import { SPECIES, speciesInfo } from '../animals'
import { useAuthStore } from './auth'

const TAP_MAX = 10

export const useGameStore = defineStore('game', {
  state: () => ({
    coins: 0,
    animals: [],
    equipSlots: 1,
    favoriteAnimalId: null,
    lastCollected: null,
    loading: false,
    tickCoins: 0,
    tapsUsed: 0,
    tapsMax: TAP_MAX,
    tapsNextReset: 0,
    petBoostMultiplier: 1,
    petBoostUntil: 0,
    serverOffset: 0
  }),
  getters: {
    favoriteAnimal(state) {
      return state.animals.find(a => a.id === state.favoriteAnimalId) || null
    },
    baseRate(state) {
      return state.animals
        .filter(a => a.equipped)
        .reduce((sum, a) => sum + speciesInfo(a.species).rate * (a.level || 1), 0)
    },
    boostActive(state) {
      return (Date.now() + state.serverOffset) < state.petBoostUntil
    },
    activeMultiplier(state) {
      return this.boostActive ? state.petBoostMultiplier : 1
    },
    favoriteBoostActive(state) {
      const fav = this.favoriteAnimal
      return this.boostActive && !!fav && !!fav.equipped
    },
    ratePerSec(state) {
      const fav = this.favoriteAnimal
      let total = 0
      for (const a of state.animals) {
        if (!a.equipped) continue
        const r = speciesInfo(a.species).rate * (a.level || 1)
        const isFav = fav && a.id === fav.id
        total += r * (isFav && this.boostActive ? state.petBoostMultiplier : 1)
      }
      return total
    },
    rateForAnimal(state) {
      return (a) => {
        const r = speciesInfo(a.species).rate * (a.level || 1)
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
    async load() {
      const auth = useAuthStore()
      if (!auth.user) return
      this.loading = true
      const [{ data: p }, { data: animals }, tapStatus] = await Promise.all([
        supabase.from('profiles').select('coins, last_collected_at, equip_slots, favorite_animal_id').eq('id', auth.user.id).maybeSingle(),
        supabase.from('animals').select('*').eq('owner_id', auth.user.id).order('acquired_at'),
        supabase.rpc('get_tap_status', { p_max: TAP_MAX })
      ])
      this.coins = Number(p?.coins ?? 0)
      this.equipSlots = Number(p?.equip_slots ?? 1)
      this.favoriteAnimalId = p?.favorite_animal_id || null
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
      const elapsed = Math.min((Date.now() - this.lastCollected.getTime()) / 1000, 60 * 60 * 8)
      const earned = Math.floor(this.baseRate * Math.max(elapsed, 0))
      if (earned > 0) this.tickCoins += earned
    },
    tick(dt) {
      this.tickCoins += this.ratePerSec * dt
      // Tap-Limit Auto-Reset clientseitig, wenn das Server-Slot erreicht ist
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
      const { data, error } = await supabase.rpc('tap_earn', { p_max: TAP_MAX })
      if (error) {
        // Out-of-sync? Status neu laden
        if (/limit/i.test(error.message)) await this.refreshTapStatus()
        throw error
      }
      this.coins = Number(data.coins)
      this.tapsUsed = Number(data.taps_used)
      this.tapsNextReset = new Date(data.next_reset).getTime()
      if (data.server_now) this.serverOffset = new Date(data.server_now).getTime() - Date.now()
      return data
    },
    async refreshTapStatus() {
      const { data } = await supabase.rpc('get_tap_status', { p_max: TAP_MAX })
      if (data) this.applyTapStatus(data)
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
      const { data, error } = await supabase.rpc('buy_animal', {
        p_species: speciesKey,
        p_cost: info.cost
      })
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
