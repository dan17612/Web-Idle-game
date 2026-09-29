# Zoo Empire — Spieler-Engagement & Onboarding-Strategie

Datum: 2026-09-29

## Ziel

Zoo Empire soll für **Neuankömmlinge intuitiv und verlockend** sein und
**bestehende Spieler kontinuierlich engagiert** halten. Diese Strategie vereint
Onboarding, Progression, soziales Spiel und Content-Discovery in einer
kohärenten Spielreise.

## I. Newcomer-Onboarding (0–2 Stunden Spielzeit)

### Phase 1: Willkommen & Kern-Loop (Erste 5 Minuten)

**Ziel:** Erste trifft auf Tier sammeln und verdient Coins → Dopamin-Hit.

1. **Auth & Profile-Setup:**
   - Schnelle Login (Google/Email/Guest) ohne Formularflut
   - Username + Tier-Emoji-Wahl (Visual Customization sofort)
   - Intro-Modal: „Willkommen zu Zoo Empire! 🦁 Bau einen Zoo auf, sammle Tiere,
     verdiene Coins in Minispielen"

2. **Starter-Tier & Erste Coins:**
   - Tutorial-Modal zeigt: „Das ist dein Löwe. Tippe ihn an, um Coins zu
     verdienen!" (Tap-Aktion auf GameView-Tier)
   - Tiepp → animierte Coin-Explosion, +10 Coins angezeigt
   - Toast: „Großartig! Du hast 10 Coins verdient 🎉" → Queue nächste Seite

3. **Erste Währung verstehen:**
   - Tickets vs. Coins Modal (einfach, visuell):
     - **Coins** 🪙 = durch Tippen / Minispiele / Tiere verdienen
     - **Tickets** 🎟️ = begrenzte Tages-Belohnung / Premium-Shop
   - Coins-Anzeige oben bleiben, Tickets separat in Footer

4. **First Shop Visit:**
   - Leichte Navs zu Shop zeigen (Pfeil + Text: „Kaufe dein erstes Tier 🐯")
   - Shop ist vorgefiltert auf „Günstige" Tiere (Starter-Region)
   - Kauf ist „Reward" für die ersten 50 Coins (nicht hart verdienten,
     sondern Kampf-Bonus + Boosts)

### Phase 2: Progression Ladder (5 Min – 1 Stunde)

**Ziel:** Vier Säulen erkunden, Erfolgs-Muster verstehen.

1. **Vier Quick-Action-Kacheln in GameView (Reihenfolge):**
   - 🎮 **Minispiel-Intro** — „Verdiene Coins schneller!"
     - Einfache Parkour-Vorschau (5 sec. Auto-Demo)
     - 1× spielen → +50 Coins (süchtig machend)
   - 🎁 **Tiere sammeln** — „Baue eine Armee auf"
     - Shop offen mit 3–5 empfohlenen Tieren (visuell auffällig)
   - 🌍 **Welt erkunden** — „Besuche deinen Zoo"
     - WorldView mit 2 NPCs + Fountain (20 Coins gratis)
   - 👥 **Freunde adden** — „Trete der Community bei"
     - Friends-Tab mit Copy-ID-Link (einfach teilen)

2. **Kampf-System verstehen:**
   - Tiere haben **Kraft** (wie oft sie Coins verdienen pro Minute)
   - Boss-Fight Tutorial: „Nutze deine Tiere, um den Boss zu besiegen!"
   - Erstes Tier + Boss-Kampf = eine Battle (zeigt Belohnung + Leveling-Pfad)

3. **Inventory & Ausrüstung:**
   - Tutorial: „Ausrüstung macht deine Tiere stärker"
   - Kostenlose Starter-Ausrüstung erhält jeder
   - Equip-Screen visuell: Tier + 3 Slot-Icons (Anfänger)

### Phase 3: Social & Langzeitbindung (1–2 Stunden)

**Ziel:** Wiederkehr-Loop + Freunde einbinden.

1. **Daily Rewards:**
   - Top-Bar Countdown: „Nächste Belohnung in: HH:MM"
   - Sichtbare Sammel-Striche (7 Tage) → Mega-Bonus am Tag 7
   - Push-Notif: „Deine tägliche Belohnung wartet! 🎁"

2. **Leaderboards (Social Proof):**
   - Einfaches Design: Top-3 prominent, eigene Position farblich
   - Metriken: Coins (heute / Woche / aller Zeiten) oder Tier-Anzahl
   - Freunde-Filter: „Nur Freunde anzeigen" (motiviert zum Adden)

