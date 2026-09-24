# Futter mit Seltenheit & Rotation

## Ziel

Futter im Shop (Tab „Futter") ist nicht mehr immer vollständig verfügbar.
Wie bei den Tieren bekommt jedes Futter eine **Seltenheit** und taucht pro
Shop-Rotation (5 Minuten, gleicher Slot und Countdown wie die Tiere) nur mit
einer seltenheitsabhängigen Chance auf. Seltene, starke Futter sind damit
etwas Besonderes.

## Daten (`food_costs`)

Neue Spalten:

| Spalte        | Typ     | Bedeutung                                            |
|---------------|---------|------------------------------------------------------|
| `rarity`      | text    | `common` · `uncommon` · `rare` · `epic` · `legendary` |
| `shop_chance` | numeric | Chance (0–1), pro Rotation im Angebot zu sein         |
| `enabled`     | boolean | `false` ⇒ nie im Angebot                              |

Startwerte:

| Futter          | Seltenheit | Chance |
|-----------------|------------|--------|
| bread, kibble   | common     | 85 %   |
| fish, steak     | uncommon   | 60 %   |
| magic_fruit, golden_treat | rare | 40 % |
| bubble_tea, dragon_feast  | epic | 22 % |
| cosmic_cookie   | legendary  | 10 %   |

Im Schnitt sind ≈ 4 von 9 Futtern gleichzeitig im Angebot.

## Auswahl (server-autoritativ)

`_food_roll(food, slot)` = deterministischer Wurf in `[0, 1)` aus
`md5('food:' || food || ':' || epoch(slot))` — für alle Spieler gleich, ohne
zusätzliche Tabelle. `_available_foods(slot)` liefert alle aktivierten Futter
mit `roll < shop_chance`. Ist die Liste leer, ist das günstigste aktivierte
Futter im Angebot (niemand steht ganz ohne Futter da).

- `get_shop()` liefert zusätzlich `food_available` (Array der Keys).
- `feed_pet(p_food)` prüft vor dem Abbuchen, ob das Futter im aktuellen Slot
  (`_current_slot()`) im Angebot ist, sonst `food not available`.
- Hilfsfunktionen sind intern: `revoke execute … from anon, authenticated, public`.

## Client (`ShopView.vue`, `src/foodShop.js`)

- Futter-Karten bekommen den Seltenheits-Streifen wie Tierkarten.
- Verfügbare Futter zuerst (nach Preis), danach nicht verfügbare ausgegraut
  mit „Nicht im Angebot".
- Countdown „Neues Futter in mm:ss" (gleicher `rotatesAt` wie Tiere).
- Fehler `food not available` → übersetzter Toast + Shop neu laden.
