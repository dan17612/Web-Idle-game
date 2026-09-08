# Retention & Growth Roadmap — Zoo Empire

**Ziel:** Zoo Empire langfristig für Anfänger attraktiv und für Erfahrene herausfordernd halten.

## Status Quo

**Bereits implementiert:**
- ✅ 23+ Views (GameView, Minispiele, WorldView, Handel, etc.)
- ✅ 4 Minispiele (Memory, Drift, Parkour, Wordle)
- ✅ 3D Zoo-Welt mit Multiplayer & Realtime
- ✅ Tutorial-System (5 Schritte)
- ✅ Offline-Earnings, Tägliche Belohnungen
- ✅ Shop, Marktplatz, Leaderboard
- ✅ i18n (de/en/ru)
- ✅ Boss-Kämpfe & Tickets-System
- ✅ Freunde & Unterstützungs-Panel
- ✅ Tier-Ausrüstung und Leine in der Welt

**KPIs zum Beobachten:**
- Day-1 Retention (neue Spieler nach 1 Tag)
- Day-7 Retention (neue Spieler nach 7 Tagen)
- Session-Länge (Minuten pro Sitzung)
- Session-Häufigkeit (Tage pro Woche)
- Minispiel-Engagierung (% der Spieler, die diese spielen)

---

## Phase 1: Anfänger-Onboarding (Weeks 1–2)

### 1.1 Extended Tutorial mit Interactive Walkthroughs
**Problem:** Tutorial endet nach Schritt 5. Anfänger wissen oft nicht, was sie danach tun sollen.

**Lösung:**
- **Schritt 5–8:** Geführte Einführung in Minispiele
  - "Versuche das Memory-Spiel" → +500 Bonus-Taps (1×)
  - "Vollende dein erstes Drift-Spiel" → +100 Tickets (1×)
  - "Besuche den Shop und erkunde die Welt" → +10k Münzen (1×)
- **Schritt 9:** "Glückwunsch!"-Modal mit Übersicht: *„Du kannst jetzt..."*
  - 📱 Täglich Taps verdienen (Tap-Upgrades erklärt)
  - 🎮 Minispiele spielen für Tickets
  - 🐾 Tiere sammeln im Shop
  - 🌍 Freunde in der Welt treffen

**Lokalisierung:** Text-Keys in `src/i18n.js`, Modal-Komponente, localStorage-Tracking

**Aufwand:** 1–2 Tage (UI + Logik + Tests)

---

### 1.2 Anfänger-Missionen (Quest Log)
**Problem:** Spieler brauchen klare Kurzzeitziele. Idle-Games leben von Fortschrittsanzeigen.

**Lösung:**
- Neue View: `QuestsView.vue`
- **Anfänger-Quest-Set (Woche 1):**
  1. Kaufe 3 verschiedene Tierarten → 5k Bonus-Taps
  2. Fütter einen Liebling + nutze sein Tap-Bonus → 1k Münzen
  3. Spiele 5 Minispiele (mix) → 50 Tickets
  4. Sende 1k Münzen an einen Freund → 2k Münzen Reward
  5. Erreiche 100k Münzen Gesamtvermögen → +1 Tier kostenfrei

- **Durchlaufende Quests (resets täglich/wöchentlich):**
  - *Täglich:* Verdiene 50k Münzen (passiv) → +2k Bonus
  - *Täglich:* Spiele 2 Minispiele → +20 Tickets
  - *Wöchentlich:* Erreiche Rang X im Boss-Path → +500 Tickets

**Tracking:** New Table `player_quests` mit `user_id, quest_id, progress, completed_at`

**UI:** Quick-Action auf GameView-Übersicht + Badges für abgeschlossene Quests

**Aufwand:** 3–4 Tage (Schema + RPC + View + i18n)

---

### 1.3 Early-Game Balancing
**Problem:** Neulinge verlieren schnell Motivation, wenn Progression zu langsam ist.

**Lösung:**
- **Tap-Generator schneller:** Erste 3 Tiere verdienen +25% mehr (neue Flag `starter_boost_until_count`)
- **Offline-Limit erhöht:** Nicht 8h, sondern 12h für neue Spieler (< 3 Tage)
- **Erste Shop-Tiere Rabatt:** 1. und 2. Tier-Kauf -30%
- **Tägliche Belohnung neu:** Skala: Tag 1: +5k, Day 7: +50k, Day 14: +100k (kumulativ spannender)

