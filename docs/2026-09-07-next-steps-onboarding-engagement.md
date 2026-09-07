# Zoo Empire — Nächste Schritte für Neulinge & bestehende Spieler

**Datum:** 2026-09-07  
**Status:** Strategieplan für Frühjahr 2026–2027  
**Ziel:** Zoo Empire cool und stickig für neue Spieler + langfristige Bindung bestehender Spieler

---

## 🎯 Kernproblem

Das Spiel hat ein solides Fundament (Tiere, Minispiele, Multiplayer, Marktplatz), aber:

1. **Neulinge:** Erster Eindruck entscheidend → Leere Farm, lange Progression vor ersten Minispielen, ungeklärte Mechaniken.
2. **Bestehende Spieler:** Nach Level 12 Parkour, 3-Sterne-Drift, tägliche Belohnungen → Content-Lücken, zu wenig soziale Anreize zum Zurückkommen.

---

## 📊 Analyse: Was macht ein Idle-Game „cool"?

### Für Neulinge:
- **First 5 Minutes:** Tutorial, 1. Tier kauf in unter 2 Min, Coins-Regen sichtbar, erstes Mini-Game lockbar
- **First Hour:** Mindestz 3 verschiedene Minispiele probieren, erste Sterne sammeln, Username-Display
- **First Session:** Social Feature (Freunde adden, Geschenke senden) oder Farm besichtigen
- **Progression-Illusionen:** Ziele mit Abzeichen, visuelle Tier-Upgrades, Level-Zahlen

