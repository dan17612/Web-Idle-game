# Neulinge & Retention — Strategischer Plan für Zoo Empire

**Ziel:** Zoo Empire als Idle-Game attraktiver und eingängiger für Neulinge machen, während bestehende Spieler durch neue Ziele und langfristige Progression engagiert bleiben.

**Kontext:** Das Spiel ist funktional vielseitig (Zoo-Welt, Minispiele, Handel, Zucht), aber Struktur und Einstiege sind für Neueinsteiger möglicherweise chaotisch. Bestehende Spieler haben wenig Anreiz, täglich zurückzukommen.

---

## 1. Problem-Analyse

### Für Neulinge
- **Zu viele Einstiege gleichzeitig:** Shop, Zoo-Welt, Minispiele, Börse, Events — unklar, wo man anfangen sollte.
- **Keine Ziele in den ersten 30 Minuten:** Nach dem Fangen des ersten Tieres ist die Aufmerksamkeit verwirrt.
- **Fehlender Onboarding-Flow:** Es gibt keinen geleiteten Weg durch die Kernmechaniken.
- **Wirtschaft ist abstrakt:** Was sind Coins vs. Tickets? Wann brauche ich was?

### Für bestehende Spieler
- **Plateau-Effekt:** Nach Sammlung aller Tiere oder dem Durchspielen aller Minispiele gibt es wenig Neues.
- **Keine sozialen Anreize beyond Trading:** Ranglisten sind fragmentiert (Boss-Events, Minispiele einzeln).
- **Tägliche Routine wird stumpf:** Fountain-Claim + Minispiele spielen, dann ist die Luft raus.
- **Keine Progression-Meilensteine:** Der Weg vom Anfänger zum „Chef" ist nicht sichtbar.

---

## 2. Strategische Pfeiler

### 2.1 Onboarding-Sequenz (Neulinge: Tage 1–3)

**Vision:** Geleiteter, spielerischer Einstieg in die 5 Kernmechaniken über 3 Tage, mit Belohnungen statt Aufzwang.

**Kernideen:**
- **Tag 1: Tier-Sammlung & erste Coins.** Tutorial-Quest: „Fange dein erstes Tier (Shop) + verdiene 100 Coins (ein Minispiel spielen)."
- **Tag 2: Zoo-Welt.** Nach Abschluss von Tag 1: „Besuche die Zoo-Welt und stelle dein Tier aus" → unlock permanente Bewegungsfreiheit.
- **Tag 3: Börse & Multiplayer.** Nach Tier-Ausrüstung: „Schau die Börse an" → zeige Top 3 Listings eines deiner Tier-Typen.

**Technische Umsetzung:**
- Neue Tabelle `onboarding_progress` (user_id, step: 1–5, completed_at).
- RPC `onboarding_complete_step(step_id)` mit Rewards (Bonus-Coins, Ticket).
- Flag `show_onboarding` im Shop/WorldView/Market — versteckt Features, bis Onboarding done.
- Splash-Screen beim ersten Start (nicht nervig — nur ein Bild, 2 Klicks weiter).

**Erfolgs-Metrik:** Neulinge, die bis Tag 3 alle Kernfeatures ausprobiert haben, haben 10× höhere Retention.

---

### 2.2 Tägliche Challenges & Event-Kalender (Engagement für alle)

**Vision:** Wöchentliche Missionen mit wechselnden Zielen, die Spieler beschäftigen und Rewards für alle Skill-Level bringen.

**Konzept:**
```
Mo: Tiere aufrüsten (2 → 5 Tiere → Rewards)
Di: 3 Minispiele spielen (beliebige)
Mi: Börse: 1 Angebot maken oder 1 annehmen
Do: Zoo-Welt: 10 Minuten rumgehen + 1 Emote posten
Fr: Boss-Event teilnehmen (wenn verfügbar)
Sa/So: Freie Wahl — Tier upgraden ODER 5 Minispiele ODER Zucht-Eier brüten
```

**Rewards:** 
- Kleine Tagesbelohnung (50 Coins / 5 Tickets für 1–2 Challenges).
- Wöchentlicher Bonus (seltener Schlüssel/Ticket/Tier-Ei) bei 4+ completed Challenges.

**Technische Umsetzung:**
- Neue Tabelle `challenge_definitions` (YAML/JSON, wöchentlich aktualisiert).
- Tabelle `user_challenge_progress` (user_id, challenge_id, completed_at).
- RPCs in Minispielen/Shop/WorldView setzen `completed_at` (Server-autorisiert).
- PushNotification bei fehlender Challenge am Abend vor Ablauf.

**Erfolgs-Metrik:** +40% höhere Wiederkehr nach Woche 1, stärkerer Day-7-Retention.

---

### 2.3 Gesamt-Fortschrits-Anzeige (Klarheit & Langzeitmotivation)

**Vision:** Sichtbarer Weg vom Anfänger zum Champion, ähnlich wie Battle-Pass-Level.

**Mechanik:**
- **Account-Level** (0–50, später unbegrenzt): Basierend auf Account-Alter + Tiere gefangen + Börsen-Transaktionen + Boss-Kills.
- **Tier-Katalog-Fortschritt:** Von 0/157 bis 157/157 sichtbar im Shop (mit Rarität-Farben).
- **Achievement-Badges:** Erste Börsen-Transaktion, erstes Boss-Kill, 10 Tiere, 100 Coins gewonnen, etc.
- **Wöchentliche Saison:** Season 1, Season 2, … (jede 3–4 Wochen, mit Season-spezifischen Items/Emotes).

