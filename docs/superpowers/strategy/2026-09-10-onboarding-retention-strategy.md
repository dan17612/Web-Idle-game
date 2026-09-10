# Zoo Empire — Onboarding & Retention Strategy

**Datum:** 2026-09-10  
**Zweck:** Dieses Dokument definiert eine Strategie, um Zoo Empire für Neulinge attraktiv und für bestehende Spieler langfristig fesselnd zu gestalten.

---

## Executive Summary

Zoo Empire hat eine solide Basis mit 9+ Minispiele-Features, 3D-Zoo-Welt, Freunde-System und Leaderboards. Um zu wachsen und zu halten, braucht es:

1. **Klares Onboarding** für Neulinge (was tue ich als erstes?)
2. **Tägliche Anreize** für Retention (warum soll ich morgen zurückkommen?)
3. **Progressive Feature-Freischaltung** (nicht alles auf einmal)
4. **Soziale Mechaniken** (Freunde, Kooperation, Events)
5. **Regelmäßiger neuer Content** (Saisonale Events, Challenges)

---

## Problemanalyse

### Für Neulinge

| Problem | Impact | Priorität |
|---------|--------|-----------|
| **Keine klare Einführung** | Spieler wissen nicht, wo sie anfangen sollen — zu viele Navigation-Optionen (9 Routen) | 🔴 Kritisch |
| **Zu viele Features gleichzeitig** | Überforderung: Shop, Inventory, Tickets, Minispiele, Zoo-Welt — wo ist der Einstieg? | 🔴 Kritisch |
| **Keine visuellen Ziele** | Keine Progression sichtbar (wie viel Einkommen habe ich? Wann nächstes Tier?) | 🟠 Hoch |
| **Slow Start** | Erste Tiere sind teuer (250 Coins für Huhn) — erst nach ~500 Taps verdient | 🟠 Hoch |
| **Keine Motivation zur Zoo-Welt** | 3D-Feature ist cool, aber warum sollte ein Anfänger hin? (Nur Kosmetik, Brunnen) | 🟡 Mittel |

### Für bestehende Spieler

| Problem | Impact | Priorität |
|---------|--------|-----------|
| **Repetitiv** | Nach x Stunden: Tiere tippen, Minispiele spielen — dann was? Kein Endgame-Sinn. | 🔴 Kritisch |
| **Fehlende tägliche Anreize** | Kein Grund, täglich zu spielen (außer Brunnen-Münze 1×/Tag) | 🔴 Kritisch |
| **Soziale Features schwach** | Freunde-System existiert, aber: kein Kooperation-Gameplay, keine Team-Challenges | 🟠 Hoch |
| **Unklare Progression** | Wann bin ich "fertig"? Keine Milestones nach dem letzten Tier | 🟠 Hoch |
| **Keine Events** | Kein saisonaler Content, keine Limited-Time-Challenges → Monotonie | 🟠 Hoch |

---

## Kernmechaniken der Engagement

### Was hält Spieler?

Nach Idle-Game-Forschung:

1. **Progression sehen** (Level, Tiers, Prozentbalken)
2. **Tägliche Rituale** (Daily Login, Quests, Rewards)
3. **Soziale Mechanik** (Freunde, Leaderboards, Events)
4. **Kleine, regelmäßige Wins** (Notifications, Drops, Überraschungen)
5. **FOMO** (Limited-Time, Events, Seasonal)
6. **Prestige-Systeme** (Cosmetics, Titles, Achievements)

---

## Nächste Schritte (Roadmap 3 Monate)

### Phase 1: Onboarding (Woche 1–2)

**Ziel:** Neulinge in 3–5 Min. das Spiel verstehen und einen Grund haben, zurückzukommen.

#### 1.1 Interaktives Tutorial
- **Trigger:** Neue Spieler (nach Login)
- **Flow:**
  1. "👋 Willkommen in Zoo Empire!" — Dein Ziel: Tiere sammeln & Coins verdienen
  2. Erstes Tier geschenkt (z. B. Küken kostenlos) → Sofort TAP-Feedback
  3. "Sehe dein Einkommen →" (Income anzeigen)
  4. "Mehr Tiere = mehr Coins →" (Shop zeigen, billiges 2. Tier empfehlen)
  5. "Spiele Minispiele für Bonuscoins →" (Parkour/Wordle kurz zeigen)
  6. "Triff andere in der Zoo-Welt →" (Welt-Button, Brunnen erklären)
- **Komponente:** `TutorialFlow.vue` (Sequenz mit Skip-Knopf, Dark-Overlay für Focus)
- **Datenspeicherung:** `tutorial_completed` in `profiles.tutorial_completed` (Boolean)

