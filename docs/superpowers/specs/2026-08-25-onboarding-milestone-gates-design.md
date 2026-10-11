# Zoo Empire — Onboarding: Progressive Feature-Freischaltung

**Datum:** 2026-08-25  
**Features:** Milestone-Gates, Achievement Tracking, Neuling-Pfad  
**Phase:** 1 (MVP: Woche 1–2 nach Neustart)

---

## Überblick

Neulinge sehen bei Login nur **3 Kategorien** statt 12. Neue Minigames/Features entsperren progressiv über **Milestone-Achievements**:

```
Tap 50×        → Minigames (Memory, Drift, Parkour)
Shop-Tier 1    → Multiplayer (Freunde, Trade)
Inventory 20   → Advanced (Leaderboards, World)
```

---

## Milestones & Unlock-Logik

### 1. Core Loop (Taps)

| Milestone | Trigger | Unlock | i18n-Key | Note |
|-----------|---------|--------|----------|------|
| **Baby Tapper** | 50 Taps | Minigames-Tab | `ms.babyTapper` | Sofort nach Startup |
| **Skilled Tapper** | 500 Taps | Drift + Wordle | `ms.skilledTapper` | Nach ~2h Spielen |
| **Pro Tapper** | 2000 Taps | Parkour + Memory | `ms.proTapper` | Nach ~4h Spielen |
| **Tap Master** | 5000 Taps | Boss-Fight-Tab | `ms.tapMaster` | Veteranen-Feature |

### 2. Economy (Shop & Inventar)

| Milestone | Trigger | Unlock | i18n-Key |
|-----------|---------|--------|----------|
| **First Purchase** | ≥1 Tier gekauft | Trade-Tab | `ms.firstPurchase` |
| **Zoo Collector** | Inventar ≥20 Tiere | Advanced Sorting | `ms.zooCollector` |
| **Rich Keeper** | 100k Coins verdient | Prestige-Info (Preview) | `ms.richKeeper` |

### 3. Social

| Milestone | Trigger | Unlock | i18n-Key |
|-----------|---------|--------|----------|
| **Social Butterfly** | 1 Freund hinzugefügt | Freunde-Tab + Friends-View | `ms.socialButterfly` |
| **Guild Pioneer** | Tritt Guild bei | Guild-Tab (Preview) | `ms.guildPioneer` |

### 4. World

| Milestone | Trigger | Unlock | i18n-Key |
|-----------|---------|--------|----------|
| **World Explorer** | 1× World betreten | World-Tab + Lobbies | `ms.worldExplorer` |
| **Farm Builder** | 1 Plot gekauft | Kosmetik-Shop | `ms.farmBuilder` |

---

## Frontend-Logik

### GameView.vue — Quick-Actions Layout

#### Aktuell (für alle):
```
[Inventory] [Shop]    [Trade]    [Friends]
[Index]     [Tickets] [Collection] [Send]
[Memory]    [Drift]   [Parkour]    [Wordle]
[World]     [Boss]    [Leaderboard] [Release]
```

#### Mit Milestones:
```
Level 1 (0 Taps):
[Inventory] [Shop]
[TAP to unlock games...]

Level 2 (50+ Taps):
[Inventory] [Shop]    [Trade]    [Friends]
[Memory]    [Drift]   [Parkour]  [Wordle]

Level 3 (500+ Taps):
[Inventory] [Shop]    [Trade]    [Friends]
[Memory]    [Drift]   [Parkour]  [Wordle]
[World]     [Boss]    [Leaderboard] [Send]
```

### Milestone Popup

**Trigger:** Beim Unlock  
**UI:**
```
┌─────────────────────────┐
│   🎉 Achievement!       │
│                         │
│   "Skilled Tapper"      │
│  "500 Taps erreicht"    │
│                         │
│  ✨ Freigeschaltet:    │
│  • Drift Minigame       │
│  • Wordle Minigame      │
│                         │
│  [Weiter]               │
└─────────────────────────┘
```

**Daten:** 
- `title`: `I18N[locale].achievements[id].title`
- `description`: `I18N[locale].achievements[id].desc`
- `unlockedFeatures`: `['drift', 'wordle']`

---

## Datenbank-Schema

### Neue Tabelle: `user_milestones`

```sql
CREATE TABLE user_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL, -- 'taps_50', 'first_purchase', etc.
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, milestone_key)
);

-- RLS: SELECT für owner, INSERT via trigger
CREATE POLICY "Users see own milestones"
  ON user_milestones
  FOR SELECT
  USING (auth.uid() = user_id);
```

### Bestehende Tabelle: `game_stats` (Update)

Neuen Counter hinzufügen falls nicht vorhanden:
- `tap_count` INTEGER DEFAULT 0
- `shop_purchase_count` INTEGER DEFAULT 0
- `inventory_size` INTEGER DEFAULT 0

---

## RPC: Milestone Sync (Client-seitig)

**Funktion:** `get_user_milestones()` → gibt ungesperrte Meilensteine + nächste Meilensteine zurück

