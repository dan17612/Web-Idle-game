# Zoo Empire — Strategie für Neulinge & langfristige Spielbindung

**Autor:** Claude (AI-Agent)  
**Datum:** 2026-08-27  
**Ziel:** Spielerlebnis für Anfänger attraktiv gestalten und bestehende Spieler halten

---

## 1. Aktuelle Stärken

- **Kernmechanik funktionstüchtig:** Tapping, Upgrades, tierbasiertes Einkommen laufen stabil.
- **Reiche Feature-Sammlung:** 6 Minispiele (Memory, Drift, Parkour, Wordle, Boss, Endless), Zoo-Welt, Fusion/Crafter, tägl. Quests.
- **Multiplayer-Hub:** Zoo-Welt mit Realtime-Spieler, Farmen, Emotes, Shop schafft soziale Bindung.
- **Progression klar:** Tier-Upgrade-Pfad (Normal → Gold → Diamond → Epic → Rainbow) visualisiert Fortschritt.
- **i18n:** Deutsch, English, Русский aus der Box.

---

## 2. Herausforderungen für Neulinge (Retention: 0–24h)

### Problem 1: Onboarding-Überwältigung
**Beobachtung:** GameView zeigt ~12 Quick-Action-Kacheln + 2 große Maschinen (Crafter, Fusion) + Minispiele. Neue Spieler wissen nicht, wo anfangen.

**Lösung: Progressives Onboarding (Tutorial-Roadmap)**
- **Phase 0 (Taps 1–50):** Nur TAP-Mechanik, 1 Tier kaufen (Shop-Eintrag prominent); Tutorial-Bubble führt durch.
- **Phase 1 (1. Tier × 3):** Fusion-Maschine vorstellen (Gold-Tier als Ziel).
- **Phase 2 (Gold-Tier):** Equipment-Slots & "Equip Best"-Flow.
- **Phase 3 (Slots × 3):** Erstes Minispiel (Memory, einfachste Logik) entsperren.
- **Phase 4 (1 Minispiel-Abschluss):** Weitere Minispiele sichtbar.
- **Phase 5 (Coins × 50k):** Zoo-Welt, Friends, Crafter freischalten.

**Code-Änderungen:**
- Neues Feld `tutorial_phase` (0–5) in `profiles` (bereits `tutorial_step`, aber erweitern).
- `GameView.vue`: Conditional render der Kacheln basierend auf Phase.
- RPC `progress_tutorial_phase()` — automatisch nach Milestones.

**UX-Gewinn:** Klarer, schrittweiser Einstieg. Spieler fühlen sich nicht überfordert.

---

### Problem 2: Early-Game Coins zu knapp
**Beobachtung:** Die ersten 100 Taps bringen ~500 Coins; Tier-Kauf kostet 1k+. Lange Wartezeit vor 1. Fusion.

**Lösung: Willkommens-Geschenk & Starter-Boost**
- **Gegeben:** `newbieGiftAvailable` schon vorhanden (1 Tier + 50 Taps).
- **Neu:** Zusätzliche "Starter-Boost" (24h oder nach 1000 Taps):
  - ×2 Coins für 24h **oder** ×2 Coin-Rate pro Tier für die erste Fusion.
  - Temporärer Boost motiviert tägliche Rückkehr.

**Code:**
- Feld `starter_boost_active_until` in `game_state`.
- RPC `claim_starter_boost()` — fire-and-forget nach 1. Geschenk + 30 Min.

**UX-Gewinn:** Weniger Frustration über langsameDauer; ×2 macht sich sofort bemerkbar.

---

### Problem 3: Wenig Anreiz für 1. Rückkehr
**Beobachtung:** Nur Taps & "irgendwann später" Rewards. Kein klarer "Komm morgen zurück"-Grund.

**Lösung: Tägliche Login-Boni & Quick Wins**
- **Daily Streak visueller machen:** Schon vorhanden, aber im Modal versteckt.
  - Prominenter im Hero-Banner zeigen: `🔥 {n} Tage` neben Coins/Taps.
  - Bonus bei Streak ×7, ×30, ×100 (z. B. Rare Species Egg).
- **Quick Daily Tasks (3 pro Tag):**
  - "Tippe 100-mal" → +Coins.
  - "Spiele 1 Minispiel" → +Tickets.
  - "Besuch die Zoo-Welt" → +Coins + Daily streak verlängern.
  - Modal beim Login, Abschluss-Feedback mit Confetti.

**Code:**
- Tabelle `daily_quests` — user_id, quest_id, completed_at, reset_at (UTC).
- RPC `get_daily_quests()` + `complete_quest(quest_id)`.

**UX-Gewinn:** Klare Ziele & Belohnungen pro Tag. Spiele-Loops verstärkt.

---

## 3. Retention für Bestehende Spieler (7d+)

