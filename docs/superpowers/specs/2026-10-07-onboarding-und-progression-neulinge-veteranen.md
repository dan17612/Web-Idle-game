# Onboarding & Progression: Cool für Neulinge + Langziel-Engagement für Veteranen

Datum: 2026-10-07

## Ziel

Zoo Empire soll **Neulinge sofort mitreißen** (erste 30 min klare Erfolge, Aha-Momente) und **Veteranen langfristig motivieren** (Progressionsziele, Events, soziale Systeme). Dieser Plan fasst Lücken zusammen und schlägt priorisierte Schritte vor.

---

## Teil 1: Die Situation

### Für Neulinge ist gut:
- **Tutorial vorhanden** (5 Schritte, Bubbles), aber:
  - Nur bis zur GameView (Farming)
  - Kein Intro für Mini-Spiele, Marktplatz, Zoo-Welt
  - Kein „Was jetzt?" nach Tutorial-Ende
- **Einfache erste Progression:** Münzen → Tier kaufen → tippen → Münzen
- **Visuelle Motivatoren:** 10 Tier-Arten (schwach → Drache), Münzen-Counter

### Für Neulinge ist schwach:
1. **Leere Lernkurve ab Minute 2:** Nach Tutorial endet die Führung → verlorene Spieler
2. **Mini-Spiele sind versteckt:** Button im Quick-Access-Raster, aber kein Einstiegs-Story
3. **Keine klare Ziele:** „Kaufe alle Tiere?" „Finde seltene Eier?" → unklar
4. **Marktplatz ist komplex:** Tier-Bewertung (`_market_model`), Angebots-Flow unerklärt
5. **Keine sozialen Anreize:** Nur Name → Coins senden, aber warum?

### Für Veteranen ist gut:
- **Ereignis-System:** Events mit täglichen Challenges (`EVENT_KEYS`)
- **Bestenlisten:** Top-50-Spieler sichtbar, Coins-Vergleich
- **Marktplatz:** Trading, Tier-Flipping (für min-maxxer)
- **Breeding:** Tier-Zucht, höhere Seltenheit ≈ mehr Geld
- **Zoo-Welt:** 3D-Sandbox, Farben-Equip, Multiplayer-Präsenz

### Für Veteranen ist schwach:
1. **Keine Langzeit-Ziele:** Keine Achievements, Season-Pass, Mastery-Trees
2. **Wiederholung ermüdet:** Täglich tippen, Mini-Spiele spielen → kein Progression
3. **Kein Prestige/New-Game+:** Kein Return nach Sammlung-Vollendung
4. **Community ist dünn:** Support-Chat ist eher Support als Spieler-Austausch
5. **Events sind oberflächlich:** Challenge-Tickets sammeln, aber kein zusammenhängendes Erzählungs-Ark

---

## Teil 2: Nächste Schritte — Priorisiert

### Phase 1: Neulinge-Rettung (1–2 Wochen)

**Ziel:** Spieler überschreiten die 1-Stunden-Marke mit 3+ Aha-Momenten.

#### 1.1 Guided First Hour (`/onboarding`)
- **Route:** Neue `/onboarding` (nur für neue Spieler), nach Tutorial-Ende sichtbar
  - Schritt 1: „Tippe & verdiene" (GameView-Teaser, +10 Taps Bonus)
  - Schritt 2: „Erste Minigame!" (Wordle oder Parkour, +500 Coins Bonus, kein RNG)
  - Schritt 3: „Tue es deinem Freund kund" (Sende 100 Coins, Username+Link-Teiler)
  - Schritt 4: „Marktplatz erklärt" (Kaufe 1 billiges Tier im Markt — führe `_market_buy` aus)
  - Schritt 5: „Zoo-Welt Schnupperversion" (Betritt `/world`, Emoji-Emote senden, +🎫 Ticket)
- Nach Abschluss: Unlock alle Tabs, Champagne-Toast, +1 free egg slot
- Speichert `profiles.onboarding_completed_at` (verhindert Replay)

#### 1.2 Besseres Mini-Game-Intro
- **In GameView:** Blinking Gold-Star auf einen Mini-Game-Button (z.B. Wordle oder Parkour)
- **1. Besuch:** Modal „Erste Herausforderung! 🎯 Verdiene +50% Bonus bei deinem 1. Versuch"
- **Belohnung:** +250 Coins statt normal 100 (visuell deutlich, Upgrade-Stoff sichtbar)
- Code: neuer RPC `minigame_first_play_bonus(p_game)` oder local flag `first_minigame_bonus[game]`

#### 1.3 Tutorial-Text verbessern
- **GameView-Tutorial:** Statt „Tippe für Münzen" → „*Tippe auf dein Lieblingstier für Extramünzen!*"
- **Shop-Tutorial:** Statt „Kaufe Tiere" → „Kaufe stärkere Tiere → mehr passive Münzen / Sekunde"
- **Farmen-Tip:** Kurz erklärt in Shop-Bubble: „Tiere verdienen dich Münzen, auch wenn du offline bist (bis 8h)"
- Sprache: motivierend, nicht erklärend

