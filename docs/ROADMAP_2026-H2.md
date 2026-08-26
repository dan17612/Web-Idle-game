# Zoo Empire — Roadmap H2 2026

**Datum:** 26.08.2026  
**Ziel:** Zoo Empire als Idle-Game für Neulinge und bestehende Spieler gleichermaßen cool, spielbar und langfristig motivierend gestalten.

---

## Aktuelle Stärken

### Für Neulinge
- **Sofortige Belohnung:** Coins/Tickets fließen kontinuierlich → Schnelle visuellen Erfolge
- **Einfache Mechaniken:** Tier sammeln, ausrüsten, Minispiele spielen → geringe Einstiegshürde
- **Multiplayer-Hub:** Zoo-Welt schafft sozialen Treffpunkt, neue Spieler sehen andere direkt
- **Breite Aktivitäten:** Parkour, Wordle, Memory, Drift, Safari-Eier, Farmen → Abwechslung

### Für bestehende Spieler
- **Progressionssystem:** Rare Tiere, Ausrüstung, Farmen → Langzeit-Goals
- **Wirtschaft-Tiefe:** Coins, Tickets, Crafting, Trading → Strategische Entscheidungen
- **Soziale Features:** Freundschaften, Support-Threads, gemeinsame Aktivitäten
- **Balance-Updates:** Server-autoritative Rewards ermöglichen flexible Anpassungen

---

## Phase 1: Neulingsfreundlichkeit (Woche 1–4)

### 1.1 Onboarding-Überhaul  
**Problem:** Neue Spieler wissen nicht, wo sie anfangen sollen. Keine geführte Tour durch die Welt.  
**Lösung:**
- **Tutorial-Overlay:** Interaktive, dismissbare Hinweise bei ersten Aktionen
  - "Sammle dein erstes Tier" → Popup mit Highlight auf Shop
  - "Spiele Parkour für Coins" → Schritt-für-Schritt Guide
  - "Besuche andere Farmen in der Welt" → Kurzanleitung Multiplayer
- **First-Time Bonuses:** 
  - +50k Coins nach erstem Minispiel
  - Starter-Outfit automatisch freischalten
  - Garantiertes Rare-Tier nach 5 Minispielen
- **Expedited Progression:** Erste 24h mit 1,5× Rewards → schnelle Erfolgserlebnisse

**Files:** Neue Component `OnboardingTutorial.vue`, Store-Flag in `gameState`

### 1.2 Neue-Spieler Quest-Linie  
**Problem:** Keine Ziele außer „mehr sammeln".  
**Lösung:**
- Lineare Quest-Reihe (10 Quests, à 5–10 Min):
  1. Öffne den Shop → +10k Coins
  2. Sammle ein Tier → +Rare Ticket
  3. Spiele dein erstes Minispiel → +5k Coins
  4. Besuche die Zoo-Welt → +Outfit-Freischaltung
  5. Kaufe eine Ausrüstung → +10k Coins
  6. Stelle dein Tier aus → +10k Coins
  7. Mache einen Freund → +Bonus-Emote
  8. Verdiene 100k Coins (organisch) → +Rare-Tier-Ticket
  9. Spiele alle 4 Minispiele → +Gold-Coins
  10. Kaufe einen Farm-Skin → +50k Coins + Chievment-Badge

**DB:** `player_quests` (quest_id, status, completed_at, reward)  
**Files:** `src/quests.js` (Logik), `src/questsSql.test.js` (Tests), `QuestPanel.vue`

### 1.3 Verbesserte Anfängerbilanz  
**Problem:** Spiel fühlt sich langsam an für die erste Stunde.  
**Balance-Änderungen:**
- Wordle: Minimum-Reward 1k → 3k (War: zu niedrig)
- Memory-Beginner: 5k → 8k für Easy-Modus
- Parkour-Anfänger: 8k → 12k für First-Run
- Shop-Preise für Anfänger-Items um 30 % senken (erste 3 Tage)

