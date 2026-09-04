# Zoo Empire — Spieler-Erlebnis-Strategie (New & Retained Players)

**Datum:** 04.09.2026  
**Autor:** Claude Haiku 4.5  
**Status:** Entwurf → Strategische Planung

---

## Executive Summary

Zoo Empire verfügt über ein reichhaltiges Feature-Set (26+ Views, 8+ Minigames, 3D-Welt, Trading, Achievements-Grundlagen). Um Neulinge zu aktivieren und langjährige Spieler zu binden, braucht es:

1. **Klare Onboarding-Progression** → Neue Spieler wissen sofort, was zu tun ist
2. **Sichtbare Lang-Zeit-Ziele** → Endgame-Content & Achievements
3. **Regelmäßige Triggers** → Daily Quests, saisonale Events
4. **Social Loops** → Crews/Gilden, Herausforderungen mit Freunden

Diese Strategie priorisiert Impact × Aufwand und ist in 3 Phasen eingeteilt.

---

## Teil A: Gegenwärtiger Status

### Stärken (Was gut funktioniert)

| Feature | Impact | Zeichen |
|---|---|---|
| **Minigames** | 8 Spiele (Parkour, Drift, Wordle, Memory, Boss-Fight, Online-Memory, etc.) | ⭐⭐⭐ Engagement-Loop |
| **3D Zoo-Welt** | Multiplayer-Hub, Cosmetik-Shop, Brunnen-Daily | ⭐⭐⭐ Differentiator |
| **Tiersammlung** | 50+ Spezies, Rarität-System, Tauschmarkt | ⭐⭐⭐ Core Loop |
| **Trading-System** | Peer-to-Peer + Public Marketplace, Eier-Support | ⭐⭐ Social-Glue |
| **Offline-Verdienen** | Passive Coins bis 8h, Server-seitig validiert | ⭐⭐⭐ Retention |
| **Boss-Progressions** | Path (20 Stufen) + Endless-Mode | ⭐⭐ Skill-Content |
| **Shop-Rotation** | Wöchentliche Rotation, Eier integriert | ⭐⭐ Monetarisierungs-Vorbereitung |

### Lücken (Was fehlt)

| Bereich | Problem | Neuling | Veteranen | Prio |
|---|---|---|---|---|
| **Onboarding** | Keine strukturierte Einführung; `tutorialStep=5` versteckt. Tutorial-UI mangelhaft. | ⚠️ Kritisch | — | 🔴 P1 |
| **Achievements** | Keine Achievements-Seite; nur interne Store-Flags. Keine Public-Statistiken. | ⚠️ Kein Ziel | ⚠️ Keine Belohnung | 🟠 P2 |
| **Daily Quests** | `dailyReward` existiert, aber keine Quest-Reihe. Nur "komm rein"-Reward. | ⚠️ Kein Loop | ⚠️ Vorhersehbar | 🟠 P2 |
| **Events / Saisonal** | Keine Zeit-limitierten Events; `eventSchedule` leer. | — | ⚠️ Keine Eile | 🟠 P2 |
| **Guilds / Crews** | Nur Friends-Liste; keine strukturierten Teams mit Gilden-Quests. | — | ⚠️ Solo-Gefühl | 🟡 P3 |
| **Battle Pass** | Kein Season-Progress; Shop-Rotation ist nicht zeitgebunden. | — | ⚠️ Kein Sammel-Ziel | 🟡 P3 |
| **Progression Metrics** | Kein "Spieler-Level" oder sichtbare Metriken (außer Coins/Tiere). | ⚠️ Unsichtbar | ⚠️ Flach | 🟠 P2 |
| **Globale Leaderboards** | Leaderboard existiert, aber nur nach Coins. Keine Zeiträume (Weekly/Monthly). | — | ⚠️ Kurzzeitiger Anreiz | 🟡 P3 |

---

## Teil B: Neuling-Erlebnis (Days 1–7)

### Problem: "Was mache ich?"

**Szenario:** Spieler startet, sieht 26 Views mit Buttons. Keine klare Reihenfolge.

