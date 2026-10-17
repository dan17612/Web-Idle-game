# 🎯 Zoo Empire — Roadmap: Next Steps (2026)

**Status:** Q4 2026 Strategic Planning  
**Fokus:** Neueinsteiger-Erlebnis + Spieler-Retention  
**Datum:** 12. Oktober 2026

---

## 📊 Projekt-Übersicht: Was bereits funktioniert

### ✅ Core Gameplay
- **Tier-Sammlung & Zucht:** 10+ Arten, Zucht-Mechanik, seltene Mutationen
- **Passives Einkommen:** Offline-Earnings bis 8h, serverautoritativ
- **Minigames:** Parkour 3D, Wordle, Memory, BlockFall, Boss-Fight, Halloween-Puzzle
- **Wirtschaft:** Marktplatz (P2P), Coins verschicken, Börse mit dynamischen Kursen
- **Social:** Freunde, Online-Memory, Zoo-Welt mit Echtzeitpräsenz
- **Admin & Moderation:** Support-Tickets, Autoklicker-Erkennung, User-Ban-System
- **UI:** Dark Mode, Regelwerk, i18n (de/en/ru)

### 🏆 Bestehende Features
- Leaderboard (Top 50 global)
- Support-Panel mit Roadmap-Voting
- Halloween-Update (Puzzle-Levels 1-25, Regenbogen-Fledermaus)
- Tickets & Truhen-System
- Event-Hub mit Emoji-Kuration
- Zoo-Welt (Ring-Farm mit Echtzeit-Items)

---

## 🎮 Phase 1: Neueinsteiger-Onboarding (4 Wochen)

### Ziel
Neue Spieler verstehen **in 5 Minuten**, worum es im Spiel geht, und haben ein erstes klares Ziel.

### 🔴 Must-Have Tasks

#### 1. **Tutorial-Flow**
- Lineare Sequenz statt Info-Text-Wand:
  1. „Willkommen im Zoo Empire! 🦁"
  2. Erstes Tier (Küken) kaufen ← *Spieler tapped selbst*
  3. Coins verdienen sehen (live-Ticker)
  4. Zweites Tier für Synergien
  5. Minigame (z.B. kurzes Parkour-Snippet) zum Unlock von Bonuscoins
  6. Marktplatz zeigen (andere Spieler = nicht allein)
- **Implementation:** `TutorialFlow.vue` mit State-Machine, Overlays für Highlights
- **Spec vor Implementierung:** `docs/superpowers/specs/2026-10-15-tutorial-onboarding-design.md`

#### 2. **Erklärbär (Progressive Hints)**
- Kontextuelle Tooltips bei First-Time-Aktionen:
  - Erstes Tier-Upgrade? → „Das erhöht dein Einkommen"
  - Erstes Minigame? → „Verdiene Bonus-Coins!"
  - Marktplatz betreten? → „Handeln mit echten Spielern"
- Togglebar in Settings (`seenTutorials`-Flag)
- **Datei:** `composables/useProgressiveHints.js`

#### 3. **Leichte Startziele (Quest-Line)**
- Nach Tutorial: 3 automatische Quests
  - „Verdiene 1.000 Coins" (2 Min)
  - „Kaufe ein Huhn" (10 Coins bereits verdient)
  - „Spiele dein erstes Minigame" (3-5 Min)
- **Reward:** 50 Tickets (erste Truhe freischalten)
- **Datei:** `src/tutorialQuests.js` + RPC `claim_tutorial_quest`

#### 4. **Schneller App-Start**
- Pre-Load kritischer Assets (Tier-Emojis, Minigame-Thumbnails)
- Skeleton-Loading während Auth
- Lazy-Load Minigame-Engines erst nach GameView-Mount
- **Ziel:** < 2s bis zur ersten Interaktion

### 📋 Geschätzte Effort: 2 Wochen

---

## 🎯 Phase 2: Spieler-Retention (4 Wochen)

### Ziel
Bestehende Spieler haben **wöchentliche Anreize** und sehen Fortschritt.

### 🔴 Must-Have Tasks

