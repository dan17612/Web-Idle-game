# Zoo Empire — Spieler-Engagement & Onboarding-Strategie (2026–2027)

**Status:** Planung | **Autor:** Claude | **Datum:** 2026-09-26

---

## 1. Problem-Statement

Zoo Empire hat eine solide Kern-Wirtschaft (Tiere, Coins, Minigames, Zoo-Börse), aber:

- **Neulinge** sehen beim Start 15+ Routen und verstehen nicht, wo sie anfangen sollen.
- **Early-Game** ist nicht engaging genug — viele Absprünge nach Minuten (Coins brauchen zu lange).
- **Bestehende Spieler** haben kein erkennbares Ziel nach den ersten zwei Wochen.
- **Sozial** ist aktiv (Freunde, Welt, Markt), aber nicht zentral genug in der UX.
- **Content-Lücken:** Lange Zeit ohne Neuerungen zwischen Events führt zu Abnutzung.

---

## 2. Lösungsansätze

### 2.1 Neulinge: Das erste Erlebnis optimieren

#### 2.1.1 Strukturiertes Onboarding (Woche 1)

**Ziel:** In 15 Minuten sollte der Neuling spielbar sein und verstehen, was zu tun ist.

- **Tutorial-Tour:** Nach Login:
  - Schritt 1: Erstes Tier kaufen (Küken, kostenlosen Coins geben, Autostart disablen, einfach tappen)
  - Schritt 2: Passives Einkommen zeigen (Coins passiv steigen lassen, `Date.now() + serverOffset`)
  - Schritt 3: Zweites Tier (Huhn) zur Vervielfachung
  - Schritt 4: Erst dann zur Welt-Map oder zu Minigames leiten

- **Onboarding-Quest-Baum:**
  ```
  ✓ Login
  → Erstes Tier kaufen
    → Coins verdienen (8h warten oder zum Minigame)
      → Zweites Tier
        → Freund suchen / Markt verstehen / Minigame spielen
  ```

- **Retention-Hooks im Tutorial:**
  - "Komm morgen wieder, deine Tiere verdienen offline!" (Setzt Notification)
  - "Dein erstes Minigame wartet!" (Leichte Quest: 10 Parkour-Punkte)
  - "Freunde einladen für Boni" (Social-Loop)

#### 2.1.2 Early-Game Progression (Woche 1–2)

Ziel: Spieler verstehen, dass Fortschritt möglich ist ohne zu zahlen.

- **Daily Quests starten sofort:**
  - Tag 1: 3 Coins verdienen (2 min)
  - Tag 2: 1 Minigame spielen
  - Tag 3: Freund hinzufügen (auch NPC-Freunde als Fallback)
  - Tag 4–7: Wechsel zu "50k Coins verdienen" / "Top-Tier freischalten"

- **Progression-Sichtbarkeit:**
  - Neuer Screen: `/progression` (nur für neue Spieler sichtbar, nach Tag 7 versteckt)
  - Zeigt: Nächster Meilenstein (z. B. "Panda freischalten"), Tage bis dahin, ungefähre Kosten
  - Entfernt Hälfte der Ängstlichkeit ("Wird es je möglich sein, die Kuh zu kaufen?")

- **Künstliche Früh-Boosts (nur neue Spieler):**
  - Erstes Tier kostet 25 Coins statt 50
  - Täglicher Login-Bonus: +10% für die erste Woche
  - Erstes Mini-Game-Reward: doppelte Coins (einmalig)

#### 2.1.3 Anbindung an Social & Spaß (Woche 2)

- **Freunde-System aggressiv pushen:**
  - Nach Tier 3 (Hase): "Findest du einen Freund, der dich in Tag 1 eingeladen hätte?"
  - Freund einladen → beide bekommen 5k Bonus-Coins
  - Referral-Tracker: "2 Freunde eingeladene, noch 3 für Reward"

