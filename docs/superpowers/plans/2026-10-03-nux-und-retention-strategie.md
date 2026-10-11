# Zoo Empire — NUX & Retention Strategie 2026–2027

**Ziel:** Zoo Empire zu einem magischen Einstiegserlebnis für Neulinge machen, während bestehende Spieler durch Progression, soziales Engagement und Herausforderungen fesselt werden.

---

## Phase 1: New User Experience (NUX) — Onboarding & First Run

### 1.1 Interactive Tutorial (Woche 1–2)
**Problem:** Neue Spieler sehen eine Überfülle an Features ohne klare Handlung.

**Lösung:**
- **Tutorial-Kanal:** Optionaler gesteuerter Durchgang durch die Spielmechaniken
  - Tier 1: Tiere sammeln (Shop, erste Eier)
  - Tier 2: Minispiele spielen (Parkour als Einstieg, weil am visuellsten)
  - Tier 3: Zoo-Welt erkunden (Bauplätze, Freunde sehen)
  - Tier 4: Börse verstehen (Tiere verkaufen/handeln)
- **Progressive Disclosure:** Buttons/Tabs progressiv freischalten statt alles auf einmal zu zeigen
- **Tooltips:** Kontextuelle 1-Sätzer auf neuen Buttons (z. B. "Shop — neue Tiere kaufen")
- **Onboarding-Quest-Line:** Kleine Rewards für jeden Schritt (z. B. 50 Coins für 1. Shop-Besuch)

**Acceptance Criteria:**
- [ ] Tutorial-Overlay mit Guides für die 3 Hauptmechaniken
- [ ] First-time-user Flag in DB, der bestehende UI anpasst
- [ ] Messbar: DAU (Daily Active Users) und Retention nach 1/7/30 Tagen

---

### 1.2 Asymmetric Progression: Early Wins
**Problem:** Idle-Games können sich in den ersten Stunden nicht *idle* anfühlen — zu viel Click-Overload.

**Lösung:**
- **Starter-Paket:** Neue Accounts kriegen automatisch 3 kostenlose Eier in der Maschine (1 x pro Tag für 3 Tage)
- **Schnelle Early-Rewards:** erste 3 Parkour-Läufe mit 2× Multiplier
- **Preseason Leaderboard:** Neue Spieler spielen gegen leichte KI, nicht gegen Whales (separate Saison für Level < 5)
- **Minimales Grind:** Erste Tiere kosten nur 50 Coins statt 500

**Features:**
- `new_player_until` Timestamp in `profiles` — beim Erreichen von 7 Tagen spielen oder Level 10 ende die Boosts
- `starter_rewards_claimed` → bitmask für 1/2/3 kostenlose Eier

---

## Phase 2: Engagement für Day 1–7 Spieler

### 2.1 Daily Quest System (Woche 3–4)
**Aktuell:** Spieler haben keinen klaren Grund, jeden Tag zurückzukommen.

**Lösung:**
- **3 Daily Quests** (zurückgesetzt um 00:00 UTC):
  1. *Sammler-Quest:* „5 Parkour-Läufe spielen" → 100 Coins
  2. *Tier-Quest:* „Nimm ein Tier aus der Maschine" → 50 Coins + 1 Ticket
  3. *Freunden-Quest:* „Schau einen anderen Spieler in der Welt an" → 25 Coins + Info-Popup über Freundschaftsanfragen
- **Reward-Streak:** Spieler, die 7 Tage in Folge spielen, kriegen ein Extra-Ei
- **UI:**
  - Quest-Panel als Pull-Down im Game-Header oder eigener Tab
  - Progress-Balken (z. B. 3/5 Parkour-Läufe)
  - Confetti-Animation beim Abschluss

**Technik:**
- RPC `daily_quest_progress(quest_id)` — zählt und validiert serverseitig
- `daily_quests_completed` JSON-Array in Profiles (tracked für Streak)

---

### 2.2 Social Onboarding: First Friends
**Problem:** Zoo-Welt ist cool, aber ohne Freunde eine leere Lobby.

**Lösung:**
- **Social Nudge in Welt:** „Schau dich um! Andere Spieler sind hier" (Presence Realtime)
- **Auto-Suggested Friends:** Nach 5 Minuten in der Welt: „Möchtest du [Name] hinzufügen?"
- **Friend Gift:** Beim Annehmen einer Anfrage auto-senden: +10 Coins für beide Spieler
- **Emotes in Welt:** 👋 „Hi", 🎉 „Cool Zoo!", 💚 „Dein Tier ist süß" — ohne Chat, schnell

---

## Phase 3: Engagement für Day 7–30 Spieler

### 3.1 Progression Milestones & Prestige (Woche 5–7)
**Problem:** Nach dem Aufleveln (Level 1→20) sieht der Fortschritt flach aus.

**Lösung:**
- **Collection Achievements:**
  - 🏆 „Alle Starter-Tiere gesammelt" → Spezial-Tier (Gold-Färbung)
  - 🏆 „50 Tiere in der Sammlung" → +5% Coin-Verdienst global
  - 🏆 „Breeder: 10 Tiere gezüchtet" → neues Eit-Slot
