# Zoo-Parkour — 3D-Obby-Minispiel

## Ziel
Ein echtes 3D-Parkour-Minispiel im Roblox-/Obby-Stil als neues Minispiel neben
dem Drift-Rennen. Ein blockiges Zoo-Tier läuft automatisch über schwebende
Dschungel-Plattformen ins Ziel. Gerendert mit Three.js (echtes WebGL-3D).

## Gameplay
- **Kamera:** Third-Person hinter/über dem Tier, Blick nach vorn (−Z).
- **Steuerung:** Auto-Lauf vorwärts. 3 Spuren (links/mitte/rechts); Wischen oder
  ◀▶/A-D wechselt die Spur. Tap / Leertaste / ↑ springt.
- **Hindernisse:** Lücken (in den Abgrund), Barrieren (drüberspringen oder Spur
  wechseln), ab höheren Levels bewegliche Plattformen.
- **Tod:** Absturz in eine Lücke oder Treffer einer Barriere → Respawn am letzten
  Checkpoint. Jeder Absturz zählt wie ein „Crash" beim Drift.
- **Ziel:** Zielflagge am Ende der Strecke erreichen.
- **Sterne (gespiegelt vom Drift):** 0 Abstürze = ⭐⭐⭐, 1–2 = ⭐⭐, 3+ = ⭐.

## Level-Struktur
12 feste Level, deterministisch per Seed = Level (lernbar wie Drift). Pro Level
steigen Tempo, Streckenlänge, Lücken-/Hindernis-Dichte; bewegliche Plattformen ab
höheren Levels. Checkpoints in regelmäßigen Abständen. Level-Karten-Übersicht
analog zum Drift-Grid (gesperrt / aktuell / geschafft, Sterne, Belohnungsvorschau).

## Render-Modell (ohne Physik-Paket)
Die Strecke ist ein Raster von Kacheln entlang Z. Pro Reihe hat jede der 3 Spuren
entweder eine Plattform (mit Höhe) oder eine Lücke; Hindernisse sitzen auf Kacheln.
Kollision gitterbasiert: X rastet weich zur Spurmitte, Y nutzt simple Schwerkraft +
Sprungimpuls; Absturz, wenn über einer Lücke und Y zu tief. Geometrie aus
`BoxGeometry`/`InstancedMesh`, low-poly Deko (Kegel-Bäume), Himmel im Cream-Look.

## Architektur
| Datei | Zweck |
|---|---|
| `src/parkourCourse.js` | Reiner, deterministischer Strecken-Generator + Helfer (`MAX_LEVEL`, `buildCourse`, `levelConfig`, `starsForFalls`). Unit-testbar. |
| `src/parkourCourse.test.js` | Tests: deterministisch, lösbar, Checkpoints vorhanden. |
| `src/parkourEngine.js` | Three.js-Engine als framework-unabhängige Klasse: Canvas + Course rein, Callbacks `onProgress/onFall/onFinish` raus, inklusive `dispose()`. |
| `src/views/ParkourGameView.vue` | UI: Level-Grid, 3D-Play-Overlay, HUD, Ziel-Panel, Tutorial, i18n (de/en/ru). |
| `src/router.js` | Route `/parkour` (lazy import). |
| `src/views/GameView.vue` | Link-Karte + Quick-Action (analog Drift). |
| `src/stores/game.js` | `parkourProgress`-State, `loadParkourProgress()`, `completeParkourLevel(level, stars)`. |
| `supabase/migrations/<date>_parkour_game.sql` | `parkour_progress`-Tabelle + `_parkour_reward` + `get_parkour_progress` + `complete_parkour_level`, RLS + Grants — exakt nach Drift-Vorlage. |

Three.js wird dynamisch importiert (`await import('three')`), damit es per
Code-Splitting nur in dieser View lädt. DPR ≤ 2; alle Geometrien/Materialien/
Renderer werden beim Verlassen disposed (kein WebGL-Context-Leak).

## Belohnung (server-validiert, ökonomie-konsistent zum Drift)
Gleiche Formel wie Drift: Coins `1500 × level²`, Tickets auf Level 3/6/9/12
(1/2/3/5), Erstabschluss mit 3 Sternen +50 % Coins, Wiederholung `max(100, base/20)`.
Validierung server-seitig (Level-Lock, Sterne-Clamp) wie `complete_drift_level`.

## Tests & Verifikation
Unit-Tests für `parkourCourse.js` (Determinismus, Lösbarkeit, Checkpoints). Im
Browser-Preview: Rendern, Spurwechsel, Sprung, Absturz→Checkpoint, Ziel→Belohnung,
sauberes Dispose beim Verlassen.
