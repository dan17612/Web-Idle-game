# Nächste Schritte: Onboarding + Seasons + Community

Datum: 2026-10-06

## Überblick

Zoo Empire hat eine solide Basis (Börse, Minispiele, Zoo-Welt, Zucht, Support-System).
Um **Neulinge zu fesseln** und **Langzeitspieler zu halten**, brauchen wir:

1. **Geführtes Onboarding** (erste 15 Minuten)
2. **Quest/Achievements-System** (tägliche + globale Ziele)
3. **Saisonal-Events** (zeitlich begrenzt, mit Storytelling)
4. **Verbesserte soziale Features** (Clans, Events-Teaming)

---

## Phase 1: Strukturiertes Onboarding (Q4 2026)

### Ziel

Neue Spieler verstehen in 15 Minuten:
- Warum Zoo sammeln cool ist
- Wie man die ersten Münzen verdient
- Welche Minispiele es gibt
- Dass es ein Wirtschafts-Endgame gibt

### Umsetzung

**Route `/onboarding`** (vor `meta: { auth: true }`-Check):
- Vier Schritte (jeweils Modal/Guided Step):
  1. **Tierwahl** (3 Starter-Spezies wählen)
  2. **Erstes Minispiel** (Parkour-Tutorial, einfache Bahn, Belohnung 50 Coins)
  3. **Laden-Tour** (wo man Futter/Tiere kauft)
  4. **Zoo-Welt-Preview** (mit NPC-Tier zur Inspiration)

- Nach Abschluss: Flag `user_profile.onboarding_completed_at` auf DB speichern.
- Knopf „Überspringen" jederzeit, mit Warnung.
- Musik/Sounds im Onboarding (einmal Motivation + Erfolgsbestätigung).

**Erste 24h Boni:**
- 200 Extra-Coins für Abschluss
- 1 kostenlos gezogenes Ei
- 2 Rewards für erste 3 Minispiel-Versuche

---

## Phase 2: Quest/Achievements System (Q4 2026)

### Ziel

Tägliche Mikroziele geben Struktur und Wiederkehrwert.

### Unterscheidung

**Quests** (täglich):
- Verdiene 200 Coins
- Spiele 2 verschiedene Minispiele
- Halte 1 Stunde online
- Züchte ein Ei aus

**Achievements** (permanent, einmalig):
- Erreiche 100k Coins
- Besitze alle Basis-Spezies
- Klettre Parkour-Leaderboard Top 50
- Kaufe ein Tier auf der Börse

### DB-Schema

```sql
-- Neue Tabelle
CREATE TABLE quests (
  id uuid primary key,
  user_id uuid not null references auth.users,
  quest_type text not null, -- 'daily' | 'milestone'
  title_i18n text not null,
  target_count int not null,
  progress_count int not null default 0,
  reward_coins int not null,
  reward_items jsonb, -- {"ticket_count": 1}
  expires_at timestamp,
  completed_at timestamp,
  created_at timestamp default now(),
  unique(user_id, quest_type, created_at::date, quest_type)
);

CREATE TABLE achievements (
  id uuid primary key,
  user_id uuid not null references auth.users,
  achievement_id text not null,
  unlocked_at timestamp,
  unique(user_id, achievement_id)
);
```

### RPCs

- `get_daily_quests()` → Liste mit Progress
- `complete_quest(p_quest_id)` → Rewards geben, Flag setzen
- `get_achievements()` → Alle + eigene

### UI

**„Quests"-Tab im GameView:**
- 3 aktive Quests pro Tag (rotieren um 00:00 UTC)
- Progress-Bars pro Quest
- Reward-Preview
- „Abschließen"-Button wenn 100%

**Achievements-Modal** (vom Profil):
- Grid von Icons
- Hover: Name, Beschreibung, Unlock-Zeit
- Abgelocked = Grayed-out mit „Bald verfügbar"

---

## Phase 3: Saisonal-Events (Q1 2027)

### Konzept

Jeweils 4 Wochen, mit einzigartigen Belohnungen + Story.

**Event 1: Herbst-Ernte (späterer Start)**
- Neue Tier-Familie: Bauernhof-Tiere (Huhn, Schaf, Schwein)
- Event-exklusiv: Ernte-Minispiel (Blockfall-Variante: Obst sammeln)
- Shop: Event-Tickets durch Minispiel verdienen
- Abschluss: Limitierte Tier bekommen (später nur über Markt)

**Event 2: Winter-Wunschland**
- Story: Spieler bereitet Zoo für Fest vor
- Feature: Co-op Minispiel (bis zu 4 Spieler, asynchron)
- Neue Tier: Polarkreis-Familie (Eisbär, Pinguin, Robben)
- Cosmetics: Schnee-Effekte, Winter-Hüte

**Event 3: Frühlings-Parade**
- Feature: Tier-Wagen im Parade-Rennspiel
- Neue Tier: Exotische Frühlings-Arten
- Global-Challenge: Gemeinschaft muss Coins sammeln für globale Belohnung

### DB + RPC

```sql
CREATE TABLE seasonal_events (
  id uuid primary key,
  name_i18n text,
  start_at, end_at timestamps,
  event_tier text, -- 'easy' | 'normal' | 'hard'
  minigame_id text, -- ref zu minigame
  tier_family text, -- species_type für event-exklusiv
  created_at timestamp default now()
);

CREATE TABLE event_progress (
  user_id uuid,
  event_id uuid,
  score int,
  unique(user_id, event_id)
);
```

---

## Phase 4: Soziale/Community-Features (Q1 2027)

### Clans (einfaches Modell)

- Bis 50 Mitglieder
- Leader kann Mitglieder einladen/rauswerfen
- Clan-Chat (Realtime via Broadcast)
- Wöchentliches Clan-Event (alle spielen, Score addiert sich)
- Belohnungen basierend auf gesamt-Score

### Weekly-Challenges (Global)

- Server stellt jede Woche eine Challenge: z. B. „Erreich zusammen 10M Coins"
- Progress-Bar public
- Bei Erfolg: Alle bekommen Reward (z. B. 50 kostenlose Tickets)

### Spieler-zu-Spieler-Features (erweitern)

- **Geschenke** (bereits vorhanden, erweitern): 1× pro Tag ein Tier/Item an Freund
- **Friendly Battles** (neu): Vereinfachte, asynchrone 1v1 Minispiel-Duelle
- **Multiplayer Drift/Memory** (neu): Live-Rennspiel / Memory-Duell

---

## Technische Priorität

### Muss vor Release (Nov 2026)

1. ✅ Support-Tab + Roadmap (fertil)
2. 🟡 Onboarding-Flow + Quest-System (Phase 1 + 2)
3. 🟡 Quest-RPC + UI im GameView

### Nice-to-Have (Q1 2027)

4. Saisonal-Events (Phase 3)
5. Clans + Weekly-Challenge (Phase 4)

---

## Metriken zur Überwachung

Nach Launch beobachten:

- **Neulinge**: Onboarding-Completion-Rate (Ziel: >60%), Day-1 Retention
- **Tägliche**: Quest-Completion-Rate (Ziel: >50%), Daily-Active-Users
- **Langzeit**: Monatliche Churn-Rate (Ziel: <30%), Time-to-First-Event

---

## Zusammenfassung

1. **Onboarding** macht Neulinge sicher und schnell produktiv
2. **Quests** geben tägliche Motivation + Struktur
3. **Saisonal-Events** halten Langzeitspieler engagiert
4. **Soziale Features** machen das Spiel weniger einsam

Alle vier zusammen = nachhaltiges, cooles Idle-Game für verschiedene Spielertypen.
