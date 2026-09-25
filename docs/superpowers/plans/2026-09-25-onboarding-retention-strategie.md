# Onboarding & Retention Strategie — Zoo Empire

Datum: 2026-09-25

## Problemstellung

Zoo Empire hat einen reichen Feature-Set (Zoo, Börse, Minispiele, 3D-Welt, Events), aber:
- **Anfänger** sehen 10+ Optionen auf der Startseite und wissen nicht, wo anfangen
- **Bestehende Spieler** brauchen regelmäßige Ziele und Überraschungen, um täglich zurückzukommen
- **Retention** nach Tag 1-7 ist kritisch — dort entscheidet sich, ob Spieler bleiben

## Ziele

1. **Anfänger-Erlebnis:** Klarer, geleiteter Einstieg mit Quick Wins (erste Tiere, erste Coins)
2. **Early Progression:** Schnelle Ziele (Level 1-5, erste Sammlungen), die Stolz auslösen
3. **Daily Engagement:** Tägliche Gründe zurückzukommen (Rewards, Streaks, Time-Gates)
4. **Social Hooks:** Börse & Freunde motivieren zum Weiterspielen (Vergleiche, Handel)

---

## Vorschläge für Anfänger (Tag 0-3)

### 1. **Interaktives Onboarding (neue Route `/onboarding`)**

Zeigt **sequenziell** die Kern-Mechaniken:
- **Schritt 1:** "Lass dein erstes Tier frei" → Zoo-Screen, erstes Tier sammeln
- **Schritt 2:** "Verdiene deine ersten Coins" → Parkour/einfaches Minispiel spielen
- **Schritt 3:** "Stattet dein Tier aus" → Equipment anziehen
- **Schritt 4:** "Erlaufe die Welt" → /world kurz besuchen
- **Schritt 5:** "Verkaufe auf der Börse" → /market Einstiegs-Tutorial

Jeder Schritt hat ein **Skip**-Button, aber fast niemand skipped, wenn's schnell geht (< 30 s pro Schritt).

**Implementierung:**
- `OnboardingView.vue` mit einfacher State-Machine
- Lokales `localStorage: { onboarding_step, onboarding_done }`
- Nach Abschluss: Toast "🎉 Willkommen! Erkunde dein Zoo-Reich!"

### 2. **Gegensatz: "Verlorene Seelen" (Unfinished Sessions)**

Spieler, die die Onboarding nicht fertig machten, bekommen am nächsten Tag einen **"Weitermachen?"-Dialog**:
- "Du warst im Schritt Parkour — lass uns weitermachen!"
- Button: "Weitermachen" oder "Überspringen"

Hilft, Drop-offs zu reduzieren.

---

## Vorschläge für Early Game (Tag 1-7)

### 3. **Achievement-System mit Progression**

Einsteiger-Achievements (Auto-Unlock auf Basis von Spieleraktionen):
```
- 🌟 Erstes Tier gesammelt
- 💰 100 Coins verdient
- ⭐ Erstes Tier Stufe 2 aufgelevelt
- 🏆 Erstes Mini-Spiel gespielt (je Spieltyp)
- 🌍 Zoo-Welt besucht
- 💎 Erste Truhe geöffnet
```

**Belohnung:** Kleine Coin/Ticket-Boni (2-5 Coins pro Achievement), visuelles Abzeichen in Profil

**Effekt:** Gibt neuen Spielern Ziele, die sie ohnehin tun — aber mit Belohnung & Sichtbarkeit.

### 4. **"Erste Woche" Special Events**

Day 3, Day 5, Day 7 → automatische, zeitgebundene Events speziell für neue Spieler:
- Tag 3: "Sammler-Bonus" — 2× Tiere aus Truhen für 24 h
- Tag 5: "Markttag" — erste 5 Angebote sind kostenlos (um die Börse kennenzulernen)
- Tag 7: "Zucht-Starter" — erstes Ei kostenlos, wenn noch keine Zucht erfolgt

Belohnungen sind klein, aber vermitteln das Gefühl "das Spiel kümmert sich um mich".

---

## Vorschläge für Retention (Wochenwiederholende Features)

### 5. **Daily Mission Board** (neue Mini-Route in `/game`)

Tägliche Aufgaben (resetten um 00:00 UTC):
```
- 💪 Spiele 3 Min-Spiele (100 Coins)
- 🐾 Sammle 2 Tiere (50 Coins)
- 💎 Öffne eine Truhe (Ticket)
- 🌍 Besuche die Zoo-Welt (100 Coins)
- 👥 Kaufe/Verkaufe auf der Börse (50 Coins)
```

**Completion-Anreiz:** Alle 5 fertig? Bonus-Rewards (500 Coins, 2 Tickets, Emote).

**Implementierung:**
- Neue DB-Tabelle: `daily_missions` (user_id, mission_key, completed_at, day)
- RPC `claim_daily_mission` mit Server-zeitlicher Validierung
- Visuelles: `.mission-list` mit Check-Boxen + Progress-Bar

**Retentions-Effekt:** "Ich bin hier, weil ich meinen Daily-Streak nicht brechen will."

### 6. **Weekly Leaderboards mit Tokens**

Wochenweise Rankings nach:
- **Coins verdient diese Woche** (Aktivitäts-Ranking)
- **Tiere gesammelt diese Woche** (Collector-Ranking)
- **Börsen-Gewinne diese Woche** (Trader-Ranking)

