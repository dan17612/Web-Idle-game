# Zoo Empire — Spieler-Erfahrungsroadmap (2026 H2+)

**Status:** Strategischer Plan  
**Priorität:** Hoch  
**Zielgruppen:** Neulinge + Bestehende Spieler

---

## Vision

Zoo Empire muss zwei Erfahrungen gleichzeitig unterstützen:
1. **Neulinge**: Schneller, unterhaltsamer Einstieg mit klarem Fortschritt und Erfolgserlebnissen
2. **Bestehende Spieler**: Tiefe, Wiederholbarkeit, soziale Bindung und sichtbare Langzielziele

Diese Roadmap skizziert die Lücken in der aktuellen Version und priorisiert konkrete Maßnahmen.

---

## 1. Onboarding & Neulinge-Erfahrung

### 1.1 Progressive Feature-Freischaltung

**Problem:** Spieler sehen beim Start alle Features gleichzeitig. Das wirkt überwältigend.

**Lösung: Tutorial-Milestones**

- **Level 0–2** (erste 5 Min): Nur Tap-Mechanik, einfaches Tier kaufen/füttern
- **Level 3–5**: Shop komplett, erste Upgrades (Tap-Multiplikator)
- **Level 6–10**: Minispiele (Memory, Drift) freischalten
- **Level 11+**: Parkour, Wordle, World-Lobby, Trading

**Umsetzung:**
```javascript
// stores/game.js: Neuer State
const unlockedFeatures = ref({
  shop: false,
  upgrades: false,
  inventory: false,
  memory: false,
  drift: false,
  parkour: false,
  wordle: false,
  world: false,
  trade: false,
  friends: false,
})

// Migrationen: `tutorial_progress` in profiles
// RPC: check_feature_unlocked(feature_name)
```

**Timeline:** 1 Sprint (Gating-Logik) + UI-Pass

---

### 1.2 Interaktives Tutorial mit Popups

**Problem:** "Kaufe dein erstes Tier" ist hintenrum und optional.

**Lösung: Geführte Einführungssequenz**

1. Onscreen-Pfeile zu den ersten 3 Aktionen
2. Modal-Tooltips (von `TutorialBubble.vue`) mit Animationen
3. Bestätigung nach jeder Phase (z. B. "Gratuliere! Du hast ein Huhn gekauft")
4. Fortschritt speichern (Server: `tutorial_completed_steps`)

**Features der Sequenz:**
- Tap zum ersten Huhn
- Füttern/Liebling-Wahl
- Erstes Upgrade (Tap-Multiplikator)
- Erste Münze verdienen
- Offline-Rewards erklären

**Prüfpunkt:** Vor World-Freischaltung (Level 15+) Tutorial-Stats zeigen

**Timeline:** 1–2 Sprints

---

### 1.3 Neue-Spieler-Boni & Retention-Hooks

**Problem:** Willkommensgeschenk ist einmalig; keine Anreize für Return.

**Lösung: Day-7-Arc**

| Tag | Bonus | Nachricht |
|-----|-------|-----------|
| 1   | +100 Taps | "Starte dein Zoo-Abenteuer!" |
| 2   | +500 Coins | "Zwei Tage täglich gespielt — super!" |
| 3   | +200 Taps | "Schon 3 Tage dabei…" |
| 4   | Zufälliges Tier (Seltenheit 2) | "Überraschung für dich!" |
| 5   | +1000 Coins | "Dein Zoo wächst!" |
| 6   | Tickets ×2 | "Spielzeit verdienen…" |
| 7   | Tier-Ei (garaantiert Seltenheit 3+) | "Eine ganze Woche! 🎉" |

**Umsetzung:**
- Migration: `new_player_bonuses` (user_id, day, claimed_at)
- RPC: `claim_daily_newcomer_bonus()`
- GameView: Modal am Start wenn `is_newcomer && days_since_signup <= 7`

**Timeline:** 1 Sprint

---

## 2. Langziel-Engagement für Spieler

### 2.1 Sammler-Achievements & Medaillen-System

