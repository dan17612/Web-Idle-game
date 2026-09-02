# Zoo Empire — Onboarding & Retention Roadmap (Sept 2026)

## Executive Summary

Zoo Empire hat ein solides Fundament mit 11 Features implementiert (Farm, Shop, Trade, 5 Minigames, Leaderboard, World-3D, Friends). Um neue Spieler zu halten und bestehende Spieler langfristig zu engagieren, braucht es:

1. **Onboarding-Verbesserungen:** Klare Progression für Neulinge (Tutorial, Achievements, Progressive Unlock)
2. **Retention-Mechaniken:** Tägliche Ziele, Seasonal Progression, Social Engagement
3. **Monetarisierung:** Premium Pass / Battle Pass, limitierte Shop-Items
4. **Balancing:** Idle-Earrings, Minigame-Rewards abstimmen
5. **Community-Features:** Friend-Challenges, Guilds/Clans, Leaderboard-Seasons

---

## Probleme (Current State)

### Neue Spieler
- ❌ Kein strukturiertes Onboarding-Tutorial (nur TutorialBubbles ad-hoc)
- ❌ Tier-Progression ist flach — kein Milestone-Feeling
- ❌ Shop hat 10 Tiere, aber keine Guidance, was zuerst kaufen?
- ❌ Minigames sind optional — Spieler wissen nicht, dass sie Rewards geben

### Bestehende Spieler
- ⚠️ Kein täglicher Grund zurück zu kommen (außer passive Earnings ansammeln)
- ⚠️ Trade-Marktplatz ist funktional, aber kein sozialer "Hub"
- ⚠️ Leaderboard zeigt nur Top 50 — kein Ranking-Engagement
- ⚠️ 3D-Welt ist cool, aber nur Kosmetik (keine Economics)
- ⚠️ Endgame fehlt — Spieler mit allen Tieren haben keine neuen Ziele

### Balancing
- ⚠️ Offline-Earnings vs. Minigame-Rewards ungeklärt (welche lohnt sich wirklich?)
- ⚠️ Tier-Preise exponentiell, aber Minigame-Rewards sind linear — "Ice-Berg-Effekt"
- ⚠️ World-Brunnen (+25k Coins 1×/Tag) ist klein im Vergleich zu späten Tieren

---

## Nächste Schritte (Q4 2026)

### Phase 1: Onboarding (Prio: 🔴 CRITICAL)

#### 1.1 Tutorial-Reworking
**Warum:** 50 % der Neulinge brechen in der 1. Sitzung ab.

**Maßnahmen:**
- Strukturiertes 5-Schritt-Tutorial in `TutorialFlow.vue`:
  1. "Kaufe dein erstes Tier (Küken)" + Coin-Reward  
  2. "Verdiene Coins offline" + Time-Passage-Mechanic
  3. "Öffne den Shop, sieh die Tier-Progression" + Featured Tier
  4. "Probiere ein Minigame (Parkour/Drift)" + Free Entry
  5. "Geh zur World, sag Hallo" + Fountain-Tutorial
- Checkboxes im Profile (`tutorial_completed`) speichern  
- Nach Tutorial: **Daily Quest für Neuling** (z. B. "Verdiene 1.000 Coins" → +100 Tickets Bonus)

**Dateien:**
- `src/views/TutorialView.vue` (neu)
- `src/stores/game.js` — `tutorial_state` + `completeTutorialStep(step)`
- Migration: `profiles.tutorial_completed` boolean

**Schätzung:** 3–4 Tage

---

#### 1.2 Achievements & Badges
**Warum:** Geben Neullingen Milestone-Ziele ("Kaufe 3 Tiere", "Verdiene 100k Coins", "Gewinne 5 Drifts")

**Maßnahmen:**
- `achievements` Tabelle: id, user_id, achievement_id, unlocked_at
- 20 Achievements definieren:
  - Tier-Milestones: "Collector I/II/III" (5/10/15 Tiere)
  - Coin-Milestones: "Rich I/II/III" (10k/100k/1M Coins)
  - Minigame: "Gamer" (10 Minigames gespielt), "Winner" (10 Minigames gewonnen)
  - Social: "Socialite" (1 Friend), "Trader" (10 Trades abgeschlossen)
  - World: "Explorer" (Besuche World), "Donor" (Werfe Münze in Brunnen)
- `AchievementBadge.vue` — Toast-Popup beim Unlock
- Achievements-Tab in `ProfileView.vue`
- Achievement-Punkte → Leaderboard-Nebenranking