- **Prestige System:** (Optional, nur wenn Level > 30)
  - Spieler können alles *zurücksetzen* → kriegen Prestige-Stufe + 1 und 50% Bonus zu allen Rewards
  - Anschaulich: ⭐ ⭐ ⭐ neben dem Namen
- **Pass System (Saison-basiert):** Siehe 3.2

**Acceptance Criteria:**
- [ ] `achievements` Tabelle mit Title/Icon/Reward
- [ ] Progress-Tracking in `user_achievements`
- [ ] Prestige-Level in Profiles

---

### 3.2 Season Battle Pass (3 Wochen-Fenster)
**Ziel:** Strukturierter, zeitlich begrenzter Content für Power-Player.

**Struktur:**
- **Free Track:** 15 Meilensteine über 3 Wochen
  - Woche 1: „10 Blockfall-Spiele spielen" → 100 Coins
  - Woche 2: „Reach 500 Coins total" → 1 Ticket
  - Woche 3: „Ein Tier auf Lv. 10 upgraden" → Spezial-Futter
- **Premium Track** (optionales Cosmetic-Pass für € 2,99):
  - Alle Free Rewards +
  - 3 exklusive Tier-Skins
  - +50% Exp-Bonus diese Saison
- **Ranking-Integration:** Top 100 dieser Saison in Leaderboard

---

### 3.3 Seasonal Events & Story (Woche 8–12)
**Konzept:** Kleine narrative Arcs, die Spieler zusammenbringen.

**Event 1: Dschungel-Fest**
- Neue Zone in der Zoo-Welt: Dschungel-Bauplatz (kostet 1000 Coins zu platzieren)
- Daily Event-Quest: „Tier 3 Mal den Dschungel-Bauplatz besuchen" → Spezial-Futter
- Leaderboard: Wer die meisten Dschungel-Besuche hat, kriegt ein Spezial-Tier

**Event 2: Welt-König-Turnier**
- 1 Woche: Spieler nomieren ein Tier
- 1 Woche: Abstimmung (jeder Freund = 1 Stimme)
- Gewinner: Ihr Tier kriegt einen Krone-Skin + 1000 Coins Reward

**Tech:**
- `seasonal_events` Tabelle (Datum, Quest-IDs, Leaderboard)
- Event-Flag in Router/Views zur UI-Anpassung

---

## Phase 4: Retention für Day 30+ Spieler

### 4.1 Guilds / Clans (Optionale Multiplayer-Tiefe)
**Problem:** Echte soziale Struktur fehlt (nur 1:1 Trades/Freunde).

**Lösung:**
- **Guilds:** Gruppen mit bis zu 50 Mitgliedern
  - Gründer zahlt 500 Coins
  - Members sehen Guildies in Leaderboard hervorgehoben
  - Guild Quest: „3 Members spielen je 10 Parkour-Läufe" → alle kriegen Bonus-Coin
- **Guild Shop:** Guild-Leader kann Tier-Skins kaufen, die alle Members nutzen können
- **No PvP, nur Cooperation** — Konflikte und Toxizität vermeiden

---

### 4.2 Breeding Tournament & Genetics (Woche 13–16)
**Tieferes Engagement für Züchter:**
- **Genetik-Lotto:** Tiere haben versteckte IV (Individual Values: ATK/DEF/SPD)
  - Züchtet zwei Tiere → Baby erbt Werte mit leichtem Randomness
  - Spieler können mit Traits-Checker sehen, welche Tiere gute Gene haben
- **Breeding Tournament:** Jede Saison können Spieler ihre besten gezüchteten Tiere eintragen
  - Gewinner kriegt rare Item nur aus diesem Event
  - Anreiz: Spieler experimentieren mit Züchtung statt nur Autos zu kaufen

---

### 4.3 PvE Dungeon / Boss Raids (Woche 17–20)
**Kooperativ statt Kompetitiv:**
- **Weekly Boss:** Alle Spieler collaboraten gegen einen starken NPC-Boss
  - Jeder spielt max 5 Minigames (Parkour, Blockfall, etc.)
  - Jedes erfolgreiche Spiel sendet `damage` an Boss
  - Boss besiegen → alle Spieler (die 1+ Schaden gemacht haben) bekommen Reward

**Feature Highlights:**
- Keine Fehlerquellen-Mechanik (jeder Spieler kann beitragen, unabhängig vom Skill)
- Sozial ohne forced Grouping (einfach spielen, mitarbeiten)

---

## Phase 5: Long-term Retention (30+ Tage)

### 5.1 Meta-Progression: Cosmetics & Collection (Woche 21+)
**Problem:** Coins/Tickets sind endlich, Tiere werden boring wenn gesammelt.

**Lösung:**
- **Cosmetics Only:** Statt Gameplay-Power:
  - Tier-Skins (z. B. Astronaut Zebra, Pirat Löwe)
  - Avatar-Frames
  - Emote-Packs
  - World-Dekorationen