- **Welt-Einstieg:**
  - Nach Tag 3: Tutorial zur Welt (Joystick-Demo, erstes Tier ausstaffieren, Emote senden)
  - Spaß vor Wirtschaft — Spieler soll ein anderes Tier sehen und denken "Cool!"

---

### 2.2 Bestehende Spieler: Engagement & Ziele

#### 2.2.1 Saisonales Battle-Pass-System

**Start:** Neuer Season alle 4 Wochen, an ein Thema gebunden (z. B. „Safari", „Wasserwelt", „Nacht des Drachen").

- **Gratis-Track (immer):**
  - 50 Milestones, einfach zu erreichen (tägl. Quests + Minigame-Play)
  - Rewards: Coins, Tickets, rare Futter-Items, seltene Farb-Varianten

- **Premium-Pass (optional):**
  - ~$2 USD einmalig pro Season
  - Extra-Rewards: neue Tier-Farben, exklusive Welt-Kosmetik, +25% Coins für 2 Wochen
  - **Nie Pay-to-Win:** Keine Tier-Stats, nur Kosmetik + beschleunigte Economies

- **Tracker in GameView:**
  ```
  [Staffel 5: Safari] - 23 Tage verbleibend
  ████████░░ 42/50 Meilensteine
  
  Nächster Reward: 5k Coins @ Meilenstein 45
  Unlock: "Flamingo-Variante" (Premium)
  ```

#### 2.2.2 Wöchentliche Events & Rennkämpfe

**Ziel:** Wöchentlich etwas Neues, damit das Spiel nicht stagn.

- **Event-Typen (im Wechsel):**
  1. **Collect-Rennen:** Wer hat die meisten [Tier-Art] in 7 Tagen? Top 10 bekommen exklusive Farbe.
  2. **Mini-Game-Sprint:** Höchste Parkour-Scores in einer Woche. Leaderboard mit Sofort-Feedback.
  3. **Markt-Wahnsinn:** Bestimmte Tiere steigen um 50% im Wert — schnell verkaufen oder halten?
  4. **Freundes-Turnier:** Freunde bilden Teams, Minigame-Punkte zählen gemeinsam.

- **Einstieg in GameView:**
  - Große Karte: "🔥 **Parkour-Sprint** — Wer ist am schnellsten diese Woche?"
  - Counter: "Deine beste Zeit: 47.3s | Platz 342 | 2 Tage verbleibend"

#### 2.2.3 Häuser & Personalisierung

**Status:** Zukunft (Phase 2), aber Plan jetzt dokumentieren.

- Jeder Spieler bekommt ein Haus im `/world` (neben dem Bauernhof)
- Innen dekorierbar: Möbel kaufen (Coins) oder verdienen (Events)
- Freunde können das Haus besuchen → Gegenstände ansehen/anfassen
- Screenshot + Social-Share-Hooks (Instagram-Integration)

---

### 2.3 Content-Verteilung (Roadmap 2026–2027)

| Quartal | Fokus | Features |
|---------|-------|----------|
| **Q4 2026** | Onboarding & Saisonales | Battle-Pass v1, Tutorial-Überhaul, Daily-Quests |
| **Q1 2027** | Events & Minigames | 2× wöchentliche Events, neues Minigame ("Angeln"), Haus-System Beta |
| **Q2 2027** | Social & Guilds | Clans (Spieler-Gruppen), Guild-Wars (Clash-of-Clans-Style), gemeinsame Quests |
| **Q3 2027** | Wirtschaft & Handwerk | Tier-Alchemie (Seltene Tiere craften), Transmog-System (Farben tauschen) |
| **Q4 2027** | Spannung & PvP | Arena (Tier-Kämpfe gegen andere Spieler, asynchron), Ranglistenresets |

---

## 3. Implementierungsplan (Priorität)

### Phase 1: Neulinge (Q4 2026, 6–8 Wochen)

**GitHub-Branches & PRs:**

1. **Tutorial-System** (`/tutorial-system`)
   - Neue Komponente: `TutorialOverlay.vue`
   - Store: `tutorial.js` (Schritt-Tracking, `skippable`, Persistence)
   - Routes: Neue Hidden-Route `/tutorial-start` nur für neue Sessions

2. **Daily-Quests** (`/daily-quests-v1`)
   - Schema: `daily_quests`, `player_quest_progress` (Supabase)
   - RPC: `claim_quest_reward`, `check_quest_completion`
   - View: `DailyQuestsView.vue` (Karte, Countdown, Claim-Button)

3. **Early-Game Boosts** (`/newplayer-economy`)
   - Migration: `_created_at < NOW() - interval '7 days'` → normale Kosten
   - RPC-Logic: `buy_animal` prüft `is_new_player(user_id)`

### Phase 2: Battle-Pass (Q4 2026, parallel)

1. **Season-System** (`/season-system`)
   - Schema: `seasons`, `season_milestones`, `player_season_progress`
   - RPC: `claim_milestone`, `get_season_progress`
   - View: `SeasonTracker.vue` + inline in `GameView`

2. **Premium-Pass** (`/premium-season-pass`)
   - Integration mit Zahlungsanbieter (z. B. Stripe, RevenueCat)
   - Schema: `player_premium_seasons`
   - View: `ShopView` → neuer Tab "Premium"

### Phase 3: Events (Q1 2027)

1. **Event-Engine** (`/event-system`)
   - Schema: `events`, `event_rules`, `event_leaderboards`
   - RPCs: `join_event`, `submit_event_score`, `claim_event_reward`
   - View: `EventsView.vue` + inline `GameView`

2. **Minigame-Integrationen**
   - Jeden Minigame ermöglichen, Scores zu `events` zu berichten
   - Leaderboard-Rendering für aktuelles Event

---

## 4. Design-Prinzipien

- **Progressive Disclosure:** Neue Spieler sehen anfangs nur 3–4 Features; nach 7 Tagen alle Routen sichtbar.
- **Haptische Zufriedenheit:** Coins müssen sichtbar wachsen (Animationen). Schneller Sieg früh (Küken → 1000 Coins in 2 h).
- **Social ist Gameplay:** Freunde einladen / Welt besuchen / Handel ist genauso wichtig wie Tiere sammeln.
- **Keine Bezahlwand:** Battle-Pass ist optional; gratis-Spieler können alles erreichen (nur langsamer oder ohne Skins).
- **Häufige kleine Wins:** Tägl. Quests, Meilensteine, Events alle 1–2 Wochen.

---

## 5. Erfolgs-Metriken

Tracken über Supabase Analytics / Segment:

- **Retention (D1 → D7 → D30):** Ziel: D1 > 40%, D7 > 20%, D30 > 8%
- **Average Session Length:** Ziel: > 8 Min (heute geschätzt < 5 Min)
- **Battle-Pass Konversion:** Ziel: 5–8% der DAU kaufen Premium
- **Freunde-Invites:** Ziel: 0.8 Einladungen pro neuer Spieler
- **Event-Partizipation:** Ziel: 30% der aktiven Spieler nehmen an wöchentlichen Events teil

---

## 6. Nächste Schritte (für Entwicklung)

1. ✓ Diese Strategie-Doku kommt ins Repo → PR für `docs/roadmap/`
2. **Woche 1:** Tutorial-Spezifikation schreiben (`docs/superpowers/specs/tutorial-design.md`)
3. **Woche 2:** Daily-Quests-Spezifikation + erste Migration
4. **Woche 3:** Battle-Pass-Spezifikation + Zahlungs-Integration planen
5. **Review:** Designer & Product-Owner Feedback einholen

---

**Besitzer:** @daniil (Product & Strategie)  
**Dokument-Link:** Brainstorm-Doku — bereit zum Teilen mit Team
