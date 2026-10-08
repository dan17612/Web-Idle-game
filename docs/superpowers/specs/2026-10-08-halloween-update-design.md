# Halloween-Update: Kürbis-Puzzle & Halloween-Deko

## Ziel

1. Ein neues Minispiel **🎃 Kürbis-Puzzle** — ein echtes Legepuzzle (Teile mit
   Nasen und Buchten) mit Halloween-Bildern, als zeitlich begrenztes Ereignis
   mit Level-Pfad wie BlockFall.
2. Die ganze App bekommt in der Halloween-Saison **Deko**: Kürbisse, Fledermäuse,
   Geister, Spinnweben, Herbstlaub. Vorgabe: **deutlich mehr Kürbisse als
   Skelette** — Totenköpfe gibt es nur vereinzelt, und Tests halten das fest.
3. Als Lockmittel eine neue, nur hier erhältliche Tierart: **🦇 Fledermaus**.

## 1. Kürbis-Puzzle

### Spielprinzip

- Ein Bild wird in `Spalten × Reihen` Teile zerschnitten. Jede innere Kante
  bekommt zufällig (aber pro Level fest) eine Nase oder Bucht, Randteile sind
  gerade. Die Teile liegen gemischt in einer **Ablage** unter dem Brett.
- Teil aus der Ablage aufs Brett ziehen. Liegt es nahe genug an seinem Platz
  (Mittelpunkt < 0,45 Zellen entfernt) und richtig gedreht, rastet es ein.
  Sonst wandert es zurück in die Ablage — kein Strafpunkt, nur Zeit.
- Ablage blättert seitenweise (◀ ▶), Filter **„Nur Rand"** für den klassischen
  Rand-zuerst-Start.