**Impact:** Neue Spieler erreichen 500k Coins in 4 Stunden statt 8

---

## Phase 2: Engagement & Langzeitmotivation (Woche 5–12)

### 2.1 Tägliche Missionen (Daily Quests)
**Problem:** Kein Grund, täglich zurückzukommen außer dem generischen "Coins verdienen".  
**Lösung:**
- 5 tägliche Missionen (reset UTC 00:00):
  1. Spiele 1 Minispiel → +2k Coins
  2. Sammle ein Tier → +500 Tickets
  3. Besuche die Welt → +3k Coins
  4. Kaufe etwas → +1k Coins
  5. Spiele 3 verschiedene Minispiele → +10k Coins (Bonus)
- **Daily Streak:** 7 aufeinanderfolgende Tage → +50k Coins Bonus
- **Heute abgerufen:** Visuelle Anzeige (Checkmarks, Fortschrittsleiste)

**DB:** `player_daily_missions` (reset täglich, Berechnung auf RPC-Seite)  
**Files:** `src/dailyMissions.js`, `DailyQuestPanel.vue`, neue RPC

### 2.2 Achievement-System  
**Problem:** Keine Ziele für Hardcore-Spieler (z. B. "500 Tiere sammeln" oder "Alle Minispiele auf Expert").  
**Lösung:**
- 50+ Achievements (Bronze, Silber, Gold, Platinum):
  - **Collection:** 50, 100, 200, 500 Tiere gesammelt
  - **Playmaster:** Jedes Minispiel 100×, 500×, 1000× gespielt
  - **Wohlhabend:** 1M, 10M, 100M Coins verdient
  - **Speedrun:** Parkour unter 30s, Wordle unter 20s
  - **Sozial:** 10, 25, 50 Freunde; Support-Threads helfen
  - **Farmer:** 10, 50 Tiere ausgerüstet; Alle Farm-Skins gekauft
- Achievements zeigen Achievements-Symbol neben Username

**DB:** `player_achievements` (achievement_id, unlocked_at)  
**Files:** `src/achievements.js` (Daten + Logik), `AchievementBadge.vue`, RPC-Update

### 2.3 Saisonale Events (Seasons)
**Problem:** Spiel braucht zeitlich begrenzte Highlights (Ankerpunkte für Rückkehr).  
**Lösung:**
- 4 Jahreszeiten à 8–12 Wochen, je mit eigenem Theme + Rewards:

| Season | Theme | Special Mechanic | Rewards |
|--------|-------|-----------------|---------|
| **Frühling** (März–April) | Blüten-Zoo | Pflanzen-Tiere sammeln | Spring Outfit, +50% Flower-Tier-XP |
| **Sommer** (Juni–Juli) | Wasser-Safari | Amphibien-Fokus, Wasser-Arena | Summer Outfit, Pool-Skin |
| **Herbst** (Sept–Okt) | Ernte-Festival | Crafting-Bonusses | Harvest Outfit, Patchwork-Farm-Skin |
| **Winter** (Dez–Jan) | Schnee-Zoo | Ice-Tiere, Warm-up-Mechanic | Winter Outfit, Aurora-Skin |

- Saisonal-Tiere kosten Tickets (nicht nur Coins) → Spieler müssen aktiv sein
- Exclusive Mini-Events per Season (5× pro Season): z. B. "Füttern-Herausforderung" → +Season-Punkte

**DB:** `seasons` (id, start_date, end_date, theme), `seasonal_animals` (animal_id, season_id, cost_type)  
**Files:** `src/seasons.js`, `SeasonalShop.vue`, RPC-Updates

### 2.4 Leaderboards & Competition
**Problem:** Keine Vergleichsmöglichkeit mit anderen Spielern (außer Namen sehen).  
**Lösung:**
- **Globale Leaderboards** (täglich aktualisiert, 00:01 UTC):
  - Total Coins verdient (Lifetime)
  - Tiere gesammelt (Lifetime)
  - Minispiel-Punktestand (Wordle, Parkour, Drift)
  - Weekly Coins (Reset jeden Montag)
  - Weekly Minispiel-Streak
