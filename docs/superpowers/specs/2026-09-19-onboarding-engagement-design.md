# Onboarding & Engagement — Design Spec

**Status:** Proposal  
**Ziel:** Klare Progression für Neulinge + Long-Term Engagement für alle

---

## 1. Onboarding System (Phase 1–2)

### 1.1 State Machine

```
NULL (not started)
    ↓ (First visit)
'intro'
    ↓ (Splash dismissed)
'first_tap'
    ↓ (5 Taps done)
'first_buy'
    ↓ (Buy 1 animal)
'first_minigame'
    ↓ (Play any minigame)
'town' (optional: visit world)
    ↓
'friends' (optional: add friend)
    ↓
NULL (onboarding complete)
```

### 1.2 Onboarding Store (`stores/onboarding.js`)

```js
export const useOnboardingStore = defineStore('onboarding', () => {
  const game = useGameStore()
  const auth = useAuthStore()
  
  // Client-side tracking (doesn't sync yet, waits for RPC)
  const step = ref(auth.profile?.onboarding_step || null)
  const dismissed = ref(false)
  
  async function advanceStep(nextStep) {
    // RPC: advance_onboarding_step
    const { data, error } = await supabase.rpc('advance_onboarding_step', {
      p_next_step: nextStep
    })
    if (!error) step.value = nextStep
  }
  
  const isActive = computed(() => 
    step.value && !dismissed.value && step.value !== null
  )
  
  return { step, isActive, advanceStep, dismissed }
})
```

### 1.3 Database Schema

```sql
-- Add to player profiles
ALTER TABLE profiles ADD COLUMN onboarding_step TEXT;
-- Values: NULL | 'intro' | 'first_tap' | 'first_buy' | 'first_minigame' | 'town' | 'friends'

-- New RPC for server-side advancement
CREATE OR REPLACE FUNCTION advance_onboarding_step(p_next_step TEXT)
RETURNS TABLE (coins BIGINT, onboarding_step TEXT, server_now TIMESTAMP) AS $$
BEGIN
  UPDATE profiles
  SET onboarding_step = p_next_step
  WHERE id = auth.uid();
  
  RETURN QUERY
  SELECT profiles.coins, profiles.onboarding_step, NOW() AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
```

### 1.4 Welcome Splash (`OnboardingSplash.vue`)

```vue
<script setup>
import { ref } from 'vue'
import { useOnboardingStore } from '../stores/onboarding'

const onboarding = useOnboardingStore()
const startPressed = ref(false)

async function start() {
  startPressed.value = true
  await onboarding.advanceStep('first_tap')
}
</script>

<template>
  <div v-if="onboarding.isActive && onboarding.step === 'intro'" class="splash">
    <div class="splash-inner">
      <div class="splash-title">🐾 Zoo Empire</div>
      <div class="splash-subtitle">Tiere sammeln · Münzen verdienen · Freunde treffen</div>
      
      <div class="splash-animation">
        <!-- Animated farm scene or animals -->
        <div class="animals-preview">🐓 🐰 🐻 🐉</div>
      </div>
      
      <button class="btn full" @click="start" :disabled="startPressed">
        {{ startPressed ? '⏳ Startet...' : '🎮 Los geht\'s' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.splash {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #fdf2d9, #ffed99);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.splash-inner {
  padding: var(--space-3);
  text-align: center;
  max-width: 320px;
}

.splash-title {
  font-size: 48px;
  font-weight: 900;
  margin-bottom: var(--space-2);
  animation: bounce 0.6s ease-in-out;
}

.splash-subtitle {
  font-size: 16px;
  color: #2a1d05;
  margin-bottom: var(--space-4);
}

.animals-preview {
  font-size: 60px;
  margin-bottom: var(--space-4);
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  animation: float 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
</style>
```

### 1.5 Tutorial Bubbles (GameView Integration)

```vue
<!-- In GameView.vue -->
<TutorialBubble
  v-if="onboarding.step === 'first_tap'"
  text="Tippe auf die Sonne → verdiene Coins!"
  position="top"
/>

<!-- After 5 taps, auto-advance -->
watch(() => tapsThisSession, (val) => {
  if (val === 5 && onboarding.step === 'first_tap') {
    onboarding.advanceStep('first_buy')
    // Auto-open ShopView
    router.push({ name: 'shop' })
  }
})
```

