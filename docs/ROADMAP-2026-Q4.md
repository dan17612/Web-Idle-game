# Zoo Empire — Roadmap 2026 Q4+
**Stand: 2026-10-17**

## Vision

Zoo Empire soll gleichermaßen für **Neulinge** (einfacher Einstieg, schnelle Erfolge, klare Progression) und **Veteranen** (Endgame, Challenges, regelmäßige Events) attraktiv sein.

---

## 1. Onboarding & Early Game (Neuling-Fokus)

### 1.1 Tutorial-System
- **Ziel:** Erste 10–15 Min geleitet, dann frei spielbar
- **Was:** Interaktive Führung durch erste Tiere, erste Münzen, erstes Minispiel
- **Sichtweise:** `src/composables/useTutorial.js` (Markers statt Modal-Spam)
- **Tracking:** `profiles.tutorial_step`, einmalige Hinweise (`player_notices`)
- **Spec-Datei:** `docs/superpowers/specs/2026-10-17-tutorial-system-design.md`

### 1.2 Early-Game Rewards Boost
- **Ziel:** Schneller Erfolgsmomente in den ersten Tagen
- **Was:** 
  - Erste 5 Tiere: 2× Coins für alle Aktivitäten (Minispiele, Truhen, Kauf)
  - Erste Woche: Tägliche Log-in-Boni (Münzen, Tickets)
  - Level 1–5: Ermäßigte Shop-Preise (30 % Rabatt)
- **DB:** `profiles.onboarded_at`, RPCs prüfen `now() < onboarded_at + '7 days'`
- **Spec-Datei:** `docs/superpowers/specs/2026-10-18-early-game-boost-design.md`

### 1.3 First-Time Tiers Erklärung
- **Ziel:** Klarmachen, warum Raritäten unterschiedlich wertvoll sind
- **Was:** Modal beim ersten Öffnen von Inventory (Raritäts-Erklärung, Marktpreis-Beispiele)
- **Sichtweise:** `InventoryView.vue` (einmalig via `notice_ack('first_tiers_info')`)

---

## 2. Tägliche & Wöchentliche Inhalte (Alle)

