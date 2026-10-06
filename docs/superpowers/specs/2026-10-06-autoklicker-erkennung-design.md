# Autoklicker-Erkennung mit Code-Abfrage

Datum: 2026-10-06

## Ziel

Autoklicker und Makros sollen auffallen, ohne ehrliche Spieler zu bestrafen.
Wenn ein Spieler über lange Zeit ein zu genaues, sich wiederholendes Muster
zeigt (z. B. 8 Stunden lang jede Truhe jeder Shop-Rotation geöffnet), erscheint
ein **Prüf-Fenster**:

- Hinweis „🤖 Automatisierung erkannt“ mit dem Grund,
- eine zufällige **4-stellige Zahl**, die in ein Textfeld getippt werden muss,
- Hinweis, dass automatisch ein **Support-Ticket für das Admin-Team** eröffnet
  wurde (Ticketnummer).

Ein Autoklicker kann nicht tippen. Bis zur Eingabe lehnt der Server Taps, Truhen
und Shop-Käufe ab, deshalb läuft der Klicker ins Leere.
**Spieler werden nicht automatisch gesperrt.** Nach richtiger Eingabe geht es
sofort weiter. Ob gesperrt wird, entscheidet ein Admin im Ticket wie bisher
(`admin_set_user_ban`).

## Was gezählt wird (serverseitig)

Alles läuft über Trigger, damit die bestehenden RPCs unverändert bleiben:

| Aktion            | Quelle (Trigger)                                             |
|-------------------|--------------------------------------------------------------|
| `tap`             | `profiles.taps_used` steigt (`tap_earn`)                     |
| `chest`           | `chest_purchases` insert/update (`buy_chest`)                |
| `ticket_chest`    | `ticket_chest_purchases` insert/update (`ticket_chest_open`) |
| `shop`            | `shop_purchases` insert/update (`buy_animal`)                |

Pro Spieler und 5-Minuten-Slot (`_current_slot()`, gleiches Raster wie Shop,
Ticket-Shop und Tap-Reset) entsteht eine Zeile in `automation_slots`
(`first_at`, `last_at`, `actions`). Alte Zeilen (> 2 Tage) werden beim ersten
Zugriff eines neuen Slots aufgeräumt.

## Regeln

Ausgewertet wird nur bei der **ersten Aktion eines neuen Slots** (also höchstens
1× pro 5 Minuten und Spieler). Gezählt werden nur Daten **nach** der letzten
gelösten Prüfung, damit es nach der Eingabe nicht sofort wieder auslöst.

1. **Dauerlauf** (`dauerlauf`): In mindestens **94 von 96** Slots der letzten
   **8 Stunden** gab es eine Aktion (2 Slots Toleranz für Lag am Rotationsrand).
2. **Takt** (`takt`): Die erste Aktion der letzten **25 lückenlosen Slots**
   (2 Stunden) kam in so gleichmäßigem Abstand, dass die Standardabweichung der
   24 Abstände **unter 1,0 s** liegt. Ein Mensch schafft das über 2 h nicht. Ein
   5-Minuten-Timer oder ein Dauerklicker auf den Truhen-Knopf schon.
3. **Klickmuster** (`klickmuster`): Der Client misst am Tap-Bereich
   (`pointerdown`) **30 Klicks** am Stück (jede Lücke ≤ 5 s). Auffällig, wenn
   alle Klicks auf praktisch derselben Stelle liegen (Streuung ≤ 1,5 px) **und**
   die Abstände zu gleichmäßig sind (σ ≤ max(8 ms, 4 % des Mittelwerts)).
   Der Client meldet das über `automation_report('click_pattern', stats)`
   (max. 1×/Minute, der Server prüft die Schwellen nochmals). Erst
   **3 Meldungen in 2 Stunden** („immer wieder“) lösen die Prüfung aus.
   Selbstmeldungen können nur den eigenen Account treffen, daher kein
   Missbrauchsrisiko.

Die Schwellen stehen doppelt: in SQL und in `src/automationCheck.js`
(`AUTOMATION_RULES`). `src/automationSql.test.js` vergleicht beide.

## Prüfung (Code)

