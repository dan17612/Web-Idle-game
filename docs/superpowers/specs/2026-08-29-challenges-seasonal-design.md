# Challenges & Seasonal Battle Pass — Design Spec

**Features:** Wöchentliche Challenges + Seasonal Battle Pass als Progression-Hooks für Bestandsspielern.

---

## Wöchentliche Challenges

### Regelwerk
- **Woche:** Mittwoch 00:00 UTC → Dienstag 23:59 UTC
- **5 Aufträge pro Woche**, 3 Schwierigkeiten:
  - **Leicht** (1): Tap, Tap Multiplier Upgrade, Favorite wechseln
  - **Mittel** (2): Minispiel spielen (Drift/Parkour/Wordle/Boss), Trade, Fountain-Coin
  - **Schwer** (3): Guild-Quest, Prestige starten (später), 3×-Minispiel-Siege

### Rewards
- Pro Challenge: 100 XP + 200 Coins
- **Wöchentliche Completion-Bonus:** Alle 5 fertig → +1 Ticket + Cosmetic-Unlock (Outfit/Auto/Farm-Skin)
- Rewards **stapeln sich nicht** (bei Nebeneinander-Fehlversuchen keine Dupletten)

### Beispiel-Challenges (Rotation)

| ID | Titel | Ziel | Difficulty | Reward-Multiplier |
|----|-------|------|------------|-------------------|
| `tap_10k` | Mega-Tapper | Tippe 10.000× | 1 | +100 XP, +200 🪙 |
| `minigame_5` | Minispiel-Master | Gewinne 5 Minispiele | 2 | +100 XP, +200 🪙 |
| `fountain_3` | Brunnen-Ritualist | Sammle 3× Münze | 2 | +100 XP, +200 🪙 |
| `trade_1` | Handelsgeist | Trade mit 1 Freund | 2 | +100 XP, +200 🪙 |
| `world_social` | Welt-Botschafter | Besuche Welt 10× + emote zu 3 Spielern | 3 | +100 XP, +200 🪙 |

Rotation: Neue 5er-Sets alle 2 Wochen hinzufügen, Pool wächst.

---

## Seasonal Battle Pass

### Regelwerk
- **Season:** Monatlich, 1.–30./31. jeden Monats
- **Two Tracks:**
  - **Free Track**: 30 Levels, alle Spieler
  - **Premium Track**: 30 zusätzliche Levels, nur mit aktivem Pass (einmalig 49 Coins)
- **Progression:** Pro Challenge-Completion +1 XP (addiert sich zu Season-XP-Pool)
- **Level-up:** Bei jedem neuen Level-Threshold (z. B. 10 XP = 1 Level) automatisch 1 Reward freigeben

### Belohnungen

| Level | Free-Reward | Premium-Reward |
|-------|-------------|----------------|
| 1 | +50 Coins | Outfit: "Season 1 Champion" |
| 5 | Cosmetic: Avatar-Frame | +500 Coins |
| 10 | +100 Coins | Car: "Seasonal Racer" |
| 15 | Icon: "Challenger" | +1000 Coins |
| 20 | Outfit: "Standard Season" | Farm-Skin: "Premium Meadow" |
| 25 | +200 Coins | Rare Animal Variant |
| 30 | Cosmetic: "Season 1 Finalist" Badge | Exclusive: "1st Edition" Dino-Tier |

---

## UI/UX — Seasonal Hub (`SeasonalView.vue`)

