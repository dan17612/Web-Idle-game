# Zoo Empire — Onboarding & Retention Roadmap

**Ziel:** Zoo Empire macht Neulingen Spaß UND hält erfahrene Spieler am Ball. Dieses Dokument skizziert die nächsten Prioritäten für beide Gruppen.

**Status:** Brainstorm / Strategic Plan  
**Gültig ab:** 2026-09-05

---

## 🎯 Aktuelle Situation

### Was Zoo Empire KANN
- ✅ 10 Tier-Kategorien mit aufbauendem Einkommen (Küken → Drache)
- ✅ Mehrere Minigames (Parkour, Drift, Memory, Boss-Fight, Wordle)
- ✅ 3D-Zoo-Welt mit Multiplikator
- ✅ Marktplatz & Trade-System
- ✅ Offline-Earnings (bis 8h)
- ✅ Coins & Tickets als separate Währungen
- ✅ Leaderboard & kompetitiver Edge

### Wo es stockt
**Neulinge:**
- ❌ Kein Onboarding-Tutorial (Spieler müssen alles selbst rausfinden)
- ❌ Keine Progression-Roadmap (Warum sollte ich das nächste Tier kaufen?)
- ❌ Kein Anfänger-Schutz (zu schnell überfordert von Shops, Minigames, Welt)
- ❌ Keine "Quick Wins" in der ersten Session

