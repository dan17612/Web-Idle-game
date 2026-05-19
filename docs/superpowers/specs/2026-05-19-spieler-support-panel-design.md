# Spieler-Support-Panel (Design)

Datum: 2026-05-19
Branch: dev

## Ziel

Spieler sollen ihre eigenen Support-Tickets im Spiel einsehen können. Wenn
mindestens ein relevantes Ticket existiert, erscheint unten **rechts** ein
schwebendes Support-Icon (analog zum bestehenden Admin-FAB unten links). Ein
Klick öffnet ein read-only Panel mit den eigenen Tickets inklusive
Admin-Antwort.

## Sichtbarkeitsregel

Ein Ticket gilt als **qualifiziert** (zählt für FAB-Anzeige und wird im Panel
gelistet), wenn:

- `status !== 'closed'` (also `open` oder `replied`), ODER
- `status === 'closed'` UND `closed_at` liegt weniger als 24 Stunden zurück.

Das Support-Icon ist sichtbar, sobald mindestens ein qualifiziertes Ticket
existiert. Geschlossene Tickets verschwinden 24h nach `closed_at` aus Panel und
FAB-Logik.

Diese Logik wird an **einer** Stelle (Store-Getter) implementiert, damit
FAB-Sichtbarkeit und Panel-Inhalt garantiert konsistent sind.

## Neu-Badge (roter Punkt)

Am Support-FAB erscheint ein roter Punkt, wenn ein qualifiziertes Ticket
`status === 'replied'` hat und der Spieler die Antwort noch nicht gesehen hat.

- "Gesehen" wird **lokal pro Gerät** in `localStorage` unter dem Key
  `seenSupportReplies` gehalten: ein Objekt `{ [ticketId]: replied_at }`.
- Punkt erscheint, wenn für ein `replied`-Ticket kein Eintrag existiert ODER
  das gespeicherte `replied_at` vom aktuellen `replied_at` abweicht (= neue
  Antwort auf dasselbe Ticket).
- Beim Öffnen des Panels werden alle aktuell `replied`-Tickets mit ihrem
  `replied_at` als gesehen markiert → Punkt verschwindet.

## Datenzugriff (Sicherheit)

Kein Migrations-/RPC-Aufwand nötig. Die bestehende RLS-Policy
`support_tickets_owner_select` (`for select using (auth.uid() = user_id)`)
erlaubt Spielern ausschließlich den Lesezugriff auf **eigene** Tickets. Admins
greifen unverändert über die `security definer`-RPC
`admin_list_support_tickets` zu. Ein direktes Supabase-`select` aus dem Client
ist damit sicher — kein Fremdzugriff möglich.

Der 24h-Filter passiert clientseitig im Store-Getter (Datenmenge pro Spieler
ist klein; Rate-Limit von 5 Tickets/Stunde begrenzt das Wachstum).

## Komponenten

### 1. Store: `src/stores/auth.js`

- Neuer State: `mySupportTickets: []`.
- Neue Action `loadMySupportTickets()`:
  - `supabase.from('support_tickets').select('id, ticket_number, subject,
    message, status, admin_reply, created_at, replied_at, closed_at')
    .order('created_at', { ascending: false })`.
  - Ergebnis in `mySupportTickets` ablegen. Fehler still schlucken (wie übrige
    Loads in der App).
- Neuer Getter `qualifiedSupportTickets`: filtert `mySupportTickets` nach der
  Sichtbarkeitsregel (oben).
- Neuer Getter `hasUnseenSupportReply`: `true`, wenn ein qualifiziertes
  `replied`-Ticket nicht als gesehen markiert ist (localStorage-Abgleich).
- Helper `markSupportRepliesSeen()`: schreibt `replied_at` aller aktuell
  `replied`-Tickets in `localStorage.seenSupportReplies`.

### 2. `src/components/SupportModal.vue` (neu)

- Read-only. Stil/Markup-Muster von `AdminModal.vue` übernehmen
  (Modal-Backdrop, `ticket-card`, `pill status-*`-Klassen, `ticket-msg`).
- Eigene Inline-`I18N`-Objekte (de/en/ru) + lokale `tx()`-Funktion, exakt wie
  in `AdminModal.vue` / `TicketsView.vue`.
- Listet `auth.qualifiedSupportTickets`:
  - Kopf: Ticketnummer + Status-Pill (`status_open` / `status_replied` /
    `status_closed`).
  - Meta: erstellt am (Datum/Uhrzeit, lokal formatiert).
  - `subject` als Titel, `message` als `<pre class="ticket-msg">`.
  - Falls `admin_reply` vorhanden: abgesetzter Block "Antwort vom Support" +
    `replied_at`-Datum + Antworttext.
