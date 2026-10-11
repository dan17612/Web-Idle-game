# Roadmap: Neulinge & Engagement — Zoo Empire

**Ziel:** Zoo Empire kühler, eingänglicher und süchtiger für Anfänger machen; bestehende Spieler mit kontinuierlichen Incentives binden.

**Datum:** 2026-09-20  
**Autor:** Claude Code  
**Status:** Strategischer Entwurf — zur Diskussion

---

## 1. Erkenntnisproblem

Das Spiel hat **viele Features** (8+ Minispiele, Zucht, Handelsplatz, World, Ranglistensystem), aber:

- **Neulinge:** Wie anfangen? Was ist wichtig? Warum sollte ich *diese* Features spielen? Keine geleitete Progression.
- **Bestehende Spieler:** Tägliche Loops sind etabliert; neue Events sind gut, aber zwischendrin fehlt es an *kontinuierlichen* Zielen und Belohnungen.
- **Retention-Lücke:** Spieler, die eine Woche pause machen, haben keine niedrigschwelliges Comeback-Ritual.

---

## 2. Vier Säulen der Verbesserung

### 2.1 Onboarding & Progression (für Neulinge)

**Ziel:** Neuer Spieler fühlt sich in 5 min orientiert, nach 30 min am Spiel gefesselt.

#### 2.1.1 Progressive Kampagnen-Einführung

- **Hauptmenü-Überhaul:** Aus der aktuellen flachen Karte einen visuellen „Story"-Einstieg (z.B. Karussell oder Hub).
- **3-Phasen-Kampagne für die erste Stunde:**
  1. **„Dein Zoo"** (0–5 min): Erstes Tier kaufen, in die Spielwelt sehen, erste Münzen verdienen.
  2. **„Fordern dich heraus"** (5–20 min): Ein Minispiel erkunden (empfohlen: Wordle oder Memory — einfach, fesselnd). Erste Rewards.
  3. **„Mit Freunden spielen"** (20–60 min): World oder Friends freischalten; eine Einladung oder Bestenliste ansehen.

- **Checklisten-Widget:**
  - Auf `GameView` ein einfaches „Was als nächstes?" Kartenleisten-Element.
  - Abhakbar, bringt je 50 Münzen + ein kosmetisches Abzeichen.
  - Verschwindet nach Abschluss; verhindert Überlastung.

#### 2.1.2 Feature-Highlights

- **Kontextuelle Tooltips:** Beim ersten Besuch einer neuen Route (z.B. `/shop`, `/memory`) ein interaktives Popover: „Hier kaufst du Tiere" + ein kurzes Video oder Gif der Mechanik.
- **Video-Tutorials:** Je Minispiel ein 15–30-Sekunden-Clip (Three.js-Animation oder real): „Wie spielt man Parkour?" — auf YouTube gelinked oder lokal embedded.

---

### 2.2 Täglich-Engagement (für Neulinge & Bestehende)

**Ziel:** Ein Grund, täglich zurückzukommen. Einzahlbare, vorhersehbare Belohnungen.

#### 2.2.1 Daily-Quest-System

- **5 täglich wechselnde Quests:**
  - Verdiene 500 Münzen (jeder Weg geht)
  - Spiele 3 Runden eines Minispiels (Wordle, Memory, etc., verschiedene täglich)
  - Tausche mit einem Freund
  - Verdiene 3 Sterne in Parkour / Drift
  - Kaufe 2 Tiere

- **Belohnungen:** Jeweils 100 Münzen + ein Progress-Token. Nach 5 Quests: 500 Bonus-Münzen + ein großes kosmetisches Item (z.B. exklusiver Tier-Skin).

#### 2.2.2 Login-Streaks & Großes Zeichen

- **Streak-Anzeige:** Oben auf `GameView` ein Mini-Kalender (heutige Woche): „🔥 7 Tage hintereinander!"
- **Streak-Boni:** 
  - Tag 3: +20 % Münzen für 2h
  - Tag 7: 200 Extra-Münzen + ein Tier-Coupon
  - Tag 30: Ein exklusives Tier freischalten oder Spezial-Cosmetic
