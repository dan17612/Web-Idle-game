# Zoo Empire — Onboarding & Retention Strategy

## Ziel
Zoo Empire soll für **Neulinge attraktiv und verstehbar** sein und **bestehende Spieler aktiv halten**. Dieses Dokument definiert die Progression, Feature-Entdeckung und Retention-Mechaniken.

---

## 1. Spieler-Segmente & Ihre Ziele

### 1.1 Neulinge (Session 1–3)
- **Ziel:** Das Spiel-Konzept verstehen und erste Erfolge feiern.
- **Pain Points:**
  - Zu viele Systeme gleichzeitig (Farm, Shop, Minigames, Welt, Trading)
  - Keine klare "Was soll ich zuerst tun?"-Anleitung
  - Zu viele Menu-Knöpfe ohne Erklärung
- **Success Metrics:**
  - Session 1: Erstes Tier kaufen, tappen, Einkommen verstehen
  - Session 2: Minispiel probiert, Rewards kassiert
  - Session 3: Freund/Leaderboard entdeckt oder Crafter/Fusion probiert

### 1.2 Early-Mid-Game (Woche 1–2)
- **Ziel:** Mechaniken meistern, erste Präferenzen bilden.
- **Focus:**
  - Tier-Sammlung erweitern
  - Lieblings-Minigame finden
  - Wirtschaft (Coins, Tickets) verstehen
- **Success Metrics:**
  - Täglich ≥2 Sessions
  - ≥3 verschiedene Minigames probiert
  - ≥5 unterschiedliche Tier-Rassen besessen

### 1.3 Long-Term Spieler (Woche 2+)
- **Ziel:** Ziele setzen, Gemeinschaft, langfristiger Spaß.
- **Focus:**
  - Collector: Pokedex-Vollständigkeit (Normalform + Tiers)
  - Competitor: Leaderboard-Ränge, Streak-Rekorde
  - Social: Freunde, Trading, Coop-Events
  - Crafter: Rezepte sammeln, spezielle Tiere erschaffen
- **Success Metrics:**
  - Daily-Reward-Streak ≥7 Tage
  - Minispiele: Best-Scores, Abzeichen/Statistiken
  - Trading-Aktivität, Freundschaften aktiv

---

## 2. Onboarding-Fluss (Session 0 → Session 1)

### 2.1 Login/Auth
- **Aktueller Zustand:** Standard-Email-Auth, Profile wird angelegt.
- **Verbesserung:**
  - Optional: "Quick-Start"-Gast-Modus (später Login) für Sofort-Spielen.
  - ✅ **Willkommens-Screen** nach erstem Login (siehe 2.2).

### 2.2 Tutorial-Progression (First-Time Experience)

#### Schritt 1: Willkommens-Video/Hero-Screen (IndexView)
- **Was:** "Dein Zoo, dein Tempo!"
- **Zeigt:** Ein animiertes Teaser-Bild/GIF (Tiere hüpfen, Coins fallen)
- **CTA:** "Zoo aufbauen" / "Spielen"
- **Skip:** Ja, nach 3s oder Knopfdruck
- **Dauer:** ~15 Sekunden
- **Umsetzung:** 
  - Lokale `isFirstVisit`-Flag in GameView
  - Overlay oder Modal vor GameView-Render

#### Schritt 2: First-Tap Tutorial (GameView)
- **Trigger:** Spieler öffnet GameView zum 1. Mal
- **Anleitung:** 
  - "Du hast **{coins} Münzen** — genug für ein Küken! 🐤"
  - Pfeile zu "Shop" zeigen
  - Kein Blocking, nur Highlights
- **Umsetzung:**
  - `TutorialBubble`-Komponente in GameView
  - Redux-ähnlicher Tutorial-State in GameStore
  - Mobile-optimiert (nicht zu groß, nicht zu oft)

#### Schritt 3: First Buy (ShopView)
- **Trigger:** Spieler landet im Shop
- **Anleitung:**
  1. "Das ist der Shop — hier kaufst du Tiere!"
  2. "Küken sind dein Start. Tippe + kaufen!" (mit Highlight auf Küken-Karte)
  3. "Jedes Tier verdient dir **Münzen pro Sekunde**."
- **Umsetzung:**
  - `shop_tutorial_seen` in LocalStorage/Profile
  - Overlay mit getTooltip-Text bei bestimmten Buttons
  - Step-by-step Flows (1 Modal pro Schritt, Next/Skip)

