# Onboarding & Retention-Strategie für Zoo Empire

**Datum:** 2026-09-28  
**Ziel:** Zoo Empire für Neulinge attraktiv gestalten und Retention bestehender Spieler verbessern

---

## Problembeschreibung

Zoo Empire hat ein reiches Feature-Set (27+ Views, Minispiele, Marketplace, Social-Features), aber:

- **Neulinge sind überfordert:** Startbildschirm zeigt viele Quick-Action-Buttons ohne klare Progression
- **Progression unklar:** Es gibt keine visuellen Meilensteine oder Ziele, die Spieler verfolgen können
- **Retention-Lücken:** Bestehende Spieler haben wenig Anreiz für tägliche Rückkehr über hinaus
- **Onboarding-Inhalte fragmentiert:** Tutorials existieren in einzelnen Minispielen, nicht übergreifend
- **Keine Einführungs-Quests:** Erst-Spieler werden nicht durch die Hauptfeatures geleitet

---

## Strategie: Drei Phasen

### Phase 1: Intelligentes Onboarding (Neulinge – erste 30 Min)

**Ziel:** Spieler verstehen die Kernmechaniken und fühlen sich nicht überfordert

#### 1.1 Progressives Reveal
- **Startbildschirm limitieren:** Nur die essentiellen 5-6 Features zeigen (Tap, Shop, Sammlung)
- **Weitere Features später freischalten:** Bei Progression bestimmte Quick-Actions aktivieren
  - Level 10: Minispiele (Drift, Memory)
  - Level 20: Breeding & Trade
  - Level 30: World & Market
  - Level 50: Advanced Events

#### 1.2 Einführungs-Quest-Linie
```
Quest 1: Dein erstes Tier
  └─ Ziel: Ein Tier im Shop kaufen (+50 Bonus-Coins)
  └─ Reward: +2 Taps, Willkommens-Abzeichen

Quest 2: Feeding & Favorit
  └─ Ziel: Ein Tier füttern + als Favorit wählen
  └─ Reward: +5 Taps, Tap-Multiplikator +10%

Quest 3: Erstes Minispiel
  └─ Ziel: Memory, Drift oder Parkour spielen
  └─ Reward: +100 Tickets, Minispiel-Boost-Pack

Quest 4: Marktplatz erkunden
  └─ Ziel: Ein Tier auflisten oder einen Kauf durchführen
  └─ Reward: +1000 Coins, Market-Abzeichen

Quest 5: Erste Zucht
  └─ Ziel: Breeding starten
  └─ Reward: Rare Egg Capsule, Breeding-Boost
```

#### 1.3 Guided Tour (Modal-Overlay, optional)
- **Interaktive Einführung:** Beim ersten Start Sprechblase über jedem Hauptfeature
- **Persistenz:** `localStorage` speichert `tourStep` — Spieler können überspringen, zurückkehren
- **Kontextuelle Hilfe:** Tooltip-Bubble zeigt auf Knöpfe mit kurzer Erklärung

### Phase 2: Mittelfristige Retention (Woche 1–4)

**Ziel:** Regelmäßige Spiele-Sessions durch Progression & Rewards

#### 2.1 Progression-Tracking
- **Level-System sichtbar machen:** Progressionsleiste in der Hero-Section
- **Meilensteine:** Visuelle Belohnungen alle 10 Level (Tier freischalten, Coins-Boost, Abzeichen)
- **Nächstes Ziel klar kommunizieren:** "Nur 500 Coins bis Level 15 — +50 Taps warten"

#### 2.2 Daily Login Bonuses (Verbesserung)
- Aktuell: `DailyRewardModal` — aber keine Combo-Belohnung
- **Neu:** Streak-Mechanic
  - Tag 1-3: +50 Coins
  - Tag 4-6: +100 Coins + +1 Tap
  - Tag 7: +500 Coins + +5 Taps + Rare Capsule
  - Streak sichtbar im Header (`Day 5 Streak 🔥`)

#### 2.3 Weekly Events & Challenges
```
Wöchentliche Quest-Sets (rotierend):
- "Tap Master": 50.000 Taps = +200 Coins/Tag
- "Minispiel-Marathon": 5 Minispiel-Sessions = +50 Tickets
- "Breeding Master": 3 Eggs ausbrüten = +2 Egg Capsules
- "Social Butterfly": 3 Handel-Transaktionen = +1000 Coins
```

#### 2.4 Tier Progression System (neu)
- **Tier Rarität Showcase:** `InventoryView` zeigt alle besessenen Raritäten
- **Sammler-Ziele:** "Sammle 1 von jeder Rarität = Platinum Trophy"
- **Seasonal Pass:** z. B. "Herbst-Sammlung: 10 Tiere dieser Saison = Exclusive Skin"

### Phase 3: Langfristige Engagement (Monat 2+)

**Ziel:** Community, Progression ohne Grind-Wall, neue Inhalte

#### 3.1 Ranglisten & Achievements
- **Global Leaderboards erweitern:**
  - Top Coins (existiert als `LeaderboardView`)
  - Top Tiers (Rarität & Level)
  - Top Minispiel-Scores (Drift, Parkour, BlockFall)
  - Top Breeders (Egg-Count & Seltenheit)
- **Achievements System:**
  - "Erste Million Coins"
  - "Sammler: 50 verschiedene Tiere"
  - "Tägliche Rückkehr: 30 Tage Streak"
  - "Minispiel-Meister: Alle auf Level 10+"

#### 3.2 Guild / Crew System (zukünftig)
- Teams von bis zu 5 Spielern
- Gemeinsame Ressourcen-Boni
- Weekly Guild Challenges
- Leaderboard nach Guild-Coins

