# Zoo Empire — Spieler-Onboarding & Retention-Strategie

**Datum:** 2026-10-09  
**Status:** Strategie für nächste Entwicklungszyklen  
**Autor:** Claude Haiku  
**Ziel:** Zoo Empire cool und engagierend für Neulinge UND Veteranen halten

---

## Executive Summary

Zoo Empire hat eine solide Feature-Basis (6+ Minispiele, Zucht, Welt, Börse, Events). Um es über mehrere Wochen spielbar zu halten, braucht es:

1. **Kristallklares Onboarding** für Neulinge (30 Sekunden bis erste Belohnung)
2. **Daily/Weekly Loops** mit variablem Inhalt (nie dasselbe Spiel zweimal)
3. **Progression Clarity** (Was macht mich stärker? Wohin gehe ich als nächstes?)
4. **Seasonal Inhalte** (Halloween war guter Anfang)
5. **Social Hooks** (Freunde, Clans, Events mit globalem Fortschritt)

---

## Phase 1: New Player Funnel (Wochen 1–2)

### 1.1 Onboarding-Sequenz („First Time User Experience")

**Ort:** `OnboardingView.vue` (neue Route `/onboarding`, vor `/`)

**Flow:**
1. **Willkommensbildschirm** (Artwork, Spiel-Pitch)
   - „Sammle 100+ Tiere, verdiene Coins, spiele Minispiele"
   - CTA: „Start"
2. **Tier-Auswahl** (3 Starter-Spezies, Favorit wählen)
   - Nutzer bekommt Tier + 50 Startmünzen
   - Weiter →
3. **Erstes Tap-Tutorial**
   - 5 Taps durchführen → Münzen verdienen
   - „Gratuliert! Du hast Münzen verdient."
4. **Shop-Einführung** (minimal, nur Highlights)
   - 1–2 Tiere als Bestseller markieren
   - Kaufen-Button glow
5. **Ticket-Intro** (Minispiel-Eingang)
   - „Spieliere Minispiele für schnellere Coins"
   - Kein Force-Play, aber Link zu `/parkour` oder ähnlich
6. **Redirect zu `/`** (GameView)

**Bestätigung:**
- Setze `profiles.onboarding_completed = true` bei Abschluss
- Zeige bei Rückkehr in GameView nur die Bubble für nächste Quest

### 1.2 Tutorial-Bubbles ("Guided Tour" in GameView)

**Bestand:**  
`TutorialBubble.vue` existiert bereits (gut!). Erweiterung:

- **Bubble 1:** Tippen erklärt (Taps, Münzen, Timing)
- **Bubble 2:** Tier kaufen (Shop öffnen, Bestseller)
- **Bubble 3:** Upgrader (Tap-Multiplikator zeigen)
- **Bubble 4:** Minispiel starten (kurzes Teaser-Video oder GIF)
- **Bubble 5:** Freunde einladen (later, Week 2)

Jede Bubble:
- Zeige 1× beim ersten Erreichen des Meilensteins
- Schließbar (X-Button, nicht erzwungen)
- Speichert Zustand in `localStorage.tutorialIndex`

---

## Phase 2: Week-1 Loop (Tägliche & Wöchentliche Ziele)

### 2.1 Daily Quests

**Ort:** `GameView.vue` + neuer Tab `/daily-quests`

**Beispiele:**
- „5 Minispiel-Runden spielen" → +10 Tickets
- „3 verschiedene Tiere füttern" → +5 Coins × 3
- „1 Tier kaufen" → +100 Coins
- „Wordle spielen" → +2 Tickets
- „1 Freund besuchen" (später) → +3 Freundschafts-Punkte

**Implementierung:**
- Neue Tabelle: `daily_quests` (user_id, quest_id, completed_at)
- RPC: `complete_daily_quest(p_quest_id)` prüft Bedingung + belohnt
- UI: Scrollbare Karte mit 3–4 Quests, grüner Haken bei Abschluss
- Täglich zurücksetzen (00:00 UTC)

### 2.2 Weekly Challenges (Bonus-Track)

**Beispiele:**
- „Boss Fight 5× spielen" → Spezial-Tier (Limited Edition)
- „100 Parkour-Punkte sammeln" → +50 Tickets
- „Minispiel-Highscore setzen" → Name + Ruhm

**Nutzen:**
- Gibt Veteranen „Events" ohne neue Features zu brauchen
- Ermutigt Varietät (nicht jeden Tag dasselbe Spiel)

---

## Phase 3: Progression Clarity (Wochen 2–3)

### 3.1 „Pathfinding" für Spielziele

**Problem:** Neulinge sehen viele Tabs, wissen nicht, wo anfangen.

**Lösung: Progress-Baum in `/index`**

```
Stufe 1: Die Basics (Woche 1)
├─ Dein erstes Tier ✓
├─ 100 Coins sammeln ✓
└─ 1 Minispiel spielen ✓

Stufe 2: Sammlung (Woche 2–3)
├─ 5 verschiedene Tiere
├─ 1 Tier auf Stufe 5
└─ 1 Ei ausbrüten

Stufe 3: Minispiel-Meister (Woche 3–4)
├─ Alle 6 Minispiele ausprobieren
├─ 1 Score im Leaderboard
└─ Boss-Fight durchspielen

Stufe 4: Börsen-Zocker (Woche 4–5)
├─ Erstes Tier verkaufen
├─ 10k Coins verdienen
└─ Tier-Tier-Preise verglichen

Stufe 5: Sozial (Woche 5+)
├─ Freund einladen
├─ Welt besuchen
└─ Clan beitreten (später)
```