#### 1.4 Quest-Log UI
- **In Bottom-Nav oder als separat:** Neue Komponente `QuestLog.vue`
  - Aktive Quests: Tutorial, First-Hour-Challenges, aktuelle Event-Challenges
  - Abgeschlossene Quests: sichtbar, aber grau (Erfolgsgefühl bestätigen)
  - Progression-Balken: z.B. „3/10 Minigames gespielt" (motiviert zum Weiterspielen)
- **Quests-Tabelle:** `player_quests(player_id, quest_id, progress, completed_at)` oder als `game.quests` local

---

### Phase 2: Veteranen-Engagement (2–3 Wochen)

**Ziel:** Ausreichend Wiederspiel-Gründe für 30+ Tage aktiv Spielen.

#### 2.1 Achievement-System
- **Tabelle:** `achievements(id, slug, title_de, title_en, icon, description, hidden)`
  - Kategorien: Sammeln, Trading, Mini-Spiele, Zoo-Welt, Züchten, Sozial
- **Player-Achievements:** `player_achievements(player_id, achievement_id, unlocked_at, progress)`
- **Beispiele:**
  - 🐓 Tier-Sammler: Alle 10 Arten besitzen (hidden bis 8/10)
  - 💰 Millionär: 1M Coins verdient (Fortschritt sichtbar: 450k / 1M)
  - 🏆 Marktplatz-König: 10 profitable Angebote abgeschlossen (+5% Gewinn)
  - 🎯 Parkour-Meister: 100 Parkour-Level bestanden
  - 🌍 Zoo-Forscher: Alle 12 Farmbauplätze mit Tieren ausgestattet
  - 👯 Sozialschmetterling: 5 Spieler + Coins → Freundes-Liste gestartet
- **Rewards:** +100 Coins + 🎫 Ticket (beim Unlock sichtbar)
- **UI:** Achievements-Tab (Raster, Filter nach Kategorie), Unlock-Toast

#### 2.2 Season-Pass (3-Monate-Zyklen)
- **Konzept:** z.B. „Saison 1: Herbst-Abenteuer" (Okt–Dez 2026)
- **Tracks:**
  - **Free Track:** Für alle
    - Stufe 1-20: +50 Coins/Stufe, je 3 Challenges/Woche (tippe 1000×, spiele 5 Minigames, usw.)
    - Reward: Kosmetik-Tier-Skins (orange Huhn, gold Drache), +🎫 Tickets
  - **Premium Track:** Optional (+$2 / Season, in-app-Kauf via Supabase → `stripe_product_id`)
    - Stufe 1-50: +100 Coins/Stufe + 50% XP-Boost während der Season
    - Rewards: Exclusive Egg-Slots, Avatar-Frames, Emotes
- **Datenbank:**
  - `seasons(id, slug, name, start_date, end_date)`
  - `season_challenges(id, season_id, challenge_key, title, description, reward_coins, repeat_weekly)`
  - `player_season_progress(player_id, season_id, level, premium_purchased_at)`
- **UI:** Tab im Support-Reiter (oder eigene Route `/season`), Progress-Balken, Shop-Overlay für Premium

#### 2.3 Leaderboards erweitern
- **Aktuell:** Top 50 Coins
- **Neu:**
  - 📈 Wöchentliche Münzen-Gewinner (Reset jeden Sonntag)
  - 🏆 Marktplatz-Gewinn (bestes Tier-Flipping-Verhältnis)
  - 🎮 Mini-Game-Rekorde pro Spiel (höchster Wordle-Streak, Parkour-Level, etc.)
  - 🌍 Zoo-Welt: Längste Log-In-Serie
- **RPC:** `leaderboard_get(p_board: 'coins_all_time' | 'coins_weekly' | 'parkour_level')` → Top 50 + eigene Rang

#### 2.4 Friendship & Clans (Roadmap-Item, aber skizzieren)
- **Friend-System (MVP):**
  - Button „+ Freund" im Profil → Search nach Username
  - `player_friendships(player_id_1, player_id_2, created_at, blocked)`
  - Freunde-Tab: Liste mit Coins-Differenz, letzter Login
  - Kosmetik: 👥 Badge für Spieler mit 5+ Freunden
- **Clans (Phase 2b, vielleicht Dezember):**
  - Kleine Teams (5–20 Spieler), gemeinsame Vault (Coins-Pool), Clan-Challenges (CoC-ähnlich)
  - Später: Clan-Arena, Raids (groß-gedacht, nicht für Oct/Nov)

#### 2.5 Event-Erzählung (Story-Arc)
- **Statt:** Zufällige Event-Challenges
- **Besser:** Gekonntes Narrative, z.B. „Herbst-Großmarkt" (Okt–Nov)
  - Woche 1: Neue Tiere ankommen (Safari-Zebra, Flamingo; `shop_visible=true`)
  - Woche 2: Marktplatz-Boom (alle Tiere -20% Verkaufspreis, Ankauf +30%)
  - Woche 3: Tier-Rennen (Parkour-Challenge: Top 100 gewinnen exklusiven Skin)
  - Finale: Großes Event-Finale-Minigame (alle zusammen spielen, Coins-Pool-Reward)