#### 1.2 Starter-Bundle für neue Spieler
- **Bonus:** +500 Start-Coins (kaufe schneller 2–3 Tiere)
- **Bonus:** +10 einmalige Bonus-Taps (schneller Feeling der Kraft)
- **UI-Hint:** "🎁 Starter-Bonus — gültig nur heute" (Time-bound für FOMO)
- **Umsetzung:** Flag `profiles.starter_bundle_claimed` in Auth-Handler

#### 1.3 Quest-System (Minimalversion)
- **Erstes Feature für neue Spieler:**
  - "Kaufe 3 verschiedene Tiere" → +100 Coins Reward
  - "Verdiene 10.000 Coins" → +50 Coins + +1 Ticket
  - "Spiele dein erstes Minispiel" → +25 Tickets
- **UI:** Quest-Log in GameView als Karte; Haken-Häkchen für Fortschritt
- **Motivation:** Gibt konkrete Ziele, nicht nur "tap forever"

#### 1.4 Progressive Feature-Freischaltung
- **Level-basiert oder nach Milestone:**
  - Level 1 (0 Coins): Game + Shop
  - Level 2 (1K Coins): +1 Minispiel (Parkour)
  - Level 5 (10K Coins): +Friends (Leaderboard später)
  - Level 10 (50K Coins): +Inventory, +World
- **Visual:** Badge "🔓 Neue Route freigeschaltet!" beim Levelup
- **Datenschema:** `profiles.unlocked_routes` (JSON-Array) statt hart-codiert

---

### Phase 2: Tägliche Engagement (Woche 3–4)

**Ziel:** Spieler haben einen Grund, täglich zu spielen.

#### 2.1 Daily Login Rewards
- **System:**
  - Tag 1: +100 Coins
  - Tag 2: +100 Coins
  - Tag 3: +50 Tickets
  - Tag 4: +100 Coins
  - Day 5: +100 Coins + +1 Multiplier-Boost (3 h: +25% income)
  - Day 6: +200 Coins
  - Day 7: +1.000 Coins + +3 Multiplier-Boost + 🏆 "Wochenmeister"
- **Streak-Mechanic:** Verzeihe 1 Abend Pause (Doppel-Login morgen = Streak erhalten)
- **UI-Trigger:** Pop-up beim Login "🎁 Deine tägliche Belohnung" (mit Claim-Button)
- **Schema:** 
  ```sql
  ALTER TABLE profiles ADD COLUMN last_login date, daily_streak integer DEFAULT 0;
  ```

#### 2.2 Tägliche Challenges (Mini-Quests)
- **3 neue Challenges täglich (resettet um 00:00 UTC):**
  - "Gewinne 500.000 Coins heute" → +25 Tickets
  - "Spiele 5 Min. in einem Minispiel" → +50 Tickets
  - "Besuche einen Freund in der Zoo-Welt" → +100 Coins
- **UI:** Karte in GameView "Heute's Challenges" mit Fortschrittsbalken
- **Mobile-friendly:** Sortbar nach "In Progress / Completed"

#### 2.3 Offline Engagement
- **Push-Benachrichtigungen (opt-in):**
  - "Dein Einkommen wartet! +5M Coins erwartet dich." (nach 4 h Offline)
  - "Tägliche Challenge läuft ab in 2 h" (um 22:30 UTC)
  - "Dein Freund hat ein Tier aus der Zoo-Welt geteilt 🐯" (Social-Moment)
- **Email:** Täglicher Digest (optional, nur Premium-Spieler?)

---

### Phase 3: Soziale Features & Events (Woche 5–8)

**Ziel:** Freunde halten Spieler länger. Events geben kurzfristige Intensität.

#### 3.1 Friend-Quests
- **Kooperativ:**
  - "Grüßt euch gegenseitig in der Zoo-Welt 5×" → +500 Coins für beide
  - "Finde die gleichen 3 Tiere wie dein Freund" → +1.000 Coins + +50 Tickets
- **Kompetitiv:**
  - "Parkour-Battle: Wer hat den höheren Score diese Woche?" → Gewinner +500 Coins
  - "Minispiel-Rush: Wer spielt mehr Wordle-Runden?" → Leaderboard + Titelbonus
- **UI:** Friends-Tab → "Aktiv mit XY" / "Quests mit XY"