#### 1. **Wöchentliche Belohnungs-Challenges**
- `weekly_challenges` Tabelle: 5 Challenges pro Woche
  - „Verdiene 100.000 Coins" → Belohnung: 25 Tickets
  - „Spiele 10 Minigame-Runden" → 30 Tickets
  - „Züchte ein Tier" → Seltenes Tier-Ei
  - „Handele auf dem Marktplatz" → 50 Coins
  - „Sammle 10 Sterne in Parkour" → 40 Tickets
- Fortschritts-Anzeige mit visueller Bar
- **RPC:** `claim_weekly_challenge` (serverseitig prüfbar)
- **Spec:** `docs/superpowers/specs/2026-10-15-weekly-challenges-design.md`

#### 2. **Täglicher Login-Bonus**
- `daily_streaks` Tabelle: 7-Tage-Sequenz
  - Tag 1-6: Coins (10k → 50k)
  - Tag 7: Seltenes Item oder 100 Tickets
  - Streak-Verlängerung bei täglichem Login
- **Visuelle Animation:** Kalender mit Abzeckmöglichkeit
- **Datei:** `src/dailyStreak.js`

#### 3. **Tier-Rarity-Progression** (Levelsystem)
- Jedes Tier kann upgradiert werden: ⭐ → ⭐⭐⭐ (Macht/Einkommen +20% pro Stern)
- Upgrade-Material: Sammeln aus Minigames + Truhen
- Visuelle Änderung: Glitter, Größe, Farbe des Tier-Emojis
- **Ziel:** Spieler wollen ihre liebsten Tiere perfektionieren
- **RPC:** `upgrade_animal(p_animal_id, p_levels)`

#### 4. **Seasons & Limited Editions**
- Alle 6 Wochen ein neues Set von **saisonalen Tieren** (nur dann verfügbar)
  - Winter-Löwe mit Fellmuster
  - Sommer-Adler mit Sonnenbrille
  - Frühling-Hase mit Blumenkranz
- **Förderung:** Angebot im Shop (Sale bei auslaufender Saison)
- FOMO-Faktor: Spieler jagen seltene Kombinationen

---

## 🎨 Phase 3: Quality-of-Life (Ongoing)

### 🔴 High Priority

#### 1. **Bessere Navigations-UX**
- Bottom-Nav Tabs renamieren:
  - „Farm" → „🏠 Farm"
  - „Tiere" → „🦁 Sammlung"
  - „Shop" → „🛒 Shop"
  - „Spielen" → „🎮 Spiele" (Minigames-Hub)
- Unread-Badge auf Support (wenn neue Admin-Antwort)
- Aktive Tab deutlicher heben (Glow-Effekt in Dark Mode)

#### 2. **Performance: Rendering-Optimierung**
- Virtualisierten Tier-Liste (nur sichtbare Reihen rendern)
- Canvas-basierte Marktplatz-Charts (zeichnerisch, nicht SVG)
- Minigame-Assets nur laden wenn Spiel startet
- **Ziel:** 60 FPS auf älteren Handys (iOS 13+)

#### 3. **Accessibility (a11y)**
- `aria-labels` auf alle interaktiven Elemente
- Keyboard-Navigation (Tab durch Farm, Tiere, Menüs)
- Kontrast-Verhältnisse prüfen (WCAG AA mindestens)
- Nicht nur Emojis für Icons (Fallback-Text)

#### 4. **Leaderboard 2.0**
- Nicht nur Top 50, sondern: „Dein Rang? 🥇 Platz 147 von 5.432"
- Freunde-Rankings (wer in deiner Liste ist oben?)
- Wöchentliche Bestenliste (für aktive Spiele)
- **Datei:** `src/leaderboardV2.js`

#### 5. **Push-Benachrichtigungen (Opt-in)**
- Neuer Admin-Reply im Support → Bell-Icon, dann Dialog
- Challenge im Abschluss? → „Noch 500 Coins für Belohnung!"
- Web Push API (kein nativer Code nötig, Capacitor liefert)

---

## 🔧 Phase 4: Technical Debt & Infrastructure

### 🟡 Should-Have

#### 1. **Automated Testing erweitern**
- Unit Tests für alle neuen RPC-Logik
- E2E Tests für Minigames (Parkour-Punktzahl, Memory-Match)
- Migration Tests (jede neue Tabelle mit RLS-Check)
- **CI/CD:** GitHub Actions auf Push

