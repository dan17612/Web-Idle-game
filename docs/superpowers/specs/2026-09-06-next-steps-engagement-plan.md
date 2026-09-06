# Zoo Empire — Engagement & Retention Plan 2026-09

## Executive Summary

Das Spiel hat solide Grundmechaniken (passive Einkommen, Minigames, Sozial-Features). Um **Neueinsteiger zu halten** und **bestehende Spieler zu engagieren**, braucht es:

1. **Onboarding**: strukturierte Tutorial-Quest für die ersten 15 Min
2. **Progression**: klare Ziele + Belohnungen (z. B. Tier-Levels, Daily Quests)
3. **Seasonale Events**: zeitlich begrenzte Herausforderungen (Coins + exklusive Kosmetik)
4. **Kosmetik-System**: Tier-Skins, Emotes, Welten-Customization
5. **Endgame-Ziele**: Sammlerziele, Boss-Raids, leaderboard Prestige

---

## 1. Tutorial & Onboarding (Woche 1 Neuspieler)

### Problem
- Neue Spieler sehen die Farm, verstehen aber nicht, was sie tun sollen
- Keine Anleitung für die 3 Minigames und deren Belohnungen
- Einkommen-Mechanic ist nicht erklärt

### Lösung: Quest-basiertes Tutorial

#### Phase 1: Farm-Basics (5 Min)
```
Quest 1: "Kaufe dein erstes Tier"
  → Zeige Shop-Button
  → Kaufe günstigstes Tier (Küken)
  → +50 Coins Bonus
  → Entsperre nächste Quest

Quest 2: "Zapfe Münzen aus der Farm"
  → Erkläre: Tiere = passives Einkommen
  → Tipp: Klick auf Farm für Speed-Up
  → Verdiene 100 Coins (mit Anleitung)
  → Erste "Daily Bonus" Unlocked

Quest 3: "Öffne dein Inventar"
  → Klick auf Inventar-Tab
  → Sehe deine Tiere
  → Erkläre Tier-Levels & Upgrade-Kosten
```

#### Phase 2: Minigames (10 Min)
```
Quest 4: "Spiele erste Memory-Runde"
  → Öffne Memory-Minigame
  → Gewinne 1x (leicht gemacht)
  → +100 Coins + 5 Tickets Bonus

Quest 5: "Versuche Parkour"
  → Kurzes Tutorial zum 3D-Kontrollz
  → Ziel: 50 m erreichen (sehr leicht)
  → +50 Coins + 2 Tickets

Quest 6: "Fahre ein Drift-Rennen"
  → Leichter 1x-Rennen
  → +50 Coins + 2 Tickets
```

#### Phase 3: Sozial (5 Min)
```
Quest 7: "Besuche einen anderen Zoo"
  → Öffne World / Players Liste
  → Besuche einen Player
  → +10 Coins

Quest 8: "Schicke erste Münze an Freund"
  → Erkläre: Send-View
  → Sende 10 Coins (großer Bonus trotzdem)
  → Freundschafts-Badge
```

#### UI-Details
- **Quest-Tracker**: oben auf GameView, nur aktive Quest
- **Highlighting**: Glow-Effekt auf korrektem Button
- **Tipps**: `<Tooltip>` dass verschwindet nach Aktion
- **Early-Exit**: Quest-Skipping möglich (bei Wiederholer)

---

## 2. Daily Quests & Progression

### Problem
- Sessions sind zu kurz (User login, verdienen 100 Coins, logout)
- Keine Anreize für Daily Return

### Lösung: Daily Quest System

#### Schema
```sql
CREATE TABLE daily_quests (
  id uuid PRIMARY KEY,
  player_id uuid REFERENCES profiles NOT NULL,
  quest_type text, -- 'minigame', 'earn', 'social', 'explore'
  target_value int, -- z.B. 5 Parkour-Runs
  progress int DEFAULT 0,
  reward_coins int,
  reward_tickets int,
  completed_at timestamp,
  created_at timestamp DEFAULT now(),
  UNIQUE(player_id, created_at::date, quest_type)
);
```