**Problem:** Kein sichtbares End-Goal (außer maximale Münzen). Spieler fühlen sich ziellos.

**Lösung: Stamm-Achievement-Bäume**

**Tier-Sammlung:**
- "Zoo 30%": 3 von 10 Tier-Typen
- "Zoo 70%": 7 von 10 Tier-Typen
- "Zoo 100%": Alle 10 Tier-Typen (Medaille 🏅)
- **Bonus:** +50% Offline-Earnings 48h

**Spielerstufen (nach Level):**
- Level 25 → Bronze-Badge
- Level 50 → Silver-Badge
- Level 100 → Gold-Badge (mit Leaderboard-Effekt)

**Minispiel-Meisterschaft:**
- Drift: 1000 Punkte gesamt
- Parkour: 500 m gelaufen
- Memory: 50 korrekte Matches (Online)
- Wordle: 30 Spiele gewonnen

**Umsetzung:**
- Migration: `achievements` (id, user_id, category, achievement, unlocked_at, badge_id)
- UI: Achievements-Seite (Menü oben oder Settings)
- RPC: `unlock_achievement()` nach Milestonesüberprüfung

**Timeline:** 2 Sprints (Seite + RPC-Infrastruktur)

---

### 2.2 Seasonal Events & Limited-Time Tiere

**Problem:** Spielerspielen sich durch alle Tiere und wissen nicht, was als nächstes kommt.

**Lösung: Monatliche Events mit exklusiven Rewards**

**Beispiel: Aug 2026 — "Dschungel-Safari"**

- **Dauer:** Aug 1–31 (UTC-Mitternacht)
- **Neues Tier:** Löwe (nur während Event erhältlich, Preis 8M coins)
- **Event-Quest:** 5 Parkour-Runs + 3 Drift-Sessions = Bonus-Egg (Seltenheit 3)
- **Shop-Rotation:** Exklusive Accessoires (Löwen-Hut, Dschungel-Hintergrund)
- **Leaderboard:** Aug-spezifisch mit Event-Preisen

**Mechanik:**
- `seasonal_animals` Tabelle mit `available_from`, `available_to`
- RPC: `submit_event_quest(event_id, proof_data)` mit Prüfung
- Banner auf GameView: "🦁 Dschungel-Safari lädt! (14 Tage verbleibend)"

**Kalender (Q3–Q4 2026):**

| Monat | Event | Tier | Highlight |
|-------|-------|------|-----------|
| Aug | Dschungel-Safari | Löwe | 3D-Parkour-Update |
| Sep | Oktoberfest | Bär | Minispiel-Turnier |
| Okt | Halloween | Geist/Eule | Limitierte Skins |
| Nov | Winter-Fest | Pinguin | Community-Vote Tier |
| Dez | Jahres-Finale | Phönix | Anniversary-Belohnungen |

**Timeline:** 3 Sprints (Event-Engine + erstes Event)

---

### 2.3 Ranglisten & Wettbewerbe

**Problem:** Leaderboard existiert, aber ist statisch und ungepflegt.

**Lösung: Wöchentliche + saisonale Bestenlisten**

**Bestenlisten-Typen:**
1. **Alle Zeiten:** Top 50 nach Level (aktuell)
2. **Diese Woche:** Coins verdient (Mi–Di UTC)
3. **Diesen Monat:** Neue Tiere gekauft
4. **Drift-Bestzeit:** Höchste einzelne Drift-Session
5. **Parkour-Strecke:** Längste Parkour-Laufdistanz

**Rewards (wöchentlich):**
- Platz 1–5: Tickets ×5
- Platz 6–20: Tickets ×2
- Platz 21–50: Tickets ×1

**Umsetzung:**
- Views: `LeaderboardView.vue` mit Tab-Navigation (Zeiträume)
- Tabelle: `leaderboard_snapshots` (weekly, monthly, alltime)
- RPC: `get_leaderboard(type, limit, offset)` mit Caching

**Timeline:** 1.5 Sprints

---

## 3. Soziale Mechaniken & Community

### 3.1 Freundschaften-Tiefe: Gemeinsame Quests

