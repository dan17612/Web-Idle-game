# Zoo Empire — Engagement Roadmap (2026–2027)

**Ziel:** Zoo Empire zu einem langfristig motivierenden Spiel für Neulinge UND bestehende Spieler machen.

**Status:** Strategisches Dokument (Public Roadmap)  
**Datum:** 2026-09-15

---

## Executive Summary

**Aktuelle Stärken:**
- ✅ 6 unterschiedliche, gut umgesetzte Minispiele (Drift, Memory, Parkour, Wordle, Memory Online, Zoo World)
- ✅ Solide technische Architektur (Supabase RPC, Pinia, Three.js)
- ✅ Gute i18n (de/en/ru)
- ✅ Anti-Cheat durch Server-autoritative Wirtschaft

**Aktuelle Schwächen:**
- ❌ **Onboarding:** Nur 5-Schritt Bubble, keine klare erste Progression
- ❌ **Neulinge:** Sehen komplexes UI (Fusion, Crafter, Boss Path) ohne Erklärung
- ❌ **Engagement:** Keine Events, keine Cosmetics-FOMO, keine Social-Challenges
- ❌ **End-Game:** Keine Prestige/Infinity, Spieler plateau nach Level 20 (Memory/Parkour)

**Resultat:**
- ⚠️ Vermutlich **<40% Day-3-Retention** (typisch für Idle-Games)
- ⚠️ **Single-Player-Feeling** trotz Friend/Leaderboard-Features
- ⚠️ **Keine Monetisierung-Hooks** (F2P-Only)

---

## Phase 1: Neulinge-Fokus (Sep–Okt 2026)

### 1.1 Verbesserte Onboarding-Tour

**Problem:** Neue Spieler sehen 10+ Buttons, wissen nicht, wo anfangen.

**Lösung:** Sequenzielle Tutorial-Tour über erste 10 Minuten

**Implementation:**
- Feature-Gating: Buttons grau bis Schritt freigegeben
- 5-Schritt-Tour:
  1. "**Tippe** → verdiene Coins" (Highlight Scene)
  2. "**Kauf** dein erstes Tier im Shop" (Highlight Shop)
  3. "**Rüste aus** → Multiplikator" (Equipment-Highlight)
  4. "**Wähle Liebling** → +Boost" (Favorite-Highlight)
  5. "**Spiel Minispiel** → Tickets verdienen" (Drift-Highlight)

**UI-Änderungen:**
```vue
<!-- Neu: Overlay-Scrim + Spotlight auf aktuelles Element -->
<div v-if="tutorial && !complete" class="tutorial-overlay">
  <div class="spotlight" :style="{ ...targetRect }"></div>
  <TutorialBubble :step="tutorialStep" @next="advance()" />
</div>
```

**Belohnung:** Nach Completion → +5k Bonus-Coins (zusätzlich zu Welcome-Gift)

**Metriken-Ziele:**
- Tutorial-Completion-Rate: >70%
- Time to First Minigame: <5 min
- Day-1-Retention: >50%

---

### 1.2 Starter-Quests (erste 3 Tage)

**Problem:** "Was soll ich als nächstes tun?"

**Lösung:** 3-Tages-Quest-Kette in GameView

**Implementation (neue Tabelle `new_player_quests`):**

| Day | Quest | Reward |
|-----|-------|--------|
| 1 | Verdiene 10k Coins | +2k Coins |
| 2 | Kauf 3 Tiere | +1 Tier-Ei |
| 3 | Spiel Wordle 1× | +1 Ticket |

**UI:** Hero-Card in GameView mit Progress-Bar

```javascript
// src/stores/game.js
const starterQuestState = computed(() => ({
  day: Math.floor((now - createdAt) / 86400000) + 1,
  goals: [
    { title: 'Verdiene 10k Coins', current: coins, target: 10000 },
    { title: 'Kauf 3 Tiere', current: animalsBought, target: 3 },
    { title: 'Spiel Wordle', current: wordleAttempts, target: 1 }
  ]
}))
```

**Belohnung:** +5k Coins nach Tag 3

---

### 1.3 UI-Vereinfachung für Anfänger

**Problem:** Anfänger sehen zu viel auf einmal (Fusion, Crafter, Boss Path, Admin Panel)

