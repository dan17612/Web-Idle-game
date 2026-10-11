# Achievements System — Langfristige Ziele & Gamification

## Ziel

Ein umfassendes Achievement-System, das Spieler mit Langzeit-Meilensteinen belohnt und gamifizierten Fortschritt zeigt. Achievements sind:
- **Persistent** (einmal freigeschaltet, bleibt freigeschaltet)
- **Kategorisiert** (Sammler, Held, Spieler, etc.)
- **Belohnt** (XP, seltene Cosmetics, Coins-Bonusse)
- **Sichtbar** (Profile, Leaderboard, Statistik-Seite)

## Player-Segment

- **Alle Spieler:** Können Achievements freischalten
- **Neulinge:** Einfache Early-Game Achievements (1. Tier, 1. Minigame)
- **Veteranen:** Extreme Achievements (1M Coins, Level 50, alle Tiere)

## Datenmodell

### Tabellen

#### `achievements` (Katalog)

```sql
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,  -- 'first_animal_bought', 'coins_1m', 'boss_20'
  name_de text not null,
  name_en text not null,
  name_ru text not null,
  description_de text not null,
  description_en text not null,
  description_ru text not null,
  emoji text not null,  -- 🐔 🏆 💰 etc.
  category text not null,  -- 'collector', 'hero', 'player', 'social', 'extreme'
  condition_type text not null,  -- 'animal_count', 'coins_lifetime', 'boss_level', 'friends_count', etc.
  threshold_value bigint not null,
  reward_xp int not null default 0,
  reward_coins bigint not null default 0,
  reward_cosmetic_id uuid,  -- null = no cosmetic (nur XP)
  enabled boolean not null default true,
  sort_order int not null default 0,
  
  unique (category, condition_type, threshold_value)
);

create index achievements_category_idx on public.achievements(category);
create index achievements_condition_idx on public.achievements(condition_type);
```

#### `player_achievements` (Spieler-Progress)

```sql
create table public.player_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  achievement_id uuid not null references public.achievements on delete cascade,
  unlocked_at timestamptz not null default now(),
  
  unique (user_id, achievement_id)
);

create index player_achievements_user_idx on public.player_achievements(user_id);
create index player_achievements_unlocked_idx on public.player_achievements(unlocked_at);
alter table public.player_achievements enable row level security;
```

#### `achievement_stats` (Performance Cache, optional)

```sql
create table public.achievement_stats (
  user_id uuid primary key references auth.users on delete cascade,
  coins_lifetime bigint not null default 0,  -- total earned (never decreases)
  coins_earned_today bigint not null default 0,
  animals_owned_max int not null default 0,  -- highest count ever
  animals_species_count int not null default 0,  -- distinct species
  minigames_played int not null default 0,
  boss_level_highest int not null default 0,
  friends_count int not null default 0,
  trades_completed int not null default 0,
  xp_total int not null default 0,
  last_updated timestamptz default now(),
  
  unique (user_id)
);

alter table public.achievement_stats enable row level security;
```

---

## Achievement-Katalog (50+ Ideas)

### Kategorie: Sammler 🐔

| Key | Schwelle | Name | XP | Coins |
|---|---|---|---|---|
| `first_animal_bought` | 1 | "Erstes Tier" | 10 | 1000 |
| `animals_10` | 10 | "Kleine Sammlung" | 25 | 5000 |
| `animals_25` | 25 | "Zoo-Gründer" | 50 | 15000 |
| `animals_50` | 50 | "Zoo-Direktor" | 100 | 50000 |
| `species_unique_10` | 10 | "Alle Anfänger-Arten" | 30 | 10000 |
| `species_unique_20` | 20 | "Spezialist" | 60 | 30000 |
| `species_unique_40` | 40 | "Vollständiges Zoo" | 150 | 100000 |
| `species_unique_all` | 50 | "Legendarischer Sammler" | 300 | 500000 |

### Kategorie: Held 🏆

