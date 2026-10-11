# Regelwerk: Nutzungsbedingungen, Datenschutz und Pflicht-Zustimmung

Datum: 2026-10-11

## Ziel

Es gibt bisher nur eine knappe Datenschutzerklärung und keine Spielregeln. Im Fall
eines Spielers mit Makro-Dauerlauf (21.09.–07.10.) fehlte eine Regel, auf die man sich
berufen kann. Künftig gilt:

- Es gibt **Nutzungsbedingungen mit Spielregeln** (u. a. keine Makros/Autoklicker/Bots,
  ein Konto pro Person, kein Echtgeldhandel) und eine überarbeitete
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

1. Fair spielen: keine Makros, Autoklicker, Bots, Skripte oder sonstige Automatisierung,
   keine Manipulation von App oder Schnittstellen, Fehler melden statt ausnutzen.
2. Ein Konto pro Person. Zweitkonten, die einem anderen Konto Vorteile zuschieben, sind
   verboten.
3. Kein Handel mit Konten, Tieren, Coins oder Tickets gegen Echtgeld.
4. Respektvoller Umgang, keine beleidigenden Namen oder Nachrichten.
5. Maßnahmen bei Verstößen: Hinweis, Prüf-Code, Entfernen der dadurch erlangten Vorteile,
   befristete oder dauerhafte Sperre. Betroffene können im Support-Chat Stellung nehmen.

Wie Automatisierung erkannt wird, steht bewusst nicht in den Texten
(siehe Geheimhaltung in `2026-10-06-autoklicker-erkennung-design.md`).

## Offen vor dem Livegang

- Betreiberangaben (Name, ladungsfähige Anschrift, Kontakt-E-Mail) in `OPERATOR`
  eintragen. Ohne sie ist die Datenschutzerklärung unvollständig (Art. 13 DSGVO).
- Texte rechtlich prüfen lassen.