Tabelle `automation_checks` (eine offene Prüfung pro Spieler, Partial-Unique-Index):
`reason`, `details` (jsonb), `code` (4 Ziffern aus `gen_random_uuid()`),
`attempts`, `ticket_id`, `created_at`, `solved_at`.

- `_automation_guard(uid)` wirft `automation_check_required`, solange eine
  Prüfung offen ist. Die Tracking-Trigger rufen den Guard auf. Die ganze
  Transaktion (Coins-Abzug, Truhe, Tap) wird dadurch zurückgerollt.
- `automation_status()` liefert `{ pending, code, reason, details, ticket_number,
  attempts, max_attempts, created_at, server_now }`.
- `automation_verify(p_code)` vergleicht die Eingabe. Bei Erfolg wird
  `solved_at` gesetzt und ein Vermerk ins Ticket geschrieben (Dauer bis zur
  Eingabe, Fehlversuche). Nach **5 Fehlversuchen** gibt es einen neuen Code.
- `automation_report(p_kind, p_details)`: nur `click_pattern`, Schwellen werden
  serverseitig geprüft, nur Zahlenfelder werden gespeichert (`automation_signals`).

Die auslösende Aktion selbst geht noch durch (eine Exception würde auch die
Markierung zurückrollen). Ab der nächsten Aktion blockt der Guard. Der Client
lädt dann `automation_status()` und zeigt das Fenster. Zusätzlich lädt
`game.load()` den Status (App-Start, Rückkehr), und `automation_report` gibt ihn
direkt zurück.

## Support-Ticket

`_automation_open_ticket(uid, reason, details)`:

- Gibt es ein noch nicht geschlossenes Ticket aus einer früheren Prüfung, wird
  dort eine neue Nachricht „🤖 Erneut erkannt …“ angehängt und der Status auf
  `open` gesetzt.
- Sonst neues Ticket: Betreff `🤖 Automatisierung erkannt: <Spielername>`,
  Nachricht mit Regel und Messwerten. Die erste Nachricht ist `sender = 'user'`,
  damit der Admin-Punkt (`last_user_message_at`) und die Admin-Mail
  (`_notify_support_mailer(..., 'new')`) wie bei normalen Tickets auslösen.
  Der Text beginnt mit „🤖 Automatisch erstellt“, damit er im Chat des Spielers
  nicht wie eine eigene Nachricht wirkt.
- Folgevermerke (Code gelöst) laufen als `sender = 'admin'`,
  `sender_name = '🤖 Auto-Erkennung'`, ohne Statuswechsel.
- Der Spieler sieht das Ticket im Support-Chat und kann dort antworten.

## Client

- `src/automationCheck.js`: Konstanten, `analyzeClicks()`, `createClickSampler()`,
  `isAutomationLockError()`, `sanitizeCode()`, Grund-Schlüssel.
- Store (`game`): `automationCheck`, `loadAutomationCheck()`,
  `verifyAutomationCode()`, `reportAutomation()`, `noteAutomationError(err)`.
  `tapEarn`, `buyAnimal`, `openTicketChest` und ShopView-`buy_chest` rufen bei
  Lock-Fehlern `noteAutomationError` auf. Für diese Fehler gibt es keinen
  Fehler-Toast, denn das Fenster erklärt alles.
- `src/components/AutomationCheckModal.vue`: globales Vollbild-Overlay in
  `App.vue` (Teleport, nicht wegklickbar), lokales `I18N` de/en/ru, Code als
  Ziffern-Kacheln, `InputText` (`inputmode="numeric"`, `autocomplete="off"`),
  Enter bestätigt. Erfolg → Toast, Fenster schließt.
- `GameView.vue`: Klick-Sampler am Tap-Bereich, meldet Treffer an den Store.

## Tests

- `src/automationCheck.test.js`: Klickanalyse (Bot vs. Mensch, Maus ohne
  Bewegung, Lücken), Sampler-Cooldown, Fehlererkennung, Code-Eingabe.
- `src/automationSql.test.js`: RLS, Revokes, search_path-Pins, Grants,
  Schwellen-Spiegel, Guard in allen Triggern, Ticket-Logik, keine Sperre.
