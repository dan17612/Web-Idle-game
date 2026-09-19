# Event-Hub und Emoji-Darstellung — Design

## Ziel

Drei zusammenhängende Baustellen auf der Startseite:

1. **Emoji brechen auf Windows** — einzelne werden nicht angezeigt, andere
   erscheinen als mehrere Glyphen nebeneinander. Auf Android ist alles korrekt.
2. **Die Ereignis-Karten sind eine ungeordnete Liste** ohne Überschrift, und
   beendete Ereignisse nehmen genauso viel Platz ein wie laufende.
3. **Drift und Parkour lassen sich nicht beenden** — anders als Memory hängen
   sie an keinem Zeitplan, weder im Client noch serverseitig.

Zwei weitere Wünsche (Gesamt-Rangliste über alle Ereignisse, Zucht-Ereignis)
sind bewusst **nicht** Teil dieser Spec und bekommen eigene.

## 1. Emoji-Darstellung

### Ursache

Der Fehler liegt nicht an fehlender Windows-Unterstützung. Eine Messung über
alle 188 im Projekt verwendeten Emoji (Canvas-Signatur gegen `U+10FFFD`
verglichen) zeigt auf Windows 11 Build 26200 **kein einziges fehlendes Glyph** —
auch `🐦‍🔥`, `🧑‍🚀`, `🦣` und `🪙` rendern als einzelnes farbiges Zeichen.

Die kaputten Emoji stehen nicht im DOM, sondern werden **in Canvas-Texturen
gezeichnet**, und zwar mit einer Font-Kette ganz ohne Emoji-Font:

| Stelle | `ctx.font` | Was dort gezeichnet wird |
|---|---|---|
| `worldEngine.js` `_emojiMaterial` | `…px serif` | Alle Welt-Sprites: Tiere, Deko, Münzen, Emotes, Leine, Avatare |
| `worldEngine.js` `_textSprite` | `"Baloo 2", "Nunito", sans-serif` | Schilder und Namensschilder |
| `DriftGameView.vue` (3×) | `…px sans-serif` | Ziellinie, Streckendeko, Crash-Effekt |

Im DOM ergänzt der Browser automatisch Segoe UI Emoji. Im Canvas ist dieser
Fallback auf Windows löchrig: `serif` löst zu Times New Roman auf, und für
Sequenzen aus mehreren Codepoints greift das Shaping dann nicht mehr — die
Sequenz zerfällt in ihre Bestandteile. Genau das ist „mehrere auf einmal".

### Lösung

**Neu: `src/emojiFont.js`** — reines Logikmodul, zwei Exporte:

- `EMOJI_FONT` — die Fallback-Kette
  `'"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif'`
- `emojiFontSpec(px, { weight, family })` — baut einen kompletten
  `ctx.font`-String und hängt `EMOJI_FONT` immer hinten an.

Eingesetzt an allen vier Canvas-Stellen. `_textSprite` behält `"Baloo 2"` vorn,
bekommt die Emoji-Kette aber angehängt, weil Benutzernamen Emoji enthalten
dürfen.

**Mehr-Codepoint-Emoji aus den Canvas-Pfaden entfernen.** Die Font-Kette
repariert den Fallback, aber Sequenzen bleiben das fragilste Konstrukt — auf
älteren Windows-Ständen zerfallen sie weiterhin. In Canvas-Pfaden daher nur
noch Einzel-Codepoint-Emoji:

| Ort | Vorher | Nachher | Grund |
|---|---|---|---|
| `world.js` `EMOTES` | `❤️` (2 CP) | `💖` (1 CP) | Emote wird als Sprite gezeichnet |
| `worldEngine.js` Shop-Schild | `🛍️` (2 CP) | `🛒` (1 CP) | Schild ist eine Textur |
| `species_costs.phoenix` | `🐦‍🔥` (3 CP) | `🦅` (1 CP) | Tier-Emoji werden Welt-Sprites |

Im DOM bleiben Sequenzen erlaubt — dort funktionieren sie. Die Biom-Deko des
Boss-Pfads (`⛰️ ❄️ ☀️ 🎋`) wird deshalb **nicht** angefasst.

### Emoji-Diät (DOM)

Nur dort, wo Emoji reine Dekoration sind und sich häufen — der Boss-Bereich hat
aktuell 70 (Boss-Pfad) bzw. 51 (Endless) Vorkommen:

- `BossFightView.vue`: `👑` aus dem Titel (die Karte, die dorthin führt, trägt
  es bereits).
- `EndlessBossView.vue`: `🏆` 7×, `🎁` 7×, `⏱️`/`⏳`/`🕒` parallel — pro
  UI-Element höchstens ein Emoji, wiederholte Zustands-Icons werden PrimeVue
  `pi pi-*`.
