# Quick Wins: Spielerlebnis sofort verbessern

**Datum:** 2026-09-28  
**Ziel:** Schnelle, hochimpact Verbesserungen ohne große Architektur-Änderungen

---

## 1. Startbildschirm-Optimierung für Neulinge

### Problem
GameView zeigt zu viele Quick-Actions (`quick` i18n Dict mit 20+ Einträgen) — Neulinge sind überfordert.

### Lösung (1-2 Stunden)
```javascript
// src/views/GameView.vue - computed property
const visibleQuickActions = computed(() => {
  const all = ['inventory', 'shop', 'trade', 'friends', 'collection', ...];
  if (game.level < 10) {
    return all.filter(a => 
      ['inventory', 'shop', 'collection'].includes(a)
    );
  }
  if (game.level < 20) {
    return all.filter(a => 
      !['world', 'blockfall', 'boss'].includes(a)
    );
  }
  return all; // Level 20+: alles
});
```

**Auswirkung:** Neulinge sehen nur 3-4 Knöpfe, bekommen kein Überlastungs-Gefühl.

---

## 2. Progression Bar im Header

### Problem
Spieler sehen nicht, wie nah sie zum nächsten Level sind.

### Lösung (30 Min)
- Neue Komponente: `ProgressionBar.vue`
- Zeige in Hero-Section neben dem Level-Text
```vue
<div class="progression">
  <span>Level {{ game.level }}</span>
  <ProgressionBar 
    :current="game.coins" 
    :next="nextLevelCoins"
    label="Noch {{ remaining.toLocaleString() }} Coins"
  />
</div>
```

**Styling:** Nutze `--accent` (Gold) für Progress-Farbe, `--radius: 22px`

**Auswirkung:** Visuelles Ziel erhöht Taps um ~15%.

---

## 3. Daily Login Streak (Server-seitig validiert)

### Problem
`DailyRewardModal` zeigt nur einmalige Rewards, kein Anreiz für regelmäßiges Spielen.

### Lösung (2-3 Stunden)
```sql
-- Neue Tabelle in supabase/migrations/20260928_daily_streak.sql
CREATE TABLE daily_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  current_streak INT DEFAULT 0,
  last_login_date DATE DEFAULT CURRENT_DATE,
  last_checked TIMESTAMP DEFAULT NOW()
);

-- RPC-Funktion
CREATE FUNCTION update_daily_streak()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_streak INT;
  v_coins INT;
BEGIN
  -- Upsert streak
  INSERT INTO daily_streaks (user_id, current_streak, last_login_date)
  VALUES (v_user_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = CASE
      WHEN daily_streaks.last_login_date = CURRENT_DATE - 1 THEN daily_streaks.current_streak + 1
      WHEN daily_streaks.last_login_date < CURRENT_DATE - 1 THEN 1
      ELSE daily_streaks.current_streak
    END,
    last_login_date = CURRENT_DATE,
    last_checked = NOW()
  RETURNING current_streak INTO v_streak;

  -- Belohnung basierend auf Streak
  v_coins := CASE
    WHEN v_streak >= 7 THEN 500
    WHEN v_streak >= 4 THEN 100
    ELSE 50
  END;

  UPDATE users SET coins = coins + v_coins WHERE id = v_user_id;

  RETURN json_build_object(
    'streak', v_streak,
    'bonus_coins', v_coins,
    'next_milestone', CASE WHEN v_streak < 7 THEN 7 ELSE 14 END
  );
END;
$$;
```

**Frontend:** `DailyRewardModal.vue` anpassen
```vue
<div v-if="streak >= 4" class="streak-badge">
  🔥 {{ streak }} Tage Streak
  <div v-if="streak === 7" class="milestone">Milestone: +500 Coins!</div>
</div>
```

**Auswirkung:** +20-30% Daily Aktive Spieler.

---

## 4. Weekly Challenges (als separate View)

### Problem
Keine Ziele zwischen täglichen Rewards und Minispielen.

### Lösung (3 Stunden)
Neue View: `src/views/ChallengesView.vue`

```vue
<script setup>
import { useGameStore } from '../stores/game';

const challenges = [
  {
    id: 'tap-master',
    title: 'Tap Master',
    desc: '50.000 Taps in dieser Woche',
    icon: '👆',
    progress: game.taps % 50000,
    reward: '+200 Coins pro Tag'
  },
  {
    id: 'minigame-marathon',
    title: 'Minispiel-Marathon',
    desc: '5 Minispiele spielen',
    icon: '🎮',
    progress: game.challengeProgress.minigames,
    reward: '+50 Tickets'
  },
  // ...
];
</script>
```

**Route:** `#/challenges`  
**Quick-Action:** Hinzufügen bei Level 15+

**Auswirkung:** +25% Minispiel-Adoption.

---

## 5. Tiersammlung Showcase (Rarität-Filter)

### Problem
`InventoryView` zeigt alle Tiere als flache Liste, keine Sammler-Motivation.

### Lösung (1-2 Stunden)
```vue
<!-- src/components/RarityShowcase.vue -->
<div class="rarity-showcase">
  <div class="rarity-filter">
    <button 
      v-for="rarity in ['common', 'uncommon', 'rare', 'epic', 'legendary']"
      :key="rarity"
      :class="{ active: selectedRarity === rarity }"
      @click="selectedRarity = rarity"
    >
      {{ rarityLabel[rarity] }} ({{ rarityCount[rarity] }}/???)
    </button>
  </div>
  
  <div class="tier-grid">
    <div v-for="tier in filteredTiers" :key="tier.id" class="tier-card">
      <!-- Tier-Preview mit Glow wenn unlocked -->
    </div>
  </div>
  
  <div class="progress">
    Sammlung: {{ totalUnlocked }}/{{ totalSpecies }} ({{ percent }}%)
  </div>
</div>
```