| Key | Schwelle | Name | XP | Coins |
|---|---|---|---|---|
| `boss_path_5` | 5 | "Anfänger Bosser" | 25 | 5000 |
| `boss_path_10` | 10 | "Erfahrener Bosser" | 50 | 15000 |
| `boss_path_20` | 20 | "Meister des Pfads" | 150 | 75000 |
| `boss_endless_5` | 5 (endless stage) | "Endlos-Kämpfer" | 40 | 20000 |
| `tap_level_10` | 10 | "Kräftiger Tipper" | 30 | 10000 |
| `tap_level_50` | 50 | "Super-Tipper" | 100 | 50000 |

### Kategorie: Spieler 🎮

| Key | Schwelle | Name | XP | Coins |
|---|---|---|---|---|
| `first_minigame` | 1 | "Spieler Debut" | 10 | 2000 |
| `minigames_50` | 50 | "Spieler-Fan" | 50 | 15000 |
| `minigames_500` | 500 | "Spielhalle-Meister" | 150 | 100000 |
| `parkour_level_8` | 8 | "Parkour-Profi" | 50 | 25000 |
| `drift_level_8` | 8 | "Drift-König" | 50 | 25000 |
| `wordle_10_wins` | 10 | "Wort-Kenner" | 40 | 15000 |

### Kategorie: Sozial 👥

| Key | Schwelle | Name | XP | Coins |
|---|---|---|---|---|
| `first_friend_added` | 1 | "Freund gefunden" | 10 | 2000 |
| `friends_5` | 5 | "Social Butterfly" | 30 | 10000 |
| `friends_20` | 20 | "Zoo-Netzwerk" | 80 | 40000 |
| `trades_10` | 10 | "Handels-Anfänger" | 30 | 10000 |
| `trades_100` | 100 | "Handels-Meister" | 100 | 50000 |

### Kategorie: Wirtschaft 💰

| Key | Schwelle | Name | XP | Coins |
|---|---|---|---|---|
| `coins_100k` | 100000 | "Hundertausend-Klub" | 25 | — |
| `coins_1m` | 1000000 | "Million-Klub" | 75 | — |
| `coins_10m` | 10000000 | "Multimillionär" | 150 | — |
| `coins_100m` | 100000000 | "Billionär" | 300 | — |
| `offline_earnings_8h` | — (offline level 5) | "Offline-Power" | 40 | 20000 |

### Kategorie: Extreme 🔥 (Challenges)

| Key | Schwelle | Name | XP | Coins |
|---|---|---|---|---|
| `login_30_consecutive` | 30 | "Treuer Spieler" | 100 | 50000 |
| `login_100_consecutive` | 100 | "Unstoppbarer Fan" | 250 | 150000 |
| `all_species_legendary` | — | "Legendarischer Sammler" | 500 | 500000 |
| `all_achievements` | 50 | "Perfektionist" | 1000 | 1000000 |

---

## RPCs (Server-authoritative)

### `check_and_unlock_achievements()`

Wird nach jeder relevanten Aktion aufgerufen (buy_animal, claim_minigame, upgrade_boss, etc.).