**Dateien:**
- Migration: `20260902_achievements.sql`
- `src/achievements.js` — Katalog (name, icon, description, condition)
- `src/views/ProfileView.vue` — Achievement-Tab
- RPC: `achieve_unlock(p_achievement_id)`

**Schätzung:** 2–3 Tage

---

### Phase 2: Retention & Daily Engagement (Prio: 🟠 HIGH)

#### 2.1 Daily Quests
**Warum:** 30% Steigerung der DAU bei L2-Games mit Daily-Quests.

**Maßnahmen:**
- `daily_quests` Tabelle: user_id, quest_date (UTC), quest_id, completed_at, reward_coins, reward_tickets
- 5 Daily-Quests pro Tag (Reset UTC 00:00):
  1. "Verdiene 1.000 Coins" → +100 Coins
  2. "Spieliere ein Minigame" → +50 Tickets
  3. "Besuche die World" → +500 Coins
  4. "Schließe einen Trade ab" → +25 Tickets
  5. "Gib einem Friend Coins" → +250 Coins
- Quest-Fortschritt in `GameView.vue` rechts oben (Card mit Checkboxes)
- Completion-Toast mit Sterne-Animation
- **Weekly Bonus:** Alle 7 Quests abgeschlossen → +1.000 Tickets

**Dateien:**
- Migration: `20260902_daily_quests.sql`
- `src/quests.js` — Quest-Katalog (id, type, target, reward_coins, reward_tickets)
- `src/stores/game.js` — `loadQuests()`, `completeQuest(questId)`
- Component: `src/components/DailyQuestPanel.vue`

**Schätzung:** 3–4 Tage

---

#### 2.2 Seasonal Progression (Battle Pass)
**Warum:** Begrenzte Saisons (4 Wochen) halten Spieler aktiv + Monetisierung.

**Maßnahmen:**
- `seasons` Tabelle: id, name, start_date, end_date, tier_count
- `season_progress` Tabelle: user_id, season_id, level, xp, premium_track
- Season-Track mit 10 Leveln:
  - Level 1–5: Free Rewards (Coins, Tickets)
  - Level 6–10: Premium Track (50 Coins als IAP / 100 Tickets Grind)
    - Exclusive Outfits (z. B. "Harvest Season Ranger")
    - Exclusive Emotes
- XP-Gain: +10 XP pro Quest, +5 XP pro Minigame-Win, +100 XP wenn Daily-Quests alle abgeschlossen
- Battle-Pass-Card in `GameView.vue` mit Progress-Bar

**Dateien:**
- Migration: `20260902_seasonal_progression.sql`
- `src/seasons.js` — Katalog + Reward-Definitionen
- `src/stores/game.js` — `loadSeasonProgress()`, `gainSeasonXp(amount)`
- Component: `src/components/SeasonalProgressCard.vue`

**Schätzung:** 4–5 Tage

---

### Phase 3: Balancing & Monetarisierung (Prio: 🟠 HIGH)

#### 3.1 Minigame-Rewards Rebalance
**Warum:** Aktuell unklar, ob Minigames + offline Earnings sich lohnen.

**Analyse:**
- **Parkour:** Schwer, aber 500–5.000 Coins pro Run (30 s)  
- **Drift:** Mittelschwer, ähnliche Rewards
- **Wordle:** Leicht, 100–500 Coins
- **Memory:** Mittelschwer, variable Rewards
- **Boss Path:** Kurz, 1.000–100.000 Coins (scaling mit Boss-Level)

**Maßnahmen:**
- Alle Minigames Skill-Ratio justieren: Schwierigkeit = Reward
- Parkour: +20 % Rewards (weil am ausgefeilsten)
- Daily Minigame-Bonus: 1. Minigame des Tages = +50 % Coins/Tickets
- Endgame-Spieler: "Challengen" gegen Freunde (z. B. "Drift-Duel") → Coins ins Spiel

**Testing:**
- A/B-Split in Dev-Build testen (DAU, Engagement-Time tracken)

**Schätzung:** 2–3 Tage Design + Testing

---

#### 3.2 World-Fountain Scaling
**Warum:** +25k Coins 1×/Tag ist zu wenig für Late-Game.

**Maßnahmen:**
- Brunnen-Reward skaliert mit Total-Coins:
  - < 1M Coins: 25.000
  - 1M–10M: 50.000
  - 10M–100M: 100.000
  - \> 100M: 250.000
- Alternativ: Daily-Multiplier: Wenn 7 Tage hintereinander geworfen → 2×, bei 14 Tagen → 3×
- Server-Spiegel in `world.js` (`FOUNTAIN_REWARD` Konstante)