- **Cosmetic-Only Battle Pass:** Nur Skins, keine Gameplay-Advantage
- **Cosmetic-Crafting:** Spieler können mit gesammelten Ressourcen Skins kombinieren (z. B. „Tigar + Gold-Farbe + Pirat-Hut" = Custom-Skin)

---

### 5.2 Rotating Game Modes
**Problem:** Die 5 Minigames werden repetitiv.

**Lösung:** Jeden Monat 1 neuer Tweak:
- **Parkour Pro Mode:** 2× Schwierigkeit, 3× Reward
- **Blockfall Timed:** Max. 60 Sekunden, Limit erhöht sich mit Score
- **Drift Storm:** Mehrere Gegner gleichzeitig, Co-op möglich
- **Wordle Blitz:** 5 Runden in 2 Minuten, wer am schnellsten ist gewinnt
- **Memory Chaos:** 5 Human Players spielen Memory gegeneinander (echte PvP)

---

### 5.3 Leaderboard Seasons & Rewards (Woche 21+)
**Struktur:**
- **Monthly Leaderboards:** Reset jeden Monat nach Metric:
  1. Total Coins earned this month
  2. Unique Animals collected
  3. Breeding Genetics score
  4. Parkour high score
- **Seasonal Leaderboards (3 Monate):** Ultimate rank
- **Hall of Fame:** Top 10 permanent sichtbar
- **Reward Tiers:**
  - Top 10: Exclusive skin + 5000 Coins
  - Top 100: Exclusive skin + 1000 Coins
  - Top 1000: 100 Coins

---

## Phase 6: Community Building (Optional, Woche 25+)

### 6.1 In-Game Events & Devs
- **Monthly Devs Q&A:** Admin-Avatar in der Welt, beantwortetet Fragen (live oder async)
- **Community Challenges:** Spieler können im Support-Roadmap Ideen voten, Top 3 werden implementiert
- **Fan Art Showcase:** Best emissary-Tiere des Monats werden in ein Community-Board gezeigt

---

## Implementation Roadmap

| Phase | Datum | Focus |
|-------|-------|-------|
| 1 | Oct 2026 | Interactive Tutorial + First-Run Boosts |
| 2 | Nov 2026 | Daily Quests + Social Nudges |
| 3 | Dec 2026 | Achievements + Battle Pass + Seasonal Events |
| 4 | Jan 2027 | Guilds + Breeding Tournament + Boss Raids |
| 5 | Feb 2027+ | Cosmetics + Game Mode Rotation + Leaderboards |
| 6 | Mar 2027+ | Community Infrastructure |

---

## Metrics & Success Criteria

### New User Metrics (Day 1–7)
- **D1 Retention:** > 40% (vs. avg. idle game 20%)
- **D7 Retention:** > 25% (vs. avg. 10%)
- **Tutorial Completion:** > 80% of Day-1 players
- **Avg. Session Length:** > 8 Minuten

### Engaged User Metrics (Day 7–30)
- **Daily Quest Completion:** > 70% of DAU
- **Friend List Growth:** Avg. 5 Freunde pro Level-20 Player
- **Leaderboard Opt-In:** > 50% of players

### Retention Metrics (Day 30+)
- **M1 Retention:** > 15%
- **M3 Retention:** > 8%
- **Cosmetic Purchase:** > 5% of players spend

---

## Notes & Principles

1. **No Paywall for Progression:** Alle Core-Features sind kostenlos. Nur Cosmetics sind bezahlt.
2. **No Fear of Missing Out (FOMO):** Events wiederholen sich. Niemand fühlt sich gezwungen.
3. **Asymmetric Fun:** Casual Player können chill entspannen, Tryhards haben Herausforderungen.
4. **Server-Authoritative:** Alle Rewards über RPC, keine Client-Cheats.
5. **Accessibility First:** Kein Zeitlimit auf kritische Progression. Alle Sprachen Support (de/en/ru).

---

## Datenbank-Erweiterungen (Teaser)

Neue Tabellen (bei Implementierung):
- `daily_quests` — Quest-Definition
- `daily_quest_progress` — User-Status
- `achievements` — Erfolgs-Definition
- `user_achievements` — User-Status
- `seasons` — Battle-Pass-Meta
- `season_passes` — User-Pass-Status
- `seasonal_events` — Event-Meta
- `guilds` — Guild-Definition
- `guild_members` — Membership
- `guild_quests` — Guild-Quests
- `cosmetics` — Skin/Emote/Frame-Shop
- `user_cosmetics` — User-Besitz

---

**Nächste Konkrete Schritte:**
1. ✅ Dieses Dokument (Strategy Alignment)
2. 📋 DB-Schema für Phase 1 (Tutorial + Daily Quests)
3. 🎨 UI/UX-Designs für Tutorial-Overlay
4. 🔧 RPC-Implementierung für Quest-Progress-Tracking
5. 🧪 A/B-Tests für Early-Retention

---

*Dokument: Zoo Empire NUX & Retention, Version 1.0*  
*Autor: Claude AI (AI Agent Guidelines)*  
*Datum: 3. Oktober 2026*
