# Spieler-Erlebnis: Onboarding & Retention für Zoo Empire

**Datum:** 2026-10-02  
**Status:** Strategisches Konzept  
**Ziel:** Zoo Empire über alle Spielerstufen hinweg cool, engagierend und fair gestalten.

---

## Situation

Zoo Empire hat **viele Features**: 10+ Minispiele, Tier-Sammlung, Marktplatz, Welt-Lobby, Zucht, Events. Das ist großartig für Langzeitspieler (LTV), überfordert aber Anfänger oft. Gleichzeitig müssen bestehende Spieler ein Langziel-Gefühl haben — sonst treffen sie nach 2 Wochen auf ein "Content Wall".

**Problem:**
- 🆕 **Neue Spieler**: "Worauf klick ich? Was ist das Ziel? Warum 50 Tiere?"
- 👥 **Bestehende Spieler**: Fehlende Langzeit-Ziele, Events fühlen sich isoliert an, Progression verflacht.

---

## Strategie: Der Zoo Empire Spielfluss

### Phase 1: Onboarding (Spielstunden 0–2)

**Ziel:** Klar machen, dass das Spiel um Tiere dreht, aber mit vielen Modi zum Verdienen.

#### 1.1 Pre-Loading: Intro-Sequenz (Entrypoint)

Nach Login/Registrierung, **nicht** direkt in GameView:

- **Fullscreen Intro** (3–5 Sekunden, skipbar):
  - Visual: Animiertes Zoo-Logo, aufgeregt Tier-Emojis (🐢 🦁 🐘)
  - Text: _"Willkommen im Zoo Empire! Sammle Tiere, verdiene Coins und spiel Minigames."_
  - CTA: "Abenteuer starten" → GameView

#### 1.2 Erste Login-Session (GameView)

**Tutorial Bubble Sequenz** (reuse bestehendes `TutorialBubble.vue`, aber strukturiert):

1. **"Dein erstes Tier"** (auf Shop-Button zeigen)
   - _"Kaufe dein erstes Tier im Shop. Tiere verdienen dir passiv Coins!"_
   - Blocker: Can't tap main hero, only shop clickable (CSS pointer-events).
   - Aktion: Zum Shop navigieren.

2. **Shop** (fokussiert auf cheapest: Küken)
   - Hero zeigt Küken mit Preis & 0.5 Coins/s.
   - Bubble: _"Dieses Küken kostet 50 Münzen und bringt dir 0,5 Coins pro Sekunde. Kaufe es!"_
   - Nach Kauf → zurück zu GameView.

3. **Zurück in GameView** (Küken im Team)
   - Bubble auf Hero (aktuelles Tier): _"Perfekt! {tierName} bringt dir täglich {XYZ} Coins ein, auch wenn du offline bist. Tippe es zum Bonusertrag!"_
   - Blocker: Main-TAP-Area enabled, Rest disabled.
   - Nach 5 Taps → next bubble.

4. **Upgrades Intro** (nach 5 Taps)
   - Bubble auf Upgrades-Sektion: _"Mit Taps kannst du Upgrades freischalten — höhere Einkommen, mehr Taps pro Sekunde, längere Offline-Zeit."_
   - Zeige Icon `👆 Tap-Upgrades` mit price.
   - Nach Kauf eines Upgrades → nächste Phase.

5. **Das zweite Tier + Vielfalt** (nach Upgrade)
   - Bubble: _"Ein Tier allein ist langweilig — kauf noch ein anderes Tier für mehr Einkommen und eine bunte Sammlung!"_
   - Zeige Shop erneut, hint auf Huhn (250 Coins).

6. **Minigames Sneak Peek** (nach 2. Tier)
   - Zeige Quick-Action-Grid: "🎮 **Minigames verdienen schneller Coins** — probier Memory, Wordle oder Parkour!"
   - Blocker: Nur ein Minigame-Button (z. B. Memory) clickable.
   - Nach Start/Ende → Tutorial done.

**Tutorial-Ende:** Spieler hat 2 Tiere, versteht Einkommen, hat Upgrade ausprobiert, weiß von Minigames.

#### 1.3 Erste 24h nach Tutorial

**Notifications & Aha-Momente:**
- Wenn Spieler nach 2h offline geht: **"Du hast 🪙 {XYZ} offline verdient!"** Toast-Notification.
- Nach 8h Offline: Prominenter **Daily Reward Modal** mit großem Bonus (z. B. 100 Bonus-Taps).
- Neue Tiere im Shop: Snippet-Empfehlung nach 6h Play: _"Möchtest du noch schneller Coins verdienen?"_

---

### Phase 2: Early Game (Stunden 2–24)

