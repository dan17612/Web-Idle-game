# Onboarding & Engagement: Progressive Einführung und Spieler-Bindung

Datum: 2026-10-16

## Ziel

Zoo Empire soll **Neulinge schnell abholen** (Spaß in den ersten 5 Minuten, klare Progression)
und **Langzeitspielende belohnen** (Daily/Weekly Challenges, Azeevements, Saison-Pässe).
Aktuell fehlt ein strukturiertes Onboarding und die Mid-Game Motivation ist dünn. Diese Spec
definiert beides.

## 1. Progressive Onboarding-Kampagne (Neulinge Tage 1–7)

### 1.1 Ziel

Weg vom leeren Bildschirm → schnell zum ersten Tier, erstes Minispiel, erste Freundin.
Keine Textmauern, stattdessen **Learn by Doing**: Jede Quest zeigt einen Feature-Bereich
auf der Karte.

### 1.2 Struktur

#### Phase 0: Account-Setup (Minute 1–2)
- Welcome-Modal: Name, Avatar-Emoji (einfache Auswahl), Sprache.
- Regelwerk-Zustimmung (laut 2026-10-11-regelwerk-zustimmung-design).
- **Übergang direkt zu Phase 1** — keine Wartezeit.

#### Phase 1: Erste Coins & erstes Tier (Tag 1, 5–10 Min)
**Quest: „Dein erstes Tier sammeln"**
- Starten mit **1000 Coins** und Hinweis: „Öffne die Truhe → Tierkarte → Füttern".
- Truhen-Tab zeigt kostenlos eine Anfängertruhe (4 häufige Tierarten).
- Nach Entnahme: **Tier-Detailansicht** (Bild, Name, Kosten, „Füttern"-Button) mit Toast:
  „🎉 Dein erstes Tier! Füttere es, um es glücklich zu machen."
- Quest abhaken → **+500 Coins Bonus**.

#### Phase 2: Erstes Füttern & erste Coins-Quelle (Tag 1–2)
**Quest: „Dein Tier füttern"**
- Spieler tippt auf „Füttern", Tier isst sichtbar, Coins-Counter steigt (Animation).
- Nach 3 Fütterungen: Toast „Jetzt kannst du Füttern wiederholen — oder ein Minispiel spielen!"
- **Minigame-Teaser**: Schnelle GIF-Animation des Parkour-Minispiels.
- Quest abhaken → **+10 Tickets**.

#### Phase 3: Erstes Minispiel (Tag 1–2, 10–15 Min Spielzeit)
**Quest: „Parkour spielen und Coins verdienen"**
- Automatische Weiterleitung zur Parkour-View nach Phase 2.
- Erste Partie vorinstalliert mit Tutorial-Toast (nur 5 s sichtbar):
  „← Neige das Gerät, → um zu springen, O um zu landen."
- Nach dem ersten Durchlauf (egal ob geschafft oder nicht): 
  - Toast mit den verdienen Coins
  - Quest abhaken → **weiterer Bonus**

#### Phase 4: Erste Freundin / Social (Tag 2–3)
**Quest: „Einen Freund herausfordern oder jemanden folgen"**
- Modal mit Top-3-Online-Spielern (Stufe 1–3) zum Hinzufügen.
- Alternativ: Zufallscode (9 Zeichen) teilen.
- Freundinnen-Seite zeigt erste Aktivität (‚*X* hat gerade Parkour gespielt!').
- Quest abhaken → **+1 Geschenkbox** (sofort öffnen, Coins/Tickets).

#### Phase 5: Markt-Einführung (Tag 3–4)
**Quest: „Dein erstes Tier auf der Börse anbieten"**
- Nach 3 Tieren im Besitz: Hinweis auf Börse-Tab (💰-Icon mit `NEW`-Badge).
- Börse erklärt in 3 Sätzen: „Spieler kaufen von dir, du verdienst Coins."
- Einfache Anleitung: Pick → „Anbieten" → Preis auto-vorgeschlagen → fertig.
- Quest abhaken → **+2000 Coins**.

#### Phase 6: Erste Challenge (Tag 4–5)
**Quest: „Deine erste Daily Challenge abschließen"**
- Challenge-Tab aktiviert sich erst nach Phase 5.
- Erste Challenge leicht: „Öffne 3 Truhen" oder „Sammle 5000 Coins".
- Belohnung: **5 Tickets + 500 Bonus-Coins**.
- Quest abhaken → Tutorial abgeschlossen, Spieler frei.

### 1.3 Datenspeicherung

Neue Tabelle: `onboarding_progress (user_id, phase int, completed_at, quest_ids jsonb)`

- RLS: nur Self, geändert über RPC `advance_onboarding_phase(p_phase int)`.
- Bei Quest-Abschluss: Coins/Tickets/Geschenke über `award_onboarding_bonus(p_phase int)`
  (idempotent).
- Views blocken Features hinter Phasen; `phase >= X` freigeben auf eigene Routen/Tabs.

### 1.4 Client

- `src/onboarding.js`: Quest-Logik, aktuelle Phase als Ref in `game`.
- Globales `OnboardingModals.vue` (Teleport wie `LegalConsentModal`) mit sequenziellen Modals.
- Jede Phase-View (`/world`, `/shop`, `/parkour` etc.) zeigt einen sanften **Spotlight-Overlay**
  (z-index 1050, grau 80% Deckkraft, Kreis um Zielbereich) mit kurzer Anleitung.
- Nach abschließender Quest: „✅ Geschafft! Los geht's zum nächsten." (Button → nächste Phase).

---

## 2. Daily & Weekly Challenges (Engagement für Alle)

### 2.1 Ziel

- Tägliche Missionen: „Öffne 5 Truhen", „Spiele 10 Parkour"
- Wöchentliche Meta: „Sammle 20 verschiedene Tierarten"
- Belohnungen: Coins, Tickets, exklusives Cosmetic

### 2.2 Struktur

#### Daily Challenges (5 pro Tag, UTC-Reset)

| Challenge | Typ | Ziel | Belohnung | Notizen |
|---|---|---|---|---|
| Truhen öffnen | Sammel | 5 | 200 Coins | RPC-getrackt |
| Fütterungen | Sammel | 15 | 100 Coins | Trigger auf `feed` |
| Parkour spielen | Aktion | 3 | 150 Coins + 2 Tickets | Nur Vollendungen |
| Markt-Käufe | Aktion | 2 | 300 Coins | Nach Kauf-RPC |
| Freunde-Aktion | Social | Einer online | 100 Coins | `presence` Poll |

- Nach **4 von 5**: Bonus-Toast „Noch eine Challenge, dann Bonus!"
- Nach **5 von 5**: 🎊 **+500 Coins Tagesbonus**

#### Weekly Challenges (3 pro Woche, Mi-Reset)

| Challenge | Ziel | Belohnung | Notizen |
|---|---|---|---|
| 20 unterschiedliche Arten sammeln | Besitz | 1000 Coins + 10 Tickets | Counter über `species` in `animals` |
| 50 000 Coins verdienen | Gesamt-Coins | 2000 Coins | `profiles.coins` Delta seit Mo 00:00 UTC |
| Ein Minispiel 5× spielen | Aktion | 300 Coins | Über RPC je Minispiel (parkour, blockfall, …) |

#### Saison-Pass (optional, Roadmap 2026-11-01)

- 8-Wochen-Zyklus, 20 Tier mit Reward-Pfad (Coins, Tickets, 1 exklusive Kosmetik).
- Gratis-Weg für alle, kostenpflichtig (5€) für schneller/mehr Rewards.

### 2.3 RPC & Trigger

Neue RPCs:
- `get_challenges()` → `{ daily: [{id, name, progress, goal, reward}…], weekly: […], weekly_reset_at }`.
- `claim_challenge_reward(p_challenge_id)` → Coins/Tickets gutschreiben.

Trigger auf Aktion-Tabellen:
```sql
-- Bei `chest_purchases` einfügen
INSERT INTO challenge_progress (user_id, challenge_id, progress)
VALUES (NEW.user_id, 'daily_chests', 1)
ON CONFLICT (user_id, challenge_id)
DO UPDATE SET progress = progress + 1;
```

### 2.4 Client

- `src/challenges.js`: Logik für Progress-Tracking, Belohnungs-Claim.
- `ChallengesView.vue`: Zwei Tabs (Daily / Weekly), Fortschrittsbalken, Claim-Button grau bis fertig.
- HUD-Badge auf Tab: `NEW` wenn eine komplett ist, `3/5` wenn aktiv.

---

## 3. Achievement-System (Langfristige Ziele)

### 3.1 Struktur (Phase 2, Start 2026-11-15)

50+ Achievements für verschiedene Playstile:

- **Sammler** (20 Arten, 50 Arten, 100 Arten, …)
- **Börsen-Mogul** (10 Verkäufe, 100 000 Coins verdient, …)
- **Minispiel-Meister** (Level 10+ je Spiel, 1000 Parkour gespielt, …)
- **Social** (5 Freunde, 10 Gemeinde-Helfer, …)
- **Events** (2× Halloween-Level 24, Alle Events besucht, …)

Belohnung: **Cosmetic-Items** (Profilrahmen, Tier-Skins), öffentlich in Profil sichtbar.

---

## 4. Spieler-Profil & Fortschritt-Anzeige

### 4.1 Öffentliches Profil

Erweiterung von `ProfileView.vue`:
- Aktuelle Stufe (Coins-Schwellen: 10K → Stufe 2, 50K → Stufe 3, etc.)
- **Statistik-Übersicht**: Lieblings-Minispiel, Tagesbonus-Streak (aufeinanderfolgend Tage), Geschenke-Versendet.
- **Achievements**: 5×5-Gitter, Bilder + Namen hover.

### 4.2 Datenschema (Erweiterung)

```sql
ALTER TABLE profiles ADD COLUMN
  current_level INT DEFAULT 1,  -- Coins-basiert
  daily_challenge_streak INT DEFAULT 0,
  achievements JSONB DEFAULT '{}'::jsonb;

-- Trigger: Bei Coins-Update `_update_player_level()`.
-- Bei 5 Daily-Challenges: +1 Streak (Reset bei Miss).
```

---

## 5. Implementierungs-Reihenfolge

1. **KW 43** (16.–22.10.): Onboarding Phase 1–3 + erste DB-Migration
2. **KW 44** (23.–29.10.): Onboarding Phase 4–6, testen
3. **KW 45** (30.10.–5.11.): Daily Challenges implementieren, Trigger live gehen
4. **KW 46** (6.–12.11.): Weekly Challenges, Saison-Pass Roadmap
5. **KW 47** (13.–19.11.): Profil-UI, Statistiken, Beta-Test
6. **2026-11-01**: Weekly Challenges Live
7. **2026-11-15**: Achievement-System starten

---

## 6. Erfolgskriterien

- **Neulinge** (Tag 1–3): Mindestens **60 % der Spieler erreichen Phase 6** (aktiv spielen, nicht nur anmelden).
- **Retention** (Woche 1–2): **≥40 % kehren nach Tag 1 zurück** (bis jetzt < 25 %).
- **Engagement**: **≥80 % der aktiven Spieler schließen mind. 1 Daily Challenge pro Woche ab**.
- **Session-Länge**: Durchschnitt **+5 Min pro Sitzung** nach allen Features live.

---

## 7. Zukunfts-Ideen (Backlog)

- **Saison-Pass**: 8-Wochen-Zyklus, gratis + kostenpflichtig ($4.99).
- **Clans/Gilden**: Gemeinsame Challenges, Rangliste, Bonus.
- **Story-Kampagne**: 10 Kapitel, je 3 Quests, Geschichte über die Zoo-Welt.
- **Battle Pass Events**: Limitiert (z. B. „Halloween-Power-Pass", +100 % Kürbis-Puzzle-Belohnungen).
