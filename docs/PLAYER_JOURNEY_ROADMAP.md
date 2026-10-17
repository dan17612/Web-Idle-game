# Zoo Empire — Spieler-Journey Roadmap

**Ziel:** Zoo Empire zu einem süchtmachenden Idle-Game machen, das Neulinge anzieht und bestehende Spieler langfristig bindet.

## Status Quo (Oktober 2026)

### Vorhandene Features für Neulinge
- ✅ Tutorial-Bubble-System (Komponente vorhanden)
- ✅ Welcome-Gift mit Bonus-Taps
- ✅ Klare Navigation (Hauptseite mit Quick-Actions)
- ✅ Tägliche Belohnungen (DailyRewardModal)

### Vorhandene Features für Bindung
- ✅ 10+ Minispiele (Parkour, Drift, Memory, Wordle, Blockfall, Halloween, Boss-Fight)
- ✅ Tier-System mit Zucht & Breeding
- ✅ Zoo-Börse (P2P-Handel mit Preismodell)
- ✅ Leaderboards (Gesamt-Rangliste)
- ✅ Multiplayer-Welt (3D Zoo-Hub mit Realtime)
- ✅ Freunde-System
- ✅ Support-Tab & Community-Roadmap
- ✅ Automatisierungs-Erkennung (Fair-Play)

### Bestehende Lücken
- ⚠️ **Onboarding:** Tutorial-Bubble-System existiert, wird aber zu spät/selektiv genutzt
- ⚠️ **Progression-Clarity:** Neue Spieler verstehen nicht, **warum** sie bestimmte Aktionen machen sollen
- ⚠️ **Retention Hooks:** Keine visuellen Meilensteine (Quests, Achievements) bis zu Farming-Phase
- ⚠️ **Social Stickiness:** Zoo-Welt ist vorhanden, aber Discovery anderer Spieler ist schwach
- ⚠️ **Engagement Loop:** Tägliche Belohnungen vorhanden, aber keine Bonus-Streaks oder Events
- ⚠️ **Content-Refresh:** Minispiele-Variety ist hoch, aber keine zeitlich begrenzte Events

---

## Phase 1: Neuling-Erlebnis (Woche 1–4)

### 1.1 Strukturiertes Onboarding (Woche 1)
**Ziel:** Spieler in 3 Minuten verstehen, worum es geht und was zu tun ist.

#### 1.1.1 „Zoo-Bauer" Quest-Serie (Linear, 5 Steps)
```
Step 1: „Erstes Tier" → Ei aus Truhe/Shop kaufen
Step 2: „Ausbrüten" → Taps auf Ei zum Ausbrüten
Step 3: „Erste Münze" → Tappe Tier → +1 Münze
Step 4: „Upgrade-Power" → Tier auf Tier II upgraden
Step 5: „Mini-Game-Abenteuer" → Eines von 3 Minispielen spielen
```

**Umsetzung:**
- `src/composables/useNewbieQuests.js` erstellen
- QuestStatus in Game-Store tracken (`newbie_quest_step`)
- TutorialBubble-System erweitern auf alle 5 Steps
- Nach Step 5: Abzeichen "Anfänger" + 10k Bonus-Coins

#### 1.1.2 Klare Kurz-Tipps (In-Game Tooltips)
- **Auf Tier-Karte hovern:** „Dieses Tier verdient +15 🪙/s ohne deine Hilfe"
- **Auf Minispiel-Icon hovern:** „Verdiene +100 🪙 in 30 Sekunden"
- **Auf Truhe hovern:** „Zufälliges Tier (kostenlos 1×/Tag, danach +Tickets)"

**Umsetzung:**
- `src/components/Tooltip.vue` (globale Registrierung)
- Tooltips in GameView/ShopView/TicketsView nutzen

---

### 1.2 Früher Social-Hook (Woche 2)
**Ziel:** Spieler sollen andere kennen und kooperieren.

#### 1.2.1 „Buddy"-System (Optional, aber prominent)
- **Beim Login (Tag 1):** Modal: „Lade einen Freund ein oder spiele mit zufälligem Buddy"
- **Buddy-Effekt:** +10% Einkommen für beide (24h Bonus nach Link)
- **Umsetzung:**
  - `profiles.buddy_id` + `buddy_joined_at` in Migration
  - RPC `claim_buddy_bonus()` → Gegenseitige +10% Coins auf Server
  - BuddyInviteModal in App.vue (nach LegalConsentModal)

---

