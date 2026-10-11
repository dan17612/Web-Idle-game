# Onboarding & Engagement Roadmap — Zoo Empire

**Datum:** 2026-09-19  
**Status:** Proposal  
**Zielgruppe:** Neulinge und bestehende Spieler

---

## Problem-Statement

Zoo Empire hat großartige Mechaniken (Minigames, Weltexploration, Freunde, Marktplatz), aber:

1. **Neulinge sehen keine klare Progression** — Nach Login ist unklar, was das Spiel ist, wie man anfängt, welche Ziele es gibt.
2. **Mid-Game ist klebrig** — Spieler erreichen schnell Coins-Cap/Tap-Budget und verstehen nicht, wie sie vorankommen sollen.
3. **End-Game braucht Langzeit-Hooks** — Minigames, Freunde-Features sind gut, aber es fehlt ein durchgehender Grund, täglich zurückzukommen.
4. **Onboarding ist minimal** — TutorialBubble existiert, wird aber kaum genutzt; kein strukturierter Einstieg.

---

## Nächste Schritte (priorisiert)

### Phase 1: Interactive Onboarding (2-3 Wochen)

**Ziel:** Weg von statischen Hinweisen zu einer geführten, interaktiven First-Run-Experience.

#### 1.1 Onboarding-State tracken
- `players.onboarding_step` (NULL = fertig, 'intro' | 'first_tap' | 'first_buy' | 'first_minigame' | 'town' | 'friends')
- Nach jedem Meilenstein automatisch nächster Step unlocked

#### 1.2 Welcome-Sequenz (ca. 2 min)
1. **Splash-Screen** „Zoo Empire — Tiere sammeln & verdienen"
   - Kurze Animation/Grafik
   - Zwei Tasten: „Los geht's" vs. „Später"
2. **Tutorial 1: Tapping** (GameView)
   - TutorialBubble: „Tippe auf die Sonne → verdiene Coins!"
   - Nach 5 Taps: „Super! Mit Coins kaufst du Tiere."
3. **Tutorial 2: First Buy** (ShopView Auto-Open nach Step 1)
   - TutorialBubble: „Kaufe ein Küken (50 Coins) — es verdient für dich!"
   - Nach Kauf: Zurück zu GameView, zeige das neue Tier
4. **Tutorial 3: Passive Income** (GameView)
   - Zeige Einkommen-Ticker: „Dein Küken verdient ⌛ 0.5 Coins/Sek — offline auch!"
5. **Tutorial 4: Minispiel-Sneak-Peak**
   - Link zu Drift/Parkour: „Speichere noch schneller mit Minispielen!"

#### 1.3 Progressive Hints
- Bild für Fremde nach `Spielzeit > 5 min` ohne Taps: „Psst! Tippe auf die Sonne 👇"
- Nach Coins-Cap (kein Tap-Budget): „💡 Minigames geben Dir mehr Taps!"
- Nach 3 Tieren: „📊 Bestenliste — Wer ist Nummer 1?"

### Phase 2: Onboarding UI (1 Woche)

**Ziel:** Handwerklich polierte, nicht-blockierende Onboarding-Flows.

#### 2.1 Modal-System
- `<OnboardingModal>` Komponente
  - Hintergund-Overlay (semi-transparent, nicht interaktiv)
  - Zentrale Card mit Text/CTA
  - Optional: TutorialBubble daneben
  - Dismiss-Button oder Auto-Dismiss nach CTA

#### 2.2 Checkliste im GameView (optional)
- Kompakter Status für Neulinge: „✓ 1. Tap | ✓ 2. Kauf | ... | ⬜ 5. Minigame"
- Nach Step 5 versteckt
- Vorteil: Gibt Clear Goals ohne blockiert zu fühlen

#### 2.3 Willkommenspaket erweitern
- Statt nur Bonus-Taps: auch kleine Startgeschenke (z.B. 1 freies Küken in Inventory)
- Macht den Einstieg weniger „grindey"

---

### Phase 3: Mid-Game Engagement (2 Wochen)

**Ziel:** Nahtlose Übergänge zwischen Phasen; kontinuierliche Ziele.

#### 3.1 Achievement-System (einfache Variante)
- `player_achievements` Tabelle: `id, user_id, key, unlocked_at, reward_coins`
- ~15 Achievements für die erste Stunde:
  - "Erste Tap" (1 Coins)
  - "Erste Tier gekauft" (5 Coins)
  - "3 verschiedene Tiere" (10 Coins)
  - "1000 Coins verdient" (25 Coins)
  - "Ein Minigame gespielt" (50 Coins)
  - "1 Freund hinzugefügt" (20 Coins)
  - usw.
- **Toast-Benachrichtigung** bei Unlock mit Reward
- **Achievement-Sammler-Card** in ProfileView

