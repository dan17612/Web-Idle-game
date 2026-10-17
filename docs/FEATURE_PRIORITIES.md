# Zoo Empire — Feature-Prioritäten & Verbesserungsplan

## Executive Summary

Zoo Empire hat ein **starkes Feature-Fundament** mit 10+ Minispielen, Multiplayer-Welt und komplexem Wirtschaftssystem. Um **Neulinge zu halten** und **bestehende Spieler zu binden**, brauchen wir:

1. **Besseres Onboarding** (Quest-Sistem, klare Ziele)
2. **Regelmäßige Engagement-Hooks** (Streaks, Challenges, Events)
3. **Sichtbare Progression** (Achievements, Dex, Leaderboards)
4. **Zusammenhängender Content-Kalender** (Seasons, zeitlich begrenzte Events)

---

## Kritische Verbesserungen für Phase 1 (Sofort)

### A. Onboarding-Überhaul
**Problem:** Neue Spieler wissen nicht, was sie tun sollen oder warum.

**Lösung:**
- **Linear Quest-Serie:** „Zoo-Bauer" (5 Steps: Ei → Ausbrüten → Tappen → Upgrade → Minispiel)
- **Visuelles Feedback:** TutorialBubble + Highlight-Effekte (Outline-Pulse)
- **Früher Reward:** Nach Quest 5 → Badge + 10k Bonus-Coins

**Aufwand:** 2–3 Tage
**Impact:** ↑ Neuling-Retention um geschätzt 25–35%

---

### B. Achievements System
**Problem:** Keine visuellen Meilensteine oder Erfolgserlebnisse.

**Lösung:**
- **Bronze-Achievements:** Leicht zu erreichen (100 Taps, 1 Tier, 100k Coins)
- **Silver-Achievements:** Moderat (10 Tiere, Tier III Upgrade, Minispiel 3x)
- **Modal beim Unlock:** Pop-up, Animation, Sound-Feedback

**Aufwand:** 1–2 Tage
**Impact:** ↑ Session-Länge um 10–15%, ↑ Feature-Discovery

---

### C. Daily Streaks
**Problem:** Spieler haben keinen Grund, täglich wiederzukommen.

**Lösung:**
- **Sichtbarer Counter:** „Tag 3 von 7" in Top-Bar
- **Progressives Bonus:** 2 Tage = +5%, 3 Tage = +10%, max +50%
- **Rescue-Mechanic:** Einen Tag verpassen? Mit 1 Ticket retten

**Aufwand:** 1 Tag
**Impact:** ↑ DAU um 20–30%, ↑ Coin-Income für Spätspieler

---

## Mittelfristige Verbesserungen (Woche 2–4)

### D. Weekly Challenges
**Problem:** Struktur für Kurz-/Mittelfrist-Ziele fehlt.

**Lösung:**
- **3 Challenges pro Woche:** Verdiene 1M Coins, Spiele 5 Minispiele, Brüte 2 Tiere
- **Belohnungen:** Coins, Tickets, Abzeichen
- **UI:** Neue Tab „Aufgaben" mit Progress-Bars

**Aufwand:** 2 Tage
**Impact:** ↑ Playtime um 15–20%, ↑ Minispiel-Usage

---

### E. Event Framework
**Problem:** Keine zeitlich begrenzten Inhalte, spielert wird monoton.

**Lösung:**
- **Event-Kalender:** Halloween (vorhanden), Advent, New Year, Valentine, etc.
- **Event-Types:** Limited Tiere, Bonus-Räte, Spezial-Quests
- **UI:** EventBanner oben, EventBoard für alle aktiven Events

**Aufwand:** 2–3 Tage (+ 1 Tag pro neuen Event)
**Impact:** ↑ MAU um 30–40%, ↑ Community-Engagement

---

### F. Bestiary/Dex System
**Problem:** Keine Sammel-Sucht, keine Ziele für langfristige Spieler.

**Lösung:**
- **Dex wie Pokédex:** Track Seen/Owned pro Species
- **Kategorien:** Ungefangen (grau), Gesehen, Im Besitz, Shiny-Varianten
- **Achievements:** Dex 25%, 50%, 100% = große Belohnungen

**Aufwand:** 2–3 Tage
**Impact:** ↑ Endgame-Content, ↑ Börsenwert-Sucht

---

## Langfristige Verbesserungen (Monat 2+)

### G. Seasonal Content
**Problem:** Spieler sehen keine organische Progression durchs Jahr.