- **UI:** Story-Banner oben in GameView, Chapter-Fortschritt sichtbar

---

### Phase 3: Qualitäts-Finish (1 Woche)

#### 3.1 Onboarding-Metriken
- Analytics einbauen: `event_log(player_id, event_type, event_data)`
  - `onboarding_started`, `onboarding_completed`, `tutorial_step_*`, `first_minigame_played`, `first_trade`, usw.
- Dashboard: Retention (wie viele Spieler spielen Tag 2, Woche 2, Monat 1?)

#### 3.2 Langzeit-Test
- **Neue Accounts testen:**
  - 10 Test-Accounts erstellen (`test_0_*@test.local`)
  - Durchspielen: Onboarding → Achievements → Mini-Games → Marktplatz
  - Dokumentieren: Wo stockt es? Wo verwarnt man sich?
- **Bestehende Veteranen-Accounts testen:**
  - Spielen Season-Pass, Achievements
  - Können sichtbar abfahren? Oder wollen mehr?

---

## Teil 3: Technische Meilensteine

### MVP-Route (Für alle paar Tage):

1. **Onboarding Flow** (3 Tage)
   - Route `/onboarding`, Component `OnboardingView.vue`
   - State: `profiles.onboarding_completed_at`
   - Nutzt bestehende Mini-Game & Marktplatz-Logik
   - PR: `feat/onboarding-flow`

2. **Achievement-System** (4 Tage)
   - Schema: `achievements`, `player_achievements`
   - RPC: `unlock_achievement(p_achievement_id)`
   - Component: `AchievementToast.vue`, `AchievementsView.vue`
   - PR: `feat/achievements`

3. **Season-Pass (erste Iteration)** (5 Tage)
   - Schema: `seasons`, `season_challenges`, `player_season_progress`
   - RPC: `claim_season_reward(p_season_id, p_level)`
   - Component: `SeasonPassView.vue` + embed in Support-Tab
   - PR: `feat/season-pass-mvp`

4. **Leaderboard-Erweiterung** (2 Tage)
   - RPC: `leaderboard_get(p_board_type)`
   - UI: Modal in LeaderboardView mit Tabs
   - PR: `feat/leaderboards-expanded`

5. **Test & Docs** (2 Tage)
   - Szenarien schreiben (test_new_account_onboarding.md)
   - Spieltests durchlaufen
   - Bugs fixen

**Gesamtdauer (parallel): ~2 Wochen**

---

## Teil 4: Messbare Erfolgs-Kriterien

| Für | Metrik | Ziel nach 2 Wochen |
|-----|--------|-------------------|
| **Neulinge** | Day-1-Retention (Rückkehr nach 24h) | ≥ 50% (aktuell?) |
| | Day-7-Retention | ≥ 30% |
| | Avg. Session-Länge (1. Stunde) | ≥ 12 Min |
| | Onboarding-Completion-Rate | ≥ 75% der Neulinge |
| **Veteranen** | Monthly-Active-Users (≥ 3× pro Woche spielen) | +20% vs. vorher |
| | Achievement-Unlock-Durchschnitt | ≥ 5 pro Spieler/Monat |
| | Season-Pass-Completion | ≥ 60% (Free), ≥ 80% (Premium) |
| | Leaderboard-Views pro Woche | +30% |

---

## Teil 5: Roadmap Post-Launch

### November 2026 (Clans MVP, Event-Erzählung)
- Freundes-System finalisieren
- Clan-Gründung, Vault, Clan-Challenges
- Event-Woche-Story-Arcs (3+ geplant)

### Dezember 2026 (Prestige-System)
- New-Game+-Modus: Kann Sammlung resetten → Multiplier für nächsten Run
- Prestige-Levels (Cosmetic, +Coins-Multiplikator)
- Winter-Event (Schnee-Themes, Holiday-Tiere)

### 2027 Q1 (PvP, Raids)
- Tier-Arena: 1v1 Kämpfe, Wetten (Coins)
- Clan-Raids: Gemeinsam gegen Bosse (Story-Encounters)
- Tournament-Season (monatlich)

---

## Zusammenfassung: Die Warum's

1. **Neulinge brauchen Führung:** Ohne klare erste Stunde springen 60% ab (Standard in Games). Onboarding-Flow + Quest-Log reduziert das.

2. **Veteranen brauchen asymptotische Ziele:** Achievements & Season sind unendlich (immer etwas Neues zum Unlock), aber sichtbar abänderbar (Balancing möglich).

3. **Story verbindet:** „Herbst-Großmarkt" ist cooler als „Challenge: Tippe 1000×". Events mit Narrative halten lebendig.

4. **Community ist Sticktion:** Freunde, Clans, Leaderboards → der Spieler spielt für andere + sich selbst.

---

**Nächster Schritt:** Ticket für Onboarding-Flow öffnen, Design-Spezifikation für `OnboardingView.vue` + Flows schreiben. Go! 🚀