#### Schritt 4: First Tap (GameView, nach Kauf)
- **Trigger:** Spieler hat ≥1 Tier
- **Anleitung:**
  - "Tippe auf dein Tier zum Füttern — Extra-Münzen!"
  - "Du kannst **{tapsPerSec} Mal pro Sekunde** tippen."
  - Großer glühender Button auf dem Tier
- **Umsetzung:**
  - Pulse-Animation auf Tier (CSS `animation: pulse 1s infinite`)
  - TutorialBubble oben

#### Schritt 5: Minispiel-Discovery (GameView, ~Min 5)
- **Trigger:** Nach 5 Minuten Gameplay / 2. Session
- **Anleitung:**
  - "Verdiene extra Münzen in Minispielen!"
  - Zyklus: Drift → Parkour → Wordle → Memory
  - Je 1 "Probier es!" Toast, wenn Spieler vorbei scrollt
- **Umsetzung:**
  - `tutorial_minigames_seen` Tracker
  - Toast bei Scroll über Quick-Action-Zone

#### Schritt 6: Favorite + Upgrades (GameView, ~Session 2)
- **Trigger:** Spieler hat ≥2 Tiere, ≥500 Coins
- **Anleitung:**
  - "Wähle einen Favoriten für Tap-Boost!"
  - "👆 Upgrades verdoppeln dein Einkommen."
- **Umsetzung:**
  - Highlight Favorite-Knopf
  - Puls auf Upgrade-Sektion

### 2.3 Tutorial State Management

```javascript
// In stores/game.js
tutorial: {
  seen: Set [ 'first_visit', 'shop', 'tap', ... ],
  currentStep: 'shop' | null,
  dontShowAgain: false
}

// Methode: advanceTutorial(step)
advanceTutorial(step) {
  this.tutorial.seen.add(step);
  this.tutorial.currentStep = this.getNextTutorialStep();
}

// Helper: shouldShowTutorial(step)
shouldShowTutorial(step) {
  return !this.tutorial.seen.has(step) 
    && this.tutorial.currentStep === step
    && !this.tutorial.dontShowAgain;
}
```

---

## 3. Progression & Feature-Unlock (Woche 1–∞)

### 3.1 Tier-Pyramide (Sammler-Motivation)

**Visualisierung in InventoryView:**
```
🐤 Küken (Start)       Coins: 50       [COLLECT ALL FORMS]
   ├─ Normal
   ├─ 🥇 Gold (3x upgrade)
   ├─ 💎 Diamond (6x)
   ├─ 🟣 Epic (9x)
   └─ 🌈 Rainbow (12x)

🐔 Huhn (Unlock bei ≥500 Coins)
🐰 Hase (≥1000)
... etc
```

**Umsetzung:**
- Neuer Tab "🐾 Pokedex" in InventoryView
- Zeigt: Alle 10 Basis-Spezies + deren Tier-Progressionen
- Grün für besessen, Grau für nicht besessen
- Progress-Bar: X/50 Tiere gesammelt (mit Milestone-Rewards)

### 3.2 Level-Up Events (Wöchentliche Inhalte)

| Woche | Fokus | Feature | Reward |
|-------|-------|---------|--------|
| 1     | Verstehen    | Tutorial abgeschlossen    | +5000 Coins |
| 2     | Minigames    | Alle 4 Minigames ≥1x gespielt | +Ticket Bonanza |
| 3     | Sammler      | 10 verschiedene Tiere besessen | +Craft-Material |
| 4     | Social       | 1. Freund hinzufügt / Handelt | +Special Tier Egg |

**Umsetzung:**
- Neues Panel "🎯 Meilensteine" in GameView oben
- Fortschrittsbalken pro Woche
- Toast bei Vollendung, automatische Reward-Anrechnung

### 3.3 Progression Path

**Empfohlene Spieler-Reise:**

1. **Tag 1:** Farm-Basics (Tap, Buy, Income)
2. **Tag 1–2:** 1. Minigame probieren → erste Rewards
3. **Tag 2–3:** Lieblings-Minigame finden, täglich spielen
4. **Woche 1:** Crafter/Fusion entdecken
5. **Woche 1–2:** Trades/Freunde entdecken
6. **Woche 2+:** Leaderboard-Ambition, Langzeit-Ziele

**In der UI umgesetzt durch:**
- Badges in Quick-Action-Bereich (neu = "⭐ NEU")
- Tooltips bei Hover
- Links zwischen verwandten Features

---

## 4. Daily Retention Loop

### 4.1 Tägliche Anreize

**Login-Reward (bestehend):**
- ✅ Coins + Tickets nach Streak
- ✅ Streak-Multiplikator bis 2x (max 11 Tage)
- ✅ Visuelles Streak-Banner