#### Quest-Types & Belohnungen
```
Täglich 3 Quests (rotierend):

1. "Minigame-Meister"
   - Spieltyp: wechselt täglich (Memory, Parkour, Drift, Wordle)
   - Ziel: 3 Runden spielen
   - Belohnung: 150 Coins + 5 Tickets

2. "Wealth-Builder"
   - Ziel: 500 Coins verdienen (passiv oder aktiv)
   - Belohnung: 100 Coins Bonus

3. "Social-Butterfly"
   - Ziel: einen Player besuchen ODER einen Gift senden
   - Belohnung: 75 Coins + 2 Tickets

4. "Zoo-Explorer"
   - Ziel: World betreten + 100 m laufen
   - Belohnung: 100 Coins + 1 Ticket
```

#### UI-Integration
- **Quest-Kartenreihe** auf GameView (unter Tier-Übersicht)
- **Progress-Balken** für aktive Quests
- **Claim-Button** für fertige Quests
- **Tomorrow's Preview** (ein Quest-Teaser für Morgen)

#### RPC: `claim_daily_quest`
```sql
-- Input: player_id, quest_type, created_at::date
-- Checks: progress >= target_value, quest not already claimed today
-- Output: coins, tickets, quest_id
-- Security: DEFINER, nur auth spieler self
```

---

## 3. Seasonal Events (2-wöchig)

### Problem
- Spiel fühlt sich statisch an
- Keine "special" Momente im Kalender

### Lösung: Mini-Events alle 2 Wochen

#### Event 1: "Safari-Woche" (Vorexistierend: Safari Eggs)
- **Dauer:** Mo–So (1 Woche)
- **Mechanic:** Mit Tickets Eier klicken → Seltenheit steigt nach Events
- **Exklusiv:** Safari-only Tier-Skins
- **Belohnung:** Leaderboard Top 50 = exklusives Emote

#### Event 2: "Boss-Rush" (Neu)
- **Dauer:** Di–Do
- **Mechanic:** Täglicher Special Boss + Multiplayer-Raid (Freunde)
- **Koordination:** Discord/In-Game Notification
- **Belohnung:** Boss-Kills × 10 = ein Tier-Level + 200 Coins
- **Exclusives:** Boss-spezifisches Tier-Skin (nur von dieser Boss-Woche)

#### Event 3: "Grand Prix" (Neu)
- **Dauer:** Fr–So (Wochenende)
- **Mechanic:** Drift-Turnier (bestes Score) + Memory-Blitz-Runde
- **Leaderboard:** Live-Ranking mit Top 10 Prämien
- **Belohnung:** Gold/Silber/Bronze-Medaille-Emote + Coins

#### Kalender-Ansicht
```
RoadmapView → "Events" Tab
- Zeige nächste 4 Events
- Live-Event: Progress-Balken + Countdown
- Vorbei-Events: "Replay später"
```

---

## 4. Kosmetik-System

### Problem
- Tiere sehen alle gleich aus
- Keine visuellen Unterschiede = weniger Stolz auf Zoo

### Lösung: Tier-Skins + Emotes

#### Tier-Skins
```sql
CREATE TABLE cosmetic_skins (
  id uuid PRIMARY KEY,
  animal_species text, -- 'chicken', 'dragon', etc.
  skin_name text, -- "Weihnacht Huhn", "Safari Panda"
  rarity text, -- 'common', 'rare', 'epic', 'legendary'
  source text, -- 'shop', 'event', 'bp', 'quest'
  price_coins int,
  price_tickets int,
  event_id uuid, -- wenn event-exclusive
  preview_image_url text,
  created_at timestamp
);

CREATE TABLE player_cosmetics (
  id uuid PRIMARY KEY,
  player_id uuid REFERENCES profiles,
  skin_id uuid REFERENCES cosmetic_skins,
  unlocked_at timestamp,
  equipped_at timestamp, -- null = nicht verwendet
  animal_id uuid, -- Welches Tier trägt diesen Skin?
  UNIQUE(player_id, skin_id)
);
```