- **Friends Leaderboards:** Nur gegen Freunde vergleichen
- **Rewards:** Top 100 erhalten Banner/Badge + Coins-Bonus
  - #1–#10: +100k Coins
  - #11–#50: +50k Coins
  - #51–#100: +25k Coins

**DB:** `leaderboards` (type, rank, user_id, value, updated_at)  
**Files:** `src/leaderboards.js`, `LeaderboardView.vue`, Scheduled RPC (täglich 00:01 UTC)

---

## Phase 3: Vertiefte Spielmechaniken (Woche 13–20)

### 3.1 Tier-Klassifizierung & Synergien
**Problem:** Alle Tiere sind nur visuell unterschiedlich; keine strategischen Unterschiede.  
**Lösung:**
- Tiere gehören zu 5 Klassen: **Raubtier, Pflanzenfresser, Vogel, Amphibie, Insekt**
- Jede Klasse hat **Bonus-Synergien**:
  - Raubtiere: +5% Coins pro 10 Raubtiere in Sammlung
  - Pflanzenfresser: +3% Tickets pro 10 Pflanzenfresser
  - Vögel: +10% Parkour-Rewards
  - Amphibien: +8% Wordle-Rewards
  - Insekten: +6% Memory-Rewards
- **Team-Bonus:** Auswahl von 3 "aktive Tiere" → kombinierte Synergien
  - z. B. 3 Vögel + 2 Raubtiere = +15% Parkour + +8% Coins

**DB:** Neue Spalte `animal_class` in `animals`, neue Tabelle `team_synergies`  
**Files:** `src/synergies.js` (Berechnung), `TeamBuilder.vue` (UI)

### 3.2 Ausrüstungs-Raids & Duels
**Problem:** Ausrüstung ist nur dekorativ; kein dynamisches Gameplay.  
**Lösung:**
- **Duel-System** (asynchron, kein Live-Multiplayer):
  - Fordere einen Freund heraus: "Battle for Coins" → Spieler wählt Tier + Outfit
  - System berechnet Duel-Resultat basierend auf Tier-Synergien + Glück
  - Gewinner: +10k Coins, Verlierer: -0 (kein Bestrafungssystem)
  - Duel-Reihe: 3× Duel pro Tag möglich
- **Weekly Raid Boss:**
  - Ein communaler Boss (z. B. "Löwenkönig") mit 1M HP
  - Alle Spieler fügen Schaden zu (ihre Tier-Power × Zeitstempel)
  - Wenn Boss besiegt: Alle bekommen +50k Coins + Exclusive Boss-Skin

**DB:** `duels` (challenger_id, opponent_id, winner_id, reward, created_at), `raid_boss` (current_health, total_damage)  
**Files:** `src/duels.js`, `DuelChallenge.vue`, RPC-Logik

### 3.3 Breeding & Hybrid-Tiere
**Problem:** Tier-Pool ist statisch; keine neuen Kombinationen zu entdecken.  
**Lösung:**
- **Breeding-System:** Kombiniere 2 Tiere → Zufälliges Hybrid-Tier
  - Kosten: 100k Coins + 10 Tickets pro Versuch
  - Chance: 30 % Erfolgschance (20 Min Wartezeit)
  - Hybrid hat Kombinations-Namen: "Löwen-Adler" (Icon zeigt beide)
  - Neue Hybrids bringen +10k Coins Bonus-Verkaufswert
- **Breedable nur ab Rare-Tier:** Häufige Tiere nicht züchtbar
- **Weekly Special:** Alle Donnerstage: +50 % Breeding-Erfolgschance

**DB:** `hybrids` (id, parent_a_id, parent_b_id, created_at), `player_hybrids` (player_id, hybrid_id)  
**Files:** `src/breeding.js`, `BreedingLab.vue`, RPC-Logic

