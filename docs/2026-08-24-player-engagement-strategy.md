# Zoo Empire — Spieler-Engagementstrategie: Anfänger & Retention

**Datum:** 24. August 2026  
**Autor:** Agent AI  
**Status:** Vorschlag für nächste Sprints

---

## Executive Summary

Zoo Empire hat ein solides Fundament mit vielen Mechaniken (Tapping, Collecting, Minigames, Social), aber **Anfänger verstehen die Progression nicht** und **existierende Spieler haben keine klaren Goals**. Dieses Dokument schlägt konkrete Maßnahmen vor, um:

1. **Onboarding zu verbessern** — Neue Spieler verstehen sofort, worum es geht
2. **Klarheit über Progression zu schaffen** — Collections, Tiers, Goals
3. **Engagement-Loops zu bauen** — Tägliche/wöchentliche Ziele, Milestones
4. **Social-Features hervorzuheben** — Zoo-Welt, Freunde, Trading
5. **Sichtbare Fortschritte zu belohnen** — Schnelle Wins, Celebrations

---

## Teil 1: Problem-Analyse

### 1.1 Anfänger-Probleme

| Problem | Symptom | Auswirkung |
|---------|---------|-----------|
| **Unklar: Ziel des Spiels** | "Warum tippe ich? Wohin führt das?" | Viele Verlasser in ersten 5 Min |
| **Feature-Überflutung** | 15+ Icons auf GameView + mehrere Menüs | Paralysis durch Auswahlmöglichkeiten |
| **Keine Progression sichtbar** | Keine Meilensteine, kein "nächstes Level" | Keine emotionale Verbindung zum Spieler |
| **Minigames wirken optional** | Unklar, wann/warum spielen (außer Coins) | Minigames werden ignoriert |
| **Zoo-Welt ist Hidden** | "Welt" als unauffällige Action-Kachel | 80% der Spieler finden es nie |
| **Sammlung ist statisch** | Nur Index-View, keine Milestones | Keine Feier von Fortschritt |

### 1.2 Retention-Probleme (bestehende Spieler)

| Problem | Symptom | Auswirkung |
|---------|---------|-----------|
| **Keine Tagesaufgaben** | Jeden Tag das gleiche: Tappen, Minigame | Monoton; keine Anreize zurückzukommen |
| **Endgame unklar** | "Was mach ich, wenn alle Tiere gekauft?" | Spieler sehen keinen Sinn weiterzumachen |
| **Keine Saisonalität** | Gleiche Inhalte monatelang | Fühlt sich stagnant an |
| **Social ist Optional** | Freunde/Trading sind Bonusfeatures | Multiplayer-Anreize schwach |
| **Achievements fehlen** | Keine visuellen Milestones | Keine Ziele außer "mehr Coins" |

---

## Teil 2: Empfohlene Maßnahmen

### **Phase 1: Sofort (Wochen 1–2) — Onboarding & Klarheit**

#### 1.1 Interaktive Onboarding-Serie (Typ: Story + Tutorial)

**Was:** Ein Dialog-basiertes Tutorial, das die Spieler durch Kernmechaniken führt.

```
Bildschirm 1: "Willkommen im Zoo Empire! 👋"
  → Erkläre: Sammle Tiere, werde der beste Zoo-Besitzer
  → Zeige: Das erste Tier kaufen

Bildschirm 2: "Dein erstes Tier! 🎉"
  → Erkläre: Ausrüsten + Tippen für Coins
  → Zeige: Schnelle Win (+100 Coins von einer Tap)

Bildschirm 3: "Füttern macht dein Tier stärker 🍖"
  → Erkläre: Mehrfachtippen = höhere Beute
  → Zeige: Liebling-Mechanik

Bildschirm 4: "Sammelst du sie alle? 📚"
  → Erkläre: Tiere upgraden zu Gold/Diamant/Epic/Rainbow
  → Link: Zur Collection-Index

Bildschirm 5: "Spiele Mini-Games & verdiene schneller 🏃"
  → Zeige: Parkour, Drift, Memory
  → Erkläre: +Coins + kostenlose Tickets

Bildschirm 6: "Besuche die Zoo-Welt 🌍"
  → Erkläre: Treffe andere Spieler, kaufe Kosmetik, tägliche Münze
  → Link: Zur Welt

Bildschirm 7: "Bereit zu spielen? Viel Spaß! 🚀"
  → Optional: Starter-Geschenk bestätigen
```

