# Daily Quests System — Design Spec

**Datum:** 2026-09-03  
**Owner:** @claude  
**Status:** Proposal  
**Priority:** 🟡 HIGH (Retention)

---

## Übersicht

Täglich 3 Mini-Missionen, die sich um UTC 00:00 zurücksetzen. Spieler verdienen durch Abschluss kleine Rewards + Bonus für alle 3 erledigt.

**Ziel:** Spieler kehren täglich zurück (Habit Loop).

---

## Daily Quests Examples

```
🌅 TÄGLICH (Resettet UTC 00:00)

Quest 1: "Earn 500 Coins"
  Status: 250/500 Coins
  Reward: 50 Coins
  Icon: 🪙

Quest 2: "Play 3 Minigames"
  Status: 1/3 Games
  Reward: 30 Tickets
  Icon: 🎮

Quest 3: "Visit the Marketplace"
  Status: ✅ Completed
  Reward: 1 Mystery Egg
  Icon: 📦

---

BONUS (bei Completion all 3):
  + 100 Coins
  + 1 Star (für Streak)
  [⭐⭐⭐⭐ 4/7 Completion Streak]
```

---

## UI Flow

### Hauptansicht: `/quests` (neue Route)

```vue
<template>
  <div class="quests-view">
    <h1>{{ tx('quests.title') }}</h1>
    
    <!-- Streak Info -->
    <div class="streak-info">
      <div class="stars">⭐ {{ streakCount }}/7 Complete</div>
      <p>{{ streakMessage }}</p>
      <div class="streak-reward">
        Day 7 Reward: 1 Rare Cosmetic
      </div>
    </div>

    <!-- Daily Quests -->
    <div class="daily-quests">
      <h2>{{ tx('quests.today') }}</h2>
      
      <div v-for="quest in dailyQuests" :key="quest.id" class="quest-card">
        <div class="quest-header">
          <div class="icon">{{ quest.icon }}</div>
          <div class="meta">
            <h3>{{ quest.title }}</h3>
            <p class="description">{{ quest.description }}</p>
          </div>
          <div v-if="quest.completed" class="badge-completed">✅</div>
        </div>

        <div class="quest-progress">
          <div class="progress-bar">
            <div class="fill" :style="{ width: quest.progressPercent + '%' }"></div>
          </div>
          <p class="progress-text">{{ quest.progress }}/{{ quest.target }}</p>
        </div>

        <div class="quest-reward">
          <span class="icon">{{ rewardIcon(quest.reward) }}</span>
          <span class="amount">+{{ quest.rewardAmount }} {{ quest.rewardType }}</span>
        </div>

        <button 
          v-if="!quest.completed && quest.canClaim"
          @click="claimReward(quest.id)"
          class="btn full"
        >
          Claim Reward
        </button>
        <button 
          v-else-if="quest.completed"
          disabled
          class="btn full disabled"
        >
          ✅ Completed
        </button>
        <button 
          v-else
          disabled
          class="btn secondary full"
        >
          In Progress...
        </button>
      </div>
    </div>

    <!-- Completion Bonus -->
    <div v-if="allCompleted" class="completion-bonus">
      <h3>🎉 All Quests Complete!</h3>
      <p>+100 Coins Bonus + 1 Streak Star</p>
      <button @click="claimBonusReward" class="btn full accent">
        Claim Bonus
      </button>
    </div>

    <!-- Daily Reminder -->
    <div v-if="questsResetIn" class="reset-info">
      <p>Next Reset: {{ questsResetIn }}</p>
    </div>
  </div>
</template>
```

### Quest Card Component

```vue
<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'

const game = useGameStore()
const auth = useAuthStore()

const dailyQuests = computed(() => game.dailyQuests)
const streakCount = computed(() => game.playerStreaks.currentStreak)
const allCompleted = computed(() => 
  dailyQuests.value.every(q => q.completed)
)

const claimReward = async (questId) => {
  // RPC: claim_daily_quest_reward
  const result = await supabase.rpc('claim_daily_quest_reward', {
    p_quest_id: questId
  })
  
  game.coins = Number(result.data.coins)
  game.tickets = Number(result.data.tickets)
  
  // Refresh quests
  await game.fetchDailyQuests()
}

const claimBonusReward = async () => {
  // RPC: claim_daily_quests_bonus
  const result = await supabase.rpc('claim_daily_quests_bonus')
  
  game.coins = Number(result.data.coins)
  game.streaks.current += 1
  
  useAppToast().ok('All quests bonus claimed!')
}
</script>
```

