# Daily Quests — Design

## Ziel

Bestehende Spieler (Level 50+, 5+ Tage aktiv) brauchen **täglich Gründe** zum
Spielen. Raids und Grinding sind nicht genug.

**Daily Quests** sind kleine, 2–5 Minuten-Tasks mit täglichen Belohnungen:

- **Ziel:** 50–80 % der Daily-Player jeden Tag mindestens einmal öffnen
- **Wirtschaft:** Belohnungen sind klein (10–20% des täglichen aktiven Coins/Tickets), addieren sich aber
- **Loop:** Öffnen → Quest erfüllen → Reward → Fertig (keine Fetch-Quests über mehrere Tage)

## Quest-Arten

Alle resetten täglich um **14:00 UTC** (servertime, um Timezonen zu vermeiden).

### Typ A: Passiv (1–2 Min)

Spieler machen eh, Quest trackt nur:

| Quest | Bedingung | Belohnung | Häufigkeit |
|---|---|---|---|
| Tap Master | 500 Taps | 100 🪙 | Mo–Fr |
| Coin Collector | 10.000 Coins verdienen | 50 🪙 | Mo–Sa |
| Early Bird | Vor 09:00 UTC spielen | 25 🪙 + 5 🎫 | Mo–Fr |
| Feed Time | 3 Tiere füttern | 15 🪙 | täglich |

### Typ B: Aktiv (5–10 Min)

Spieler machen gezielt:

| Quest | Bedingung | Belohnung | Häufigkeit |
|---|---|---|---|
| Wordle Daily | 1 Wordle spielen | 25 🪙 + 5 🎫 | täglich |
| Memory Boom | Memory Level 5+ erreichen | 20 🪙 + 10 🎫 | täglich |
| Drift Streak | Drift: 3 Level absolvieren | 50 🪙 + 15 🎫 | täglich |
| Parkour Rush | Parkour: 5 Checkpoints | 40 🪙 + 10 🎫 | täglich |
| Boss Damage | Boss: 50.000 Damage machen | 30 🪙 + 5 🎫 | täglich |

### Typ C: Sozial (2–5 Min)

| Quest | Bedingung | Belohnung | Häufigkeit |
|---|---|---|---|
| Friend Bonus | Einem Freund 100 Coins senden | 50 🪙 | täglich |
| World Explorer | 3 Min in der Welt sein | 25 🪙 + 5 🎫 | täglich |

### Typ D: Weekend Bonus (Sa–So)

| Quest | Bedingung | Belohnung | Häufigkeit |
|---|---|---|---|
| Weekend Grind | 50.000 Coins verdienen | 200 🪙 | Sa–So |
| Double Digits | 2 Minispiele spielen | 10 🎫 | Sa–So |

## Daily Quest Hub

### UI: Quest-Panel auf GameView

Nach dem Tip-Budget, vor den Minispiele-Karten:

```
─────────────────────────────────
  📋 TÄGLICHE QUESTS
  Reset: 14:00 UTC | 8h 30min
─────────────────────────────────
  ☑ [50%] Tap Master — 500 Taps
    Progress: 227/500 (+100 🪙)
    
  ☐ [0%] Wordle Daily — 1 Wordle
    (+25 🪙 +5 🎫)
    
  ☐ [0%] Friend Bonus — 100 Coins senden
    (+50 🪙)
    
  ✓ [100%] Early Bird
    🎉 Erledigt! (+25 🪙 +5 🎫)
─────────────────────────────────
Zusammenfassung: 2/7 erledigt
```

Nutzer können:
- Durchscrollen, wenn viele Quests
- `→ TAP` auf ☐-Quests für Quick-Link zur View (z. B. "Wordle Daily" → WordleGameView)
- ✓-Quests ausblenden (Einstellung)

### Täglich belohnbar

**Nur 1× täglich behaupten:** Der `claim` Button ist aktiv, sobald die
Bedingung erfüllt ist, und gibt dann die Belohnung. Danach `✓ Erledigt bis
morgen 14:00`.