**Lösung:** Progressive Disclosure (Accordion-Tabs)

**Implementation:**
- Collapse "Advanced" Section in GameView (Fusion, Crafter, Boss Path hidden)
- "← More" Button zeigt alles
- Nach Tag 3 automatisch erweitern

```javascript
// UI-State
const showAdvanced = computed(() => 
  tutorial.complete || daysSinceCreated > 3
)
```

---

## Phase 2: Engagement-Loops (Nov–Dez 2026)

### 2.1 Weekly Events + Event-Kalender

**Problem:** Keine Gründe zum täglichen Spielen außer Offline-Income

**Lösung:** Wöchentliche Event-Rotation

**Events (Beispiel November):**
- **Woche 1:** "Double Coins on Drift" (2× Coins in Drift-Minispiel)
- **Woche 2:** "Memory Speed Challenge" (3 Level in <2min = Bonus)
- **Woche 3:** "Wordle Streak Bonus" (Jeder Tag +10% auf Reward)
- **Woche 4:** "Boss Blitz" (3 Boss-Kampf-Siege = Rare Tier)

**Implementation (DB):**
```sql
CREATE TABLE public.weekly_events (
  id bigint primary key,
  week_start date not null,
  event_type text not null, -- 'drift_double', 'memory_speed', etc.
  multiplier float default 1.0,
  bonus_description text
);
```

**UI:** Event-Banner auf Startseite
```vue
<div class="event-banner">
  <span class="emoji">⏳</span>
  <span class="title">{{ event.name }}</span>
  <span class="timer">Endet in {{ formatTime(eventEnds) }}</span>
</div>
```

**Metriken:**
- Event-Partizipation: >60% DAU
- Session-Frequency: +1 zusätzliche Session/Woche

---

### 2.2 Cosmetics-Shop (Tier-Fusion, Hüte)

**Problem:** Spieler haben keine visuellen Fortschritts-Marker

**Lösung:** Kosmetik-Items kaufbar mit Coins

**Items:**
1. **Tier-Fusion:** 3× Normales Panda → 1× Gold-Panda (visuell größer, Aura)
   - Kosten: 50k Coins
   - Nur kosmetisch, keine Game-Mechanic-Änderung
   - In Zoo-World sichtbar als größeres Emoji

2. **Avatar-Hüte:** Nach 10 einer Tierart einen Hut freischalten
   - Z. B. "Panda-Hut" nach 10 Panda-Sammelstücke
   - Kosten: 100 Coins
   - Avatar-Emoji trägt Hut in Profil/Freundsliste

3. **Farm-Skins:** Bereits implementiert (Zoo World)
   - Neue: "Dschungel-Farm", "Winter-Farm" (Seasonal)
   - Kosten: 100k–500k Coins

**Implementation:**
```sql
INSERT INTO public.world_items (kind, name, emoji, cost, sort, enabled) VALUES
  ('fusion', 'Gold Panda', '✨🐼', 50000, 1, true),
  ('hat', 'Panda Hat', '🎩', 100, 2, true);
```

**UI in Inventory:**
```vue
<section class="cosmetics">
  <button v-for="item in cosmetics">
    {{ item.emoji }} {{ item.name }} — {{ formatCoins(item.cost) }}
  </button>
</section>
```

**Metriken:**
- Cosmetic-Purchase-Rate: >15% of players with 50k+ coins
- Average Cosmetics Owned: 2–3 per player

---

### 2.3 Social-Features: Friend-Challenges

**Problem:** Leaderboards existieren, aber keine direkten Wettbewerbe

**Lösung:** "Beat My Score" Challenges zwischen Freunden

**Implementation:**
- Friend-Button im Profil: "Challenge to Wordle"
- Challenger + Addressee spielen Wordle/Memory/Drift in nächsten 24h
- Winner-Announcement in Freunde-Liste
- Leaderboard mit 1-on-1 Match-Records

```javascript
// RPC: send_friend_challenge
// Args: target_friend_id, game_type (wordle/memory/drift)
// Returns: challenge_id
```

**UI:** "Challenges" Tab in Freunde-View
```vue
<div class="friend-challenges">
  <div class="challenge-card" v-for="ch in myChallenges">
    <span>{{ ch.opponent }} – {{ ch.gameType }}</span>
    <span>Ends in {{ formatTime(ch.endsAt) }}</span>
  </div>
</div>
```