### 2.1 Daily Challenge System
- **Ziel:** Tägliche Belohnungen, Bindung (FOMO reduzieren, aber nicht-invasiv)
- **Was:**
  - 3–5 tägliche Quests (z. B. „Wordle spielen", „Zoo-Brunnen tappen", „5 Truhen öffnen")
  - Leicht erreichbar, 5–10 Min
  - Belohnung: 50–200 Coins, 1–2 Tickets
  - Streak-Bonus: Wenn 7 Tage hintereinander, Extra-Reward
- **DB-Tabellen:** `daily_quests`, `player_daily_progress`, `daily_streaks`
- **RPC:** `get_daily_quests()`, `complete_daily_quest(p_quest_id)`, `claim_daily_reward()`
- **View:** `DailyQuestsView.vue` (Tab oder Modal in GameView)
- **Spec-Datei:** `docs/superpowers/specs/2026-10-19-daily-quests-design.md`

### 2.2 Weekly Leaderboard Reset
- **Ziel:** Frische Chancen jede Woche, weniger Druck für späte Starters
- **Was:**
  - Wöchentliche Leaderboards (Score, Most Eggs, Most Coins) parallel zu All-Time
  - Reset Mo 00:00 UTC
  - Top-10 kriegen Bonus-Tickets (3/2/1 für Ränge 1–3)
- **DB:** `weekly_leaderboard_snapshots`, `weekly_leaderboard_rewards`
- **RPC:** `get_weekly_leaderboard()` (kann gecacht werden)
- **View:** Neuer Tab „Diese Woche" in `LeaderboardView.vue`
- **Spec-Datei:** `docs/superpowers/specs/2026-10-19-weekly-leaderboard-design.md`

---

## 3. Progression & Achievements (Alle)

### 3.1 Level-System & Badges
- **Ziel:** Sichtbare Fortschritte, die auch anderen zeigen (Profil, Welt)
- **Was:**
  - `profiles.player_level` (1–50): gebasiert auf `total_coins_earned`, exponentiell
  - Jedes Level: Badge (Icon), Slot im Profil
  - Alle 5 Level: Mini-Reward (Coins, Tickets)
- **Formel:** `10000 + (level - 1) * 5000` kumulativ
- **RPC:** `update_level()` (auto auf Coins-Transaktion) → Notifications möglich
- **Anzeige:** Avatar-Ecke, Profil-Header, Welt-Nametag
- **Spec-Datei:** `docs/superpowers/specs/2026-10-19-player-level-badges-design.md`

### 3.2 Achievements & Milestones
- **Ziel:** "Hidden wins", die Spieler entdecken (z. B. 1000 Wordles gespielt, 100 Raritäten gezüchtet)
- **Was:**
  - 20–30 Achievements (statisch oder dynamisch)
  - Kategorien: Collection (Tiere), Games (Minispiele), Social (Freunde), Breeder
  - Zähler sichtbar (z. B. „42/100 Raritäten")
  - Reward: Coins, Icons (für Profil)
- **DB:** `achievements`, `player_achievements`, `achievement_categories`
- **RPC:** `get_achievements()` (mit Progress-Daten)
- **View:** Neue Route `/achievements` oder Tab in `ProfileView.vue`
- **Spec-Datei:** `docs/superpowers/specs/2026-10-20-achievements-system-design.md`

---

## 4. Seasonal Content & Events (Alle, besonders Veteranen)

### 4.1 Seasonal Pass (Battle Pass ähnlich)
- **Ziel:** Klare Progression über 4 Wochen, Abwechslung zwischen Spielern
- **Was:**
  - Alle 4 Wochen ein neues Thema (z. B. „Dschungel-Safari", „Arktis-Expedition")
  - 20–30 Levels, fremd/premium (~€2)
  - Kostenlos: Coins, Tickets; Premium: exklusive Tiere/Kosmetik
  - Minispiel-Rotation: jede Woche anderes Feature (z. B. Woche 1 = Parkour 2× Belohnung)
- **DB:** `seasonal_passes`, `seasonal_challenges`, `player_pass_progress`
- **RPC:** `get_seasonal_pass()`, `claim_pass_reward(p_level)`
- **View:** Neuer Tab oder Modal in GameView
- **Spec-Datei:** `docs/superpowers/specs/2026-10-20-seasonal-pass-design.md`

### 4.2 Event-Rotation (Quarterly)
- **Ziel:** Regelmäßigkeit, Wiederholung ist OK (z. B. Halloween 2027 sieht ähnlich aus)
- **Was:**
  - Q4 2026: Halloween (jetzt), → Weihnacht (12.12.–01.01.)
  - Q1 2027: Valentinstag, Frühjahr (Eier-Event)
  - Q2 2027: Sommer-Zoo-Fest
  - Jedes Event: Spezial-Tier (limitiert), Deko, Mini-Challenges, Reward-Track
- **Implementierung:** `src/events.js` (Zeitfenster, Aktiv-Status), Feature-Flags für Dev
- **Spec-Datei:** Event pro Quartalsplan, z. B. `docs/superpowers/specs/2026-10-20-christmas-event-2026-design.md`

---

## 5. Neue Minigames & Variationen (Veteranen-Fokus)

### 5.1 Parkour 2 — Schwierigkeit & Tracks
- **Ziel:** Mehr Herausforderung für Profis, kein Langweilenpotential
- **Was:**
  - 3 Schwierigkeitsstufen: Normal, Hard, Extreme
  - Hard: 1.5× schneller, mehr Hindernisse, 1.25× Belohnung
  - Extreme: 2× schneller, 2× Belohnung, aber schwer
  - Track-Auswahl statt immer zufällig
- **Impl.:** `parkourEngine.js` um `difficulty` erweitern, Rewards-Berechnung anpassen
- **Spec-Datei:** `docs/superpowers/specs/2026-10-20-parkour-difficulty-tracks-design.md`

### 5.2 Neues Minigame: „Auction House"
- **Ziel:** Asynchrones Strategie-Spiel, anders als Börse
- **Konzept:** Zufällige Tiere in 1-h-Auktionen; Spieler bieten Coins, höchstes Angebot gewinnt
- **Belohnung:** Seltene Tiere billiger als Shop (aber mit Glück)
- **RPC:** `auction_list()`, `auction_bid()`, `auction_claim()`
- **View:** `AuctionView.vue`, einfaches Kartendesign
- **Spec-Datei:** `docs/superpowers/specs/2026-10-21-auction-house-design.md`

### 5.3 Minigame Mix — Wöchentliche Rotation
- **Ziel:** Abwechslung, kein Spiel fühlt sich veraltet an
- **Was:**
  - Jede Woche: 1 Minispiel bekommt 2× Belohnung (Spotlight)
  - Jede Woche: 1 neues „Twist" (z. B. Parkour mit Rückwärts, Wordle mit 4 Buchstaben)
- **Impl.:** `src/gameSpotlight.js` (Spielname + Multiplikator pro Woche)
- **Announce:** Toast bei App-Start „Diese Woche: Parkour 2×!"

---

## 6. Soziale Features & Zusammenarbeit (Alle)

### 6.1 Gilden (Einfache Version)
- **Ziel:** Spieler-Gruppen, gemeinsame Quests
- **Was:**
  - Max. 20 Spieler pro Gilde
  - Gildenboss-Kämpfe: Wöchentlich, Spieler attackieren zusammen
  - Gildenschatzkammer: Gemeinsame Ressourcen sparen
  - Gilden-Chat (einfach, optional)
  - Reward: Gildenmünzen, exklusive Tiere
- **DB:** `guilds`, `guild_members`, `guild_bosses`, `guild_bank`
- **RPC:** `guild_create()`, `guild_join()`, `guild_leave()`, `guild_attack_boss()`
- **View:** `GuildView.vue`
- **Spec-Datei:** `docs/superpowers/specs/2026-10-21-guilds-simple-design.md`

### 6.2 Friend Gifts & Cooperative Breeding
- **Ziel:** Spieler helfen sich gegenseitig
- **Was:**
  - Freunden täglich 1 Geschenk senden (Coins, Tickets)
  - Cooperative Breeding: 2 Spieler verpaar­en zusammen, Bonus-Chancen
  - Mutual Referral: Neue Spieler mit Code eines Freundes = beide kriegen Bonus
- **RPC:** `send_friend_gift()`, `breed_cooperative()`, `use_referral_code()`
- **Spec-Datei:** `docs/superpowers/specs/2026-10-21-friend-gifts-cooperation-design.md`

---

## 7. UX Improvements (Alle)

### 7.1 Inventory Reorganization
- **Was:**
  - Tabs statt Scroll: Alle, Raritäten, Lieblinge, Ausgerüstet
  - Sortierung: Nach Level, Nach Rarität, Nach erhaltenen Coins
  - Filter: Art (Säuger, Reptil, etc.)
  - Bulk-Actions: 5 Tiere auf einmal verkaufen
- **Impl.:** `InventoryView.vue` UI-Überhaul

### 7.2 Dashboard / Home
- **Was:**
  - Welt-Ankündigung (aktueller Event, Weekly-Quest-Status)
  - Quick-Stats: Level, XP bis nächst Stufe, Coins/Min Rate
  - Heute-Checkliste (tägliche Quests)
- **Impl.:** `GameView.vue` oberer Bereich erweitern

### 7.3 Popup-Optimierung
- **Was:**
  - Modals konsolidieren (maximal 1 Info per Action)
  - Busy-States klarer anzeigen
  - Keyboard-Navigation (ESC schließt)

---

## 8. Analytics & Monetization Hints (Team nur)

### 8.1 Player Retention Cohorts
- **Tracking:** Wer kehrt nach 1/7/30 Tagen zurück?
- **Ziel:** Sehen, welche Features binden (tägliche Quests vs. saisonal)

### 8.2 Soft Paywall Positioning
- **Idee:** Premium-Saisonpass (€2–5), Battle-Pass-Only Tiere
- **Nicht:** Pay-to-win (Coins, Tickets, Überspulung)
- **Nicht:** Aggressive Ads oder Nag-Screens

---

## Implementierungs-Roadmap

### Phase 1: November 2026 (Neulinge + Tägliche)
1. Tutorial-System (`2026-10-17-tutorial-system-design.md`)
2. Early-Game Rewards Boost (`2026-10-18-early-game-boost-design.md`)
3. Daily Challenges (`2026-10-19-daily-quests-design.md`)
4. **PR #182–185**

### Phase 2: Dezember 2026 (Progression + Event)
1. Level-System & Badges (`2026-10-19-player-level-badges-design.md`)
2. Achievements (`2026-10-20-achievements-system-design.md`)
3. Christmas Event Spezial-Setup
4. **PR #186–190**

### Phase 3: Januar 2027 (Veteranen + Events)
1. Seasonal Pass (`2026-10-20-seasonal-pass-design.md`)
2. Parkour Difficulty (`2026-10-20-parkour-difficulty-tracks-design.md`)
3. Weekly Leaderboards (`2026-10-19-weekly-leaderboard-design.md`)
4. **PR #191–194**

### Phase 4: Februar+ 2027 (Social & Neues)
1. Guilds (`2026-10-21-guilds-simple-design.md`)
2. Auction House (`2026-10-21-auction-house-design.md`)
3. Freund-Features (`2026-10-21-friend-gifts-cooperation-design.md`)
4. **PR #195–198**

---

## Design-Spec Checkliste

Alle neuen Features brauchen je eine Spec-Datei unter `docs/superpowers/specs/YYYY-MM-DD-*-design.md` **vor** der Implementierung:
- [ ] `2026-10-17-tutorial-system-design.md`
- [ ] `2026-10-18-early-game-boost-design.md`
- [ ] `2026-10-19-daily-quests-design.md`
- [ ] `2026-10-19-weekly-leaderboard-design.md`
- [ ] `2026-10-19-player-level-badges-design.md`
- [ ] `2026-10-20-achievements-system-design.md`
- [ ] `2026-10-20-seasonal-pass-design.md`
- [ ] `2026-10-20-parkour-difficulty-tracks-design.md`
- [ ] `2026-10-20-christmas-event-2026-design.md`
- [ ] `2026-10-21-auction-house-design.md`
- [ ] `2026-10-21-guilds-simple-design.md`
- [ ] `2026-10-21-friend-gifts-cooperation-design.md`

---

## Erfolgs-Metriken

- **Neuling-Bindung:** 70 % Rückkehr nach 7 Tagen (jetzt: ~40–50 %)
- **Tägliche aktive User (DAU):** +30 % durch Daily Quests & Events
- **Durchschnittliche Session-Dauer:** Von 8 Min → 15 Min
- **Social Engagement:** 40 % haben ≥1 Gildenmitglied (neuer Metric)

---

## Weitere Ideen (Backlog, später)
- Haustier-Customization (Farbe, Name, Accessoires)
- Pvp-Kämpfe (asynchrone Turniere)
- Lore/Story-Kampagne (Kapitel-weise)
- Craft-System erweitern (Futter, Power-ups herstellen)
- Raid-Boss (6 Spieler, Gildenboss-Eskalation)
- Kollektion-Challenges („Sammle alle Säuger der Reihe 3")
