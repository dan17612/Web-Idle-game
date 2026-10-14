# Wochenend-Bonus, Truhenlimits, Zucht-Ei im Shop, Halloween-Code — Design

**Datum:** 2026-10-14
**Migration:** `supabase/migrations/20261014_wochenend_bonus.sql`

Vier kleine Wünsche aus einer Anfrage, gebündelt in einer Migration.

## 1) Truhenlimits

| Truhe | vorher | jetzt |
|---|---|---|
| Normale Truhe (🪙) | 10 pro 5-Min-Rotation | **5** |
| Ticket-Truhe (🎟️) | 5 pro 5-Min-Rotation | **10** |

Nur Daten: `chest_config.daily_limit` und `ticket_config.chest_slot_limit`.
Beide Views lesen das Limit vom Server (`get_chest_status`, `get_ticket_shop`),
eine Client-Änderung ist nicht nötig. Pro Kauf bleiben 1–5 Stück erlaubt, die
10 Ticket-Truhen gehen also in zwei Käufen.

## 2) Promo-Code `HALLOWEEN`

3× 🦇 Fledermaus (Stufe normal), 1× pro Spieler, gültig bis zum Ende der
Halloween-Saison (9.11.2026 00:00 Berliner Zeit). Die Tiere kommen wie bei
jedem Code über `pending_gifts`. Damit ist die Fledermaus nicht mehr nur über
das Kürbis-Puzzle erreichbar.

## 3) Zucht-Ei im Shop

Das Zucht-Ei 🐣 erscheint jetzt wie das Safari-Ei zufällig in der Shop-Rotation
(`shop_weight = 30`, 1 Stück, ≈ 23 % pro Rotation). Ein gekauftes Zucht-Ei hat
kein festes Ergebnis (`bred_species` leer), `start_incubation` würfelt also aus
`egg_drop_pool` — derselbe Weg wie beim Safari-Ei.

Die Werte entsprechen genau einer Verpaarung mit **Zuchtkraft 3**:

| | Wert |
|---|---|
| Preis | `breedCost(3)` = 800 Mio 🪙 |
| Brutzeit | `breedMinutes(3)` = 75 min |
| Igel / Leopard / Gorilla | 67 / 28 / 5 % (`breedWeights(3)`) |
| Brachiosaurus | 0 % — bleibt der Zucht vorbehalten |

So ist der Shop-Kauf kein Schlupfloch: gleiche Chancen zum gleichen Preis, nur
ohne Eltern und Abklingzeit. Wer bessere Chancen will, züchtet weiter selbst.
Selbst verpaarte Eier bringen ihr Ergebnis und ihre Brutzeit wie bisher mit.
`SHOP_EGG_POWER` in `src/breeding.js` ist der Spiegel, `src/weekendBoostSql.test.js`
prüft die Pool-Zeilen, den Preis und die Brutzeit gegen `breeding.js`.

## 4) Wochenend-Bonus

Samstag 00:00 bis Sonntag 23:59 (Europe/Berlin) ändern sich die Gewichte:

| Tiere | Faktor |
|---|---|
| 🐤 Küken, 🐔 Huhn, 🐰 Hase | × 0,5 (seltener) |
| alle `rare`, `epic`, `legendary` | × 2 (häufiger) |
| Rest | × 1 |

Gilt für die normale Truhe, die Ticket-Truhe und die Ziehung beider
Shop-Rotationen. Boss-, Merge- und Memory-Truhen bleiben unverändert.
Mit den Gewichten vom 14.10.2026 steigt der Anteil seltener Tiere in der Truhe
von etwa 6 % auf etwa 17 %.

SQL: `_weekend_boost_active(ts)`, `_weekend_factor(species, rarity)`,
`_weekend_weight(species, rarity, weight, ts)` (alle intern, ungrantet).
Spiegel: `src/weekendBoost.js` (`WEEKEND_WEAK_SPECIES`, `WEEKEND_WEAK_FACTOR`,
`WEEKEND_RARE_RARITIES`, `WEEKEND_RARE_FACTOR`, `weekendFactor`, `isWeekendBoost`).

### Einmaliger Hinweis

`player_notices (user_id, notice_key, seen_at)` merkt sich, wer einen Hinweis
gesehen hat. RLS an, nur eigene Zeilen lesbar, Schreiben nur über
`notice_ack(p_key)` (bekannte Schlüssel: `weekend_boost`).

`weekend_boost_status()` liefert `active`, `starts_at`, `ends_at`,
`notice_seen`, die Truhen-Chance auf seltene Tiere normal/am Wochenende und
`server_now`.

`WeekendBoostModal.vue` (global in `App.vue`, nach Autoklicker-Prüfung und
Regelwerk, erst nach dem Tutorial) erklärt den Bonus genau einmal pro Spieler
— serverseitig gespeichert, also auch auf einem zweiten Gerät nicht erneut.
Am Wochenende zeigen Shop und Ticket-Shop zusätzlich ein Banner.
