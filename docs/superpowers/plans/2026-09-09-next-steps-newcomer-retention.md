# Zoo Empire — Nächste Strategische Schritte: Newcomer & Retention (2026-09-09)

## Übersicht

Zoo Empire hat ein starkes Fundament mit vielen Features (Tiere, Minigames, 3D-Welt, Multiplayer). Jetzt müssen wir:
1. **Newcomer-Erlebnis verbessern** — klarere Progression, weniger Überflutung
2. **Bestehende Spieler halten** — Endgame-Content, saisonale Events, tiefere Progression
3. **Monetarisierung & Engagement** — Battle Pass-ähnliche Systeme, Achievement-Tracks

---

## Phase 1: Newcomer-Onboarding (Q4 2026)

### 1.1 Interaktives Tutorial (Stories)
**Problem:** Spieler landen in `/` und sehen 20+ Quick-Action-Tasten. Was tun zuerst?
**Lösung:**
- **Story-basiertes Tutorial** in 5 Schritten (zielgerichtet, nicht modal-spam)
- Schritt 1: Erstes Tier kaufen (→ Shop)
- Schritt 2: Tippen lernen & Einkommen
- Schritt 3: Offline-Earnings erkunden
- Schritt 4: Erste Minigame (z.B. Memory statt Parkour 3D)
- Schritt 5: Welt/Multiplayer hinten anstellen

**Architektur:**
- `src/onboarding.js` — State-Maschine (step 0-4, completion flag)
- `src/stores/auth.js` — `profile.tutorial_completed` (optional, oder separat)
- `GameView.vue` — Conditional `<TutorialOverlay>` je Schritt (Spotlight, Tooltip, Action-Lock)

**File-List:**
- Create: `supabase/migrations/20260909_tutorial_progress.sql` (users table: `tutorial_step`, `tutorial_completed_at`)
- Create: `src/onboarding.js`, `src/onboarding.test.js`
- Create: `src/components/TutorialStep.vue`, `TutorialOverlay.vue`
- Modify: `src/stores/game.js` (load + save progress)
- Design-Doc: `docs/superpowers/specs/2026-09-09-newcomer-tutorial-design.md`

**Impact:** Neulinge verstehen Progression in 5–10 min, Retention +15–25%.

---

### 1.2 Simplified Tier-Visibility (First Run)
**Problem:** "Welche Tiere sollte ich kaufen?" — Tier-Liste mit >100 Arten, alles gleich bunt.
**Lösung:**
- Shop-Filter nach Preis-Kategorien (Starter <5k, Mid 5k–100k, Late >100k)
- Auf `/` nur Top 5 ausgerüstete Tiere anzeigen (Favorit + Best 4 by income)
- Hint: "Komplette Sammlung: Index 📖"

**Architektur:** Reine UI-Änderung, kein Backend nötig.

**Files:**
- Modify: `src/views/ShopView.vue` (add Category-Tabs: "Starter", "Mid", "Endgame")
- Modify: `src/views/GameView.vue` (show top 5 animals, hide overflow)

---

### 1.3 Progression Milestone-Alerts
**Problem:** Spieler erreichen Ziele (100 Tiere, 1M Coins) — niemand merkt es.
**Lösung:**
- Achievements/Milestones: "🎉 100 Tiere!" Toast + einmalige +Coins Belohnung
- Sichtbare Progress-Bar: "Nächster Bonus bei X Tieren"

**Architektur:**
- `src/milestones.js` — defineScalar-Funktion (Tier-Count, Coins-Total, etc.)
- Client-Side Tracking (RPC einmal pro Session)
- Toast-Trigger bei Erreichen

**Files:**
- Create: `src/milestones.js`, `src/milestones.test.js`
- Modify: `src/stores/game.js` (milestone checks)

---

## Phase 2: Endgame-Content für Veteranen (Q4 2026 – Q1 2027)

### 2.1 Seasonal Battle Pass (Premium Track)
**Problem:** Veteranen haben alle Tiere, Minigames sind optional. Keine langfristige Zielrichtung.
**Lösung:**
- **12-Wochen Season mit täglich/wöchentlich wechselnden Zielen**
  - "Spiele Parkour 5×" → +50 Season-XP
  - "Gewinne 10M Coins" → +100 Season-XP
  - "Sende 5× Geschenke" → +75 Season-XP
- **Season-Levels 1–100**, jedes Level: Reward (Kosmetik, Coins, Tickets)
- **Free-Track + Premium-Track** (Premium: +50% XP, exklusive Skins)

**Architektur:**
- New Table: `seasons` (id, number, start_at, end_at, name)
- New Table: `season_quests` (id, season_id, title, type, target, reward_xp)
- New Table: `user_season_progress` (user_id, season_id, xp, level, paid_track_claimed)
- RPC: `claim_season_reward(season_id, level)`

**Files:**
- Create: `supabase/migrations/20261001_seasons.sql` (tables + RLS + RPCs)
- Create: `src/seasonalPass.js` (reward formulas, claim logic)
- Create: `src/views/SeasonalPassView.vue` (progress bar, quest list, claim UI)
- Create: `src/components/QuestTracker.vue` (real-time XP ticks)
- Modify: `src/router.js` (add `/seasonal` route)