#### 3.2 Events (Limited-Time, 2–3 pro Monat)
- **Event 1: Herbst-Fest (15.–22.09.)**
  - Neues Tier: Kürbis-Vogelscheuche (limitiert)
  - Challenge: Sammle 1M Coins → erhalte Kürbis-Outfit
  - Täglicher Bonus-Drop (Orange-Münze 2× pro Tag)
- **Event 2: Freunde-Wochenende (01.–03.10.)**
  - Doppelte Coins bei Minispielen mit Freund im Multiplayer-Mode (noch zu implementieren)
- **Event 3: Season-Pass / Battle-Pass (Monat)**
  - Kostenlos: 20 Tiers mit Rewards (Coins, Tickets, Cosmetics)
  - Premium (100 Coins): +20 weitere Tiers, exklusive Skins
  - Motiviert tägliches Spielen

#### 3.3 Saisonales Theme
- **Sept–Okt:** 🍂 Herbst (Kürbise, Lauben, warme Farben)
- **Nov–Dez:** ❄️ Winter (Schnee, Lichter, Weihnacht-Kostüme)
- **Jan–Feb:** 💜 Valentinstag (Herzen, Freundschafts-Tiere)
- **Shop-Theme:** Saisonale Kosmetik (Outfits, Tiere-Effekte, Farm-Skins)

#### 3.4 Leaderboard-Varianten
Aktuell: nur "Top 50 Coins"  
**Erweitern um:**
- "Diese Woche — Coins-Gewinn" (Volatilität, neue Spieler können gewinnen)
- "Diese Woche — Minispiel-Scores" (Skill-basiert)
- "Monatlich — Event-Punkte" (Engagement, nicht nur Grinding)
- **Reward:** Top 3 erhalten Cosmetik-Badge 🏅 (sichtbar im Profil)

---

### Phase 4: Endgame & Prestige (Woche 9–12)

**Ziel:** Veteranen haben langfristige Ziele.

#### 4.1 Prestige-System
- **"Ascend"-Mechanic:**
  - Alle Tiere reset → erhalte cosmetic Badge + +10% Income-Multiplier permanent
  - Ascensions zählen (Level 1, 2, 3 Ascensions)
  - Nur nach Sammlung aller Tiere oder nach 1 Monat Spielzeit
- **Cosmetic-Tiers:** Avatar-Border, Title ("⭐ Ascended"), Unique-Outfit

#### 4.2 Achievements / Trophy-Cabinet
- **Kategorien:**
  - Gameplay: "Verdiene 1M Coins", "Sammle alle 10 Tiere", "Gewinne 10 Parkour-Rennen"
  - Social: "Freunde 5 Spieler", "Teile einen Screenshot", "Erhalte Like von Freund"
  - Cosmetic: "Kaufe alle Outfits", "Sammle alle Farm-Skins"
- **Rewards:** Coins, Tickets, Cosmetics, Titles
- **UI:** Trophy-Raum im Profil (Grid mit Abzeichen)

#### 4.3 Guild / Clan-System (optional, Phase 2)
- **Später:** Spieler können Gilden gründen/beitreten
- **Mechanic:** Wöchentliche Guild-Quests (kollektive Fortschrittsbalken)
- **Reward:** Guild-exklusive Kosmetik, Münz-Multiplier
- **Motivation:** Soziale Haftung (Gildenmitglieder motivieren sich gegenseitig)

#### 4.4 Content-Roadmap für Spieler einsichtbar
- **Seite: "/roadmap"** (bereits implementiert 🎉)
- **Zeige nächste Features an:**
  - "🔜 Guild-System (Oktober)"
  - "🔜 Co-Op Minigames (November)"
  - "🔜 Tier-Evolution / Upgrades (Dezember)"
- **Motivation:** Spieler wissen, wann es neue Inhalte gibt → bleiben dabei

---

## Implementierungs-Checkliste

### Sofort (diese Woche)
- [ ] **Tutorial-Flow** (`TutorialFlow.vue`) — Prototyp mit Skip
- [ ] **Starter-Bundle UI** — Pop-up mit Bonus-Claim
- [ ] **Quest-System DB** — Migrations für `player_quests` Tabelle
- [ ] **Daily Login-System** — `profiles.last_login`, RPC `claim_daily_login`

### Kurzfristig (nächste 2 Wochen)
- [ ] **Daily Challenge RPC** — `get_daily_challenges()`, `complete_daily_challenge(quest_id)`
- [ ] **Progressive Unlock Logic** — Level-basierte Route-Freischaltung
- [ ] **Daily Reward UI** — Toast-Popup + Claim-Button
- [ ] **Push-Notification Setup** — (braucht Service Worker / Capacitor)

