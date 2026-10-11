# Engagement & Retention Roadmap

**Ziel:** Zoo Empire als attraktives Idle-Game sowohl für Anfänger als auch bestehende Spieler positionieren.

**Datum:** 2026-09-24

---

## 1. Anfänger-Onboarding (New Player Funnel)

### 1.1 Interaktives Tutorial
- **Problem:** Neue Spieler verstehen Idle-Game-Mechaniken nicht sofort.
- **Lösung:** 
  - Tutorial-Route `/tutorial` mit schrittweisem Aufbau
  - "Erzählte" Quests: erste Tiere sammeln, Coins verdienen, erstes Minispiel spielen
  - Progressive Freischaltung: Jede Route erst nach Abschluss der Vorherigen erreichbar
  - Unter 5 Minuten für Completion
  
### 1.2 Progressive Feature-Freischaltung
- **Minispiele:** Nicht alle auf einmal anzeigen
  - Drift beim Erreichen von 500 Coins freischalten
  - Parkour bei 5. Tier
  - Wordle bei 2000 Tickets
  - Memory bei 10 verschiedenen Tierrassen
- **Shop/Craft:** Erst nach 1. Minispiel spielen
- **Zoo-Welt:** Erst nach 3 Tieren

### 1.3 Schnelle Early Wins
- **First Touch Rewards:** 
  - Gratis-Tier beim Start (z.B. Zebra)
  - 50 Coins sofort (ohne spielen)
  - 1. Minispiel gibt 200 Coins (2x normal)
- **Achievement-Toast:** Visuelle Bestätigung jedes Schrittes
- **Level-Up-Feeling:** Nach jedem Mini-Abschnitt Belohnung

---

## 2. Retention für Bestehende Spieler

### 2.1 Daily/Weekly Progression Loops
- **Daily Quest-Board:**
  - 3 tägl. Quests (Drift spielen, X Tickets verdienen, Y Tiere füttern)
  - Rewards: Coins, Tickets, kleine Skins
  - Abschluss aller 3: Bonus-Reward (150 Coins)
  
- **Weekly Challenges:**
  - Komplexere Ziele (z.B. "5 verschiedene Minispiele spielen")
  - Wöchentliche exklusive Tier-Skins
  - Reward-Track (3/7/10 Challenges = bessere Rewards)

### 2.2 Social Engagement
- **Guild/Clan-System** (langfristig):
  - Spieler können Teams gründen
  - Guild-Quests: Gemeinsam Coins/Tickets verdienen
  - Guild-Rangliste pro Woche
  
- **Freundschafts-Bonusses:**
  - +10% Coin-Gewinn, wenn Freund aktiv ist
  - "Visit Freund Zoo" gibt Bonus-Coins (einmal tägl. pro Freund)

### 2.3 Saisonale Events
- **Saisonale Tier-Skins:**
  - Monatlich neuer Skin (z.B. "Halloween-Löwe")
  - Nur während Saison craftbar, danach in Vault mit 2x Ressourcen
  
- **Limited-Time Minigames:**
  - Spezial-Parkour ("Winter-Slope") 1x pro Woche
  - Event-spezifische Rewards (z.B. Event-Tickets)

### 2.4 Long-Term Goals
- **Tier-Collection-Milestones:**
  - 50 Tiere gesammelt → exklusives Tier "Phönix"
  - 100 Tiere → "Titan"-Skin für alle Tiere
  
- **Leaderboard-Anreize:**
  - Top 10 global erhalten wöchentl. Bonus
  - Ranking ist visibel auf Zoo-Profil

---

## 3. Monetarisierung & Engagement (Optional)

### 3.1 Battle Pass (Free + Premium)
- **Free Path:** 5 wöchentliche Rewards (Coins, Skins)
- **Premium Pass:** +10 Zusatz-Rewards pro Woche
- **Preis:** ~2-3€/Monat (optional)
- **Trigger:** Nach 1 Woche Spielzeit