### Für bestehende Spieler (Retention):
- **Daily Active:** Ein Grund, täglich 5–10 Min zu spielen (Daily-Quest-Board)
- **Weekly Goal:** Gemeinsame Challenges (z. B. „Zoo-Welt: 5 Freunde adden bis Freitag")
- **Monthly Reward:** Saisonales Event mit exklusivem Tier oder Kosmetik
- **Social Loop:** Leaderboards + Achievements + Freunde-Vergleich

---

## 🚀 Konkrete Nächste Schritte

### Phase 1: Onboarding & First-Time Experience (1–2 Wochen)

#### 1.1 Tutorial-Sequenz (Interaktiv)
**Ziel:** Innerhalb 2 Min kaufen, verdienen, Mini-Game sehen

**Spec-Datei:** `docs/superpowers/specs/2026-09-XX-onboarding-tutorial.md`

- **Welcome-Screen:** Animierter Zoo-Eingang, 3 Tier-Bilder (Küken, Huhn, Hase), „START GAME"
- **Step 1:** Farm-Intro + Münz-Tipps erklären (Finger zeigt auf Münzen)
- **Step 2:** Erstes Tier-Kauf (Küken 50 🪙 — mit Coins aus Daily Login)
- **Step 3:** Auto-Tap zeigt: Tier produziert Münzen
- **Step 4:** Minispiel-Teaser: „Verdiene schneller in Spielen!" → Link zu Drift Level 1
- **Skip-Button:** Jederzeit abbrechen (für alte/Test-Accounts)

**Umsetzung:**
- Neue Komponente: `TutorialOverlay.vue` (zeigt Sprechblasen, blockiert UI außer aktiven Elementen)
- LocalStorage: `tutorial_step` + `tutorial_completed_at`
- `GameView.vue`: Bedingt rendern, nur bei erstem Besuch ohne Progress

---

#### 1.2 Starter-Paket & garantierte erste Erfolge
**Ziel:** Neulinge haben nach 1 Min 3 Tiere + erster Mini-Game läuft

**Änderung in:** `src/views/GameView.vue` + `supabase/migrations/20260XXX_starter_pack.sql`

- **Auf Account-Erstellung:** Geben +2,000 Coins (statt +500) → Küken + Huhn kaufbar
- **Tägliche Belohnung (neu):** Erste 3 Tage +1,500 Coins extra (statt Standard-Menge)
  - Day 1: Küken (50 🪙)
  - Day 2: Huhn (250 🪙) → erreicht
  - Day 3: Hase (1,200 🪙) freigeschaltet
- **Minispiel-Zugang:** Drift Level 1 + Parkour Level 1 von Anfang an spielbar (kein Sperren)
  - Aber nur die erste 3 Versuche geben Coins (als „Schnupperkurs")

---

#### 1.3 Progress-Visualisierung & Achievements
**Ziel:** Spieler sehen ständig, dass sie vorankommen

**Spec-Datei:** `docs/superpowers/specs/2026-09-XX-achievements-badges.md`

- **Achievement-System:**
  - Einfache Ziele: „5 Tiere besitzt", „1 Mio. Coins verdient", „Level 3 Parkour", „Wordle gewonnen", „3 Freunde hinzugefügt"
  - Pro Achievement: Icon + Gold-Badge im Profil
  - Für erste 10 Achievements: +500 Bonus-Coins je Achievement
- **Level-System (neu):**
  - Account-XP aus: Tier-Käufe, Minispiele-Spielen, Freunde adden
  - Sichtbar als „Level 1, 2, 3..." neben Username
  - Alle 5 Level: +1 Kosmetik-Item freigeschaltet (Avatar-Frame, Nameplate-Farbe)

**Umsetzung:**
- `supabase/migrations/20260XXX_achievements.sql`: Tabellen `achievements`, `user_achievements`, `xp_log`
- `src/stores/game.js`: `addXP()`, `checkAchievements()`, `unlockedAchievements`
- `ProfileView.vue`: Achievements-Grid anzeigen, Levels-Balken
- Coins-Belohnungen über RPC `claim_achievement_reward(id)` (server-autoritativ)

---

### Phase 2: Social Loops & Daily Stickiness (2–3 Wochen)

#### 2.1 Daily-Quest-Board
**Ziel:** Jeden Tag mindestens 3 Gründe zurückkommen

**Spec-Datei:** `docs/superpowers/specs/2026-09-XX-daily-quests.md`

- **4 tägliche Quests (ändern sich täglich 00:00 UTC):**
  1. „Verdiene 50k Coins" (passiv, Progress-Bar)
  2. „Spiele 2 Minispiele" (Drift oder Parkour)
  3. „Gib einem Freund ein Geschenk" (erfordert Freund)
  4. „Besuche Zoo-Welt" (kurz reinkommen, dann weg)
- **Belohnung pro Quest:** 500 Coins, 1 Ticket, +XP
- **Bonus:** Alle 4 Quests → +5 Tickets extra (Incentive für Rückkehr)

**Umsetzung:**
- RPC `get_daily_quests()`: Gibt 4 Quests + Progress für heutigen User
- RPC `update_quest_progress(quest_id)`: Tickt Quest voran
- RPC `claim_quest_reward(quest_id)`: Coins/Tickets auszahlen
- View: `DailyQuestPanel.vue` (in GameView, oben angeheftet)
  - Tabs für unvollständete/abgeschlossene Quests
  - Claim-Button bei 100 % Progress

---

#### 2.2 Gift-System ausbauen
**Ziel:** Soziale Loops — Freunde belohnen, Fehler-Wahrscheinlichkeit senken

**Änderung in:** `supabase/migrations/` + `src/views/FriendsView.vue`

- **Neue Gift-Typen:**
  - Coins-Geschenk (100 / 500 / 1k 🪙 — Spieler wählt)
  - Ticket-Geschenk (1 / 5 🎟)
  - Mystery-Ei (Tier x2, Schüttl-Animation)
- **Limit:** Max 2 Geschenke an einen Freund pro Tag (sonst Spam-Schutz)
- **Notifikation:** Freund sieht Badge im Profil „+3 Geschenke offen"
- **Belohnung Geber:** +100 XP für jedes angenommene Geschenk

**Umsetzung:**
- RPC `send_gift(friend_id, gift_type, amount)`
- RPC `accept_gift(gift_id)`: Coins/Tickets/Tier direkt zu Profil
- `FriendsView.vue`: Gift-Modal mit Picker für Typ + Betrag

---

#### 2.3 Weekly Challenge & Leaderboard Spike
**Ziel:** Einen Tag/Woche, an dem alle zusammen spielen

**Spec-Datei:** `docs/superpowers/specs/2026-09-XX-weekly-challenges.md`

- **Jeden Freitag–Sonntag eine Challenge:**
  - Mo–Do: Ankündigung + Vorbereitung im News-Panel
  - Beispiele:
    - „Memory-Marathon": Insgesamt 10k Punkte sammeln (Leaderboard)
    - „Zoo-Welt-Treffen": 50 Spieler gleichzeitig online (Realtime-Anzeige)
    - „Freundschafts-Bonus": Jeder Freund-Trade gibt +50 % Münzen diese Woche
- **Rang im Leaderboard:** Top 10 kriegen +5k Bonus-Coins
- **Teilnahme-Abzeichen:** Auch bei Platz 50 oder 500 gibt es ein „Teilnehmer"-Badge

---

### Phase 3: Content & Progression (3–4 Wochen)

#### 3.1 Neuer Minispiel-Typ: Tapping/Rhythm Game
**Ziel:** Kurzes, snappiges Minispiel für Zugfahrten (30 Sekunden)

**Spec-Datei:** `docs/superpowers/specs/2026-09-XX-rhythm-minigame.md`

- **Name:** "Zoo-Tanz" oder "Fütter-Frenzy"
- **Mechanic:** 4-Button-Rhythm (wie Taiko no Tatsujin), Emojis fallen von oben
- **12 Level** (einfach zu leihen aus Drift-Struktur)
- **Belohnung:** Weniger als Parkour/Drift, aber schnell verdient (Gelegenheits-Coins)

---

#### 3.2 Seasons & Battle Pass (Light)
**Ziel:** Monatliches Event-Tier mit exklusivem Content

**Spec-Datei:** `docs/superpowers/specs/2026-09-XX-seasons-battle-pass.md`

- **1 Season = 1 Monat**
- **Free Track (immer verfügbar):**
  - 5 Stufen, je 1 Achievement-Badge + 1k Coins
  - Stufen durch tägliche Quests + Minispiele-Play freigeschaltet
- **Premium Track (+2,000 Coins einmalig):**
  - +5 Stufen, je 2,500 Coins + exklusives Tier (z. B. „Season 1 Albino-Panda")
  - Spiegelt Supabase-Migrationen: `seasons`, `season_progress`, `season_rewards`

---

#### 3.3 Pet-Ausrüstung & Stat-System
**Ziel:** Tiere länger „leveln", nicht nur sammeln

**Spec-Datei:** `docs/superpowers/specs/2026-09-XX-pet-equipment.md`

- **Jedes Tier kriegt 2 Equipment-Slots:**
  - Hut: +10 % Einkommen
  - Rucksack: +15 % Offline-Verdienst
- **Ausrüstung über:**
  - Minispiel-Rewards (z. B. Parkour Level 6 → Lederhut)
  - Shop (500k–2M Coins)
  - Crafting aus Materialien (Trade-Slot)
- **Visual:** Kleine Icons auf Tier-Emoji, austauschbar wie Fashion-Game

---

### Phase 4: Community & Live Events (4–5 Wochen)

#### 4.1 Fest-Events (Seasonal)
**Ziel:** Saisonale Abwechslung + FOMO

- **Weihnachten:** Dezember
  - Überlagerte Snow-Welt, spezielle Tiere (Rentier, Pinguine)
  - Tägliches Adventskalender-Geschenk
- **Halloween:** Oktober
  - Spooky-Tiere (Skelett-Hund, Geister-Katze)
  - Event-Minispiel „Zombie-Parkour"
- **Erdbeer-Fest:** Juni
  - Süßigkeits-Tiere (Candy-Bear)
  - Beeren-Collecting-Minispiel

**Umsetzung:**
- `event_registry.js`: Definiert aktive Events, Zeitzonen-Umrechnung
- Theme-Override in `styles.css` (Event-Farben, Icons)
- Migrations: `event_animals`, `event_rewards`

---

#### 4.2 Guild/Clan-System (Stretch Goal)
**Ziel:** Längerfristige Gruppen-Bindung

**Spec-Datei:** `docs/superpowers/specs/2026-10-XX-guilds.md` (später)

- Spieler gründen/joinnen Clan mit 3–20 Membern
- Wöchentliche Clan-Quest (z. B. „Insgesamt 1M Coins verdienen")
- Clan-Silo in Zoo-Welt (Clan-Farben, Clan-Schild)
- Clan-Chest: Gemeinsame Rewards bei Quest-Erfolg

---

## 📋 Umsetzungs-Roadmap

### Sprint 1 (Week 37–38, Sept 8–21)
- [ ] Tutorial-Sequenz (1.1)
- [ ] Starter-Paket-Balancing (1.2)
- [ ] Achievement-Tabellen + RPC (2.1)

**Deliverable:** PR mit Tutorial + erstem Achievement-System

### Sprint 2 (Week 39–40, Sept 22–Oct 5)
- [ ] Daily-Quest-Board (2.1)
- [ ] Gift-System v2 (2.2)
- [ ] Weekly-Challenge-Struktur (2.3)

**Deliverable:** PR mit Daily-Loops + sozialen Features

### Sprint 3 (Week 41–42, Oct 6–19)
- [ ] Rhythm-Minispiel (3.1)
- [ ] Season-1-Struktur (3.2)
- [ ] Pet-Equipment (3.3)

**Deliverable:** PR mit neuem Minispiel + Equipment

### Sprint 4 (Week 43–46, Oct 20–Nov 16)
- [ ] Christmas Event (4.1)
- [ ] Guild-System Grundlagen (4.2) — *optional für diese Phase*
- [ ] Bug-Fixes + Balancing

**Deliverable:** Event-ready Codebase

---

## 🎨 UI/UX-Leitlinien

1. **Neulinge:** Große Buttons, Sprechblasen, Animationen (langsam, deutlich)
2. **Bestehendes UI:** Dunkelheit/Leere vermeiden — Badge-Badges, Progress-Balken überall
3. **Mobile First:** Alle Features in < 560px, keine Tab-Leisten-Konkurrenz
4. **Farb-Scheme:** Tokens nutzen, keine neuen Farben ohne Design-Review

---

## 💡 Hypothesen & Metriken

**Hypothese:** Mit Tutorial + Achievements halte ich 25 % mehr Neulinge über 7 Tage.
- **Metrik:** DAU (Daily Active Users), D1 Retention, D7 Retention
- **Messung:** `analytics` in Supabase via INSERT-Trigger auf wichtige Actions

**Hypothese:** Daily-Quests halten 40 % mehr Spieler zum Zurücommen.
- **Metrik:** DAU, Quest-Completion-Rate, durchschn. Session-Length
- **A/B-Test:** 50 % Spieler bekommen Quests in Sprint 2, Rest 1 Woche später

**Hypothese:** Season Battle Pass konvertiert 15 % F2P → P2P (2k Coins).
- **Metrik:** Conversions, Lifetime Value
- **Messung:** Supabase `purchase_log` mit Produkttyp

---

## 🛠 Technische Schulden & Vorbereitung

1. **Performance-Audit:** Mit 50+ Features (Achievements, Quests, Events) kann sich Supabase-Queryzeit verdoppeln
   - Action: Profile wichtige RPC-Queries, Cache-Strategien überlegen
   
2. **i18n Audit:** Tutorial + Quests sind sprachabhängig (de/en/ru)
   - Action: Alle Keys zentral in `src/i18n.js`, keine Hard-Coded Strings
   
3. **E2E-Tests:** Minispiel-Flows + RPC-Fehlerbehandlung
   - Action: Mit Tutorial/Quests Fehlerhafte States testen (z. B. Netztrennung)

4. **Datenbank-Indizes:** Neue Migrations brauchen Indizes auf `user_id`, `day`, `event_id`
   - Action: Post-Migration Monitoring via Supabase Advisor

---

## 📞 Feedback & Iterationen

Nach jedem Sprint:
1. **Internal Playtesting:** Eure TestAccount durchlaufen neuen Flow
2. **Beta-Testers:** 10–20 externe Spieler einladen, Feedback sammeln (Discord/Email)
3. **Metrics Review:** Schauen, ob die Hypothesen passen → Next-Sprint anpassen

---

## Zusammenfassung

Dieses Dokument schlägt vor:
- **Kurzfristig (Sept–Okt):** Tutorial, Achievements, Daily-Quests, Weekly-Events → **+30 % DAU erwartet**
- **Mittelfristig (Okt–Nov):** Neues Minispiel, Seasons, Pet-Equipment → **+20 % durchschn. Session-Dauer**
- **Langfristig (2027):** Guilds, mehr Events, Battle Pass → **40+ % Retention über 30 Tage**

Zoo Empire hat ein solides Fundament. Mit diesen Phasen wird es zu einem sticky Idle-Game, das Neulinge hält und Veteranen herausfordert. 🎮🐾

---

**Next Action:** Sprint 1 starten → Tutorial spec schreiben + Team Meeting
