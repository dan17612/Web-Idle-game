# Onboarding & Progression — Nächste Schritte für Neulinge & bestehende Spieler

**Datum:** 2026-09-01  
**Status:** Strategischer Plan  
**Ziel:** Zoo Empire attraktiver & zugänglicher für Neulinge machen, ohne bestehende Spieler zu überfordern.

---

## 🎯 Ziel-Aussage

Neulinge sollen innerhalb der **ersten 5 Minuten** verstehen:
1. **Was mache ich hier?** (Tier-Sammlung, Idle-Mechanik)
2. **Wie verdiene ich schnell Coins?** (Tappen, Minispiele, Offline-Einkommen)
3. **Worauf arbeite ich hin?** (Minispiele freischalten, Tiere sammeln, Zoo-Welt erkunden)

Bestehende Spieler sollen durch neue Progression, Challenges und **Social-Features** langfristig engagiert bleiben.

---

## 📊 Aktuelle Situation

### ✅ Existierende Features
- **Tutorial-System** (TutorialBubble, tutorialStep in game store)
- **Willkommensgeschenk** (Bonus-Taps für Neulinge)
- **Einsteigerfreundliche UI** (Große Tap-Flächen, klare Symbole)
- **Minispiele** (Memory, Drift, Parkour, Wordle)
- **Zoo-Welt** (Multiplayer-Lobby mit Live-Spielern)
- **Freunde & Trade** (Sociales Engagement)

### ❌ Lücken & Probleme
1. **Keine geführte Progression**
   - Neulinge wissen nicht, welche Features in welcher Reihenfolge zu erforschen sind
   - Minispiele sind "versteckt" hinter Quick-Action-Kacheln
   - Kein klares "Milestone-System"

2. **Zu viele gleichzeitige Informationen**
   - GameView mit Tap-Upgrades, Crafter, Fusion, Quick-Actions gleichzeitig
   - Neulinge sind überfordert von Optionen
   - Mobile Nutzer scrollen endlos

3. **Fehlende Motivations-Hooks für Neulinge**
   - Kein "Achievement-System" oder Unlock-Path
   - Keine Rewards für erste Minispiel-Versuche
   - Leaderboard ist für Anfänger demotivierend

4. **Retention für bestehende Spieler**
   - Nach Tier-Sammlung fehlt das Ziel ("Was ist Endgame?")
   - Challenge-System existiert (Boss-Fight), aber ist nicht prominent
   - Tägl. Belohnung ist isoliert, kein Streak-Anreiz über längere Zeit

---

## 🚀 Vorgeschlagene Maßnahmen (in Priorität)

### Phase 1: Neulinge-Onboarding (Quick Wins)

#### 1.1 **Guided First-Time Experience (IFTTT-Modal)**
- Zeige Neulinge nach Login einen **Willkommensscreen**, der:
  - Erklärt, was Zoo Empire ist (Tier-sammeln, Idle-Game)
  - Die 3 Kern-Mechaniken vorstellt: Tappen → Tiere kaufen → Minispiele
  - Mit Buttons abzuarbeiten ist: "OK verstanden → Erste Tier kaufen → Minispiel probieren"
- **Implementierung:** Modal in `GameView.vue`, Trigger basierend auf `game.joinedAt` (neuer als 1 Tag) + `game.tutorialStep === 0`

#### 1.2 **Progressive Feature-Unlock**
- Struktur:
  - **Level 1–5:** Tappen, erste Tier kaufen, Liebling füttern
  - **Level 5–15:** Memory + Drift freischalten (niedrig-skill-Einstieg)
  - **Level 15–40:** Parkour + Wordle freischalten (höher-skill)
  - **Level 40+:** Zoo-Welt + Freunde + Boss-Fight freischalten
- **Quick-Actions nicht aus der Tasche schmeißen**, sondern progressive Buttons zeigen:
  - Anfänger: nur "Spielen → Tappen → Shop"
  - Mittelstufe: + "Minispiele"
  - Fortgeschrittene: + "Trade, Friends, World"