**Metriken:**
- Challenge-Send-Rate: 0.5+ pro Friend
- Challenge-Completion-Rate: >70%

---

## Phase 3: Langfrist-Content (Jan–Mar 2027)

### 3.1 Achievements & Rank-System

**Problem:** Keine visuellen Meilensteine außer Coins

**Lösung:** Achievements (10–20) + Rang-Badge

**Achievements (Beispiele):**
- 🥋 "Collector" — Sammle 50 einzigartige Tiere
- 🚗 "Drifter" — Fahre 100 Drift-Rennen
- 🧠 "Puzzle Master" — Löse 50 Memory-Level
- 👥 "Social Butterfly" — Habe 10 Freunde
- 💰 "Millionaire" — Verdiene 1M Coins (kumulativ)
- 🎯 "Focused" — 7-Tage-Streak (täglich spielen)

**Implementation (neue Tabelle):**
```sql
CREATE TABLE public.achievements (
  id text primary key, -- 'collector', 'drifter', etc.
  name text not null,
  description text,
  icon_emoji text,
  condition_query text, -- SQL to check unlock
  reward_coins int default 0,
  reward_title text
);

CREATE TABLE public.player_achievements (
  user_id uuid,
  achievement_id text,
  unlocked_at timestamptz,
  primary key (user_id, achievement_id)
);
```

**Rank-System (basierend auf Achievements + Stats):**
- 🥉 Bronze: 1–3 Achievements
- 🥈 Silver: 4–7 Achievements
- 🥇 Gold: 8–12 Achievements
- 💎 Platinum: 13+ Achievements

**UI:** Achievements-Tab in Profil-View, Rang-Badge im Avatar

---

### 3.2 Prestige / Infinity Mode

**Problem:** Nach Level 300 (Tap Upgrade) + Level 20 (Minispiele) = Plateau

**Lösung:** Prestige-Cycle (ähnlich Cookie Clicker)

**Implementation:**
- Nach Tap-Upgrade Level 300: "Prestige-Button" in Upgrades
- Prestige-Button: Reset alles → Tap-Level = 1, aber behalte 50% der Coins
- Prestige-Count erhöht sich → "Prestige Lv. 2"
- Multiplier-Boost pro Prestige: +2% zum Tap-Einkommen (permanent)

```javascript
// Prestige Effect:
// Day 1: Coins 100k/sec, Prestige 0 → No Boost
// After Prestige: Coins 2k/sec (50% of 100k), Prestige 1 → +2% Boost (new rate: 2.04k/sec)
// So re-accumulating to 100k takes ~49.5k/sec / 1.02 faster
```

**Resets für Minispiele:** Beyond Level 20, seeded courses become procedurally variant
- Memory Level 21+: Random tile shuffles, higher move-limits
- Parkour Level 13+: Course-seeds expand randomly
- Drift Level 13+: Extended track layouts

---

### 3.3 Guild System (MVP)

**Problem:** Spiel ist Single-Player, trotz Friend-Features

**Lösung:** Small Guilds (5–10 Spieler) mit Shared Progression

**Implementation (neue Tabellen):**
```sql
CREATE TABLE public.guilds (
  id uuid primary key,
  name text not null unique,
  leader_id uuid references public.profiles(id),
  member_count int default 1,
  founded_at timestamptz default now(),
  description text,
  discord_link text
);

CREATE TABLE public.guild_members (
  guild_id uuid references public.guilds(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  role text default 'member', -- 'leader', 'officer', 'member'
  primary key (guild_id, user_id)
);

CREATE TABLE public.guild_events (
  id bigint generated always as identity primary key,
  guild_id uuid references public.guilds(id) on delete cascade,
  event_type text not null, -- 'boss_raid', 'memory_marathon', etc.
  target int, -- e.g., "defeat Boss Level 10 together"
  progress int default 0,
  created_at timestamptz default now()
);
```

**Guild-Features:**
1. **Guild Leaderboard:** Top 20 Guilds (Summe aller Member-Achievements)
2. **Shared Quests:** "All members complete Memory Level 5 = +10k Coins each"
3. **Guild Shop:** Members earn "Guild Coins" (parallel currency), können Cosmetics kaufen