- Leerzustand: Hinweistext (sollte selten sichtbar sein, da FAB nur bei
  vorhandenen Tickets erscheint).
- `@close`-Event schließt das Modal (Pattern wie `AdminModal`).
- Beim Mount: `auth.loadMySupportTickets()` erneut aufrufen (frischer Stand),
  danach `auth.markSupportRepliesSeen()`.

### 3. `src/App.vue`

- Neuer State `supportOpen = ref(false)`.
- Neuer FAB-Button nach dem `admin-fab`:
  - `v-if="showNav && auth.qualifiedSupportTickets.length"`.
  - Klasse `support-fab`, Icon `🎫` (oder `💬`), Titel via neuem
    i18n-Key `app.supportTickets`.
  - `@click="supportOpen = true"`.
  - Roter Punkt (Badge-Span) sichtbar bei `auth.hasUnseenSupportReply`.
- `<SupportModal v-if="supportOpen" @close="supportOpen = false" />`.
- `loadMySupportTickets()` aufrufen:
  - im `auth.isAuth`-Watcher / `onMounted` (analog `subscribeBroadcasts`),
  - in `onAppResume(...)` (zusätzlich zu `refreshOnReturn`).

### 4. Styles: `src/styles.css`

- `.support-fab`: gespiegelt zu `.admin-fab`, aber `right: 14px` statt
  `left: 14px`; gleiche `bottom: calc(92px + var(--safe-bot))`, gleiche Größe
  (48px, rund), eigene Akzentfarbe (z.B. Türkis/Grün-Gradient zur
  Abgrenzung vom lila Admin-FAB).
- PrimeVue-Override analog `.p-button.admin-fab` (position:fixed !important,
  right statt left), und `.support-fab` zur `:not(...)`-Hover-Ausnahmeliste in
  styles.css hinzufügen, damit die generische PrimeVue-Hover-Regel nicht greift.
- `.support-fab .fab-dot`: kleiner roter Punkt oben rechts am FAB
  (position:absolute, ~10px, rote Füllung, heller Rand).

### 5. i18n: `src/i18n.js`

- Neuer Key `app.supportTickets` (de/en/ru) für den FAB-Titel/Tooltip.
- Modal-interne Strings leben inline in `SupportModal.vue` (konsistent mit
  AdminModal-Muster), **nicht** in i18n.js.

## Datenfluss (Zusammenfassung)

1. Login / App-Mount → `loadMySupportTickets()`.
2. App-Resume → `loadMySupportTickets()`.
3. `qualifiedSupportTickets` (Getter) entscheidet über FAB-Sichtbarkeit.
4. `hasUnseenSupportReply` (Getter) entscheidet über roten Punkt.
5. Klick auf FAB → `SupportModal` öffnet → reload + `markSupportRepliesSeen()`
   → Punkt verschwindet.

## Fehlerbehandlung

- Lade-Fehler werden still verworfen (FAB bleibt dann unsichtbar / Liste
  bleibt beim letzten Stand) — konsistent mit dem Verhalten der übrigen
  Hintergrund-Loads (`game.load().catch(() => {})`).
- Kein optimistisches UI nötig (read-only).

## Tests

Projekt nutzt `*.test.js` (vorhandenes Beispiel: `tradePublicWanted.test.js`).
Testbar als reine Funktion ausgelagert:

- `qualifySupportTickets(tickets, now)` — reine Filterfunktion (offen/replied
  immer; closed nur < 24h). Unit-Tests: open sichtbar, replied sichtbar,
  closed vor 23h sichtbar, closed vor 25h nicht sichtbar, fehlendes
  `closed_at` bei status closed → nicht sichtbar.
- `hasUnseenReply(tickets, seenMap, now)` — reine Funktion: replied ohne
  Eintrag → true; replied mit gleichem `replied_at` → false; replied mit
  abweichendem `replied_at` → true.

Die Store-Action/Komponente bleiben dünne Wrapper um diese reinen Funktionen.

## Bewusst nicht enthalten (YAGNI)

- Keine neue DB-Migration / RPC (RLS deckt Lesezugriff ab).
- Keine Realtime-Subscription (App pollt bei Resume/Login).
- Kein Antworten/Wiederöffnen/Schließen durch den Spieler (read-only;
  Konversation läuft weiter über E-Mail wie bisher).
- Keine serverseitige "gesehen"-Persistenz (lokal pro Gerät reicht).