---

## Database Schema

### Tabelle: `player_daily_quests`

```sql
CREATE TABLE player_daily_quests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  quest_id TEXT NOT NULL,  -- 'earn-coins', 'play-minigames', 'visit-marketplace'
  reset_date DATE DEFAULT CURRENT_DATE,  -- Für Deduplication
  progress INT DEFAULT 0,
  target INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, quest_id, reset_date)
);

CREATE INDEX idx_player_daily_quests_user_reset 
  ON player_daily_quests(user_id, reset_date);
```

### Tabelle: `daily_quest_definitions`

```sql
CREATE TABLE daily_quest_definitions (
  id TEXT PRIMARY KEY,  -- 'earn-coins', 'play-minigames', 'visit-marketplace'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,  -- Emoji
  category TEXT NOT NULL,  -- 'coins', 'minigames', 'social'
  target INT NOT NULL,
  reward_type TEXT NOT NULL,  -- 'coins', 'tickets', 'eggs'
  reward_amount INT NOT NULL,
  bonus_reward_amount INT DEFAULT 0,  -- Bei 3x complete
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed data
INSERT INTO daily_quest_definitions VALUES
  ('earn-coins', 'Earn 500 Coins', 'Verdiene 500 Coins', '🪙', 'coins', 500, 'coins', 50, 100),
  ('play-minigames', 'Play 3 Minigames', 'Spiele 3 Minigames', '🎮', 'minigames', 3, 'tickets', 30, 0),
  ('visit-marketplace', 'Visit the Marketplace', 'Besuche den Marktplatz', '📦', 'social', 1, 'eggs', 1, 0);
```

---

## RPC Implementationen

### `claim_daily_quest_reward()`

```sql
CREATE OR REPLACE FUNCTION claim_daily_quest_reward(p_quest_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_quest RECORD;
  v_profile RECORD;
  v_coins BIGINT;
  v_tickets BIGINT;
  v_reward_type TEXT;
  v_reward_amount INT;
BEGIN
  -- Authentifizierung
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get quest definition
  SELECT * INTO v_quest FROM daily_quest_definitions WHERE id = p_quest_id;
  IF v_quest IS NULL THEN
    RAISE EXCEPTION 'Quest not found';
  END IF;

  -- Check if quest already claimed today
  UPDATE player_daily_quests
  SET claimed = TRUE
  WHERE user_id = auth.uid()
    AND quest_id = p_quest_id
    AND reset_date = CURRENT_DATE
    AND NOT claimed
  RETURNING progress, target INTO v_coins, v_tickets;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quest already claimed or not found for today';
  END IF;

  -- Award coins/tickets based on reward_type
  UPDATE profiles
  SET coins = coins + v_quest.reward_amount,
      updated_at = NOW()
  WHERE id = auth.uid()
  RETURNING coins, tickets INTO v_coins, v_tickets;

  RETURN json_build_object(
    'success', TRUE,
    'coins', v_coins,
    'tickets', v_tickets,
    'reward_amount', v_quest.reward_amount,
    'server_now', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION claim_daily_quest_reward TO authenticated;
```

### `claim_daily_quests_bonus()`