#### 3.2 Daily Login Bonus
- Streifen-Tracking (z.B. 7 Tage = +100 Coins Bonus)
- Sichtbar im GameView oben
- Ermutigt tägliche Rückkehr

#### 3.3 Mini-Challenges
- Zeitlich begrenzte, leichte Aufgaben:
  - "Tippe 50-mal" → +10 Coins
  - "Gewinne 100 Coins in Minigames" → +Ticket
  - "Sende 1 Freund Coins" → +5 Coins
- Wechseln täglich / wöchentlich
- Tracker im GameView oder eigene Card

---

### Phase 4: Long-Term Hooks (3-4 Wochen)

**Ziel:** Gründe für regelmäßige Sesssions über Wochen/Monate.

#### 4.1 Seasonal Pass (z.B. Tier-Skins)
- „Zoo Empire Season 1: Herbst-Abenteuer" (28 Tage)
- Free Track (5–7 Rewards: Coins, Items, Cosmetics)
- Premium Track (weitere 7–10, z.B. exklusive Tier-Farben)
- Tracker: visueller Fortschritt mit Meilensteinen
- Beispiel-Rewards: 
  - Küken mit Orange-Färbung (nur diese Season)
  - 500 Bonus-Coins
  - +1 Minigame-Ticket

#### 4.2 Prestige / Neustart mit Bonus
- Nach z.B. 100M Coins: Option zu "Prestige" (Coins zurücksetzen, 1x Bonus-Tier freigeben)
- Gibt Veteranen einen Long-Tail-Goal
- `player_prestiges` Tabelle: Tracking von Prestige-Level

#### 4.3 Pet Collections & Skins
- Nicht nur Tiere sammeln → auch Varianten (Gold, Diamond, Rainbow) sichtbar machen
- Motiviert Spieler, gezielt nach bestimmten Tiers zu farmen
- Kosmetik-Shop: z.B. 50 Coins für eine Skin-Färbung (rein kosmetisch)

#### 4.4 Leaderboard Events
- Monatliche Challenges: „Wer sammelt die meisten Diamonds in diesem Monat?"
- Top 10 bekommen Coins/Skins
- Erzeugt temporäre Engagement-Spikes

---

## Umsetzu ngs-Phasen

| Phase | Fokus | Dauer | Abhängigkeiten |
|-------|-------|-------|---|
| **Phase 1** | Interactive Onboarding | 2–3 W | Keine |
| **Phase 2** | Onboarding UI Polish | 1 W | Phase 1 |
| **Phase 3** | Achievements & Daily Login | 2 W | Keine (parallel zu Phase 2) |
| **Phase 4** | Seasonal Pass / Prestige | 3–4 W | Phase 3 |

---

## Metriken für Erfolg

- **Day 1 Retention:** % Nutzer, die 24h später zurückkommen (Ziel: +10%)
- **Day 7 Retention:** % Nutzer, die nach einer Woche aktiv sind (Ziel: +15%)
- **Avg. Session Length:** Durchschn. Zeit pro Session (Ziel: +3 Min für Neulinge)
- **Onboarding Completion:** % Neulinge, die alle 5 Schritte fertigstellen (Ziel: >80%)
- **Achievement Unlock Rate:** Durchschnitt Achievements pro Spieler in Woche 1 (Ziel: >5)

---

## Tech-Schulden & Best Practices

- **RLS Policies:** Alle neuen `players.onboarding_step`, `player_achievements` usw. brauchen sichere RPCs
- **Migrations:** Jede Phase = eigene Migration mit Datum
- **i18n:** Alle Strings in `src/i18n.js` oder lokal in der Component (de/en/ru)
- **Tests:** Onboarding-Logic testet Unit in `src/onboarding.test.js`; SQL-Funktion in `src/achievementsSql.test.js`

---

## Offene Fragen

1. **Premium Currency?** Falls $$ später kommt: Achievement/Seasonal können auch Fiatgeld als Reward nutzen (z.B. 100 Gems). Heute: nur Coins.
2. **Prestige-Mechanics:** Zu hardcore? Könnten wir stattdessen nur "Cosmetic Prestige" (ein Badge) machen?
3. **PvP Leaderboard Events:** Brauchen PvP-Mechaniken (z.B. Coinsiege über anderen Spielern). Oder nur PvE-Challenges?

---

## Nächste Maßnahmen

1. **Design-Review:** Ist die Progression logisch? Blockiert nichts?
2. **Mock-Up:** GameView mit Onboarding-Modal visualisieren
3. **Schema-Design:** `onboarding_step`, `player_achievements`, Tabellen-Schema festlegen
4. **First Sprnt:** Phase 1 + 2 umsetzen (3–4 Wochen)