```sql
CREATE OR REPLACE FUNCTION get_user_milestones()
RETURNS TABLE(
  unlocked TEXT[],
  next_milestone RECORD
) SECURITY DEFINER
LANGUAGE sql
SET search_path = public
AS $$
  SELECT
    ARRAY_AGG(milestone_key) FILTER (WHERE unlocked_at IS NOT NULL),
    ROW_TO_JSON(
      (SELECT * FROM milestones_config 
       WHERE NOT EXISTS (
         SELECT 1 FROM user_milestones m 
         WHERE m.user_id = auth.uid() 
           AND m.milestone_key = milestones_config.key
       )
       ORDER BY milestones_config.priority
       LIMIT 1)
    )
  FROM user_milestones LEFT JOIN milestones_config ON ...
  WHERE user_milestones.user_id = auth.uid();
$$;
```

---

## Client-Seite: Game Store

### Pinia Store `game.js` — Erweiterung

```js
const unlockedMilestones = ref([])
const nextMilestone = ref(null)

async function syncMilestones() {
  const { data } = await supabase.rpc('get_user_milestones')
  unlockedMilestones.value = data.unlocked
  nextMilestone.value = data.next_milestone
  // Trigger Toast wenn neu?
  if (data.newlyUnlocked) {
    showMilestonePopup(data.newlyUnlocked)
  }
}

function isMilestoneUnlocked(key) {
  return unlockedMilestones.value.includes(key)
}

function getVisibleQuickActions() {
  const all = ['inventory', 'shop', 'trade', 'friends', ...]
  if (!isMilestoneUnlocked('taps_50')) return ['inventory', 'shop']
  if (!isMilestoneUnlocked('taps_500')) return all.filter(a => !['memory', 'drift', 'parkour', 'wordle'].includes(a))
  return all // Full unlock
}
```

---

## Views-Anpassungen

### GameView.vue

**Props:**
```js
const visibleActions = computed(() => game.getVisibleQuickActions())
const showMilestoneHint = computed(() => game.nextMilestone?.key === 'taps_50')
```

**Template:**
```vue
<div v-if="showMilestoneHint" class="milestone-teaser">
  📢 {{ game.nextMilestone?.hint }}
  <br>
  {{ game.tapCount }} / {{ game.nextMilestone?.threshold }} Taps
</div>

<div class="qa-grid">
  <button 
    v-for="action in visibleActions" 
    :key="action"
    @click="navigate(action)"
    class="qa-btn"
  >
    {{ t(`quick.${action}`) }}
  </button>
</div>
```

---

## Onboarding-Flow für Neue Spieler

1. **Auth** → Auto-Sync `get_user_milestones()`
2. **GameView render** → Nur Level-1-Actions sichtbar
3. **Tap 50×** → Milestone unlock Popup
4. **Hinzufügen** → Minigames-Actions sichtbar, Tap-Counter im HUD
5. **Progression** → Zähler im Sidebar-Widget (`{{ nextMilestone?.threshold - tapCount }} Taps left`)

---

## i18n-Struktur

**Datei:** `src/i18n.js` (erweitern):

```js
en: {
  milestones: {
    taps_50: {
      title: "Baby Tapper",
      desc: "Unlock your first minigames!",
      unlockedFeatures: "Memory, Drift, Parkour",
      hint: "Tap 50 times to unlock minigames"
    },
    taps_500: { ... },
    first_purchase: { ... },
    // ...
  }
}

de: {
  milestones: {
    taps_50: {
      title: "Baby Tapper",
      desc: "Schalte deine ersten Minigames frei!",
      unlockedFeatures: "Memory, Drift, Parkour",
      hint: "Tippe 50× um Minigames freizuschalten"
    },
    // ...
  }
}
```

---

## Migration

**Datei:** `supabase/migrations/20260825_milestones.sql`

- Erstelle `user_milestones` Tabelle + RLS
- Erstelle `milestones_config` (Lookup-Tabelle)
- Erstelle RPC `get_user_milestones()`
- Erstelle Trigger für Auto-Unlock (bei Tap-Count Änderung)

---

## Tests

**Datei:** `src/milestones.test.js`

- ✅ Milestone unlock bei korrekt erreichte Threshold
- ✅ Unlock-Logik ist server-seitig authoritative
- ✅ Client zeigt nur freigeschaltete Actions
- ✅ i18n-Keys existieren für alle Milestones

**Migration-Tests:** `src/milestonesSql.test.js`

- ✅ `user_milestones` hat RLS
- ✅ RPC `get_user_milestones()` ist `SECURITY DEFINER`
- ✅ Trigger aktualisiert `user_milestones` atomarer

---

## Rollout-Plan

**Woche 1:** 
- Backend Deploy (Schema + RPCs)
- Frontend Integration (Pinia + GameView)
- Closed Beta (10 Test-User)

**Woche 2:**
- A/B Test: 50% Neu-Spieler mit Milestones, 50% alt
- Tracking: DAU-Vergleich nach 7 Tagen

**Woche 3:**
- Rollout zu 100%
- Monitoring: Funnel-Analysen (Tap → Minigame-Click → Retention)

---

## Success Criteria

| Metrik | Target | Meaning |
|--------|--------|---------|
| **D1 DAU** | +15% | Mehr Neu-Spieler spielen 2. Tag |
| **D7 Retention** | +20% | Weniger Churn nach Woche 1 |
| **Minigame-Click** | +50% | Mehr Spieler probieren Minigames |
| **Avg Session** | +10% | Längere Sessions durch progressive Entdeckung |