**UI:** Badges + Fortschrittsbalken, Pro-Tipps bei Hover

---

## Phase 4: Engagement-Layers (Wochen 3–8)

### 4.1 Seasonal Events (Horror → Weihnachten → Neujahr)

**2026-10:**  
Halloween (existiert) → Verkneife Easter Eggs im Code

**2026-12:**  
Weihnachts-Event
- Schnee-Deko überall
- Spezial-Tier: Rentier (nur im Event)
- 3 neue Minispiele oder Varianten?
- „12 Days of Christmas" Daily Quest-Serie

**2026-01:**  
Neujahr-Event
- Retrospektive: Spieler-Statistiken (Tiere, Münzen, Highscores)
- „Neue Jahres-Ziele" (spieler-definierbar, mit Rewards)
- Limited-Edition-Tier für Streaks

### 4.2 Limited Editions (Druck + Rückgabe)

**Typ 1: Event-Tiere**  
- Nur während Event erhältlich
- Nach Event: „Vault" (teuer, seltener), nicht züchtbar
- Beispiel: Halloween-Fledermaus (existiert), Weihnachts-Rentier (neu)

**Typ 2: Season Pass (später)**  
- Monatliche Tickets-Quelle
- 3 Free-Tracks + Premium-Upgrades
- z. B. „Oktober Pass: Halloween Cosmetics"

**Typ 3: Crafting-Exklusiva**  
- Rezepte, die nur aus Event-Items machbar sind
- z. B. „Candy Corn → Potion of Spooky Strength"

### 4.3 Global Events (Clans brauchen Vorbereitung, später)

**Konzept:**  
- Alle Spieler → Gemeinsamer Fortschritt-Bar
- z. B. „Communal Boss Health Pool"
- Belohnung beim Durchbruch: Alle kriegen Tier/Cosmetics

---

## Phase 5: Retention Mechanics (Wochen 4+)

### 5.1 Offline-Einkommen (existiert schon, Marketing!)

- Spieler, die 8h weg sind → Passiv-Einkommen rechnen
- UI: „Du hast {coins} verdient, während du weg warst" (Gamification)
- Motiviert: Daily Logins, Offline nicht bestrafen

### 5.2 Streak System

**Neue Tabelle:** `login_streaks`  
- Täglich Login +1 Bonus-Multiplikator (bis 30x)
- Versehentliches Verpassen? 1× pro Monat ein Joker

**Belohnung:**  
- Jeden 7. Tag: +100 Bonus-Tickets
- Jeden 30. Tag: Spezial-Tier (Streak-exklusiv)

### 5.3 Cosmetics (Non-Pay, Dopamin)

- Neue Themen für Minispiele (z. B. Dark Mode für Parkour)
- Tier-Skins (Farbvarianten)
- Sammlung von Emotes/Sticker
- Keine Pay-Wall, nur für Streaks + Events

---

## Phase 6: Social Loops (Wochen 6+)

### 6.1 Guilds / Clans (später, braucht Backend-Vorbereitung)

- Kleine Gruppen (5–50 Spieler)
- Gemeinsamer Fortschritt-Baum
- Chat + Raids (Clan-Boss-Fight)
- Rewards nur erreichbar als Gruppe

### 6.2 Friend Features (Teaser)

- **Existiert:** Friend-Tab, Präsenz in Welt
- **Erweiterung:** Friend-Challenges
  - „Beat dein Freund beim Parkour" → Coins für Gewinner + Verlierer
  - Asymmetrisch: Auch wenn Freund offline

### 6.3 Leaderboards (Erweitern)

- **Existiert:** Global Leaderboard
- **Neu:** 
  - Friends-only Leaderboard
  - Clan-Leaderboard (später)
  - Weekly resets (um Newcomer nicht zu entmutigen)

---

## Implementation Roadmap

| Phase | Wochen | Features | Aufwand |
|-------|--------|----------|---------|
| **1** | 1–2 | Onboarding, Tutorial Bubbles | Low |
| **2** | 1–3 | Daily Quests, Weekly Challenges | Low–Medium |
| **3** | 2–3 | Progress Tree, Path-Finding | Low |
| **4** | 3–8 | Seasonal Events, Limited Editions | High |
| **5** | 4+ | Streaks, Cosmetics | Medium |
| **6** | 6+ | Clans, Friend Challenges | Very High |

---

## Success Metrics

**Neue Spieler (Retention):**
- 7-Day Retention: Ziel 40%+ (branchentyplich 30–35%)
- Onboarding-Completion: Ziel 80%+
- First Minigame Played: Ziel 90% in Tag 1

**Veteranen (Engagement):**
- Daily Active Users: Ziel +15%
- Session Length: Durchschnitt 15–20 Min (vs. aktuell ~10)
- Features Used: 5+ Features pro Session

**Wirtschaft:**
- Tier-Verkäufe via Börse stabil bleiben
- Event-Cosmetics (später) 30%+ Konversion

---

## Nicht in Roadmap (Out of Scope)

- ❌ Pay-to-Win Mechanics (gegen Spielphilosphie)
- ❌ Ads (nervig)
- ❌ PvP-Kämpfe (Komplexität zu hoch)
- ❌ Crafting-Complexity (schon komplex genug)

---

## Nächste Schritte

1. **Onboarding-Design** reviewen + `OnboardingView.vue` starten
2. **Daily Quests** Backend (Tabelle, RPC) bauen
3. **Progress Tree** Designs skizzieren
4. **Weihnachts-Event** planen (Deadline: 2026-11-15)

---

**Gültig ab:** 2026-10-09  
**Nächste Review:** 2026-10-23
