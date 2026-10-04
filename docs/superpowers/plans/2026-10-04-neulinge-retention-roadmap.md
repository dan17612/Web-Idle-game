# Zoo Empire: Engagement-Roadmap für Neulinge & Retention

**Datum:** 2026-10-04  
**Ziel:** Das Spiel für neue Spieler attraktiv gestalten und bestehende Spieler langfristig engagiert halten.

---

## Executive Summary

Zoo Empire hat starke Mechaniken (Sammeln, Minispiele, 3D-Welt, Marktplatz, Social), aber **Neulinge sehen den Weg nach vorne nicht klar**, und **bestehende Spieler haben kein verlässliches End-Game**. Diese Roadmap adressiert beide Probleme.

### Kernprobleme

1. **Onboarding:** Neue Spieler landen in einer leeren Welt; unklar, wie man anfängt, welche Tiere zu sammeln sind, und was die langfristige Progression ist.
2. **Anfänger-Progression:** Keine klaren Meilensteine; Belohnungen fühlen sich zufällig an statt durch Spielerhandlungen verdient.
3. **Mid-Game Cliff:** Nach 2-3 Wochen gibt es keine neuen Ziele mehr; bestehende Spieler wissen nicht, was sie als nächstes tun sollen.
4. **Keine Zeitversetzte Ziele:** Täglich spielen Spieler, aber es gibt keine längerfristigen Kampagnen oder saisonalen Events.

---

## Phase 1: Onboarding-Reboot (Woche 1-3)

### 1.1 Interaktives Tutorial (Erste 10 Minuten)

**Ziel:** Neue Spieler verstehen Kern-Loop in 2-3 Minuten.

- **Interaktive Einführung** (statt toter Text):
  - 1. Tier sammeln → Minispiel spielen → Coins verdienen
  - 2. Shop öffnen → Tier kaufen
  - 3. Zoo-Welt öffnen → Tier ausrüsten & anschauen
  
- **Gestaffelte Highlights:**
  - Quest 1: „Verdiene 100 Coins mit Parkour" → Reward: 3★ rare Tier
  - Quest 2: „Besuche die Zoo-Welt und rüste dein Tier aus" → Reward: +50 Coins
  - Quest 3: „Handel mit einem anderen Spieler" → Reward: +100 Coins + Badge „First Trader"

- **Umsetzung:** Neue `OnboardingView.vue` mit linearer Quest-Kette; nach Abschluss zu `GameView` umleiten.

### 1.2 Sichtbare Progression für Anfänger

**Ziel:** Jede Aktion zeigt Fortschritt → Dopamin-Hit.

- **Anfänger-Sammelbuch:** `species_rarity` als visueller Fortschritt
  - „Sammle 3 grüne Selten-Tiere" → Unlock Badge
  - „Sammle 1 legendäres Tier" → Unlock Special Title
  
- **Early-Game Milestones:**
  - Erstes Tier: ✅
  - Erste 500 Coins verdient: ✅
  - Erstes Tier Lv. 5: ✅
  - Erstes Minispiel gespielt (5 verschiedene): ✅
  → Jeweils 50-100 Bonus-Coins + sichtbarer Erfolg in der App

### 1.3 Anfänger-Shop Rotation

**Ziel:** Nicht zu viele Optionen; nur sinnvolle Tiere zeigen.

- **Weeks 1-2 für neue Accounts:**
  - Nur Common/Uncommon Tiere
  - Max. 6 Tiere gleichzeitig sichtbar
  - Fest definierte Progression statt Rotation
  
- **Nach Woche 2:** Freigabe aller Tiere, aber Empfehlungen zeigen
  - „Populär bei Level-40-Spielern"
  - „Dein nächstes seltenes Tier: X" (basierend auf Sammlung)

---

## Phase 2: Mid-Game Ziele & Retention (Woche 4-12)

### 2.1 Sammler-Meilensteine (Längerfristig)

**Ziel:** Nicht-spielen vergeben → „Ich muss Tier X sammeln für Badge Y".

- **Tier-Set Challenges:**
  - „Sammle 5 Tiere aus der Katzen-Familie" → +200 Coins + Title „Cat Collector"
  - „Sammle alle 4 Reptilien-Tiere" → +500 Coins + Exclusive Emote (Schlange)
  - „Sammle 20 verschiedene Tiere" → +1000 Coins + Badge