#### 3.3 Seasonal Content & Limited Editions
- Tier-Skins zu Jahreszeiten / Holidays
- Limited-Time Minispiele (z. B. "Winter Snowball")
- Battle Pass analog (freier Pass + Premium Pass)

#### 3.4 Endgame Content
- **Boss Battles** (existiert als `BossFightView`, `BossPathView`, `EndlessBossView`)
  - Machen diese in der Main-View sichtbarer
  - Daily Challenge: "Boss des Tages" mit Bonus
  - Leaderboard: Wer schafft den höchsten Boss-Level?
- **High-Score Verfolgung** für alle Minispiele

---

## Implementierungs-Roadmap

| Sprint | Komponente | Effort | Nutzer-Wirkung |
|--------|-----------|--------|-----------------|
| **Sprint 1** | Progressive Reveal (Feature-Unlock by Level) | M | Neue Spieler fühlen sich weniger überfordert |
| **Sprint 1** | Einführungs-Quest-Linie (5 Quests) | L | Klare Onboarding-Path mit Rewards |
| **Sprint 2** | Daily Login Streak System | S | Tägliche Rückkehr +20% |
| **Sprint 2** | Weekly Challenges (4-6 verschiedene) | M | Ziele & Abwechslung für Mid-Core Spieler |
| **Sprint 3** | Progression-Tracking UI (Level-Bar, Meilensteine) | S | Visualisierte Ziele erhöhen Engagement |
| **Sprint 3** | Achievements & Badges (20+ Achievements) | M | Langfristige Ziele |
| **Sprint 4** | Tier Rarität Showcase & Sammler-Ziele | S | Incentiviert Diversity im Roster |
| **Sprint 5** | Global Leaderboards erweitern (4 Kategorien) | M | Kompetition erhöht Motivation |
| **Sprint 6+** | Guild System, Seasonal Pass, Boss-Focus | L | Langfristige Retention & Monetisierung |

---

## Technische Notizen

### Frontend-Komponenten (neue/angepasst)
- `OnboardingTour.vue` — Interaktive Sprechblasen (nutzt `TutorialBubble.vue`)
- `QuestTracker.vue` — Aktive Quests mit Progress-Bar
- `DailyStreakBanner.vue` — Streak-Anzeige im Header
- `AchievementPanel.vue` — Achievement-Gallery mit Unlock-Animation
- `ProgressionBar.vue` — Level-Progress mit Meilenstein-Markierungen

### Store-Änderungen (`src/stores/game.js`)
- `game.questsActive` — Array aktiver Quests
- `game.dailyStreak` — Tage in Folge (Server-validiert via RPC)
- `game.achievements` — Map von Achievement-IDs zu `{unlocked, unlockedAt}`
- `game.onboardingStep` — 0 = nicht begonnen, 1-5 = Quest-Phase, 6+ = Main Game

### Server-Side RPCs (neue)
```sql
-- Neue RPC-Funktionen
rpc_quest_claim(quest_id)           -- Claim Quest-Reward
rpc_daily_streak_check()            -- Validieren & update streak
rpc_achievement_check(achievement_id) -- Check & unlock achievement
rpc_weekly_challenges_get()         -- Liste dieser Woche
rpc_weekly_challenge_progress()     -- Update Progress
```

### Migrations (`supabase/migrations/`)
```sql
-- Neue Tabellen
CREATE TABLE quests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  quest_id TEXT NOT NULL,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  claimed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, quest_id)
);

CREATE TABLE achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE daily_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  current_streak INT DEFAULT 0,
  last_login TIMESTAMP DEFAULT NOW(),
  freeze_until TIMESTAMP  -- Puffer für späte Check-ins
);

CREATE TABLE weekly_challenges (
  id BIGSERIAL PRIMARY KEY,
  week_of TIMESTAMP DEFAULT NOW(),
  challenge_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  progress INT DEFAULT 0,
  PRIMARY KEY(week_of, challenge_type, user_id)
);
```

---

## Erfolgskennzahlen

Nach 30 Tagen messen:
- **Neulinge:** Retention Day 1 +15%, Day 7 +25%
- **Session-Länge:** +20% Durchschnitt
- **Tägliche Aktive:** +30% durch Streaks & Challenges
- **Feature-Adoption:** 80% spielen Minispiele, 50% nutzen Trade/Market

---

## Nächste Schritte

1. **Validierung mit Spielern:** Feedback zum Progressive Reveal sammeln
2. **Design der Einführungs-Quest:** Exakte Texte, Belohnungs-Balancierung
3. **Streak-Logik formulieren:** Timezone-Handling, Freeze-Mechnismen
4. **Sprint 1 Planning:** Priorisieren & Zuweisung

---

## Appendix: Feature-Lock-Matrix

| Feature | Unlock-Level | Reason |
|---------|--------------|--------|
| Tap-System | Start | Kernsystem |
| Shop | Start | Erste Käufe |
| Sammlung | Start | Viewing Roster |
| Füttern | 3 | Nach 1. Tier |
| Favorit-System | 5 | Nach 2-3 Tiere |
| Minispiele (Memory, Drift) | 10 | Core Loop Verständnis |
| Breeding | 20 | Tier-Komplexität |
| Trade / Market | 25 | Economy Verständnis |
| World / Farming | 30 | Social Ready |
| Boss Battles | 40 | Endgame |
| Events / Limited | 50+ | Active Community |

---

**Autor:** AI Agent  
**Status:** Proposal  
**Version:** 1.0