**Balancing-DB:**
```sql
-- Neue Spalte in profiles
ALTER TABLE profiles ADD COLUMN created_at timestamp default now();
ALTER TABLE profiles ADD COLUMN starter_boost_enabled boolean default true;
```

**Code-Änderungen:**
- `src/animals.js`: Helper `getIncomeWithBoost(species, isStarterBoosted)`
- `src/stores/game.js`: Berechnung anpassen
- Server-RPC (`buy_animal`) mit Boost-Check

**Aufwand:** 1–2 Tage

---

## Phase 2: Mitte-Game-Bindung (Weeks 3–4)

### 2.1 Battle-Pass / Seasonal Tiers
**Problem:** Erfahrene Spieler brauchen Langzeit-Ziele über Wochen.

**Lösung:**
- **Saison (z. B. 28 Tage):** "Bronze → Silver → Gold → Platin"
- **Fortschritt durch:** Minispiele spielen (XP sammeln), Boss-Path komplettieren, Daily Challenges
- **Rewards pro Tier:**
  - Bronze: +100 Tickets
  - Silver: +Seltene Tier-Variante (Skin) + 250 Tickets
  - Gold: +25k Bonus-Taps + 500 Tickets
  - Platin: +Premium-Outfit für die Welt + 1k Tickets

**DB-Schema:**
```sql
CREATE TABLE seasons (
  id serial primary key,
  name text,
  start_date date,
  end_date date
);

CREATE TABLE season_progress (
  user_id uuid primary key references profiles,
  season_id int references seasons,
  xp int default 0,
  tier text default 'bronze'
);
```

**Aufwand:** 4–5 Tage (Schema + RPC + Reward-Engine + UI)

---

### 2.2 Tier-Evolution & Varianten
**Problem:** Nach 50 Tieren wird das Sammeln repetitiv.

**Lösung:**
- **Jedes Tier hat Varianten:** Standard, Shiny, Golden, Shadow (4 Versionen)
- **Freischaltung:**
  - Standard: Im Shop kaufbar
  - Shiny: +5% Einkommen, zufällig aus Boss-Kämpfen (Ticketing)
  - Golden: +15%, max 1 pro Spezies (Event-Reward)
  - Shadow: Spezielle Kampagne (zB. Halloween)
- **Visuelle Unterscheidung:** Emoji mit Suffix (`🐔 ✨` = Shiny, `🐔 👑` = Golden)

**DB-Änderung:**
```sql
ALTER TABLE animals ADD COLUMN variant text default 'standard' CHECK (variant IN ('standard', 'shiny', 'golden', 'shadow'));
```

**Aufwand:** 3–4 Tage (Schema + Icon-System + Drop-Logic)

---

### 2.3 Collection Achievements
**Problem:** Sammler brauchen Meilensteine.

**Lösung:**
- Neue Achievements (unlockbar, nicht versteckt):
  - "Starter-Set": Habe alle 3 einfachen Tiere (Küken, Huhn, Hase)
  - "Zähmerin": Habe 10 verschiedene Tiere
  - "Zoobessitzerin": Habe 1 von jeder Spezies
  - "Shiny-Sammler": Habe 5 Shiny-Varianten
  - "Tausendkünstler": Habe 1000 Tiere insgesamt
- **Reward:** Coins + Tickets + Spezial-Tier-Slot (limitiert pro Season)

**UI:** Badges in ProfileView, Tracker in Inventory

**Aufwand:** 2 Tage

---

## Phase 3: Late-Game Content (Weeks 5–6)

### 3.1 Kampagnen & Story-Events
**Problem:** Statische Inhalte ermüden nach Wochen.

**Lösung:**
- **Wöchentliche Kampagnen** (zeitgebunden, 7 Tage):
  - *"Der Drachen-Raid"* (Woche 1–4): Boss-Path exklusiv schwerer, +Tickets, spezial Drachen-Skin
  - *"Memory-Marathon"* (Woche 5–8): Memory mit 7×7-Gitter (extrem) + Leaderboard, +Coins
  - *"Wordle Weltmeisterschaft"* (täglich): Wordle mit 3 Challenges pro Tag, Top 10 gewinnen +500 Tickets
