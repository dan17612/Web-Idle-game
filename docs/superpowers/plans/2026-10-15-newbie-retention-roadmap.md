# Zoo Empire — Neuling & Retention Roadmap (Q4 2026 – Q1 2027)

**Status:** Roadmap-Proposal  
**Datum:** 2026-10-15  
**Autor:** Claude Code  

---

## Executive Summary

Zoo Empire hat eine **reichhaltige Mechanik-Basis** (Sammlung, Zucht, Market, Minispiele, Social). Um cool für **Neulinge** (erste 2 h) UND **Existierende** (wöchentliche Rückkehr) zu sein, brauchen wir:

1. **Klare Onboarding-Progression** — Minispiele/Features werden zu richtigem Zeitpunkt freigeschalten
2. **Early-Win-Momente** — Neulinge fühlen Fortschritt in ersten 20 Min
3. **Spannungskurve** — Bestehende Spieler haben wöchentliche Ziele + saisonale Events
4. **Social Hooks** — World/Market/Ranglisten als Retention-Motor

---

## 🎯 Phase 1: Neuling-Erlebnis (Prio 1)

### 1.1 Tutorial-Verbesserung
**Problem:** Neulinge wissen oft nicht, welche Tiere sammeln und wofür.

**Lösung:**
- **Quest-Kette statt Dialog:** Erste 5 Min = gerichtete Quests
  - „Sammle 3 Eisvögel" → Belohnung „Erste Zucht-Kombination"
  - „Verdiene 500 Coins mit Parkour" → Unlock Drift-Minispiel
  - „Schau dein erstes Tier in der Welt an" → Unlock World-Betreten
  
- **Feature-Gating:** Minispiele/Market starten gesperrt, freigeschalten per Quest
- **Fortschrittsleiste:** Visual Progress der ersten 10 Quests

**Tech:**
- Neue Tabelle: `tutorial_progress (user_id, quest_key, completed_at)`
- RPC: `tutorial_complete_quest(p_quest_key)` → gibt Items/Coins, freigeschaltet Features
- Feature-Checks in Views: `if (!game.unlockedFeatures.includes('drift')) return null`

---

### 1.2 Early-Win Moments
**Problem:** Idle-Spiele brauchen schnelle Belohnungen, sonst ABOs in H1.

**Lösung:**
- **Login-Prämie:** Tägliches Log-in-Ticket (Tag 1–7 gestaffelt), Tag 7 = 1 Premium-Ei
- **Erste Zucht im Tutorial:** Ei schlüpft nach 30 Sekunden (statt 12 h)
- **Minispiel-Streaks:** Jedes Mini nach Best-Score +50 Bonus-Coins

**DB:**
- `login_streak (user_id, streak_day, reward_claimed_at)` 
- Neue Config-Value: `TUTORIAL_BREEDING_HATCH_MINUTES = 0.5`

---

### 1.3 Minispiel-Progression
**Aktuell:** Alle Minispiele offen, keine Belohnungs-Skalierung.

**Neu:**
- **Schwierigkeits-Levels** pro Minispiel (Easy/Normal/Hard)
  - Easy = 100 Coins, Normal = 250, Hard = 500 + 1 Ticket
  - Level-Freigabe gebunden an Spieler-Gesamtprogress (Level 1 = alle Easy, Level 10 = alle Normal)
- **Leaderboards** pro Minispiel (7-Tage-Fenster)
  - Top 10 jeden Sonntag: +100 Bonus-Coins + Badge im Profil
- **Mini-Kampagnen:** „Parkour-Woche" (2x Rewards) rotierend pro Woche

**Tabellen:**
- `minigame_leaderboards (game_name, user_id, high_score, week_ending)`
- `player_minigame_level (user_id, game_name, unlocked_difficulty)` 

---

## 🎮 Phase 2: Retention für Existierende (Prio 2)

### 2.1 Wöchentliche Kampagnen
**Idee:** Jeden Montag neues Theme mit Bonussen.

- **Woche 1:** Parkour +50%, Zucht-Ei 25% günstiger
- **Woche 2:** Memory +3 Tickets, Boss-Truhen erscheinen öfter
- **Woche 3:** Market +5% Handelsspanne, Selten-Tiere günstiger
- **Woche 4:** Saisonales Minispiel (z. B. Advent ab Nov)

**Tech:**
- `weekly_campaigns (week_number, theme, boosts_json, active_until)`
- RPC `current_campaign()` → gibt aktive Boosts zurück
- Dauer: immer Mo 00:00 – So 23:59 Europe/Berlin

---

### 2.2 Saisonale Events (Halloween, Weihnacht, Valentinstag)
**Bestehend:** Halloween Puzzle ist exzellent.