---

## Phase 4: Soziale Tiefe (Woche 21–28)

### 4.1 Guilds (Tier-Clans)
**Problem:** Multiplayer ist nur kosmetisch; keine echte Zusammenarbeit.  
**Lösung:**
- **Guild-System:**
  - Gründer: Erstelle Guild (kostet 500k Coins + 50 Tickets)
  - Mitglieder: Bis zu 25 pro Guild
  - Beitrittsmodus: Offen / Bewerbung / Invite-only
  - Guild-Kasse: Gemeinschaftliche Ressourcen (alle Mitglieder tragen 5 % ihrer Coins bei)
- **Guild-Aktivitäten:**
  - **Guild Quest:** Alle Mitglieder spielen gemeinsam 1× pro Woche → +100k Coins Guild-Kasse
  - **Guild Raid:** Boss nur mit 5+ Guildies angreifbar → +200k Coins Siegespreis
  - **Guild Tournament:** Monatlich, Duels zwischen Guildies um Guild-Rankings
- **Guild-Perks:** Bei 15+ Mitglieder:
  - +5 % Coins-Multiplikator für alle
  - Exclusive Guild-Outfit
  - Guild-Wappen-Anzeige neben Namen

**DB:** `guilds` (id, name, founder_id, max_members, treasury, created_at), `guild_members` (guild_id, user_id, role, joined_at), `guild_quests` (guild_id, completion_date)  
**Files:** `src/guilds.js`, `GuildView.vue`, RPC-Updates

### 4.2 Mentor-System
**Problem:** Neue Spieler verlieren sich; Hardcore-Spieler wollen helfen, haben aber kein System.  
**Lösung:**
- **Mentor pairing:**
  - Neulinge (< 2 Wochen alt) können einen Mentor anfordern
  - Erfahrene Spieler (> 100 Tiere) können sich als Mentor anmelden
  - System matched automatisch
- **Mentor-Bonuses:**
  - Mentor: +1k Coins pro Tag, den Mentee aktiv ist (max. 30 Tage)
  - Mentee: +10 % Rewards in der ersten Woche mit Mentor
  - Wenn Mentee 50 Tiere sammelt: Mentor erhält +50k Coins einmalig
- **Public Mentor List:** Spieler können Fragen an öffentliche Mentoren posten (Support-Threads)

**DB:** `mentor_pairs` (mentor_id, mentee_id, paired_at, ended_at), `mentor_progress` (tracking achievements)  
**Files:** `src/mentors.js`, `MentorPanel.vue`, Matchmaking-RPC

### 4.3 Rivalries (Spieler-Feuds)
**Problem:** Leaderboards sind isoliert; keine persönliche Konkurrenz.  
**Lösung:**
- **Rivalry-Challenge:**
  - "Rival dich mit [Spieler]" → 30 Tage Rivalry-Periode
  - Track: Wer sammelt mehr Tiere / verdient mehr Coins in dieser Woche
  - Weekly Reports: "Du liegst 50k Coins vor deinem Rival 🎉"
  - Rewards: Gewinner nach 30 Tagen: +100k Coins + "Rival Slayer" Badge
- **Limits:** Nur 1 aktive Rivalry zur Zeit, cooldown 7 Tage
- **Friendly:** Rivalries sind freundschaftlich, kein Bestrafungssystem

**DB:** `rivalries` (id, player_a_id, player_b_id, started_at, winner_id, ended_at)  
**Files:** `src/rivalries.js`, `RivalryCard.vue`, RPC-Updates

---

## Phase 5: Monetisierung & Langzeitbindung (Woche 29–36)

### 5.1 Premium Pass (Optional, freie Alternative)
**Problem:** Casual-Spieler zahlen gern für Qualität; brauchen aber Fair-Play-Feeling.  
**Lösung:**
- **Premium Pass (€2.99/Monat oder €24.99/Jahr):**
  - +20 % Coins-Multiplikator
  - +2 Daily Quests zusätzlich (statt 5 → 7)
  - +1 Duel pro Tag (statt 3 → 4)
  - Exclusive Premium Outfit monatlich
  - Adblock (keine Ads mehr)
  - Priority Support
