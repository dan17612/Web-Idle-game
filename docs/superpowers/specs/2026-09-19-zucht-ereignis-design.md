# Zucht-Ereignis — Design

## Ziel

Ein Spieler hat sich gewünscht, was Dragon City macht: zwei Tiere auswählen,
daraus ein Ei bekommen, das Ei ausbrüten. Die Seltenheit der Eltern soll
bestimmen, was dabei herauskommt.

Zucht liefert **ausschließlich Arten, die es sonst nirgends gibt**. Vier neue
Spezies, angelegt in `20260920_zucht_arten.sql`, mit `enabled = false`,
`shop_visible = false`, `craft_only = true` und ohne Craft-Rezept — damit
weder im Shop, noch in der Truhe, noch über Craft, Boss-Pfad oder Merge
erreichbar:

| Spezies | Seltenheit | Rate/s | Freilass-Wert |
|---|---|---|---|
| Igel 🦔 | rare | 8 000 | 1,8 Mio |
| Leopard 🐆 | epic | 400 000 | 90 Mio |
| Gorilla 🦍 | legendary | 2 500 000 | 1,5 Mrd |
| Brachiosaurus 🦕 | legendary | 15 000 000 | 17 Mrd |

**Nur der Brachiosaurus überholt das Spiel, und knapp:** 15 Mio/s gegen die
14 Mio/s der Weltenschildkröte (+7 %). Der Gorilla bleibt mit 2,5 Mio/s unter
dem Mammut (4 Mio/s), dem besten Shop-Tier; Leopard und Igel füllen Lücken in
der bestehenden Rate-Leiter. Damit ist genau ein Tier die Spitze, statt einer
ganzen Stufe, die den Shop entwertet.

### Korrektur vom 20.09.2026

Der erste Wurf hat acht bestehende Arten als „exklusiv" ausgegeben — Flamingo,
Skorpion, Eule, Bär, Einhorn, Phönix, Kraken, Weltenschildkröte. Die gibt es
aber alle woanders: sechs über Craft-Rezepte, vier über den Boss-Pfad, drei
als Merge-Mythics. Das Versprechen war damit nicht eingelöst und die
Weltenschildkröte (3,5x Mammut) war als Zuchtpreis zu stark. Die acht bleiben
über ihre bisherigen Quellen erhalten, sind aber nicht mehr Teil der Zucht.

## Ablauf

