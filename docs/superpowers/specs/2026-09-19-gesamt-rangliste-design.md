# Gesamt-Rangliste — Design

## Ziel

Die Bestenliste hat heute sechs getrennte Tabs, aber keine Antwort auf die
Frage, wer insgesamt der beste Spieler ist. Jede Disziplin steht für sich, und
wer in vier Disziplinen Zweiter ist, taucht nirgends vor dem auf, der einmal
Erster wurde.

Es soll **eine** Gesamtliste geben. Jede Platzierung in einer Disziplin bringt
Punkte, die Summe ergibt die Rangfolge. Pro Spieler zeigt ein ⓘ-Knopf, woher
seine Punkte kommen.

## Punktemodell

Platzierung → Punkte, monoton fallend, nie negativ:

| Platz | Punkte |
|---|---|
| 1 | 100 |
| 2 | 80 |
| 3 | 65 |
| 4–10 | 60, 54, 48, 42, 36, 30, 24 (`60 − (Platz−4)·6`) |
| 11–25 | 20 bis 6 (`20 − (Platz−11)`) |
| 26–50 | 5 |
| 51–100 | 2 |
| ab 101 | 0 |

Kein Minus: Wer ein Ereignis verpasst hat, bekommt dafür null Punkte, rutscht
aber nicht unter andere. Das war die bewusste Entscheidung gegen ein
Plus-Minus-Modell — sonst sammeln schwächere Spieler Abzüge und fallen immer
weiter zurück, statt aufzuholen.

Die Formel lebt doppelt (Projektkonvention „Reward-Spiegel"): als SQL-Funktion
`_rank_points(p_rank int)` und als `rankPoints(rank)` in `src/rankPoints.js`.
Ein Test liest beide und vergleicht sie Platz für Platz.

## Disziplinen

Neun Wertungen fließen ein — alles, wofür es eine Rangfolge gibt:

| Schlüssel | Sortierung | Quelle |
|---|---|---|
| `rate` | Münzen/s absteigend, dann Münzen | `animals` × `species_costs` × `tier_defs` |
| `coins` | Münzen absteigend | `profiles` |
| `boss_path` | höchste Etappe, dann Siege | `boss_path_progress` |
| `boss_endless` | bester Schaden | `boss_endless_runs` (`status = 'finished'`) |
| `memory` | höchstes Level, dann Paare | `memory_player_states` |
| `merge` | höchster Rang, Punkte, Fusionen | `merge_player_states` |
| `wordle` | beste Serie, dann Siege | `wordle_stats` |
| `drift` | höchstes Level, dann Sterne | `drift_progress` |
| `parkour` | höchstes Level, dann Sterne | `parkour_progress` |

Zwei bewusste Abweichungen von den Einzel-Bestenlisten:

- **Wordle** wertet `best_streak` statt `current_streak`. Die laufende Serie
  bricht bei einem ausgelassenen Tag auf null — als Beitrag zu einer
  Gesamtwertung wäre das Tagesrauschen, keine Leistung.
- **Beendete Ereignisse zählen weiter.** Memory, Drift, Parkour, Boss-Pfad und
  Merge sind vorbei; ihre Platzierungen sind eingefroren und bleiben in der
  Wertung. Sonst verlöre die Liste bei jedem Ereignis-Ende ihre Geschichte.

Nur Spieler mit Fortschritt zählen je Disziplin mit — wer null Münzen oder
Level 0 hat, steht nicht in der Rangfolge und bekommt dort auch keine Punkte.
Gebannte Konten sind überall ausgeschlossen.

`rate` und `coins` korrelieren naturgemäß: Wer reich ist, produziert meist auch
viel. Wohlstand zählt damit doppelt. Das ist so gewollt — es sind zwei
Disziplinen, die es heute auch als zwei Tabs gibt.

## Datenfluss

Eine RPC liefert alles, was die Ansicht braucht:

```
get_overall_leaderboard(p_limit int default 50)
  → username, avatar_emoji, total_points, disciplines jsonb
```

`disciplines` ist ein Array aus `{ key, rank, points }`, nach Punkten
absteigend. Damit braucht das ⓘ **keinen zweiten Server-Aufruf** — die
Aufschlüsselung liegt schon in der Zeile.

Intern: ein `union all` über die neun Disziplinen mit
`row_number() over (order by …)` je Disziplin, dann `_rank_points` auf den Platz,
dann Summe und `jsonb_agg` je Spieler. Platzierungen jenseits 100 fallen raus,
damit die Aggregation begrenzt bleibt.

Zwei fehlende Bestenlisten kommen dazu, weil Drift und Parkour sonst nicht
wertbar wären (`drift_progress`/`parkour_progress` sind heute self-read):

- `get_drift_leaderboard(p_limit)`
- `get_parkour_leaderboard(p_limit)`

Beide nach höchstem Level, dann Sternsumme. Sterne summiert ein Helfer
`_stars_total(jsonb)` über das `stars`-Objekt.

## Oberfläche

`LeaderboardView` bekommt einen Tab **„Gesamt"** als erste und
voreingestellte Ansicht. Eine Zeile zeigt Platz, Avatar, Name und Punkte; der
Name führt wie bisher zum Profil.

Rechts sitzt ein ⓘ-Knopf. Ein Klick klappt unter der Zeile die Aufschlüsselung
auf: pro Disziplin Name, Platz und Punkte, absteigend. Nur eine Zeile ist
gleichzeitig offen. Der Klick auf ⓘ darf **nicht** zum Profil navigieren —
deshalb wird die Zeile in einen Container umgebaut, statt den ⓘ in den
bestehenden Zeilen-Button zu schachteln (ein `button` in einem `button` ist
ungültiges HTML und klickt im Zweifel beides).

Disziplin-Namen liegen als lokales `I18N`-Dict in der View (de/en/ru).

## Tests

| Datei | Prüft |
|---|---|
| `src/rankPoints.test.js` | Punktetabelle, Monotonie, Randfälle (0, negativ, >100) |
| `src/rankPointsSql.test.js` | SQL-Formel deckt sich mit der JS-Formel; RLS, Grants, `search_path` |

## Nicht in dieser Spec

Das Zucht-Ereignis (zwei Tiere → Ei → Ausbrüten) bleibt Spec 3.