#### 1.3 **Achievement-System (Light)**
- Badges für Meilensteine:
  - 🎁 "Erstes Tier gekauft"
  - 🏆 "Memory gewonnen (1x)"
  - 💎 "Erstes Gold-Tier gefusioniert"
  - 🌍 "Zum ersten Mal in die Zoo-Welt gegangen"
  - 👥 "Erste Freundschaftsanfrage gesendet"
  - 🏅 "Boss-Etappe 1 besiegt"
- **Nutzen:** Progression visualisieren, Dopamin-Treffer, Sharing-Anreiz
- **Speicher:** `achievements` Tabelle + Badge-State in `user_stats`

---

### Phase 2: Mid-Game Retention (2–4 Wochen)

#### 2.1 **Streak & Consistency-Rewards**
- Erweiterung der täglichen Belohnung:
  - **Tage 1–3:** 50 Coins + 5 Tickets
  - **Tage 4–7:** 100 Coins + 10 Tickets + 1 Bonus-Tier (random)
  - **Tag 8+:** Sonder-Tier (legendär selten, nur im 8-Tage-Streak erreichbar)
  - **Reset bei Verpassung:** Geht zurück auf Stufe 1, **aber**: alle 10 Tage ein "Joker-Tag" (skip 1 Tag, Streak bleibt)
- **Psychologischer Anreiz:** "Nur noch 2 Tage bis zur Legend-Species!" motiviert 14-täglich

#### 2.2 **Challenge-Pool (wöchentlich)**
- Persönliche, nicht-kompetitive Ziele, die sich wöchentlich ändern:
  - "Tap 10.000 Mal diese Woche" → 500 Coins Bonus
  - "Spiele 5 Memory-Spiele" → 1 Gold-Tier
  - "Errichte einen Tier-Wert von 1M Coins" → Sonder-Emote/Avatar-Element
  - "Schreib 3 Spielern eine Freundschaftsanfrage" → 100 Tickets
- **Implementierung:** `weekly_challenges` Tabelle, ClientLogik in `GameView`, Progress-Bar
- **Vorteil:** Gibt Alt-Spielern was zu tun, ohne Geld-Grind zu bestrafen

#### 2.3 **"Coming Soon" Teaser für Features**
- Wenn Spieler Lvl 15 erreicht, aber Wordle nicht freigegeben:
  - Zeige ein **Locked-Card** mit "🟩 Zoo-Wordle — Freigeschaltet in 5 Tagen"
  - Gib Hint: "Errate das Wort des Tages & verdiene Tickets!"
- **Nutzen:** Schafft Neugier & Anreiz, länger im Game zu bleiben

---

### Phase 3: Community & Endgame (4+ Wochen)

#### 3.1 **Leaderboards Neu-Segmentiert**
- Nicht nur "Gesamt-Coins", sondern auch:
  - **"Neue Spieler-Leaderboard"** (< 2 Wochen alt) — zeigt schnelle Progress
  - **"Diese Woche am aktivsten"** — Daily-Aktiven-Ranking
  - **"Besten Sammler"** — nach Tier-Vielfalt (einzigartige Spezies)
  - **"Boss-Etappen-Rekord"** — wer ist am weitesten gekommen
- **Vorteil:** Neulinge sehen sich selbst in einem fairen Ranking, Alt-Spieler haben Ziele

#### 3.2 **Guilds/Clans (Phase-3-Feature, Ganzjahresgame)**
- Spieler-Gruppen mit gemeinsamen Zielen:
  - Wöchentliche Clan-Challenge (z. B. "Kombiniert 50 Taps")
  - Gemeinsame Rewards für Clan-Ziele
  - Clan-Leaderboard
- **Implementierung:** `clans`, `clan_members`, `clan_stats` Tabellen + Clan-View
- **Psychologisches Ziel:** "Social Proof" — spielen mit Freunden = langfristig höhere Retention

#### 3.3 **Limited-Time Events (monatlich)**
- "Safari-Eggs" (bereits im Code!), dann expandiert:
  - **"Legendary Hunt"** (21 Tage): Ein Tier spawnt täglich, Spieler haben 24h Fenster zum Fangen
  - **"Boss-Invasion"** (7 Tage): Schwächer-Boss mit Minibosses, höhere Rewards
  - **"Pet-Festival"** (14 Tage): Tier-Spotlight mit Bonus-Einkommen für bestimmte Species
