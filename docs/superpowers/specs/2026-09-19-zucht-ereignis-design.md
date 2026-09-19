# Zucht-Ereignis — Design

## Ziel

Ein Spieler hat sich gewünscht, was Dragon City macht: zwei Tiere auswählen,
daraus ein Ei bekommen, das Ei ausbrüten. Die Seltenheit der Eltern soll
bestimmen, was dabei herauskommt.

Zucht liefert **ausschließlich Arten, die es sonst nirgends gibt**. Acht
Spezies stehen im Katalog, stammen aber aus keiner Quelle — weder Shop noch
Safari-Ei:

| Spezies | Seltenheit | Rate/s |
|---|---|---|
| Flamingo 🦩 | rare | 150 |
| Skorpion 🦂 | rare | 4 200 |
| Eule 🦉 | epic | 4 200 |
| Bär 🐻 | legendary | 300 000 |
| Einhorn 🦄 | legendary | 500 000 |
| Phönix 🦅 | legendary | 600 000 |
| Kraken 🐙 | legendary | 1 000 000 |
| Weltenschildkröte 🐢 | legendary | 14 000 000 |

Die Weltenschildkröte ist mit 14 Mio/s das stärkste Tier im Spiel — mehr als
das Dreifache des Mammuts (4 Mio/s, 2,5 Mrd im Shop). Sie muss entsprechend
selten bleiben, sonst entwertet die Zucht den ganzen Shop.

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

Die acht Exklusiven liegen auf fünf Stufen. Die Zuchtkraft verschiebt die
Gewichte; innerhalb einer Stufe ist die Verteilung gleich.

| Stufe | Arten | P 0–2 | P 3–5 | P 6–8 | P 9–10 | P 11–12 |
|---|---|---|---|---|---|---|
| 1 | Flamingo, Skorpion | 82 | 56 | 32 | 14 | 5 |
| 2 | Eule | 16 | 30 | 33 | 26 | 15 |
| 3 | Bär, Einhorn | 2 | 12 | 26 | 36 | 33 |
| 4 | Phönix, Kraken | 0 | 2 | 8 | 22 | 44 |
| 5 | Weltenschildkröte | 0 | 0 | 1 | 2 | 3 |

Die Gewichte summieren sich je Spalte auf 100, sind also direkt Prozent — das
macht die Vorschau im Client trivial und die Tabelle für dich lesbar.

Die Weltenschildkröte bleibt selbst bei perfekten Eltern bei 3 %. Zwei
Rainbow-Legendäre zu besitzen ist ohnehin Endgame; die 3 % sind der Bonus
obendrauf, nicht der Grund zu züchten.

## Kosten und Zeiten

```
kosten(P)  = 50_000_000 * (P + 1)²      →  50 Mio bei P=0, 8,45 Mrd bei P=12
brutzeit(P) = 30 + P * 15 Minuten        →  30 min bei P=0, 3,5 h bei P=12
```

Die Abklingzeit der Eltern entspricht der Brutzeit. Kosten sind an
Shop-Preise angelehnt (Mammut 2,5 Mrd, Weltenschildkröte 15 Mrd), damit die
Zucht eine echte Münzsenke ist und nicht nur Wartezeit.

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
- Eine Chancen-Vorschau: pro Stufe der Prozentsatz, gespiegelt aus
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
| `src/breedingSql.test.js` | SQL und JS decken sich; RLS, Grants, `search_path`, Ereignis-Gating, Helfer ungrantet |