**Erweiterung:**
- **Tägliches Minigame**: Wordle/Drift/Parkour — Bonus-Multiplikator wenn alle 3 heute gespielt
- **Wheel of Fortune**: 1x täglich Spin für Bonus-Items (1 pro Tag)
- **World Fountain**: 1x täglich für besondere Rewards (wenn World implementiert)

**Umsetzung:**
- Toast bei Login: "🎯 Deine heutige Quest: Alle Minigames spielen für +50% Bonus"
- Daily-Checklist-UI in GameView (4 Kästchen, grün wenn erledigt)

### 4.2 Session-Strukturierung

**Session 0 (Daily Check-in):** 3–5 Min
- Login Reward abholen
- Passive Coins sammeln (Tap ≥5x)
- Ein Minigame starten

**Session 1–2 (Deep Dive):** 15–30 Min
- Minispiel durchspielen + Rewards kassieren
- Neue Tiere kaufen
- Vielleicht: Freund handeln / Leaderboard checken

**Session 3 (End-Game):** 30–60 Min+
- Crafting/Fusion durchführen
- Sammler-Aktivitäten (Pokedex füllen)
- Social (Trading, Freunde, World-Lobby)

### 4.3 Push-Notifikation / Reminders

**Implementierung (später, Phase 2):**
- Opt-in Reminder um 11:00 Uhr: "Deine tägliche Belohnung wartet"
- Nach 48h Inaktivität: "Du wirst vermisst — neue Minigames verfügbar!"
- Für Streak-Spieler bei 23:59 UTC: "Letzte Chance heute — Streak sichern"

---

## 5. Long-Term Retention (Woche 2+)

### 5.1 Competitive Seasons

**Wordle Leaderboard (existierend):**
- ✅ Daily Streak Competition
- ✅ Best Streak ever
- ✅ Sortierung: current_streak > best_streak > games_won

**Erweiterung zu Seasons:**
- **Season 1:** Wordle Champion (Sep 13 – Sep 20)
  - Wöchentliche Reset der `current_streak`
  - Top 10 bekommen Special Egg + Title
  - New Season startet automatisch

**Umsetzung:**
- `wordle_seasons` Tabelle: `season_id, start_date, end_date`
- Leaderboard-View zeigt: aktuelle Season + Archive
- Title-Badges in Profile: "🟩 Wordle Champion S1"

### 5.2 Collection Challenges

**"Pokedex-Sprint":** Sammler-Events alle 2 Wochen
- **Challenge:** X beliebige Tiere sammeln in Y Tagen
- **Reward:** Exklusive Spezies oder Craft-Rezept
- **Beispiel:** "Sammle alle 5 Basis-Hühner-Varianten in 7 Tagen → 🌈 Golden Rooster Egg"

**Umsetzung:**
- Neuer DB-Tisch `collection_events`
- Badge-System in InventoryView
- Sonder-Egg-Ausgabe nach Abschluss

### 5.3 Seasonal Content

**Zoo-Welt (Road to Expansion):**
- ✅ Basis-World implementiert (lobby, leash, positioning)
- **Phase 2:** Limited-Time Decorations (Weihnacht, Ostern, etc.)
- **Phase 3:** World Events (Festivals mit Mini-Quests)

**Craft-Rezepte (Rotation):**
- Monthly New Recipes
- Neue, limitierte Spezies-Kombinationen
- Scarcity → Collector's Pride

### 5.4 Social Hooks

**Friends System:**
- ✅ Freund-Liste, Trading
- **Erweiterung:**
  - Leaderboard-Filter: "Nur meine Freunde" 
  - Shared-Challenges: "Wer sammelt zuerst 50 Tiere?" (Proof-of-Concept mit 2 Freunden)
  - Gift-Box: Freund verschenkt Coins/Items (1x pro Woche)

**Guild/Clan (Phase 3):**
- Optional: Spieler treten Clubs bei (max 20)
- Club-Leaderboard (Summe aller Member-Coins)
- Club-Quests: "Zusammen 1M Coins verdienen → Club-Bonus"

---

## 6. Engagement Curve & Metrics

### 6.1 Zielgrößen (nach 4 Wochen)

