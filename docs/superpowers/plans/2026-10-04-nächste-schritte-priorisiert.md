# Zoo Empire: Nächste Schritte — Priorisierte ToDo-Liste

**Datum:** 2026-10-04  
**Ziel:** Kurzfristig (nächste 4 Wochen) das Spiel für Neulinge & Retention attraktiv machen.

---

## 🔴 PRIORITY 1: Interaktives Onboarding (Woche 1-2)

### Why
- **Problem:** Neue Spieler verstehen nicht, wie das Spiel funktioniert.
- **Impact:** +40% retention für neue Spieler (erwartet).
- **Scope:** Klein, isoliert, ändert nicht bestehenden Code.

### Tasks

- [ ] **Spec:** `OnboardingFlow.vue` Component
  - Lineares Tutorial: „Sammle → Spiele → Kaufe → Rüste aus"
  - 3 Quest-Stages, jeweils ~2 Minuten
  - Skip-Option (Erwachsene Spieler)
  
- [ ] **Migration:** `20261004_onboarding_quests.sql`
  - Table `onboarding_quest_steps` (id, order, required_action, reward)
  - Table `player_onboarding` (user_id, step_completed, completed_at)
  - RPC `complete_onboarding_step(p_user_id, p_step_id)` → Coins
  
- [ ] **View:** `OnboardingView.vue`
  - Neue Route `/onboarding`
  - Redirect zu `/game` nach Abschluss
  - i18n für de/en/ru
  
- [ ] **UX Test:**
  - 3 Test-Accounts erstellen
  - Neue Spieler sollten Tutorial in <5 Min. abschließen
  - Messen: 90% completion

### Definition of Done
- ✅ Alle 3 Quest-Stages spielbar
- ✅ Coins werden korrekt verteilt
- ✅ Redirect zu GameView funktioniert
- ✅ i18n vollständig
- ✅ Tests bestehen (`npm test`)

---

## 🔴 PRIORITY 2: Early-Game Milestones (Woche 2)

### Why
- **Problem:** Nach Onboarding fühlt sich das Spiel ziellos an.
- **Impact:** +25% Spielzeit/Tag für neue Spieler.
- **Scope:** Klein, rein Frontend-Logic.

### Tasks

- [ ] **Spec:** Milestone-Tracker in `GameView.vue`
  - Zeige: „Verdiene 500 Coins" → 45% abgeschlossen
  - Jedes Milestone: Badge + 100 Coins Bonus
  
- [ ] **Logic:** `src/milestones.js`
  - `checkMilestones(game)` → gibt zu entsperrende Badges zurück
  - Liste: Erstes Tier, 500 Coins, Lv. 5 Tier, 5 Minispiele gespielt
  
- [ ] **UI:** Milestone-Reihe in `GameView.vue`
  - Horizontal scrollbar mit Icons
  - Hover zeigt Beschreibung
  - Grün wenn erledigt, grau wenn noch offen

- [ ] **Notification:**
  - Jedes Milestone: Toast "🎉 Meilenstein erreicht: +100 Coins"
  - Speichern in `player_milestones` (einfache Tracking-Tabelle)

### Definition of Done
- ✅ Alle 5 Milestones definiert
- ✅ UI sieht "toy-like" aus (goldene Tokens)
- ✅ Coins werden vertrieben
- ✅ Milestones resetten nicht bei Reload

---

## 🟡 PRIORITY 3: Anfänger-Shop Kurierung (Woche 3)

### Why
- **Problem:** 100+ Tiere gleichzeitig → Analyse-Lähmung für Neulinge.
- **Impact:** +30% Konversionsrate (Kauf) für neue Spieler.
- **Scope:** Klein, nur Logik.

### Tasks

- [ ] **Spec:** `isNewAccount()` Helper
  - Accounts < 7 Tage alt: nur Tiere mit `rarity ≤ uncommon`
  - Max. 6 Tiere gleichzeitig angezeigt
  
- [ ] **Migration:** Spalte `species.recommended_for_newbies` (boolean)
  - Alle Common/Uncommon bekommen `true`
  - Rare/Legendary bekommen `false`
  
- [ ] **Logic:** `src/shop.js`
  - `filterShopForNewbies(allSpecies, userAge)` → nur 6 Empfehlungen
  - Sortierung: „Seltenes zuerst", dann „Beliebt"
  
- [ ] **UI:** Tooltip in Shop
  - Für neue Accounts: "Du freischaltst mehr Tiere nach einer Woche"
  - Badge "Empfohlen für Anfänger" auf geeigneten Tieren

- [ ] **Hinweis:** Premium-Tiere versteckt, aber nicht unavailable
  - Neulinge sehen: „Mehr Tiere verfügbar nach 7 Tagen"

### Definition of Done
- ✅ Neue Accounts sehen nur 6 Tiere
- ✅ Nach 7 Tagen: Alle Tiere sichtbar
- ✅ Emp-Tags angezeigt
- ✅ Test mit 3 neuen Accounts

---

## 🟡 PRIORITY 4: Tägliche Einlogg-Rewards (Woche 3-4)

### Why
- **Problem:** Keine Gewöhnung, keine Grund zurückzukehren.
- **Impact:** +45% WAU (Weekly Active Users).
- **Scope:** Mittel.

### Tasks

- [ ] **Spec:** Tägliche Check-in Mechanik
  - Einloggen = +20 Coins automatisch
  - Scratch Card: 10% Chance +100 Extra
  - 7-Tage Streak: Extra 500 Coins
  