**Problem:** Freunde-Feature existiert (Requests), aber hat wenig Gameplay-Integration.

**Lösung: Pair-Quests**

**Beispiel-Quest:** "Co-op Drift"
- Zwei Freunde spielen parallel Drift
- Erreichen gemeinsam 500 Punkte → beide bekommen +200 Coins + Freundschafts-Badge

**Quest-Typen:**
- Co-op Minispiel (Memory-Online, Drift)
- Gegenseitige Hilfe (je 1M Coins geschenkt = Badge)
- Gemeinschaftsziele (z. B. zusammen Level 50 erreichen)

**Umsetzung:**
- Migration: `friendship_quests` (quest_id, friend1_id, friend2_id, quest_type, progress1/2, completed_at)
- Notification: "Dein Freund hat eine Quest für euch gestartet!"
- UI: Quest-Widget in FriendsView

**Timeline:** 2 Sprints

---

### 3.2 Guild/Clan-System (optional, Phase 2)

**Deferred:** Zu komplex für Phase 1, aber strategisch wertvoll.

**Skizze:**
- Spieler erstellen/treten Klans bei (3–20 Mitglieder)
- Gemeinsame Klan-Kasse (Spieler spenden Coins)
- Wöchentliches Klan-Ranking (Gesamtlevel)
- Klan-Upgrades: +5% Offline-Earnings für alle Mitglieder

---

## 4. Retention & Re-Engagement

### 4.1 Push-Notifikationen & E-Mail-Winback

**Problem:** Spieler, die 7+ Tage inaktiv sind, kommen nicht zurück.

**Lösung: Smart Notifications**

**Auslöser:**
1. **Tag 3 Inaktivität:** "Dein Zoo vermisst dich! 100 Coins warten. 🐾"
2. **Tag 7 Inaktivität:** "Großes Update: Neuer Parkour-Kurs verfügbar!"
3. **Tag 14 Inaktivität:** "Winter-Event startet morgen — sei dabei!"

**Tech:**
- Migration: `notification_log` (user_id, type, sent_at, opened_at)
- Scheduled Job (täglich, 08:00 UTC): `identify_inactive_users()` + Firebase/Expo Push
- Opt-out via Settings

**Timeline:** 1 Sprint

---

### 4.2 Comeback-Bonus

**Problem:** Rückkehrer starten schwach und fühlen sich hinter anderen.

**Lösung: Catch-up-Mechanik**

- Wenn Spieler nach 7+ Tagen Abwesenheit zurückkehrt:
  - +50% Offline-Earnings **nächste 24h**
  - +500 Bonus-Coins
  - Alle neuen Minispiele per Mail erklärt

**Umsetzung:**
- RPC: `check_comeback_bonus()` beim App-Start
- Migration: `comeback_bonuses` (user_id, last_absent_at, applied_at, expires_at)

**Timeline:** 0.5 Sprint

---

## 5. Technische Schulden & UX-Verbesserungen

### 5.1 Tier-Verwaltungs-UI

**Problem:** Mit 10+ Tieren wird Inventar unübersichtlich.

**Lösung:**
- Sortierung: Nach Seltenheit, Einkommen, Level
- Filter: "Nur Lieblinge", "Nicht genug Futter"
- Grid-Ansicht vs. Listen-Ansicht
- Bulk-Aktionen: "Alle füttern" (kosten anzeigen vor Bestätigung)

**Timeline:** 1 Sprint

---

### 5.2 Offline-Earnings Transparency

**Problem:** Spieler verstehen nicht, wie viel sie offline verdienen.

**Lösung:**
- Beim Zurückkommen Modal: "Du warst 4h weg. Offline-Earnings: +1234 Coins 🎁"
- Im Settings: "Dein Offline-Einkommen: 150/Sec (ohne Upgrades: 80/Sec)"
- Tooltip in Upgrades: "Multiplier wirkt auf Offline-Earnings"

**Timeline:** 0.5 Sprint

---

## 6. Minispiele-Tiefere Integrations

### 6.1 Minispiel-Dailies & Quest-Integration

**Problem:** Minispiele sind isoliert; keine Anreize, sie regelmäßig zu spielen.

