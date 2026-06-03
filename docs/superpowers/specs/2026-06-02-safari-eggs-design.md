# Safari-Eier System — Design Spec

**Datum:** 2026-06-02
**Branch:** dev
**Scope:** Eier-System (Teilfeature 1 von 3 — Nav-Umbau und Shop-Seltenheit folgen in eigenen Specs)

## Ziel

Neues Eier-Spielsystem einführen:
- Erstes Ei: **Safari-Ei** mit 5 neuen Safari-Spezies in 5 Raritäts-Stufen
- Architektur erweiterbar für weitere Eier (Jungle, Arctic, …)
- Eier sind handelbar (Trade-System-Integration)
- Eier brüten 1 Stunde aus, kein Speed-up, kein Abbruch
- Eier erscheinen im Shop wie normale Tiere (gewichteter Rotations-Pool)

## Nicht im Scope

- Nav-Umbau (Trade ↔ Friends ↔ Ideen) — eigene Spec
- Shop-Seltenheits-Anzeige für **alle** bestehenden Tiere — eigene Spec, baut auf der `rarity`-Spalte aus diesem Spec auf
- Weitere Eier-Typen (Jungle/Arctic/…) — sind später per DB-Insert ohne Code-Änderung möglich

## Spielmechanik (User-Flow)

1. **Erwerb:** Safari-Ei erscheint zufällig in der Shop-Rotation (eigenes Gewicht im Pool, z.B. 30). Wenn gespawnt → Karte im Shop-Grid → Klick „Kaufen" für 500.000.000 🪙 → Ei landet in `player_eggs`.
2. **Brut:** Auf der Game-View unter der Fusion-Maschine gibt es die neue **Eier-Maschine**. Spieler wählt ein Ei aus dem Inventar → „Ausbrüten starten" → 1h-Timer läuft. Nur **1 Brutslot** pro Spieler.
3. **Schlüpfen:** Nach Ablauf des Timers erscheint Notification + Animation auf der Game-View. Klick „Abholen" → Tier wird ins Inventar gelegt (Tier `normal`), Modal mit Rarität-Badge zeigt Ergebnis.
4. **Handel:** Eier (unbebrütete) sind im Trade-View handelbar wie Tiere. Sobald ein Ei in der Brut-Maschine ist, ist es nicht mehr im Inventar und nicht handelbar.

## Safari-Tiere (initial)

Alle 5 mit `shop_visible=false` und `enabled=false` — also **nicht** im normalen Shop oder in der Truhe, ausschließlich per Safari-Ei.

| Rarität | Species | Emoji | Drop-% | Rate (🪙/s) |
|---|---|---|---|---|
| common | elephant | 🐘 | 60% | 100.000 |
| uncommon | giraffe | 🦒 | 25% | 250.000 |
| rare | zebra | 🦓 | 10% | 500.000 |
| epic | rhino | 🦏 | 4% | 900.000 |
| legendary | hippo | 🦛 | 1% | 1.500.000 |

Alle Werte (Drop-Gewichte, Raten, Preis) per DB anpassbar — keine Hardcode-Werte im Frontend.

## Datenbank

### Neue Tabellen

```sql
-- Katalog aller Eier-Typen
create table public.egg_types (
  egg_type    text primary key,                       -- 'safari'
  name        text not null,                          -- 'Safari-Ei'
  emoji       text not null default '🥚',
  price_coins bigint not null,                        -- 500000000
  enabled     boolean not null default true,
  shop_visible boolean not null default true,         -- ob im Shop kaufbar
  shop_weight int not null default 30,                -- Rotations-Gewicht im Shop-Pool
  shop_stock_qty int not null default 1,              -- Stück pro Rotation wenn gezogen
  incubation_minutes int not null default 60
);

-- Drop-Pool: welche Spezies kommen aus welchem Ei, mit welchem Gewicht
create table public.egg_drop_pool (
  egg_type  text references public.egg_types(egg_type) on delete cascade,
  species   text references public.species_costs(species) on delete cascade,
  weight    int not null check (weight > 0),
  primary key (egg_type, species)
);

-- Spieler-Inventar: alle Eier die jemand besitzt (unbebrütet)
create table public.player_eggs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users on delete cascade,
  egg_type    text not null references public.egg_types(egg_type),
  acquired_at timestamptz not null default now()
);
create index on public.player_eggs (owner_id);

-- Aktive Brut: max 1 pro Spieler (UNIQUE auf user_id)
create table public.egg_incubations (
  user_id         uuid primary key references auth.users on delete cascade,
  egg_type        text not null references public.egg_types(egg_type),
  started_at      timestamptz not null default now(),
  ready_at        timestamptz not null,
  hatched_species text not null                       -- gewürfelt beim Start
);
```