3. **Freunde-Mechaniken:**
   - **Freundschaftsanfragen:** Modal in Friends-Tab, einfache Abläufe
   - **Geschenke:** 1× pro Tag 50 Coins an einen Freund (gegenseitig)
   - **Multiplayer Memory:** Nach 3 Solo-Spiele Hint: „Spiele Memory mit
     Freunden!" (MemoryOnlineView)

## II. Bestehende Spieler — Engagement & Progression

### Langziel-Loops

1. **Tier-Sammlung (Infinite):**
   - **Rarity & Tier-System:** gemeinsam mit Market
   - Neue Tiere alle 2 Wochen (via Booster-Truhen oder Zucht)
   - Seltene Tiere = sozialer Beweis (Leaderboard-Portrait zeigt)

2. **Zucht-Mechaniken:**
   - Zwei Eier gleichzeitig brüten (bereits implementiert)
   - Züchtungs-Booster: Trank für schnellere Brut (0,5h statt 2h)
   - Zucht-Events: „Rosaroter Monat" = Pink-Tiere 2× wahrscheinlicher

3. **Boss-Path & Endless (Challenge):**
   - **Boss-Path:** 20 Stufen, jeden Tag eine freischalten (Saison-Mechanik)
   - **Endless:** ein Leben, wie weit kommst du (Leaderboard)
   - Saisonale Belohnungs-Hänge: Exklusives Tier bei Level 10

4. **Minispiel-Rotationen:**
   - Jeden Monat ein Spiel **featured** (doppelte Belohnung)
   - Täglich 3× Freispiele + Kosten-Booster (Tickets)

5. **Markt-Ökonomie (Spieler-zu-Spieler):**
   - Natürliche Fluktuationen via Supply/Demand
   - Rare Tier-Käufe treiben Coins-Wert (Sink)
   - Trader-Trophy: „Gewinne 1M Coins im Markt-Handel"

### Retention-Events (Kalender)

| Datum | Event | Belohnung |
|---|---|---|
| **Jeden Monat 1.** | Neue Tier-Region freischalten | 3× kostenlose Booster |
| **Jeden Mi.** | Memory-Turnier (asynchron) | Top-3 Leaderboard + 100 Tickets |
| **Jeden Mo. 15 Uhr** | Boss-Hunt (Multiplayer-Skirmish) | Gemeinschafts-Missionen |
| **Monatlich (variabel)** | Zucht-Event (pink/blau/gold) | Exklusives Färbungs-Item |
| **Alle 2 Wochen** | Kampagne (Story + Belohnungen) | Progressions-Badges |

## III. Content-Discovery & Navigation

### Problem
Viele Features (15+ Views) sind versteckt. Neue Spieler sehen nicht: Memory, Drift,
Wordle, BlockFall, Breeding, World, Online-Memory, Market, Boss-Fight.

### Lösungen (Priorisiert)

**T1: Diese Woche**
- GameView-Kacheln: Nur 4 Haupt-Eingänge (Minispiel, Shop, Welt, Freunde)
  + Expandierbarer „Mehr" (Memory, Drift, Wordle, BlockFall)
- **Marker** auf neuen Features (🆕 Badge für 14 Tage)
- Reiter-Reorder Bottom-Nav: Game, Tickets, Inventory, **Minigames**, Support
  (statt Shop extra)