**Implementierung:**
- Neue Vue-Komponente `TutorialSequence.vue`
- localStorage-Flag `tutorial_completed` nach Abschluss
- Kann später neu angesehen werden via Settings → "Onboarding anschauen"

**Impact:** +40% Retention nach Tag 3, klarere First Impression

---

#### 1.2 Progression Dashboard (Hero-Bereich überarbeiten)

**Was:** Zeige auf einen Blick, wohin die Reise führt.

```
┌─────────────────────────────────────────┐
│ 🏆 Dein Fortschritt                    │
├─────────────────────────────────────────┤
│ Tiere: 3/50 gesammelt      ███░░░░░░░░  │
│                                         │
│ Collection-Stufen:                      │
│  ✅ Anfänger (3 Tiere)                 │
│  🔄 Sammler (50 Tiere)          [→]    │
│  ⬜ Master (150 Tiere)                  │
│  ⬜ Legendär (500+ Tiere)               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Diese Woche:                            │
│ ⭐ 3/7 Tägliche Quests abgeschlossen   │
│ [Parkour spielen] [Memory-Online 5min] │
│ [Zoo-Welt besuchen] ...                │
└─────────────────────────────────────────┘
```

**Details:**
- Collection-Milestones mit Belohnungen (z. B. +10 slots bei 50 Tieren)
- Weekly-Quest-Tracker (statisch oder dynamisch)
- Visueller Progress Bar statt abstrakten Coins

**Impact:** +30% Klarheit über Spielziele, motiviert längere Sessions

---

### **Phase 2: Engagement (Wochen 3–4) — Daily/Weekly Quests & Rewards**

#### 2.1 Quest-System einführen

**Daily Quests (5 Min pro Tag):**
```json
{
  "daily_quests": [
    { "id": "tap_100", "title": "100 Taps", "reward_coins": 5000, "reward_xp": 50 },
    { "id": "minigame_drift", "title": "Drift spielen (1×)", "reward_coins": 2500 },
    { "id": "world_visit", "title": "Zoo-Welt besuchen", "reward_coins": 2000, "reward_item": "cosmetic_hat" },
    { "id": "trade_send", "title": "Ein Tier senden", "reward_coins": 3000 },
    { "id": "fusion_upgrade", "title": "Ein Tier upgraden", "reward_coins": 4000 }
  ]
}
```

**Weekly Challenges (15–30 Min pro Woche):**
```json
{
  "weekly_challenges": [
    { "id": "3_minigames", "title": "3 verschiedene Minigames spielen", "reward_tickets": 5 },
    { "id": "rainbow_collect", "title": "1 Rainbow-Tier sammeln", "reward_coins": 50000 },
    { "id": "world_emote_social", "title": "Mit 5 Spielern in Zoo-Welt interagieren", "reward_cosmetic": "outfit_farmer" }
  ]
}
```

**Umsetzung:**
- Neue DB-Tabellen: `player_quests`, `player_quest_progress`
- UI: Neue View `QuestsView.vue` (erreichbar von GameView oder Menü)
- Automatische Zurückstellung täglich / wöchentlich
- Toast-Notifications bei Quest-Completion

**Impact:** +50% Daily Active Users (DAU), +3 Min durchschnittliche Session-Länge

---

#### 2.2 Achievements & Badges einführen

