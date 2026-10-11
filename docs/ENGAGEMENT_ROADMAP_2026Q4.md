# Zoo Empire — Engagement Roadmap Q4 2026

**Ziel:** Spieler-Retention + Monetization für neue & bestehende Spieler optimieren.  
**Zeitraum:** September–Oktober 2026 (8 Wochen)  
**Messbar:** Day 1/7/30 Retention, Average Session Time, Feature Adoption

---

## Woche 1–2: Foundation (Progressive Feature Unlock)

### Karte: Feature-Unlock-System
**Warum?** Neue Spieler werden von zu vielen Menü-Buttons überfordert.

**Implementierung:**
```javascript
// src/composables/useFeatureUnlock.js
export function useFeatureUnlock() {
  const game = useGameStore();
  const now = Date.now() + game.serverOffset;
  const timePlayed = now - game.createdAt; // ms
  const animalCount = Object.keys(game.animals).length;
  
  return {
    isUnlocked(feature) {
      switch (feature) {
        case 'memory': 
          return timePlayed > 15 * 60_000 && animalCount >= 1;
        case 'wordle': 
          return timePlayed > 15 * 60_000;
        case 'drift': 
          return timePlayed > 30 * 60_000 && game.coins > 1000;
        case 'parkour': 
          return timePlayed > 60 * 60_000; // Nach 1 Std
        case 'friends': 
          return timePlayed > 60 * 60_000;
        case 'world': 
          return game.tickets > 0; // Nach erstem Minispiel
        case 'leaderboard': 
          return timePlayed > 7 * 24 * 60_000; // Nach 1 Woche
        default: 
          return true;
      }
    }
  };
}
```

**Integrationen:**
- [ ] GameView: `.qa-btn` mit `:class="{ disabled: !isUnlocked(btn.feature) }"` + Tooltip "_Verfügbar nach [Bedingung]_"
- [ ] Shop: `minSpeciesCost` für Neulinge setzen (max. 500 coins)
- [ ] Memory: Schwierigkeit 3×3 für erste 2 Stunden, dann 4×4

**Komponenten-Änderungen:**
- GameView.vue: `useFeatureUnlock()` importieren
- i18n.js: Neue Keys: `unlock.shopLimit`, `unlock.memoryHard`, etc.

**Testing:**
- [ ] E2E: Neue Spieler können `memory` nach 15 Min öffnen
- [ ] Unit: `isUnlocked()` return-Werte prüfen

### Deliverable: PR mit Feature-Unlock + erste Bubble

---

## Woche 3–4: Tutorial & Onboarding

### Karte 1: TutorialBubble Erwiterung
**Status quo:** TutorialBubble.vue existiert, wird kaum verwendet.

**Neu:**
```javascript
// src/composables/useTutorial.js
export function useTutorial() {
  const game = useGameStore();
  const shown = ref(new Set(game.tutorialsSeen || []));
  
  const show = (step) => {
    if (!shown.value.has(step)) {
      shown.value.add(step);
      // Persist to DB: await game.recordTutorial(step)
    }
    return !shown.value.has(step);
  };
  
  return { show, shown };
}
```

**Bubble-Sequenz:**
1. **Minute 1:** "Tiere geben dir Coins!" → zeigt auf Tier-Card
2. **Minute 5:** "Kaufe mehr Tiere für mehr Einkommen" → zeigt auf Shop-Button
3. **Minute 10:** "Upgrades erhöhen deine Coins pro Tap!" → zeigt auf Upgrade-Sektion
4. **Minute 15:** "Minispiele bringen neue Tiere!" → zeigt auf Memory-Button
5. **Minute 30:** "Freunde laden = extra Bonus!" → zeigt auf Friends-Button

**Komponenten:**
- [ ] GameView: 5× `<TutorialBubble v-if="show(...)" ... />`
- [ ] TutorialBubble.vue: Props `target`, `text`, `position: 'top'|'bottom'`
- [ ] i18n: `tutorial.step1`, `tutorial.step2`, etc.

### Karte 2: First-Time User Modal (Willkommen)
**Szenario:** Nach Login, vor erster GameView.