#### 2. **Analytics-Foundation**
- Anonyme Event-Tracking (nicht PII):
  - Spiel-Start, Minigame-Play (welches, wie lange, Ausgang)
  - Erster Kauf (nach wie vielen Minuten?)
  - Churn-Punkt (wo verlassen Spieler?)
- **Tool:** PostHog oder Plausible (privacy-respecting)
- **Nicht in PRIVACY.md eintragen, wenn 1st-party und anonym**

#### 3. **Monitoring & Error-Tracking**
- Sentry für Client-Fehler (JS, Vue-Fehler)
- Server-Logs: Fehlgeschlagene RPCs, verdächtige Automation
- Dashboard für Ops (Uptime, RPC-Performance, Spieler-Aktivität)

#### 4. **Datenbank-Optimierungen**
- Indizes auf häufig gefilterten Spalten (`animals.user_id`, `market_list.created_at`)
- Archivierung alter Transaktionen (nach 90 Tagen in `_archive`)
- Connection pooling für Supabase (Pgbouncer)

---

## 👥 Social & Community (Phase 5, Nice-to-Have)

### 🟢 Lower Priority

#### 1. **Clans/Gilden**
- Spieler gründen Teams, teilen Bonus-Einkommen
- Gemeinsame Wochenquests (besser zusammen)
- **Spec:** `docs/superpowers/specs/2026-11-01-clans-design.md` (später)

#### 2. **Trading-Verträge**
- Nicht nur Einmalverkauf: „Jeden Montag 1.000 Coins für 1 seltenes Ei"
- Automatisierte Abwicklung (nicht täglich manuell)
- Reputation-System (zuverlässige Trader)

#### 3. **Live-Events**
- Server-Event (z.B. „Dschungel-Invasion") triggert bosses überall
- Spieler müssen kollaborativ gewinnen (Gesamtschaden > Gesundheit)
- Server schickt Belohnung an **alle**

---

## 🗓️ Zeitplan (Vorschlag)

| Phase | Wochen | Start | Fokus |
|-------|--------|-------|-------|
| **1 (Onboarding)** | 4 | 15. Okt | Tutorial, erste Quests |
| **2 (Retention)** | 4 | 12. Nov | Wöchentliche Challenges, Daily Bonus |
| **3 (QoL)** | 2-4 | 10. Dez | Navigation, Performance, Accessibility |
| **4 (Tech)** | Ongoing | 15. Okt | Testing, Monitoring, Optimization |
| **5 (Social)** | TBD | 2027 | Clans, Events |

---

## 📌 Erfolgs-Metriken

- **Neueinsteiger:** 80% spielen nach Onboarding das erste Minigame
- **Retention (D7):** 40% der Neueinsteiger kehren nach 7 Tagen zurück
- **MAU (Monthly Active Users):** +20% nach Onboarding-Launch
- **Avg. Session:** ≥ 15 Min (statt aktuell 8 Min bei Neuen)
- **Performance:** Load < 2s, FPS ≥ 55 auf iPhone 8

---

## 🎯 Implementierungs-Checkliste

- [ ] Spec für Tutorial schreiben
- [ ] Spec für Weekly Challenges schreiben
- [ ] Schema-Migration für `weekly_challenges`, `daily_streaks` erstellen
- [ ] TutorialFlow.vue + State-Machine
- [ ] RPC `claim_tutorial_quest` + `claim_weekly_challenge`
- [ ] Tests für neue RPCs (SQL-Logik)
- [ ] UX-Testing mit ersten Neueinsteigern
- [ ] Performance-Audit (Chrome DevTools, Lighthouse)
- [ ] Marketing: „Neue Tiere" + Onboarding-Teaser auf Social Media

---

## 🔗 Verweise

- **Übersicht aktiver Features:** AGENTS.md
- **Design-Spezifikationen:** `docs/superpowers/specs/`
- **Pläne:** `docs/superpowers/plans/`
- **Live-Game:** Zoo Empire (zu deployen auf Vercel)
- **Admin-Panel:** GitHub Issues / Support-Tickets für Feedback

---

**Dieser Roadmap wird monatlich aktualisiert — Pull Requests willkommen!**  
_Letzte Änderung: 12. Oktober 2026_
