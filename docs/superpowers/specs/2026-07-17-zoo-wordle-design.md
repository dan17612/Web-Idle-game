# Zoo-Wordle — Tägliches Wortratespiel mit Bestenliste

## Ziel
Ein Wordle-Minispiel als neues tägliches Minispiel neben Drift-Rennen und
Zoo-Parkour: Alle Spieler raten dasselbe deutsche 5-Buchstaben-Wort des Tages
in maximal 6 Versuchen. Dazu eine Wordle-Bestenliste im Leaderboard.

## Gameplay
- **Ein Wort pro Tag** (UTC-Tag, konsistent zur täglichen Belohnung). Alle
  Spieler bekommen dasselbe Wort.
- **6 Versuche**, Wortlänge 5, deutsche Wörter inklusive Ä/Ö/Ü (kein ß).
- **Farb-Feedback** pro Buchstabe: Grün = richtige Stelle, Gelb = im Wort,
  Grau = nicht im Wort (klassischer Zwei-Pass-Algorithmus, Duplikate korrekt).
- **Eingabe:** Bildschirm-Tastatur (QWERTZ inkl. ÄÖÜ) + physische Tastatur.
  Geraten werden darf jede 5-Buchstaben-Kombination (kein Wörterbuch-Zwang —
  bewusst einfach gehalten, kein Frust durch abgelehnte Wörter).
- **Streak:** Sieg an aufeinanderfolgenden Tagen erhöht die Serie; ein
  verlorener oder ausgelassener Tag setzt sie zurück.

## Server-autoritativ (kein Client-Seed)
Anders als beim Drift gibt es keine geteilte Seed-Formel: Die Wortliste liegt
ausschließlich in Postgres (`wordle_words`, kein Client-Lesezugriff). Das
Tageswort wird deterministisch aus `md5(tag)` → Index gewählt. Der Client
schickt nur den Tipp; der Server bewertet und zahlt aus. Die Lösung verlässt
den Server erst, wenn das Spiel beendet ist. Damit ist Cheaten per DevTools
ausgeschlossen und das „client+server synchron halten"-Problem entfällt.

## Belohnung (server-validiert, einmal pro Tag)
Coins nach Versuchen: 12000/9000/7000/5000/3500/2500 (Versuch 1–6).
Tickets: 3/2/1/1/0/0. Streak-Multiplikator wie bei der täglichen Belohnung:
`coins × (10 + min(streak−1, 10)) / 10` (max ×2). Niederlage: keine Belohnung,
Streak → 0. Größenordnung bewusst zwischen Tagesbelohnung (1k–15k) und den
einmaligen Minispiel-Rewards — täglich wiederholbar, daher moderat.

## Datenmodell + RPCs
| Objekt | Zweck |
|---|---|
| `wordle_words` | Lösungswörter (5 Buchstaben, unique). Kein Grant an anon/authenticated. |
| `wordle_daily_games` | PK (user_id, day). `guesses jsonb` = Array aus `{g, r}` (r = 5 Zeichen: c/p/a), `solved`, `finished`. RLS self-read. |
| `wordle_stats` | PK user_id. games, wins, current_streak, best_streak, last_win_day, dist jsonb (Verteilung 1–6). RLS self-read. |
| `get_wordle_state()` | Heutiger Spielstand + Stats + `next_day_at` + `server_now`; Lösung nur wenn beendet. |
| `wordle_guess(p_guess)` | Validiert (`^[A-ZÄÖÜ]{5}$`, Spiel offen, Lock per `for update`), bewertet, aktualisiert Spiel + Stats, zahlt bei Sieg Coins/Tickets auf `profiles`, gibt neuen State inkl. `coins_added`/`tickets_added` zurück. |
| `get_wordle_leaderboard(p_limit)` | username, avatar_emoji, current_streak, best_streak, wins, games. Sortierung: current_streak ↓, best_streak ↓, wins ↓. Gebannte ausgeschlossen. Grant wie Memory-Leaderboard (authenticated + anon). |

## Architektur (Client)
| Datei | Zweck |
|---|---|
| `src/wordle.js` | Reine Helfer: `WORD_LENGTH`, `MAX_GUESSES`, QWERTZ-`KEYBOARD_ROWS`, `isValidGuess`, `normalizeGuess`, `keyStates(guesses)` (c > p > a), `wordleReward(attempts, streak)` als Vorschau-Spiegel der SQL-Formel. |
| `src/wordle.test.js` | Unit-Tests für Validierung, Tastatur-Aggregation, Reward-Spiegel. |
| `src/wordleSql.test.js` | Migrations-Invarianten (RLS, Grants, Locking, Formel) nach Vorbild `dailyDriftSql.test.js`. |
| `src/views/WordleGameView.vue` | 6×5-Raster mit Flip-Animation, Bildschirm-Tastatur, Ergebnis-Panel (Belohnung, Streak, Verteilung, Countdown bis zum nächsten Wort), Tutorial beim ersten Besuch, lokale i18n (de/en/ru). |
| `src/stores/game.js` | `wordleState`, `loadWordleState()`, `submitWordleGuess(guess)` (Coins/Tickets/serverOffset übernehmen wie bei Drift). Laden lazy in der View. |
| `src/router.js` | Route `/wordle` (lazy import). |
| `src/views/GameView.vue` | Quick-Action + Link-Karte (analog Drift/Parkour). |
| `src/views/LeaderboardView.vue` | Neuer Tab „🟩 Wordle" (Streak/Best/Siege) + Deep-Link `?tab=`. |
| `src/i18n.js` | Leaderboard-Schlüssel in de/en/ru. |
| `supabase/migrations/20260717_wordle_game.sql` | Tabellen, Wortliste (~280 Wörter als Insert), RPCs, RLS + Grants. |

## Tests & Verifikation
`node --test` für wordle.js + SQL-Invarianten. Migration per Supabase-MCP
anwenden (die noch offene Parkour-Migration zuerst). Browser-Preview: Raten,
Farb-Feedback, Sieg → Belohnung, Bestenliste-Tab.
