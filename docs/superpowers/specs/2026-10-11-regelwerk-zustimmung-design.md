# Regelwerk: Nutzungsbedingungen, Datenschutz und Pflicht-Zustimmung

Datum: 2026-10-11

## Ziel

Es gibt bisher nur eine knappe Datenschutzerklärung und keine Spielregeln. Bei
Regelverstößen wie Makro-Spielen fehlte eine Regel, auf die man sich berufen kann.
Künftig gilt:

- Es gibt **Nutzungsbedingungen mit Spielregeln** (u. a. keine Makros/Bots, einfache
  Autoklicker nur geduldet, mehrere Konten nur nicht gleichzeitig) und eine überarbeitete
  **Datenschutzerklärung**.
- **Jeder Spieler muss beides mindestens einmal akzeptieren**, bevor er weiterspielt.
  Ändert sich der Text wesentlich, wird die Version erhöht und alle stimmen erneut zu.

## Versionierung

- Eine gemeinsame Version für das Regelwerk (Nutzungsbedingungen + Datenschutz), Format
  `YYYY-MM-DD`, erste Version `2026-10-11`.
- Spiegel: `public._legal_current_version()` (SQL) ↔ `LEGAL_VERSION` in `src/legal.js`.
  `src/legalSql.test.js` vergleicht beide.

## Datenbank (`supabase/migrations/20261011_regelwerk.sql`)

- Tabelle `legal_acceptances (user_id, version, accepted_at)`, Primärschlüssel
  `(user_id, version)`. Jede Zustimmung bleibt als Nachweis erhalten. RLS an, nur
  eigene Zeilen lesbar, Schreiben ausschließlich über RPC.
- `legal_status()` → `{ current_version, accepted_version, accepted_at, needs_acceptance, server_now }`.
- `legal_accept(p_version text)` → lehnt alles außer der aktuellen Version ab
  (`legal version mismatch`), legt die Zustimmung idempotent an und liefert den Status.
- Beide RPCs: `security definer set search_path = public`, Grants nur `authenticated`.
- Keine serverseitige Sperre anderer RPCs: Die App blockt per Pflicht-Fenster. Die Tabelle
  ist der Nachweis, wer wann welche Version akzeptiert hat.

## Client

- `src/legal.js`: `LEGAL_VERSION`, `OPERATOR` (Angaben zum Betreiber, einmalig zu pflegen),
  `normalizeLegalStatus()`, `needsLegalAcceptance()`. Test `src/legal.test.js`.
- `src/legalTexts.js`: Texte der Nutzungsbedingungen und der Datenschutzerklärung als
  Daten (de/en/ru, gleiche Abschnittsstruktur). Deutsch ist maßgeblich.
- `TermsView.vue` (`/terms`, ohne Login lesbar) und überarbeitete `PrivacyView.vue`
  (`/privacy`) rendern diese Daten über `LegalDocument.vue`.
- `LegalConsentModal.vue`: globales Vollbild-Fenster in `App.vue` (Teleport, z-index 2000,
  nicht wegklickbar). Kurzfassung der wichtigsten Regeln, Links zu beiden Texten,
  Pflicht-Häkchen, „Akzeptieren“, alternativ „Abmelden“. Auf `/terms` und `/privacy` wird
  es ausgeblendet, damit man die Texte lesen kann; dort führt ein Knopf zurück.
  Liegt gleichzeitig eine Autoklicker-Prüfung an, hat diese Vorrang.
- Store: `legalStatus`, `loadLegalStatus()` (in `game.load()`), `acceptLegal()`.
  Fehlt die RPC (alte DB), gilt keine Pflicht, damit die App nicht hängen bleibt.
- Einstellungen: Link „Nutzungsbedingungen“ neben „Datenschutzerklärung“ und Datum der
  Zustimmung. Login-Seite: Hinweis mit Links auf beide Texte.

## Inhalt der Spielregeln (Kurzfassung)

Allgemein formuliert, ohne Bezug auf Einzelfälle.

1. Keine Makros, Bots oder Skripte. Einfache Autoklicker, die beim Tippen nur
   unterstützen, werden geduldet, solange der Spieler selbst spielt (Duldung, kein
   Anspruch, jederzeit einschränkbar).
2. Mehrere Konten sind erlaubt, aber nicht gleichzeitig aktiv.
3. Keine Manipulation von App oder Schnittstellen, Fehler melden statt ausnutzen,
   respektvoller Umgang.
4. Handel außerhalb des Spiels (auch gegen echtes Geld) ist Sache der Beteiligten; wir
   ersetzen keine Verluste.
5. Rechte des Betreibers: Maßnahmen nach Ermessen bei Verstoß oder begründetem Verdacht
   (Verwarnung, Entfernen/Zurücksetzen von Spielinhalten auch nach Weitergabe, Sperre
   einzelner Funktionen, befristete/dauerhafte Sperre oder Löschung), kein Ersatz für
   entfernte Inhalte; Spiel und Bedingungen dürfen geändert werden (neue Fassung ⇒
   erneute Zustimmung oder Konto löschen).

Wie Automatisierung erkannt wird, steht bewusst nicht in den Texten
(siehe Geheimhaltung in `2026-10-06-autoklicker-erkennung-design.md`).

## Offen vor dem Livegang

- Betreiber (Daniil Schiller) und Datenschutz-Kontakt (datenschutz@schiller.pw) stehen in
  `OPERATOR`. Eine ladungsfähige Anschrift fehlt noch; solange `address` leer ist, wird
  sie in den Texten weggelassen.
- Texte rechtlich prüfen lassen.