**Lösung:** Interaktives Tutorial mit optionalen "Tipp"-Overlays

#### Geplante Tutorial-Meilensteine

```
Schritt 1: Willkommen → Zoo kennenlernen (Welt-Tour, 30s)
Schritt 2: Erstes Tier kaufen → „Huhn" in Shop (geführt)
Schritt 3: Tap-Bonus nutzen → GameView Tap-Zone (leuchtet auf)
Schritt 4: Freund finden → FriendsView geöffnet, Invite-Link (geführt)
Schritt 5: Minigame spielen → Drift/Parkour Start mit 0-schwer Level (geführt)
Schritt 6: Offline-Verdienen aktivieren → Offline-Upgrade erklärt
Schritt 7: Tauschen lernen → TradeView mit Test-Offer (geführt)

Nach Schritt 7 → "Glückwunsch! Nun es dir selbst überlassen" + Roadmap-Link
```

**Implementierung:** `TutorialOverlay.vue` (Teleport-Modal) mit:
- Highlight (Spotlight-CSS) um aktuelle Zielbuttton
- I18N-Text (de/en/ru) je Schritt
- Skip-Optionen für erfahrene Nutzer
- `game.tutorialStep` bei Completion inkrementieren

**Geschätzter Aufwand:** 4 Stunden (UI + Store-Hook + Tests)

---

## Teil C: Retention & Endgame (Day 8+)

### 1️⃣ Achievements System (P2 — 2–3 Tage Arbeit)

**Was:** Sichtbare Ziele + Statistik-Tracking

**Beispiel-Categories:**
- 🐔 **Sammler:** 10/25/50 verschiedene Tiere besitzen
- ⭐ **Held:** Boss-Path Stufe 5/10/20 erreicht
- 🏆 **Parkour-Meister:** Level 8 im Parkour-Spiel
- 💰 **Reich:** 1M / 10M / 100M Coins verdient (lifetime)
- 🎮 **Spieler:** 100 / 1000 Minigames gespielt
- 👥 **Sozial:** 5 Freunde / 10 Tausche abgeschlossen

**Benefit:**
- **Neulinge:** Klare Ziele statt "Grind ohne Grund"
- **Veteranen:** Langfristiger Grund, zu spielen ("Alle Achievements freischalten")
- **Gamification:** Dopamin-Hits bei Unlock (Toast + Sound)

**Tech:**
- Tabelle `achievements` (id, key, name_i18n, condition_type, threshold, category)
- Tabelle `player_achievements` (user_id, achievement_id, unlocked_at)
- RPC `check_and_unlock_achievements()` (automatisch nach relevanten Aktionen)
- View `AchievementsView.vue` mit Filter + Progress-Bars

**Spec zu schreiben:** `docs/superpowers/specs/2026-09-XX-achievements-system-design.md`

---

### 2️⃣ Daily Quests (P2 — 1–2 Tage)

**Was:** Tägliche Mini-Aufgaben mit Belohnungen

**Beispiele:**
- Verdiene 100k Coins (Tap / Minigame)
- Spiele 3 Minigames
- Kaufe 2 neue Tiere
- Tausche mit einem Freund
- Besuche die Zoo-Welt

**Reward:**
- Pro Quest: 5k Bonus-Coins + 10 XP
- Daily Completion (5/5): +1 Premium-Ticket (Währung für exklusive Cosmetik)

**Tech:**
- Tabelle `daily_quests` (id, key, name_i18n, condition_type, target_qty)
- Tabelle `player_daily_progress` (user_id, quest_id, date, completed_qty, completed_at)
- RPC `claim_daily_quest_reward(quest_id)` (nach UI-Klick)
- Realtime-Listener auf `player_daily_progress` um Live-Counter zu aktualisieren
- HUD-Widget auf GameView: "3/5 Quests fertig" mit gelben Häkchen

**Diff zu Achievements:** Quests reset daily, Achievements sind permanent.

**Spec zu schreiben:** `docs/superpowers/specs/2026-09-XX-daily-quests-design.md`

