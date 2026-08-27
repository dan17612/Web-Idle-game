# Zoo Empire — Quick Wins (Woche 1–2)

**Fokus:** Maximal Spieler-Impact mit minimalem Code-Aufwand.

---

## Quick Win 1: Streak-Display im Hero-Banner (2h)

**Problem:** Tägliche Streaks sind versteckt im Modal; Spieler vergessen Rückkehr.

**Lösung:** `🔥 {streak} Tage` neben Coins/Taps im Hero-Banner anzeigen.

### Änderungen

**`src/views/GameView.vue`** (Hero-Banner Section)
```diff
<div class="hb-right">
  <div class="hb-label">{{ tx("hero.budget") }}</div>
  <div class="hb-budget">…</div>
  <div class="hb-reset">↻ {{ fmtTime(tapCooldown) }}</div>
+ <div v-if="dailyStreak > 0" class="hb-streak">
+   🔥 {{ dailyStreak }} {{ dailyStreak === 1 ? "Tag" : "Tage" }}
+ </div>
</div>
```

**Computed Property hinzufügen:**
```js
const dailyStreak = computed(() => Number(game.dailyReward?.streak || 0))
```

**CSS im selben File:**
```css
.hb-streak {
  color: var(--accent); 
  font-weight: 700; 
  font-size: 14px;
  margin-top: 4px;
}
```

### Tests
- Neuer Spieler ohne Streak: nichts anzeigen.
- Spieler mit Streak: `🔥 5 Tage` sichtbar & prominent.

---

## Quick Win 2: Starter-Boost (4h)

**Problem:** Early-Game Progression zu langsam.

**Lösung:** Nach dem Willkommens-Geschenk → 24h Coins ×2.

### SQL Migration

`supabase/migrations/20260827_starter_boost.sql`
```sql
-- Add starter_boost_active_until to game_state
ALTER TABLE game_state
ADD COLUMN starter_boost_active_until TIMESTAMP DEFAULT NULL;

-- Create RPC to claim starter boost
CREATE OR REPLACE FUNCTION claim_starter_boost()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
  v_boost_already_claimed BOOLEAN;
  v_gift_claimed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Boost nur nach Geschenk & frühestens 30 Min nach Account-Erstellung
  SELECT newbie_gift_claimed, starter_boost_active_until IS NOT NULL
  INTO v_gift_claimed, v_boost_already_claimed
  FROM game_state WHERE user_id = v_user_id;

  IF NOT v_gift_claimed THEN
    RAISE EXCEPTION 'Gift must be claimed first';
  END IF;

  IF v_boost_already_claimed THEN
    RAISE EXCEPTION 'Boost already claimed';
  END IF;

  UPDATE game_state 
  SET starter_boost_active_until = NOW() + INTERVAL '24 hours'
  WHERE user_id = v_user_id;

  RETURN JSON_BUILD_OBJECT(
    'coins', coins,
    'server_now', NOW()::TEXT
  );
END; $$;

GRANT EXECUTE ON FUNCTION claim_starter_boost() TO authenticated;
REVOKE EXECUTE ON FUNCTION claim_starter_boost() FROM anon, public;
```

### Frontend

**`src/stores/game.js`** — Property & RPC hinzufügen:
```js
const state = reactive({
  // ...existing
  starterBoostActive: false,
  starterBoostUntil: 0,
})

// Getter für Multiplikator
const starterBoostMultiplier = computed(() => {
  if (!state.starterBoostActive) return 1
  const ms = state.starterBoostUntil - (Date.now() + serverOffset)
  return ms > 0 ? 2 : 1
})

// Im rateForAnimal() anwenden
function rateForAnimal(animal) {
  return (/* existing rate calc */) * starterBoostMultiplier.value
}

async function claimStarterBoost() {
  const data = await supabase.rpc('claim_starter_boost')
  state.coins = Number(data.coins)
  state.starterBoostActive = true
  state.starterBoostUntil = new Date(data.server_now).getTime() + 24*3600*1000
  serverOffset = new Date(data.server_now).getTime() - Date.now()
}
```