```sql
create or replace function public.check_and_unlock_achievements()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  stats achievement_stats;
  prof profiles;
  newly_unlocked jsonb := '[]'::jsonb;
  ach record;
  threshold_met boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  -- 1. Load/update stats
  select * into stats from public.achievement_stats where user_id = uid;
  if stats is null then
    insert into public.achievement_stats(user_id, coins_lifetime)
      values (uid, 0)
      returning * into stats;
  end if;

  -- 2. Refresh stats from current profile/animals
  select * into prof from public.profiles where id = uid;
  stats.coins_lifetime := greatest(stats.coins_lifetime, prof.coins);  -- never decreases
  stats.animals_owned_max := greatest(stats.animals_owned_max, (select count(*) from public.animals where owner_id = uid));
  stats.animals_species_count := (select count(distinct species) from public.animals where owner_id = uid);
  stats.friends_count := (select count(*) from public.friendships where (user_id = uid or friend_id = uid) and status = 'accepted');
  stats.trades_completed := (select count(*) from public.trades where (requester_id = uid or addressee_id = uid) and status = 'accepted');
  stats.xp_total := coalesce(prof.player_xp, 0);
  stats.last_updated := now();
  
  -- TODO: minigames_played, boss_level_highest (fetch from minigame_progress tables)
  
  update public.achievement_stats set
    coins_lifetime = stats.coins_lifetime,
    animals_owned_max = stats.animals_owned_max,
    animals_species_count = stats.animals_species_count,
    friends_count = stats.friends_count,
    trades_completed = stats.trades_completed,
    xp_total = stats.xp_total,
    last_updated = stats.last_updated
  where user_id = uid;

  -- 3. Check each achievement condition
  for ach in select * from public.achievements where enabled order by sort_order loop
    threshold_met := false;
    
    case ach.condition_type
      when 'animal_count' then
        threshold_met := stats.animals_owned_max >= ach.threshold_value;
      when 'species_unique' then
        threshold_met := stats.animals_species_count >= ach.threshold_value;
      when 'coins_lifetime' then
        threshold_met := stats.coins_lifetime >= ach.threshold_value;
      when 'boss_level' then
        threshold_met := stats.boss_level_highest >= ach.threshold_value;
      when 'friends_count' then
        threshold_met := stats.friends_count >= ach.threshold_value;
      when 'trades_completed' then
        threshold_met := stats.trades_completed >= ach.threshold_value;
      when 'minigames_played' then
        threshold_met := stats.minigames_played >= ach.threshold_value;
      else
        threshold_met := false;
    end case;

    -- Unlock if condition met and not already unlocked
    if threshold_met and not exists (
      select 1 from public.player_achievements
      where user_id = uid and achievement_id = ach.id
    ) then
      insert into public.player_achievements(user_id, achievement_id)
        values (uid, ach.id);
      
      -- Award rewards
      update public.profiles set
        coins = coins + ach.reward_coins,
        player_xp = player_xp + ach.reward_xp
      where id = uid;

      newly_unlocked := newly_unlocked || jsonb_build_object(
        'key', ach.key,
        'name', ach.name_de,  -- Sprache sollte von auth context kommen
        'emoji', ach.emoji,
        'xp', ach.reward_xp,
        'coins', ach.reward_coins
      );
    end if;
  end loop;

  return jsonb_build_object(
    'newly_unlocked', newly_unlocked,
    'total_achievements', (select count(*) from public.player_achievements where user_id = uid),
    'coins', prof.coins + coalesce((select sum(reward_coins) from public.achievements a
                                    join public.player_achievements pa on pa.achievement_id = a.id
                                    where pa.user_id = uid), 0),
    'xp', coalesce(prof.player_xp, 0) + coalesce((select sum(reward_xp) from public.achievements a
                                                   join public.player_achievements pa on pa.achievement_id = a.id
                                                   where pa.user_id = uid), 0)
  );
end $$;
```

### Aufrufe in bestehende RPCs

Nach jedem wirtschaftlich relevanten RPC:
```sql
-- Z.B. in buy_animal:
select public.check_and_unlock_achievements() into result;
-- result.newly_unlocked zurückgeben im Response
```

---

## Frontend

### Store-Extensions (`src/stores/game.js`)

```javascript
// State
achievements: [],  // [{ id, key, name, emoji, category, unlocked_at }]
unlockedCount: 0,
unlockedCategories: {}, // { collector: 5, hero: 3, ... }

// Actions
async loadAchievements() {
  const { data } = await supabase.from('player_achievements')
    .select(`id, achievement_id, unlocked_at, achievements(key, name_de, name_en, emoji, category)`)
    .order('unlocked_at', { ascending: false })
  this.achievements = data || []
  this.unlockedCount = this.achievements.length
  // Group by category
  this.unlockedCategories = {}
  for (const a of this.achievements) {
    const cat = a.achievements.category
    this.unlockedCategories[cat] = (this.unlockedCategories[cat] || 0) + 1
  }
},

async checkAndUnlock() {
  const { data, error } = await supabase.rpc('check_and_unlock_achievements')
  if (data?.newly_unlocked?.length) {
    for (const ach of data.newly_unlocked) {
      useAppToast().ok(`🎉 ${ach.emoji} ${ach.name} (+${ach.xp} XP)`)
    }
    await this.loadAchievements()
  }
  return data
}
```

### View: `src/views/AchievementsView.vue`