---

### 3️⃣ Spieler-Level / XP System (P2 — 1 Tag)

**Was:** Sichtbarer Progress unabhängig von Coins

**Mechanik:**
- Pro Aktion +XP: Minigame (+50/Level), Tap (+1), Tier kaufen (+10), Quest (+20)
- Alle 500 XP → +1 Level (Level 1–50, dann Soft-Cap bei 1000 XP pro Level)
- Level-Reward: Coins, seltene Cosmetik, Boosts

**Benefit:**
- **Psychologisch:** "Du wirst stärker" auch ohne Tier-Upgrades
- **Social:** "Ich bin Level 23, du Level 15" auf Leaderboard
- **Monetarisierung-Ready:** Level-Bundles später verkaufen

**Tech:**
- Spalte `profiles.player_xp` + `profiles.player_level`
- RPC `award_xp(amount)` (automatisch aus anderen RPCs aufgerufen)
- Leaderboard-Seite: XP-basierte Rankings hinzufügen (neben Coins)

---

### 4️⃣ Saisonale Events (P3 — 3–5 Tage pro Event, dann wiederholen)

**Was:** Zeit-begrenzte Events mit exklusiven Rewards

**Beispiel-Event: "Safari-Saison" (alle 4 Wochen)**

```
Dauer: 14 Tage
Thema: 🦁 Safari-Tiere sammeln
Mechanic:
  - Shop: 3 Safari-Tiere (nur diese 14 Tage sichtbar) + Event-Cosmetik
  - Quest-Line: 
    * Tag 1: Kaufe ein Safari-Tier (Reward: 50k)
    * Tag 2: Spiele Parkour Level 6 (Reward: Safari-Outfit)
    * Tag 3: Tausche 2× mit Freunden (Reward: Safari-Leash)
  - Leaderboard: "Safari-Saison Ranking" (nur dieses Event, 14 Tage)
    Belohnung: Top 10 bekommen exklusives Safari-Trophy-Tier (goldener Löwe, nur zeitlich)
```

**Zweck:**
- **Neulinge:** "Action ist nötig!" → Aktivität-Spike
- **Veteranen:** "Ich muss alle Cosmetik bekommen" → FOMO-Engagement
- **Monetarisierung:** Premium-Event-Tickets später

**Implementierung:**
- Tabelle `events` (id, key, name, start_date, end_date, type, data_jsonb)
- RPC `get_active_events()` (Auto-gefilter nach Datum)
- `EventView.vue` generisch, liest Events aus DB
- Erste 3 Events hand-coded, dann Template.

---

### 5️⃣ Crews (Gilden) (P3 — 5–7 Tage, später als P1+P2)

**Was:** Player-Gruppen mit Crew-Quests & Bonuses

**Minimal MVP:**
- Crew gründen / beitreten (max 20 Spieler)
- Crew-Chat (einfach, Supabase Realtime)
- Crew-Bonus: +5% Coins / XP für Mitglieder
- Crew-Quest: "Mitglieder sollen zusammen 1M Coins verdienen" → Bonus für alle

**Tech:** Tabellen `crews` + `crew_members` + `crew_quests`, RPC `create_crew/join_crew/claim_crew_quest`

**Benefit:**
- **Retention:** Freundschafts-Glue ("Bleib in meiner Crew!")
- **Social:** Kleine Team-Identität
- **Future:** Battle Royale zwischen Crews, Season-Rewards pro Crew

---

## Teil D: Implementierungs-Roadmap

### Phase 1: Neuling-Erlebnis & Quick Wins (Wochen 1–2)

| Aufgabe | Geschätzt | Owner | Spec |
|---|---|---|---|
| TutorialOverlay.vue + Flow | 4h | — | Inline (8 Schritte) |
| GameStore: `tutorialStep` Hook | 2h | — | Inline |
| I18N: Tutorial-Strings (de/en/ru) | 1h | — | Inline |
| Tests: Tutorial-Flows | 2h | — | Inline |
| **Subtotal** | **9h** | | |

