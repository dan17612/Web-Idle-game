# Brutzeit überspringen (Geschenk) — Design

**Datum:** 2026-10-15
**Migration:** `supabase/migrations/20261015_brutzeit_ueberspringen.sql`

## Wunsch

Allen Spielern einmalig schenken, dass ein Ei sofort fertig ist, und das
Verschenken ins Admin-Menü legen.

## Umsetzung

- **Guthaben** `egg_skip_tokens (user_id pk, qty ≥ 0, updated_at)`.
  RLS an, nur Select auf die eigene Zeile, Schreiben ausschließlich über RPCs.
  Eigene Tabelle statt Spalte in `profiles`, damit kein Client-Update das
  Guthaben berühren kann.
- **`egg_skip_use(p_slot)`** (authenticated): sperrt die Guthaben-Zeile,
  braucht `qty ≥ 1`, setzt `egg_incubations.ready_at = now()` für den eigenen,
  noch laufenden Brutplatz und zieht 1 ab. Fehler: `no egg skips`,
  `nothing to skip`. Das geschlüpfte Tier stand schon beim Einlegen fest, das
  Überspringen ändert nur die Zeit.
- **`admin_gift_egg_skips(p_usernames, p_qty)`** (nur Rolle `admin`):
  Empfänger wie beim Geschenk (`@all`, `@online`, Namensliste mit Komma),
  `p_qty` 1–10, addiert auf das Guthaben (Upsert). Antwort wie
  `admin_queue_gift_bulk`: `sent`, `all`, `online`, `missed`.
- **`get_incubation_status`** liefert zusätzlich `egg_skips`.

## Oberfläche

- Eier-Maschine: Pill „⏩ ×N“ neben der Platzanzeige, solange Guthaben da ist.
  Jeder laufende, noch nicht fertige Brutplatz bekommt einen Knopf
  „⏩ Sofort“. Danach kann das Ei direkt abgeholt werden.
- Admin-Menü → 🎁: eigener Block „⏩ Brutzeit überspringen schenken“ mit
  Empfängern (Vorgabe `@all`) und Anzahl.

## Erstausgabe

Nach dem Einspielen bekommt jeder Spieler einmalig 1× Überspringen
(direkter Upsert, gleiche Logik wie `@all`).

## Tests

- `src/eggSlots.test.js`: `normalizeIncubation` liest `egg_skips`.
- `src/eggSkipSql.test.js`: RLS, nur Select-Policy, Revokes, search_path,
  Admin-Prüfung, Grants, Mengen-Grenzen.