#### Skins nach Tier (Beispiele)
```
Chicken:
  - "Garden Hen" (standard)
  - "Gold Chicken" (200 Coins, buy)
  - "Safari Chicken" (event-exclusive, event:safari)
  - "Cyber Chicken" (epic, seasonal BP)

Dragon:
  - "Ancient Dragon" (standard)
  - "Fire Dragon" (event:boss-rush week 1)
  - "Diamond Dragon" (legendary, 50k coins)
  - "Icy Dragon" (seasonal pass tier 50)
```

#### Emotes
```
Player-emotes (nicht tier-specific):
  - 🎉 "Party" (default)
  - 💎 "Rich" (event reward)
  - 👑 "King" (leaderboard top 10)
  - 🚀 "Rocket" (seasonal pass)
```

#### UI: Inventory → Cosmetics Tab
```
Grid: [Skin 1] [Skin 2] [Not Owned]
  - Click: Preview (3D Dreh des Tiers mit Skin)
  - "Equip" / "Unequip" button
  - Rarity-Star (★★★★)
  - Source-Badge ("Event", "Shop", "Pass")
```

---

## 5. Season Pass (optional, later Phase)

### Kostenlos-Tier
```
50 freie Levels:
  - Level 1: +50 Coins
  - Level 10: Emote "Party"
  - Level 25: +1000 Coins + Skin
  - Level 50: +5 Tickets + Leaderboard-Emblem
```

### Premium-Tier (optional: 3–5 USD/mo)
```
50 exklusive Levels:
  - Epische Skins
  - +50% Coins in Minigames
  - Daily Bonus boost
  - Cosmetics Bundle
```

---

## 6. Endgame-Progression

### Problem
- Max-Level Spieler: "Was jetzt?"
- Keine Meta für spekulativen Hardcore-Play

### Lösung: Ziele-System + Prestige

#### Ziele (Achievements)
```sql
CREATE TABLE achievements (
  id uuid PRIMARY KEY,
  player_id uuid,
  achievement_type text, -- 'collector', 'wealth', 'master', 'social'
  milestone int, -- 10, 100, 1000
  unlocked_at timestamp,
  UNIQUE(player_id, achievement_type, milestone)
);

-- collector: "Sammle N Tier-Arten" (10/50/200)
-- wealth: "Verdiene N Coins total" (100k / 1M / 100M)
-- master: "Gewinne N Minigame-Runden" (100/1k/10k)
-- social: "Schicke N Coins" (500/5k/50k)
```

#### Sammler-Büchlein
```
Inventory → "Codex"
- Alle 10 Tier-Arten mit Portrait
- Skin-Gallery (erwerbbare anzeigen)
- Emote-Gallery
- Tracker: "9/10 Arten"
- Belohnung: +200 Coins beim Abschluss
```

#### Prestige (Optional, sehr später)
- Max-Level → "Reset" → Double-Boost bis nächstes Max
- Leaderboard: "Prestige 1", "Prestige 2"

---

## 7. World / Zoo-Customization

### Problem (World-Modul)
- Zoo ist funktional, aber nicht personal

### Lösung: Deco-Items + Themes

#### Deco-Items (Supabase: `world_items`)
```
- Fountain (gratis start)
- Tree (50 Coins)
- Bench (100 Coins)
- Garden Light (event-exclusive)
- Theme: "Summer", "Winter", "Night" (kosmetisch)
```

#### Buy-Flow
```
World → Long-Press Platz → "Buy Decoration" → Select → Confirm
RPC: world_buy_item (player_id, item_id, plot_id)
  → checks coins, plot empty, award
```

---

## 8. Implementation Roadmap

### Phase 1: Onboarding (Sprint 1–2)
- [ ] Quest-Datatable + RPCs
- [ ] QuestTracker UI (GameView)
- [ ] 8 Intro-Quests
- [ ] Quest-Highlighting & Tips
- Tests: Neuling kann alle Quests in 15 Min lösen