### 3.2 Cosmetics-Shop
- **Tier-Skins:** 100-500 Premium-Coins
- **UI-Themes:** 50 Premium-Coins
- **Emote-Sets:** 75 Premium-Coins
- **Cross-Save-Cosmetics:** Auf Web + Mobile nutzbar

---

## 4. Technische Umsetzung (Priorität)

### Phase 1 (Woche 1-2) — Anfänger Focus
- [ ] `/tutorial` Route + Tutorial-Progress im Store (Pinia)
- [ ] Progressive Feature-Unlock-Logik (basierend auf Coins/Tickets/Tiere)
- [ ] First-Touch Reward (50 Coins on Signup)
- [ ] Toast-Celeberation auf wichtige Meilensteine
- [ ] **Design-Spec:** `2026-09-24-onboarding-tutorial-design.md`

### Phase 2 (Woche 3-4) — Daily Loops
- [ ] Daily Quest RPC (`daily_quest_claim` in Supabase)
- [ ] Quest-UI auf GameView
- [ ] Weekly Challenge Tracking
- [ ] **Design-Spec:** `2026-09-24-daily-quests-design.md`

### Phase 3 (Woche 5-6) — Saisonale Events
- [ ] Event-Manager im Backend (Tabelle `active_events`)
- [ ] Event-spezifische Minigame-Varianten
- [ ] Limited-Time Tier-Skins
- [ ] **Design-Spec:** `2026-09-24-seasonal-events-design.md`

### Phase 4+ — Social & Long-Term
- [ ] Guild/Clan System
- [ ] Friend Bonuses
- [ ] Leaderboard-Cosmetics
- [ ] Battle Pass System

---

## 5. Messaging & Launch

### 5.1 App-Store Description (Update)
```
Zoo Empire — Das Tier-Sammler Idle-Game!

🦁 Sammle über 100 verschiedene Tiere
🎮 4 Minispiele: Drift, Parkour, Wordle, Memory
🌍 Begehbare 3D-Zoo-Welt im Multiplayer
🏆 Tägliche Quests & Wöchentliche Challenges
⭐ Spiele mit Freunden, verdiene Coins & Tickets

Kostenlos + kein Pay-to-Win. Entwicklung aktiv!
```

### 5.2 First-Week Retention Email
- Tag 1: Willkommens-Mail + Bonus-Code (25 Coins)
- Tag 3: "Du hast x% der Tiere gesammelt!" + Motivations-Bonus
- Tag 7: "Beende deine erste Daily Quest" + Preview neuer Features

---

## 6. Erfolgs-Metriken

| Metrik | Ziel | Timeline |
|--------|------|----------|
| DAU (Daily Active Users) | +30% | Nach Phase 1 |
| Retention Day 7 | +20% | Nach Phase 2 |
| Avg. Session Length | 8→12 min | Nach Phase 3 |
| Tour Completion | >70% | Nach Phase 1 |
| Daily Quest Completion | >40% | Nach Phase 2 |
| Saisonales Event Engagement | >60% | Nach Phase 3 |

---

## 7. Nächste Schritte

1. **Design-Spec für Phase 1 schreiben** (`2026-09-24-onboarding-tutorial-design.md`)
   - Tutorial-Flow (Wireframes)
   - Feature-Unlock-Bedingungen (Tabelle)
   - First-Touch Rewards

2. **Tutorial-Route implementieren**
   - Vue Component `TutorialView.vue`
   - Store: `tutorial.js` (Schritt-Tracking)
   - RPC: `complete_tutorial()` im Backend

3. **Progressive Unlock-Logik**
   - Feature-Flags in `game.js`
   - Condition-Checking vor Render

4. **Testing:**
   - Fresh-Account-Test (Neuer Browser, Clean Storage)
   - Onboarding-Flow durchspielen (Timing unter 5 Min)
   - Mobile-Testing (iOS Safari + Android Chrome)

---

**Owner:** @daniil  
**Status:** Planning  
**Feedback Willkommen!**
