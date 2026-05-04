import { defineStore } from 'pinia'
import { supabase } from '../supabase'
import { SPECIES, loadCatalog, animalRate, compareAnimalsByRate, isUpgrading, tierInfo } from '../animals'
import { useAuthStore } from './auth'
import { t } from '../i18n'

const TAP_MAX = 10
const TAP_MUL_MAX_LEVEL = 300
const TAP_CAP_MAX_LEVEL = 300
const SLOT_MAX = 12
const BOSS_BOOST_MULTIPLIER = 10
const BOSS_BOOST_DURATION_MS = 10 * 60 * 1000

export const useGameStore = defineStore('game', {
  state: () => ({
    coins: 0,
    tickets: 0,
    animals: [],
    equipSlots: 1,
    favoriteAnimalId: null,
    tapLevel: 1,
    tapCapLevel: 1,
    offlineLevel: 1,
    lastCollected: null,
    loading: false,
    lastLoadedAt: 0,
    tickCoins: 0,
    tapsUsed: 0,
    tapsMax: TAP_MAX,
    tapsNextReset: 0,
    petBoostMultiplier: 1,
    petBoostUntil: 0,
    serverOffset: 0,
    catalogLoaded: false,
    bonusTaps: 0,
    newbieGiftClaimed: false,
    pendingGiftToast: null,
    pendingOfflineEarnings: null,
    tutorialStep: 5,
    bossPathHighest: 0,
    bossPathCurrent: 1,
    craftJob: null
  }),
  getters: {
    favoriteAnimal(state) {
      return state.animals.find(a => a.id === state.favoriteAnimalId) || null
    },
    tapMultiplier(state) {
      return 1 + (state.tapLevel - 1) * 0.25
    },
    nextTapCost(state) {
      if (state.tapLevel >= TAP_MUL_MAX_LEVEL) return null
      return Math.floor(100 * Math.pow(3, state.tapLevel - 1))
    },
    nextCapCost(state) {
      if (state.tapCapLevel >= TAP_CAP_MAX_LEVEL) return null
      return Math.floor(100 * Math.pow(3, state.tapCapLevel - 1))
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
    tapMulMaxed(state) {
      return state.tapLevel >= TAP_MUL_MAX_LEVEL
    },
    tapCapMaxed(state) {
      return state.tapCapLevel >= TAP_CAP_MAX_LEVEL
    },
    baseRate(state) {
      return state.animals
        .filter(a => a.equipped && !isUpgrading(a))
        .reduce((sum, a) => sum + animalRate(a), 0)
    },
    boostActive(state) {
      return (Date.now() + state.serverOffset) < state.petBoostUntil
    },
    bossBoostActive(state) {
      return this.boostActive && Number(state.petBoostMultiplier) >= BOSS_BOOST_MULTIPLIER
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
        if (!a) return 0
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
    },
    effectiveTapsRemaining(state) {
      return Math.max(0, state.tapsMax - state.tapsUsed) + Math.max(0, state.bonusTaps)
    },
    newbieGiftAvailable(state) {
      return !state.newbieGiftClaimed && state.animals.length === 0 && state.tapsUsed >= state.tapsMax
    },
    bossArenaUnlocked(state) {
      return Number(state.bossPathHighest) >= 3
    },
    slotsMaxed(state) {
      return state.equipSlots >= SLOT_MAX
    },
    craftJobReady(state) {
      const job = state.craftJob
      if (!job || !job.active || !job.ready_at) return false
      const ready = new Date(job.ready_at).getTime()
      return Date.now() + state.serverOffset >= ready
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
        supabase.from('profiles').select('coins, tickets, last_collected_at, equip_slots, favorite_animal_id, tap_level, tap_cap_level, offline_level').eq('id', auth.user.id).maybeSingle(),
        supabase.from('animals').select('*').eq('owner_id', auth.user.id).order('acquired_at'),
        supabase.rpc('get_tap_status', { p_max: TAP_MAX })
      ])
      this.coins = Number(p?.coins ?? 0)
      this.tickets = Number(p?.tickets ?? 0)
      this.equipSlots = Number(p?.equip_slots ?? 1)
      this.favoriteAnimalId = p?.favorite_animal_id || null
      this.tapLevel = Number(p?.tap_level ?? 1)
      this.tapCapLevel = Number(p?.tap_cap_level ?? 1)
      this.offlineLevel = Number(p?.offline_level ?? 1)
      let localClaimed = false
      try { localClaimed = localStorage.getItem('newbieGiftClaimed:' + auth.user.id) === '1' } catch {}
      try {
        const { data: gp } = await supabase.from('profiles')
          .select('newbie_gift_claimed').eq('id', auth.user.id).maybeSingle()
        this.newbieGiftClaimed = !!gp?.newbie_gift_claimed || localClaimed
      } catch { this.newbieGiftClaimed = localClaimed }
      try {
        const stored = Number(localStorage.getItem('bonusTaps:' + auth.user.id) || 0)
        this.bonusTaps = isFinite(stored) && stored > 0 ? stored : 0
      } catch { this.bonusTaps = 0 }
      this.lastCollected = p?.last_collected_at ? new Date(p.last_collected_at) : new Date()
      this.animals = animals || []
      try {
        const stored = localStorage.getItem('tutorialStep2:' + auth.user.id)
        if (stored != null) {
          this.tutorialStep = Number(stored)
        } else {
          this.tutorialStep = (this.newbieGiftClaimed || this.animals.length > 0) ? 5 : 0
          localStorage.setItem('tutorialStep2:' + auth.user.id, String(this.tutorialStep))
        }
      } catch { this.tutorialStep = 5 }
      if (!this.favoriteAnimalId && this.animals.length > 0) {
        const first = this.animals.find(a => a.equipped) || this.animals[0]
        if (first) this.setFavoriteAnimal(first.id).catch(() => {})
      }
      if (tapStatus?.data) this.applyTapStatus(tapStatus.data)
      this.applyOffline()
      this.loading = false
      this.claimPendingGifts().catch(() => {})
      this.loadBossPath().catch(() => {})
      this.loadCraftStatus().catch(() => {})
      this.lastLoadedAt = Date.now()
    },
    async claimPendingGifts() {
      const auth = useAuthStore()
      if (!auth.user) return null
      const { data, error } = await supabase.rpc('claim_pending_gifts')
      if (error) return null
      const gifts = Array.isArray(data?.gifts) ? data.gifts : []
      if (gifts.length === 0) return data
      if (Number(data?.coins) > 0) this.coins += Number(data.coins)
      const { data: animals } = await supabase.from('animals').select('*').eq('owner_id', auth.user.id).order('acquired_at')
      this.animals = animals || this.animals
      this.pendingGiftToast = gifts
      return data
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
      if (this.pendingOfflineEarnings) return
      const capSec = this.maxOfflineHours * 3600
      const rawElapsed = Math.max(0, (Date.now() - this.lastCollected.getTime()) / 1000)
      const elapsed = Math.min(rawElapsed, capSec)
      const rate = this.baseRate
      const earned = Math.floor(rate * elapsed)
      const dialogThreshold = 120
      if (earned <= 0) return
      if (rawElapsed < dialogThreshold) {
        this.tickCoins += earned
        this.lastCollected = new Date()
        return
      }
      this.pendingOfflineEarnings = {
        coins: earned,
        rate,
        elapsedSec: Math.floor(elapsed),
        capSec,
        capped: rawElapsed >= capSec
      }
    },
    claimOfflineEarnings() {
      const p = this.pendingOfflineEarnings
      if (!p) return
      if (p.coins > 0) this.tickCoins += p.coins
      this.lastCollected = new Date()
      this.pendingOfflineEarnings = null
      this.persist().catch(() => {})
    },
    tick(dt) {
      this.tickCoins += this.ratePerSec * dt
      while (this.tapsNextReset && Date.now() + this.serverOffset >= this.tapsNextReset) {
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
      try {
        const { data, error } = await supabase.rpc('collect_offline', { p_coins: pending })
        if (!error && data?.coins != null) this.coins = Number(data.coins)
      } catch {
        // Persist ist Best-Effort (z.B. waehrend JWT-Refresh) und darf nachfolgende
        // Aktionen wie complete_boss_stage nicht blockieren.
      }
      this.lastCollected = new Date()
    },
    async tapEarn() {
      const normalMax = 10 + (this.tapCapLevel - 1) * 5
      const usingBonus = this.tapsUsed >= normalMax && this.bonusTaps > 0
      if (this.tapsUsed >= normalMax && !usingBonus) throw new Error(t('storeErrors.tapLimit'))
      this.tapsUsed += 1
      const effectiveMax = usingBonus
        ? Math.max(this.tapsUsed + 1, normalMax + this.bonusTaps)
        : normalMax
      const { data, error } = await supabase.rpc('tap_earn', { p_max: effectiveMax })
      if (error) {
        this.tapsUsed = Math.max(0, this.tapsUsed - 1)
        if (/limit/i.test(error.message)) await this.refreshTapStatus()
        throw error
      }
      const serverUsed = Number(data.taps_used)
      if (serverUsed > normalMax) {
        this.bonusTaps = Math.max(0, this.bonusTaps - 1)
        try {
          const auth = useAuthStore()
          if (auth.user) localStorage.setItem('bonusTaps:' + auth.user.id, String(this.bonusTaps))
        } catch {}
      }
      this.coins = Number(data.coins)
      this.tapsUsed = Math.max(this.tapsUsed, serverUsed)
      this.tapsNextReset = new Date(data.next_reset).getTime()
      if (data.server_now) this.serverOffset = new Date(data.server_now).getTime() - Date.now()
      return data
    },
    async claimNewbieGift() {
      const auth = useAuthStore()
      if (!auth.user) throw new Error(t('storeErrors.notAuthenticated'))
      const { data, error } = await supabase.rpc('claim_newbie_gift')
      if (error) {
        const msg = error.message || String(error)
        if (/not[_\s]?found|does not exist|schema cache|function.*claim_newbie_gift/i.test(msg)) {
          throw new Error(t('storeErrors.giftFunctionUnavailable'))
        }
        throw error
      }
      const bonus = Number(data?.bonus_taps ?? 50)
      this.bonusTaps = (this.bonusTaps || 0) + bonus
      this.newbieGiftClaimed = true
      if (data?.coins != null) this.coins = Number(data.coins)
      else if (data?.coins_added) this.coins += Number(data.coins_added)
      this.setTutorialStep(2)
      try {
        localStorage.setItem('bonusTaps:' + auth.user.id, String(this.bonusTaps))
        localStorage.setItem('newbieGiftClaimed:' + auth.user.id, '1')
      } catch {}
      await this.load()
      return data
    },
    setTutorialStep(step) {
      const auth = useAuthStore()
      this.tutorialStep = step
      if (auth.user) {
        try { localStorage.setItem('tutorialStep2:' + auth.user.id, String(step)) } catch {}
      }
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
      if (this.displayCoins < cost) throw new Error(t('storeErrors.notEnoughCoins'))
      if (this.maxOfflineHours >= 8) throw new Error(t('storeErrors.offlineLimitMax'))
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
    async startTierDowngrade(animalId) {
      await this.persist()
      const { data, error } = await supabase.rpc('start_tier_downgrade', { p_animal_id: animalId })
      if (error) throw error
      await this.load()
      return data
    },
    async feedPet(foodKey) {
      if (this.boostActive) throw new Error(t('storeErrors.boostAlreadyActive'))
      await this.persist()
      const { data, error } = await supabase.rpc('feed_pet', { p_food: foodKey })
      if (error) throw error
      this.coins = Number(data.coins)
      this.petBoostMultiplier = Number(data.boost_multiplier)
      this.petBoostUntil = new Date(data.boost_until).getTime()
      if (data.server_now) this.serverOffset = new Date(data.server_now).getTime() - Date.now()
      return data
    },
    async loadBossPath() {
      const { data, error } = await supabase.rpc('get_boss_path')
      if (error) throw error
      if (data) {
        this.bossPathHighest = Number(data.highest_stage || 0)
        this.bossPathCurrent = Number(data.current_stage || 1)
      }
      return data || null
    },
    async completeBossStage(stage, score, target) {
      await this.persist()
      const args = {
        p_stage: Math.floor(Number(stage) || 0),
        p_score: Math.floor(Number(score) || 0),
        p_target: Math.floor(Number(target) || 0)
      }
      let { data, error } = await supabase.rpc('complete_boss_stage', args)
      if (error && /wrong stage/i.test(error.message || '')) {
        // Lokaler Stand war veraltet (z.B. Mehrgeraete-Login). Aktuellen Stand vom
        // Server holen und genau einmal mit dem korrekten Stage erneut versuchen.
        try {
          const fresh = await this.loadBossPath()
          const serverStage = Number(fresh?.current_stage || 0)
          if (serverStage > 0 && serverStage !== args.p_stage) {
            args.p_stage = serverStage
            ;({ data, error } = await supabase.rpc('complete_boss_stage', args))
          }
        } catch {}
      }
      if (error) throw error
      const completedStage = Number(data?.stage || stage)
      this.bossPathHighest = Math.max(Number(this.bossPathHighest || 0), completedStage)
      this.bossPathCurrent = Number(data?.next_stage || completedStage + 1)
      if (Number(data?.pet_reward?.qty || 0) > 0) {
        if (!this.favoriteAnimalId && Array.isArray(data?.pet_reward?.animal_ids)) {
          this.favoriteAnimalId = data.pet_reward.animal_ids[0] || null
        }
        const auth = useAuthStore()
        if (auth.user) {
          const { data: animals } = await supabase.from('animals').select('*').eq('owner_id', auth.user.id).order('acquired_at')
          if (animals) this.animals = animals
        }
      }
      return data
    },
    async openBossPathChest(rewardId) {
      const { data, error } = await supabase.rpc('open_boss_chest', { p_reward_id: rewardId })
      if (error) throw error
      const auth = useAuthStore()
      if (auth.user) {
        const { data: animals } = await supabase.from('animals').select('*').eq('owner_id', auth.user.id).order('acquired_at')
        if (animals) this.animals = animals
      }
      return data
    },
    async activateBossPathReward(rewardId) {
      const { data, error } = await supabase.rpc('activate_boss_reward', { p_reward_id: rewardId })
      if (error) throw error
      if (data?.boost_multiplier != null) this.petBoostMultiplier = Number(data.boost_multiplier)
      if (data?.boost_until) this.petBoostUntil = new Date(data.boost_until).getTime()
      if (data?.server_now) this.serverOffset = new Date(data.server_now).getTime() - Date.now()
      return data
    },
    async claimBossBoost(score, target) {
      await this.persist()
      const { data, error } = await supabase.rpc('claim_boss_boost', {
        p_score: Math.floor(Number(score) || 0),
        p_target: Math.floor(Number(target) || 0)
      })
      if (error) {
        const msg = error.message || String(error)
        if (!/claim_boss_boost|schema cache|does not exist|not found/i.test(msg)) throw error
        const serverNow = Date.now() + this.serverOffset
        const currentIsBossBoost = this.boostActive && Number(this.petBoostMultiplier) >= BOSS_BOOST_MULTIPLIER
        this.petBoostMultiplier = BOSS_BOOST_MULTIPLIER
        this.petBoostUntil = currentIsBossBoost
          ? Math.max(this.petBoostUntil + BOSS_BOOST_DURATION_MS, serverNow + BOSS_BOOST_DURATION_MS)
          : serverNow + BOSS_BOOST_DURATION_MS
        return {
          boost_multiplier: this.petBoostMultiplier,
          boost_until: new Date(this.petBoostUntil).toISOString(),
          server_now: new Date(serverNow).toISOString(),
          local_only: true
        }
      }
      this.petBoostMultiplier = Number(data?.boost_multiplier ?? BOSS_BOOST_MULTIPLIER)
      this.petBoostUntil = data?.boost_until
        ? new Date(data.boost_until).getTime()
        : Date.now() + this.serverOffset + BOSS_BOOST_DURATION_MS
      if (data?.server_now) this.serverOffset = new Date(data.server_now).getTime() - Date.now()
      return data
    },
    async buyAnimal(speciesKey) {
      const info = SPECIES[speciesKey]
      if (!info) throw new Error(t('storeErrors.unknownSpecies'))
      await this.persist()
      if (this.displayCoins < info.cost) throw new Error(t('storeErrors.notEnoughCoins'))
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
    async equipBestAnimals() {
      await this.persist()
      const bestIds = this.animals
        .filter(a => !isUpgrading(a))
        .slice()
        .sort(compareAnimalsByRate)
        .slice(0, this.equipSlots)
        .map(a => a.id)
      const bestSet = new Set(bestIds)
      const toUnequip = this.animals.filter(a => a.equipped && !bestSet.has(a.id)).map(a => a.id)
      const toEquip = bestIds.filter(id => !this.animals.find(a => a.id === id)?.equipped)

      for (const id of toUnequip) {
        const { error } = await supabase.rpc('unequip_animal', { p_animal_id: id })
        if (error) throw error
        const a = this.animals.find(x => x.id === id)
        if (a) a.equipped = false
      }
      for (const id of toEquip) {
        const { error } = await supabase.rpc('equip_animal', { p_animal_id: id })
        if (error) throw error
        const a = this.animals.find(x => x.id === id)
        if (a) a.equipped = true
      }
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
    },
    async loadCraftRecipes() {
      const { data, error } = await supabase
        .from('craft_recipes')
        .select('*')
        .eq('enabled', true)
        .order('created_at')
      if (error) throw error
      return data || []
    },
    async craftAnimal(recipeId) {
      const { data, error } = await supabase.rpc('craft_animal', { p_recipe_id: recipeId })
      if (error) throw error
      this.craftJob = data || null
      if (data?.server_now) this.serverOffset = new Date(data.server_now).getTime() - Date.now()
      const auth = useAuthStore()
      if (auth.user) {
        const { data: animals } = await supabase.from('animals').select('*').eq('owner_id', auth.user.id).order('acquired_at')
        if (animals) this.animals = animals
      }
      return data
    },
    async loadCraftStatus() {
      const { data, error } = await supabase.rpc('get_craft_status')
      if (error) return null
      this.craftJob = data && data.active ? data : null
      if (data?.server_now) this.serverOffset = new Date(data.server_now).getTime() - Date.now()
      return data
    },
    async claimCraftAnimal() {
      const { data, error } = await supabase.rpc('claim_craft_animal')
      if (error) throw error
      this.craftJob = null
      const auth = useAuthStore()
      if (auth.user) {
        const { data: animals } = await supabase.from('animals').select('*').eq('owner_id', auth.user.id).order('acquired_at')
        if (animals) this.animals = animals
      }
      return data
    },
    async releaseAnimal(animalId) {
      await this.persist()
      const { data, error } = await supabase.rpc('release_animal', { p_animal_id: animalId })
      if (error) throw error
      this.tickets = Number(data?.tickets ?? this.tickets)
      this.animals = this.animals.filter(a => a.id !== animalId)
      if (this.favoriteAnimalId === animalId) {
        const next = this.animals.find(a => a.equipped) || this.animals[0]
        this.favoriteAnimalId = next ? next.id : null
      }
      return data
    },
    async releaseAnimalsBulk(species, tier, qty) {
      await this.persist()
      const { data, error } = await supabase.rpc('release_animals', {
        p_species: species,
        p_tier: tier || 'normal',
        p_qty: Math.max(1, Math.floor(qty || 1))
      })
      if (error) throw error
      this.tickets = Number(data?.tickets ?? this.tickets)
      await this.load()
      return data
    },
    async getTicketShop() {
      const { data, error } = await supabase.rpc('get_ticket_shop')
      if (error) throw error
      if (data?.tickets != null) this.tickets = Number(data.tickets)
      return data
    },
    async buyTicketShop(speciesKey) {
      const { data, error } = await supabase.rpc('ticket_shop_buy', { p_species: speciesKey })
      if (error) throw error
      this.tickets = Number(data?.tickets ?? this.tickets)
      if (data?.animal) {
        this.animals.push(data.animal)
        if (!this.favoriteAnimalId) this.favoriteAnimalId = data.animal.id
      }
      return data
    },
    async openTicketChest(qty = 1) {
      await this.persist()
      const { data, error } = await supabase.rpc('ticket_chest_open', { p_qty: qty })
      if (error) throw error
      this.tickets = Number(data?.tickets ?? this.tickets)
      await this.load()
      return data
    }
  }
})