**Ziel:** Exploration & Momentum — Spieler probiert alles aus, sammelt erste Tiere, versteht Marktplatz.

#### 2.1 Tier-Sammler-Loop

- Spieler wird animiert, **6–8 verschiedene Tiere** zu besitzen.
- Unlock: Bei 5 Tieren → **Profil-Badge "Zoo Enthusiast"** + +10% Passiv-Einkommen (Collector's Bonus).
- Visuell in GameView: Progress-Ring im Profil-Icon (_"4/8 verschiedene Tiere"_).

#### 2.2 Minigame Rotation (Daily Challenges)

Introduce **Daily Minigame Challenges** (neue Feature):
- Jeden Tag 3 neue Challenges (mit Tickets/Coins als Reward):
  - _"Memory: Erreiche 500+ Punkte" → 50 Tickets_
  - _"Wordle: 3× Erfolg" → 75 Coins_
  - _"Parkour: Höchstpunktzahl >800" → 25 Tickets_
- Anzeige im Hauptmenü mit Progress-Übersicht.
- **Relevanz für Neulinge:** Macht Minigames nicht optional, sondern Teil des Daily-Rhythmus.

#### 2.3 Freunde & Soziales (sanft)

- Nach 2 Stunden: "_Laden Sie einen Freund ein & beide erhalten Bonus-Münzen!_" Modal.
- Deaktivierbar, nicht pushy.
- Leaderboard-Sneak-Peek: _"Schau, wie andere Spieler spielen"_ — nicht competitive gemacht.

---

### Phase 3: Mid Game (Tag 1 bis Woche 2)

**Ziel:** Mehrere Zyklen etablieren, Langziel zeigen.

#### 3.1 Marktplatz Intro

Nach Day 1:
- **Marktwert-Mechanik einführen**: Tiere haben dynamische Werte.
- Scenario: Spieler hat 3× Küken. _"Dein drittes Küken ist weniger wert — handle es auf dem Marktplatz oder verschenke es!"_
- Tutorial-Bubble im Marktplatz: Erkläre Angebot/Nachfrage in 2 Sätzen.

#### 3.2 Upgrade-Progression für Tiere (Tier-System)

- Explain **Tier-Upgrades**: Küken → Huhn → Hase → … mit exponentiellen Wertsprüngen.
- Milestone: _"Beim Drachen (Tier 10) verdienst du 420.000 Coins/Sek — hier geht's los!"_
- Visuell: Tier-Progression-Chart (wie ein RPG-Skill-Tree).

#### 3.3 Breeding & Egg Machine (Soft Unlock)

- Nach 3 Tagen oder 50K Coins: Unlock Breeding.
- **Flavor:** _"Tiere können Eier legen — züchte neue, Varianten!"_
- Vereinfachte erste Zucht: Nur 2 gleiche Tiere → Ei (schnell).
- Reward: Rare Tier oder Special Skin → Motivation für wiederholte Zucht.

#### 3.4 Events & Saisonalität

Führe einen Event-Kalender ein (auch für Grafik-Überblick):
- Wöchentliche Events (z. B. _"Tiger-Woche"_: Tiger kosten -30%, Tier-Einkommen +20%).
- Monatliche Meta-Events (_"Zoo-Fest"_ mit Alle-Spieler-Prüfung: gemeinsam 1M Coins sammeln → Reward für alle).
- Zeige Countdown in der UI (verankert im Haupt-HUD).

---

### Phase 4: Late Game & Retention (Woche 2+)

**Ziel:** Langziel-Progression, Community-Feeling, nie das Ziel erreichen.

#### 4.1 Endgame-Tier Richtung

- **Grand Challenge: "Sammle alle 200 Tier-Varianten"** (mit Skins, Raritäten, Spezial-Drop-Quellen).
- Progress-Tracking in neuem Tab: _"Sammlung → Grand Challenge Progress"_ (z. B. 47/200).
- Milestone-Rewards alle 25 Varianten (z. B. bei 75: Exclusive Emote, Pet-Naming, PvP Arena Unlock).
- Feels like Pokédex oder Animal Crossing, aber nicht grindy.

#### 4.2 PvP/Kompetitive Mini-Arenen (Bossfight, Blockfall Leaderboards)

- Separate Monthly Leaderboards für:
  - BossFight High Score
  - Blockfall Speed Run
  - Memory Streak
  - Weekly Wordle Performance
- **Top 10** erhalten kosmische Rewards (z. B. Exclusive Tier Skins, Coins Boost).
- Viel Spaß-Potential, aber optional (nicht Progression-gating).

#### 4.3 Clan/Guild System (Optional, Phase 5+)

Noch nicht implementieren, aber in den Plänen:
- Spieler können Clans gründen/treten.
- Gemeinsame Ziele (z. B. _"Clan sammelt 10M Coins"_ → Alle bekommen Boost).
- Clan-Leaderboard.
- **Relevanz für Retention:** Social Stickiness.

#### 4.4 Seasonal Passes & Battle Passes

- Monatliches Kosmetik-Battle-Pass-Modell (cosmetic-only, kein P2W).
- Free Tier: 5–10 Rewards
- Premium Tier: 20+ Exclusive Skins/Emotes/Titles.
- **Preis:** Moderat (nicht >$5), ganz optional.
- Ziel: Spieler-Monetization bei ethisch guter Experience.

---

## Implementierungs-Roadmap

### Sprint 1 (Woche 1): Onboarding Overhaul
- [ ] Intro-Sequenz implementieren (Fullscreen, skipbar)
- [ ] Tutorial-Bubble Sequenz in GameView
- [ ] Shop-Blocker bei Anfängern
- [ ] First-24h-Notifications (Offline Earnings Toast, Daily Reward Modal Trigger)

### Sprint 2 (Woche 2): Early Game Features
- [ ] Daily Minigame Challenges (Backend RPC + Frontend UI)
- [ ] Collector's Bonus (6+ verschiedene Tiere) — Unlock + Badge
- [ ] Freunde-Invite Modal (sanft)
- [ ] Marktplatz-Tutorial-Bubble

### Sprint 3 (Woche 3): Mid Game
- [ ] Tier-Progression Visual (Chart/Tree in ShopView)
- [ ] Breeding Unlock Logic (nach 3 Tage oder 50K Coins)
- [ ] Event-Kalender (Visual + Scheduling Backend)
- [ ] Wöchentliche Event-Daten (z. B. Tiger-Woche Template)

### Sprint 4 (Woche 4): Late Game & Retention
- [ ] Grand Challenge: Alle 200 Varianten sammeln (Tracking + UI)
- [ ] Milestone-Rewards (alle 25 Varianten)
- [ ] Monthly Leaderboards für Minigames
- [ ] Saisonale Rewards (Exclusive Skins für Top 10)

### Sprint 5 (Woche 5): Polish & Launch
- [ ] Analytics: Track Conversion bei jedem Tutorial-Step
- [ ] A/B-Test: Intro-Länge, Tutorial-Aggressivität
- [ ] Mobile UX Audit (Safe-Areas, Touch-Targets)
- [ ] Push-Notification Timing (Daily Reward @ 9am local time)

---

## KPIs zur Verfolgung

### Neue Spieler
- **Tutorial Completion Rate:** % erreichen Day 1 Complete (2 Tiere + 1 Upgrade)
- **Day 1 Retention:** % kehren am Tag 2 zurück
- **Day 7 Retention:** % spielen noch nach einer Woche
- **ARPPU (First Week):** Durchschnittlicher monetärer Wert in W1 (falls monetization später)

### Bestehende Spieler
- **Daily Active Users (DAU):** Tägliche Aktive
- **Session Duration:** Durchschnittliche Spielzeit pro Login
- **Feature Adoption:** % nutzen Marktplatz, Breeding, Minigames, Events
- **Grand Challenge Progress:** Durchschnittliche % Sammlung bei 7-Tage-Spielern

### Allgemein
- **Monthly Active Users (MAU)** relative zu DAU (Churn-Indikator)
- **Event Participation:** % nehmen teil an monatlichen Meta-Events

---

## Design-Prinzipien

1. **Clarity vor Complexity:** Ein neuer Spieler sollte das Ziel (_"Tiere sammeln, Coins verdienen"_) in unter 30 Sekunden verstehen.

2. **Looping over Grinding:** Kurze, befriedigende Loops (Tap → Upgrade → zweites Tier) statt lange Wartezeiten.

3. **Optionality:** Minigames, Marktplatz, Breeding sind großartig, aber nicht zwingend. Spieler, die nur tappen wollen, sollen auch vorankommen.

4. **Fairness:** Server-authoritative Wirtschaft, keine P2W-Mechaniken (nur Cosmetics später).

5. **Celebration:** Jeder Meilenstein (1. Tier, Upgrade, Daily Reward, Collection Badge) sollte sich spürbar anfühlen.

---

## Zusammenfassung

Zoo Empire hat das Potenzial, ein süchtiges Idle-Game mit Tiefgang zu sein. Mit einer strukturierten Onboarding-Phase, täglichen Challenges, klaren Langzielen und saisonalen Events wird es für Anfänger zugänglich und für Langzeitspieler attraktiv.

**Nächster Schritt:** Sprint 1 Anfang nächster Woche. Feedback von Beta-Testern ist kritisch.