**T2: Nächste Woche**
- **Minigames Hub** (`/games`) = alle 5 Spiele auf einen Blick
  - Kartendashingers mit Regel-Vorschau + Leaderboard-Link
  - Tägliche Herausforderung pro Spiel (z. B. „Drift-Rennen in unter 40 Sek.")
- **Market-Integration** in Inventory (Verkauf → direkt zur Börse)

**T3: Folgende Woche**
- **Progression-Tree** (`/progression`) — Baum-Visualisierung
  - Hauptpfade: Sammeln → Züchten → Kämpfen → Markt
  - Ausgegrayoutete Nodes = nächste Meilensteine
  - Klick = zu dieser Feature
- **Event-Ticker** oben auf GameView (rotierendes Banner)
  - „🐣 Zucht-Event endet in 2 Tagen"
  - „🏆 Leaderboard-Reset morgen"

### Andere Lösungen (Backlog)
- **Empfehlungs-Engine:** „Basierend auf deinen Spielstunden: Versuche
  BlockFall!"
- **Achievements** (mit Trophäen in Profil) — 50+ Ziele über alle Features
- **Tutorials per Feature** (Modal + Tooltip bei erstem Besuch)

## IV. Monetisierung & Balance für neuen/alten Mix

### Pricing-Strategie

1. **Coins (verdient im Spiel):**
   - Starter-Boost: +1000 Coins für Level 1–10 (kein grind)
   - Tägliche Quelle: Tapper + 3 Minispiel-Freispiele = ~200 coins
   - Wöchentlich: Boss-Kampf-Drop = ~500 coins

2. **Tickets (Premium, aber erreichbar):**
   - Kostenlose Quellen: Tägliche Belohnung (10/Tag), Events (50/Monat)
   - **Battle-Pass-Äquivalent:** (Zukunfts-Idee) „Saison-Pass" für 5€/Monat
     - 50 kostenlose Tickets wöchentlich
     - 5 weitere Minispiel-Freispiele pro Tag
     - Exklusives Tier-Skin

3. **Nicht-gierig sein:**
   - Kein „Zahlmauer" vor Stufe 20 (mindestens 6 Std. kostenlos spielen)
   - Booster = QoL, nicht P2W (2× Coins macht niemand zum Sieger)

### Balance-Checkpoints

- **Coins-Verdienst:**
  - Level 1–5: Tapper + 1 Minispiel
  - Level 5–10: 2 Minispiele
  - Level 10+: Boss + Markt (Spieler-kontrolliert)
  
- **Tier-Seltenheit:**
  - Starter-Tiere: Alle Spieler besitzen
  - Häufig (50% aller Käufe): Günstig, Droprate erkannt
  - Selten (15%): Teuer, Markt-wertvoll
  - Episch (1%): Nur via Züchtung oder Saisonale Events
  - Legendär (0,01%): Achievement / Leaderboard-Preis

## V. Nächste Schritte (Roadmap für 2 Wochen)

### Sprint 1: Diese Woche (29.09–05.10)
- [ ] **GameView-Kacheln überarbeiten** — Priorisiert + „Mehr"-Expander
- [ ] **🆕-Badges** auf neuen Features (14 Tage TTL)
- [ ] **Onboarding-Modals** schreiben (4 Phasen wie oben)
- [ ] **Daily-Reward-Countdown** Top-Bar (visuell auffällig)
- [ ] **Freunde-Adden erleichtern** (Modal + Share-Link)

### Sprint 2: Nächste Woche (06.10–12.10)
- [ ] **Minigames Hub** (`/games`) mit Kartendashingers
- [ ] **Progression-Tree Mockup** (Figma oder SVG-Skizze)
- [ ] **Market-Verkauf aus Inventory** (Quick-Link)
- [ ] **Event-Ticker** auf GameView (3-Zeiler Banner)
- [ ] **Boss-Fight Onboarding** (Tutorial-Modal)

### Sprint 3: Langfristig (13.10+)
- [ ] Progression-Tree implementieren
- [ ] Achievements + Trophy-System
- [ ] Feature-spezifische Tutorials
- [ ] Monatliche Events (Kalender-Integrationen)
- [ ] Push-Benachrichtigungen (Daily Reminder, Events)

## VI. Erfolgs-Metriken

Messbar machen, was funktioniert:

1. **Onboarding-Trichter:**
   - Signups → First Tier Kauf (Ziel: >50%)
   - Signups → Erstes Minispiel (Ziel: >60%)
   - Signups → Freund hinzugefügt (Ziel: >30%)

2. **Retention:**
   - Day 1 Return: >40%
   - Day 7 Return: >20%
   - Aktive Spieler / Woche

3. **Engagement (pro Spieler/Tag):**
   - Durchschnittliche Sessions
   - Durchschnittliche Spielzeit (Ziel: 15–30 min)
   - Feature-Hits (Leaderboard vs. Minigame vs. Shop)

4. **Wirtschaft:**
   - Durchschnittliche Coins verdient / Tag
   - Durchschnittliche Tier-Käufe / Woche
   - Markt-Transaktionen / Tag

## Zusammenfassung

Zoo Empire wird **cool für Neulinge**, wenn:
1. Die erste Stunde unvergesslich ist (Sammeln → Minispiel → Freund)
2. Features leicht zu entdecken sind (Minigames Hub, Progression-Tree)
3. Der Social Loop funktioniert (Freunde, Leaderboards, Geschenke)

Und **bestehende Spieler bleiben**, wenn:
1. Neue Content regelmäßig kommt (Events alle 2 Wochen)
2. Progression sichtbar ist (Achievements, Tree, Level-Weg)
3. Wirtschaft fair bleibt (keine P2W, Balance-Checks)

**Los geht's! 🦁**