- **Rarity Milestones:**
  - 1 Legendary: Badge
  - 3 Legendaries: Exclusive Color für Zoo-Welt
  - 10 Legendaries: Title „Legendary Master"

- **Umsetzung:** New Table `player_challenges` mit `user_id`, `challenge_id`, `progress`, `completed_at`.

### 2.2 Saisonale Events & Begrenzte Kampagnen

**Ziel:** Etwas Neues jeden Monat → Spieler kehren wieder zurück.

- **Oktoberevents (Beispiel):**
  - „Halloween-Zoo": 2 Wochen, spiel Minispiele, freischalten exklusive orange Tiere
  - Tägliche Quest: 1 Minispiel = 10 Event-Coins, 100 Event-Coins = 1 Tier
  - Endgame: Sammle alle 5 Halloween-Tiere → exklusive Rüstung für Zoo-Welt

- **Monatliche Wechsel:**
  - Okt: Halloween
  - Nov: Thanksgiving/Ernte
  - Dez: Weihnacht
  → Tiere kommen/gehen, Minispiele bekommen Saisonheme

- **Umsetzung:** 
  - Neue Spalte `event_name` in `species` (nullable)
  - RPC `claim_event_reward` für tägliche Quests
  - Tiere mit `event_name` nicht null sind hidden nach Event-Ende

### 2.3 Battle Royale / Competitive Minigames

**Ziel:** Kurzzeitiger Thrill, Rankings, Vergleich mit Freunden.

- **Wöchentliche Turniere:**
  - Fünf beste Parkour-Scores der Woche → Leaderboard
  - Rewards: Gold für Top 10, Silber Top 50, Bronze Top 200
  - Durchführung: Snapshot jeden Sonntag 20:00 UTC
  
- **Freunde-Duell (MVP für Dezember):**
  - Challenge einen Freund: „Wer sammelt mehr Coins in 24h?"
  - Einsatz: 50 Coins, Gewinner bekommt das Doppelte
  - Live-Fortschritt-Anzeige

- **Umsetzung:** Neue `leaderboard_snapshots` Tabelle, Weekly Cronjob, Realtime für Duelle.

---

## Phase 3: End-Game & Community (Woche 13+)

### 3.1 Guilden / Allianzen

**Ziel:** Soziale Struktur; Spieler helfen einander; Gruppen-Ziele.

- **Guild-Struktur:**
  - Max. 50 Spieler pro Guild
  - Leader + 3 Officers
  - Chat, gemeinsamer Schatz, Guild-Quests
  
- **Guild Quests:**
  - Wöchentlich: „Alle zusammen spielen 1000 Minispiele" → Reward für alle
  - Wöchentlich: „Handel untereinander: 100 Tiere getauscht" → Reward
  
- **Guild-Rüstungen:** Spezielle Zoo-Dekos, die nur Guildmitglieder sehen

- **Umsetzung:** Neue Tables `guilds`, `guild_members`, `guild_chat`, `guild_quests`.

### 3.2 Dungeon/Boss-Progression mit Tiers

**Ziel:** Asymptotisches End-Game; immer was Neues zu meistern.

- **Bestehender Content:** Boss Path, Endless Boss, BlockFall.
- **Neue Zweck:** Tier-System
  - Tier 1: Leicht (jeder kann)
  - Tier 2: Mittel (nach 2 Wochen)
  - Tier 3: Hart (nach Monat)
  - Tier 4: Extreme (Hardcore, Leaderboard nur)

- **Balancing:**
  - Coins sind fest pro Tier
  - Belohnungen sind kosmisch: Titles, Emotes, Farben, nicht wirtschaftlich
  - Spieler konkurrieren um „Dauer/Skill", nicht um Loot

- **Umsetzung:** Neue Spalte `difficulty_tier` in bestehenden Minispiel-Tabellen.

### 3.3 Spieler-Lore & Achievements

**Ziel:** Persönliches Erfolgsnarrativ; Sammelalbum-Gefühl.

- **Achievements:**
  - „Verdiene 1 Mio. Coins" → Hidden Achievement (erst nach Unlock sichtbar)
  - „Spiele 100 Parkour-Sessions" → Unlock Title „Parkour Master"
  - „Sammle 50 verschiedene Tiere" → Unlock Exclusive Emote
  
- **Profile:**
  - Spieler-Bio (sichtbar für Freunde)
  - Titels-Reihenfolge (zeige Top 5)
  - Achievements-Reihenfolge (neuste zuerst)