**`src/views/GameView.vue`** — Nach Geschenk-Dialog:
```vue
<template v-else-if="giftClaimed && !starterBoostClaimed">
  <div class="gift-backdrop">
    <div class="gift-dialog card">
      <div class="gift-emoji">⚡</div>
      <h2>Starter-Boost!</h2>
      <p>Für die nächsten 24 Stunden verdienst du ×2 Coins.</p>
      <Button class="btn full" @click="async () => {
        try {
          await game.claimStarterBoost()
          appToast.ok('Boost aktiviert!')
          starterBoostClaimed = true
        } catch (e) {
          appToast.err(e)
        }
      }">
        ⚡ Aktivieren
      </Button>
    </div>
  </div>
</template>
```

### Tests
- Neuer Spieler → Geschenk → Boost Dialog.
- Boost ×2 multipliziert Einnahmen.
- Nach 24h × 1 zurück.

---

## Quick Win 3: Tutorial-Phase 0 (3h)

**Problem:** Spieler sehen alles auf einmal; Anfänger wissen nicht, was tun.

**Lösung:** Phase 0 = nur TAP + Shop (1 Tier kaufen).

### SQL Migration

`supabase/migrations/20260827_tutorial_phase.sql`
```sql
ALTER TABLE game_state
ADD COLUMN tutorial_phase INT DEFAULT 0;
-- 0 = tap only
-- 1 = fusion intro
-- 2 = equipment
-- 3 = first minigame
-- 4 = more features
```

### GameView Konditional Rendering

**`src/views/GameView.vue`**
```js
const shouldShowFeature = (feature) => {
  const phases = {
    fusion: 1,
    crafter: 4,
    bossPath: 3,
    friends: 4,
    trade: 4,
    world: 4,
    minigames: 3,
  }
  return game.tutorialPhase >= (phases[feature] ?? 0)
}
```

```vue
<!-- Quick Actions -->
<div class="card quick-actions" v-if="shouldShowFeature('fusion')">
  <!-- ... -->
</div>

<!-- Fusion Section -->
<div class="card" v-if="shouldShowFeature('fusion')">
  <!-- Fusion UI -->
</div>

<!-- Crafter Section -->
<div class="card" v-if="shouldShowFeature('crafter')">
  <!-- Crafter UI -->
</div>
```

### Tutorial Step hinzufügen

**In GameView.vue**
```js
watch(() => game.tapsUsed, (taps) => {
  if (taps === 50 && game.tutorialPhase === 0) {
    // Progress Phase → 1 nach erstem Tier-Kauf + 3 Fusions
    game.setTutorialPhase(1)
    appToast.info('🎉 Nächste Stufe freigeschaltet: Fusion!')
  }
})
```

### Tests
- Phase 0: nur Taps + TAP-Button. Shop & Crafter / Fusion versteckt.
- Nach 1. Tier-Kauf + 3× Fusion → Phase 1.

---

## Quick Win 4: Daily Quest Skeleton (6h)

**Problem:** Kein klarer Grund für tägliche Rückkehr.

**Lösung:** 3 einfache tägliche Aufgaben.

### SQL Migration

`supabase/migrations/20260827_daily_quests_v1.sql`
```sql
CREATE TABLE daily_quests (
  id TEXT PRIMARY KEY,
  title_de TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_de TEXT,
  description_en TEXT,
  progress_type TEXT, -- 'taps' | 'minigame_plays' | 'world_visit' | 'friends_add'
  target INT DEFAULT 1,
  reward_coins INT DEFAULT 0,
  reward_tickets INT DEFAULT 0
);

CREATE TABLE user_daily_quest_progress (
  user_id UUID NOT NULL REFERENCES profiles(id),
  quest_id TEXT NOT NULL,
  reset_at DATE DEFAULT CURRENT_DATE,
  progress INT DEFAULT 0,
  completed_at TIMESTAMP DEFAULT NULL,
  PRIMARY KEY (user_id, quest_id, reset_at)
);

-- Insert daily quests
INSERT INTO daily_quests (id, title_de, title_en, progress_type, target, reward_coins, reward_tickets)
VALUES
  ('tap_100', 'Tippe 100-mal', 'Tap 100 times', 'taps', 100, 5000, 0),
  ('play_minigame', 'Spiele 1 Minispiel', 'Play 1 minigame', 'minigame_plays', 1, 0, 2),
  ('visit_world', 'Besuch die Zoo-Welt', 'Visit Zoo World', 'world_visit', 1, 5000, 1);

-- RPC: Get daily quests for user
CREATE OR REPLACE FUNCTION get_daily_quests()
RETURNS TABLE (id TEXT, progress INT, target INT, completed BOOLEAN, reward_coins INT, reward_tickets INT) AS $$
SELECT 
  q.id,
  COALESCE(p.progress, 0),
  q.target,
  p.completed_at IS NOT NULL,
  q.reward_coins,
  q.reward_tickets
FROM daily_quests q
LEFT JOIN user_daily_quest_progress p 
  ON p.quest_id = q.id 
  AND p.user_id = auth.uid()
  AND p.reset_at = CURRENT_DATE
ORDER BY q.id;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_daily_quests() TO authenticated;
```