---

## 2. Achievement System (Phase 3)

### 2.1 Database Schema

```sql
CREATE TABLE player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL, -- 'first_tap', 'first_buy', etc.
  unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reward_coins BIGINT NOT NULL DEFAULT 0,
  UNIQUE(user_id, key)
);

-- RPC to unlock
CREATE OR REPLACE FUNCTION unlock_achievement(p_key TEXT)
RETURNS TABLE (coins BIGINT, server_now TIMESTAMP) AS $$
DECLARE
  v_reward BIGINT;
BEGIN
  -- Prevent double-unlock
  IF EXISTS (SELECT 1 FROM player_achievements 
              WHERE user_id = auth.uid() AND key = p_key) THEN
    RAISE EXCEPTION 'Already unlocked';
  END IF;
  
  v_reward := (SELECT CASE p_key
    WHEN 'first_tap' THEN 1
    WHEN 'first_buy' THEN 5
    WHEN 'three_animals' THEN 10
    WHEN 'first_minigame' THEN 50
    ELSE 0
  END);
  
  INSERT INTO player_achievements (user_id, key, reward_coins)
  VALUES (auth.uid(), p_key, v_reward);
  
  UPDATE profiles
  SET coins = coins + v_reward
  WHERE id = auth.uid();
  
  RETURN QUERY
  SELECT profiles.coins, NOW() AT TIME ZONE 'UTC' FROM profiles WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
```

### 2.2 Achievement Definitions (Client)

```js
// src/achievements.js
export const ACHIEVEMENTS = {
  first_tap: {
    key: 'first_tap',
    title: 'Erste Tap',
    description: 'Tippe auf die Sonne',
    icon: '☀️',
    reward: 1,
    condition: (game) => game.taps_total > 0
  },
  first_buy: {
    key: 'first_buy',
    title: 'Erste Tieranschaffung',
    description: 'Kaufe dein erstes Tier',
    icon: '🐓',
    reward: 5,
    condition: (game) => game.animals_total >= 1
  },
  three_animals: {
    key: 'three_animals',
    title: 'Kleine Farm',
    description: '3 verschiedene Tier-Arten sammeln',
    icon: '🚜',
    reward: 10,
    condition: (game) => game.species_count >= 3
  },
  first_minigame: {
    key: 'first_minigame',
    title: 'Abenteuer ruft',
    description: 'Spieliere ein Minigame',
    icon: '🎮',
    reward: 50,
    condition: (game) => game.minigames_played >= 1
  }
}

// Check and unlock in GameView
async function checkAchievements() {
  for (const [key, def] of Object.entries(ACHIEVEMENTS)) {
    if (!game.achievements.has(key) && def.condition(game)) {
      const { data, error } = await supabase.rpc('unlock_achievement', { p_key: key })
      if (!error) {
        game.achievements.add(key)
        appToast.ok(`🏆 ${def.title}! +${def.reward} Coins`)
      }
    }
  }
}
```

### 2.3 Achievement Card (ProfileView)

```vue
<template>
  <div class="achievements-section">
    <h3>🏆 Errungenschaften</h3>
    <div class="achievements-grid">
      <div
        v-for="(ach, key) in ACHIEVEMENTS"
        :key="key"
        class="achievement-badge"
        :class="{ unlocked: game.achievements.has(key) }"
      >
        <div class="ach-icon">{{ ach.icon }}</div>
        <div class="ach-title">{{ ach.title }}</div>
        <div v-if="game.achievements.has(key)" class="ach-unlocked">✓</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.achievements-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.achievement-badge {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-2);
  text-align: center;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.achievement-badge.unlocked {
  opacity: 1;
  background: linear-gradient(135deg, #fff7d6, #ffe79a);
  border-color: var(--accent);
  box-shadow: 0 4px 12px rgba(244, 169, 18, 0.3);
}

.ach-icon {
  font-size: 32px;
  margin-bottom: var(--space-1);
}

.ach-title {
  font-size: 11px;
  font-weight: 600;
  color: #2a1d05;
}

.ach-unlocked {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--accent);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}
</style>
```