- **Free-to-Play Parity:** Kein P2W; nur Komfort-Features
- **Trial:** Erste 3 Tage kostenlos

**Implementation:** Neue Spalte `premium_tier` in `players`, gating in Reward-RPC

### 5.2 Cosmetic-Bundles (Battle Pass-Style)
**Problem:** Shop ist statisch; keine Urgency zum Kaufen.  
**Lösung:**
- **Lunar New Year Bundle (Feb):** +3 exclusive Tiere, outfit, Farm-Skin für 20k Coins
- **Summer Bundle (Juli):** Pool-Tiere, Beach-Outfit, +50 % Wordle-XP für 25k Coins
- **Halloween Bundle (Okt):** Spooky-Tiere, Costume-Outfit, +50 % Parkour-Speed für 15k Coins
- **Holiday Bundle (Dez):** Santa-Outfit, Snow-Tiere, +100% Fountain-Reward für 50k Coins
- **Bundles erneuern sich monatlich** → Notwendigkeit, "alte" Items zu verpassen

**DB:** `seasonal_bundles` (id, start_date, end_date, items[], total_cost)  
**Files:** `src/bundles.js`, `BundleShop.vue`

### 5.3 Cross-Progression & Desktop-App
**Problem:** Spieler wollen überall spielen (Mobil + Desktop); App-Store-Fragmentierung.  
**Lösung:**
- **Desktop-Progressive-Web-App (PWA):**
  - Installierbar auf Windows/Mac via Chrome/Edge
  - Offline-Cache für Minispiele
  - Native Notifications für Daily Quests
- **Cross-Platform Sync:**
  - Alle Fortschritte live synchronisiert (Supabase Realtime)
  - Spieler können nahtlos zwischen Handy + Desktop wechseln
- **Desktop Features:**
  - Keyboard-Shortcuts (z. B. "Space" = Parkour starten, "W/A/S/D" in Welt)
  - Große UI-Variante für Bildschirm
  - Desktop-Exclusive: Replay-System für Minispiele (Video ansehen)

**Implementation:** PWA-Manifest, Desktop-UI-Branch, Video-Encoder

---

## Priorisierungs-Matrix

| Feature | P1 (Woche 1–4) | P2 (5–12) | P3 (13–20) | P4 (21–28) | P5 (29–36) |
|---------|---|---|---|---|---|
| **Onboarding Tutorial** | ✅ | | | | |
| **New-Player Quests** | ✅ | | | | |
| **Balance-Anfänger** | ✅ | | | | |
| **Daily Quests** | | ✅ | | | |
| **Achievements** | | ✅ | | | |
| **Seasons** | | ✅ | | | |
| **Leaderboards** | | ✅ | | | |
| **Tier-Synergies** | | | ✅ | | |
| **Duels & Raids** | | | ✅ | | |
| **Breeding** | | | ✅ | | |
| **Guilds** | | | | ✅ | |
| **Mentors** | | | | ✅ | |
| **Rivalries** | | | | ✅ | |
| **Premium Pass** | | | | | ✅ |
| **Cosmetic Bundles** | | | | | ✅ |
| **PWA & Desktop** | | | | | ✅ |

---

## Metriken für Erfolg

Zu tracken nach jeder Phase:

### Für Neulinge (Phase 1)
- **Retention Day 1:** Ziel ≥ 60 % (Baseline: ??)
- **Retention Day 7:** Ziel ≥ 35 %
- **Average Session Duration:** Ziel ≥ 15 Min (Baseline: ??)
- **Tutorial Completion Rate:** Ziel ≥ 85 %

