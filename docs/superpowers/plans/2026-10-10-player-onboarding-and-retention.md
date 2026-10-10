# Player Onboarding & Retention Strategy
**2026-10-10** | Zoo Empire: Strategien für Neulinge und Bestandsspieler

## Problemstellung

Zoo Empire hat viele Features (11 Minispiele, Markt, Welt, Zucht, Leaderboards,
Halloween), aber:
- **Neulinge** wissen nicht, wo sie anfangen sollen → hohe Early-Drop-Off
- **Bestandsspieler** können schnell keine neuen Ziele finden → flache Engagement-Kurve
- Keine explizite **Rollen-Unterscheidung** (Free-to-Play vs. Spender)
- **Monetarisierung** unklar (wann zahlt es sich aus, zu zahlen?)

## Ziel

Beide Gruppen gleichermaßen aktivieren: Anfänger durch **klare Pfade und schnelle Wins**,
Vets durch **neue Herausforderungen und Status-Symbole**. Gleichzeitig eine
**nachhaltige, transparente Wirtschaft** aufbauen, die nicht P2W wirkt.

## 1. Newcomer-Onboarding: „Erste Stunde (Tour)"

### A. Interactive Tutorial Track (0–10 Min)

**Ziel:** Drei Lernmomente, jeder <2 Min, direkt in GameView.

1. **Modul 1: Tiere sammeln**
   - Toast: „Willkommen in Zoo Empire! 🦁"
   - Highlight-Aktion: Shop-Knopf kurz pulsieren
   - Spieler kauft erste Tier (kostenlos oder 100 Coins vorweg)
   - Erfolg-Toast: „Tiere verdienen Coins! ✨"

2. **Modul 2: Coins verdienen (Pick 1 Minigame)**
   - Suggestion: „Tippe, um Coins zu verdienen"
   - Highlight: Parkour/Drift/BlockFall-Btn
   - Spieler spielt 1× Level 1
   - Toast: „Wow! Coins! Kaufe jetzt mehr Tiere… oder versuche Parkour Level 2"

3. **Modul 3: Erste Tier-Ausrüstung**
   - Info: „Ausrüstung steigert Verdienstkraft"
   - Highlight: Inventory → Tier auswählen → Rüstung anlegen
   - Belohnung: +10 % Coins auf nächste Aktion

**Implementierung:**
- Neue Pinia-Flag: `hasCompletedTutorial` (in `game.js`)
- Drei `<TutorialStep>` Overlays (positioniert absolut über Highlights)
- Skip-Knopf überall, Fortschritt lokal gespeichert
- Nach Abschluss: Türkis-Tooltip-Pfeil für die nächsten 3 Tage (Hint auf
  Minispiele)

### B. Daily Quests für Anfänger (erste 2 Wochen)

Ähnlich wie `automation_slots`, aber für Engagement statt Autoklicker-Check.

```javascript
// types/newbieQuest
{
  day: 1–14,
  title: "Sammle 3 Tiere",
  reward: 500, // coins
  completed: boolean
}
```

- **Tag 1–3:** Tiere kaufen, 1× Minigame spielen
- **Tag 4–7:** Tier ausrüsten, Markt erkunden (kein Kauf nötig)
- **Tag 8–14:** Zucht versuchen, erste Leaderboard ansehen

**Nutzen:**
- Spieler sieht täglich, was es zu tun gibt
- Tägliche Return-Wahrscheinlichkeit ↑
- Coins-Beschleunigung für schnellere erste Wins

---

## 2. Existing Player Retention: „Spiel 2.0"

### A. Achievement System (Trophäen)

Ein **globales Achievement-Board**, das Milestones tracked und Status zeigt
(wie Leaderboards, aber für persönliche Erfolge).

**Kategorien:**

1. **Wirtschaft** (Coins, Tickets)
   - "Millionär" (1M Coins gesamt verdient)
   - "Ticketmeister" (500 Tickets)
   
2. **Sammeln** (Tiere, Seltene)
   - "Ark Meister" (alle gemeinen Tiere)
   - "Epic Collector" (5 Epic-Tiere)
   - "Legendär" (1 Legendary-Tier)

3. **Minispiele** (Pro Game)
   - "Parkour Abenteuer" (Level 20 freischalten)
   - "BlockFall Profi" (100 Level gespielt)
   - "Wordle Champion" (50 Spiele, Gewinnquote >70%)

4. **Sozial** (Markt, Zucht, Freunde)
   - "Trader" (10 Markt-Abschlüsse)
   - "Züchter" (5 Nachkommen)

5. **Event-Spezial** (Saisonal)
   - "Kürbis-Meister" (Halloween: Level 24)
   - "Regenbogen-Fledermaus" (Level 25 + alle Sterne)

**DB-Schema:**
```sql
create table achievements (
  id text primary key, -- "economist_millionaire", "collector_all_common", …
  title text,
  description text,
  category text,
  icon text, -- emoji
  requirement jsonb, -- {coins_earned: 1000000, …}
  reward_coins int default 0,
  reward_tickets int default 0,
  display_rank int -- reihenfolge im UI
);

create table user_achievements (
  user_id uuid,
  achievement_id text,
  unlocked_at timestamp,
  primary key (user_id, achievement_id)
);
```