Drei Schritte, wie gewünscht („zwei Tiere auswählen und dadurch Eier zum
Ausbrüten bekommen"):

1. **Verpaaren** — zwei eigene Tiere wählen, Münzen zahlen. Der Server
   würfelt sofort das Ergebnis und legt ein Zucht-Ei ins Inventar. Beide
   Eltern bekommen eine Abklingzeit und können solange nicht erneut züchten.
2. **Ausbrüten** — das Ei kommt in den vorhandenen Brutkasten
   (`start_incubation`). Ein Platz, wie bisher; mehrere Eier warten.
3. **Schlüpfen** — `claim_hatched` wie gehabt.

Die Eltern bleiben erhalten. Das Risiko ist Zeit, nicht Verlust — bewusst
gegen das Verbrauchen-Modell der Fusions-Maschine, weil Spieler ungern
Lieblingstiere opfern.

## Zuchtkraft

Ein Wert pro Tier aus Seltenheit und Stufe:

```
kraft(tier) = seltenheit + stufe
  seltenheit: common 0, uncommon 1, rare 2, epic 3, legendary 4
  stufe:      normal 0, gold 0.5, diamond 1, epic 1.5, rainbow 2
```

Zuchtkraft eines Paares `P = kraft(A) + kraft(B)`, also 0 bis 12.

## Ergebnis-Tabelle

Vier Arten, vier Stufen, je eine Art pro Stufe. Die Gewichte stehen je ganzer
Zuchtkraft, nicht in Bereichen — jede Zeile summiert auf 100, ist also direkt
Prozent und im Client ohne Rechnerei anzeigbar.

| Zuchtkraft | Igel | Leopard | Gorilla | Brachiosaurus |
|---|---|---|---|---|
| 0 | 88 | 12 | 0 | 0 |
| 1 | 82 | 17 | 1 | 0 |
| 2 | 75 | 22 | 3 | 0 |
| 3 | 67 | 28 | 5 | 0 |
| 4 | 58 | 34 | 8 | 0 |
| 5 | 49 | 39 | 11 | 1 |
| 6 | 40 | 43 | 16 | 1 |
| 7 | 32 | 45 | 21 | 2 |
| 8 | 25 | 45 | 27 | 3 |
| 9 | 19 | 43 | 34 | 4 |
| 10 | 14 | 39 | 42 | 5 |
| 11 | 10 | 33 | 50 | 7 |
| 12 | 6 | 26 | 58 | 10 |

**Warum je Punkt und nicht je Bereich:** vorher lagen Zuchtkraft 0 und 2 im
selben Bereich, kosteten aber 50 Mio. gegen 450 Mio. Gleiche Chancen zum
neunfachen Preis — die schwächsten Eltern zu verpaaren war damit immer die
beste Wahl und die ganze Zuchtkraft-Mechanik wirkungslos. Jetzt kauft jeder
Punkt messbar bessere Chancen.

Der Brachiosaurus bleibt selbst bei perfekten Eltern bei 10 % und taucht unter
Zuchtkraft 5 gar nicht auf. Zwei Rainbow-Legendäre zu besitzen ist ohnehin
Endgame.

## Kosten und Zeiten

```
kosten(P)  = 50_000_000 * (P + 1)²      →  50 Mio bei P=0, 8,45 Mrd bei P=12
brutzeit(P) = 30 + P * 15 Minuten        →  30 min bei P=0, 3,5 h bei P=12
```

Die Abklingzeit der Eltern entspricht der Brutzeit. Kosten sind an Shop-Preise
angelehnt (Mammut 2,5 Mrd, Weltenschildkröte 15 Mrd), damit die Zucht eine
echte Münzsenke ist und nicht nur Wartezeit. Bei voller Zuchtkraft kostet ein
Verpaaren 8,45 Mrd — der Brachiosaurus ist mit 10 % also eine Endgame-Senke,
keine Abkürzung.

## Datenmodell

Die Zucht setzt auf dem vorhandenen Eier-System auf, statt ein zweites danebenzustellen:

| Änderung | Zweck |
|---|---|
| `player_eggs.bred_species text` | Bei Zucht-Eiern steht das Ergebnis schon fest. `start_incubation` würfelt dann nicht, sondern übernimmt den Wert. |
| `player_eggs.bred_minutes int` | Brutzeit dieses Eis, statt der festen Zeit aus `egg_types`. |
| `animals.breeding_until timestamptz` | Abklingzeit des Elterntiers. |
| `egg_types`-Zeile `breeding` | Zucht-Ei 🐣, `shop_visible = false` — nicht kaufbar, entsteht nur durch Verpaarung. |

Warum das Ergebnis schon beim Verpaaren feststeht: `start_incubation` macht es
für gekaufte Eier genauso (es schreibt `hatched_species` beim Start). Damit
bleibt genau eine Stelle, an der gewürfelt wird, und der Spieler kann das
Ergebnis nicht durch wiederholtes Einlegen neu ziehen.

## RPCs

| Funktion | Zweck |
|---|---|
| `_breed_power(p_species, p_tier)` | Zuchtkraft eines Tieres. Intern. |
| `_breed_cost(p_power)` | Münzkosten. Intern. |
| `_breed_minutes(p_power)` | Brutzeit. Intern. |
| `_breed_weights(p_power)` | Gewichtszeile je ganzer Zuchtkraft. Intern. |
| `_breed_tier_species(p_tier)` | Arten einer Stufe. Intern. |
| `_breed_roll(p_power)` | Zieht die Spezies nach der Gewichtstabelle. Intern. |
| `breed_animals(p_a uuid, p_b uuid)` | Prüft Besitz, Verschiedenheit, Abklingzeit, Ereignis und Guthaben; bucht ab, legt das Ei an, setzt die Abklingzeit. Liefert absolute `coins` und `server_now`. |
| `get_breeding_status()` | Eigene Tiere mit Zuchtkraft und Abklingzeit, aktuelle Kosten, Ereignis-Zustand. |

`start_incubation` wird erweitert: liegt `bred_species` vor, übernimmt sie
statt zu würfeln, und `bred_minutes` schlägt `egg_types.incubation_minutes`.

Alles `security definer set search_path = public`, Grants nur für
`authenticated`, Helfer mit `_`-Präfix bleiben ungrantet.

## Ereignis

Zucht ist ein Ereignis im Sinne des Event-Hubs: Schlüssel `breeding_game` in
`event_schedule`, laufend und ohne Enddatum. `breed_animals` prüft
`event_is_active('breeding_game')`. Die Karte erscheint unter „Ereignisse" auf
der Startseite, Route `/breeding`.

## Oberfläche

`BreedingView.vue`, Muster wie `ParkourGameView` (lokales `I18N`, `tx()`):

- Zwei Auswahlfelder für die Eltern, je ein Raster der eigenen Tiere. Tiere
  mit laufender Abklingzeit sind gesperrt und zeigen die Restzeit.
- Zwischen den Eltern die Zuchtkraft, darunter Kosten und Brutzeit.
- Eine Chancen-Vorschau je Art mit Balken und Prozentwert, gespiegelt aus
  `src/breeding.js` — kein Server-Aufruf beim Auswählen.
- Der Zucht-Knopf ist gesperrt, solange nicht zwei verschiedene freie Tiere
  gewählt sind oder das Guthaben fehlt.
- Nach Erfolg ein Hinweis auf das neue Ei und ein Link zum Brutkasten.

## Reward-Spiegel

Wie bei Drift, Parkour und Wordle liegen die Formeln doppelt:
`src/breeding.js` (`breedPower`, `breedCost`, `breedMinutes`, `breedWeights`)
und die SQL-Helfer. `src/breedingSql.test.js` liest beide und vergleicht sie
über den gesamten Wertebereich.

## Tests

| Datei | Prüft |
|---|---|
| `src/breeding.test.js` | Zuchtkraft je Seltenheit/Stufe, Kosten, Brutzeit, Gewichte summieren auf 100, Randfälle |
| `src/breedingSql.test.js` | SQL und JS decken sich (immer die jüngste Definition); Grants, `search_path`, Ereignis-Gating, Helfer ungrantet; die vier Arten sind unkaufbar und halten die Rate-Leitplanken |