### Idee 1: Events & begrenzte Inhalte (FOMO-Light)
**Format:** Wöchentliche Events (24h–7 Tage), die bestimmte Tiere/Items freischalten.
- **Beispiel:** "Zoo-Fest" (Sa–So): Rare-Tier Zebra nur in diesem Fenster, +50 % Coins in Minispielen.
- **Code:** Tabelle `active_events`, zeitbasierte Verfügbarkeit in Shop/Crafter.

**UX-Gewinn:** Ständig neue, zeitlich begrenzte Gründe zurückzukommen.

---

### Idee 2: Leaderboards & Wettbewerbe (Social Drive)
**Status:** Leaderboard-View existiert bereits.
- **Ausbauen:**
  - Wöchentliche "Coins earned" & "Taps this week" Rankings.
  - Monatliche "Collection Completion %"-Rangliste.
  - Kleine Rewards (z. B. Titel 🏆 "Top Collector" nächste Woche, visuell im Profil).
  - Push-Notif: "Du bist Top 100 in Coins-dieser-Woche!" → motiviert.

**Code:**
- Materialisierte Views oder Trigger für wöchentliche Rankings.
- `user_leaderboard_entry` Tabelle (weekly snapshot).

**UX-Gewinn:** Sozialer Vergleich hält Langzeit-Spieler aktiv.

---

### Idee 3: Tier-Handwerk & Crafting-Trees (Progression)
**Status:** Crafter-Maschine existiert, nutzt Rezepte.
- **Ausbauen:**
  - **Tier-spezifische Rezepte:** "Nur Rainbows" kombiniert in Unika (Phoenix, Einhorndrache).
  - **Sammel-Bäume:** Z. B. "Alle 5 Rainbow-Vögel" → "Rare Peacock" (permanent, nur handwerklich).
  - **Längere Handwerk-Ketten:** Tier A + B + Resource → Zwischenprodukt; Zwi + C → Final.

**Code:**
- Erweitert `craft_recipes` um `tier_requirement`, `ingredients.tier`.
- Neue Tabelle `craft_chains` für mehrstufige Rezepte.

**UX-Gewinn:** Deep crafting-Meta, Ziele für Monate, investiert Zeit.

---

### Idee 4: Achievements & Badges (Milestones)
- **Kategorien:**
  - Collector: "Alle Normals gesammelt", "Erste Rainbow", "100 Tiere insgesamt".
  - Minigames: "Wordle 10 gewinnen", "Parkour alle Levels" (bereits Level-based).
  - Social: "10 Freunde hinzugefügt", "Zoo-Welt 5 Tage besucht".
  - Wirtschaft: "1 Milliarde Coins verdient", "100 Tickets in Minispielen".
- **UI:** Badge-Panel in Profil, Tooltip erklär Kriterium & Progress.

**Code:**
- `achievements` Tabelle (definition), `user_achievements` (earned + timestamp).
- RPC `check_achievements()` nach relevanten Aktionen.

**UX-Gewinn:** Ziele für Hardcore-Spieler, Respekt-Signal.

---

## 4. Quick Wins (1–2 Wochen)

| Feature | Aufwand | Gewinn |
|---|---|---|
| **Onboarding Phase-Flow (GameView konditional)** | Medium | Hoch — verhindert Dropout bei Neuen |
| **Streak-Anzeige im Hero-Banner** | Low | Hoch — fällt ins Auge, motiviert tägliche Rückkehr |
| **3× Daily Tasks + Quest Modal** | Medium | Hoch — neue Loops |
| **Achievements Basics (5–10 global einfache)** | Low | Medium — erste Langzeit-Ziele |
| **Event-Tabelle & Admin-Panel** | Low–Medium | Hoch — Spieler-Verwöhnungs-Tool |

---

## 5. Mittelfristige Roadmap (1–3 Monate)

| Phase | Features | Ziel |
|---|---|---|
| **Aug 2026** | Quick Wins (oben); Onboarding Phase; Daily Quests | Neulinge-Retention +30 % |
| **Sep 2026** | Tier-Handwerks-Expan., Achievements, 1 Event/Woche | Langzeit-Retention +20 % |
| **Okt 2026** | Wöchentliche Rankings, Story-Mode (begrenzte Story-Quests), Seasonal Pass (kostenlos, 5 Tiers) | Engagement-Metriken stabilisieren |

---

## 6. Langfristige Visionen (Q4 2026+)

1. **Story-Campaigns:** Erzählte Quests, die neue Biome (Safari, Tiefsee, Weltraum) mit Tier-Sets freischalten.
2. **Guild-System:** Clans mit Leveln, gemeinsamen Zielen, exklusiven Shops.
3. **Nerf/Balance-Saisons:** Jede Saison 1–2 Tiere rebalancieren (+ Kompensations-Nerf-Items).
4. **Cosmetic Gacha (kostenlos):** Tägliche "Outfit Roll" – Rare Skins erhalten.
5. **Progression Quests (Roadmap sichtbar):** "Bis Level 10 → 5 Rainbow Tiere; bis Level 20 → Alle Minispiele freischalten".

