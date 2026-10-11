# Zoo Empire — Next Steps für Growth & Retention (Sep 2026)

**Ziel:** Zoo Empire für Anfänger attraktiver und für Veteranen langfristig spielbar machen.

---

## Status Quo

✅ **Aktuell im Spiel:**
- Kern-Loop: Tiere kaufen → Coins verdienen → upgraden
- 6 Minispiele (Memory, Drift, Parkour, Wordle, Boss-Fight, World)
- Social: Freunde, Marktplatz, Leaderboard
- Offline-Earnings bis 8h
- Tickets & Shop-Rotation
- Erste Kosmetik (Welt-Items)

❌ **Fehlend für Anfänger:**
- Kein Onboarding/Tutorial (neue Spieler wissen nicht, was zu tun ist)
- Keine klare erste Erfolg-Story (schnelle Wins)
- Keine "was ist mein nächstes Ziel?"-Mechanik

❌ **Fehlend für Veteranen (Retention):**
- Keine Saisons/Events (statischer Content)
- Keine täglichen/wöchentlichen Missionen
- Keine Achievements oder Meilensteine
- Kein Endgame-Ziel außer Leaderboard
- Keine großen sozialen Inhalte (Gilden, Raids)

---

## Phase 1: Anfänger-Erlebnis (PRIORITY 🔴)

### 1.1 Onboarding-Tutorial
**Was:** Interaktiver First-Run mit 3 Schritten
- **Schritt 1:** "Tippe auf ein Tier, um Coins zu verdienen"
- **Schritt 2:** "Sammle Coins, um ein neues Tier zu kaufen"  
- **Schritt 3:** "Spiele Minigames für Bonus-Coins"

**Wo:** Neue Route `/onboarding` oder Modal in GameView
**Datei:** `docs/superpowers/specs/2026-09-03-onboarding-tutorial-design.md` + Implementation

**Benefit:** Neue Spieler verstehen in 2 min, was sie tun.

### 1.2 First Win Loop
**Was:** Erste 5 Minuten sind garantiert erfolgreich:
- Start-Bonus: +200 Coins (spielen kann sofort das erste Tier kaufen)
- Quest: "Kaufe dein erstes Tier" → Reward: +100 Coins
- Quest: "Spieliere ein Minigame" → Reward: +50 Coins + Info

**Wo:** `stores/game.js` + neue Quest-Tabelle `player_quests`
**Datei:** `docs/superpowers/specs/2026-09-03-first-win-loop-design.md`

**Benefit:** Retention auf Tag 1 drastisch höher (klare Progression).

---

## Phase 2: Retention für Alle (PRIORITY 🟡)

### 2.1 Tägliche Quest-System
**Was:** 3 tägliche Mini-Missionen (resettet UTC 00:00)
- "Verdiene 500 Coins" → +50 Coins
- "Spiele 3 Minigames" → +30 Tickets  
- "Besuche den Marktplatz" → +1 Mystery-Egg

**Abschluss aller 3:** Bonus-Reward (z.B. +100 Coins)

**Wo:** Neue Route `/quests`, neue Tabelle `player_daily_quests`
**Datei:** `docs/superpowers/specs/2026-09-03-daily-quests-design.md`

**Benefit:** Spieler kehren täglich zurück (Habit Loop).

### 2.2 Wöchentliche Challenge
**Was:** 1 Challenge pro Woche mit lebendigem Leaderboard
- KW 1: "Verdiene 50.000 Coins" (Top 10 bekommen +500 Bonus-Coins + Badge)
- KW 2: "Spiele Parkour 20x" (Top 10 bekommen +20 Tickets)
- KW 3: Bestie-Challenge (Top 3 Paare, die zusammen Coins verdienen)

**Wo:** Neue Route `/challenges`, Tabelle `player_weekly_challenges`
**Datei:** `docs/superpowers/specs/2026-09-03-weekly-challenges-design.md`

**Benefit:** Veteranen haben neues Ziel, kompetitiv.

### 2.3 Streak-System
**Was:** Täglicher Login-Streak mit progressive Rewards
- Tag 1: +10 Coins
- Tag 3: +50 Coins + Badge
- Tag 7: +200 Coins + Rare Item
- Tag 30: +1.000 Coins + Epic Item + Streak-Freeze (1x pro Monat überspringen erlaubt)

**Wo:** `stores/game.js`, neue Tabelle `player_streaks`
**Datei:** `docs/superpowers/specs/2026-09-03-streak-system-design.md`

**Benefit:** Psychologische Hook (Kettenverantwortung).

---

## Phase 3: Soziales & Events (PRIORITY 🟢)

### 3.1 Gilden (Clans)
**Was:** Spieler können Gilden gründen/beitreten (max. 50 Mitglieder)
- Gemeinsamer Gilden-Bosses (wöchentlich): Alle gemeinsam gegen Boss-Tier
- Gilden-Schatzkammer: Collective Coin-Pool → monatlich Rewards freischalten
- Gilden-Leaderboard: Global Top 100 Gilden

**Wo:** Neue Route `/guild`, Tabellen: `guilds`, `guild_members`, `guild_treasury`
**Datei:** `docs/superpowers/specs/2026-09-03-guilds-design.md`

**Benefit:** Endgame für Veteranen, neuer Social-Layer.

### 3.2 Seasonal Events (z.B. Herbst 🍂)
**Was:** Alle 3 Monate neuer Event mit Theme
- **Herbst 2026:** "Halloween Zoo" 
  - 5 neue limitierte Tier-Skins (nur im Event verfügbar)
  - Spezial-Minigame: "Candy Collection" (Parkour-Variante)
  - Event-Shop mit exklusiven Kosmetik
  - Limited-Time-Leaderboard (mit Event-Punkte)