- **Nutzen:** Regelmäßig zeitgebundene Inhalte halten Spieler am Ball

---

## 📋 Implementation Roadmap

### Woche 1–2: Phase 1 (Neulinge)
- [ ] Guided First-Time Modal (Text + Bilder + Next-Buttons)
- [ ] Progressive Feature-Unlock-Logik in `game.js`
- [ ] Achievement-System DB-Schema + RPC
- [ ] Quick-Action-Button Sichtbarkeits-Logik (Level-based)

### Woche 3–4: Phase 2 (Retention)
- [ ] Streak-Reward-System (erweitert daily rewards)
- [ ] Weekly Challenge DB + Progress-Logik
- [ ] "Coming Soon" Card-Komponent + Teaser-Logik
- [ ] Notifications für neue Challenges

### Woche 5–6: Phase 3 (Community)
- [ ] Leaderboard-Filterung + neue Kategorien
- [ ] Clan-System DB-Schema (nur Struktur, noch nicht im Frontend)
- [ ] Event-Framework (Basis für Limited-Time-Features)

### Parallel: QA & Balancing
- [ ] A/B-Testing: Guided Modal Conversion-Rate (80% sollten ihn starten)
- [ ] Retention-Metriken: Neulinge nach 7 Tagen noch aktiv? (Ziel: 40%+)
- [ ] Balancing-Pass: Challenge-Rewards nicht zu leicht, nicht zu hart

---

## 🎨 Design-Prinzipien

1. **Einfachheit zuerst:** Ein Neuling soll in 3 Minuten einen Tier kaufen können
2. **Progressive Offenbarung:** Features erscheinen zur richtigen Zeit, nicht alle auf einmal
3. **Celebration:** Belohnungen sind sichtbar & heiter — GIF-Animationen, Sounds, Toasts
4. **Fairness:** Neulinge sehen sich selbst in Leaderboards, nicht 1 Mio Coins hinter den Top 10
5. **Community:** Verweisungen auf Freunde + gemeinsame Ziele machen Spaß

---

## 🔑 Success-Metriken

| Metrik | Ziel | Messen |
|--------|------|--------|
| **Neuling-Retention (7d)** | 40%+ | `users active_at > 7 days ago` / `created_at < 7 days ago` |
| **First-Purchase-Rate** | 70%+ in 24h | % der Neulinge, die mindestens 1 Tier kaufen |
| **Minispiel-Adoption** | 60%+ in 48h | % der Neulinge, die mindestens 1 Minispiel probieren |
| **Guided-Modal-Abschluss** | 80%+ | % der Neulinge, die Modal komplett durchklicken |
| **Daily-Active-Streak** | +30% vs. alt | % mit Streak > 7 Tage |
| **Achievement-Unlock-Rate** | 2+ durchschnittl. | Summe Achievements / Spieler |
| **Friendship-Requests** | 3+ pro Spieler | Gesamt-Freundschaftsanfragen / Spieleranzahl |

---

## 💡 Nächste Schritte (für nächste Sprint)

1. **Entscheidung:** Approve Phase 1, Phase 2, Phase 3 oder nur Phase 1?
2. **Design-Iteration:** Guided Modal Mockup mit Daniil besprechen
3. **Datenbank-Plan:** Achievement + Challenge Schemas mit Supabase-Team aligned
4. **Dev-Start:** Branch `feat/onboarding-phase1` erstellen, erste Feature (Guided Modal) implementieren
5. **QA-Setup:** Test-User-Flow dokumentieren für Neulinge-Szenarien

---

## 📚 Referenzen

- `src/components/TutorialBubble.vue` — bestehende Tutorial-Logik
- `src/stores/game.js` — tutorialStep Verwaltung
- `docs/superpowers/specs/2026-08-03-zoo-welt-design.md` — Zoo-Welt Multiplayerlogik
- `AGENTS.md` — Architektur-Konventionen (RPC-Muster, Server-Autorität, etc.)

---

**Geplant von:** AI Agent (Claude Code)  
**Autorisiert durch:** Scheduled Routine (2026-09-01)