**Lösung: Daily Challenges**

**Täglich (UTC Reset um 00:00):**
- "Drift 500 Punkte" → +100 Coins
- "Memory: 10 korrekte Matches" → +50 Coins + Tickets ×1
- "Parkour: 200 m" → +75 Coins
- "Wordle: Richtig raten" → +25 Coins

**Boni:**
- Alle 3 aufeinanderfolgende Tage: +500 Bonus-Coins
- Alle 7 Tage: Gratis-Ticket

**Umsetzung:**
- Tabelle: `daily_challenges` (user_id, date, challenge_type, progress, completed)
- RPC: `get_daily_challenges()`, `submit_challenge_progress()`
- GameView: Challenges-Panel oben

**Timeline:** 1.5 Sprints

---

## 7. Monetarisierung & Premium (optional Phase 2)

### 7.1 Premium-Pass Idee (nicht implementieren noch)

**Deferred:** Nur mit Benutzer-Feedback umsetzen.

**Skizze:**
- "Zoo Plus" ($4.99/Monat)
  - +50% Offline-Earnings
  - Freie Tickets (3/Woche)
  - Premium Skins für Tiere
  - Keine Ads (wenn nötig später)

---

## 8. Implementierungs-Roadmap

### Phase 1 (4 Wochen) — Core Retention

**Woche 1:**
- Progressive Feature-Freischaltung (Gating + Migrationen)
- Neulinge-Boni (Day-7-Arc)

**Woche 2:**
- Interaktives Tutorial
- Comeback-Bonus + Inaktivitäts-Notifikationen

**Woche 3:**
- Achievements-Seite + Abzeichen-System
- Wöchentliche Bestenlisten

**Woche 4:**
- Daily Challenges für Minispiele
- Tier-Verwaltungs-UI Verbesserungen

---

### Phase 2 (6 Wochen) — Events & Community

**Woche 5–6:**
- Seasonal Events Engine
- Erstes Event (Aug Dschungel-Safari)

**Woche 7–8:**
- Pair-Quests für Freunde
- Freundschafts-Notifikationen

**Woche 9–10:**
- Guild/Clan-System (optional, je nach Priorisierung)
- Community-Leaderboards

---

### Phase 3 (Ongoing) — Events & Balancing

- Monatliche Events (Sep, Okt, Nov, Dez)
- Community-Feedback Loop
- A/B-Tests für Retention

---

## 9. Erfolgsmetriken

Messen nach jeder Phase:

| Metrik | Ziel | Frequenz |
|--------|------|----------|
| **DAU** (Daily Active Users) | +30% nach Phase 1 | Täglich |
| **Retention Day 1/7/30** | D1: 55%, D7: 25%, D30: 12% | Täglich |
| **Time in Game** | +40% nach Phase 2 | Wöchentlich |
| **Minispiel-Nutzung** | 60% aller Spieler täglich | Täglich |
| **Comeback-Rate** | 40% der Inaktiven nach Notification | Wöchentlich |
| **Achievement-Unlock-Rate** | 70% neuer Spieler erreichen Level 25 | Täglich |

---

## 10. Risiken & Mitigationen

| Risiko | Mitigation |
|--------|-----------|
| Zu viel Gating frustriert Spieler | A/B-Test: Gating-Levels; enge Feedback-Loops |
| Events wirken wie "FOMO-Pay-to-Win" | Alle Rewards auch durch grind erreichbar; keine P2W-Mechaniken |
| Achievements-Komplexität overengineer | MVP: 5–7 Achievements pro Kategorie, später skalieren |
| Server-Last durch Notifications | Rate-Limit, Scheduled Jobs async, Firebase-Batch |

---

## 11. Nächste Schritte

1. **Product Review:** Stakeholder-Alignment auf Priorisierung
2. **Design-Docs:** Für Each Phase ein detailliertes Design-Dokument
3. **Kick-off Phase 1:** Entwicklung startet nächste Woche

---

**Autor:** AI-Agent (Claude Code)  
**Datum:** 2026-08-30  
**Version:** 1.0
