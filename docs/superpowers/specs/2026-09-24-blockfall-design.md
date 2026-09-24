# BlockFall — Design

## Ziel

Ein Fallende-Blöcke-Puzzle als neues Ereignis mit **Level-Pfad**. Der Name ist
bewusst „BlockFall" — die bekannte Marke ist geschützt und taucht weder im Code
noch in der Oberfläche auf.

Nebenbei im selben Zweig (eigene Commits):

- Tutorial für neue Spieler: Tap-Feld repariert (Sprechblase lag hinter der
  hervorgehobenen Szene, Tap-Knopf wurde abgedunkelt, Blasen waren wegen einer
  `transform`-Animation um eine halbe Breite verschoben, Schritt 0 konnte nach
  Geschenk auf einem anderen Gerät hängen bleiben) + „Tutorial überspringen".
- Bestenliste: Die alten Einzel-Listen (Pro Sekunde, Münzen, Memory, Wordle)
  kommen als Tabs neben „Gesamt" zurück, dazu ein BlockFall-Tab.

## Spielregeln

- Spielfeld 10 × 20 (+ 2 unsichtbare Spawn-Reihen), sieben Tetromino-Formen,
  7er-Beutel als Zufall, Geister-Vorschau, Halten (1× pro Stein),
  3 Steine Vorschau, SRS-Drehung mit Wandsprüngen, 500 ms Lock-Delay
  (max. 15 Resets).
- **Level-Ziel:** eine Anzahl Reihen abräumen, bevor das Feld überläuft.
- **Punkte** (nur Reihen, keine Fallpunkte — sonst bestimmt das Tempo die
  Sterne): 1/2/3/4 Reihen = 100/300/500/800, Kombo-Bonus 50 × Kombo-Stufe.
- **Sterne:** Ziel erreicht = ⭐, ab `ziel × 130` Punkten ⭐⭐, ab
  `ziel × 165` ⭐⭐⭐ — drei Sterne verlangen also Mehrfach-Reihen oder Kombos.

## Level-Pfad (30 Level, 5 Kapitel à 6)

| Kapitel | Level | Thema |
|---|---|---|
| 1 | 1–6 | 🌿 Wiese |
| 2 | 7–12 | 🏜️ Wüste |
| 3 | 13–18 | ❄️ Eisland |
| 4 | 19–24 | 🌋 Vulkan |
| 5 | 25–30 | 🌌 Sternenhimmel |

Formeln (`src/blockfall.js`, `levelConfig`):

- Ziel-Reihen: `4 + L` (5 … 34)
- Fallgeschwindigkeit: `max(100, round(850 × 0.93^(L−1)))` ms pro Reihe
- Müll-Reihen am Start: ab Level 4 `min(9, floor((L−1)/3))`, je eine Lücke

Die Oberfläche zeigt einen geschwungenen Pfad (SVG hinter den Knoten) pro
Kapitel; ein Tipp auf einen Knoten öffnet die Level-Karte mit Ziel, Tempo,
Müll, Sterngrenzen und Belohnung.

## Belohnung (Reward-Spiegel)

`_blockfall_reward` in SQL und `blockfallReward()` in `src/blockfall.js`:

- Coins: `800 × L²` (Level 30 = 720 000)
- Tickets: Level 5/10/15/20/25/30 = 1/2/2/3/3/5
- Erstabschluss mit ⭐⭐⭐: +50 % Coins; Wiederholung: `max(100, coins/20)`,
  keine Tickets — identisch zu Drift/Parkour.

`src/blockfallSql.test.js` liest die Formel aus der Migration und vergleicht
sie Level für Level mit dem JS-Spiegel.

## Server (`20260924_blockfall.sql`)

- `blockfall_progress` (highest_level 0–30, stars jsonb, total_finishes,
  last_finish_at), RLS an, nur Self-Select.
- `get_blockfall_progress()` — ungegatet, damit Sterne sichtbar bleiben.
- `complete_blockfall_level(p_level, p_stars)` — `event_is_active` vor jeder
  Gutschrift, Level-Sperre, Mindestabstand 5 s zwischen zwei Abschlüssen
  (Schutz gegen Skript-Farmen der Wiederholungs-Belohnung).
- `get_blockfall_leaderboard(p_limit)` und BlockFall als zehnte Disziplin in
  `get_overall_leaderboard`.
- Zeitplan: `blockfall_game` läuft bis 2026-10-24 22:00 UTC (Countdown an).

## Client

- Route `/blockfall` (`BlockFallView.vue`), Kachel in den Schnellaktionen und
  Ereignis-Karte in `GameView`.
- Engine ist reine Logik (`BlockFallGame`), gezeichnet wird per Canvas 2D —
  kein Three.js nötig. Spiel als Teleport-Overlay, `touch-action: none`.
- Steuerung: Knöpfe mit Auto-Repeat (◀ ▼ ▶ ⟳ ⤓, Halten-Feld), Gesten auf dem
  Feld (Tippen = drehen, Ziehen = verschieben, schneller Wisch nach unten =
  fallen lassen), Tastatur (Pfeile, Leertaste, Z/X, C, P).
- Pausiert automatisch, wenn die App in den Hintergrund geht.