```sql
CREATE OR REPLACE FUNCTION claim_daily_quests_bonus()
RETURNS JSON AS $$
DECLARE
  v_profile RECORD;
  v_coins BIGINT;
  v_all_completed BOOLEAN;
BEGIN
  -- Authentifizierung
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if all 3 quests completed today
  SELECT COUNT(*) = 3 INTO v_all_completed
  FROM player_daily_quests
  WHERE user_id = auth.uid()
    AND reset_date = CURRENT_DATE
    AND completed = TRUE;

  IF NOT v_all_completed THEN
    RAISE EXCEPTION 'Not all quests completed yet';
  END IF;

  -- Award bonus (100 coins)
  UPDATE profiles
  SET coins = coins + 100,
      updated_at = NOW()
  WHERE id = auth.uid()
  RETURNING coins INTO v_coins;

  -- Increment streak
  UPDATE player_streaks
  SET current_streak = current_streak + 1,
      last_completion_date = CURRENT_DATE
  WHERE user_id = auth.uid();

  RETURN json_build_object(
    'success', TRUE,
    'coins', v_coins,
    'bonus_amount', 100,
    'streak_increment', 1,
    'server_now', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION claim_daily_quests_bonus TO authenticated;
```

### `update_quest_progress()` (Trigger-basiert)

```sql
CREATE OR REPLACE FUNCTION update_quest_progress()
RETURNS JSON AS $$
DECLARE
  v_coins_earned BIGINT;
  v_minigames_played INT;
  v_marketplace_visited BOOLEAN;
BEGIN
  -- Trigger nach Coin-Verdienst
  UPDATE player_daily_quests
  SET progress = (
    SELECT COALESCE(SUM(amount), 0)
    FROM transactions
    WHERE user_id = auth.uid()
      AND type = 'coin_earn'
      AND created_at::DATE = CURRENT_DATE
  ),
  completed = (
    SELECT COALESCE(SUM(amount), 0) >= target
    FROM transactions
    WHERE user_id = auth.uid()
      AND type = 'coin_earn'
      AND created_at::DATE = CURRENT_DATE
  )
  WHERE user_id = auth.uid()
    AND quest_id = 'earn-coins'
    AND reset_date = CURRENT_DATE;

  -- Trigger nach Minigame-Play
  UPDATE player_daily_quests
  SET progress = (
    SELECT COUNT(*)
    FROM minigame_sessions
    WHERE user_id = auth.uid()
      AND created_at::DATE = CURRENT_DATE
  ),
  completed = (
    SELECT COUNT(*) >= target
    FROM minigame_sessions
    WHERE user_id = auth.uid()
      AND created_at::DATE = CURRENT_DATE
  )
  WHERE user_id = auth.uid()
    AND quest_id = 'play-minigames'
    AND reset_date = CURRENT_DATE;

  RETURN json_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## Frontend State Management

### Pinia Store (`stores/quests.js`)

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/supabase'

export const useQuestsStore = defineStore('quests', () => {
  const dailyQuests = ref([])
  const lastFetch = ref(null)

  const fetchDailyQuests = async () => {
    const { data } = await supabase
      .from('player_daily_quests')
      .select('*')
      .eq('reset_date', new Date().toISOString().split('T')[0])

    dailyQuests.value = data
  }

  const allQuestsCompleted = computed(() =>
    dailyQuests.value.every(q => q.completed)
  )

  const totalProgress = computed(() =>
    dailyQuests.value.reduce((sum, q) => sum + (q.completed ? 1 : 0), 0)
  )

  return {
    dailyQuests,
    fetchDailyQuests,
    allQuestsCompleted,
    totalProgress
  }
})
```

---

## Styling