### 1.3 Erste Meilenstein-Marker (Woche 3–4)
**Ziel:** Spieler haben Ziele, nicht nur aimlos Tappen.

#### 1.3.1 Achievements
```
Bronze (Leicht):
  ✓ 100 Taps (1 Stunde Spielzeit)
  ✓ 1 Tier ausgebrütet
  ✓ 100k Coins verdient
  ✓ 1 Minispiel gespielt

Silver (Moderat):
  ✓ 10 Tiere im Bestand
  ✓ 1 Tier auf Tier III upgraden
  ✓ 1 Minispiel 3x gespielt
  ✓ 1 Freund eingeladen
```

**Umsetzung:**
- Migration: `achievements(id, user_id, key, unlocked_at, ...)`
- Logik: `src/achievements.js` (Prüfungen bei Trigger-Events)
- Modal: AchievementUnlock.vue (Toast-artig)
- Storage: `game.achievements` als Map<key, {unlocked_at, ...}>

#### 1.3.2 Fortschritts-Dashboard (Index-View Upgrade)
- Neue Tab `IndexView.vue`: Show „Nächste Ziele"
  - Tier-Anzahl: 1/10/50/100
  - Upgrade-Tier: Tier I/II/III/IV/V
  - Minispiele-Beherrschung: 0/10/50/100 Plays
  - Börsenwert: 0/10M/100M/1Mrd

---

## Phase 2: Early-Game Retention (Woche 4–12)

### 2.1 Tägliche Streaks & Weekly-Challenges
**Ziel:** Struktur für regelmäßiges Comeback.

#### 2.1.1 Streak-System
- Login 2 Tage hintereinander: +5% Münz-Bonus (addierbar, max +50%)
- UI: Counter in der Top-Bar (Tag 3/7 Bonus)
- Break Mechanic: Einen Tag verpassen = Reset, aber „Retten mit Ticket" (1 Ticket)
- Migration: `login_streaks(user_id, current_streak, max_streak, last_login_at)`

#### 2.1.2 Weekly Challenges (3 Stück, Montag–Sonntag)
```
Woche 1:
  □ Verdiene 1M Coins → +50k
  □ Spiele 5 Minispiele → +5 Tickets
  □ Brüte 2 Tiere aus → +Abzeichen "Züchter"
```