- **Story-Rewards:** Beim Abschluss wird eine kurze Narration gezeigt (via Modal/Toast)

**UI:** Kampagnen-Banner auf GameView, Countdown-Timer, Progress-Bar

**Aufwand:** 5–6 Tage (RPC + Kampagnen-State + Narration-i18n)

---

### 3.2 Freunde-Herausforderungen (PvP-Light)
**Problem:** Multiplayer-World wird schnell zur Kulisse ohne Mechaniken.

**Lösung:**
- **Freunde-Duell-Mode:**
  - Fordere Freund zu Memory-Duel heraus (best-of-3, Echtzeit)
  - Gewinner: +100 Tickets, beide: XP für Season
- **Cooperative Mode (WorldView):**
  - Gemeinsamer Boss-Kampf: Mehrere Spieler schlagen auf einen Boss ein, geteilte Belohnung
  - Braucht Realtime-Koordination über Supabase `broadcast`

**DB:**
```sql
CREATE TABLE friend_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid references profiles,
  challenged_id uuid references profiles,
  game_type text, -- 'memory', 'drift', 'boss'
  state text default 'pending', -- 'pending', 'accepted', 'in_progress', 'completed'
  winner_id uuid references profiles,
  created_at timestamp default now()
);
```

**Aufwand:** 6–7 Tage (Realtime-Logik + Synchronisierung + Tests)

---

### 3.3 Prestige / New Game + Mode
**Problem:** Maxed-out Spieler haben nichts mehr zu tun.

**Lösung:**
- **Prestige-System:**
  - Wenn Spieler ≥500 verschiedene Tiere hat + Level 100+ Taps: "Neustart möglich"
  - Wähle 1 Tier zum "Erben" (es wird 2×-Level stärker) + reset alles andere
  - Belohnung: +500 Tickets + Prestige-Badge (zeigt "2× Prestige" an)
  - Neue Tier-Variante: "Gerücht"-Tiere (nur im Prestige-Mode, +30% income)

**UI:** SettingsView → "Prestige"-Button mit Bestätigungsmodal

**Aufwand:** 3 Tage

---

## Phase 4: Live Ops & Events (Ongoing)

### 4.1 Thematische Events (zB. alle 2 Wochen)
- **🎃 Halloween** (Okt): Shadow-Tiere freigeschaltet, dunkle Skins
- **❄️ Winter** (Dez): Festliche Skins, Schnee-Arena in Parkour
- **🎆 Neujahr** (Jan): Double-XP-Wochenende, Feuerwerk in der Welt
- **🌸 Frühling** (Apr): Neue Blumen-Farm-Skins, Baby-Tiere (süßer gezeichnet)

**Implementierung:**
- `world_items` mit `valid_from`/`valid_to` Datum
- RPC `get_seasonal_items()` filtert automatisch
- i18n Keys für Event-Namen & Beschreibungen

---

### 4.2 Limited-Time Raffles (1–2× pro Monat)
- **Draw-Mechanic:** Kaufe 1–100 Tickets für 5k–100k Coins
- **Pool:** 1× Golden-Tier + 5× Shiny + 50× Bonus-Taps + 500× Tickets
- **Rewards:** Anzeige am Ende, Social-Share-Button ("Ich gewann XYZ in Zoo Empire! 🎉")

**DB:** `raffle_entries`, `raffle_results` mit Zeitstempel

**Aufwand:** 2–3 Tage

---

### 4.3 Leaderboard Anpassungen
**Aktuell:** Top 50 nach Coins / Tiere / Tickets

**Verbesserungen:**
- **Neue Kategorien:**
  - "Diese Woche" (zurückgesetzt Mo 00:00 UTC)
  - "Schnellste Progression" (Coins/min in der letzten Woche)
  - "Minispiel-Master" (höchster Boss-Path Level)
  - "Sammler-Rekord" (verschiedene Tiere)
- **Badges neben Namen:** ⭐ Prestige, 🏆 #1 diesen Monat, 🎮 1000+ Spiele
- **Friends Filter:** "Nur Freunde zeigen"

**Aufwand:** 2 Tage (Queries + UI)

---

## Metriken & Messungen