**Lösung:**
- **4 Jahreszeiten à 13 Wochen:** Frühling (Zucht), Sommer (Festival), Herbst (Halloween), Winter (Advent)
- **Pro Saison:** Neue Tiere, Outfits, Quests, Leaderboard-Reset
- **Meta:** Spieler jagen saisonale Inhalte

**Aufwand:** 3–5 Tage (Setup), dann 1 Tag pro neuer Saison
**Impact:** ↑ Seasonal-Spikes, ↑ Content-Länge

---

### H. Competitive Seasons & Leaderboards
**Problem:** Leaderboards existieren, aber Spieler wissen nicht, wofür sie Punkte sammeln.

**Lösung:**
- **Mehrere Leaderboards:** Portfolio-Wert, Einkommen, Minispiel-Highscores, saisonale Punkte
- **Sichtbare Ränge:** Top 10, Top 100, Abzeichen
- **Seasonal Resets:** Nach jeder 13-Wochen-Saison neuer Wettbewerb

**Aufwand:** 1–2 Tage
**Impact:** ↑ Competitive Play, ↑ Session-Länge für Hardcore-Spieler

---

### I. Market Level System
**Problem:** Neue Spieler können unwissentlich von Exploitanten getäuscht werden.

**Lösung:**
- **3 Stufen:** Neu (5 Angebote, 1M max), Established (15, 100M), Expert (unbegrenzt)
- **Level-Up-Kriterien:** 1 Woche + 10 Trades → Level 2
- **UI:** Level-Fortschritt in MarketView zeigen

**Aufwand:** 1 Tag
**Impact:** ↓ Fraud, ↑ Neuling-Sicherheit

---

### J. Shiny & Variant System
**Problem:** Endgame-Spieler haben alle Tiere, keine neuen Ziele.

**Lösung:**
- **5% Shiny-Rate:** Gold-Glitter, +3× Börsenwert
- **0,1% Legend-Rate:** Regenbogen, +10× Börsenwert
- **Dex-Tracking:** Zeige 0/5 Shinies gesammelt pro Tier

**Aufwand:** 2–3 Tage
**Impact:** ↑ RNG-Sucht, ↑ Börsenumsatz

---

## Nicht-Implementierungen (Später oder Nie)

### ❌ Zu Komplex (Warte auf Scale)
- **Guild/Team System** (Komplexe Netzwerk-Logik)
- **PvP Boss Raids** (Koordination schwer für asynchrones Spiel)
- **Customizable Tier Skins** (Art-Pipeline-Overhead)

### ❌ Zu Monetarisierungsabhängig
- **Battle Pass / Premium Currency** (Entscheidung der Geschäftsführung)
- **Ad Integration** (Privacy-Impact)
- **IAP Conversion** (Braucht mehr User-Base erst)

### ❌ Klare Rejections
- ❌ **Energy System** (Blockiert Engagement, typisch für Low-ARPU Games)
- ❌ **Gacha Rates < 1%** (Whale-exclusive, schadet Retention)
- ❌ **Competitive Breeding DPS Races** (Zu stressig, Newbie-feindlich)

---

## Umsetzungs-Reihenfolge (Empfohlener Sprint)

### Sprint 1 (Diese Woche)
1. Quests (A) — Tue/Wed
2. Achievements (B) — Thu
3. Tooltips (neue Komponente) — Fri

### Sprint 2 (Nächste Woche)
4. Daily Streaks (C) — Mon/Tue
5. Weekly Challenges (D) — Wed/Thu
6. Event Framework (E) — Fri + Next Mon

### Sprint 3 (2 Wochen später)
7. Dex System (F) — Mon–Wed
8. Market Level System (I) — Thu
9. Shiny System (J) — Fri + Next Mon

### Sprint 4 (Post-Phase 1)
10. Seasonal Content (G) — 3–5 Tage
11. Competitive Seasons (H) — 1–2 Tage

---

## Tech Debt & Cleanup (Parallel)

### Datenbank Migrationen
Alle neuen Features benötigen Migrations unter `supabase/migrations/`:
- `20261014_newbie_quests.sql` (Quest-Status)
- `20261014_achievements.sql` (Unlock-Tracking)
- `20261014_streaks.sql` (Login-Streaks)
- `20261015_weekly_challenges.sql`
- `20261015_events.sql`
- `20261016_user_dex.sql`
- `20261017_seasons.sql`
- `20261018_market_levels.sql`