```vue
<template>
  <Modal v-model:visible="showModal" header="🎉 Willkommen!">
    <p>Zoo Empire ist ein Idle-Game über Tier-Sammlung.</p>
    <p><strong>Ziel:</strong> Sammle Tiere, verdiene Coins, spiele Minispiele!</p>
    <img src="onboarding-graphic.svg" /> <!-- Zeigt Tier → Coins → Shop -->
    <Button @click="startGame">Lass uns anfangen!</Button>
  </Modal>
</template>
```

**Integrationen:**
- [ ] AuthView → nach Login check `game.isNewPlayer` (< 5 Min playtime)
- [ ] Zeige Modal, dann Redirect zu GameView

**Messbar:**
- [ ] Tracking: Wie viele % sehen das Modal?
- [ ] Button-Click: `start` → Event tracken

### Deliverable: PR mit Tutorials + Welcome-Modal

---

## Woche 5: Engagement Loops

### Karte 1: Daily Login Streak System
**Schema-Update:**
```sql
ALTER TABLE profiles ADD COLUMN last_login_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE profiles ADD COLUMN login_streak INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN best_streak INT DEFAULT 0;

-- RPC: daily_login_claim()
CREATE OR REPLACE FUNCTION daily_login_claim()
RETURNS TABLE (coins BIGINT, tickets INT, streak INT, bonus_active BOOL, server_now TIMESTAMPTZ) AS $$
BEGIN
  -- Prüfe last_login_date
  IF (SELECT last_login_date FROM profiles WHERE id = auth.uid()) = CURRENT_DATE THEN
    -- Bereits heute geclaimt
    RETURN QUERY SELECT 0, 0, (SELECT login_streak FROM profiles WHERE id = auth.uid()), false, now();
  ELSE
    -- Update streak + reward
    UPDATE profiles SET 
      last_login_date = CURRENT_DATE,
      login_streak = 
        CASE 
          WHEN last_login_date = CURRENT_DATE - 1 THEN login_streak + 1
          ELSE 1
        END
    WHERE id = auth.uid();
    
    -- Coins geben: 50k base + 10k per Streak
    UPDATE game_economy SET coins = coins + 50_000 + ((SELECT login_streak FROM profiles WHERE id = auth.uid()) * 10_000)
    WHERE user_id = auth.uid();
    
    RETURN QUERY ...;
  END;
END;
$$ SECURITY DEFINER SET search_path = public LANGUAGE plpgsql;
```

**Frontend:**
```javascript
// GameView.vue
const dailyRewardReady = computed(() => {
  if (!game.lastLoginDate) return true; // Erste Belohnung
  const lastLogin = new Date(game.lastLoginDate).toDateString();
  const today = new Date(Date.now() + game.serverOffset).toDateString();
  return lastLogin !== today;
});

const claimDailyReward = async () => {
  const { data, error } = await supabase.rpc('daily_login_claim');
  if (!error) {
    game.coins = Number(data.coins);
    game.tickets = Number(data.tickets);
    appToast.ok(`Streak 🔥 ×${data.streak} — +${data.bonus_active ? '50% Bonus!' : ''}`);
  }
};
```

**UI:**
- DailyRewardModal: "Komme morgen zurück für einen höheren Bonus" (bei Streak-Angebot)
- GameView HUD: Kleine "🔥 ×7" Badge neben Coins

### Karte 2: Weekly Challenge Board
**Neue Route:** `/challenges`

```javascript
// src/views/ChallengesView.vue
const challenges = ref([
  {
    id: 'memory-7x',
    title: 'Memory Master',
    desc: 'Gewinne 7 Memory-Spiele diese Woche',
    reward: { coins: 500_000, tickets: 10 },
    progress: 3, // aktuelle/max
  },
  {
    id: 'collection-20',
    title: 'Sammler',
    desc: 'Sammle 20 verschiedene Tiere',
    reward: { coins: 1_000_000 },
    progress: 18,
  },
  ...
]);

// Serverseite: `weekly_challenges` Tabelle tracken
```

**Integrationen:**
- [ ] GameView Quick-Action: "Challenges" Button (nach Woche 1)
- [ ] i18n: Challenge titles/descs
- [ ] DB: `weekly_challenges` table + RPC `complete_challenge(id)`