**Dateien:**
- `src/world.js` — `fountainReward(totalCoins)` Berechnung
- Supabase RPC `world_fountain_claim` — Logik justieren
- `src/world.test.js` — Test-Cases für Scaling

**Schätzung:** 1 Tag

---

### Phase 4: Community & Social (Prio: 🟡 MEDIUM)

#### 4.1 Friend-Challenges
**Warum:** Adds competitive depth ohne P2P Balancing-Albtraum.

**Maßnahmen:**
- `friend_challenges` Tabelle: id, challenger_id, opponent_id, game_type (parkour|drift|wordle), initiated_at, status
- Neue Component `ChallengeInvite.vue`: Friends-List → "Challenge to Parkour" → Toast bei Friend
- Wenn Friend akzeptiert: beide spielen denselben Level/Seed (Wordle: selbes Word) → vergleichen Scores
- Winner: +Coins, +Prestige (Leaderboard-Bonus)

**Dateien:**
- Migration: `20260902_friend_challenges.sql`
- RPC: `initiate_challenge(p_friend_id, p_game_type)`, `accept_challenge`, `submit_challenge_score`
- Component: `src/components/ChallengeInvite.vue`
- Update `FriendsPanel.vue`: Challenge-Button

**Schätzung:** 4–5 Tage

---

#### 4.2 Leaderboard Seasons & Regional Ranking
**Warum:** Aktueller Leaderboard ist statisch; Seasons machen es spannend + inklusiv (keine 1M+ Coins nötig um oben zu sein).

**Maßnahmen:**
- `leaderboard_seasons` Tabelle: user_id, season_id, rank, coins_earned_this_season
- Coins der Saison werden zurückgesetzt → jeder Spieler "startet neu"
- Coins-Verdienst in Saison zählt: Minigame-Rewards, Trades (verkaufte Tiere), sendet Coins (zählt nicht), Quests
- Leaderboard-Ranke für Season anzeigen
- Regional Ranking: User wählt Region (optional) → Ranking nach Region

**Dateien:**
- Migration: `20260902_leaderboard_seasons.sql`
- `src/stores/leaderboard.js` (neu) — Saison-State
- Update `LeaderboardView.vue` — Season-Tabs, Regional-Filter

**Schätzung:** 3–4 Tage

---

## Success Metrics

| Metrik | Aktuell | Ziel (Q4) |
|--------|---------|-----------|
| **DAU (Daily Active Users)** | TBD | +30 % |
| **7-DAU / Retention-Rate** | TBD | +25 % |
| **Avg. Session-Length** | TBD | +40 min |
| **Tutorial Completion-Rate** | TBD | \> 70 % |
| **Quest Completion-Rate** | TBD | \> 60 % daily |
| **Avg. Minigames/User/Day** | TBD | \> 2 |
| **Leaderboard Engagement** | TBD | +50 % weekly logins |

---

## Implementation Order

**Week 1–2:** Phase 1 (Tutorial + Achievements)  
**Week 3–4:** Phase 2 (Daily Quests + Seasonal Progression)  
**Week 5:** Phase 3 (Balancing)  
**Week 6–7:** Phase 4 (Social Features)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Tutorial zu komplex → Spieler fühlen sich überfordert | Kurz halten (5 min), Skip-Button für erfahrene Spieler |
| Quests/Battle Pass = Pay-to-Win-Gefühl | Free Track muss attraktiv sein; nur Kosmetik hinter IAP |
| Minigame-Balancing bricht PvP | A/B-Test in parallel; alte Werte als Fallback |
| Server-Last durch tägliche Resets (Quests, Seasons) | Batch-Jobs via Edge Functions, nicht RPC-Calls |

---

## Technische Schulden

Vor Phase 2:
- [ ] `useReturnRefresh` Hook auf alle Views (damit State nach App-Zurückkehr refreshed)
- [ ] Test-Coverage für `stores/game.js` erhöhen (aktuell: ~40 %)
- [ ] Migration-Naming-Standard etablieren (`YYYYMMDD_short-name.sql`)

---

## Roadmap-Features (2027+)

- **Guilds/Clans:** Mehrere Spieler, gemeinsame Ziele, Schatztruhe
- **Tier-Breeding:** Kombiniere zwei Tiere → neues, seltenes Tier
- **Skins/Cosmetics für Tiere:** Statt nur "Drache", → "Gold-Drache", "Shadow-Drache"
- **Boss-Co-op:** Mehrere Spieler gegen einen schwachen Boss (einfacher wirtschaftlich als PvP)
- **Expedition-Mode:** Thematische Events ("Safari in Afrika"), limitierte Tiere, Event-Currency