**Neue Events:**
- **Advents-Kalender** (1.–24. Dez): täglich 1 Special-Item + Loot-Path
- **Valentinstag** (14. Feb): Paar-Einstellungen für Tiere (Herz-Emoji), Geschenk-Items zwischen Spielern
- **Oster-Eier** (Frühjahr): versteckte Easter-Eggs mit Rätseln

---

### 2.3 Guild / Freunde-Systeme (Prio 3)
**Bestehend:** World zeigt andere Spieler, aber keine Kooperation.

**Neu (optional):**
- **Gilden:** 5–50 Spieler, Wöchentliche Guild-Quests (z. B. „Guild sammelt 50k Coins")
- **Freunde-Liste** mit Fütter/Streichel-Aktion (kostenlos, Emote)
- **Geschenke:** 3x/Woche je 1 gratis-Item an Freund senden

**Kosten:** Mittel (neue Tabellen, RPCs, Realtime-Presence)

---

## 💡 Phase 3: Monetisierung & Engagement (Prio 2)

### 3.1 Battle Pass (saisonal)
- **Kostenlos:** Bis Level 10 (Cosmetics, Coins)
- **Premium:** Level 11–30 (Rare-Tiere, Eier, Bundle-Rabatte)
- Preis: €4,99/Monat oder 9,99€/Season

---

### 3.2 Cosmetic-Shop Erweiterung
- **Tier-Skins:** z. B. „Knuddel-Faultier" vs. „Futuristisches Faultier"
- **Haus-Deko:** Welt-Items (Brunnen, Bänke, Leucht-Pilze) kaufbar
- **Name-Farben:** Ranglisten-Titel (Gold/Silber/Bronze Top-10)

---

## 📊 Metriken zum Erfolg

| Metrik | Target | Messung |
|--------|--------|---------|
| **DAU/MAU-Ratio** | 40% | Täglich aktive / Monatlich aktive |
| **30-Tage-Retention** | 35% | % Neulinge, die nach 30 Tagen zurückkehren |
| **Avg. Session-Länge** | 15 Min | Täglich |
| **Minispiel-Plays/Tag** | 3+ | Pro Spieler, durchschnittlich |
| **Market-Trades/Woche** | 50+ | Pro aktiven Spieler |
| **Event-Teilnahme** | 60% | % Spieler, die Kampagne absolvieren |

---

## 🗓️ Implementierungs-Timeline

| Phase | Features | Aufwand | Start | Ende |
|-------|----------|---------|-------|------|
| **1a** | Tutorial-Quests + Feature-Gating | M | 15. Okt | 1. Nov |
| **1b** | Login-Prämie + Early-Wins | S | 1. Nov | 8. Nov |
| **1c** | Minispiel-Levels & Leaderboards | L | 8. Nov | 30. Nov |
| **2a** | Wöchentliche Kampagnen-Rotation | M | 1. Nov | 15. Nov |
| **2b** | Adventskalender (Start 1. Dez) | M | 1. Nov | 1. Dez |
| **3a** | Battle Pass Struktur | L | 1. Dez | 31. Dez |
| **3b** | Cosmetic-Shop Erweiterung | M | 1. Jan | 31. Jan |

**Legende:** S = Klein, M = Mittel, L = Groß

---

## ⚠️ Risiken & Lösungen

| Risiko | Lösungen |
|--------|----------|
| Neulinge verstehen Zucht nicht | Tutorial-Video + Grafiken in Zucht-Modal |
| Market ist zu komplex | Einfache "Buy It Now" Option statt nur Auktionen |
| Minispiele Difficulty zu hart | Progressive Tutorials (Parkour: Erst gerade Wege) |
| Server-Last durch Leaderboards | Caching (stündlich aktualisiert), SQL-Optimierung |
| Kostenlos ≠ nachhaltig | Premium Pass + Cosmetics müssen attraktiv sein |

---

## ✅ Nächste Konkrete Schritte

1. **Design-Spezifikation schreiben:** `2026-10-15-tutorial-quest-system-design.md`
2. **DB-Migration:** Tutorial-Tabellen + Kampagnen-Config
3. **Frontend-Prototype:** Tutorial-Modal mit Quest-Tracking
4. **Balancing:** Coins/Tickets-Kurve für Minispiele abstimmen
5. **A/B-Test:** Neuling-Kohorte mit neuem Onboarding vs. alt

---

## 📚 Siehe auch

- `docs/superpowers/specs/2026-08-03-zoo-welt-design.md` — World & Social
- `docs/superpowers/specs/2026-09-24-tier-boerse-design.md` — Market-Mechanik
- `docs/superpowers/specs/2026-10-08-halloween-update-design.md` — Event-Vorlage
- AGENTS.md — Stack-Überblick & Konventionen

---

**Bereit zum Nächsten Schritt?** → Starten wir mit Phase 1a (Tutorial-Quests).