| Metrik | Target | Note |
|--------|--------|------|
| **D1 Retention** | ≥50% | Tag 1 → Tag 2 zurück |
| **D7 Retention** | ≥20% | Tag 1 → Tag 7 zurück |
| **D30 Retention** | ≥8% | Idle-Game Industrie-Norm ≈5–10% |
| **Avg. Session Length** | 8 Min | Neulinge 3–5 Min, Power-User 15–30 Min |
| **Daily Active Users (DAU)** | – | Streak-fokussiert = höhere DAU |
| **Pokedex Completion Rate** | ≥30% nach 2 Wo | Collector-Motivation |
| **Minigame Play Rate** | ≥70% haben ≥1 Minigame | Feature-Discovery |

### 6.2 Instrumentation (Tracking)

**Events zu loggen (in Analytics):**
- `tutorial_step_completed` (step_name, timestamp)
- `first_animal_bought` (species, cost_coins, session_num)
- `minigame_started` / `minigame_completed` (minigame_name, result)
- `collection_milestone` (milestone_num, time_to_unlock)
- `daily_streak` (streak_length, day)

**Dashboard (späte Phase):**
- Funnel: Signup → First Buy → First Minigame → Daily Returner
- Cohort Analysis: Wer kehrt nach 7/14/30 Tagen zurück?
- Churn Prediction: Spieler ohne Aktivität seit 3 Tagen

---

## 7. Implementierungs-Roadmap

### Phase 1: Onboarding (Diese Sprint)
- [ ] Tutorial-System in GameStore + TutorialBubble-Updates
- [ ] First-Buy Flow im Shop
- [ ] "Meilensteine" Panel in GameView
- [ ] InventoryView → Pokedex-Tab mit Progress
- [ ] Tests: Tutorial-State-Machine, Milestone-Tracking

### Phase 2: Retention Loops (Nächste Sprint)
- [ ] Daily Checklist (Minigame Bonus)
- [ ] Wordle Seasons + Season-Leaderboard
- [ ] Collection-Events Grundgerüst
- [ ] Analytics Events + Dashboard (CSV-Export erst)

### Phase 3: Social & Long-Term (Phase 2+)
- [ ] Guild/Clan-System (DB + RPCs)
- [ ] Shared Challenges
- [ ] World Events / Seasonal Decorations
- [ ] Push Notifications (Opt-in)
- [ ] Craft-Rezept-Rotation

---

## 8. Design-Prinzipien

1. **Progressive Disclosure:**
   - Neulinge sehen zuerst: Farm. Dann: Shop. Dann: Minigame.
   - Nicht: "Hier sind 20 Knöpfe!"

2. **Clear Progression:**
   - Jedes System zeigt: Aktuell → Next Level → Reward
   - Beispiel: "Lvl 5 Tap-Upgrade (4/7 erforderlich für Lvl 6)"

3. **Dailies ohne Grind:**
   - Login-Reward immer abholen möglich in <1 Min
   - Aber Streak-Bonus belohnt längere Sessions
   - Kein "Fomo-Push" — Spieler können verpassen und am nächsten Tag einsteigen

4. **Fairness:**
   - Idle-Earnings für Neulinge nicht überwältigend
   - Aber genug Zug, um die Progression spürbar zu machen
   - Keine Pay-to-Win für Minigames (Skill matters)

5. **Ton & Visuals:**
   - "Toy Look" durchgehend (Tokens, Farben, Animationen)
   - Deutsche Umlaute (ä ö ü ß) korrekt
   - Emojis zielgerichtet, nicht überladend

---

## 9. Monitoring & Iteration

**Weekly Check-ins:**
- D1/D7/D30 Retention
- Minigame Play Rate
- Average Session Length
- Tutorial Completion Rate (% wer Schritt 5 erreicht)

**Monthly Review:**
- Cohort Analysis: Altruismus der Spieler (Coins senden, handeln)
- Churn Reasons (aus Feedback)
- Feature-Gefallen (Umfrage/Rating)

**Adjustments:**
- Zu schwerer Early-Game? → Erste 1000 Coins Bonus
- Zu langweilig nach Woche 1? → Früher Minigames freischalten
- Zu viel Grind? → Passive Income erhöhen oder Upgrade-Kosten senken

---

## 10. Fazit

Zoo Empire wird durch **klare Progressions-Pfade**, **tägliche Anreize** und **langfristige Sammler-Ziele** attraktiv für beide Spieler-Gruppen:

- **Neulinge** verstehen sofort, was zu tun ist, und feiern schnell erste Erfolge.
- **Veteranen** haben Streaks, Leaderboard-Kämpfe, Sammel-Ziele und soziale Hooks.

Der Fokus liegt auf **Retention durch Verständnis** (gute Onboarding) + **tägliche Belohnung** (Streaks) + **kollektives Sammeln** (Pokedex, Craft, Tiers).