```vue
<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { t } from '../i18n'

const game = useGameStore()
const selectedCategory = ref('all')

const achievementsList = computed(() => {
  if (selectedCategory.value === 'all') return game.achievements
  return game.achievements.filter(a => a.achievements.category === selectedCategory.value)
})

const allAchievements = computed(() => {
  // Load all achievmenet definitions
  return // TODO: fetch from supabase or static data
})

const progressByCategory = computed(() => {
  const out = {}
  for (const cat of ['collector', 'hero', 'player', 'social', 'economy', 'extreme']) {
    const total = allAchievements.value.filter(a => a.category === cat).length
    const unlocked = game.unlockedCategories[cat] || 0
    out[cat] = { unlocked, total, percent: Math.round((unlocked / total) * 100) }
  }
  return out
})
</script>

<template>
  <div class="view achievements-view">
    <h1>{{ t('achievements.title') }} 🏆</h1>
    <p class="subtitle">{{ game.unlockedCount }}/{{ allAchievements.length }} {{ t('achievements.unlocked') }}</p>

    <!-- Category Tabs -->
    <div class="category-tabs">
      <Button
        v-for="cat in ['all', 'collector', 'hero', 'player', 'social', 'economy', 'extreme']"
        :key="cat"
        :class="{ active: selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        {{ cat === 'all' ? 'Alle' : t('achievements.cat.' + cat) }}
        <span v-if="cat !== 'all'" class="badge">{{ progressByCategory[cat].unlocked }}/{{ progressByCategory[cat].total }}</span>
      </Button>
    </div>

    <!-- Progress Bar (by category) -->
    <div v-if="selectedCategory !== 'all'" class="progress-section">
      <p>{{ t('achievements.progress') }}</p>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressByCategory[selectedCategory].percent + '%' }"></div>
      </div>
      <p class="progress-text">{{ progressByCategory[selectedCategory].unlocked }}/{{ progressByCategory[selectedCategory].total }}</p>
    </div>

    <!-- Achievements Grid -->
    <div class="achievements-grid">
      <div
        v-for="ach in achievementsList"
        :key="ach.id"
        class="achievement-card"
        :class="{ unlocked: true }"
      >
        <div class="ach-emoji">{{ ach.achievements.emoji }}</div>
        <div class="ach-name">{{ ach.achievements.name_de }}</div>
        <div class="ach-date">{{ new Date(ach.unlocked_at).toLocaleDateString('de') }}</div>
      </div>

      <!-- Locked achievements (grayed out) -->
      <div
        v-for="ach in lockedAchievements"
        :key="ach.id"
        class="achievement-card locked"
      >
        <div class="ach-emoji" style="opacity: 0.3">{{ ach.emoji }}</div>
        <div class="ach-name" style="opacity: 0.5">{{ ach.name_de }}</div>
        <div class="ach-condition">{{ ach.condition_text }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.achievements-view { padding: 20px 12px; }
.category-tabs { display: flex; overflow-x: auto; gap: 8px; margin: 16px 0; padding-bottom: 8px; }
.achievement-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  flex: 1;
  min-width: 100px;
  transition: all 0.2s;
}
.achievement-card.unlocked { background: linear-gradient(135deg, #ffd166, #f4a912); border-color: #f4a912; }
.achievement-card.locked { opacity: 0.6; }
.ach-emoji { font-size: 40px; margin-bottom: 8px; }
.ach-name { font-weight: 800; font-size: 14px; }
.badge { background: var(--accent); color: #fff; padding: 2px 6px; border-radius: 999px; font-size: 12px; margin-left: 4px; }
</style>
```

---

## Integrations

### Nach buy_animal

```javascript
// In ShopView.vue buyAnimal()
await supabase.rpc('check_and_unlock_achievements')
```

### Nach minigame completion

```javascript
// In ParkourGameView.vue, DriftGameView.vue
await supabase.rpc('check_and_unlock_achievements')
```

### Nach trade completion

```javascript
// In TradeView.vue acceptTrade()
await supabase.rpc('check_and_unlock_achievements')
```

---

## Success Metrics

| Metrik | Ziel |
|---|---|
| Achievement Unlock Rate | ≥ 30% of all players unlock ≥1 achievement within Week 1 |
| Avg Unlocks per Player | ≥ 8 achievements per player after 30 days |
| Daily Active Achievement Hunters | ≥ 20% of DAU check Achievements view |
| Retention Boost | +15% D7 Retention for players with ≥5 achievements |