**Belohnung für Top 10:** Tokens (Kosmetik-Währung), die in `/world` zum Ausrüsten der Tiere dienen.

**Feedback:**
- Live-Anzeige deiner aktuellen Platzierung
- Push-Notification am Freitag: "Du bist Top 5! Spiele noch heute..."

**Implementierung:**
- Neue View: `/leaderboards` (lazy)
- Query: aggregierte Rankings per Week aus Event-Logs
- Realtime-Subscription auf eigene Position

### 7. **Login Streaks mit exponentiellen Boni**

Tracking: Tage in Folge, an denen Spieler online waren (resetten bei Fehltag).

```
Day 1-2: +2% Coin-Bonus
Day 3-4: +5% Coin-Bonus  
Day 5-6: +10% Coin-Bonus
Day 7: +20% Coin-Bonus + Bonus-Tier (random)
```

**Visual:** Streaks-Counter in Header neben Coins (🔥 5)

**Sicherheit:** Berechnung Server-seitig (letzte Login-Zeit geprüft), damit nicht manipulierbar.

---

## Vorschläge für Bestandsspieler (+7 Tage)

### 8. **Saisonales Content-Roadmap (Quart. Updates)**

Jedes Quartal ein großes Thema-Update:
- Q4 2026: "Dino-Safari" (neue Tier-Familie, neue Truhe, Parkour-Level)
- Q1 2027: "Aquarium-Erweiterung" (Wasser-Tiere, neue Börse-Kategorie)
- Q2 2027: "Freundschafts-Events" (Co-op Mini-Games, Team-Leaderboards)

Jedes Update: 1-2 neue Minispiele, 10-15 neue Tiere, Event-Quest-Kette.

**Kommunikation:** Ankündigungen 2 Wochen vorher ("Was kommt nächsten Donnerstag?"), Hype aufbauen.

### 9. **Tier-Sonder-Events (monatlich)**

"Event-Garantie": Jeden Monat eine zufällige Tier-Familie, die 7 Tage lang:
- 3× häufiger aus Truhen droppt
- 2× höhere Trade-Gewinne bringt
- Exklusives Equip/Kosmetik-Item bekommt

**Beispiel:** "Löwen-Monat Sept" → Löwen überall, Löwen-Mähne-Helm nur diesen Monat.

**Effekt:** Spieler müssen Monat-für-Monat zurück, um ihre Lieblings-Familie zu komplettieren.

### 10. **Börsen-Volatilität & Trending Tickers**

Künstliche (nicht-manipulierbare) Kursbewegungen:
- Tier-Familie, die diese Woche am meisten gehandelt wird, bekommt +10% Kurs-Boost
- Random "Crash"-Events: Eine Tier-Familie sinkt 24h um -20% (schafft Drama & Handel-Chancen)
- "Pump"-Events: Eine seltene Art steigt plötzlich +30% → Social Media (Screenshots) entsteht

**Implementierung:**
- `market_volatility` Regel in `_market_model` (wöchentlich neu gewichtet)
- Cron-Job, der um 10:00 UTC ein Trending-Tier boosted/crasht
- Push: "🚀 Löwen boomen! +10% diese Woche"

**Effekt:** Spieler sind FOMO-getrieben, checken täglich den Markt.

---

## Implementation Roadmap

### Phase 1 (Woche 1): Kernfundament
- ✅ `OnboardingView.vue` + State-Machine
- ✅ Achievement-System (DB + RPC)
- ✅ Daily Missions Board

### Phase 2 (Woche 2-3): Engagement-Loops
- ✅ Login Streak Tracker
- ✅ Weekly Leaderboards
- ✅ Event-Scheduler für neue Spieler

### Phase 3 (Woche 4+): Long-Term Retention
- ✅ Börsen-Volatilität (Trending)
- ✅ Saisonales Inhalts-Roadmap (Design)
- ✅ Tier-Sonder-Events (Cron-Job)

---

## Metriken zum Tracken

**Anfänger (D0-D7):**
- Onboarding-Completion-Rate (% der neuen Spieler, die D1 zurückkommen)
- Day-1 Retention, Day-3, Day-7
- Durchschnittliche Spielsessions pro Tag

**Bestandsspieler:**
- Daily Active Users (DAU)
- Session-Länge (min)
- Börsen-Aktivität (Trades/Tag)
- Minispiel-Durchsätze

**Viral:**
- Friend-Invites (Börse → "Schau dir mein Portfolio an")
- Leaderboard-Shares
- Social-Screenshots pro Woche

---

## Zusammenfassung

Die Strategie dreht sich um drei Säulen:
1. **Clear Path für Anfänger** (Onboarding, Early Achievements)
2. **Daily Reasons to Return** (Missions, Streaks, Leaderboards)
3. **Surprise & Long-Tail** (Events, Volatilität, saisonale Updates)

Zoo Empire hat bereits fantastische Core-Mechanics (Börse, Minispiele, 3D-Welt). Mit diesen Retention-Layern wird es ein **Habit-Building Game**, das Spieler täglich zieht.

**Erfolgs-Kriterium:** D7-Retention > 35% (Idle-Game-Standard), DAU steigt, tägliche Börsen-Trades > 50.