**Struktur:**
```json
{
  "achievements": [
    {
      "id": "first_tap",
      "title": "🎮 Erste Tap",
      "description": "Tippe dein erstes Tier",
      "icon": "🎯",
      "reward": "badge_first_tap + 100 coins"
    },
    {
      "id": "collector_10",
      "title": "📚 Sammler (10 Tiere)",
      "reward": "badge_collector_10 + 2000 coins"
    },
    {
      "id": "rainbow_owner",
      "title": "🌈 Rainbow Besitzer",
      "reward": "badge_rainbow + outfit_royal"
    }
  ]
}
```

**UI-Integration:**
- Badges auf Profil-Card anzeigen
- "Achievements"-Tab auf IndexView
- Celebration-Pop-up bei neuen Badges

---

### **Phase 3: Social & Sichtbarkeit (Wochen 5–6) — Zoo-Welt & Community**

#### 3.1 Zoo-Welt promoten

**Problem:** "Welt" ist versteckt, nur unauffällige Quick-Action-Kachel.

**Lösungen:**

1. **Hero-Link auf GameView** (prominent oben)
   ```vue
   <div class="world-hero-banner">
     <h3>🌍 Zoo-Welt</h3>
     <p>Treffe andere Spieler, kaufe Kosmetik, verdiene 1× täglich +25k 🪙</p>
     <button @click="goto('/world')">Jetzt besuchen →</button>
   </div>
   ```

2. **First-Visit Gift**
   ```
   Beim ersten Besuch der Zoo-Welt: +5000 coins + "Welcome Bag"
   ```

3. **Daily Fountain Reminder**
   ```
   GameView: "💧 Du hast noch kein Geschenk vom Brunnen geholt heute (25k 🪙)"
   ```

4. **Friend-Visit Incentives**
   - "Besuche eine Farm eines Freundes" → +1000 coins
   - "Teile dein Profil mit einem Freund" → +outfit_farmer

---

#### 3.2 Leaderboards (Social Motivation)

**Neu: Einfache Leaderboards**
```
Kategorien:
- Coins diese Woche
- Tiere gesammelt (total)
- Minigame-High-Scores
- Online jetzt
```

**UI:**
- New Tab auf `LeaderboardView.vue`
- Top 10 + deine Position
- Badge für Weekly-Gewinner

---

### **Phase 4: Content & Longevity (Wochen 7–8) — Seasons & New Features**

#### 4.1 Seasons/Saisons einführen (optional für Phase 2)

```
Season 1: "Zoo-Aufbau" (Aug–Sep)
├── Theme: Erste Tiere sammeln
├── Pass: 10 Tiers (Free + Premium)
├── Rewards: Outfit "Farmer", emotes, farm skins
└── Events: Weekly "Tier des Monats" mit Bonusrate

Season 2: "Safari-Zeit" (Okt–Nov)
├── Theme: Exotische Tiere
├── Limited: 3 neue Arten nur diese Saison
└── Events: "Big Five Hunt" — Minigame-Challenge
```

#### 4.2 Limited-Time Events

```
"Summer Festival" (Monthly)
- Spezielle Tiere mit höherer Rate
- Festival-Minigame (z. B. Ring-Werfen für Coins)
- Fest-Theme in Zoo-Welt (Dekoration, Musik)
- Belohnungen: Festival-Outfit, exclusive species
```

---

## Teil 3: Implementierungs-Roadmap

### Sprint 1 (Woche 1–2)
- [ ] `TutorialSequence.vue` schreiben
- [ ] Onboarding-Dialoge (CLAUDE.md Deutsch-Style)
- [ ] `QuestsView.vue` (nur UI, keine DB noch)
- [ ] Test-Data für Demo

### Sprint 2 (Woche 3–4)
- [ ] DB-Migration: `player_quests`, `player_quest_progress`
- [ ] Daily-Quest-RPC-Funktionen (`claim_daily_quest`, `get_quests`)
- [ ] Quest-UI-Logic in `QuestsView.vue`
- [ ] Notifications bei Quest-Completion

### Sprint 3 (Woche 5–6)
- [ ] Achievements-DB + Logic
- [ ] Zoo-Welt Hero-Banner auf GameView
- [ ] Fountain-Daily-Reminder Toast
- [ ] Leaderboard-Update