### Primary KPIs
| KPI | Target | Check Frequency |
|-----|--------|-----------------|
| D1-Retention | 45% → 60% | Täglich |
| D7-Retention | 20% → 35% | Wöchentlich |
| DAU (Daily Active Users) | +30% | Täglich |
| Avg Session-Länge | 15 min → 25 min | Wöchentlich |
| Minispiel-Beteiligung | >70% der Spieler | Wöchentlich |

### Secondary KPIs
- **Churn-Gründe** (Exit-Survey): "Zu langsam", "Zu repetitiv", "Verwirrend"
- **Funnel-Analyse:** Signup → Tutorial → Erstes Minispiel → Aktiv nach 7 Tagen
- **A/B-Tests:** 
  - Anfänger-Missionen aktiv vs. inaktiv
  - Starter-Boost 25% vs. 50%
  - Early-Access zu Premium-Events

---

## Implementierungs-Timeline

| Phase | Features | Sprint | Owner |
|-------|----------|--------|-------|
| **1** | Tutorials, Quests, Early-Game Balancing | Sep 1–15 | Squad 1 |
| **2** | Seasonal Pass, Tier-Varianten, Achievements | Sep 16–29 | Squad 2 |
| **3** | Kampagnen, PvP, Prestige | Okt 1–15 | Squad 3 |
| **4** | Events, Raffles, Leaderboards | Okt 16+ | Live Ops |

---

## Risiken & Mitigationen

| Risiko | Auswirkung | Mitigation |
|--------|-----------|-----------|
| Performance bei 1000+ Tieren | Laggy Inventory | Virtualisiertes Scrolling, Lazy-Loading |
| Neue Anfänger zu überfordert | High Churn | A/B-Test Tutorial-Länge (kurz vs. erweitert) |
| Prestige-Loop zu grindlastig | Burn-out Vet | Prestige-Rewards auf 5×, nicht 10× |
| Events-Fatigue | DAU sinkt | Max 1 großes Event/Woche, Downtime am Wochenende |
| Balancing-Fehler in Varianten | P2W-Wahrnehmung | Golden-Tiere nur kostenlos (niemals Pay-to-Win) |

---

## Erfolgs-Szenarien

### 🟢 Best Case (nach 8 Wochen)
- D1 Retention: 60%
- D7 Retention: 35%
- Avg Session: 25 min
- **Neue Spieler bleiben**: Quests + Tutorials halten 60% länger
- **Vets verdienen**: Seasonal Pass + Events → 10–20 Std/Woche spielen

### 🟡 Realistic Case
- D1 Retention: 55%
- D7 Retention: 28%
- Avg Session: 20 min
- **First Optimierung-Runde:** Nach 2 Wochen Quest-Difficulty anpassen

### 🔴 Risk Case
- D1 Retention: 45% (wie zuvor)
- D7 Retention: 20% (wie zuvor)
- → **Pivot nötig:** Fokus auf UI-Zugänglichkeit statt Content

---

## Nächste Schritte

1. **Week 1:** Priorisierung mit Team (Voting: Tutorial > Quests > Balancing?)
2. **Week 1–2:** Design-Docs für Quests & Seasonal Pass
3. **Week 2–3:** Implementation Phase 1 (Tutorial + Quests)
4. **Week 3:** Soft-Launch (10% Spieler) + Monitoring
5. **Week 4:** Rollout zu 100%, erste Metriken-Analyse
6. **Week 5+:** Phase 2 basierend auf Feedback

---

## Anhang: Feature-Request-Priorisierung

### High (Sehr wichtig)
- ✅ Tutorial erweitern → Impact: +15% D1
- ✅ Quests hinzufügen → Impact: +20% D7, +30% Session-Länge
- ✅ Early-Game Balancing → Impact: +10% D1

### Medium (Wichtig)
- ✅ Seasonal Pass → Impact: +15% D7
- ✅ Tier-Varianten → Impact: +5% DAU (neue Sammler-Motivation)
- ✅ Achievements → Impact: +3% DAU

### Low (Nice-to-Have)
- ✅ Freunde-Duels → Impact: +2% DAU (komplexe Logik)
- ✅ Prestige → Impact: nur für Top-5% Spieler
- ✅ Thema-Events → Kann monatlich addiert werden

---

*Geschrieben: 2026-09-08*
*Stand: Draft zur Review*