### Änderung an `species_costs`

```sql
alter table public.species_costs
  add column rarity text not null default 'common'
  check (rarity in ('common','uncommon','rare','epic','legendary'));
```

Initial-Raritäten für bestehende Spezies werden in derselben Migration gesetzt (per UPDATE, von dir später beliebig anpassbar):

| Species | Rarity |
|---|---|
| chick, chicken | common |
| rabbit, pig, sheep, cow | uncommon |
| horse, scorpion | rare |
| panda, tiger, lion | epic |
| peacock, dragon | legendary |
| unicorn, phoenix, bonedragon, worlddragon | legendary |

### Neue Spezies-Einträge

Migration fügt 5 Safari-Spezies in `species_costs` ein (alle `enabled=false`, `shop_visible=false`):

| species | name | emoji | rate | rarity |
|---|---|---|---|---|
| elephant | Elefant | 🐘 | 100000 | common |
| giraffe | Giraffe | 🦒 | 250000 | uncommon |
| zebra | Zebra | 🦓 | 500000 | rare |
| rhino | Nashorn | 🦏 | 900000 | epic |
| hippo | Nilpferd | 🦛 | 1500000 | legendary |

Cost = 0 (nicht direkt kaufbar). Weight in `species_costs` egal (da nicht im normalen Pool).

### Initialer Egg-Type + Pool

```sql
insert into public.egg_types (egg_type, name, emoji, price_coins, shop_weight)
values ('safari', 'Safari-Ei', '🥚', 500000000, 30);

insert into public.egg_drop_pool (egg_type, species, weight) values
  ('safari','elephant',60),
  ('safari','giraffe',25),
  ('safari','zebra',10),
  ('safari','rhino',4),
  ('safari','hippo',1);
```

### RLS

- `player_eggs`: SELECT/INSERT/DELETE nur für `owner_id = auth.uid()`
- `egg_incubations`: SELECT nur für `user_id = auth.uid()`, INSERT/UPDATE/DELETE nur über RPCs (security definer)
- `egg_types`, `egg_drop_pool`: SELECT für alle authentifizierten User
- Realtime-Replikation aktiviert auf `egg_incubations` und `player_eggs` (für Tab-Sync)

## RPCs

```sql
-- Ei kaufen (Shop)
buy_egg(p_egg_type text, p_qty int default 1) returns jsonb
-- Prüft enabled/shop_visible, ausreichendes Shop-Stock (aus Rotation),
-- ausreichende Coins, zieht ab, fügt p_qty Zeilen in player_eggs ein.
-- Reduziert das Rotations-Stock analog buy_animal.
-- Return: { coins, egg_ids: uuid[] }

-- Brut starten (Item aus Inventar → Incubator)
start_incubation(p_egg_id uuid) returns jsonb
-- Prüft: Ei gehört Spieler, NICHT in offenem Trade gelistet, kein aktiver Slot.
-- Würfelt hatched_species sofort per gewichtetem Roll aus egg_drop_pool.
-- Löscht player_eggs-Zeile, erzeugt egg_incubations(ready_at = now() + incubation_minutes).
-- Return: { ready_at, egg_type, incubation_minutes }

-- Status für UI (für GameView Egg-Maschine + Polling)
get_incubation_status() returns jsonb
-- Return: { active: bool, egg_type, started_at, ready_at, ready_now: bool }

-- Geschlüpftes Tier abholen
claim_hatched() returns jsonb
-- Prüft: incubation existiert + now() >= ready_at.
-- Erzeugt animals(owner_id, species=hatched_species, tier='normal').
-- Löscht egg_incubations-Zeile.
-- Return: { species, animal_id, rarity }
```

