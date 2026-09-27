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
- RPCs: `start_incubation`, `claim_hatched`, `get_incubation_status` —
  erweitert für zwei Brutplätze, siehe Nachtrag.

## Nachtrag: Zwei Brutplätze

Die Eier-Maschine brütet **zwei Eier gleichzeitig**.

### Datenbank (Migration `20260927_eier_zwei_brutplaetze.sql`)

- `egg_incubations` bekommt `slot smallint not null default 1`
  (`check (slot between 1 and 2)`), Primärschlüssel wird
  `(user_id, slot)`. Laufende Bruten landen in Platz 1.
- `start_incubation(p_egg_id)` sperrt die Profilzeile (`for update`),
  sucht den ersten freien Platz (1..2) und wirft `incubator slots are busy`,
  wenn beide belegt sind. Trade-Sperre und Zucht-Ergebnis
  (`bred_species`/`bred_minutes`) bleiben unverändert. Antwort enthält `slot`.
- `get_incubation_status()` liefert `slots` (sortiert nach Platz, je
  `slot, egg_type, started_at, ready_at, ready_now`), `max_slots = 2`,
  `server_now` — und weiterhin die alten Top-Level-Felder (`active`,
  `egg_type`, `ready_at`, …) für den zuerst fertigen Platz, damit ältere
  App-Versionen (gebündelte Android-Builds) weiter funktionieren.
- `claim_hatched(p_slot int default null)` ersetzt `claim_hatched()`:
  ohne Platz wird der zuerst fertige Platz abgeholt (alte Clients), mit
  Platz genau dieser. Antwort enthält `slot`.
- Alle drei RPCs: `security definer set search_path = public`, Grant nur
  `authenticated`, `revoke … from anon, public`.

### Client

- `src/eggSlots.js` (rein, getestet): `EGG_SLOTS = 2` (Spiegel der
  SQL-Konstante), `normalizeIncubation()` macht aus altem wie neuem Format
  eine Platzliste, `slotRemainingMs()`, `slotProgress()`, `freeSlots()`.
- Store: `incubation` hält den normalisierten Stand,
  `claimHatched(slot)` übergibt `p_slot`.
- `EggMachine.vue`: zwei Brutplatz-Zeilen (leer · brütet · fertig mit
  eigenem „Abholen"), Kopf zeigt „Brutplätze x/2". Im geöffneten Zustand
  startet „Ausbrüten starten" ein Ei im nächsten freien Platz; sind beide
  Plätze frei und vom gewählten Ei mindestens zwei da, gibt es zusätzlich
  „2× ausbrüten".