### Phase 2: Daily Quests (Sprint 2–3)
- [ ] daily_quests Tabelle
- [ ] 4 Quest-Types implementieren
- [ ] Daily-Quest UI-Kartenreihe
- [ ] RPC `claim_daily_quest`
- Tests: Quest-Logik (progress tracking, claims)

### Phase 3: Seasonale Events (Sprint 3–4)
- [ ] events Tabelle (campaign_id, start_at, end_at, type)
- [ ] Event-Details UI (countdown, leaderboard)
- [ ] Boss-Rush mechanic
- [ ] Grand Prix Minigame-Kombination
- Tests: Event-Timing, Reward-Verteilung

### Phase 4: Kosmetik (Sprint 4–5)
- [ ] cosmetic_skins + player_cosmetics Tabellen
- [ ] Skin-Shop UI
- [ ] 3D Skin-Preview (Three.js in Modal)
- [ ] Equip-Flow
- Tests: RLS auf Cosmetics, Doppel-Buys verhindern

### Phase 5: Endgame & Polish (Sprint 5–6)
- [ ] Achievements-System
- [ ] Codex-UI (Sammler-Galerie)
- [ ] World-Decorations
- [ ] Prestige-Preview (Docs nur)
- Tests: User-Flow für alle Features

---

## 9. Design-System Richtlinien (Für Implementierer)

### Tokens für neue Features
- `--event-bg`: heller Gradient für Event-Highlights (z.B. lila-gold)
- `--success`, `--warning`, `--info`: für Quest-Status
- `--cosmetic-rare`, `--cosmetic-epic`: für Rarity-Tags

### Komponenten-Erweitertungen
- `<QuestCard>`: Neu
- `<EventBanner>`: Neu (mit Countdown)
- `<CosmeticPreview>`: Neu (mit Rotate-3D)
- `<AchievementBadge>`: Neu

### i18n-Keys (neuer Namespace `engagement_*`)
```
engagement_quest_title_1 = "Buy your first animal"
engagement_event_safari = "Safari Week"
engagement_cosmetic_rare = "Rare"
// ... etc
```

---

## 10. Erfolgs-Metriken

Nach Implementierung messen:

1. **Onboarding-Retention**: % Nutzer der 8 Quests abschließen (Ziel: 80%)
2. **Daily-Return**: % MAU die täglich zurückkommen (Ziel: +50%)
3. **Event-Engagement**: % Spieler teilnehmen an ≥1 Event (Ziel: 70%)
4. **Cosmetic-Revenue** (wenn monetisiert): Avg $ pro Spieler/mo
5. **Playtime**: Avg Session-Länge (Ziel: +5 Min)

---

## 11. Weitere Überlegungen

### Nicht in dieser Phase
- **PvP-Kämpfe**: Komplexe Balancing-Anforderung, später
- **Clans/Guilds**: Soziales Feature, Q4 2026
- **Battle Pass Monetization**: Erst nach Kosmetik-Launch testen
- **NFTs**: Bewusst ausgelassen (Überverkomplizierung)

### Tech-Schulden
- Migrationen: alle neuen Tabellen brauchen RLS + REVOKE checks
- Tests: SQL-Regex-Tests für alle RPCs (`src/*Sql.test.js`)
- E2E: Minigame-Events brauchen E2E-Coverage

---

## Anhang: Quick-Links

- **Existing Specs**: `docs/superpowers/specs/`
- **Minigame-Designs**: 
  - Memory: `2026-05-15-memory-game-design.md`
  - Parkour: `2026-06-29-zoo-parkour-3d-design.md`
  - Drift: (in `DriftGameView.vue` + `src/driftTrack.js`)
  - Wordle: `2026-07-17-zoo-wordle-design.md`
- **World Feature**: `2026-08-03-zoo-welt-design.md`
- **Codebase Guide**: `AGENTS.md`