**Messbar:**
- [ ] Completion Rate: % der Spieler, die 1+ Challenge erledigen
- [ ] Avg Playtime: Spieler mit aktivem Challenge sollten länger spielen

### Deliverable: PR mit Daily Streak + Weekly Challenges

---

## Woche 6: Social & Retention

### Karte: Referral Bonus System
**Szenario:** Spieler lädt Freunde ein → beide bekommen Bonus.

```javascript
// Freund wird eingeladen: URL mit referral_code
// /auth?ref=USER_ID_OF_REFERRER

// Bei Signup:
const referrerId = route.query.ref;
if (referrerId) {
  // Speichern in profiles.referred_by
  // + 250k Coins für beide geben
  await supabase.rpc('claim_referral_bonus', { referrer_id: referrerId });
}
```

**UI:**
- [ ] ProfileView: "Freunde einladen" Knopf → Share-Link mit `?ref=MY_USER_ID`
- [ ] Toast: "Dein Freund hat sich angemeldet! +250k Coins für euch beide!"
- [ ] Stats: "3 Freunde eingeladen"

### Deliverable: PR mit Referral System

---

## Woche 7: Retention Metrics & Analytics

### Karte 1: In-Game Analytics Tracking
**Ziel:** Messen, ob neue Features Engagement verbessern.

```javascript
// src/composables/useAnalytics.js
export function useAnalytics() {
  const track = (event, props = {}) => {
    // Fire-and-forget zu Backend
    const payload = {
      event,
      user_id: auth.profile?.id,
      timestamp: Date.now() + game.serverOffset,
      ...props
    };
    // → Supabase RPC oder HTTP POST
  };
  
  return { track };
}

// Einsatz:
// - Memory-Spiel gestartet: track('game_start', { game: 'memory' })
// - Tier gekauft: track('purchase', { species: 'elephant', cost: 100 })
// - Freund hinzugefügt: track('friend_added')
// - Leaderboard angesehen: track('leaderboard_viewed')
```

**Events zu tracken:**
- `app_start` → tägl. neue Session
- `tutorial_step_{n}_shown`
- `feature_unlocked_{name}`
- `game_start`, `game_win`, `game_lose`
- `animal_purchased`, `animal_upgraded`
- `minigame_played`
- `settings_changed`

**Deliverable:** Analytics-Middleware + 10+ Event-Tracking

### Karte 2: Retention Dashboard (Admin)
**Private Route:** `/admin/retention` (nur für Entwickler)

```vue
<template>
  <div class="retention-grid">
    <Card title="D1 Retention">45%</Card>
    <Card title="D7 Retention">28%</Card>
    <Card title="D30 Retention">12%</Card>
    <Card title="Avg Session Time">17 min</Card>
    <Card title="Feature Adoption">
      <div v-for="f in features">
        {{ f.name }}: {{ f.adoptionRate }}%
      </div>
    </Card>
  </div>
</template>
```

**Datenquelle:**
- [ ] Supabase-Query: `COUNT(DISTINCT user_id) WHERE last_seen ≤ 1 day`
- [ ] RPC: `analytics_retention_report()` → {d1, d7, d30, sessions}

### Deliverable: Analytics + Admin Dashboard

---

## Woche 8: Wrap-up & Optimierung

### Karte 1: A/B Testing Setup
**Experiment:** "Unlock vs All Buttons" → welcher hat bessere Retention?

```javascript
// src/stores/experiment.js
export const useExperimentStore = defineStore('experiment', () => {
  const variant = ref(Math.random() < 0.5 ? 'unlock' : 'all');
  
  const isUnlockedFeature = (feature) => {
    if (variant.value === 'all') return true;
    // else: return useFeatureUnlock().isUnlocked(feature)
  };
  
  return { variant, isUnlockedFeature };
});
```

**Messbar:** Nach Woche 8:
- Variant A (Unlock): D7 = 32%?
- Variant B (All): D7 = 25%?
- → Winner bekommt alle Traffic

### Karte 2: Balancing Pass
**Ziel:** Sicherstellen, dass nichts zu einfach/hart ist.

