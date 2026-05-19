# Support-Thread, Spieler-Antworten & Erinnerungs-Digest (Design)

Datum: 2026-05-19
Branch: dev
Baut auf: [2026-05-19-spieler-support-panel-design.md](2026-05-19-spieler-support-panel-design.md) (read-only Panel + FAB ist bereits umgesetzt)

## Ziel

Aus dem read-only Spieler-Support-Panel wird eine zweiseitige Konversation:

1. **Voller Chat-Thread** pro Ticket (Spieler ⇄ Admin, beliebig viele Nachrichten).
2. **Spieler kann antworten/nachfragen** — auch auf geschlossene Tickets (öffnet sie wieder). Keine Mail an den Admin bei Spieler-Nachrichten.
3. **Admin sieht blauen Punkt** (FAB + pro Ticket), wenn eine ungesehene Spieler-Nachricht vorliegt — symmetrisch zum roten Spieler-Punkt.
4. **Erinnerungs-Digest:** Ein täglicher pg_cron-Job mailt dem Admin **eine** Zusammenfassung aller >24h unbeantworteten Tickets — genau einmal pro unbeantwortetem Zyklus.

## Datenmodell

### Neue Tabelle `public.support_ticket_messages`

```
id          uuid pk default gen_random_uuid()
ticket_id   uuid not null references support_tickets(id) on delete cascade
sender      text not null check (sender in ('user','admin'))
body        text not null
created_at  timestamptz not null default now()
```

Index: `(ticket_id, created_at)`.

Diese Tabelle ist die **alleinige Quelle für den angezeigten Verlauf**.
`support_tickets.message` / `admin_reply` bleiben unverändert bestehen
(Mailer + Abwärtskompatibilität), werden aber **nicht mehr** für die Anzeige
genutzt.

### Neue Spalte

```
alter table public.support_tickets
  add column if not exists reminder_sent_at timestamptz;
```

### Backfill (in der Migration, idempotent)

Für jedes bestehende Ticket ohne Thread-Zeilen:

- eine `user`-Nachricht aus `message` / `created_at`
- falls `admin_reply` nicht null: eine `admin`-Nachricht aus `admin_reply` /
  `coalesce(replied_at, created_at)`

So haben Alt-Tickets sofort einen kohärenten Verlauf. Backfill nur einfügen,
wenn für das Ticket noch keine `support_ticket_messages` existieren
(`not exists`-Guard → idempotent bei erneutem Lauf).

## RLS & RPCs

### RLS auf `support_ticket_messages`

- `enable row level security`.
- SELECT-Policy `owner_select`: erlaubt, wenn
  `exists (select 1 from support_tickets t where t.id = ticket_id and t.user_id = auth.uid())`.
- INSERT-Policy `owner_insert_user`: `with check` — `sender = 'user'` UND der
  Ticket-Owner ist `auth.uid()`. (Admin-Schreibzugriff ausschließlich über
  `security definer`-RPCs, konsistent mit bestehendem Muster.)
- Kein UPDATE/DELETE für `authenticated`.

### `submit_support_ticket` (ändern, security definer)

Unverändertes Verhalten plus: nach dem Insert in `support_tickets`
zusätzlich erste Thread-Zeile `('user', message_clean)` für das neue Ticket
einfügen. Mailer-Aufruf `new` bleibt.

### `user_reply_support_ticket(p_ticket_id uuid, p_body text)` (neu, security definer)

```
- uid := auth.uid(); raise wenn null
- prüfen: ticket existiert UND ticket.user_id = uid (sonst 'ticket not found')
- body_clean := trim(p_body); raise wenn leer; raise wenn length > 5000
- Rate-Limit: max. 10 user-Nachrichten/Stunde über alle eigenen Tickets
    (count über support_ticket_messages join support_tickets,
     sender='user', created_at > now()-interval '1 hour')
- insert support_ticket_messages('user', body_clean) für p_ticket_id
- update support_tickets set status='open', closed_at=null
    where id = p_ticket_id   -- öffnet auch geschlossene wieder
- KEIN Mailer-Aufruf
- return jsonb_build_object('ok', true)
```

`grant execute ... to authenticated`.

### `admin_reply_support_ticket` (ändern, security definer)

Bestehendes Verhalten (setzt `admin_reply`, `replied_at`, `status`,
`closed_at`, Mailer-`reply`) **plus**:

- zusätzlich Thread-Zeile `('admin', reply_clean)` einfügen
- zusätzlich `reminder_sent_at = null` setzen (neuer unbeantworteter Zyklus
  kann später erneut genau eine Erinnerung auslösen)

### `admin_list_support_tickets` (ändern, security definer)

Rückgabe-Tabelle um eine Spalte erweitern:

```
last_user_message_at timestamptz
```

