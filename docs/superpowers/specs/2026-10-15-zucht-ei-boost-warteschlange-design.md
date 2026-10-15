# Zucht-Eier mit sichtbarer Zuchtkraft und Warteschlange — Design

**Datum:** 2026-10-15
**Migration:** `supabase/migrations/20261015_zucht_ei_boost.sql`

## Anlass

Spielermeldung am 15.10.: „Hast du die Chancen bei den Zucht-Eiern verändert?
Ich kriege nur Leoparden und Gorillas.“

Die Chancen haben sich nicht geändert. Seit dem 14.10. gibt es aber zwei Quellen
für dasselbe Item `breeding` („Zucht-Ei“):

| Quelle | Zuchtkraft | Igel | Leopard | Gorilla | Brachiosaurus | Brutzeit |
|---|---|---|---|---|---|---|
| Shop (`egg_drop_pool`) | 3 (fest) | 67 % | 28 % | 5 % | 0 % | 75 Min |
| Zucht, seltene Eltern | bis 12 | 6 % | 26 % | 58 % | 10 % | 210 Min |

Die Eier-Maschine fasst alle Eier nach `egg_type` zusammen. Ein Spieler mit
Shop-Ei und gezüchteten Eiern sieht also einen Stapel „Zucht-Ei ×3“, die Anzeige
nennt 75 Min, und die Shop-Info zeigt 67 % Igel. Ausgebrütet wird dann das
älteste Ei, meist ein gezüchtetes mit Kraft 12, und es schlüpfen Gorillas und
Leoparden. Das wirkt wie geänderte Chancen.

## Idee: Zucht als Boost, Eier als Warteschlange

Wer in der Zucht seltene Tiere verpaart, „lädt“ damit seine nächsten Zucht-Eier
auf. Das passiert technisch schon heute (das Ergebnis wird beim Verpaaren
gewürfelt), war aber unsichtbar. Neu:

1. **Jedes Zucht-Ei trägt seine Zuchtkraft** (`player_eggs.bred_power`).
   `breed_animals` speichert sie, Altbestand wird aus `bred_minutes`
   zurückgerechnet (`(min − 30) / 15`, auf halbe Punkte gerundet). Shop-Eier
   bleiben `null` und gelten als Kraft `SHOP_EGG_POWER` (3).
2. **Eier-Maschine trennt nach Boost:** Zucht-Eier werden nach Zuchtkraft
   gruppiert („Zucht-Ei ⚡12 ×96“, „Zucht-Ei ⚡3 ×1“). Höchster Boost zuerst,
   innerhalb einer Gruppe das älteste Ei zuerst (Warteschlange).
3. **Vorschau pro Gruppe:** Für die gewählte Gruppe zeigt die Maschine die
   Chancen (`breedChances(power)`) und die echte Brutzeit
   (`breedMinutes(power)`) statt der Shop-Brutzeit.
4. **Shop-Info:** Unter den Drop-Chancen des Zucht-Eis steht, dass sie nur für
   Shop-Eier (Zuchtkraft 3) gelten und gezüchtete Eier die Chancen ihrer Eltern
   behalten.

## Was sich nicht ändert

- Gewichte, Kosten, Brutzeiten und der Shop-Pool bleiben gleich.
- Das Ergebnis eines gezüchteten Eis steht weiter beim Verpaaren fest
  (`bred_species`); `bred_power` dient nur der Anzeige.
- Brutplätze, `start_incubation` und `claim_hatched` bleiben unverändert.

## Tests

- `src/eggQueue.test.js`: Gruppierung, Reihenfolge, Shop-Fallback auf Kraft 3,
  Chancen und Brutzeit pro Gruppe.
- `src/eggBoostSql.test.js`: Spalte, Rückrechnung aus `bred_minutes`,
  `breed_animals` schreibt `bred_power`, Prüfungen und Grants bleiben.