**Umsetzung:**
- Migration: `weekly_challenges(id, user_id, week_of, challenge_key, progress, completed_at, ...)`
- RPC: `claim_weekly_challenge(p_challenge_key)` (Validierung auf Server)
- Component: WeeklyChallengeCard.vue (in Neuer Tab „Aufgaben")

---

### 2.2 Event-Kalender
**Ziel:** Wiederkehrende Events halten Spieler engagiert.

#### 2.2.1 Event-Schema
```
Typ: Limited-Time-Event (3–14 Tage)
Trigger: Datum oder Spieler-Meilenstein

Beispiel Events (2026 H2):
  🎃 Halloween Puzzle Week (2. Okt–8. Nov, jährlich)
  🎅 Advent Calendar (1.–25. Dez)
  🎆 New Year Challenge (31. Dez–6. Jan)
  💝 Valentine's Breeding Bonus (12.–18. Feb)
```

**Umsetzung:**
- Migration: `game_events(id, key, title, start_date, end_date, type, reward_pool)`
- RPC: `complete_event_challenge(p_event_key, p_challenge_id)` mit Validierung
- EventBanner.vue (Top der Seite, wenn aktiv)
- Component: EventBoard.vue (neue Tab „Events")

---

### 2.3 Zoo-Börse-Engagement
**Ziel:** P2P-Handel ist Social-Stoff, aber Barrieren senken für Neulinge.

#### 2.3.1 Börsenlevel-System
```
Level 1 (Neu):
  Max 5 aktive Angebote
  Max 1M Coins pro Tier
  Sichtbarkeit: Nur bei Top-Spielern

Level 2 (Nach 1 Woche + 10 Trades):
  Max 15 aktive Angebote
  Max 100M Coins pro Tier
  Sichtbarkeit: Alle Spieler

Level 3 (Nach 30 Tage + 50 Trades):
  Unbegrenzte Angebote
  Unbegrenzte Coins
  Abzeichen: "Börsen-Profi"
```

**Umsetzung:**
- `profiles.market_level`, `market_trade_count`
- Filter in `_market_listing_ok()` hinzufügen
- MarketView: Level-Info + Progressionsbar anzeigen

---

## Phase 3: Long-Term Engagement (Monat 3+)

### 3.1 Tier-Rarity-Progression (Sammler-Sucht)
**Ziel:** Jeden Tier einmal zu haben wird zum Meta-Ziel.

#### 3.1.1 Dex-System (Pokédex für Zoo)
```
Dex Status:
  ① Noch nie gesehen (grau)
  ② Gesehen (Farben-Outline)
  ③ Dein Bestand (Voll)
  ④ Shiny/Spezial (Glitter-Icon)
```

**Umsetzung:**
- Migration: `user_dex(user_id, species_id, seen_at, owned_at, shiny_count)`
- RPC: `dex_entry_seen(p_species_id)` (beim Ansehen, Börsen-Browse, Trade-Receive)
- DexView.vue (neue Route `/dex`)
  - Filter: nach Rarity, Tier, Owned/Seen
  - Zeige fehlende Tiere + „Wo zu finden"-Hint
- Achievements: „Dex 25%", „Dex 50%", „Dex 100!" mit Belohnungen (Coins, Tickets)

#### 3.1.2 Shiny & Special Variants
**Idee (für später):** 5% der Eier sind Shiny (gold-glitter Emoji), 0,1% sind Legend (Regenbogen).
- `species.shiny_rate` in `species_costs`
- `user_animals.is_shiny`, `is_legend`
- Dex-Eintrag zeigt Sammlungsstand (0/1/5 Shinies gesammelt)
- Börsenwert: Shiny = +3× Preis, Legend = +10×

---

### 3.2 Seasonal Content
**Ziel:** Spieler kommen zurück für zeitlich begrenzte Inhalte.

#### 3.2.1 Seasons (4 pro Jahr, je 13 Wochen)
```
Saison 1: Frühjahrs-Zucht-Boost
  → +50% Ei-Rate, neue Züchter-Quests
  → Saisonales Tier: Spring Butterfly (nur diese Saison)

Saison 2: Sommer-Festival
  → Minispiel-Tournaments mit Leaderboard
  → Neue Outfit: Safari-Ranger

Saison 3: Herbst-Ernte (Halloween)
  → Puzzle-Event (bereits vorhanden)
  → Limited Tier: Bat, Pumpkin-Head-Tier

Saison 4: Winter-Fest
  → Advent Calendar (24 Tage Mini-Belohnungen)
  → Breeding Bonus für festliche Tiere
```

**Umsetzung:**
- Migration: `seasons(id, name, start_date, end_date, season_tier_id, ...)`
- Logik: `src/seasonalContent.js` (Aktuell-Season erkennen)
- Dynamische Shop-Rotation (neue Tiere, Outfits pro Saison)
- Leaderboard: Filter nach Saison (Career vs. Current Season)

#### 3.2.2 Seasonal Pass / Battle Pass (Optional, Monetization)
```
Free Path:
  ✓ 7-tägiges Tier-Icon-Paket
  ✓ 100 Bonus-Tickets
  ✓ Weekly-Challenge-Booster

Premium Pass (+4,99 €/Saison):
  ✓ Alles vom Free Path, doppelt
  ✓ Saisonales Outfit (exklusiv)
  ✓ +1 Daily-Reward pro Tag
  ✓ Tier-Skin (z.B. "Pyjama-Kuh")
```

---

### 3.3 Leaderboard & Competitive Seasons
**Ziel:** Spieler wollen besser sein als andere.

#### 3.3.1 Mehrere Leaderboards
```
Ranking nach:
  1. Portfolio-Wert (Alle Tiere bewertet nach Börsenwert)
  2. Reines Einkommen (🪙/Sekunde, aktuelle Tiere)
  3. Minispiel-Highscores (Best Parkour Score, etc.)
  4. Saisonale Punkte (Season 1, 2, 3, 4)
  5. Achievements (Gesamtanzahl)
```

**Umsetzung:**
- Migration: `leaderboard_snapshots(user_id, rank_type, season_id, value, calculated_at)`
- RPC: `leaderboard_view(p_rank_type, p_season_id, p_limit = 100)`
- LeaderboardView.vue: Tabs für alle Ranking-Typen

#### 3.3.2 Ranked Streaks & Achievements
```
Neue Achievements:
  🥇 Top 10 je Leaderboard
  🥈 Top 100 je Leaderboard
  🏅 3 Wochen Top 100 bleiben
  💎 1 Mio Gesamt-Einkommen verdient
  🌟 Portfolio über 10 Mrd wert
```

---

## Phase 4: Community & Meta-Game (Monat 6+)

### 4.1 Guild / Team System (Optional, Multiplayer-Tiefe)
```
Spieler treten Gilden (max 50 Mitglieder) bei:
  ✓ Gemeinsame Questlinie (Boss-Raid, 1×/Woche)
  ✓ Gilden-Level (durch Mitglieder-Aktivität)
  ✓ Gilden-Shop (Coins sammeln → Exclusive Tiere)
  ✓ Gilden-Leaderboard
```

**Umsetzung (später):** Komplexe Datenbankänderungen, verschieb auf Q4

### 4.2 PvP Minispiel-Tournaments
```
Wöchentlicher Turnier pro Minispiel:
  Woche 1: Parkour (Best Time)
  Woche 2: Drift (Highest Score)
  Woche 3: Memory (Fewest Turns)
  Woche 4: Wordle (Streak)

Top 10 gewinnen Coins + Abzeichen
```

**Umsetzung:**
- Migration: `tournament_entries(tournament_id, user_id, score, rank, claimed_at)`
- RPC: `submit_minigame_score(p_game, p_score, p_game_proof)` mit Validierung
- Leaderboard automatisch berechnet

---

## Implementation Roadmap (Timeline)

### ✅ Sofort (Woche 1)
1. **Quest-System Setup** (1–2 Tage)
   - `useNewbieQuests.js` + Migration
   - TutorialBubble für alle 5 Steps
   - Store Integration

2. **Achievements Framework** (1–2 Tage)
   - `achievements.js` + Migration
   - AchievementUnlock.vue Modal
   - 5 Bronze Achievements bauen

3. **Tooltip Component** (1 Tag)
   - `Tooltip.vue` global
   - Erste 5 Tooltips in GameView

### 📋 Diese Woche (Woche 2)
4. **Streak-System** (2 Tage)
   - Migration + RPC
   - UI in Top-Bar

5. **Weekly Challenges** (2 Tage)
   - Migration + RPC
   - ChallengeCard.vue + neue Tab

### 🎯 Diese Woche–nächste (Woche 3–4)
6. **Dex-System** (2–3 Tage)
   - Migration + RPC
   - DexView.vue + Dex Achievements

7. **Event-Framework** (2 Tage)
   - Migration + RPC
   - EventBanner.vue + EventBoard.vue

### 🚀 Nächste Woche (Woche 5–6)
8. **Seasonal Content** (3–4 Tage)
   - Season-Logik
   - Dynamic Shop Integration
   - Saisonale Achievements

9. **Market Level System** (1–2 Tage)
   - Profile-Migration
   - Filter-Logik
   - UI Update in MarketView

---

## Testing Checklist

- [ ] Neulinge verstehen Onboarding in < 5 Minuten
- [ ] Alle Quest-Steps sind spielbar und geben Feedback
- [ ] Achievements poppen auf und fühlen sich belohnend an
- [ ] Streaks sind sichtbar und motivierend
- [ ] Weekly Challenges zeigen klaren Fortschritt
- [ ] Dex lädt automatisch beim Spielen neu
- [ ] Events zeigen korrekt für aktive Zeiträume
- [ ] Market Level begrenzt neue Spieler richtig
- [ ] Leaderboards aktualisieren sich zeitnah

---

## Metriken zum Tracken

**Acquisition:**
- New Player Retention (Tag 1, 7, 30)
- Onboarding Completion Rate (% die Quest 5 fertigstellen)

**Engagement:**
- Daily Active Users (DAU)
- Session Length (durchschnittlich)
- Feature Usage (% der Spieler, die jedes Feature nutzen)

**Retention:**
- Monthly Active Users (MAU)
- Churn Rate (% die aufhören nach Tag X)
- Streak Completion Rate (% die Streaks halten)

**Revenue (später):**
- % Premium Pass Adoption
- Lifetime Value per Player

---

## Glossary

- **Neulinge:** Spieler in den ersten 14 Tagen
- **Early-Game:** Tag 15–90
- **Mid-Game:** Tag 91–180
- **Endgame:** Tag 181+
- **DAU/MAU:** Daily/Monthly Active Users
- **Churn:** Spieler, die aufhören zu spielen
- **Engagement Loop:** Tägliche Gründe zum Spielen (Streaks, Challenges, Events)
- **Retention Hook:** Feature, das Spieler dazu bringt, wiederzukommen