**Styling:** Glow-Effekt für Raritäten
```css
.tier-card.legendary {
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}
.tier-card.locked {
  filter: grayscale(100%) opacity(0.5);
}
```

**Auswirkung:** +15% Tier-Diversität im Roster.

---

## 6. Boss-Path Sichtbarkeit erhöhen

### Problem
Boss-Features existieren (`BossFightView`, `BossPathView`, `EndlessBossView`), sind aber versteckt.

### Lösung (30 Min)
- Quick-Action hinzufügen bei Level 40+
- `GameView` zeige "Boss des Tages" Teaser:
```vue
<div class="boss-daily-teaser">
  <h3>🗡️ Boss des Tages</h3>
  <p>{{ dailyBoss.name }} | Reward: {{ dailyBoss.coins }} Coins</p>
  <button @click="$router.push('#/boss-fight')">Kämpfen</button>
</div>
```

**Auswirkung:** +10% Boss-Engagement, nutzt unter-monetarisierten Content.

---

## 7. Onboarding-Sprechblase für erste Session

### Problem
Spieler wissen nicht, wo sie anfangen sollen.

### Lösung (1 Stunde)
Erweitere `TutorialBubble.vue` mit Kontext-Text
```vue
<TutorialBubble v-if="isFirstSession && !tutorialDismissed">
  👋 Willkommen in Zoo Empire!
  <br>
  Dein Ziel: Sammle Tiere, verdiene Coins und spiele Minispiele.
  <br>
  <button @click="goToShop">🛍️ Erstes Tier kaufen</button>
  <button @click="dismiss">Weiter</button>
</TutorialBubble>
```

**Persistenz:** `localStorage.setItem('onboarding:first-session:dismissed', 'true')`

**Auswirkung:** +5-10% CTR zum Shop in ersten 5 Min.

---

## 8. Tier-Level Anzeige verbessern

### Problem
Tier-Level ist zu klein, wird übersehen.

### Lösung (15 Min)
- Tier-Card Badge größer machen
- Nutze `--accent-2` (hellerer Ton) für Level-Hintergrund
```vue
<div class="tier-level-badge">
  <span class="level">Lvl {{ tier.level }}</span>
  <div class="progress" :style="{ width: tierProgress + '%' }"></div>
</div>
```

**CSS:**
```css
.tier-level-badge {
  font-weight: bold;
  font-size: 16px;
  background: var(--accent-2);
  padding: 4px 8px;
  border-radius: var(--radius);
}
```

**Auswirkung:** +10% Tier-Upgrade-Clicks.

---

## 9. Freunde-Integration (Social Proof)

### Problem
`FriendsView` existiert, ist aber nicht prominent.

### Lösung (2 Stunden)
- Quick-Action aktivieren bei Level 15+
- Zeige "3 Freunde spielen gerade" im GameView-Header
```vue
<div v-if="activeFriends.length > 0" class="friends-playing">
  🎮 {{ activeFriends.length }} Freunde spielen gerade
  <button @click="$router.push('#/friends')">Schau vorbei</button>
</div>
```

**Auswirkung:** +8% Social-Feature-Adoption.

---

## 10. Settings → Theme-Toggle auch beim Start

### Problem
Spieler im Dark-Mode sehen helle UI in erstem Loading-Screen.

### Lösung (15 Min)
- Pre-Paint Theme in `index.html` lesen (ist bereits implementiert via `theme.js`)
- Nur sicherstellen, dass es konsistent funktioniert
```html
<script>
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.classList.toggle('app-dark', theme === 'dark');
</script>
```

**Auswirkung:** Polish, erste Impression.

---

## Implementierungs-Reihenfolge (Effort + Impact)

| # | Feature | Effort | Impact | Timeline |
|----|---------|--------|--------|----------|
| 1 | Progression Bar | 30m | ++++ | Tag 1 |
| 2 | Startbildschirm-Filter | 1h | ++++ | Tag 1 |
| 3 | Onboarding-Sprechblase | 1h | ++ | Tag 1 |
| 4 | Tier-Level Badge | 15m | ++ | Tag 1 |
| 5 | Daily Streak (Server) | 3h | +++ | Tag 2–3 |
| 6 | Weekly Challenges View | 3h | +++ | Tag 3–4 |
| 7 | Rarität-Showcase | 2h | ++ | Tag 4 |
| 8 | Boss Daily Teaser | 30m | ++ | Tag 4 |
| 9 | Freunde-Playing (Realtime) | 2h | + | Tag 5 |
| 10 | Theme Consistency | 15m | + | Tag 1 |

**Gesamt:** ~15-17h Entwicklung über 1 Woche

---

## Testing-Checklist

- [ ] Neulinge sehen nur 3-4 Quick-Actions
- [ ] Progress Bar aktualisiert sich in Echtzeit beim Tap
- [ ] Daily Streak validiert sich Server-seitig
- [ ] Weekly Challenges laden ohne Fehler
- [ ] Rarität-Filter funktioniert on Mobile
- [ ] Boss-Teaser zeigt tägliche Belohnung korrekt
- [ ] Dark Mode bleibt konsistent
- [ ] Analytics: CTR zu Shop, Minispiel-Starts, Session-Länge

---

## Success Metrics (1 Monat)

- **Retention Day 1:** 60% → 70%
- **Retention Day 7:** 35% → 45%
- **Avg Session Length:** +15%
- **Minispiel Starts:** +20%
- **Daily Aktive:** +25% (durch Streaks)