**Wo:** Neue Route `/event`, neue Tabellen: `event_items`, `player_event_progress`
**Datei:** `docs/superpowers/specs/2026-09-03-seasonal-events-design.md`

**Benefit:** FOMO-Effekt, Grund zu returnen.

### 3.3 Boss-Raid (Multiplayer-Event)
**Was:** Wöchentlicher World Boss, dass max. 50 Spieler gemeinsam bekämpfen
- Alle greifen gleichzeitig an (RTC Realtime via Supabase Realtime)
- Damage wird vom Level & ausgerüsteten Tieren berechnet
- Top-Schrader bekommen Rewards: Rare Items, Badges
- Boss-Health persistiert über die Woche

**Wo:** Neue Route `/raid`, 3D-Engine für Boss-Animation
**Datei:** `docs/superpowers/specs/2026-09-03-world-boss-raid-design.md`

**Benefit:** Vereint alle Spieler, dramatische Moments.

---

## Phase 4: Progression & Achievements (PRIORITY 🟢)

### 4.1 Achievements
**Was:** 30+ Achievements für verschiedene Milestones
- "Tier-Sammler": Kaufe alle 10 Tier-Arten → Badge + 100 Coins
- "Minigame Master": Gewinne 100x in Minigames → Badge + Rare Item
- "Social Butterfly": 10 Freundschaftsanfragen akzeptieren → Badge + 50 Tickets
- "Leaderboard-Champion": Platz in Top 10 → Badge + 500 Coins

**Wo:** Neue Route `/achievements`, Tabelle `player_achievements`
**Datei:** `docs/superpowers/specs/2026-09-03-achievements-system-design.md`

**Benefit:** Klare, erreichbare Meilensteine für alle Spieltypen.

### 4.2 Prestige-System (Ultra-Veteranen)
**Was:** Nach 100M Coins verdient: "Reset for Glory"
- Spieler kann alles zurücksetzen, bekommt dafür **Prestige-Level** (+1 jedes Mal)
- Level-Reward: +1% Coin-Multiplikator für alle zukünftigen Runs
- Kosmetik: Prestige-Badge im Profil + spezielle Tier-Skins

**Wo:** `stores/game.js`, neue Feld in `profiles` Tabelle
**Datei:** `docs/superpowers/specs/2026-09-03-prestige-system-design.md`

**Benefit:** Infinite Game für Hardcore-Spieler.

---

## Implementierungs-Roadmap

| Phase | Woche | Feature | Aufwand | Owner |
|-------|-------|---------|--------|-------|
| **1** | W36 | Onboarding Tutorial | 5 Tage | @claude |
| **1** | W37 | First Win Loop | 3 Tage | @claude |
| **2** | W38 | Tägliche Quests | 4 Tage | @claude |
| **2** | W39 | Wöchentliche Challenges | 3 Tage | @claude |
| **2** | W39 | Streak-System | 2 Tage | @claude |
| **3** | W40-41 | Gilden | 6 Tage | @claude |
| **3** | W41-42 | Seasonal Event (Halloween) | 7 Tage | @claude |
| **3** | W42-43 | Boss-Raid | 8 Tage | @claude |
| **4** | W43-44 | Achievements | 4 Tage | @claude |
| **4** | W44-45 | Prestige-System | 3 Tage | @claude |

**Total:** ~45 Tage (≈ 9 Wochen), machbar bis Ende Oktober 2026.

---

## Warum das funktioniert?

### Für Anfänger 🆕
1. **Klare erste Mission:** Tutorial + First Win zeigt sofort, was zu tun ist
2. **Schnelle Erfolge:** Erste Tier nach 5 min kaufbar
3. **Nicht überfordert:** Minigames erst nach Tutorial entdecken

### Für Veteranen 💪
1. **Täglicher Grund zu spielen:** Quests + Streaks
2. **Konkurrenz-Ziele:** Challenges + Leaderboards
3. **Social Endgame:** Gilden + Boss-Raids  
4. **Unendliche Progression:** Prestige-Levels
5. **FOMO-Content:** Seasonal Events mit exklusiven Skins

### Wirtschaftlich 💰
- **Kosmetik-Monetisierung:** Seasonal Skins, Battle Pass, Prestige-Cosmetics
- **No Pay-to-Win:** Alles spielbar ohne Geld, Cosmetics optional
- **AB-Test-friendly:** Jeder Schritt kann gemessen werden

---

## Nächste Konkrete Schritte

1. **Spec schreiben** → Detaillierter Design für Onboarding + First Win
2. **MVP bauen** → Tutorial + Start-Bonus in 1 Woche
3. **Testen mit neuen Spielern** → Beobachten an Tag 1, 3, 7
4. **Iterieren** → Feedback einarbeiten, ab Woche 2 nächste Phase

---

## Anhang: Bestehende Features (Don't Break!)

- ✅ Offline-Earnings (8h) — grundsätzlich behalten
- ✅ Minigames — Schwierigkeit ggf. für Anfänger anpassen (Easy Mode?)
- ✅ Marktplatz — für Veteranen relevant, aber für Anfänger optional
- ✅ Freunde — später im Onboarding erwähnen
- ✅ Leaderboard — Druck rausnehmen für Anfänger (Show only Week 1+)

---

**Status:** Proposal für Review
**Datum:** 2026-09-03
**Owner:** @claude / Zoo Empire Product Team