### Layout
```
┌─ SEASONAL HUB ───────────────────────────────────────┐
│                                                       │
│ [🏆] Season 1: August 2026           [ 7 Tage left]  │
│                                                       │
│ ┌─ FREE TRACK ──────────────────────────────────────┐│
│ │ Level: 5/30                        [████░░░░░░]   ││
│ │ Next Reward: +100 🪙  (2 XP needed)               ││
│ │ Unlocked: Avatar-Frame ✓                          ││
│ └───────────────────────────────────────────────────┘│
│                                                       │
│ ┌─ PREMIUM TRACK [🔒 Locked] ──────────────────────┐│
│ │ [ Unlock Pass: 49 🪙 ]  (Premium-exclusive Tiere)││
│ │ (Nach Kauf: gleiche UI wie Free Track)             ││
│ └───────────────────────────────────────────────────┘│
│                                                       │
│ ┌─ CHALLENGES (DIESE WOCHE) ────────────────────────┐│
│ │ □ Tap 10.000×          1/10000 (10%)  [████░░░░] ││
│ │ □ Minispiel ×5         0/5    (0%)    [░░░░░░░░] ││
│ │ □ Fountain ×3          2/3    (67%)   [██████░░] ││
│ │ □ Trade mit Freund     0/1    (0%)    [░░░░░░░░] ││
│ │ □ Welt-Abenteuer       5/10   (50%)   [█████░░░] ││
│ │                                                     ││
│ │ [ Wöchentliche Completion ]                        ││
│ │ 4/5 fertig → +1🎟 + Cosmetic-Unlock (nach #5)   ││
│ └───────────────────────────────────────────────────┘│
│                                                       │
│ [ Tab: Mein Pass ] [ Tab: Leaderboard (XP/Challenge)] │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Interaction
- **Challenge klicken** → Modal: Ziel + aktueller Progress (Live-Update alle 2–5 Sekunden)
- **Level klicken** (wenn fertig) → Reward-Claim-Animation (Confetti, +Coins-Popup)
- **Premium Pass kaufen** → Modal mit Bestätigung, RPC `activate_premium_pass()` → Coins deducted, Flag gesetzt
- **Leaderboard:** Sortiert nach `season_xp desc` mit Ranking

---

## Datenmodell (Migration `20260829_challenges_system.sql`)

### Tabellen

```sql
-- Challenge-Definitionen (Admin-seeded)
create table if not exists public.challenge_definitions (
  id text primary key, -- "tap_10k", "minigame_5", etc.
  name_de text, name_en text, name_ru text,
  target_count int,
  difficulty int check (difficulty in (1, 2, 3)),
  reward_xp int default 100,
  reward_coins int default 200,
  status text default 'active' -- 'active'|'archived'|'disabled'
);

-- Weekly Challenges (aktuell + Archiv)
create table if not exists public.weekly_challenges (
  id bigserial primary key,
  week_start date,
  challenge_def_id text references challenge_definitions(id),
  unique(week_start, challenge_def_id)
);

-- Player Challenge Progress (pro Spieler/Woche)
create table if not exists public.player_challenge_progress (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  weekly_challenge_id bigint references weekly_challenges(id) on delete cascade,
  progress_current int default 0,
  progress_target int,
  claimed bool default false,
  claimed_at timestamptz,
  unique(user_id, weekly_challenge_id)
);

-- Seasonal Pass Config (Admin-seeded)
create table if not exists public.seasonal_passes (
  season text primary key, -- "2026-08"
  season_name_de text, season_name_en text,
  start_date date,
  end_date date,
  free_track_rewards jsonb, -- [{level: 1, reward_type: "coins", reward_value: 50}, ...]
  premium_track_rewards jsonb,
  premium_cost_coins int default 49
);

-- Player Battle Pass Progress
create table if not exists public.player_pass_progress (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  season text references seasonal_passes(season),
  has_premium bool default false,
  premium_activated_at timestamptz,
  season_xp int default 0,
  season_level int default 0,
  claimed_reward_ids text[] default '{}',
  unique(user_id, season)
);
```

### RPCs

```sql
-- Challenge-Status für diese Woche
create or replace function get_challenge_progress()
returns table (
  challenge_id text,
  name text,
  target int,
  current int,
  claimed bool,
  reward_xp int,
  reward_coins int
) as $$
  -- (Query, wird in Kommentar später konkretisiert)
$$ language sql security definer;

-- Challenge fortschritt updaten (von Edge Function)
create or replace function update_challenge_progress(
  p_user_id uuid,
  p_challenge_id text,
  p_delta int
) returns jsonb as $$
  -- Server-validiert Minispiel-Siege, Trades, etc.
  -- Gibt {progress_current, claimed, week_xp_total} zurück
$$ language plpgsql security definer;