- **Puffering:** Wenn ein Spieler einen Tag auslässt, ein kostenloses Replay-Token (1×/Monat).

#### 2.2.3 Weekly-Dungeon (Event-ähnlich)

- Ein zeitlich begrenzter Boss (`/weekly-boss`), der nur einmal pro Woche besiegt werden kann.
- Skalierte Rewards: Gold, Tickets, exklusiver Tier-Skin.
- Gibt schwachen Spielern eine scharfsinnige Wette + Angebot, starkzielen Spieler zu helfen.

---

### 2.3 Langfristige Progression (für Bestehende)

**Ziel:** Richtung, die über Wochen / Monate zieht — nicht nur „Tiere sammeln".

#### 2.3.1 Achievements & Milestones

- **Kategorien:**
  - **Tier-Meilensteine:** 10 Tiere, 25, 50, 100 → Bonuscoins + Abzeichen
  - **Minispiel-Meister:** 100 Siege in Wordle, 20 Level Parkour, etc.
  - **Social:** 5 Freunde hinzufügen, 3 Trades abschließen
  - **Wirtschaft:** 100K Münzen verdienen, 1000 Tickets sammeln

- **Sichtbarkeit:** Ein neuer Tab `/achievements` (oder Widget auf `/profile`), in dem Spieler ihre Fortschritte sehen und gegen Freunde vergleichen.

#### 2.3.2 Tier-Mastery-System

- Jedes Tier bekommt **Stufen** (1–5). Wer 20 Münzen/s mit Tier X produziert, sperrt Level 2 frei (+5 % passive Bonus für dieses Tier, sichtbar im Inventar).
- **Belohnung:** Nach Level 5 ein exklusives Cosmetic (Hut, Aura, etc.).
- **Hook:** „Ich muss diesen Löwen noch auf Level 5 bringen" ist ein persönlicher, mehrwöchiger Zug.

---

### 2.4 Retention-Motor (für Bestehende)

**Ziel:** Gründe, die Spieler nach Pausen zurückbringen.

#### 2.4.1 Comeback-Boni

- **Nach 7 Tagen Abwesenheit:** Ein Log-in-Screen mit „Willkommen zurück! Hier sind deine Gewinne."
- **Belohnung:**
  - 50 % der üblichen Daily-Quest (1000 Münzen + 1 Token)
  - Ein kostenloses Ticket
  - Hinweis: „Du verpasst eine 14-Tage-Streak!"

#### 2.4.2 Saisonales Event-Kalender

- **Monatliches Thema** (z.B. September = Savannah-Safari, Oktober = Halloween-Tiere).
- **Drei Wochen** Event-quests + limitierte Tier-Skins / Minispiel-Varianten.
- **Finale Woche:** Rückblick-Show auf Leaderboards (Top 10 pro Event).

#### 2.4.3 Clan / Guilds (Optionales Sozial-Feature)

- Freunde können einen „Zoo-Klub" gründen.
- Gemeinsame Weekly-Dungeon-Runs, gemeinsames Ziel (z.B. 50K Münzen diese Woche verdienen).
- **Belohnung:** Clan-Abzeichen, exklusive Tier-Skins für Mitglieder.

---

## 3. Implementierungs-Roadmap

### Phase 1: Foundation (Wochen 1–2)

- [ ] Daily-Quest-System (DB + RPCs) anlegen, `QuestsView` oder Widget auf `GameView`
- [ ] Login-Streak-Tracking hinzufügen (neue Spalte: `last_login`, `login_streak`)
- [ ] Streak-Anzeige auf `GameView`

### Phase 2: Onboarding (Wochen 2–3)

- [ ] Campaign-Checkliste designen (`onboarding_progress` Tabelle, RPCs)
- [ ] Tooltips für neue Routen (Vue-Komponente: `FeatureHint.vue`)
- [ ] Video-Integration für Minispiele vorbereiten (YouTube-Embeds oder lokale Clips)

