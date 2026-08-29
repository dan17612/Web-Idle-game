# Zoo Empire — Engagement Strategy für Neulinge & Bestandsspieler

**Ziel:** Das Spiel macht neu installierten Spielern Spaß in den ersten 5 Minuten (Aha-Momente + Belohnungen) und hält Bestandsspielern mit gezieltem Endgame-Content aktiv.

---

## Phase 1: Neulinge — First 5 Minutes (Wochen 1–2)

### Problem
- Keine geleitete Einführung: Spieler landen bei der Startseite, wissen nicht, was sie tun sollen
- Reward-Verzögerung: Bis zur ersten Tierbelohnung sind mehrere Minuten Taps nötig
- Feature-Überfluss: Zu viele Tabs/Buttons, Fokus unklar

### Lösung: **Progressive Tutorial mit Aha-Momenten**

| # | Feature | Aktion | Reward |
|---|---------|--------|--------|
| 1 | **Tap Starter** | 5× auf Favorite tippen (Anleitung mit Bubble) | +100 Coins → sofort sichtbar |
| 2 | **Erstes Tier kaufen** | Shop öffnen, billiges Tier (50 Coins) kaufen | Tier animiert in Inventar, Lautsound |
| 3 | **Laufen** (`/idle`) | Favorit zum Laufen setzen | Coins-Passive sichtbar, Countdown-Timer |
| 4 | **Minispiel-Taste** | Erste Drift/Wordle starten | Quick-Belohnung (+50 Coins) |
| 5 | **Welt besuchen** | `/world` betreten, anderen Spieler sehen | Social-Wow-Effekt, Emote senden |
| 6 | **Brunnen-Münze** | 1. Fountain-Claim | +25k Coins (großer Dopamine-Hit) |

**Implementation:**
- `src/components/TutorialBubble.vue` erweitern mit State-Machine (step1→step6)
- `src/views/GameView.vue`: nur Quick-Actions für Schritte 2–6 zeigen, Rest ausblenden
- Pinia-Store: `tutorialState` mit `completed` Set
- RPC: `claim_tutorial_bonus()` — validiert Sequence, gibt Coins + Flag `tutorial_claimed`
- Nur 1× pro Account, bei Accounts mit >1M Coins auto-geskipped

---

## Phase 2: Bestandsspieler — Ziele & Seasons (Wochen 3–6)

### Problem
- Kein Endziel sichtbar (außer "mehr Tiere sammeln")
- Gleichförmiger Verlauf: jeden Tag gleiche Minispiele
- Fehlende Konkurrenz/Kooperation unter aktiven Spielern

### Lösung A: **Wöchentliche Challenges + Battle Pass Rahmen**

**Wöchentliche Challenges** (Mi–Di, 5 Aufträge):
- Tap 10k times (Coins als Reward)
- Win 5 Drift/Parkour/Wordle Levels (Tickets als Reward)
- Claim 3 Fountain coins (Bonus Coins)
- Trade with 1 Friend (Cosmetic unlock)
- Visit World 10 times + emote to 3 players (XP/Cosmetic)

→ Jede Woche 3–5 neue Rewards (Outfits, Autos, Farm-Skins kosmetisch freigeben oder Discount-Codes)

**Seasonal Battle Pass** (Monatlich):
- Free Track: +5 Rewards (Cosmetics/Icons)
- Premium Track (optional, 49 Coins einmalig): +10 Rewards (rarer Tiere, exklusive Skins)
- Progression via Challenges + Minispiel-Siege

**Implementation:**
- Migration `20260829_challenges_system.sql`:
  - `weekly_challenges` (id, week_start, challenge_key, reward_type, reward_value)
  - `player_challenge_progress` (user_id, challenge_id, progress_current, progress_target, claimed)
  - `seasonal_pass` (season, free_track, premium_track jsons)
  - `player_pass_progress` (user_id, season, premium, level, claimed_ids)
- Edge Function `weekly-challenges`: Status abrufen, Challenge-Fortschritt updaten, Rewards claimen
- View: `SeasonalView.vue` (Tab unter Leaderboard, zeigt Battle-Pass-Fortschrittsleiste)
- Server validiert nicht-täppbar-Progress (Minispiel-Siege, Trades)

---

### Lösung B: **Cooperative Raids — Gilden/Teams kurz**

