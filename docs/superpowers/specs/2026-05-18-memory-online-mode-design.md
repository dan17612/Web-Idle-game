# Memory Online-Modus — Design

Datum: 2026-05-18
Status: Genehmigt (Brainstorming abgeschlossen)

## Ziel

Ein rundenbasierter Online-Mehrspieler-Modus für das bestehende Memory-Minispiel.
Spieler können öffentliche Räume erstellen (mit optionalem Passwort und einer
maximalen Spielerzahl von 2–4, Systemmaximum 4), in einer Lobby-Liste offene
Räume sehen und beitreten. Sieg/Niederlage wird als Statistik gezählt
(Grundlage für eine spätere Online-Rangliste). Keine Item-/Truhen-Belohnungen.

## Getroffene Entscheidungen

- **Spielmodus:** Rundenbasiert (klassisches Memory). Spieler nacheinander dran;
  Paar gefunden = +1 Punkt und nochmal dran, kein Paar = nächster Spieler.
  Sieger = meiste Paare.
- **Belohnung:** Keine Items. Siege/Niederlagen + Statistik werden gezählt
  (spätere Online-Rangliste möglich).
- **Beitritt:** Öffentliche Raumliste (Name, Spieler X/max, 🔒 wenn Passwort).
  Passwortgeschützte Räume verlangen Passwort beim Beitritt.
- **Brettgröße:** Host wählt beim Erstellen — Klein 8 / Mittel 12 / Groß 18 Paare.
- **Spielstart:** Host startet manuell (min. 2 Spieler). Danach kein Beitritt mehr.
- **Inaktiv/Disconnect:** Zug-Timer ~20 s mit Auto-Skip; längere Abwesenheit →
  Spieler als „verlassen" markiert.
- **Architektur:** Ansatz A — DB-autoritativ + Edge Function `memory-online` +
  Supabase Realtime (`postgres_changes`). Server ist Autorität (wichtig wegen
  gezählter Statistik), übersteht Disconnects, keine neue Infrastruktur, folgt
  dem bestehenden `memory-game`-Muster.

## 1. Datenmodell (Postgres, Projekt `rkskpvbismdlsevaqoer`)

### `mem_online_rooms`
- `id` uuid pk default gen_random_uuid()
- `code` text — 6-stellig (für evtl. spätere Direkt-Joins)
- `host_id` uuid → auth.users
- `name` text not null
- `password_hash` text null — pgcrypto `crypt()`, nie Klartext
- `has_password` bool not null default false — für Listenanzeige ohne Hash-Leak
- `max_players` int not null CHECK (max_players between 2 and 4)
- `board_pairs` int not null CHECK (board_pairs in (8, 12, 18))
- `status` text not null default 'lobby' — `lobby` | `playing` | `finished`
- `board` jsonb null — vollständiges Layout, **nie an Clients gesendet**
- `revealed` jsonb not null default '[]' — aktuell offene/gematchte Karten
  inkl. welcher Spieler sie gematcht hat
- `turn_player_id` uuid null
- `turn_expires_at` timestamptz null
- `version` bigint not null default 0 — Optimistic Concurrency (wie Single-Player)
- `created_at` timestamptz default now(), `updated_at` timestamptz default now()

### `mem_online_players`
- `room_id` uuid → mem_online_rooms(id) on delete cascade
- `user_id` uuid → auth.users
- `seat` int not null
- `display_name` text not null
- `score` int not null default 0
- `connected` bool not null default true
- `is_host` bool not null default false
- `joined_at` timestamptz default now()
- PRIMARY KEY (`room_id`, `user_id`)

### `mem_online_stats`
- `user_id` uuid pk → auth.users
- `games_played` int not null default 0
- `wins` int not null default 0
- `pairs_found` int not null default 0
- `updated_at` timestamptz default now()

### RLS
- Clients dürfen `mem_online_rooms` und `mem_online_players` **lesen**
  (für Liste + Realtime), aber **nicht schreiben**.
- Alle Schreibzugriffe ausschließlich über SECURITY DEFINER RPCs.
- Die `board`-Spalte darf nie an Clients gelangen: Client-Lesezugriff/Realtime
  läuft über eine View bzw. Spaltenausschluss; der vollständige sichtbare State
  kommt aus dem RPC `mo_room_state`, das `board` filtert.

## 2. Edge Function `memory-online`

Gleiches Muster wie `supabase/functions/memory-game/index.ts`: JWT-Auth über
`admin.auth.getUser(token)`, Dispatch zu Postgres-RPCs, JSON-Antwort, CORS.