### Phase 2: Achievements + Daily Quests + XP (Wochen 2–4)

| Aufgabe | Geschätzt | Owner | Spec |
|---|---|---|---|
| Achievements: Spec schreiben | 2h | — | `2026-09-XX-achievements-system-design.md` |
| Achievements: DB + RPCs | 6h | — | 5 Migrationen |
| Achievements: Views + Store | 4h | — | `AchievementsView.vue` |
| Achievements: Tests | 3h | — | SQL + Jest |
| **Subtotal Achievements** | **15h** | | |
| Daily Quests: Spec | 2h | — | `2026-09-XX-daily-quests-design.md` |
| Daily Quests: DB + RPCs | 4h | — | 3 Migrationen |
| Daily Quests: Views + Store | 3h | — | HUD-Widget + QuestsView |
| Daily Quests: Tests | 2h | — | SQL + Jest |
| **Subtotal Daily Quests** | **11h** | | |
| XP System: Integrate into Achievements RPC | 2h | — | Inline in Achievements-Migrationen |
| XP: Leaderboard-View Update | 2h | — | Modify existing LeaderboardView |
| **Subtotal XP** | **4h** | | |
| **Phase 2 Total** | **30h** | | |

### Phase 3: Events + Crews (Wochen 5–8)

| Aufgabe | Geschätzt | Owner | Spec |
|---|---|---|---|
| Saisonale Events: Spec + 1. Beispiel-Event | 5h | — | `2026-09-XX-seasonal-events-design.md` |
| Events: DB + RPCs | 8h | — | 4 Migrationen |
| Events: EventView.vue (generisch) | 5h | — | Template + i18n |
| Events: Tests | 3h | — | SQL + Jest |
| **Subtotal Events** | **21h** | | |
| Crews: Spec | 3h | — | `2026-09-XX-crews-system-design.md` |
| Crews: DB + RPCs | 8h | — | 4 Migrationen |
| Crews: CrewView + UI | 6h | — | Supabase Realtime Chat |
| Crews: Tests | 2h | — | SQL + Jest |
| **Subtotal Crews** | **19h** | | |
| **Phase 3 Total** | **40h** | | |

**Großzahl:** 9h (P1) + 30h (P2) + 40h (P3) = **79 Stunden** (≈ 2 Wochen Vollzeit)

---

## Teil E: Metriken & Erfolg

### Neuling-Aktivierung (Tag 1–7)

| Metrik | Ziel | Messung |
|---|---|---|
| **Tutorial Completion Rate** | ≥ 60% | `players.tutorialStep >= 7` count / total |
| **First Animal Bought** | ≥ 80% | `.animals.length > 0` within 1 hour |
| **First Minigame Played** | ≥ 50% | minigame RPC calls within 6 hours |
| **D1 Retention** | ≥ 40% | Return within 24h / Login Day 1 |
| **D7 Retention** | ≥ 20% | Return within 7 days / Day 1 active |

### Retention (Day 8+)

| Metrik | Ziel | Messung |
|---|---|---|
| **MAU (Monthly Active)** | +30% (vs. pre-feature) | `players.last_seen >= 30 days` |
| **DAU (Daily Active)** | +25% | `players.last_seen = today` |
| **Avg Session Length** | +40% (von 8min auf 11min) | `game_sessions.duration_seconds avg` |
| **Achievement Unlock Rate** | ≥ 30% of all players | `player_achievements.count / profiles.count` |
| **Quest Completion Rate** | ≥ 60% (daily quest starters) | `player_daily_progress.completed / started` |
| **Friends Added** | +50% (collaboration effect) | `friends.created_at >= launch_date` |

### Monetarisierungs-Ready Metriken

| Metrik | Baseline | Ziel |
|---|---|---|
| **Cosmetics Equipped** | 5% | 15% (mehr Outfit-Kombos) |
| **Battle Pass Intent** | — | +40% würden Premium-Pass für Events kaufen |
| **Premium Cosmetics Interest** | — | +50% after Event Shop launch |

---