= `max(created_at)` aus `support_ticket_messages` mit `sender='user'` für das
jeweilige Ticket (per LATERAL/Subquery). Übrige Spalten/Filter/Limit
unverändert.

### `admin_list_ticket_messages(p_ticket_id uuid)` (neu, security definer)

Admin-only (Prüfung `is_admin` wie in den anderen Admin-RPCs). Gibt
`id, sender, body, created_at` für das Ticket zurück, sortiert nach
`created_at asc`. `grant execute ... to authenticated`.

## Erinnerungs-Digest

### `support_send_unanswered_digest()` (neu, security definer)

```
- Kandidaten: support_tickets t mit
    t.status = 'open'
    AND t.reminder_sent_at IS NULL
    AND (neueste support_ticket_messages-Zeile von t hat sender='user')
    AND (deren created_at < now() - interval '24 hours')
- wenn keine Kandidaten -> return (keine Mail)
- Text bauen: Kopf + je Ticket eine Zeile:
    "{ticket_number} · {username} · {subject} · seit {alter} · »{auszug 120 Zeichen}«"
- support-mailer Edge Function via _notify_support_mailer-artigem net.http_post
  aufrufen mit body = jsonb_build_object('mode','digest','text', <gebauter text>)
  (URL/secret aus public.app_settings wie bei _notify_support_mailer)
- update support_tickets set reminder_sent_at = now()
    where id in (<Kandidaten-IDs>)
- return void
```

Recipient (`ADMIN_EMAIL`) und Resend-Key bleiben **ausschließlich** in der
Edge Function (Architektur von v2 — DB hält keine Mail-Credentials).

### Edge Function `support-mailer` (ändern, additiv)

Neuer Modus `digest`:

- erfordert kein `ticket_id`; liest `body.text` (string)
- sendet an `ADMIN_EMAIL` (env), Betreff
  `[Zoo Empire] Unbeantwortete Support-Tickets`, `text = body.text`
- bestehende Modi `new` / `reply` bleiben unverändert; bei `digest` wird
  **kein** Ticket aus der DB geladen.

### pg_cron

- `create extension if not exists pg_cron;` (bisher nur `pg_net` genutzt —
  pg_cron muss auf dem Supabase-Projekt aktiviert sein).
- Cron-Eintrag (idempotent): vorhandenen Job gleichen Namens entfernen, dann
  `cron.schedule('support-unanswered-digest', '0 7 * * *',
   $$select public.support_send_unanswered_digest();$$);`
  (07:00 UTC täglich; Uhrzeit ist Implementierungsdetail, anpassbar.)
- `revoke all on function support_send_unanswered_digest() from public,
   anon, authenticated;` — nur vom Cron/postgres aufrufbar.

## Frontend

### Store `src/stores/auth.js`

Spieler:

- `loadTicketThread(ticketId)` → `select id, sender, body, created_at from
  support_ticket_messages where ticket_id = eq` order `created_at asc`
  (RLS-Owner). Ablage als `ticketThreads[ticketId] = rows`.
- `replyToTicket(ticketId, body)` → `rpc('user_reply_support_ticket', ...)`,
  danach `loadTicketThread(ticketId)` + `loadMySupportTickets()` (Status kann
  auf 'open' gewechselt sein).

Admin:

- `loadAdminSupportOverview()` → `rpc('admin_list_support_tickets', { p_limit:
  100 })`, Ergebnis in `adminSupportTickets`. Wird bei App-Start/Resume
  geladen, **nur wenn** `profile.is_admin || profile.is_subadmin`.
- Getter `hasUnseenAdminSupport` → `hasUnseenAdminMessage(adminSupportTickets,
  readAdminSeenMap())`.

`localStorage`-Keys: bestehend `seenSupportReplies` (Spieler-Punkt) +
neu `seenAdminTicketMsgs` (`{ticketId: last_user_message_at}`). Lese-/Schreib-
Helfer im Store, nicht in den reinen Funktionen.

### Reine Logik `src/supportTickets.js` (erweitern, unit-getestet)

Neu, seiteneffektfrei:

- `hasUnseenAdminMessage(tickets, seenMap)` → true, wenn ein Ticket
  `last_user_message_at` hat und `seenMap[id] !== last_user_message_at`.
- `buildAdminSeenMap(tickets, seenMap)` → Map mit allen aktuellen
  `last_user_message_at` (nur Tickets, die einen Wert haben).

Bestehende Funktionen (`qualifySupportTickets`, `hasUnseenReply`,
`buildSeenMap`) unverändert.

### `src/components/SupportModal.vue` (umbauen)