| Action | RPC | Zweck |
|---|---|---|
| `list_rooms` | `mo_list_rooms` | Offene Lobby-Räume (Name, Spieler X/max, 🔒-Flag); räumt verwaiste Räume auf |
| `create_room` | `mo_create_room` | Raum anlegen (name, max_players, board_pairs, optional password) |
| `join_room` | `mo_join_room` | Beitreten (room_id, optional password) — prüft Passwort & freie Plätze |
| `leave_room` | `mo_leave_room` | Verlassen; Host-Wechsel oder Raum löschen wenn leer |
| `start_game` | `mo_start_game` | Nur Host, min. 2 Spieler → Brett mischen, Status `playing`, ersten Zug setzen |
| `flip` | `mo_flip` | Karte aufdecken; serverseitige Regel-/Turn-/Timer-/`version`-Prüfung |
| `skip_turn` | `mo_skip_turn` | Bei abgelaufenem Timer vom Client getriggert; Server prüft `turn_expires_at`, gibt weiter (idempotent über `version`) |
| `room_state` | `mo_room_state` | Vollständiger sichtbarer State (Polling-Fallback / Reconnect), `board` gefiltert |

### Spiellogik (rundenbasiert)
1. Erste Karte aufdecken → offen sichtbar.
2. Zweite Karte: Match → +1 Punkt, gleicher Spieler bleibt dran.
   Kein Match → beide kurz sichtbar, dann zu, nächster Spieler ist dran.
3. Bei jedem Zugwechsel: `turn_expires_at = now() + 20s`.
4. Letztes Paar gefunden → Status `finished`; Sieger = höchste Punktzahl;
   `mem_online_stats` für alle Teilnehmer aktualisiert
   (nur wenn ≥2 Spieler regulär beendet haben).

## 3. Realtime-Sync

- Nach Join abonniert der Client `supabase.channel('mem_room_'+roomId)` mit
  `postgres_changes` auf `mem_online_rooms` (diese Zeile) und
  `mem_online_players` (room_id-Filter).
- Bei jedem Event → sichtbaren State neu via RPC `mo_room_state` laden
  (RPC filtert `board`, liefert nur offene Karten-Emojis + Punkte + Turn-Info).
- Lokaler Countdown auf `turn_expires_at`. Läuft er ab und der lokale Spieler
  ist nicht selbst dran → ein Client triggert `skip_turn`; Server validiert
  über `turn_expires_at` und `version` (idempotent, kein Doppel-Skip).
- Polling-Fallback über `mo_room_state` bei Reconnect.

## 4. Frontend

- **Route** `/memory-online` (`meta.auth`) in `src/router.js`.
- Einstieg: Button im Header von `src/views/MemoryGameView.vue`.
- **`src/views/MemoryOnlineView.vue`** — drei Phasen in einer View:
  - *Lobby-Liste:* PrimeVue-Liste offener Räume (Name, X/max Spieler,
    🔒 wenn Passwort), „Beitreten" + „Raum erstellen".
  - *Raum erstellen* (Dialog): `InputText` Name, Select Brettgröße
    (Klein 8 / Mittel 12 / Groß 18), Select max. Spieler (2–4),
    optional `InputText` Passwort.
  - *Warteraum:* Spielerliste; Host sieht „Start" (ab 2 Spielern aktiv),
    andere „Warte auf Host".
  - *Spiel:* Brett-Layout aus `MemoryGameView` wiederverwenden,
    Punkte-Leiste aller Spieler, „Du bist dran"/„X ist dran",
    Zug-Timer-Anzeige.
- **Passwort-Beitritt:** Klick auf 🔒-Raum öffnet kleinen Passwort-Dialog.
- **i18n:** neue Keys nach bestehendem `I18N`-Objekt-Muster (de/en/ru),
  echte Umlaute ä ö ü ß (kein ae/oe/ue/ss).
- **UI:** durchgängig PrimeVue-Komponenten; `.btn`-Styling und Goldhover
  (`var(--accent)` #ffd166) wie im restlichen Projekt.

## 5. Edge Cases & Anti-Missbrauch

- Spieler verlässt während des Spiels → als „verlassen" markiert, Zug wird
  übersprungen. Bleibt nur 1 aktiver Spieler → Spiel endet, **ohne**
  Statistik-Gutschrift (verhindert Farming).
- Passwort nur serverseitig geprüft (pgcrypto `crypt`); Liste zeigt nur
  `has_password`-Flag, niemals den Hash.
- Optimistic Concurrency über `version` verhindert Doppel-Flip/Races.
- Verwaiste Lobby-Räume (älter als X Std., nie gestartet) werden im
  `mo_list_rooms`-RPC bereinigt.
- Statistik-Gutschrift nur bei ≥2 Spielern, die das Spiel regulär beendet haben.

## 6. Tests

- `node --test` (vorhandenes Setup): testbare RPC-Logik —
  Match-/Turn-Wechsel-Regeln, Timer-Skip, Passwort-Hash-Prüfung,
  Sieger-Ermittlung, „nur 1 Spieler übrig"-Abbruch.
- Frontend-Verifikation via Dev-Server / Browser-Preview:
  Raum erstellen → zweite Session beitreten → Spielablauf End-to-End.

## Offene Punkte (in Implementierungsplan zu klären)

- Genaue Cleanup-Schwelle für verwaiste Räume (Vorschlag: 2 Std. ohne Start).
- Sichtbarkeitsdauer der nicht gematchten Karten vor dem Zudecken
  (Vorschlag: ~1,2 s, clientseitig animiert, serverautoritativ bleibt der
  State sofort konsistent).