- **Umsetzung:** Neue Tables `player_achievements`, `player_titles`, erweitert `profiles`.

---

## Phase 4: Monetarisierung & Retention-Mechanics (Laufend)

### 4.1 Battle Pass / Seasonal Rewards

**Ziel:** Optionale $4.99/Monat für cosmetics + 1000 Coins extra/Woche.

- **Free Tier:**
  - Tägliche Missions (3 insgesamt)
  - Wöchentliche Rewards (100 Coins)
  
- **Premium Tier (optional $4.99):**
  - +1000 Coins/Woche
  - 3 Extra Missions/Tag
  - Exclusive Emotes, Titles, Zoo-Dekos
  - Early Access zu Tieren (1 Woche vorher)

- **Resets:** Monatlich, um Saisonalität zu fördern.

### 4.2 FOMO-Mechaniken (verantwortungsvoll)

**Ziel:** Spieler-Gewöhnung ohne Ausbeutung.

- **Tägliche Belohnungen:**
  - Einloggen = +20 Coins + Scratch Card (1-in-10 Chance +100 Coins)
  - 7-Tage-Streak = Extra 500 Coins
  
- **Begrenzte Shop-Rotationen:**
  - Jede Woche 3 neue Tiere (sonst alle sichtbar)
  - Tierpulse: „Dieser Boss ist diese Woche aktiv" → +50% Coins
  
- **Zeitlich begrenzte Minispiele:**
  - Arcade-Event jeden Freitag 18:00-22:00 UTC
  - +50% Coins für alle Minispiele in diesem Fenster

---

## Implementierungs-Roadmap

| Phase | Feature | Aufwand | Start | Ende |
|-------|---------|--------|-------|------|
| 1.1 | Interactive Onboarding | Mittel | Okt 7 | Okt 21 |
| 1.2 | Early Milestones | Klein | Okt 7 | Okt 14 |
| 1.3 | Anfänger-Shop | Klein | Okt 14 | Okt 21 |
| 2.1 | Tier-Set Challenges | Mittel | Okt 21 | Nov 4 |
| 2.2 | Saisonale Events | Groß | Nov 4 | Nov 25 |
| 2.3 | Turniere / Duels | Groß | Nov 25 | Dez 16 |
| 3.1 | Guilden | Sehr Groß | Dez 16 | Jan 20 |
| 3.2 | Boss Tiers | Mittel | Dez 23 | Jan 13 |
| 3.3 | Achievements | Mittel | Jan 13 | Jan 27 |
| 4.1 | Battle Pass | Mittel | Jan 27 | Feb 10 |
| 4.2 | FOMO-Mechanics | Klein | Feb 10 | Feb 24 |

---

## Erfolgs-Metriken

Messen nach Launch einer Phase:

- **Neulinge:**
  - DAU (Daily Active Users) 7 Tage nach Anmeldung: Ziel >40%
  - Onboarding Completion: Ziel >80%
  - Erste Kaufhandlung innerhalb 3 Tage: Ziel >60%

- **Retention:**
  - MAU (Monthly Active): Ziel +25% nach Phase 1
  - Weekly Returning: Ziel >45% nach Phase 2
  - Durchschnittliche Spielzeit/Tag: Ziel >10 Min nach Phase 3

- **Engagement:**
  - Minispiele pro Spieler/Woche: Ziel >15 nach Phase 2
  - Freundschaften pro Spieler: Ziel >3 nach Phase 3
  - Guild-Mitgliedschaft: Ziel >70% nach Phase 3

---

## Design-Prinzipien

1. **Fairness:** Kein Pay-to-Win, nur Cosmetics + minimales Convenience.
2. **Clarkeit:** Jede Aktion sollte klare Belohnung zeigen → Dopamin.
3. **Progression:** Nicht linear; Multi-Pfade (Sammler, Speedrunner, Duelist, Social).
4. **Saisonalität:** Ständig neuer Content, aber nicht überwältigend.
5. **Spieler-Stimme:** Roadmap > Support > Turniere → Community fühlt sich gehört.

---

## Nächste Schritte (Unmittelbar)

1. **Story-Board:** Interaktives Onboarding mit Mockups in Figma
2. **Datenbank-Design:** Tables für Challenges, Events, Leaderboards
3. **First Feature:** Phase 1.1 (Interactive Onboarding) — MVP in 2 Wochen
4. **Monitoring:** Analytics in Vercel Speed Insights erweitern (Funnel-Tracking)