**Bestehende Spieler:**
- ❌ Kein Endgame (ab Tiger/Drache wird's langweilig)
- ❌ Keine täglichen/wöchentlichen Ziele (Quests, Challenges)
- ❌ Keine Clan/Community-Features (außer Realtime-Bubble in der Welt)
- ❌ Keine saisonalen Events (z. B. "Summertime Zoo", "Halloween-Tiere")
- ❌ Keine Battle-Pass / Season-Progression (z. B. zum Schalten von Skins/Emotes)

---

## 🚀 Priorisierte Roadmap

### Phase 1: Neulinge reißen sich vor Freude (Q4 2026)

#### 1.1: Interactive Onboarding (1-2 Wochen)
**Problem:** Ein Neuling öffnet die App und sieht "Farm mit 50 Tieren". Keine Orientierung.

**Lösung:**
- [ ] **Tutorial-Sequence (erstes Spielsession):**
  - Schritt 1: Tap Chickens — "Sammle 50 Coins"
  - Schritt 2: Erstes Tier kaufen — "Kaufe ein Chick"
  - Schritt 3: Passives Einkommen — "Warte 10s und verdiene coins"
  - Schritt 4: Minigame anteaser — "Spiel Parkour, um 2x Coins zu verdienen"
  - Schritt 5: Zoo-Welt entdecken — "Besuche die Zoo-Welt"
  
- [ ] **Help-Toasts / Hints:**
  - Bei jedem neuen Feature kurz Erklärung + Video-Link
  - Nicht-nervig: nur beim ersten Mal zeigen, dimissbar
  
- [ ] **Progression-Hints:**
  - In ShopView: Nächstes empfohlenes Tier (`empfohlen für: Level X`)
  - Beim Kauf: Earnings-Vergleich ("Chicken: 2 coins/s → Rabbit: 8 coins/s")

**Implementation:**
- Neue Datei: `src/onboarding.js` (State-Machine für Tutorial-Steps)
- In `GameView.vue`: conditional Render von `<OnboardingOverlay>`
- DB Flag: `profiles.onboarding_step = 'done' | 'tier_0' | 'tier_1'` etc.
- RPC: `mark_tutorial_step_done(p_step_id)`

---

#### 1.2: Beginner Economy Balancing (1 Woche)
**Problem:** Erste 3 Tiere sind zu schnell gekauft, dann Geldmangel.

**Lösung:**
- [ ] **Level 0-3 (Küken bis Hase):**
  - Coins-Generation + Tap-Bonus 1.5x höher (schnellere Erfolge)
  - `tap_bonus = base * 1.5` für Spieler mit `created_at < 24h`
  
- [ ] **Beginner Minigame:** Parkour-Einstiegslevel nur mit 50% Schwierigkeit
  - `difficulty_multiplier = 0.5` wenn Spieler weniger als 5 Parkour-Runs absolviert hat

- [ ] **Freier Daily-Reward:** Täglich 100 Coins (nicht im Code, aber Database-RPC)
  - Neue RPC: `claim_daily_beginner_bonus()` (1x/day)
  - Sichtbar auf GameView nur für `coins < 10_000`

**Balancing:**
- Dies darf bestehende Spieler NICHT nerfen
- Flag: `is_early_game = Date.now() - created_at < 3 * 86400_000` (3 Tage)

---

#### 1.3: First Achievement / Milestone System (1-2 Wochen)
**Problem:** Spieler haben keine greifbaren Ziele ("Okay ich hab 10 Chickens, und dann?")

**Lösung:**
- [ ] **Milestones:**
  - `Tier 1: 10 Chickens` → Toast: "Farm Starter! +50 Coins"
  - `Tier 2: 5 Rabbits` → Toast: "Small Farm Owner! Unlock: Beginner Minigame Tutorial"
  - `Tier 3: 1 Pig` → Toast: "Grower! Zoo-Welt: +10% Earnings"
  - `Tier 5: 1 Panda` → Toast: "Big Zoo! Unlock: Marktplatz"
  
- [ ] **UI Element:**
  - In `GameView.vue`: "Nächster Milestone" Card (oben)
  - Fortschrittsbalken: "4 von 5 Tiere gesammelt"
  - Bei Erreichen: Toast + Party-Konfetti + Coins-Bonus

**Implementation:**
- Neue Datei: `src/milestones.js` (Logik-Modul)
- DB: neuer Table `player_milestones` (milestone_id, unlocked_at)
- RPC: `check_milestones()` nach jedem Animal-Kauf
- Milestones als konstanter Array im Code (wie Animals)

---

### Phase 2: Bestehende Spieler bekommen Saft (Q4-Q1 2026/27)

#### 2.1: Daily/Weekly Quest System (2-3 Wochen)
**Problem:** Spieler wissen nicht, was sie täglich tun sollen ("Heute nochmal spielen?").

**Lösung:**
- [ ] **Daily Quests** (reset every UTC midnight):
  - "Earn 5,000 coins" → 100 Tickets
  - "Win 3 Parkour runs" → 50 Tickets  
  - "Equip 2 animals in Zoo-Welt" → 25 Tickets
  - "Trade 1 animal on Marketplace" → 75 Tickets
  
- [ ] **Weekly Quest** (reset Sunday UTC):
  - "Earn 50,000 coins" → 250 Tickets
  - "Reach Leaderboard Top 50" → 500 Tickets
  - "Collect all 5 Zoo emotes" → 100 Tickets

- [ ] **UI Element:**
  - Neue Tab in Bottom-Nav: "Quests" (oder Quick-Card in GameView)
  - Progress-Bars für jede Quest
  - Highlight: täglich verfügbare Tickets-Rewards

**Implementation:**
- Neue Datei: `src/quests.js` (Logik)
- DB: `player_quests` (quest_id, progress, completed_at)
- DB: `quests` (quest_id, type, description, reward_tickets, criteria_json)
- RPC: `complete_quest(p_quest_id)` (muss Kriterien prüfen)
- Realtime Watch auf `quests` bei Achievements (z. B. Parkour-Win)

---

#### 2.2: Season / Battle-Pass System (2-3 Wochen)
**Problem:** Keine Langzeit-Motivation. "Warum sollte ich noch 20h spielen?"

**Lösung:**
- [ ] **Season = 4 Wochen Zyklus:**
  - Season 1: "Summer Zoo"
  - Season 2: "Autumn Harvest"
  - Season 3: "Winter Wonderland"
  - etc.
  
- [ ] **Battle-Pass Tier (50 Levels):**
  - Jeder Level: Kosmetik-Reward + Coins/Tickets
  - Level 1 @ 0 XP, Level 50 @ 50,000 XP
  - XP durch: Quests (+50 XP), Minigames (+10 XP/min), Boss-Fights, Trades
  
- [ ] **Season-Exclusive Items:**
  - Tiere-Skins (z. B. "Santa Chicken", "Pumpkin Panda")
  - Zoo-Kosmetik (Decorations, Path-Types)
  - Emotes (Seasonal)
  - Alle sind nur in dieser Season freischaltbar → FOMO / Engagement
  
- [ ] **Rank-Badge im Profil:**
  - Zeigt Season + aktuelle Battle-Pass Level
  - Leaderboard sortiert nach: Coins DANN nach Season-Level

**Implementation:**
- DB: `seasons` (id, name, start_date, end_date, theme)
- DB: `season_rewards` (season_id, level, item_type, item_id)
- DB: `player_season_progress` (player_id, season_id, level, xp)
- RPC: `add_season_xp(p_amount)` (mit Tier-Lock auf aktuelle Season)
- Logic in `src/seasonPass.js`

---

#### 2.3: Seasonal Events & Limited Tiers (1-2 Wochen)
**Problem:** Spieler sehen nach Drache kein neues Goal.

**Lösung:**
- [ ] **Seasonal Limited Tiers:**
  - Jeden Monat 1 neues Tier nur für diese Season (z. B. "Phoenix" im Oktober)
  - Kostet 500M Coins + 100 Tickets (endlich ein Grund, beide Währungen zu brauchen)
  - Earnings: 1,000,000 coins/s
  - Nur 4 Wochen freischaltbar → FOMO
  
- [ ] **Event Bosses:**
  - Z. B. "Autumn Bear" Miniboss (einmalig pro Season)
  - Reward: 1,000 Tickets + Exclusive Costume
  
- [ ] **Event-Merchandise:**
  - Zoo-Dekorationen (saisonal)
  - Tierverkos (z. B. "Halloween Penguin")

**Implementation:**
- DB: `seasonal_animals` (id, animal_id, season_id, available_from, available_until)
- DB: `seasonal_events` (id, name, start_date, boss_rpc_name)
- Logic Datei: `src/seasonalContent.js`
- In `ShopView.vue`: Filter nach `available_from <= now <= available_until`

---

#### 2.4: Clan / Guild System (3-4 Wochen) — OPTIONAL, nicer-to-have
**Problem:** Multiplayer-Aspekt ist nur oberflächlich (andere Spieler in Welt sehen).

**Lösung:**
- [ ] **Clans / Guilds:**
  - Gründen: 10,000 Coins + 50 Tickets
  - Mitglieder: max. 50 pro Clan
  - Features: Chat, Shared Treasury (Coins-Pool), Clan-Level (Level durch Members-Aktivität)
  
- [ ] **Clan-Wars** (optional):
  - Weekly: 2 Random Clans treten an
  - Jeder Member: 1 Bossfight für Clan
  - Gewinner-Clan: 500 Coins pro Member
  
- [ ] **Clan-Perks:**
  - Level 5: +10% Earnings für alle Mitglieder
  - Level 10: +50 Tickets / Week
  - Level 15: Exclusive Clan-Emote freischalten

**Implementation:**
- DB: `clans` (id, name, founder_id, created_at, level, treasury_coins)
- DB: `clan_members` (clan_id, player_id, role = 'leader'|'elder'|'member', joined_at)
- RPC: `create_clan(p_name, p_initial_coins)`, `join_clan(p_clan_id)`, `leave_clan()`
- Vue Component: `<ClanView>` mit Chat-Integration (Supabase Realtime)

---

## 📊 Success Metrics

### Neulinge (Onboarding Performance)
- **Cohort Retention:**
  - Tag 1: >80% (schaffen einen Kauf)
  - Tag 7: >40% (spielen immer noch)
  - Tag 30: >20% (sind committed)

- **Tutorial Completion:**
  - >90% starten das Tutorial
  - >80% schaffen "Erstes Tier kaufen"
  - >60% erreichen "Zoo-Welt anspielen"

### Bestehende Spieler (Engagement)
- **Daily Active Users (DAU):**
  - Mit Quests: +30% DAU gegenüber Baseline
  - Mit Battle-Pass: +50% DAU gegenüber Baseline

- **Session Length:**
  - +20% durchschnittliche Session-Länge (Quests encouragen längere Play-Sessions)

- **Revenue:**
  - Season-Pass Purchase Rate: >15% des DAU
  - Average Revenue Per User (ARPU): +25%

---

## 🗂️ Implementation Priorität

### Must-Have (Phase 1, vor Q4-Ende)
1. **Interactive Onboarding** ⭐ (Impact: Retention x3)
   - Neulinge brauchen sofort Orientierung
2. **Beginner Economy Balancing** ⭐
   - Sonst bounced Neuling nach 5 min
3. **Daily Quests** ⭐⭐ (Impact: DAU +30%)
   - Bestehende Spieler brauch Grund zu returnen

### Nice-to-Have (Phase 2, ab Q1)
4. **Battle-Pass / Seasons** (Impact: ARPU +25%, DAU +50%)
5. **Seasonal Limited Tiers** (Impact: Endgame Motivation)
6. **Seasonal Events & Bosses** (Impact: FOMO / Viral)
7. **Clan System** (Nice-to-Have, Complex)

---

## 🔧 Technical Debt & Setup

### Vor Phase 1:
- [ ] Ensure DB Schema supports `onboarding_step`, `player_milestones`
- [ ] Implement Toast-System in GameView (für Hints)
- [ ] Create `src/onboarding.js` & `src/milestones.js`
- [ ] Add RPC: `mark_tutorial_step_done`, `check_milestones`

### Vor Phase 2:
- [ ] DB Schema: `quests`, `player_quests`, `seasons`, `season_rewards`, `player_season_progress`
- [ ] Implement `src/quests.js`, `src/seasonPass.js`
- [ ] Add RPCs: `complete_quest`, `add_season_xp`
- [ ] Seasonal Animal Asset Pipeline (Icon, Animation pro Tier)

---

## 🎨 UI/UX Roadmap

- **GameView Updates:**
  - Top Card: Onboarding Step / Current Milestone / Season-Pass Progress
  - New Tabs: Quests, Season

- **ShopView Updates:**
  - Filter: "Beginner", "Seasonal", "Endgame"
  - Labels: "Für Level X empfohlen", "Nur in dieser Season"

- **ProfileView Updates:**
  - Season Badge (Level, XP-Bar)
  - Clan Name + Level (wenn Member)

- **New Views:**
  - `<QuestsView>` oder als Card in GameView
  - `<SeasonPassView>` (Tier-Overview mit Rewards)

---

## 📝 Nächste Schritte

1. **Design-Spec für Phase 1 schreiben** (Onboarding Flow Wireframe)
2. **Design-Spec für Phase 2 schreiben** (Quest & Season UI)
3. **Sprint 1:** Onboarding Implementation
4. **Sprint 2:** Beginner Balancing & Milestones
5. **Sprint 3:** Daily Quests System
6. **Sprint 4:** Battle-Pass & Seasons

---

**Autor:** Claude AI  
**Letzte Änderung:** 2026-09-05  
**Feedback an:** daniil@schiller.pw