## Teil F: Risk & Abhilfemaßnahmen

| Risiko | Warnsignal | Lösung |
|---|---|---|
| **Tutorial ist zu lang** | > 20% Skip-Rate | Schritte 4–7 opt-in machen |
| **Achievements sind unklar** | < 20% unlock-Rate nach Woche 1 | In-Game Hints + Progress-Bars |
| **Daily Quests sind zu schwer** | < 30% completion-Rate | Rewards auf 3/5 reduzieren |
| **Events FOMO backfires** | User-Feedback: "Zu stressig" | Event-Länge von 14 → 21 Tage |
| **Crews fragmentieren** | Smalltalks dominieren Chat | Moderations-Bot + Report-System |

---

## Teil G: Priorität & Go/No-Go

### Sofort (Diese Woche)

- ✅ **Spec schreiben** für Tutorial + Achievements + Daily Quests (4h)
  - `docs/superpowers/specs/2026-09-XX-tutorial-onboarding-design.md`
  - `docs/superpowers/specs/2026-09-XX-achievements-system-design.md`
  - `docs/superpowers/specs/2026-09-XX-daily-quests-design.md`

### Nächste Woche (Sprint 1)

- 🟠 **Tutorial implementieren** (Phase 1, 9h)
- 🟠 **Achievements DB + Basics** (Phase 2 start, 8h)

### Wochen 3–4 (Sprint 2)

- 🟠 **Achievements Views + XP-System** (Phase 2 finish, 15h)
- 🟠 **Daily Quests** (Phase 2 finish, 11h)

### Wochen 5+ (Sprints 3–4)

- 🟡 **Events + Crews** (Phase 3, wenn P1+P2 stabil)

---

## Anhang: Feature-Matrix (Impact × Aufwand)

```
            EINFACH              MITTEL               SCHWER
HOHER    ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
IMPACT   │ ✅ Tutorial  │    │ ✅ Achievem. │   │ ❓ Guilds    │
         │  (4h, -0.5d)  │    │ (15h, +2d)   │   │ (19h, +3d)   │
         └──────────────┘    └──────────────┘   └──────────────┘
         
MITTEL   ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
IMPACT   │ ✅ XP-Meter  │    │ ✅ Daily Q.  │   │ ❓ Events    │
         │  (4h, -0.5d)  │    │ (11h, +2d)   │   │ (21h, +3d)   │
         └──────────────┘    └──────────────┘   └──────────────┘

NIEDRIG  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
IMPACT   │   Weekly LB  │    │ Monthly Pass │   │ PvP Arena    │
         │   (2h, +0.5d) │    │  (8h, +1d)   │   │ (30h, +5d)   │
         └──────────────┘    └──────────────┘   └──────────────┘

Legend:  ✅ = Sofort starten (P1/P2)
         ❓ = Später (P3, falls Zeit)
         (h = Geschätzte Stunden; d = Veröffentlichungs-Verspätung)
```

---

## Schlussfolgerung

Zoo Empire braucht **jetzt** einen Fokus auf **strukturierte Neulinge-Erfahrung** und **sichtbare Langzeitziele**. Mit den vorgeschlagenen Features werden:

- **Neulinge:** Klare Schritte statt Verwirr-Erlebnis → +30–50% D7-Retention
- **Veteranen:** "Immer etwas Neues" statt Plateau → +25–40% MAU-Wachstum
- **Geschäft:** Psychological Hooks für Premium-Events → +10–20% ARPU (später)

**Recommendation:** Beginne mit Tutorial (P1) diese Woche, dann Achievements+Daily Quests (P2) parallel. P3 (Events/Crews) nur wenn P1+P2 stabil.

---

**Nächste Schritte:**

1. Lese diese Strategie durch (30 min)
2. Schreib Specs für Tutorial + Achievements + Daily Quests (4h, diese Woche)
3. Erstelle PR für diese Strategie-Datei
4. Priorisiere einen Spec zur Implementierung (Tutorial empfohlen)
5. Beginn Development im Mainline-Branch oder Feature-Branch