### Frontend Store

**`src/stores/game.js`**
```js
const dailyQuests = ref([])

async function loadDailyQuests() {
  const { data } = await supabase.rpc('get_daily_quests')
  dailyQuests.value = data || []
}

// Call in initial load
```

### DailyQuestModal Component

**`src/components/DailyQuestModal.vue`** (new)
```vue
<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'

const game = useGameStore()
const appToast = useAppToast()

const quests = computed(() => game.dailyQuests || [])

const completedCount = computed(() => 
  quests.value.filter(q => q.completed).length
)

async function completeQuest(questId) {
  try {
    await supabase.rpc('complete_daily_quest', { quest_id: questId })
    await game.loadDailyQuests()
    appToast.ok('✅ Quest completed!')
  } catch (e) {
    appToast.err(e)
  }
}
</script>

<template>
  <div class="quest-modal card">
    <h2>Tägliche Quests</h2>
    <p class="subtitle">{{ completedCount }}/3 abgeschlossen</p>
    <div class="quest-list">
      <div 
        v-for="q in quests" 
        :key="q.id" 
        class="quest-item"
        :class="{ completed: q.completed }"
      >
        <div class="quest-progress">
          <div class="quest-bar">
            <div class="quest-fill" :style="{ width: Math.min(100, (q.progress / q.target) * 100) + '%' }"></div>
          </div>
          <span>{{ q.progress }}/{{ q.target }}</span>
        </div>
        <div class="quest-reward">
          <span v-if="q.reward_coins > 0">🪙 +{{ q.reward_coins }}</span>
          <span v-if="q.reward_tickets > 0">🎟 +{{ q.reward_tickets }}</span>
        </div>
        <Button 
          v-if="!q.completed && q.progress >= q.target"
          class="btn secondary small"
          @click="completeQuest(q.id)"
        >
          Abholen
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quest-list { display: flex; flex-direction: column; gap: 12px; }
.quest-item { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  padding: 12px; 
  border: 1px solid var(--border); 
  border-radius: var(--radius);
}
.quest-progress { flex: 1; }
.quest-bar {
  height: 8px;
  background: var(--card-2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}
.quest-fill {
  height: 100%;
  background: var(--accent);
}
.quest-item.completed .quest-fill {
  background: var(--success, #4caf50);
}
</style>
```

### Einbinden in GameView

```vue
<DailyQuestModal v-if="showDailyQuests" @close="showDailyQuests = false" />
```

### Tests
- Neue Spieler → 3 Quests sichtbar.
- Progress anzeigen (z. B. "23/100 Taps").
- Claim-Button aktiv wenn complete.

---

## Implementierungs-Checkliste

- [ ] **Streak-Display** → PR & Merge (4h)
- [ ] **Starter-Boost Migration** → RPC Test (4h)
- [ ] **Tutorial-Phase Konditional Render** (3h)
- [ ] **Daily Quests Migration + Modal** (6h)
- [ ] **Integration Tests** (2h)
- [ ] **Staging Test** (2h)
- [ ] **Launch & Monitoring** (1h)

**Total: ~22h = 2–3 Tage mit 1 Dev.**

---

## Erfolg = Metriken (2 Wochen später)

1. **DAU Neulinge** ↑ 20 % (Phase-Flow verhindert Dropout).
2. **Streak-Claim** ↑ 40 % (Visibilität).
3. **Starter-Boost Claimed** > 85 % (starke CTR).
4. **Daily Quest Completion** > 60 % (neue Loops).

---

**Status:** Ready to implement  
**Verantwortung:** @team  
**Start:** 2026-08-28
