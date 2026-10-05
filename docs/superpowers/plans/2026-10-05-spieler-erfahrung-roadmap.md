# Spieler-Erfahrung Roadmap — Neueinsteiger & Retention

**Datum:** 2026-10-05  
**Fokus:** Zoo Empire muss für beide Zielgruppen attraktiv sein — Neueinsteiger brauchen einen sanften Einstieg, bestehende Spieler brauchen kontinuierliche Ziele und neue Inhalte.

## Überblick

Das Spiel hat eine starke Kern-Loop (Taps → Münzen → Tiere sammeln) und viele Minigames. Aber für Neueinsteiger ist die Einstiegskurve steil (25+ Routen, viele Mechaniken), und für bestehende Spieler könnte es mehr **regelmäßige Ziele** und **langfristige Progression** geben.

Diese Roadmap gliedert sich in drei Phasen:

1. **Quick Wins (1–2 Wochen):** Onboarding & Anfänger-UX
2. **Mid-Term (3–6 Wochen):** Retention-Systeme für alle Spieler
3. **Long-Term (7+ Wochen):** Endgame & Prestige

---

## Phase 1: Neueinsteiger-Erlebnis verbessern (Quick Wins)

### 1.1 Geführter Onboarding-Flow

**Problem:** Neue Spieler sehen auf der Startseite (~10 Quick-Action-Buttons) und wissen nicht, wo sie anfangen.

**Lösung:**  
- **Tutorial-Levels** (wie Pokémon), die nacheinander freigeben:
  1. **Level 1:** Taps → erkläre Tap-Mechanic, zeige „Münzen verdienen"
  2. **Level 2:** Erste Tier im Shop kaufen, füttern, füttern = Boost
  3. **Level 3:** Minigame spielen (Memory) → erkläre Tickets
  4. **Level 4:** Breeding (einfach) → erkläre Zucht-Grundlagen
  5. **Level 5:** Freunde hinzufügen → Social-Feature
  
- Nach jedem Level: `useReturnRefresh` + Bestätigung, dann nächstes Level entsperrt.
- Knöpfe/Features außerhalb des Levels sind **graugefahren** oder **versteckt** bis zur Freigabe.
- Progress-Anzeige oben: „Anfänger-Level 3/5".

**Spec:** `2026-10-XX-onboarding-levels.md` (vor Implementierung)  
**Scope:** TutorialBubble erweitern, GameView-State mit `tutorialLevel`, Router-Guards

### 1.2 Willkommens-Karte & Erste-Woche-Quest

**Problem:** Erste 3 Tage sind entscheidend — viele Spieler starten und verschwinden wieder.