## Datenbank

### `daily_quests` (Katalog)

```sql
create table daily_quests (
  key text primary key, -- "tap_master", "wordle_daily", …
  active_mon boolean, active_tue boolean, ..., active_sun boolean,
  condition_type text, -- 'tap', 'coins', 'wordle', 'minigame', …
  condition_value int,
  reward_coins int,
  reward_tickets int,
  created_at timestamp
);
```

### `daily_quest_progress` (State pro User pro Tag)

```sql
create table daily_quest_progress (
  user_id uuid,
  date date, -- UTC, reset um 14:00
  quest_key text,
  progress int, -- aktueller Fortschritt
  claimed boolean default false, -- true → schon abgerufen
  claimed_at timestamp,
  
  primary key (user_id, date, quest_key),
  foreign key (quest_key) references daily_quests
);
```

RLS: Spieler darf nur eigene lesen.

### RPC: `claim_daily_quest(p_quest_key text)`

```sql
security definer …
```

**Prüft:**
1. Quest ist aktiv heute
2. `progress >= condition_value`
3. `claimed = false`
4. User hat `claimed_at < today 14:00`

**Dann:**
- `claimed = true, claimed_at = now()`
- `coins += reward_coins`, `tickets += reward_tickets`
- Rückgabe: `{ coins, tickets, server_now }`

**Nicht in dieser Spec:**
- Re-rolls (einen Quest pro Woche ersetzen)
- Quest-Presets (besondere Quests in Event-Wochen)

## Client

### Store (`src/stores/game.js`)

Neue Getters:
- `dailyQuests()` → Array aus DB, mit Progress
- `dailyQuestProgress(key)` → {progress, condition_value, claimed}
- `nextQuestResetAt()` → Datum 14:00 UTC morgen

Watch auf `DATE.NOW() + serverOffset` → alle Minuten Sync mit Server
(nur wenn `visibilityState === 'visible'`).

### View: `GameView.vue`

Quest-Panel zwischen `hero` + `minigames`:

```vue
<div v-if="!game.onboardingComplete" class="quests-panel">
  <div class="quest-header">
    <span>📋 Tägliche Quests</span>
    <small>Reset: {{ nextResetTime }}</small>
  </div>
  
  <div v-for="q in game.dailyQuests" :key="q.key" class="quest-row">
    <progress :value="q.progress" :max="q.condition_value" />
    <span>{{ q.title }}</span>
    <span v-if="q.claimed">✓</span>
    <button v-else-if="q.progress >= q.condition_value"
            @click="claimQuest(q.key)">Abholen</button>
  </div>
</div>
```

### Migration

`20260922_daily_quests.sql`:

1. Tabellen `daily_quests`, `daily_quest_progress`
2. 30-40 Beispiel-Quests einfügen (Typ A–D oben)
3. RLS-Policies auf `daily_quest_progress`
4. RPC `claim_daily_quest(…)` mit `security definer`
5. Indizes auf `(user_id, date)` und `(date, quest_key)`

## i18n

Neue Keys:

```
quests.title
quests.resetAt
quests.progress
quests.claim
quests.claimed
quests.completed
quests.tapMaster
quests.coinCollector
quests.earlyBird
quests.feedTime
…
```

Alle 40 Quest-Titel + Beschreibungen de/en/ru.

## Tests

| Datei | Prüft |
|---|---|
| `src/dailyQuestsSql.test.js` | Migration: `search_path`, RPC-Grants, RLS Policies |
| `src/dailyQuestsLogic.test.js` | Progress-Tracking, Reset um 14:00, Claim-Logik |

## Nicht in dieser Spec

- **Quest-Straßen:** "Mache 5 Tage Quests hintereinander" (separate Feature)
- **Saisonale Quests:** Osterhasen-Quests, etc. (kommt mit Season Pass)
- **Push-Notifikationen:** "Deine tägliche Quest wartet!" (separate Instrumentation)
