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

## Nachtrag: Shop-Zucht-Ei mit allen Zucht-Arten

Wunsch: Im Shop sollen alle Zucht-Tiere möglich sein, das seltenste mit 0,5 %.
Migration `20261015_shop_zucht_ei_alle_arten.sql`, Gewichte auf 200 skaliert
(`egg_drop_pool.weight` ist ganzzahlig):

| Art | Gewicht | Chance |
|---|---|---|
| Igel | 133 | 66,5 % |
| Leopard | 56 | 28 % |
| Gorilla | 10 | 5 % |
| Brachiosaurus | 1 | 0,5 % |

Preis und Brutzeit bleiben die von Zuchtkraft 3. Da der Pool nun von
`breedWeights(3)` abweicht, bekommen Shop-Eier in der Eier-Maschine eine eigene
Gruppe („🛒 Shop“, Chancen aus `SHOP_EGG_WEIGHTS`) statt mit gezüchteten
Kraft-3-Eiern zusammenzufallen. Drop-Chancen unter 1 % werden mit einer
Nachkommastelle angezeigt (`formatDropChance`).

Börse: `_market_model` nimmt das Maximum aus `0,8 · ease(Ei)` und
`0,6 · ease(Zucht)`. Für den Brachiosaurus steigt die Beschaffbarkeit damit von
0,40 auf 0,45; sein Modellwert sinkt leicht. Endet das Zucht-Ereignis, bleibt
er über den Shop beschaffbar und gilt nicht mehr als Limited Edition.

## Was sich nicht ändert

- Zucht-Gewichte, Kosten und Brutzeiten bleiben gleich.
- Das Ergebnis eines gezüchteten Eis steht weiter beim Verpaaren fest
  (`bred_species`); `bred_power` dient nur der Anzeige.
- Brutplätze, `start_incubation` und `claim_hatched` bleiben unverändert.

## Tests

- `src/eggQueue.test.js`: Gruppierung, Reihenfolge, Shop-Fallback auf Kraft 3,
  Chancen und Brutzeit pro Gruppe.
- `src/eggBoostSql.test.js`: Spalte, Rückrechnung aus `bred_minutes`,
  `breed_animals` schreibt `bred_power`, Prüfungen und Grants bleiben.