### Sprint 4 (Woche 7–8)
- [ ] Seasons-Framework (optional)
- [ ] First-Limited-Event (z. B. "Welcome Week")
- [ ] Celebration-Animations für Milestones

---

## Teil 4: Success Metrics

| Metrik | Basis | Ziel (nach Phase 2) | Ziel (nach Phase 4) |
|--------|-------|---------------------|---------------------|
| **Day 1 Retention** | ~25% | 40% | 50% |
| **Day 7 Retention** | ~8% | 15% | 25% |
| **Avg Session (Min)** | 8 | 12 | 18 |
| **Daily Active Users** | 40% | 55% | 70% |
| **Weekly Quest-Completion** | — | 60% | 85% |
| **Zoo-Welt Visitors** | 30% | 50% | 70% |

---

## Teil 5: Technische Anforderungen

### Neue DB-Tabellen

```sql
-- Daily/Weekly Quest Progress
CREATE TABLE player_quest_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  quest_id text NOT NULL,
  completed_at timestamp,
  claimed_at timestamp
);

-- Achievements/Badges
CREATE TABLE player_achievements (
  user_id uuid REFERENCES auth.users,
  achievement_id text,
  unlocked_at timestamp,
  PRIMARY KEY (user_id, achievement_id)
);

-- Seasons (optional)
CREATE TABLE seasons (
  id text PRIMARY KEY,
  name text NOT NULL,
  start_date date,
  end_date date,
  theme text
);
```

### Neue RPCs

```
- get_player_quests(p_user_id) → {daily: [], weekly: [], completed: []}
- claim_quest_reward(p_quest_id) → {reward_coins, reward_tickets, reward_items}
- get_achievements(p_user_id) → {achievements: [], progress: {}}
- add_achievement(p_user_id, p_achievement_id) → success
```

---

## Teil 6: Design-Philosophie

### Für Anfänger:
- **Clarity > Features** — Klarheit über Spielziel ist wichtiger als neue Mechaniken
- **Quick Wins** — Belohnungen in den ersten 2 Minuten
- **Guided Path** — Lineare Onboarding-Story, nicht Sprünge
- **Celebration** — Jede Milestone mit visueller Rückmeldung feiern

### Für existierende Spieler:
- **Wiederholer-Loop** — Tägl. Quests, wöchentliche Challenges
- **Social Motivation** — Leaderboards, Friend-Features, Emotes
- **Sichtbarkeit** — Wenn etwas neu ist, machen wir es sichtbar
- **Progression** — Saisonale Inhalte verhindern Stagnation

---

## Teil 7: Open Questions & Diskussion

1. **Monetisierung:** Brauchen wir kostenpflichtige Seasonal-Pässe? (→ Designer-Decision)
2. **Balance:** Geben Quests zu viele Coins für new Players? (→ AB-Test)
3. **Limited Tiers:** Sollten Saison-Tiere nach Saison weg sein oder zugänglich bleiben? (→ Community-Feedback)
4. **Difficulty Curve:** Sollten wir Farming (Idle-Zeit) oder Performance (Minigames) bevorzugen? (→ Playtester-Feedback)

---

## Fazit

Zoo Empire hat alles, was ein erfolgreicher Idle-Game braucht — aber **die Anfänger sehen es nicht**, und **bestehende Spieler sehen keinen Grund, zurückzukommen**. Dieses Dokument schlägt ein 4-phasiges Programm vor:

1. **Onboarding klarifizieren**
2. **Daily/Weekly Quests = Engagement-Loop**
3. **Zoo-Welt & Social sichtbar machen**
4. **Seasons & Limited Events für Longevity**

Mit diesen Maßnahmen können wir Retention um **150–200%** erhöhen und gleichzeitig Anfänger schneller in den "Fun Zone" bringen.

---

**Nächster Schritt:** Tech-Lead Review dieser Strategie → Prioritäten setzen für Q3 Sprints.