**UI:**
- Guilds-Tab in Friends-View
- "Create Guild" Button (Kosten: 100k Coins)
- Guild-List sorted by member-count

---

## Phase 4: Monetization & Content (Ab Apr 2027)

### 4.1 Battle Pass / Season Pass

**Problem:** F2P-Only, keine Premium-Option

**Lösung:** Seasonal Battle Pass (14 Tage pro Season)

**Structure:**
- **Free Track:** 10 Belohnungen (Coins, Tier-Ei, Cosmetics)
- **Premium Track (1.000 Tickets):** +20 exklusive Belohnungen (Rare Tiers, Limited Cosmetics)
- Auto-Track: Minispiel-Stats sind "Experience Points"
  - Complete Wordle = +50 XP
  - Complete Parkour Level = +100 XP
  - Win Drift = +75 XP

**Seasonal Themes:**
- Q4 2026: "Dschungel-Season" (Dschungel-Skins, Panda-Tiere)
- Q1 2027: "Berg-Season" (Berg-Skins, Bergziege-Tier)
- Q2 2027: "Wüsten-Season" (Wüsten-Skins, Kamele)

---

### 4.2 Limited-Time Cosmetics (FOMO-Drive)

**Saisonal (zeitlich limitiert):**
- Dezember: Weihnachts-Outfit (Weihnachtsmannmütze, Rentier-Tier)
- Januar: Schnee-Outfit (Winter-Auto, Schnee-Panda)
- April: Oster-Egg-Cosmetic (Oster-Eier-Emotes)

**Event-Exklusiv:**
- Nach Memory-Event endet: "Memory-Champion"-Outfit nur für Top-100 Leaderboard

---

## Implementation-Roadmap

| Monat | Phase | Priorität | Story Points |
|-------|-------|-----------|--------------|
| Sep | Onboarding-Tour | 🔴 Critical | 13 |
| Sep | Starter-Quests | 🔴 Critical | 8 |
| Sep | UI-Simplify | 🟡 High | 5 |
| Okt | Weekly Events | 🟡 High | 13 |
| Okt | Cosmetics-Shop | 🟡 High | 13 |
| Nov | Friend-Challenges | 🟡 High | 8 |
| Nov | Achievements | 🟢 Medium | 13 |
| Dez | Prestige Mode | 🟢 Medium | 21 |
| Dez | Guild MVP | 🟢 Medium | 21 |
| Jan | Battle Pass | 🟢 Medium | 21 |
| Feb | Guild Shop | 🟢 Medium | 13 |
| Mar | Content Expansion | 🟢 Medium | 8 |

---

## Success Metrics

### Neulinge (Day 1–7)
- Tutorial-Completion: >70%
- Day-1-Retention: >50%
- Day-3-Retention: >35%
- Day-7-Retention: >25%

### Engagement (MAU)
- DAU/MAU Ratio: >30% (wöchentlich aktiv)
- Avg Session-Length: 15–25 Min
- Event-Partizipation: >50%
- Friend-Accept-Rate: >60%

### Monetization
- Paying-User Rate: 2–5% of DAU
- ARPU: $0.50–1.00 / Month
- LTV: $5–10 (lifetime)

---

## Known Risks

### Technical
- **WebGL Fallback:** iOS Safari kann Parkour/World laggy sein → Canvas-Fallback planen
- **Supabase Rate Limits:** Bei viral growth → Caching, connection pooling

### Design
- **Feature Creep:** Zu viele Events/Cosmetics = komplexe UI → Strict Prioritization
- **Balance:** Neue Tiere/Coins-Kosten müssen getestet sein → A/B vor Launch

### Market
- **Saturation:** Idle-Games sind massiv → Retention ist Key
- **Churn:** Typisch >80% nach Monat 1 → Wir zielen auf >30% Day-30

---

## Contributing

Siehe `AGENTS.md` & `CLAUDE.md` für Coding-Guidelines.

**Implementierungs-Steps:**
1. Öffne einen Plan in `docs/superpowers/plans/`
2. Folge der Task-Checkliste
3. Committe mit: `feat(feature-name): description`
4. Erstelle Draft-PR

---

**Nächste Review:** 2026-10-15  
**Community Feedback:** Discord (TBD)