**Impact:** Veteranen spielen täglich, +40–60% DAU.

---

### 2.2 Leaderboard-Seasons (Competitive Track)
**Problem:** Statische Top-50-Liste, kein Wettbewerb zwischen Wellen.
**Lösung:**
- **Separate Seasonal Leaderboards** (resettet alle 8 Wochen)
  - Track 1: Total Animals (Collection Speed)
  - Track 2: Total Coins Earned (Grind)
  - Track 3: Minigame High-Scores (Skill)
- **Season-Rewards** für Top 10/50/100

**Architektur:** Query `select ... order by season_id, metric_value limit 50`

**Files:**
- Modify: `src/views/LeaderboardView.vue` (Season-Tabs, multiple metrics)

---

### 2.3 Deep Social Features
**Problem:** Welt-Multiplayer ist schön, aber keine echte Kooperation.
**Lösung:** (Backlog für 2027)
- Clans/Gilden (up to 50 members, shared treasury)
- Clan Quests (weekly challenges, shared rewards)
- Clan Leaderboard

---

## Phase 3: Progression & Pacing (Q1 2027+)

### 3.1 Animal Rarity Tiers (Eggs / Crafting)
**Problem:** Später alle Tiere erreichbar. Keine Raum für „rare" Animals.
**Lösung:**
- **Egg System existiert schon** → Ausbauen
- Normal (Eggs) → Gold (Safari Eggs) → Diamond (Crafting) → Epic (Raid Drops) → Rainbow (Seasonal)
- Crafting: Mix von 3× Gold → 1× Diamond
- Raid: Wöchentliche Challenges (Parkour "Extreme" Mode) → Epic Tier-Drops

**Impact:** 6–12 Monate neuer Content für Veteranen.

---

### 3.2 Equipment & Cosmetics Depth
**Problem:** Welt-Skins sind kaufbar, aber kein tiefer Customization.
**Lösung:**
- Pet Accessories: Halsbänder, Hüte (3D-Model-Auswechslungen in Welt)
- Cosmetic-Equip-Slots: Head, Body, Accessory (kombinierbar)
- Rarity-Bonus: Rainbow-Costume → +5% Coins Global

---

## Phase 4: Monetization & Analytics (Rollout)

### 4.1 Premium Currency Tuning
**Problem:** Viele Coins, aber Einnahmestruktur unklar.
**Lösung:**
- Audit bisherige Käufe (Welt-Items, Seasonal Battle Pass)
- A/B Test: Battle Pass €3.99 vs €5.99 vs Free+Cosmetics
- One-Time Founder Packs (z.B. „100k Coins + 3× Gold Eggs" für neue Spieler, zeitlich begrenzt)

### 4.2 Event Cycles
**Problem:** Spieler wissen nicht, wann neue Features kommen.
**Lösung:**
- **Monatliche Themes** (z.B. „Zoo Fest", „Halloween Spooky Animals")
  - 2 Wochen Teaser (Roadmap), 2 Wochen Event
  - Seasonal Animals (nur im Event verfügbar)
  - Limited Challenges (higher rewards)
- Public Calendar in-game

---

## Implementation Roadmap

| Phase | Start | Features | Owner |
|-------|-------|----------|-------|
| **1.0** | Sep 2026 | Tutorial + Milestone-Alerts | QA Lead |
| **1.1** | Okt 2026 | Seasonal Battle Pass + Quests | Backend |
| **2.0** | Nov 2026 | Leaderboard Seasons | Frontend |
| **2.1** | Dez 2026 | Epic Tier Animals + Raids | Design |
| **3.0** | Jan 2027 | Clan System (optional) | Architecture |

---

## Metrics to Track

- **Newcomer Funnel:** Registration → First Animal → 3-Day Retention
- **DAU Growth:** Daily Active Users (target: +25% with Battle Pass)
- **Session Duration:** Avg playtime (target: +15% with Quests)
- **LTV:** Lifetime Value vs acquisition cost
- **Churn:** Users gone >7 days (target: -20%)

---

## Design Docs Needed (Pre-Implementation)

1. ✅ Tutorial System (`2026-09-09-newcomer-tutorial-design.md`)
2. ✅ Seasonal Battle Pass (`2026-10-01-seasonal-pass-design.md`)
3. ✅ Epic Tier Animals (`2026-11-15-epic-tier-design.md`)
4. ✅ Event System & Cosmetics (`2026-12-01-events-cosmetics-design.md`)

Each design doc should follow the pattern:
- **Goal:** 1 sentence
- **Gameplay:** User flow, mechanics
- **Database Schema:** Tables, RPCs, RLS
- **Client Implementation:** Components, stores, routes
- **Balance:** Reward formulas, progression curves

---

## Summary

| Aspect | Newcomers | Existing |
|--------|-----------|----------|
| **Clarity** | Tutorial Guide | Milestone Alerts |
| **Engagement** | Tier-Visibility | Battle Pass + Seasons |
| **Depth** | First-Run Flow | Raids + Cosmetics |
| **Social** | Friendliness | Clans (Q1 2027) |
| **Monetization** | Free Path Clear | Premium Track |

**Expected Outcome:** Zoo Empire becomes a **3–6 month engagement loop** rather than 1-time collection game.
