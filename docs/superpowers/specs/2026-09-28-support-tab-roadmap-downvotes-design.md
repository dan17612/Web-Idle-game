# Support-Tab: Support-Chat + Roadmap mit Downvotes

Datum: 2026-09-28

## Ziel

Der bisherige Nav-Tab „🗺️ Vorschläge“ wird zum Tab **„💬 Support“**. Er bündelt
zwei Bereiche, zwischen denen oben umgeschaltet wird:

1. **💬 Support-Chat** (Standard) — Spieler schreiben dem Entwickler direkt.
   Technisch weiterhin das bestehende Ticket-System (`support_tickets` +
   `support_ticket_messages`), aber als Chat bedient: kein Betreff-Pflichtfeld,
   keine Einstellungsseite, kein separates Modal.
2. **🗺️ Roadmap** — Ideen/Empfehlungen der Community mit Up- **und** Downvotes.
   Standardfilter ist „💡 Ideen“ statt „Alle“.

Warum „Support“ und nicht „Brainstorm“: Spieler mit einem Problem suchen nach
„Support“; die Roadmap ist als zweiter Reiter direkt daneben sichtbar.

## Routen & Navigation

- Neue Route `/support` (Name `support`) → `SupportView.vue`.
  Reiter über Query `?tab=chat|roadmap` (Standard `chat`).
- `/roadmap` bleibt als Redirect auf `/support?tab=roadmap` (alte Links/Bookmarks).
- Bottom-Nav: `💬 Support`, roter Punkt bei ungelesener Entwickler-Antwort
  (`auth.hasUnseenSupportReply`).
- Der schwebende 🎫-Support-Button und `SupportModal.vue` entfallen — der Chat
  im Tab ersetzt beides. Das Support-Formular in den Einstellungen wird durch
  einen Knopf „💬 Zum Support-Chat“ ersetzt.

## Support-Chat (einfacheres Ticket-System)

Komponente `src/components/SupportChat.vue`, reine Logik in `src/supportChat.js`.

- **Gespräche = Tickets.** Oben eine Chip-Leiste: „＋ Neu“ und die eigenen
  Tickets (neueste zuerst, offene vor geschlossenen). Beim Öffnen ist das
  jüngste nicht geschlossene Ticket aktiv, sonst „Neu“.
- **Neues Anliegen:** Begrüßungs-Bubble vom Entwickler, optionale Kategorie-Chips
  (🐞 Bug · ❓ Frage · 💡 Feedback · 👤 Konto), ein Textfeld, Senden.
  Der Betreff wird automatisch gebaut: `<Kategorie>: <erste Zeile gekürzt>`
  (max. 80 Zeichen) → `submit_support_ticket(p_subject, p_message, false)`.
- **Bestehendes Gespräch:** Verlauf als Sprechblasen (Spieler rechts, Entwickler
  links), Antwort über `user_reply_support_ticket` — öffnet geschlossene Tickets
  wieder (bestehendes Server-Verhalten), Hinweis darunter.
- **Aktualisierung:** alle 15 s (nur sichtbar, nur Chat-Reiter) Tickets + aktiven
  Verlauf neu laden, zusätzlich `useReturnRefresh`. Keine Realtime-Publikation
  nötig. Beim Anzeigen werden Antworten als gelesen markiert.
- Senden per Knopf oder Strg/⌘+Enter. Limits wie Server (5000 Zeichen,
  Rate-Limits der RPCs → Fehler-Toast).
- Admin-Seite bleibt unverändert (AdminModal → Tickets-Tab); Antworten landen
  wie bisher im Verlauf und per Mail.

## Roadmap mit Downvotes

Komponente `src/components/RoadmapBoard.vue` (bisheriger Inhalt von
`RoadmapView.vue`), reine Logik in `src/roadmap.js`.

- Voting-Spalte: ▲ / Punktestand / ▼. Gleiche Richtung erneut = Stimme zurück.
  Optimistisches Update, danach Serverwerte übernehmen.
- Punktestand = Upvotes − Downvotes, Sortierung „Top“ danach.
- Standardfilter `idea`.

### DB (`supabase/migrations/20260928_roadmap_downvotes.sql`)

- `roadmap_votes.value smallint not null default 1`, Check `value in (-1, 1)`.
  Bestehende Stimmen bleiben Upvotes.
- `vote_idea(p_idea_id uuid, p_value int default 1)` ersetzt `vote_idea(uuid)`:
  `p_value ∈ {-1, 0, 1}`; gleiche Richtung oder 0 löscht die Stimme, sonst Upsert.
  Antwort: `my_vote`, `up`, `down`, `score` + Altfelder `voted` (= Upvote) und
  `count` (= Score), damit ältere App-Versionen (nur Upvote-Toggle) weiterlaufen.
- `roadmap_view` neu mit `security_invoker = on`; Spalten bleiben kompatibel
  (`vote_count` = Score, `my_vote` = hat hochgevotet), neu angehängt:
  `up_count`, `down_count`, `my_value` (-1/0/1).
- Grants: Roadmap-RPCs nur `authenticated`, `revoke ... from public, anon`.

## Tests

- `src/roadmap.test.js` — Vote-Toggle, optimistisches Update, Filter/Sortierung.
- `src/supportChat.test.js` — Betreff-Bau, aktives Ticket, Gesprächs-Sortierung.
- `src/roadmapVotesSql.test.js` — Spalte/Check, RPC-Signatur, Kompat-Felder,
  `security_invoker`, search_path-Pins, Revokes.

## Nachtrag: Absender im Chat & Sub-Admin-Rechte

Migration `20260928_support_rollen_und_absender.sql`:

- `support_ticket_messages` bekommt `sender_id`, `sender_name` (Schnappschuss
  des Benutzernamens) und `sender_role` (`admin`/`subadmin`).
  `admin_reply_support_ticket` füllt sie; `admin_list_ticket_messages` liefert sie.
- Im Chat steht über jeder Antwort „🛠️ Name · Entwickler“ bzw.
  „🛡️ Name · Support-Team“; ältere Antworten ohne Namen nur die Rolle.
- **Sub-Admins dürfen nur noch Spieler sperren (inkl. Suche) und Tickets
  bearbeiten.** Ticket-RPCs erlauben jetzt `_admin_role()` (vorher nur
  `is_admin`). Shop-Restock/Rotation, Spezies an/aus/Gewicht, Geschenke,
  Broadcast, Promo-Codes und Roadmap-Verwaltung sind admin-only — der Guard
  wird per `pg_get_functiondef` + `replace` in der Live-Definition getauscht.
- AdminModal: Sub-Admins sehen nur die Reiter 👥 und 🎫 (Start auf Tickets);
  Roadmap-Verwaltung nur für Admins.