-- Challenge-Reward claimen
create or replace function claim_challenge_reward(
  p_user_id uuid,
  p_challenge_id text
) returns jsonb as $$
  -- Validiert: fertig (current >= target), noch nicht claimed
  -- Coins + XP deducted/added, Flag gesetzt
  -- Gibt {coins_new, season_xp_new, season_level_new} zurück
$$ language plpgsql security definer;

-- Battle Pass aktivieren (Premium)
create or replace function activate_premium_pass(
  p_user_id uuid,
  p_season text
) returns jsonb as $$
  -- Prüft: Season noch aktiv, Coins >= 49
  -- Coins -49, Flag premium_activated_at = now()
  -- Gibt {coins_new, pass_active_until} zurück
$$ language plpgsql security definer;
```

### RLS

```sql
create policy "challenges_select_authenticated"
on public.player_challenge_progress for select
using (auth.uid() = user_id or request.jwt.claims->>'role' = 'authenticated');

create policy "pass_progress_select_authenticated"
on public.player_pass_progress for select
using (auth.uid() = user_id or request.jwt.claims->>'role' = 'authenticated');
```

---

## Frontend Implementation

### Store (`src/stores/game.js`)

```javascript
// Getters
const seasonalState = computed(() => ({
  currentSeason: "2026-08",
  weeksLeft: 1,
  challenges: [...], // Server: get_challenge_progress()
  passProgress: {
    season_level: 5,
    season_xp: 123,
    has_premium: false,
    claimed_rewards: ['outfit_1', ...]
  }
}))

