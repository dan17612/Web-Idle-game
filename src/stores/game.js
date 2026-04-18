import { defineStore } from 'pinia'
import { supabase } from '../supabase'
import { SPECIES, speciesInfo } from '../animals'
import { useAuthStore } from './auth'

export const useGameStore = defineStore('game', {
  state: () => ({
    coins: 0,
    animals: [],
    lastCollected: null,
    loading: false,
    tickCoins: 0
  }),
  getters: {
    ratePerSec(state) {
      return state.animals.reduce((sum, a) => sum + (speciesInfo(a.species).rate * (a.level || 1)), 0)
    },
    displayCoins(state) {
      return state.coins + state.tickCoins
    }
  },
  actions: {
    async load() {
      const auth = useAuthStore()
      if (!auth.user) return
      this.loading = true
      const [{ data: p }, { data: animals }] = await Promise.all([
        supabase.from('profiles').select('coins, last_collected_at').eq('id', auth.user.id).maybeSingle(),
        supabase.from('animals').select('*').eq('owner_id', auth.user.id).order('acquired_at')
      ])
      this.coins = Number(p?.coins ?? 0)
      this.lastCollected = p?.last_collected_at ? new Date(p.last_collected_at) : new Date()
      this.animals = animals || []
      this.applyOffline()
      this.loading = false
    },
    applyOffline() {
      if (!this.lastCollected) return
      const elapsed = Math.min((Date.now() - this.lastCollected.getTime()) / 1000, 60 * 60 * 8)
      const earned = Math.floor(this.ratePerSec * Math.max(elapsed, 0))
      if (earned > 0) this.tickCoins += earned
    },
    tick(dt) {
      this.tickCoins += this.ratePerSec * dt
    },
    async persist() {
      const auth = useAuthStore()
      if (!auth.user) return
      const pending = Math.floor(this.tickCoins)
      if (pending <= 0 && this.lastCollected && (Date.now() - this.lastCollected.getTime()) < 15000) return
      this.coins += pending
      this.tickCoins -= pending
      // Server validiert max. Einkommen und aktualisiert last_collected_at
      const { data, error } = await supabase.rpc('collect_offline', { p_coins: pending })
      if (!error && data?.coins != null) {
        this.coins = Number(data.coins)
      }
      this.lastCollected = new Date()
    },
    async buyAnimal(speciesKey) {
      const info = SPECIES[speciesKey]
      if (!info) throw new Error('Unbekannte Spezies')
      await this.persist()
      if (this.displayCoins < info.cost) throw new Error('Nicht genug Münzen')
      // p_cost wird serverseitig ignoriert — Preis kommt aus species_costs-Tabelle
      const { data, error } = await supabase.rpc('buy_animal', {
        p_species: speciesKey,
        p_cost: info.cost
      })
      if (error) throw error
      this.coins = Number(data?.coins ?? this.coins - info.cost)
      if (data?.animal) this.animals.push(data.animal)
      else await this.load()
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