- [ ] **Migration:** `20261004_daily_rewards.sql`
  - Table `player_daily_checkins` (user_id, last_checkin_date, streak_count)
  - RPC `claim_daily_reward()` → gibt Coins + streak_status zurück
  
- [ ] **View:** Modal beim Öffnen der App
  - „🎁 Täglich Check-in" mit großem Button
  - Streak-Anzeige (Tag 1/7, 2/7 etc.)
  - Spieleffekt beim Klick (Confetti)
  
- [ ] **Logic:** Auto-Claim bei jedem App-Start
  - Nur 1× pro Tag
  - Basierend auf UTC-Mitternacht

### Definition of Done
- ✅ Coins werden täglich verteilt
- ✅ Streak zählt richtig
- ✅ Modal zeigt sich 1× pro Tag
- ✅ i18n vollständig

---

## 🟢 PRIORITY 5: Erste Saisonale Event (Okt - Dezember)

### Why
- **Problem:** Nach 2 Wochen: Altes Content.
- **Impact:** +35% Retention über 4 Wochen.
- **Scope:** Groß, aber guter MVP.

### Tasks

- [ ] **Spec:** `docs/superpowers/specs/2026-10-04-halloween-event-design.md`
  - 2-Woche Event: 2 Halloween-Tiere (Kürbis-Fuchs, Fledermaus)
  - Tägliche Quest: 1 Minispiel = 10 Event-Coins
  - 100 Event-Coins = 1 Event-Tier
  - Beide Tiere nach Event: Hidden (aber besitzt die Spieler)
  
- [ ] **Migration:** `20261007_halloween_event.sql`
  - Spalte `species.event_name` (nullable)
  - Table `player_event_progress` (user_id, event_name, progress, claimed_tiers)
  - RPC `claim_event_reward(p_event_name, p_tier)` → Tier or Coins
  
- [ ] **UI:** Event-Banner in `GameView.vue`
  - Countdown: „Event endet in 6 Tagen"
  - Progress: „45/100 Event-Coins"
  - Shop mit 2 Event-Tieren
  
- [ ] **Content:** 
  - 2 neue Tier-Modelle mit Halloween-Theming
  - Event-Emotes (Kürbis, Fledermaus)
  - Minispiel-Skins (optional für Beta)

### Definition of Done
- ✅ Event-Tiere sammeln und anzeigen
- ✅ Tägliche Progress tracken
- ✅ Event endet pünktlich (Reset am 22 Okt)
- ✅ Coins/Tiere verteilt korrekt

---

## 📊 Implementierungs-Reihenfolge

**Woche 1 (Okt 7-14):**
1. Interactive Onboarding (Priority 1)
2. Early Milestones (Priority 2) — parallel

**Woche 2 (Okt 14-21):**
1. Anfänger-Shop (Priority 3)
2. Tägliche Rewards (Priority 4) — parallel

**Woche 3-4 (Okt 21 - Nov 4):**
1. Halloween Event (Priority 5) — groß, aber zeitkritisch für Okt

**Nach Okt 31:**
- Event endet, Übergang zu Dez-Weihnacht-Event

---

## 🎯 Success Metrics (zu Messen)

Nach 2 Wochen nach Launch einer Priority:

| Metrik | Ziel | Wie Messen |
|--------|------|-----------|
| **Priority 1** | 80%+ Onboarding Completion | Segment in Vercel Analytics: Neue Spieler |
| **Priority 2** | 60%+ Spieler mit ≥3 Milestones | In `player_milestones` Table zählen |
| **Priority 3** | 75%+ neue Spieler kaufen Tier (7 Tage) | Purchase funneling in Analytics |
| **Priority 4** | 50%+ WAU (Weekly Returning) | User Retention Cohort |
| **Priority 5** | 40% neue Event-Tiere gesammelt | RPC `player_event_progress` aggregieren |

---

## 🔧 Technische Anforderungen

- **Neue Views:** `OnboardingView.vue`, Event-Components
- **Neue RPCs:** 6-7 neue Postgres Functions
- **Neue Tables:** `onboarding_quests`, `player_milestones`, `daily_checkins`, `event_progress`
- **Frontend Logic:** `milestones.js`, `shop.js`, `events.js`
- **Tests:** Neue `*.test.js` für Logic-Module

**Zeitaufwand (geschätzt):**
- Priority 1: 3 Tage (Spec + Impl + Test)
- Priority 2: 1 Tag
- Priority 3: 1 Tag
- Priority 4: 2 Tage
- Priority 5: 4 Tage

**Total: ~2 Wochen für alle 5.**

---

## 📝 Notes für Developers

1. **Nicht vergessen:** Alle neuen Tabellen mit RLS + Policies!
2. **i18n:** Alle Strings in `src/i18n.js` oder lokale `I18N` Dict.
3. **Tests:** Migrations-Tests in `src/*Sql.test.js` (Regex-Checks).
4. **Datenbank:** Migrationen in `supabase/migrations/` commitzen.
5. **Design:** Tokens aus `src/styles.css` verwenden, keine hardcoded Farben.

---

## 📢 Kommunikation

- **Spieler-Update:** Nach jeder Priority einen Blog-Post (1-2 Sätze).
- **Roadmap Update:** Nach Event-Launch eine Community-Message.
- **Discord:** Ankündigen der Features 1 Woche vorher.