const challengesForWeek = computed(() => seasonalState.value.challenges)
const weeklyCompletionBonus = computed(() => {
  const claimed = challenges.filter(c => c.claimed).length
  return claimed === 5 ? 'UNLOCKED: +1🎟' : `${claimed}/5`
})
```

### View: `src/views/SeasonalView.vue`

```vue
<script setup>
import { computed, ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { useGameStore } from '../stores/game'
import { useAppToast } from '../composables/useAppToast'
import { t } from '../i18n'

const game = useGameStore()
const toast = useAppToast()
const tab = ref('pass') // 'pass' | 'leaderboard'
const selectedChallenge = ref(null)

const progressBars = computed(() => 
  game.challengesForWeek.map(c => ({
    ...c,
    percent: (c.progress_current / c.progress_target) * 100
  }))
)

async function claimReward(challengeId) {
  try {
    const { data, error } = await supabase.rpc('claim_challenge_reward', {
      p_challenge_id: challengeId
    })
    if (error) throw error
    toast.ok(t('challenge.claimed'))
    await game.loadChallenges() // Refresh
  } catch (e) { toast.err(e) }
}

async function activatePremium() {
  try {
    const { data, error } = await supabase.rpc('activate_premium_pass', {
      p_season: game.seasonalState.currentSeason
    })
    if (error) throw error
    toast.ok(t('pass.activated'))
    await game.loadPass()
  } catch (e) { toast.err(e) }
}
</script>

<template>
  <div class="seasonal-view">
    <!-- Pass Header -->
    <div class="pass-header">
      <div class="season-title">🏆 {{ t('seasonal.title') }}</div>
      <div class="timer">{{ t('seasonal.daysLeft', { n: 7 }) }}</div>
    </div>

    <!-- Tabs -->
    <div class="tab-nav">
      <button :class="{active: tab === 'pass'}" @click="tab = 'pass'">
        {{ t('seasonal.myPass') }}
      </button>
      <button :class="{active: tab === 'leaderboard'}" @click="tab = 'leaderboard'">
        {{ t('seasonal.leaderboard') }}
      </button>
    </div>

    <!-- Tab: Pass -->
    <div v-if="tab === 'pass'" class="tab-content">
      <!-- Free Track -->
      <div class="track free-track">
        <h3>🎮 {{ t('seasonal.freeTrack') }}</h3>
        <ProgressBar :value="game.passProgress.season_level" :max="30" />
        <p class="next-reward">
          {{ t('seasonal.nextReward') }}: {{ game.passProgress.claimed_rewards.length }}/30
        </p>
      </div>

      <!-- Premium Track -->
      <div class="track premium-track" :class="{locked: !game.passProgress.has_premium}">
        <h3>⭐ {{ t('seasonal.premiumTrack') }}</h3>
        <button v-if="!game.passProgress.has_premium" @click="activatePremium" class="btn-activate">
          {{ t('seasonal.unlockPass') }}: 49 🪙
        </button>
        <div v-else class="premium-active">
          ✓ {{ t('seasonal.premiumActive') }}
        </div>
      </div>

      <!-- Challenges dieser Woche -->
      <div class="challenges-section">
        <h3>📝 {{ t('seasonal.thiWeekChallenges') }}</h3>
        <div class="challenge-list">
          <div v-for="c in progressBars" :key="c.challenge_id" class="challenge-card">
            <input type="checkbox" :checked="c.claimed" disabled />
            <div class="challenge-info">
              <p class="challenge-name">{{ c.name }}</p>
              <ProgressBar :value="c.percent" :max="100" />
              <p class="challenge-progress">{{ c.progress_current }}/{{ c.target }}</p>
            </div>
            <button 
              v-if="!c.claimed && c.progress_current >= c.target"
              @click="claimReward(c.challenge_id)"
              class="btn-claim"
            >
              {{ t('seasonal.claim') }}
            </button>
          </div>
        </div>
        <div class="weekly-bonus">
          <p>{{ t('seasonal.weeklyBonus') }}: {{ game.weeklyCompletionBonus }}</p>
        </div>
      </div>
    </div>

    <!-- Tab: Leaderboard -->
    <div v-if="tab === 'leaderboard'" class="tab-content">
      <!-- Leaderboard fetched from supabase -->
      <div class="leaderboard-season">
        <!-- ... -->
      </div>
    </div>
  </div>
</template>

<style scoped>
.seasonal-view { max-width: 560px; margin: 0 auto; padding: var(--space-3); }
.pass-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
.season-title { font-size: 1.5rem; font-weight: bold; }
.timer { font-size: 0.9rem; opacity: 0.7; }
.tab-nav { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); border-bottom: 1px solid var(--border); }
.tab-nav button { flex: 1; padding: var(--space-2); background: none; border: none; cursor: pointer; font-weight: bold; }
.tab-nav button.active { border-bottom: 2px solid var(--accent); color: var(--accent); }
.track { padding: var(--space-3); border-radius: var(--radius); background: var(--card); margin-bottom: var(--space-3); }
.track h3 { margin-top: 0; }
.premium-track.locked { opacity: 0.6; }
.challenge-card { display: flex; gap: var(--space-2); align-items: center; padding: var(--space-2); border-radius: var(--radius); background: var(--bg); margin-bottom: var(--space-2); }
.challenge-list { display: flex; flex-direction: column; gap: var(--space-2); }
.btn-claim { padding: var(--space-1) var(--space-2); background: var(--accent); color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
</style>
```

---

## Router Integration

```javascript
// src/router.js
const routes = [
  // ...
  {
    path: '/seasonal',
    component: () => import('../views/SeasonalView.vue'),
    meta: { auth: true }
  }
  // ...
]
```

---

## i18n Integration

```javascript
// src/i18n.js
export const I18N = {
  de: {
    seasonal: {
      title: "Jahreszeit: August 2026",
      daysLeft: "{n} Tage verbleibend",
      myPass: "Mein Pass",
      leaderboard: "Bestenliste",
      freeTrack: "Kostenlos",
      premiumTrack: "Premium",
      nextReward: "Nächste Belohnung",
      unlockPass: "Pass freischalten",
      premiumActive: "Premium aktiv",
      thiWeekChallenges: "Diese Woche",
      claim: "Abholen",
      weeklyBonus: "Wöchentlicher Bonus"
    },
    challenge: {
      claimed: "Belohnung abgeholt!",
      // ...
    }
  },
  // en: {...}, ru: {...}
}
```

---

## Events & Tracking

- `user:challenge:completed` → Analytics Event (Challenge-ID, Zeit bis Completion)
- `user:pass:premium_activated` → Umsatz-Tracking (User-ID, Date, Season)
- `user:pass:level_up` → Engagement-Metric

