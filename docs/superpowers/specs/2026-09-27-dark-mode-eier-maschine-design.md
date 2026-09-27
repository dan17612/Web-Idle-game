# Dark Mode im Discord-Look & Eier-Maschine im Maschinen-Design

## Ziel

1. Die App bekommt ein **dunkles Farbschema**, das sich an Discords
   Dark-Theme anlehnt (Graustufen `#313338` / `#2b2d31` / `#1e1f22`, helle
   Texte `#f2f3f5` / `#dbdee1`, gedämpftes `#949ba4`, Blurple `#5865f2`).
   Gold, Grün, Pink & Co. bleiben — sie sind die Marke des Spiels.
2. Die **Eier-Maschine** sieht aus wie Crafter- und Fusions-Maschine:
   Kopfzeile mit Titel + Öffnen/Schließen-Knopf, Hinweistext, gestrichelte
   Vorschau-Kachel, laufender Vorgang als Fortschrittszeile mit „Abholen",
   geöffnet die Slot-Anzeige (Eingang · Maschine · Ergebnis) plus
   Auswahlraster und breiter Start-Knopf.

## Farbschema

- Einstellung unter **Einstellungen → Darstellung → Farbschema**:
  `System` (Standard) · `Hell` · `Dunkel`. Gespeichert in `localStorage`
  (`zoo.theme`), rein kosmetisch, kein Server-Zustand.
- `src/theme.js` = reine Logik (`normalizeThemePref`, `resolveTheme`,
  Konstanten). `src/composables/useTheme.js` = DOM-Anbindung: Klasse
  `app-dark` auf `<html>`, `color-scheme`, `<meta name="theme-color">`,
  folgt bei `System` live `prefers-color-scheme`.
- `index.html` setzt die Klasse per Inline-Script **vor dem ersten Paint**
  (kein heller Blitz). Key, Klasse und Farbe sind Spiegel von `theme.js`
  (Test in `src/theme.test.js`).
- PrimeVue: `darkModeSelector: '.app-dark'`; die Aura-Surface-Skala wird in
  `html.app-dark` auf Discord-Grau umgebogen (Inputs = `#1e1f22`).

### Tokens

Alle Farben kommen weiter aus `src/styles.css`. Der Block `html.app-dark`
überschreibt die bestehenden Tokens und ergänzt neue, die auch im Hell-Modus
existieren (gleicher Wert wie bisher):

| Token | Zweck |
|---|---|
| `--accent-shade` | harter Bottom-Shadow der Gold-Buttons (bleibt dunkel, während `--accent-deep` als Textfarbe im Dunkel heller wird) |
| `--success-ink`, `--info-ink` | grüne / blaue Textfarben auf Karten |
| `--mix-base` | Basis für `color-mix`-Tönungen (Stufen-Kacheln) statt `#fff` |
| `--overlay`, `--overlay-strong` | Modal-/Tutorial-Abdunkelung |
| `--shadow-float`, `--shadow-pop`, `--shadow-menu` | Schatten, im Dunkel schwarz statt braun |
| `--bg-glow-1/2`, `--topbar-line` | Hintergrund-Glow und Topbar-Linie |

Wo Views eigene helle Flächen haben (Pfad-Kapitel, HUDs, Belohnungs-Chips,
Daily-Reward, Welt-HUD, Memory-Stufenkarten), bekommen sie am Ende ihres
Scoped-Styles Overrides der Form `.app-dark .klasse { … }`. Spiel-Welten
(Zoo-Szene, 3D-Parkour/-Welt, Drift-Strecke) bleiben bunt; nur BlockFall
tönt das Spielbrett im Dunkel passend ab.

## Eier-Maschine

- Gleiche Klassen/Optik wie die Maschinen in `GameView` (`fusion-toggle`,
  `fusion-preview`, `craft-job`, `fusion-machine`, `fm-slot`, `fm-core`,
  `fm-species-grid`, `fm-sp-btn`), als Scoped-Kopie in `EggMachine.vue`.
- Zustände:
  - **Leer**: Vorschau „Wähle ein Ei zum Ausbrüten" (bzw. „keine Eier").
  - **Brütet**: Fortschrittszeile (Ei-Emoji wackelt, Countdown auf
    Serverzeit `Date.now() + serverOffset`), „Abholen" deaktiviert.
  - **Fertig**: Zeile grün pulsierend, 🐣, „Abholen" aktiv → Schlüpf-Modal.
  - **Geöffnet**: Slot „Ei" (gewähltes Ei + Brutdauer) · 🐣-Maschine ·
    Slot „Ergebnis" (❓ Überraschung), darunter „Deine Eier" (gruppiert mit
    Anzahl) und „Ausbrüten starten".
- Platzierung: direkt unter der Fusions-Maschine (wie ursprünglich geplant),
  vor der „Ereignisse"-Liste.
- Keine RPC-/SQL-Änderung: weiter `start_incubation`, `claim_hatched`,
  `get_incubation_status`.