### Für bestehende Spieler (Phases 2–5)
- **Daily Active Users (DAU):** Ziel +20 % (Phase 2), +35 % (Phase 4)
- **Monthly Active Users (MAU):** Ziel ≥ +50 %
- **Session Frequency:** Ziel ≥ 1.5× pro Tag (Baseline: ??)
- **Coins Spent (Premium):** Ziel €500+/Monat (Phase 5)

### Gesamt
- **Churn Rate:** Ziel ≤ 5 % pro Woche
- **Guild Participation:** Ziel ≥ 40 % Spieler in Guild (Phase 4)
- **Leaderboard Engagement:** Ziel ≥ 70 % schauen Leaderboards an (Phase 2)

---

## Nächste konkrete Schritte (Sofort)

1. **Woche 1:** 
   - OnboardingTutorial.vue Komponente bauen
   - Quest-System DB-Migrations schreiben
   - First-Time Bonus RPC implementieren

2. **Woche 2:**
   - Anfänger-Balance adjustieren (Reward-Multiplikator)
   - QuestPanel.vue UI bauen
   - Tests schreiben (`src/questsSql.test.js`)

3. **Woche 3:**
   - Tutorial mit allen Features testen
   - A/B-Testing Onboarding-Flow
   - Feedback von 10+ Testspielern sammeln

4. **Woche 4:**
   - Iterationen basierend auf Feedback
   - Phase-2-Vorbereitungen (Daily Quests Infrastructure)
   - Deploy in Production

---

## Architektur-Notes für Implementierung

### Neue RPC-Funktionen (jeweils mit Tests)
- `player_complete_quest(p_player_id, p_quest_id)` → {coins, tickets, server_now}
- `player_get_daily_missions()` → [{mission_id, status, progress}]
- `player_claim_daily_reward(p_mission_id)` → {coins, server_now}
- `guild_create(p_name, p_public)` → {guild_id}
- `guild_accept_member(p_guild_id, p_user_id)` → success
- Und weitere pro Phase

### Neue Migrations
- `20260826_quests.sql` (Player_quests, schema)
- `20260902_daily_missions.sql` (Daily tracking)
- `20260916_achievements.sql` (Achievement schema)
- `20261001_seasons.sql` (Seasonal data)
- `20261015_guilds.sql` (Guild system)

### Komponenten-Struktur
```
src/views/
  GameView.vue (Neuer Tab: "Quests", "Daily", "Guild")
  QuestLineView.vue (Neue Route: #/quests)
  LeaderboardView.vue (Neue Route: #/leaderboard)
  GuildView.vue (Neue Route: #/guild)
  
src/components/
  OnboardingTutorial.vue
  QuestPanel.vue
  DailyQuestPanel.vue
  AchievementBadge.vue
  LeaderboardTable.vue
  GuildCard.vue
  ... (weitere)
```

---

## Risiken & Mitigationen

| Risiko | Eintritt | Mitigation |
|--------|----------|-----------|
| Anfänger-Balancing schießt über | Mittel | A/B-Test mit 20 % der Spieler vor Deploy |
| Guild-System wird nicht genutzt | Mittel | Obligatorische Guild-Quest bis Woche 25 |
| Leaderboards demotivieren Casual-Spieler | Gering | Separater Casual-Modus ohne Rankings |
| Server-Last durch Realtime Quests | Mittel | RPC-Caching, Batch-Updates statt Single-Calls |
| Premium Pass schreckt F2P ab | Gering | Klare Free-to-Play Parity, Trial-Phase |

---

## Fazit

Zoo Empire wird mit dieser Roadmap ein **Idle-Game für alle**: Neulinge steigen sanft ein (Phase 1), bestehende Spieler bekommen tägliche Gründe zurückzukommen (Phase 2), Hardcore-Fans finden taktische Tiefe (Phase 3), Communities entstehen (Phase 4), und die Basis wird langfristig haltbar (Phase 5).

**Schlüsselvision:** Ein Spiel, bei dem man immer etwas zu tun hat, egal ob man 1 Minute oder 1 Stunde Zeit hat.