**Lösung:**
- **Willkommens-Karte** auf der Startseite für die erste Woche:
  - Tägliche Mini-Challenges (z. B. „5 Minigames spielen", „1 Tier füttern", „Freund hinzufügen")
  - Belohnung: Münzen, Tickets, ein besonderes Einsteiger-Tier
  - Nach 7 Tagen automatisch archiviert
  
- **Einsteiger-Ziele-Tab** neben Events: „Deine Anfänger-Quests"

**Spec:** `2026-10-XX-welcome-week-quests.md`  
**Scope:** Neue DB-Tabelle `onboarding_quests`, neue RPC `claim_onboarding_quest`, Quest-View

### 1.3 UI-Vereinfachung für Neue

**Problem:** Zu viele Tabnavi-Einträge (Support, Leaderboard, Index, Profil…)

**Lösung:**
- **Bottom-Nav reduzieren für Level 1–5:**
  - Nur: 🏠 Spiel, 🛍️ Shop, 📦 Inventar, ⭐ Freunde, 💬 Support
  - Andere Tabs (**Index, Profil, Leaderboard**) erst ab Level 6 oder nach 1 Tag anzeigen
  
- **Shop-Seite:** Für Neue zuerst nur die günstigsten Tiere anzeigen (Lama, Rabe, Schaf)

**Scope:** Feature-Flags in `game.js` oder `auth.js` (`auth.onboardingLevel`)

---

## Phase 2: Retention für alle Spieler (Mittelfristig)

### 2.1 Wöchentliche Challenge-Liga

**Problem:** Bestehende Spieler spielen täglich, aber es gibt keine wöchentlichen Meilensteine.

**Lösung:**  
- **Challenge-Liga** (wie Saisons in anderen Spielen):
  - Jeden Montag startet eine neue Woche
  - 5 tägliche Challenges + 1 Bonus-Challenge pro Woche
  - Beispiele:
    - „Verdiene 100k Münzen" → 🎫 100 Tickets
    - „Gewinne 3 Memory-Spiele" → 50k Münzen
    - „Züchte 1 Tier" → Spezial-Futter
    - „Spende auf Roadmap ab" → 25 Tickets + Ehren-Abzeichen
    - Bonus: „Absolviere alle 5 Tages-Challenges" → 500 Tickets
  
- **Progress-Leiste:** Neue Reiter „⚡ Challenges" auf der Startseite oder Top-Level-Route
- **Abzeichen-System:** Jede vollendete Woche schaltet ein Abzeichen frei (Profil sichtbar)

**Spec:** `2026-10-XX-weekly-challenges.md`  
**Scope:** DB `weekly_challenges`, `user_weekly_progress`, neue RPC `claim_challenge_reward`

### 2.2 Saisonales Event-System

**Problem:** Events sind unregelmäßig, kein großes gemeinsames Ziel.

**Lösung:**
- **Saison-Thema** (z. B. „🎃 Halloween-Zoo", monatlich wechselnd):
  - Spezial-Tiere (nur diese Saison erhältlich)
  - Event-Tier-Boni (z. B. alle Halloween-Tiere bekommen +20% Coins)
  - Community-Ziel: Alle Spieler zusammen müssen X Münzen verdienen → Unlock Belohnung für alle
  - Leaderboard nur für diese Saison
  
- **Saison-Pass** (optional):
  - Kostenlose Quest-Kette: 10 Aufgaben, Belohnungen nach unten
  - Premium-Version (500 Münzen): extra Slots, bessere Belohnungen
  
- **Saison-Dauer:** 4 Wochen, dann neue Season

**Spec:** `2026-10-XX-seasonal-events.md`  
**Scope:** DB `seasons`, `season_animals`, `season_leaderboard`, View umgestellt auf Season-Filter

### 2.3 Tägliches Bonus-System erweitern

**Aktuell:** Tägliche Münzen-Boni existieren.  
**Lösung:**
- **Anwesenheits-Streak:** 7-Tage-Kette — je länger, desto besser:
  - Tag 1–3: normaler Bonus
  - Tag 4–6: 1.5× Multiplikator
  - Tag 7: 2× Multiplikator + 100 Tickets
  - Nach Tag 7 zurückgesetzt, aber Streak-Count erhalten (Abzeichen)
  
- **Streak-verlieren Schutz:** Einen Pro-Woche "Freipass" — wenn man einen Tag ausfällt, bleibt der Streak bestehen

**Scope:** Erweitere `daily_bonus` Logik in `game.js`

---

## Phase 3: Endgame & Langzeit-Progression (Langfristig)

### 3.1 Prestige-System

**Problem:** Auf hohen Leveln wird das Sammeln stagnant.

**Lösung:**
- **Prestige-Freischaltung** ab ~200+ Tiere gesammelt:
  - „Super Saiyajin"-Modus: Alle Tiere zurücksetzen, aber Multiplikator +1.0× dauerhaft
  - Jedes Prestige skaliert (2. Prestige +2.0×, etc.)
  - Alt-Tiere als Cosmetics freigeschaltet (farbliche Varianten)
  
- **Prestige-Abzeichen:** Pro Prestige-Stufe ein neues Abzeichen

**Scope:** Neue Präsenz-Logik, DB `user_prestige`, Cosmetic-System

### 3.2 PvP / Wettkampf-Modi

**Problem:** Der Boss-Fight ist der einzige "PvP"-ähnliche Inhalt.

**Lösungen (modular — nicht alle auf einmal):**

#### Option A: Weekly Duels
- Freitag–Sonntag: Kampf gegen 1 zufälligen anderen Spieler
- Gewinn: 500 Tickets + Ehren-Abzeichen
- Matchmaking nach Tier-Stärke

#### Option B: Arena-Turnier
- Alle 2 Wochen: 16-Spieler Single-Elimination
- Auto-Bots kämpfen nach Spieler-Konfiguration
- Gewinner-Baum im Leaderboard sichtbar

#### Option C: Boss-Raids (kooperativ)
- 3–5 Spieler bilden eine Raid-Gruppe gegen einen starken Boss
- Belohnungen teilen sich nach Damage

**Spec für Duels:** `2026-10-XX-weekly-pvp-duels.md`  
**Scope:** Battle-Simulator (wie Boss-Fight), Matchmaking, neue RPC

### 3.3 Clans / Gilden (optional)

**Problem:** Freunde sind 1:1, aber kein größeres Gruppen-Feature.

**Lösung (später):**
- Spieler können Clans gründen (20 Mitglieder max)
- Clan-Boni: +5% Münzen pro Mitglied (kumulativ)
- Clan-Schatzkammer: Gemeinsame Futter-/Tier-Pools
- Wöchentliche Clan-Wars gegen andere Clans
- Clan-Chat (Realtime im Kanal `clan:{clan_id}`)

**Spec:** `2026-10-XX-clans-design.md` (nach Duels)  
**Scope:** Große DB-Änderung, neue RPCs, Realtime-Kanäle

---

## Phase 3.4 Kosmetik-Shop & Battle-Pass

**Problem:** Keine Monetarisierung außer der kostenlosen Roadmap-Community-Votes.

**Lösung (später, wenn nötig):**
- **Kosmetik-Shop:**
  - Tier-Skins (z. B. Weihnachts-Lama, Gold-Rabe)
  - Avatar-Frames
  - Spiel-Themes
  - Alle für ~200–500 Münzen oder 100 Tickets
  
- **Battle-Pass (Premium, optional):**
  - Monatlich: 200 Münzen
  - Freie Quest-Kette + Premium-Kette
  - Premium hat bessere Belohnungen (Exclusive Skins, +10% XP)

**Scope:** Shop-Seite erweitern, neue DB-Tabelle `cosmetics`, `user_cosmetics`

---

## Implementierungs-Plan

### Phase 1 Timeline (Woche 1–2)
| Feature | Aufwand | Abhängigkeiten |
|---------|---------|-----------------|
| Onboarding-Levels | 3–4 Tage | TutorialBubble, Router-Guards |
| Welcome-Week-Quests | 2–3 Tage | Onboarding-Levels |
| UI-Vereinfachung | 1 Tag | Feature-Flags |

**Gesamt:** ~1 Woche (mit Tests)

### Phase 2 Timeline (Woche 3–6)
| Feature | Aufwand | Start-Woche |
|---------|---------|-------------|
| Wöchentliche Challenges | 3–4 Tage | Woche 3 |
| Saisonales Event-System | 4–5 Tage | Woche 4 |
| Tägliches Bonus-Streak | 1–2 Tage | Woche 5 |

**Gesamt:** ~3 Wochen

### Phase 3 Roadmap (7+ Wochen)
- **Woche 7–8:** Prestige-System
- **Woche 9–10:** Weekly Duels / PvP
- **Woche 11–12:** Clans (optional)
- **Danach:** Kosmetik-Shop, Battle-Pass

---

## Design-Prinzipien

1. **Neueinsteiger-First:** Keine Überlastung in den ersten 5 Tagen
2. **Dailies, nicht Churn:** Challenges sollten täglich abrechenbar sein, nicht erzwingen
3. **Optionale Features:** Prestige, PvP, Clans sind optional — Core-Loop funktioniert ohne sie
4. **Transparente Progression:** Jede Zielgruppe sieht klar, was die nächsten 3 Ziele sind
5. **Community über Wettbewerb:** Events & Herausforderungen sind gemeinsam, nicht nur gegen andere

---

## Open Questions

1. **Monetarisierung?** Ist Zoo Empire F2P mit optionalem Battle-Pass oder pure F2P?
2. **Cross-Progression?** Sollten Spieler auf mehreren Geräten spielen können (Web + Android)?
3. **Neue Minigames?** Nach Blockfall & Boss-Fight — weitere Spiele-Ideen?
4. **Tier-Rarity-Overhaul?** Die aktuelle Tier/Rarity-Matrix ist komplex — für Neue verständlich?

---

## Nächste Schritte

1. **Feedback:** Team-Input zu Phase 1 & 3-Priorisierung
2. **Spec schreiben:** `2026-10-XX-onboarding-levels.md` (vor Code)
3. **DB-Migration:** Neue Tabellen für Quests, Challenges, Seasons planen
4. **Test-Account:** Neuen Account durchspielen, Schmerz-Punkte notieren