**UI:**
- Kopfleiste: Level-Balken (wie `[████░░░░] Level 12 • 78%`).
- Neuer „Fortschritt"-Reiter in der Haupt-App: Achievements, Katalog-Kompletion, Ranglisten-Position.

**Technische Umsetzung:**
- Views `account_level` (user_id, level, exp, season) berechnet aus _account_level_exp(user_id).
- Tabelle `achievement_definitions` + `user_achievements` (claimed_at).
- RPC `claim_achievement(id)` mit Reward.

**Erfolgs-Metrik:** Spieler, die ihr Level sehen, spielen 15% länger pro Session.

---

### 2.4 Story-Stränge & Event-Narrative (Tiefere Identifikation)

**Vision:** Zoo Empire nicht nur als Sammlung, sondern als Welt mit Geschichten.

**Beispiele:**
- **Founder's Path:** 5-stufiger Quest („Der Zoo-Gründer erzählt…") mit Backflashes auf historische Tiere → exklusives Tier-Ei am Ende.
- **Monthly Mini-Story:** Z. B. „Der Vogelhändler besucht den Zoo" (Feb) → neue Event-Quests, neue Vogel-Art als Reward, Börsen-Volatilität auf Vögel +20%.
- **Seasonal Narrative:** Season 1 = Zoo wird gebaut, Season 2 = Erste Besucher, Season 3 = Fremde Länder erkunden (neuer Biom in Zoo-Welt).

**Technische Umsetzung:**
- Neue Tabelle `story_chapters` (id, season, ch_num, title, unlock_level, …).
- RPCs für Quests, Rewards auch über RPC (nicht im Client geschummelt).
- Text in `src/i18n.js` (de/en/ru), unterstützt Variablen `tx('story.ch1', { playerName: 'Anna' })`.

**Erfolgs-Metrik:** Spieler mit Story-Completion haben +25% Engagement über 30 Tage.

---

## 3. Implementierungs-Roadmap

### Phase 1: Foundation (2 Wochen)
- [ ] **Onboarding-Tabelle + RPCs** → `supabase/migrations/2026MMDD_onboarding.sql`
- [ ] **Onboarding-UI** in Shop/World → Gate Features hinter Flag
- [ ] **Daily Challenges-Infra** → Tabellen + RPCs + UI-Gerüst

### Phase 2: Early Wins (1 Woche)
- [ ] **Challenges-Implementierung** (Mo–So Vorlagen)
- [ ] **Account-Level-View** (einfache Berechnung, Balken)
- [ ] **Notification-Integration** für Challenges

### Phase 3: Engagement Layer (1 Woche)
- [ ] **Achievement-Système** (20–30 erste Badges)
- [ ] **Tier-Katalog-Fortschritt** im Shop sichtbar

### Phase 4: Narrative & Tiefe (2 Wochen)
- [ ] **Story-Framework** + 1. Story-Arc
- [ ] **Story-UI** (Dialog-Modal, Chapter-Anzeige)

### Phase 5: Optimierung & Live (1 Woche)
- [ ] A/B-Tests: Onboarding an/aus → Vergleich D-7-Retention
- [ ] Push-Notifications kalibrieren (Häufigkeit)
- [ ] Analytics: Level-Verteilung, Challenge-Completion-Rate

---

## 4. Metriken zum Erfolgserfolg

| Metrik | Baseline | Target (in 4 Wochen) | Tool |
|--------|----------|----------------------|------|
| **D1-Retention (Neulinge)** | ?? | +30% | Analytics |
| **D7-Retention** | ?? | +40% | Analytics |
| **Avg. Session-Länge** | ?? | +20% | Analytics |
| **Daily Active Users** | ?? | +15% | Analytics |
| **Challenges completed/Woche** | — | ≥4 (Median) | DB-Query |
| **Avg. Account-Level nach 2 Wochen** | — | ≥10 | DB-Query |

---

## 5. Risiken & Mitigationen

| Risiko | Potenzial-Schaden | Mitigation |
|--------|-------------------|-----------|
| Onboarding zu restriktiv | Neulinge fühlen sich gegängelt | Feature-Freischaltung sanft, nicht erzwungen; Early-Unlock möglich |
| Challenges zu schwer | Spieler geben frustriert auf | Task-Schwierigkeit pro Level skalieren, Anfänger-freundliche Varianten |
| Narrative-Story langweilt | Liest niemand | Short-form + Rich Media (Video, Bild); vorlesen optional |
| Level-Farming wird Ziel statt Spielen | Gameplay wird zum Mittel | Exp-Formeln so, dass Spaß = schnellste Progression |

---

## 6. Design-Spezifikationen (separate Docs)

Diese Roadmap triggert folgende neue Spec-Dateien:

- `2026-10-XX-onboarding-flow-design.md` — UI, Flows, Klartext aller Dialoge
- `2026-10-XX-challenges-system-design.md` — RPC-Schemata, Rewards, Scheduling
- `2026-10-XX-account-progression-design.md` — Level-Formel, Achievement-Liste
- `2026-10-XX-story-framework-design.md` — Narrative-Architektur, Dialog-System

---

## Fazit

Zoo Empire hat solide Kernmechaniken, braucht aber eine **narrative & progressive Struktur**, um Neulinge willkommen zu heißen und Spieler zum Weiterspielen zu motivieren. Die 4 Pfeiler oben schlagen vor:

1. **Geleitete Einstiege** für Anfänger  
2. **Tägliche Ziele** für alle  
3. **Sichtbare Progression** zur Bestätigung  
4. **Geschichten & Sinn** zum Eingewöbnen in die Welt  

Mit diesen Massnahmen sollte Zoo Empire von „interessantem Sammler-Idle" zu „süchtig machender, sozialer Tier-Economy" werden.
