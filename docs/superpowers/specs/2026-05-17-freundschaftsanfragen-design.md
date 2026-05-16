# Freundschaftsanfragen nach Ablehnung und deaktivierbare Anfragen - Design

Datum: 2026-05-17

Betroffene Bereiche:
- `supabase/schema.sql`
- neue Supabase-Migration
- `src/stores/auth.js`
- `src/views/SettingsView.vue`
- `src/views/FriendsView.vue`
- `src/views/ProfileView.vue`
- `src/i18n.js`

## Ziel

Freundschaftsanfragen sollen nach einer Ablehnung erneut gesendet werden können. Zusätzlich sollen Nutzer eingehende neue Freundschaftsanfragen in den Einstellungen deaktivieren können.

Die Deaktivierung betrifft nur neue eingehende Anfragen. Bestehende Freunde, ausgehende Aktionen des Nutzers und das Akzeptieren bereits offener gegenseitiger Anfragen bleiben möglich.

## Datenbankmodell

`public.profiles` erhält ein neues Feld:

```sql
friend_requests_enabled boolean not null default true
```

Bestehende Profile nehmen damit weiterhin Freundschaftsanfragen an, bis sie die Einstellung aktiv ändern.

## Server-Verhalten

`public.friend_request(p_username text)` bleibt die zentrale Sicherheitsgrenze.

Gewünschtes Verhalten:

- Nicht angemeldet, Ziel nicht gefunden und Selbst-Anfrage bleiben Fehler wie bisher.
- Existiert eine angenommene Freundschaft, gibt die Funktion `accepted` zurück.
- Existiert eine offene Anfrage der Zielperson an den aktuellen Nutzer, wird sie wie bisher direkt angenommen.
- Existiert eine alte abgelehnte Beziehung zwischen beiden Nutzern, wird sie für die neue Anfrage wiederverwendet:
  - `requester_id` wird der aktuelle Nutzer.
  - `addressee_id` wird die Zielperson.
  - `status` wird `pending`.
  - `created_at` wird aktualisiert.
  - `responded_at` wird auf `null` gesetzt.
- Existiert bereits eine offene ausgehende Anfrage, bleibt sie unverändert `pending`.
- Hat die Zielperson `friend_requests_enabled = false`, wird keine neue Anfrage erstellt oder reaktiviert. Das gilt nicht für das direkte Annehmen einer bereits offenen Gegenanfrage. Die Funktion wirft in diesem Fall eine stabile Fehlermeldung: `friend requests disabled`.

Neue Setter-Funktion:

```sql
public.set_friend_requests_enabled(p_enabled boolean)
```

Sie setzt nur das eigene Profilfeld und gibt den neuen Wert als JSON zurück. Die Funktion ist `security definer`, prüft `auth.uid()` und arbeitet mit `set search_path = public`, passend zu den bestehenden Profil-RPCs.

## Frontend-Verhalten

### Einstellungen

In `SettingsView.vue` kommt im Konto-/Datenschutzbereich ein Schalter:

- Label: `Freundschaftsanfragen erlauben`
- Hinweis: `Wenn deaktiviert, können dir andere Spieler keine neuen Freundschaftsanfragen senden.`

Der Schalter liest `auth.profile.friend_requests_enabled !== false`. Beim Ändern ruft er eine neue Auth-Store-Action `setFriendRequestsEnabled(enabled)` auf.

### Auth-Store

`src/stores/auth.js` erhält eine Action:

```js
async setFriendRequestsEnabled(enabled)
```

Diese ruft `supabase.rpc('set_friend_requests_enabled', { p_enabled: !!enabled })` auf und aktualisiert `this.profile.friend_requests_enabled` lokal.

### Freundes- und Profilseite

`FriendsView.vue` und `ProfileView.vue` bleiben bei der bestehenden RPC-Nutzung. Server-Fehler aus deaktivierten Anfragen werden über die vorhandenen Toasts angezeigt.

Die bestehenden Erfolgstexte bleiben erhalten und unterscheiden weiterhin anhand von `data.status` zwischen gesendet und bestätigt.

## i18n

Neue Texte werden in `src/i18n.js` für Deutsch, Englisch und Russisch ergänzt. Deutsche Umlaute bleiben echte Unicode-Zeichen.

Benötigte deutsche Texte:

- `settings.friendRequestsTitle`: `Freundschaftsanfragen`
- `settings.friendRequestsHint`: `Wenn deaktiviert, können dir andere Spieler keine neuen Freundschaftsanfragen senden.`
- `settings.friendRequestsEnabled`: `Freundschaftsanfragen erlauben`
- `settings.friendRequestsSaved`: `Einstellung gespeichert.`
- `storeErrors.friendRequestsDisabled`: `Diese Person nimmt aktuell keine Freundschaftsanfragen an.`

Die SQL-Fehlermeldung `friend requests disabled` wird im Frontend auf den i18n-Text gemappt.

## Fehlerbehandlung

- RPC-Fehler beim Speichern der Einstellung werden über die bestehende `flash(..., true)`-Logik in den Einstellungen angezeigt.
- RPC-Fehler beim Senden einer Freundschaftsanfrage laufen über `appToast.err`.
- Wenn ein alter Client die neue Spalte noch nicht kennt, bleibt das Server-Default `true` rückwärtskompatibel.

## Tests und Verifikation

Automatisierte Node-Tests decken die SQL-RPCs in diesem Projekt nicht direkt ab. Die Verifikation erfolgt über:

- `npm run build` für Frontend-Syntax und Bundling.
- SQL-Review der Migration und `schema.sql`.
- Manuelle Datenbank-/App-Szenarien:
  - Nutzer A sendet an Nutzer B, B lehnt ab, A sendet erneut.
  - B deaktiviert Anfragen, A kann keine neue Anfrage an B senden.
  - B hat deaktiviert, sendet aber selbst an A; A kann die eingehende Anfrage durch eigenes Senden weiterhin annehmen.
  - Bestehende Freunde bleiben Freunde.

## Nicht enthalten

- Kein Blockieren einzelner Nutzer.
- Keine Anzeige des Anfrage-Status direkt auf fremden Profilen.
- Keine automatische Löschung alter abgelehnter Datensätze.