- `BossFight.vue`: `👑` 7× → einmal am Boss-Namen.

Biom-Deko, Tier-Emoji und Währungs-Icons bleiben: Das ist Inhalt, keine Zier.

### Regressionstest

`src/emojiSafe.test.js` scannt `worldEngine.js`, `world.js` und
`DriftGameView.vue` und schlägt fehl, sobald dort ein Emoji mit mehr als einem
Codepoint auftaucht oder ein `ctx.font` ohne `EMOJI_FONT` gesetzt wird.

## 2. Event-Hub auf der Startseite

Die Ereignis-Karten am Seitenende bekommen eine Überschrift **„Ereignisse"** und
werden in zwei Gruppen geteilt:

```
Ereignisse
├── [aktive Karten, offen untereinander]
└── Beendete Ereignisse (n)  ›        ← zugeklappt, per Klick auf
    └── [beendete Karten]                aufklappen
```

Unter die Überschrift wandern alle Feature-Karten: Eier-Maschine, Boss-Kampf,
Memory, Drift, Parkour, Wordle und **Zoo-Welt** — letztere steht bisher weit
oben und wird nach unten verschoben.

Die Zuordnung „aktiv/beendet" kommt aus dem Zeitplan. Karten ohne Zeitplan
(Eier-Maschine) gelten immer als aktiv. Der Klappzustand ist reine Anzeige und
wird nicht persistiert — beendete Ereignisse starten zugeklappt.

Beendete Karten verlieren ihr `router-link` (wie Memory es heute schon macht)
und zeigen `⏰ Ereignis beendet` statt des Countdowns.

## 3. Drift und Parkour beendbar machen

### Zeitplan

`event_schedule` bekommt vier Einträge; `drift_game` und `parkour_game` sind
beendet, die anderen beiden laufen und sind nur vorbereitet:

| key | ends_at | aktiv |
|---|---|---|
| `drift_game` | 2026-09-19 | nein |
| `parkour_game` | 2026-09-19 | nein |
| `wordle_game` | `null` | ja |
| `world_lobby` | `null` | ja |

Die Einträge sind bereits in der Datenbank gesetzt; die Migration enthält
dieselbe Anweisung idempotent (`on conflict do update`), damit ein frischer
Aufbau denselben Stand erreicht.

### Server-Gating

`complete_drift_level` und `complete_parkour_level` prüfen künftig
`event_is_active('drift_game')` bzw. `('parkour_game')` und werfen
`event ended`, exakt wie `complete_boss_stage` es tut. Ohne diesen Schritt
zahlt der Server weiter Belohnungen aus, auch wenn der Client die Karte
zuklappt — der Zeitplan wäre reine Optik.

`get_drift_progress` und `get_parkour_progress` bleiben offen, damit Spieler
ihre erreichten Sterne weiterhin sehen.

### Client

Der Store bekommt einen generischen Helfer statt weiterer Getter-Tripel:

```js
eventInfo(key) → { active, endsAt, showCountdown, ended }
```

Die vorhandenen `memoryActive`/`memoryEndsAt`/`bossPathActive`-Getter bleiben
als dünne Hüllen bestehen, damit `MemoryGameView`, `BossPathView` und
`LeaderboardView` unverändert weiterlaufen.

`DriftGameView` und `ParkourGameView` bekommen denselben Riegel wie
`MemoryGameView`: Bei beendetem Ereignis kein Levelstart, stattdessen ein
Hinweis und der Weg zurück.

## i18n

Neue Schlüssel in `src/i18n.js` für de/en/ru: `events.title`,
`events.endedSection` (mit Zähler), `events.showEnded`, `events.hideEnded`.
Die bestehenden `eventStatus.ended`/`eventStatus.endsIn` in `GameView.vue`
werden weiterverwendet. Deutsche Texte mit echten Umlauten.

## Tests

| Datei | Prüft |
|---|---|
| `src/emojiSafe.test.js` | Keine Mehr-Codepoint-Emoji in Canvas-Pfaden, `ctx.font` immer mit `EMOJI_FONT` |
| `src/eventGatingSql.test.js` | Migration pinnt `search_path`, gatet beide RPCs per `event_is_active`, Grants nur `authenticated` |
| `src/emojiFont.test.js` | `emojiFontSpec` baut korrekte Font-Strings, hängt die Kette immer an |

## Nicht in dieser Spec

- **Gesamt-Rangliste** über alle Ereignisse mit Plus-/Minus-Punkten je
  Platzierung. Braucht zuerst Bestenlisten für Drift und Parkour, die es heute
  nicht gibt (`drift_progress`/`parkour_progress` sind self-read).
- **Zucht-Ereignis** (zwei Tiere wählen → Ei → Ausbrüten). Setzt auf dem
  vorhandenen Eier-System auf, ist aber ein eigenes Feature.