```css
.quests-view {
  padding: var(--space-3);
  max-width: 560px;
  margin: 0 auto;
}

.streak-info {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  border-radius: var(--radius);
  padding: var(--space-3);
  color: white;
  margin-bottom: var(--space-3);
  text-align: center;
}

.streak-info .stars {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: var(--space-1);
}

.streak-info .streak-reward {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: var(--space-2);
  margin-top: var(--space-2);
  font-size: 12px;
  font-weight: bold;
}

.daily-quests {
  margin-bottom: var(--space-3);
}

.daily-quests h2 {
  font-size: 18px;
  margin-bottom: var(--space-2);
}

.quest-card {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-2);
  margin-bottom: var(--space-2);
  position: relative;
}

.quest-card.completed {
  border-color: var(--accent);
  background: linear-gradient(135deg, var(--card), rgba(244, 169, 18, 0.05));
}

.quest-header {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  align-items: flex-start;
}

.quest-header .icon {
  font-size: 32px;
  flex-shrink: 0;
}

.quest-header .meta {
  flex: 1;
}

.quest-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
}

.quest-header .description {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.badge-completed {
  font-size: 20px;
  margin-left: var(--space-1);
}

.quest-progress {
  margin-bottom: var(--space-2);
}

.progress-bar {
  height: 8px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-bar .fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  text-align: right;
  color: var(--text-secondary);
}

.quest-reward {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--accent);
  font-weight: bold;
  margin-bottom: var(--space-2);
}

.quest-reward .icon {
  font-size: 20px;
}

.quest-card .btn {
  margin-top: var(--space-1);
}

.completion-bonus {
  background: linear-gradient(135deg, #4caf50, #45a049);
  border-radius: var(--radius);
  padding: var(--space-3);
  text-align: center;
  color: white;
  margin-bottom: var(--space-3);
}

.completion-bonus h3 {
  margin: 0 0 var(--space-1) 0;
}

.completion-bonus p {
  margin: 0 0 var(--space-2) 0;
  font-size: 14px;
}

.reset-info {
  text-align: center;
  padding: var(--space-2);
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
```

---

## Integration with GameView

Quests-Link in GameView Footer:

```vue
<template>
  <nav class="bottom-nav">
    <!-- Bestehende Nav -->
    
    <!-- Neue Quest-Badge -->
    <router-link to="/quests" class="nav-item">
      <span class="icon">📋</span>
      <span>Quests</span>
      <span v-if="incompleteQuestCount > 0" class="badge">{{ incompleteQuestCount }}</span>
    </router-link>
  </nav>
</template>
```

---

## Migration Script

```sql
-- Migration: 20260903_daily_quests.sql

-- 1. Create quest definitions table
CREATE TABLE daily_quest_definitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  target INT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_amount INT NOT NULL,
  bonus_reward_amount INT DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create player_daily_quests table
CREATE TABLE player_daily_quests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL REFERENCES daily_quest_definitions(id),
  reset_date DATE DEFAULT CURRENT_DATE,
  progress INT DEFAULT 0,
  target INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, quest_id, reset_date),
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- 3. Add RLS policies
ALTER TABLE daily_quest_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_daily_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quest definitions"
  ON daily_quest_definitions FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can only see own quests"
  ON player_daily_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Quests can only be updated via RPC"
  ON player_daily_quests FOR UPDATE
  USING (FALSE);

-- 4. Seed default quests
INSERT INTO daily_quest_definitions VALUES
  ('earn-coins', 'Earn 500 Coins', 'Verdiene 500 Coins', '🪙', 'coins', 500, 'coins', 50, 100),
  ('play-minigames', 'Play 3 Minigames', 'Spiele 3 Minigames', '🎮', 'minigames', 3, 'tickets', 30, 0),
  ('visit-marketplace', 'Visit the Marketplace', 'Besuche den Marktplatz', '📦', 'social', 1, 'eggs', 1, 0);

-- 5. Create indexes
CREATE INDEX idx_player_daily_quests_user_reset ON player_daily_quests(user_id, reset_date);
CREATE INDEX idx_player_daily_quests_completed ON player_daily_quests(completed) WHERE NOT completed;
```

---

## Testing Checklist

- [ ] New quest created at UTC 00:00
- [ ] Progress updates in real-time as player earns coins
- [ ] Quest completion detected automatically
- [ ] Claim button works, coins/tickets awarded
- [ ] All 3 complete → bonus unlocked
- [ ] Daily reset happens at right time
- [ ] Mobile: Responsive on all screen sizes
- [ ] i18n: DE/EN/RU working

---

## Success Metrics

- **Quest Completion Rate:** >60% daily active users complete ≥1 quest
- **Daily Active Users:** +25% with daily quests
- **Session Length:** +15% average session time
- **Return Rate (D1→D2):** +20% improvement

---

**Nächste Schritte:**
1. Design-Review
2. Database Migration
3. RPC Implementation
4. Frontend Implementation
5. QA & Deployment