- Statt `message` + einzelner `admin_reply`: pro qualifiziertem Ticket den
  vollen Thread (`auth.ticketThreads[ticket.id]`) als Sprechblasen —
  `sender='user'` rechtsbündig (Akzentfarbe), `sender='admin'` linksbündig
  (abgesetzt). Zeitstempel je Blase.
- Beim Mount/Aufklappen `auth.loadTicketThread(id)` für die sichtbaren
  Tickets; bestehendes `markSupportRepliesSeen()` bleibt.
- Eingabe (Textarea + „Senden") **pro Ticket immer** sichtbar. Bei
  `status='closed'` Hinweistext „Antwort öffnet das Ticket erneut". Senden →
  `auth.replyToTicket(id, text)`, Fehler still in der Karte anzeigen
  (`releaseError`-Muster), bei Erfolg Eingabe leeren + Thread neu.

### `src/components/AdminModal.vue` (erweitern)

- Pro Ticket-Karte den Verlauf via `admin_list_ticket_messages` einblenden
  (Sprechblasen wie im SupportModal, gespiegelt: Admin = eigene Seite).
- Pro Ticket-Karte ein **blauer Punkt**, wenn dort eine ungesehene
  Spieler-Nachricht vorliegt (Vergleich gegen `seenAdminTicketMsgs`).
- Beim Öffnen des Tickets-Tabs: Punkte aus der **alten** Seen-Map rendern,
  danach `markAdminMessagesSeen()` (schreibt aktuelle
  `last_user_message_at`) — exakt das Muster von `markSupportRepliesSeen`.
- Bestehende Antwort-Box bleibt; die RPC-Änderung sorgt für die Thread-Zeile.

### `src/App.vue` (erweitern)

- Admin-FAB (`🛠️`) bekommt einen blauen Punkt-Span, sichtbar bei
  `auth.hasUnseenAdminSupport` (analog zum roten `fab-dot` am support-fab).
- Bei App-Start/Resume zusätzlich `auth.loadAdminSupportOverview()` für
  Admins (neben dem bereits umgesetzten `loadMySupportTickets()`).

### Styles `src/styles.css`

- `.admin-fab .fab-dot-blue` (blauer Punkt `#3b82f6`, sonst wie `.fab-dot`).
- Sprechblasen-Klassen im jeweiligen Component-`<style scoped>` (kein globaler
  Bedarf).

Farbcode: Spieler-Punkt rot `#ff4d4f`, Admin-Punkt blau `#3b82f6`.

## Fehlerbehandlung

- RPC-/Ladefehler im UI still anzeigen bzw. verwerfen (bestehende Muster:
  `console.error` + leere Liste im Store; `releaseError`-Style im Modal).
- Digest-Funktion: bei 0 Kandidaten kein `net.http_post`. `app_settings`
  ohne `functions_url` → Funktion kehrt ohne Fehler zurück (wie
  `_notify_support_mailer`).
- Backfill idempotent (`not exists`-Guard), Cron-Schedule idempotent
  (vorher unschedulen).

## Tests

Projekt: `node --test` (`npm test`), Beispiele `*.test.js`,
SQL-Logik-Tests `*Sql.test.js`.

- `src/supportTickets.test.js` erweitern:
  - `hasUnseenAdminMessage`: kein `last_user_message_at` → false; Wert nicht
    in Seen-Map → true; Wert == Seen-Map → false; Wert ≠ Seen-Map → true.
  - `buildAdminSeenMap`: übernimmt alle `last_user_message_at`, lässt Tickets
    ohne Wert aus, behält Fremd-Keys.
- `src/supportThreadSql.test.js` (neu, Muster `friendRequestsSql.test.js`):
  reine Helfer für die SQL-Bedingungen, soweit als JS-Prädikat abbildbar
  (z.B. `isUnansweredForDigest(ticket, latestMsg, now)` →
  status='open' ∧ reminder_sent_at null ∧ latestMsg.sender='user' ∧
  latestMsg.created_at < now-24h). Diese reine Funktion wird auch in der
  Store-/Doku-Ebene referenziert, damit die Digest-Bedingung testbar ist.

Migration/Edge-Function werden manuell verifiziert (Schema-Diff lokal +
Smoke-Test im Browser für Thread/Antwort/Punkte; Digest per manuellem
`select support_send_unanswered_digest();` mit zurückdatiertem Testticket).

## Bewusst nicht enthalten (YAGNI)

- Keine Mail an den Admin bei einzelnen Spieler-Nachrichten (nur Digest).
- Keine Push-/Realtime-Updates (Polling bei Resume/Modal-Open genügt,
  konsistent mit Phase 1).
- Keine serverseitige „gesehen"-Persistenz (lokal pro Gerät, wie Phase 1).
- Kein Bearbeiten/Löschen von Nachrichten.
- Keine Anhänge/Bilder im Thread.