---

## 7. Implementierungs-Roadmap

### 🔴 Phase 1 (Woche 1–2)
1. Migration: Feld `tutorial_phase` (0–5) in Profiles.
2. GameView: Conditional render (Show/Hide je Phase).
3. RPC `progress_tutorial_phase()` — Phasen-Fortschritt automatisch.
4. Starter-Boost: `starter_boost_active_until` in game_state; RPC.
5. Hero-Banner: Streak-Display verbessern.
6. Test: Neulinge können Phase durchlaufen.

### 🟡 Phase 2 (Woche 3–4)
1. Migration: `daily_quests` Tabelle.
2. RPC: `get_daily_quests()`, `complete_quest()`.
3. DailyQuestModal.vue: 3 Quests, Abschluss-Feedback.
4. Store: game.dailyQuests, game.completedQuests-Logik.
5. Test: Quests triggern & belohnen richtig.

### 🟢 Phase 3 (Woche 5–6)
1. Migration: `achievements` Tabelle; RPC.
2. Profile.vue: Achievements-Panel.
3. Trigger nach Aktionen (store Hooks).
4. Admin: Achievement-Test-Befehle (dev-only).

### 🔵 Phase 4 (Woche 7–8)
1. Migration: `active_events` + Zeitlogik.
2. Shop/Crafter: Filtern nach Event-Status.
3. Event-Admin-Panel (dev).
4. Erste Test-Events starten.

---

## 8. Erfolgskennzahlen (Metriken)

**Neulinge-Tracking:**
- DAU (Day 1, Day 3, Day 7) — Ziel: +40 % vs. heute.
- Avg. Session Length für Neulinge — Ziel: 10+ Min (vs. ~3 Min heute).
- 1. Fusion-Abschluss: % von Installationen — Ziel: 60 % (vs. ~40 %).

**Langzeit-Retention:**
- MAU (Monthly Active Users) — Ziel: +30 %.
- Avg. Tage zwischen Sessions — Ziel: < 2 Tage.
- Achievements/User — Ziel: avg. 5+ pro Spieler (nach 1 Monat).

**Engagement:**
- Minispiel-Plays/Day — Ziel: +50 %.
- Zoo-Welt-Besuch % — Ziel: 70 % aller Spieler/Woche.
- Friends Added/User — Ziel: avg. 3+ (vs. ~1.5 heute).

---

## 9. Risiken & Gegenmaßnahmen

| Risiko | Wahrscheinlichkeit | Gegenmaßnahme |
|---|---|---|
| Onboarding zu restriktiv (Spieler frustriert) | Mittel | A/B Test: Phasen 0–3 vs. sofort alle. |
| Daily Quests fühlen sich "erzwungen" an | Mittel | Quests Rewards klein, optional; Streak bleibt freiwillig. |
| Events-Balancing (Zu leicht/schwer) | Mittel | Beta-Test Events mit interne Spieler vor Launch. |
| Burnout durch zu viele Ziele | Gering | Ziele sind optional; Kernloop (Taps) bleibt simple. |

---

## 10. Zusammenfassung: Nächste Schritte

**Woche 1 (ab sofort):**
1. [ ] Migration `tutorial_phase` + RPC `progress_tutorial_phase()`.
2. [ ] GameView: Kacheln je Phase rendern.
3. [ ] Starter-Boost RPC + game.js Logik.
4. [ ] Streak-Display im Hero-Banner aufwerten.

**Woche 3:**
1. [ ] Daily Quests Migration + RPC.
2. [ ] DailyQuestModal + Triggers.

**Woche 5:**
1. [ ] Achievements Tabelle + Logik.
2. [ ] Profile.vue Achievement-Panel.

**Woche 7:**
1. [ ] Events-System.
2. [ ] Event-Admin starten.

**Langfristig:**
- Wöchentliches Review der Metriken (DAU, Retention).
- Alle 2 Wochen: 1 neues Event oder Balance-Patch.
- Monatlich: Feature-Roadmap mit Community abgleichen.

---

## Anhang: Technische Checkliste

- [ ] Alle Specs schreiben (Design-Docs).
- [ ] SQL-Migrationen testen (lokal + Staging).
- [ ] RPC-Audit (security_definer, search_path=public).
- [ ] RLS-Policies auf neuen Tabellen.
- [ ] Frontend Unit-Tests für Phase-Logik.
- [ ] E2E: Neulinge durchlaufen Phase 0 → 3.
- [ ] Monitoring: Fehler-Logs bei RPC-Aufrufen.
- [ ] Docs aktualisieren (CLAUDE.md, AGENTS.md).

---

**Gültig ab:** 2026-08-27  
**Letzte Änderung:** 2026-08-27  
**Status:** Entwurf → Team-Review erwartet