- **Vorschau** (👁 gedrückt halten) blendet das ganze Bild über das Brett.
- Vor dem Start zeigt das Brett das Bild („Merk dir das Bild!"); der erste Tipp
  startet die Uhr. Die Uhr zählt nur aktive Spielzeit (Pause/Hintergrund hält
  sie an).
- Ziehen nutzt Pointer-Events mit Pointer-Capture. Bei Touch schwebt das Teil
  etwas über dem Finger, damit man sieht, wo es landet.

### Level-Pfad (24 Level, 4 Kapitel à 6)

| Kapitel | Level | Thema | Hilfen |
|---|---|---|---|
| 1 | 1–6 | 🎃 Kürbisfeld | Geisterbild 35 % + Umrisse |
| 2 | 7–12 | 🏰 Spukschloss | Geisterbild 15 % + Umrisse |
| 3 | 13–18 | 🌲 Hexenwald | keine |
| 4 | 19–24 | 🍬 Süßes oder Saures | keine, Teile liegen **gedreht** (Tippen dreht um 90°) |

Raster (`GRIDS` in `src/halloweenPuzzle.js`, Spiegel `_hpuzzle_pieces`):

```
L1–6:   3×3  3×4  4×4  4×5  4×5  5×5
L7–12:  4×5  5×5  5×6  5×6  6×6  6×6
L13–18: 5×6  5×6  6×6  6×7  6×7  6×8
L19–24: 5×6  6×6  6×7  6×7  7×7  7×8
```

### Bilder

Jedes Level hat ein eigenes, gezeichnetes Bild (`src/halloweenScene.js`,
Canvas 2D): Himmelsverlauf je Kapitel, Sterne, Mond mit Schein, Hügel-
Silhouette, Boden, dazu Emoji-Requisiten aus einer deterministischen,
pro Level geseedeten Anordnung (`sceneLayout(level)` in der reinen Logik).
Pro Bild mindestens drei Kürbisse, höchstens ein 💀 — `src/halloweenPuzzle.test.js`
prüft das für alle 24 Level. Im Canvas nur Ein-Codepoint-Emoji
(`src/emojiSafe.test.js` scannt die neuen Dateien mit), Schrift über
`emojiFontSpec`.

### Sterne (serverseitig berechnet)

Der Client meldet nur die Spielzeit in Sekunden, der Server rechnet die Sterne
selbst aus (`_hpuzzle_stars`, Spiegel `starsForTime`):

- Sekunden pro Teil je Kapitel: 3 / 4 / 5 / 7 → `star3 = Teile × s`,
  `star2 = 2 × star3`. Fertig = ⭐, ≤ `star2` = ⭐⭐, ≤ `star3` = ⭐⭐⭐.

### Belohnung (Reward-Spiegel)

`_hpuzzle_reward` (SQL) und `puzzleReward()` (`src/halloweenPuzzle.js`):

- Coins: `1000 × L²` (Level 24 = 576 000)
- Tickets: Level 6/12/18/24 = 2/3/4/6
- Tier: Level 12 = 🦇 Fledermaus, Level 24 = 🥇 Gold-Fledermaus
- Erstabschluss mit ⭐⭐⭐: +50 % Coins; Wiederholung `max(100, coins/20)`,
  keine Tickets, kein Tier — wie Drift/Parkour/BlockFall.

### Fledermaus

`species_costs`: `bat`, „Fledermaus", 🦇, Kosten 30 Mio., Rate 120 000/s,
Seltenheit `epic`, `enabled = false`, `shop_visible = false` — taucht dadurch in
keiner Truhe, keinem Shop und keiner Zucht auf. Die Börse wertet sie als
Limited Edition (keine Beschaffbarkeit in `_market_model`), genau richtig für
ein Saison-Tier. Name in `SPECIES_NAMES` (de/en/ru).

### Server (`20261008_halloween_puzzle.sql`)

- `halloween_puzzle_progress` (highest_level 0–24, stars jsonb,
  best_times jsonb, total_finishes, last_finish_at), RLS an, nur Self-Select.
- `get_halloween_puzzle_progress()` — ungegatet.
- `complete_halloween_puzzle(p_level, p_seconds)` — `event_is_active` vor jeder
  Gutschrift, Level-Sperre, Plausibilität: mindestens 0,5 s pro Teil, und
  seit dem letzten Abschluss muss mindestens so viel Zeit vergangen sein
  (schützt die Wiederholungs-Belohnung gegen Skripte, ehrliche Spieler
  stoßen nie daran).
- `get_halloween_puzzle_leaderboard(p_limit)`, Puzzle als elfte Disziplin in
  `get_overall_leaderboard`.
- Zeitplan `halloween_puzzle` bis 2026-11-08 22:59:59 UTC mit Countdown,
  `on conflict do nothing`.

### Client

- Route `/halloween` (`HalloweenPuzzleView.vue`), Store-Aktionen
  `loadHalloweenPuzzleProgress` / `completeHalloweenPuzzle`, Getter
  `halloweenPuzzleActive`, `EVENT_KEYS.halloween`.
- Pfadknoten sind Kürbisse (gelöst = leuchtende Kürbislaterne, gesperrt =
  grauer Kürbis). Level-Karte zeigt eine Miniatur des Bildes.
- Einstiege: Halloween-Banner oben auf der Startseite, Schnellaktion,
  Ereignis-Karte, Bestenlisten-Tab „🎃 Puzzle".

## 2. Halloween-Deko

- **Saison** `1.10. – 8.11.` (lokales Datum), `src/halloween.js`. Schalter in
  Einstellungen → Darstellung („🎃 Halloween-Deko", nur in der Saison sichtbar,
  `localStorage` `zoo.halloween`). Klasse `halloween` auf `<html>`
  (`src/composables/useHalloween.js`).
- **Tokens**: `html.halloween` färbt den Hintergrund-Glow orange/lila (hell und
  dunkel), neue Tokens `--hw-orange`, `--hw-purple`, `--hw-night`.
- **Deko-Ebene** `HalloweenDecor.vue` (fest, hinter dem Inhalt, `pointer-events:
  none`): Spinnweben in zwei Ecken, fliegende Fledermäuse, ein schwebender
  Geist, fallendes Herbstlaub, Kürbisse am unteren Rand, genau ein Totenkopf.
  Zusammensetzung aus `decorItems()` — `src/halloween.test.js` prüft
  Kürbisse > Totenköpfe × 3.
- **Kleine Details**: Kürbis statt Pfote im Logo, eine an einem Faden baumelnde
  Spinne unter der Kopfleiste, drei Kürbisse sitzen auf der Navigationsleiste,
  die Zoo-Szene auf der Startseite wird zur Abenddämmerung (Mond statt Sonne,
  Kürbisse statt Blumen, eine Fledermaus).
- Animationen nur über `transform`/`opacity`; bei `prefers-reduced-motion` und
  „Animationen aus" stehen alle Deko-Elemente still.

## Tests

| Datei | Prüft |
|---|---|
| `src/halloweenPuzzle.test.js` | Raster, Sterne, Reward, Kanten passen zusammen, Spielzustand (Einrasten, Drehen, Abschluss, Uhr), Szenen: Kürbisse > Totenköpfe |
| `src/halloweenPuzzleSql.test.js` | RLS, Grants, search_path, Gating vor Auszahlung, Reward-/Sterne-/Raster-Spiegel Level für Level, elf Disziplinen, Fledermaus nicht in Truhen |
| `src/halloween.test.js` | Saisonfenster, Präferenz, Deko-Mix (mehr Kürbisse als Skelette) |
| `src/emojiSafe.test.js` | erweitert um die Puzzle-Canvas-Dateien |