### Mittelfristig (nächster Monat)
- [ ] **Event-System** — Tabelle `events`, `event_participants`, RPCs
- [ ] **Event-UI** — Event-Modal mit Challenges + Countdownuhr
- [ ] **Leaderboard-Varianten** — Neue SELECT für "weekly", "category"
- [ ] **Friend-Quests** — Kooperative & kompetitive Quests
- [ ] **Season Pass** — Tier-System mit Progress, JSON-Rewards

### Langfristig (2–3 Monate)
- [ ] **Prestige-System** — Ascend-RPC, Multiplier-Speicherung
- [ ] **Achievement-Cabinet** — UI, Badge-Vergabe
- [ ] **Guild-System (v1)** — Schema, Create/Join RPCs, Guild-Chat

---

## UX-Patterns für beide Zielgruppen

### Neulinge
| Moment | Action | Warum |
|--------|--------|-------|
| **Nach Login** | Tutorial-Pop-up | Orientierung |
| **Erstes Tier kaufen** | Aktion zeigt "+X Coins/Sek" | Ursache-Wirkung sichtbar |
| **Nach 10 Minuten** | "Spiele jetzt ein Minispiel" | Momentum erhalten |
| **Nach 1 Stunde** | Daily Challenge anzeigen | Grund, morgen zurückzukommen |
| **Vor Logout** | "Komm morgen für +100 Coins zurück" | Anker für nächste Session |

### Bestehende Spieler
| Moment | Action | Warum |
|--------|--------|-------|
| **Nach Login** | Zeige neuen Event-Banner | FOMO + Aufregung |
| **Vor Minispiel** | "Dein bester Score: 8.234 Punkte" | Spieler-Vergleich |
| **Nach Tier-Kauf** | Event-Progress aktualisieren | Fortschritt direkt sichtbar |
| **Nach Logout** | "Komm in 4 h zurück — 20M Coins warten!" | Passive Rewards |
| **Nachricht erhalten** | "Dein Freund grüßt dich 👋" | Soziale Resonanz |

---

## Metriken zum Beobachten

### Neulinge (Day-1 / Day-7 Retention)
- % der neuen Spieler, die nach 1 Tag zurückkommen
- % der neuen Spieler, die Tutorial abschließen
- Durchschnittliche Zeit bis "erstes Minispiel gespielt"
- Durchschnittliche Session-Länge (sollte 5–10 Min. sein)

### Bestehende Spieler
- Daily Active Users (DAU)
- % die tägliche Challenge abschließen
- % die Events besuchen
- Leaderboard-Rotation (neue Namen in Top 10?)
- Event-Partizipation (wie viele Events pro Spieler)

### Allgemein
- Churn Rate (wer hört auf zu spielen nach X Tagen)
- Average Session Length (sollte steigen mit Events)
- Revenue (Cosmetics, Season Pass)
- LTV (Lifetime Value eines Spielers)

---

## Technische Schulden (parallel adressieren)

Während Onboarding & Retention gebaut wird:

1. **Performance:** Zoo-Welt hat WebGL-Leaks — Review `src/worldEngine.js`
2. **Analytics:** Supabase-Edge-Function für Event-Tracking (was spielen, wann offline, etc.)
3. **Notifications:** Service Worker + Firebase Cloud Messaging (Android/iOS)
4. **A/B Testing:** Spalte Features auf (80% alte UI, 20% neue UI) — messe Retention
5. **Localization:** i18n auf Ru/Fr erweitern? (noch nur de/en/ru, aber ru unvollständig)

---

## Zusammenfassung

**Neulinge brauchen:**
- ✅ Klare Einführung (Tutorial)
- ✅ Schnelle Wins (Starter-Bundle)
- ✅ Konkrete Ziele (Quests)

**Bestehende Spieler brauchen:**
- ✅ Tägliche Anreize (Login-Rewards, Daily Challenges)
- ✅ Soziale Bindung (Friend-Quests, Events)
- ✅ Langfristige Ziele (Prestige, Achievements)

**Alles zusammen:**
- ✅ Events für alle (zeitlich begrenzt, Spannung)
- ✅ Sichtbare Roadmap (Vertrauen, dass Content kommt)
- ✅ Saisonale Themen (frisch bleiben)

Diese Strategie sollte **Retention um 30–50%** verbessern und **neuen Spielern Selbstvertrauen** geben.

---

**Nächste Aktion:** Jedes Feature bekommt ein separates Designdoc (`2026-09-10-tutorial-design.md`, `2026-09-10-daily-login-design.md`, etc.) vor Implementierung.