### Shop-Rotation: `get_shop` Erweiterung

`get_shop` RPC zieht nicht mehr nur aus `species_costs`, sondern aus kombiniertem Pool `species_costs ∪ egg_types` (jeweils `enabled=true`, `shop_visible=true`, `weight > 0` bzw. `shop_weight > 0`). Pro Rotation wird gewichtet zufällig ausgewählt, was im Shop landet. Stock-Werte für Eier kommen analog zu Tieren.

Response-Erweiterung:
```json
{
  "stock": { "elephant": 0, "tiger": 1, ... },
  "egg_stock": { "safari": 1 },
  "species_meta": { ... },
  "egg_meta": {
    "safari": {
      "price": 500000000,
      "incubation_minutes": 60,
      "drops": [
        { "species": "elephant", "weight": 60, "rarity": "common" },
        ...
      ]
    }
  },
  ...
}
```

### Trade-Integration

`propose_trade` bekommt 3 neue Parameter:
- `p_requester_eggs uuid[] default '{}'` — Ei-IDs aus `player_eggs` des Anfragenden
- `p_addressee_eggs uuid[] default '{}'` — Ei-IDs aus `player_eggs` des Adressaten (nur direct trades)
- `p_wanted_eggs jsonb default '[]'` — für public trades: `[{ "egg_type": "safari", "qty": 1 }]`

Validierung:
- Ei-IDs müssen dem jeweiligen Spieler gehören.
- Ei darf nicht in `egg_incubations` sein (also nicht in Brut).
- Ei darf nicht bereits in einem anderen offenen Trade liegen.

Tabelle `trade_eggs` zum Verknüpfen analog `trade_animals`:
```sql
create table public.trade_eggs (
  trade_id   uuid not null references public.trades(id) on delete cascade,
  egg_id     uuid not null references public.player_eggs(id) on delete cascade,
  side       text not null check (side in ('requester','addressee')),
  primary key (trade_id, egg_id)
);
```

`accept_trade` / `accept_public_trade` transferieren `player_eggs.owner_id` bei den jeweiligen Eiern (analog zur Tier-Übertragung).

`trades_view` bekommt neue Spalten `requester_egg_details` und `addressee_egg_details` (JSON-Arrays mit `{ egg_id, egg_type, emoji, name }`).

## Frontend

### Neue Komponente `EggMachine.vue` (auf GameView, unter Fusion-Maschine)

Drei Zustände:

1. **Leer:** „Wähle ein Ei zum Ausbrüten" + Ei-Picker (gruppiert nach `egg_type` aus `player_eggs`) + Button „Ausbrüten starten".
2. **Brütet:** Fortschrittsbalken + Live-Countdown (clientside Sekunden, server-synced über `started_at`/`ready_at`). Nicht abbrechbar.
3. **Fertig:** Notification-Badge + Button „Abholen" → öffnet Hatch-Modal mit Animation (analog zur bestehenden Truhen-Animation in `ShopView.vue`).

Datenquelle: `get_incubation_status` beim Mount + Realtime-Subscription auf `egg_incubations` (für Multi-Tab-Sync). Lokaler Timer für Sekunden-Countdown.

### Neuer Pinia-Store-Bereich oder Erweiterung von `useGameStore`

- `playerEggs` reactive ref (geladen via `supabase.from('player_eggs').select`)
- `incubation` reactive object (mit `egg_type`, `ready_at`, `ready_now`)
- Methoden `buyEgg`, `startIncubation`, `claimHatched`
- Realtime-Subscriptions für `player_eggs` und `egg_incubations` (in `game.load()` oder Auth-Init-Flow)