---

## 3. Daily Login Bonus (Phase 3)

### 3.1 Database

```sql
CREATE TABLE player_login_streak (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  last_login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  streak_count INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RPC: claim_daily_bonus
CREATE OR REPLACE FUNCTION claim_daily_bonus()
RETURNS TABLE (coins BIGINT, streak_count INT, server_now TIMESTAMP) AS $$
DECLARE
  v_streak INT;
  v_reward BIGINT;
BEGIN
  INSERT INTO player_login_streak (user_id, last_login_date, streak_count)
  VALUES (auth.uid(), CURRENT_DATE, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    last_login_date = CASE 
      WHEN CURRENT_DATE - last_login_date = 1 THEN CURRENT_DATE
      WHEN CURRENT_DATE = last_login_date THEN last_login_date
      ELSE CURRENT_DATE END,
    streak_count = CASE
      WHEN CURRENT_DATE - last_login_date = 1 THEN streak_count + 1
      ELSE 1 END
  RETURNING streak_count INTO v_streak;
  
  -- Reward: 10 coins per day, doubled at day 7
  v_reward := CASE WHEN v_streak = 7 THEN 200 ELSE 10 * v_streak END;
  
  UPDATE profiles SET coins = coins + v_reward WHERE id = auth.uid();
  
  RETURN QUERY SELECT profiles.coins, v_streak, NOW() AT TIME ZONE 'UTC'
    FROM profiles WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
```

### 3.2 GameView Integration

```vue
<script setup>
const dailyBonus = ref(null)

async function claimDaily() {
  const { data, error } = await supabase.rpc('claim_daily_bonus')
  if (!error) {
    dailyBonus.value = data
    game.coins = Number(data.coins)
    appToast.ok(`🎁 Streak: ${data.streak_count} Tage! +${data.streak_count * 10} Coins`)
  }
}

// Check on mount if today's bonus wasn't claimed yet
onMounted(() => {
  if (game.last_daily_claim_date !== today) {
    claimDaily()
  }
})
</script>

<template>
  <div v-if="dailyBonus" class="daily-bonus-bar">
    <div class="streak-display">🔥 {{ dailyBonus.streak_count }} Tag Streak</div>
    <div class="streak-visual">
      <div
        v-for="i in 7"
        :key="i"
        class="streak-dot"
        :class="{ active: i <= dailyBonus.streak_count }"
      />
    </div>
  </div>
</template>

<style scoped>
.daily-bonus-bar {
  background: linear-gradient(90deg, #ffe79a, #fff7d6);
  border: 2px solid var(--accent);
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
}

.streak-visual {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.streak-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d0d0d0;
  transition: all 0.3s ease;
}

.streak-dot.active {
  background: var(--accent);
  box-shadow: 0 0 6px rgba(244, 169, 18, 0.6);
}
</style>
```

---

## 4. Engagement Tracker (Phase 4 Prep)

### 4.1 Telemetry (Simple)

```js
// src/telemetry.js
export async function trackEvent(eventName, data = {}) {
  // Fire-and-forget RPC
  supabase.rpc('telemetry_event', {
    p_event_name: eventName,
    p_data: data
  }).then(null, () => {})
}

// Usage
trackEvent('minigame_start', { game: 'parkour' })
trackEvent('achievement_unlock', { key: 'first_buy' })
trackEvent('daily_bonus_claimed', { streak: 5 })
```

### 4.2 Success Metrics

Messen via Supabase:
- SELECT COUNT(DISTINCT user_id) FROM profiles WHERE DATEDIFF(NOW(), created_at) = 1 → Day-1 Retention
- SELECT AVG(session_length) FROM telemetry WHERE DATE = TODAY → Avg Session
- SELECT COUNT(*) WHERE event_name = 'onboarding_completed' → Onboarding Completion Rate

---

## Notes

- **Liveability:** Alle neue RPCs sind SECURITY DEFINER, greifen nicht auf User-Daten zu außer auth.uid()
- **i18n:** Alle Strings in `src/i18n.js` (de/en/ru)
- **Tests:** Unit-Tests für `achievements.js`, SQL-Tests für RPCs in `src/achievementsSql.test.js`