### RPC Standardisierung
Alle neuen RPCs folgen diesem Schema:
```sql
create or replace function new_feature_action(p_param type)
returns json as $$
declare v_result json;
begin
  -- Server-side validation
  if condition_not_met then
    raise 'error_code';
  end if;
  
  -- Action
  update/insert/delete...;
  
  -- Return: { success, coins, tickets, message }
  return json_build_object(
    'success', true,
    'coins', (select coins from profiles where user_id = auth.uid()),
    'server_now', now()
  );
end;
$$ language plpgsql security definer;
```

### Frontend Structure
Neue Logik-Module sollten in `src/` landen:
```
src/
  quests.js             (Quest-Logik, Validierungen)
  achievements.js       (Achievement-Checks, Unlock-Logic)
  streaks.js           (Streak-Berechnung)
  weeklyChallenges.js  (Challenge-Progress)
  events.js            (Event-Status)
  dex.js               (Dex-Abfragen)
  seasonalContent.js   (Season-Logik)
```

---

## Success Metrics

### Phase 1 Success (2 Wochen)
- [ ] 50% der Neulinge schließen Quest 5 ab
- [ ] 40% aller Spieler freischalten ≥1 Achievement
- [ ] 70% aller Spieler haben ≥1-Tage Streak aktiv

### Phase 2 Success (4 Wochen)
- [ ] 60% aller Spieler sind auf Day 7 Streak+
- [ ] 30% aller Spieler completieren ≥50% Weekly Challenges
- [ ] Events erreichen 40% Teilnahmequote

### Long-Term Health
- [ ] Neuling Day-1 Retention: ≥ 35% (Baseline: ~20–25%)
- [ ] Neuling Day-7 Retention: ≥ 25% (Baseline: ~10–15%)
- [ ] MAU wächst 15–20% monatlich
- [ ] Durchschnittliche Session-Länge: ↑ 30–50%

---

## Anbindung an CLAUDE.md

Alle neuen Features sollten diese Conventions einhalten:

✅ **Server-Autoritative:** Alle wichtigen Daten (Coins, Tickets, Quests) via RPC validiert
✅ **RPC-Muster:** Vor Aktion `persist()`, dann RPC, dann UI-Update
✅ **Spiegel-Formeln:** Belohnungen doppelt (SQL + Client-Preview)
✅ **Tests:** `src/foo.test.js` für Logik, `src/fooSql.test.js` für Migrationen
✅ **I18N:** Alle Strings über `tx()` oder globales `I18N`-Dict
✅ **Dark Mode:** Keine Hart-Farben, nur CSS-Tokens verwenden

---

## FAQ

**F: Braucht das Onboarding so lange?**
A: Nein, aber neue Spieler brauchen **Führung**, nicht nur Features. Eine 5-Step-Quest fühlt sich wichtig an.

**F: Warum nicht sofort monetarisieren?**
A: Erst muss die User-Base größer werden. Churn bei Freemium-Games ist hoch, wenn die Retention schwach ist.

**F: Wie viel Aufwand ist das insgesamt?**
A: **Sofort (2 Wochen):** ~8 Tage
**Mittelfristig (2–4 Wochen):** ~10 Tage
**Langfristig (Monat 2+):** ~10 Tage pro neuer Feature/Saison
**Summe Phase 1–2:** ~28 Tage (4 Wochen Entwicklung)

**F: Was ist mit Sicherheit & Fair-Play?**
A: Automatisierungs-Erkennung ist bereits vorhanden. Neue Features müssen Cheating-Wege schließen (z.B. Quest-RPC validiert, nicht Client).

---

## Versionierung & Release Schedule

```
v1.2.0 (Oktober 2026):
  + Quests
  + Achievements
  + Daily Streaks
  + Tooltips

v1.3.0 (November 2026):
  + Weekly Challenges
  + Event Framework
  + Dex System
  + Market Levels

v1.4.0 (Dezember 2026):
  + Seasonal Content
  + Shiny/Variants
  + Competitive Seasons
  + Halloween/Advent Events
```

---

## Kontakt & Entscheidungen

Alle neuen Features erfordern Approval durch:
- **Product Owner:** Zielgruppe, Feature-Fit
- **Design Lead:** UI/UX, Accessibility
- **Engineering Lead:** Tech Debt, Performance-Impact
- **Community Manager:** Messaging, Event-Timing

Entscheidungen dokumentieren in `docs/superpowers/specs/` mit Datum und Rationale.