### Phase 3: Langfrist (Wochen 3–4)

- [ ] Achievements-System (Datenmodell + Backend-Counts)
- [ ] Tier-Mastery (`animal_mastery` Tabelle, passive Bonusberechnung)
- [ ] Comeback-Mail-Template (oder In-Game-Toast)

### Phase 4: Saisonales (Wochen 4+)

- [ ] Event-Kalender-Backend
- [ ] Saisonale Quests & Limited-Edition-Tiere
- [ ] Clans-MVP (Discord-ähnliches Guild-System)

---

## 4. Design-Details

### 4.1 UI-Komponenten (Neu)

```
QuestsWidget.vue
  - Zeigt heute 5 Quests
  - Pro Quest: Icon, Name, Progress-Bar, Münz-Reward
  - Completion-Knopf

StreakBadge.vue
  - Feuer-Icon + Zahl
  - Mouseover: Kalender der letzten 7 Tage
  - Farbig für Meilensteine (3/7/14/30 Tage)

AchievementsGrid.vue
  - 3×4 Gitter, jede Fliese ein Achievement
  - Locked/Unlocked-Visuell
  - Klick: Details & Vergleich mit Freunden
```

### 4.2 I18N Keys (Neu)

```javascript
// In src/i18n.js

quests: {
  daily: "Tägliche Quests",
  earnCoins: "Verdiene {amount} Münzen",
  playMinigames: "Spiele 3 Runden {game}",
  tradeWithFriend: "Tausche mit einem Freund",
  // ... more
},
achievements: {
  tiercollector: "Tier-Sammler",
  mastery_10: "10 Tiere gesammelt",
  // ... more
},
```

### 4.3 Datenmodell (Skizze)

```sql
-- Quests
create table daily_quests (
  id serial primary key,
  player_id uuid,
  quest_key text, -- "earn_coins", "play_memory", etc.
  progress int, -- How much done (500 of 500 coins, e.g.)
  completed_at timestamp,
  created_at timestamp default now()
);

-- Achievements
create table achievements (
  id serial primary key,
  player_id uuid,
  achievement_key text, -- "tier_collector_10", "memory_master", etc.
  unlocked_at timestamp
);

-- Streaks
alter table profiles add column
  last_login date,
  login_streak int default 0,
  max_streak int default 0;

-- Tier Mastery
create table animal_mastery (
  player_id uuid,
  species_id int,
  level int default 1, -- 1–5
  created_at timestamp,
  primary key (player_id, species_id)
);
```

---

## 5. Erfolgsmessungen

- **Neulinge:** DAU nach 7 Tagen (Ziel: +20%), Vollendete Onboarding-Kampagne (Ziel: >80%).
- **Bestehende:** Daily-Quest-Completion-Rate (Ziel: >60%), Login-Streaks >7 Tage (Ziel: +30%).
- **Retention:** Day-7-Rückkehr (Ziel: +15%), WAU/MAU Verhältnis.

---

## 6. Offene Fragen

1. **Balancing:** Wie viele Münzen sollte eine Daily Quest geben? (Heute verdient ein Tier ~20–100/s, Quests also 500–2000 M realistisch?)
2. **Event-Timing:** Monatliche Events oder wöchentlich? Wie lange parallel?
3. **Cosmetics-Quelle:** Geben wir Skins auch im Shop zu kaufen, oder nur über Achievements/Streaks?
4. **Mobile-First:** Sollten Quests auch mobil (Capacitor-App) sofort syncen?

---

## 7. Nächste Schritte

1. **Feedback-Runde:** Diskussione mit dem Team zu Phase 1 & 2 Timeline.
2. **Design-Spec:** Detaillierte UI-Specs für QuestsWidget, AchievementsGrid (mit Mockups).
3. **Scope-Lock:** Welche Features in MVP? Streaks + Quests oder auch Mastery?

---

**Feedback & Diskussion unter:** docs/2026-09-20-roadmap-neulinge-und-engagement.md