**Guild System Light** (Q4 2026):
- Spieler können bis zu 3 Gilden beitreten (nicht binden)
- Wöchentliche Guild Quest (z. B. „Zerlegt gemeinsam 3 Boss-Level 50"):
  - Jeder Boss-Sieg zählt 1 Stack
  - Guild-Ziel: 10 Stacks bis Freitag
  - Completion → alle Member erhalten +5 Tickets + Cosmetic
- Keine eigene Spielmechanik, nur Social-Koordination

---

## Phase 3: Endgame — Prestige & Resets (Wochen 7+)

### Problem
- Bei 500+ Tieren und 1B+ Coins: Wofür spielen?
- Neue Tiere kosten nicht mehr relativ viel
- Leaderboard flach nach ~2 Wochen

### Lösung: **Prestige-System**

**Prestige Run** (optional, Player-Trigger):
1. Spieler klickt "Prestige starten"
2. Reset: Coins auf 0, Tiere verschwinden (kopiert in `prestige_archive`)
3. Neue Mechanik: *Genetik-Bonus* — jeder Prestige bringt einen dauerhaften +1% Coin-Multiplikator
4. Nach 3–4 Prestige-Runs: auch Tiere unlockbar mit Genetik-Kosmetik (Gold-Glitter)
5. Leaderboard-Tab: Prestige-Rank (sortiert nach `total_prestige_count`)

**Genetik-Kosmetik:**
- Jeder Tier-Kauf hat kleine Chance (~5%), Gold-Variante zu sein
- +10% Wert gegenüber Normal
- Im Inventar mit ⭐ gemarkiert

**Implementation:**
- Migration `20260830_prestige_system.sql`:
  - `player_prestige_state` (user_id PK, prestige_count, genetik_multiplier float)
  - `prestige_archive` (id, user_id, snapshot_at, tier_list jsonb, total_coins bigint)
  - species_costs: Spalte `is_genetic_variant` bool
- RPC: `start_prestige()` — validiert min. 100M Coins, snapshoten, reset, multiplier +1%
- UI: Modal mit "Are you sure?" + Prestige-Archiv-Viewer
- Leaderboard: neuer Tab "Prestige" sortiert nach `prestige_count desc, total_coins desc`

---

## Phase 4: Live Events & Seasonal Content (Monatlich)

**Zoo-Thema Events** (alle 2–4 Wochen, 7 Tage):
- *Safari Week*: Neue Tier-Variante (Zebra, Giraffe) kostet nur 80% normal → 3-Tage-Window, dann 150% teuer
- *Halloween Zoo* (Oktober): Zombie/Skelett-Tier-Skins, limitierte Autos
- *New Year Countdown* (Dezember): Tägliche Geschenke, Midnight-Bonus-Event

**Implementation (später):**
- `events` Tabelle (name, start, end, tier_unlock_ids, cosmetic_ids, bonus_multiplier)
- GameView.vue zeigt Event-Banner ("🎃 3 Tage verbleibend: Zombie-Tier freigeschalten!")
- Coins/Tickets können Event-gebunden sein (`seasonal_rewards` Tabelle)

---

## Implementierungs-Priorität

### Sprint 1 (Wochen 1–2): **Neulinge fassen**
- [ ] Progressive Tutorial (6 Schritte + Bubbles)
- [ ] Starter-Bonus RPC validiert
- [ ] GameView redesign (nur relevante Buttons für neue Spieler)

### Sprint 2 (Wochen 3–4): **Bestandsspielern Ziele geben**
- [ ] Weekly Challenges System + View
- [ ] Battle-Pass-Rahmen (Free Track)
- [ ] `SeasonalView.vue` mit Progress-Bar

### Sprint 3 (Wochen 5–6): **Premium-Track + Raids**
- [ ] Battle-Pass-Premium-Track (49 Coins)
- [ ] Guilds Light (beitreten, Weekly-Quest, Bestenliste)

### Sprint 4 (Wochen 7+): **Endgame**
- [ ] Prestige-System
- [ ] Genetik-Kosmetik-Chance
- [ ] Prestige-Leaderboard

---

## Metrics zum Tracking

| KPI | Baseline | Ziel (nach Phase 1) |
|-----|----------|-------------------|
| D1 Retention | ? | >30% |
| Time-to-1st-Tier | ? | <2min |
| DAU (Daily Active Users) | ? | +20% (with challenges) |
| Premium-Pass-Adoption | 0% | >15% |
| Prestige Attempts | 0% | >5% (Top Players) |

---

## Datenschutz & Balancing

- ✅ Keine Pay-2-Win: Prestige, Skins, Battle-Pass-Cosmetics nur Kosmetik
- ✅ Server-validiert: Alle Challenge/Raid/Prestige-Aktionen auf Supabase RPCs
- ✅ Fairness: Leaderboard-Tabs getrennt (Coins vs. Prestige vs. Challenge-Points)
- ⚠️ Monetisierung offen: Battle-Pass Premium könnte später 0,99€ kosten

---

## Nächste Schritte (dieser Agent)

1. **Feature-Branch:** `claude/engagement-strategy-g3don6` erstellen
2. **Migration-Template** schreiben (`20260829_challenges_system.sql`)
3. **SeasonalView.vue** + Pinia-Store sketchen
4. **PR mit Design-Docs** öffnen