### Shop-View (`ShopView.vue`)

- Im `speciesList`-Computed wird auch `egg_meta` durchlaufen, sodass Eier im selben `<div class="grid">` als Karten erscheinen.
- Neue CSS-Klasse `egg-card` mit lila-goldenem Ribbon „✨ EI ✨" und Mini-Drop-Anzeige (z.B. `60% 🐘 · 25% 🦒 · 10% 🦓 · 4% 🦏 · 1% 🦛`).
- Button „Kaufen" ruft `game.buyEgg('safari')` auf.

### Trade-View (`TradeView.vue`)

- Bestehende Tier-Picker bekommen analoge **Ei-Picker** als zusätzliche Sektion in beiden Sides (mine/theirs/publicWanted).
- Eier werden als Chips mit ihrem Emoji angezeigt.
- `propose_trade`-Call bekommt die drei neuen Parameter.

### Inventar-View (`InventoryView.vue`) — kleines Add

- Neuer Abschnitt „🥚 Eier" oberhalb oder unterhalb der Tier-Liste, zeigt alle Items aus `player_eggs` gruppiert.

### i18n

Neuer Namespace `eggs.*` in `src/i18n.js` mit Schlüsseln:
- `eggs.machineTitle`, `eggs.empty`, `eggs.brewing`, `eggs.ready`, `eggs.claim`
- `eggs.hatched`, `eggs.startConfirm`, `eggs.noEggs`
- `eggs.rarity.common/uncommon/rare/epic/legendary`
- `eggs.shopCard.title`, `eggs.shopCard.subtitle`, `eggs.shopCard.dropChances`

Alle Strings de/en/ru, echte Umlaute (ä/ö/ü/ß), keine ae/oe/ue/ss-Transliteration.

## Migration-Plan (eine Datei)

`supabase/migrations/20260603_safari_eggs.sql` enthält:

1. `alter table species_costs add column rarity …`
2. UPDATE für Initial-Raritäten der bestehenden Spezies
3. INSERT der 5 Safari-Spezies in `species_costs`
4. CREATE TABLE `egg_types`, `egg_drop_pool`, `player_eggs`, `egg_incubations`, `trade_eggs`
5. RLS-Policies
6. INSERT für `egg_types.safari` + `egg_drop_pool`-Zeilen
7. CREATE OR REPLACE der RPCs `buy_egg`, `start_incubation`, `get_incubation_status`, `claim_hatched`
8. CREATE OR REPLACE von `get_shop` (Erweiterung um Eier)
9. CREATE OR REPLACE von `propose_trade`, `accept_trade`, `accept_public_trade` (Erweiterung um Eier)
10. CREATE OR REPLACE der `trades_view` (mit Ei-Details)
11. Realtime publication-Updates

## Testing

- Smoke-Tests im Browser-Preview:
  1. Shop laden → Egg-Karte erscheint (eventuell mehrere Rotationen abwarten oder admin_force_rotation)
  2. Egg kaufen → erscheint in Inventar
  3. Brut starten → Timer läuft, GameView zeigt Maschine im Brüt-Zustand
  4. Timer manuell auf Server abkürzen (`update egg_incubations set ready_at = now()`) → Maschine zeigt „Fertig"
  5. Abholen → Modal zeigt Tier mit Rarität-Badge, Tier landet im Inventar
  6. Trade: Ei in Direct-Trade einbauen, akzeptieren, Owner-Wechsel verifizieren
  7. Trade-Edge-Case: Ei in Brut → darf nicht im Trade landen (Fehler)

## Offene Punkte für Implementierungs-Plan

- Genaue Stelle in GameView, wo die Egg-Maschine eingehängt wird (unter Fusion-Maschine, exakte Reihenfolge im Template)
- Exakter Animations-Stil im Hatch-Modal (Wiederverwendung der Truhen-Animation oder neue)
- Trade-Tabelle: passt das bestehende `trade_animals`-Pattern 1:1 auf `trade_eggs`? (zur Implementierungszeit kurz prüfen)