**UI-Impact:**
- Achievement-Ribbon in ProfileView (3 aktuelle, alle im Modal)
- Toast bei Unlock: "🏆 Millionär Trophäe freigespielt!"
- Leaderboard-Variante: Top 10 Player nach Achievement-Count

### B. Prestige System (Max Level Reset)

Nach 500 Millionen Coins oder 2000 Tickets:

> **Prestige Aktivierung:** Coins/Tickets zurücksetzen, dafür **permanenten Status**
> (Abzeichen, +2 % Multiplikator), neue Tiere starten mit bereits grau eingefärbt
> (zeigt: "War schon 1× durch")

**Psych-Effekt:** "Ich bin nicht rückwärts, ich bin prestige!"

---

## 3. Balancierung für Freemium & Spender

### A. Transparente Spiel-Modi

**Free-to-Play (Standard):**
- Alle Minispiele, alle Tiere
- Unbegrenzt spielen, Timing ist das Bottleneck (Tickets rarer)
- Markt: kein Fee

**Premium Pass (Optionale Abo ~$4.99/Mo):**
- +20 % Tickets-Gewinn
- +2 Egg-Slot (statt 1)
- Exklusive Farben/Kosmetik für Tiere (Effekte, Glitzer)
- Kein P2W, nur QoL + Visuelles

### B. Event Pacing

Nicht alle 2 Wochen neues Event (Burnout), sondern:
- **Wöchentliche Daily Login Challenges** (3 Tage aktiv sein → 100 Coins)
- **Monatliche Event** (Dezember: Weihnacht, Januar: Neujahr, Oktober: Halloween)
- **Saisonale Sonder-Tiere** (nur während Event erhältlich, dann Limited Edition)

---

## 4. Community & Sozial

### A. Nested Guilds / "Zoo-Clubs"

> Spieler gründen einen "Club" (4–8 Spieler), wöchentliche Ziele zusammen meistern.

- Club-Seite mit Roster, Aktivitäts-Heatmap
- Wöchentliches Ziel: "Club sammelt 100 Millionen Coins" → Belohnung für alle
- Asymmetrische Rollen: Leader, Officer, Member
- Eintritt: via Einladung oder Anmeldung (Leader genehmigt)

**DB:** `clubs`, `club_members`, `club_goals_weekly`

### B. Friend Challenges

> Spieler fordert einen Freund heraus: "Wer verdient bis morgen 18 Uhr mehr Coins?"

- 1v1 Wette (Coins als Einsatz, kleiner Betrag)
- Live-Scoreboard während Challenge
- Sieger: +Coins + Abzeichen
- Verlierer: Coins zurück (kein echter Verlust, nur Status)

---

## 5. Progression Clarity: „Progress Roadmap im Spiel"

### A. Progressive Unlock-System

Moment: Alles ist von Anfang an zugänglich. Besser: **Sanfte Locks**, die sich
öffnen, wenn der Spieler bereit ist.

```javascript
// roadmap für level
{
  parkour_level: 5,  // freigeschalten, wenn 1M coins verdient
  wordle_level: 10,  // " 2M coins
  halloween: false,  // freigeschaltet nur während event
  breeding: false,   // " wenn 3 verschiedene tiere besitzt
  market: true,      // immer offen
}
```

**UI:** "🔓 Zucht freigespielt!" Toast beim Erreichen, Hint im Shop
("Finde das Zucht-Menü im Tier-Inventar")

---

## 6. Implementation Roadmap

| Phase | Zeitraum | Fokus | Owner |
|-------|----------|-------|-------|
| **Phase 1** | Nov 1–15 | Newcomer Tutorial + Daily Quests | @Frontend |
| **Phase 2** | Nov 16–30 | Achievement System | @Backend (SQL) + Frontend |
| **Phase 3** | Dez 1–15 | Prestige + Premium Pass | @Backend + @Store |
| **Phase 4** | Dez 16–31 | Guilds Prototype | @Backend + @Frontend |
| **Phase 5** | Jan+ | Friend Challenges, Prestige Leaderboard | @Backend |

---

## 7. Erfolgskriterien (OKRs)

### Objective: 40 % mehr aktive Spieler in 90 Tagen

**Key Results:**
1. **D1 Retention:** 45 % → 60 % (1. Tag→2. Tag)
2. **D7 Retention:** 25 % → 40 % (1. Woche→2. Woche)
3. **Average Session Length:** 12 Min → 18 Min
4. **Quest Completion Rate:** 70 % täglich bei Anfängern
5. **Achievement Unlock Rate:** >50 % der aktiven Spieler ≥1 Achievement/Monat

### Objective: Monetarisierungs-Clarity

**Key Results:**
1. Premium Pass: 15 % der aktiven Spieler (mit KPI: 1–3 € ARR/Spieler/Monat)
2. 0 Reports von "P2W"-Vorwürfen (Community = zufrieden)
3. Support-Tickets zu Wirtschaft ↓30 %

---

## 8. Offene Fragen

- [ ] Prestige: Welche Tier zurücksetzen? (Alle? Nur Coins?)
- [ ] Premium Pass: Als IAP (Google Play) oder externes Abo?
- [ ] Guilds: Maximale Größe (4, 8, 16)?
- [ ] Achievement Rewards: Coins, Tickets, Kosmetik oder Alle?
- [ ] Deployment-Strategie: Feature Flags oder direkt live?