| Metrik | Target | Atual | Fix |
|--------|--------|-------|-----|
| Day 1 to Shop | < 5 Min | 6 Min | Startgeld ↑ |
| Memory Win Rate | 70% | 55% | Difficulty -5% |
| Boss Level 1 Wins | 60% | 40% | Boss HP -20% |
| Streak Completion | 50% | 35% | Reward +25% |

**Durchführung:**
- [ ] Telemetry review (Zeit bis zu jedem Milestone)
- [ ] Win/Lose-Rates per Minispiel
- [ ] Coins/Tickets Flowchart prüfen

### Deliverable: PR mit Balancing-Fixes

---

## Feature Summary (Alle 8 Wochen)

| Woche | Feature | Impact |
|-------|---------|--------|
| 1–2 | Progressive Unlock | ↓ Overwhelm → ↑ Completion |
| 3–4 | Tutorials + Welcome | ↑ Understanding |
| 5 | Daily Streak + Challenges | ↑ DAU, Session Time |
| 6 | Referral System | ↑ New Users |
| 7 | Analytics Tracking | 📊 Visibility |
| 8 | Balancing | ↑ Retention |

**Erwartete Verbesserungen:**
- **Day 1 Retention:** 40% → 55%
- **Day 7 Retention:** 20% → 35%
- **Avg Session Time:** 12 Min → 20 Min
- **Feature Adoption:** Memory 60% → 80%, Drift 40% → 70%

---

## Technical Debt (Parallel)

- [ ] TypeScript Migration (Optional, aber empfohlen)
- [ ] Component Story Book (für Bubbles, Modals)
- [ ] E2E Tests für Onboarding-Flow (Cypress/Playwright)
- [ ] Performance Audit (Bundle Size, TTI)

---

## Success Metrics (EOW 8)

| KPI | Target | How to Measure |
|-----|--------|----------------|
| **D1 Retention** | +55% | SELECT COUNT(*) WHERE created_at > 24h AND last_seen > 24h |
| **D7 Retention** | +35% | SELECT COUNT(*) WHERE created_at > 7d AND last_seen > 7d |
| **Avg Session Time** | +20 Min | `analytics_events WHERE session_start` → session_end |
| **Feature Adoption** | +20% (per Feature) | COUNT(users_who_played_game) / COUNT(total_users) |
| **Referrals** | 50+ new via referrals | COUNT(*) WHERE referred_by IS NOT NULL |
| **Analytics Events** | 100k+ / Week | COUNT(*) FROM analytics_events |

---

## Kritische Abhängigkeiten

- ⚠️ **Datenbank Migrations:** Streak, Challenges, Analytics Tables müssen vor Woche 5 existieren
- ⚠️ **RPC-Funktionen:** `daily_login_claim`, `complete_challenge`, `world_players` (für Leaderboard)
- ⚠️ **i18n:** Neue Keys für Tutorials + Challenges in de/en/ru
- ⚠️ **Testing:** Unit + E2E Tests für kritische Flows

---

## Notizen für Entwickler

**Development Branch:** `claude/pensive-pascal-80pcwt`  
**PR Template:** Folge `.github/pull_request_template.md`

**Code Quality:**
- [ ] Alle PRs müssen `npm test` grün haben
- [ ] Keine `console.log()` (außer debug-Features)
- [ ] Komponenten sollten < 200 Zeilen sein (sonst refactor)
- [ ] Accessibility: ARIA-Labels für neue Buttons

**Security:**
- [ ] Alle RPCs: `SECURITY DEFINER SET search_path = public`
- [ ] Keine User-Input in SQL concatenation
- [ ] RLS Policies doppelt-prüfen bei neuen Tabellen

---

## Go-Live Checklist (Week 9)

- [ ] All PRs merged & deployed
- [ ] Analytics Dashboard live & monitored
- [ ] Notifications für Critical Issues aktiviert
- [ ] Support-Team trainiert ("Was ist neu?")
- [ ] Version Bump (z.B. v1.5.0)
- [ ] Patch Notes in-game zeigen
- [ ] Twitter/Social: Launch-Announcement

---

**Owner:** Zoo Empire Dev Team  
**Last Updated:** 2026-09-18  
**Next Review:** 2026-10-02 (nach Woche 2)
