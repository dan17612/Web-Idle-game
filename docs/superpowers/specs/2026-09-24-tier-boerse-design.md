# Zoo-Börse — Marktwert & Handel wie an einer Krypto-Börse

## Ziel

Jedes Tier (Art × Stufe) bekommt einen **Marktwert**, der sich wie ein
Krypto-Kurs bewegt. Spieler bieten Tiere zu einem selbst gewählten Preis zum
Verkauf an (Sell-Order / „Ask"), andere Spieler **akzeptieren** das Angebot
und kaufen es. Es gibt **keinen** Kauf vom System — jeder Handel ist
Spieler-zu-Spieler. Die Ansicht sieht aus wie eine Börse: Ticker-Laufband,
Kurs-Charts, grün/rote Prozent-Pillen, Orderbuch mit Tiefenbalken,
Trade-Historie, Portfolio-Wert.

Route: `/market` (flach, lazy, `meta: { auth: true }`). Einstieg über
Quick-Action-Kachel + Event-Karte in `GameView` und einen Link im Trade-Screen.

## Wertformel (server-autoritativ, Spiegel in `src/market.js`)

Pro Markt `(species, tier)`:

1. **Basiswert** (Fundamentalwert einer Art, Stufe `normal`)
   `base = max(cost, rate × 200, craftInput)`
   - `cost` = Shop-/Freilasspreis aus `species_costs`
   - `rate × 200` = Nutzwert (≈ 200 s Einkommen); fängt Arten mit
     Platzhalter-Kosten ab (Safari-Ei-Tiere haben `cost = 1`)
   - `craftInput` = Summe der Rezept-Zutaten (Zutat-Basiswert × Stufenmenge)
   Stufe: `× max(1, required_qty)` (Gold = 3, Diamant = 6, Episch = 9,
   Regenbogen = 12 normale Tiere werden dafür verbraucht).

2. **Knappheit** `K ∈ [0, 1]` — wie viele Spieler das Tier besitzen
   `K = 1 − sqrt(holders / players)`
   `players` = Spieler mit mindestens einem Tier (ohne Gebannte),
   `holders` = Spieler, die diesen Markt besitzen. Keiner hat es → `K = 1`.

3. **Beschaffbarkeit** `E ∈ [0, 1]` — wie leicht man es (noch) bekommt
   `easeFromChance(p) = clamp((log10(p) + 4) / 3, 0, 1)`
   (10 % ⇒ 1, 1 % ⇒ 0,67, 0,1 % ⇒ 0,33, ≤ 0,01 % ⇒ 0)
   - Truhe/Shop: `p = weight / Σ weight` aller Truhen-Arten
     (`enabled and weight > 0 and not craft_only`)
   - Ei: `0,8 × easeFromChance(eiGewicht / Pool-Summe)` (aktive Ei-Typen)
   - Zucht (nur solange das Zucht-Event läuft):
     `0,6 × easeFromChance(Chance bei Referenz-Zuchtkraft 6)`
   - Crafting: `0,5 × min(E der Zutat-Arten)`
   - Art mit `disappears_at` in der Zukunft: `× 0,5`
   - Keine Quelle mehr (ausgelaufen, Limited Edition) ⇒ `E = 0`
   Stufe: `E × (1 − 0,1 × order)`.

4. **Modellwert**
   `model = base × stufe × (1 + 3 × K × (1 − E))`
   Knappheit zählt also nur so weit, wie das Tier schwer zu beschaffen ist:
   Ein Truhen-Tier mit hoher Drop-Chance, das zufällig niemand besitzt,
   bleibt nahe am Basiswert; ein ausgelaufenes Tier, das kaum jemand hat,
   ist bis zu 4× so viel wert.

5. **Marktsignal** (echte Trades der letzten 7 Tage)
   Median `m` der Füll-Preise, geklemmt auf `[model / 4, model × 4]`
   (Schutz gegen Wash-Trading zwischen Zweit-Accounts),
   Gewicht `w = min(0,5; 0,1 × Anzahl Trades)`:
   `value = exp((1 − w) · ln(model) + w · ln(m))`.

## Kursverlauf

- `market_snapshots(bucket, species, tier, value, supply)` — stündlich.
  Geschrieben lazy beim Aufruf von `market_overview()` (erster Aufruf pro
  Stunde), Aufräumen > 35 Tage.
- Backfill bei der Migration: Modellwert zum Zeitpunkt `t` mit allen heute
  existierenden Tieren, die `acquired_at <= t` haben (alle 6 h für 14 Tage,
  danach täglich bis 30 Tage).
- 24h-Änderung = aktueller Wert vs. letzter Snapshot ≤ jetzt − 24 h.
- Sparklines: 28 Punkte (6-h-Raster über 7 Tage), carry-forward — damit
  lassen sich Portfolio-Sparklines clientseitig aufsummieren.

## Handel

Tabellen (RLS an, nur Select-Policies, Schreiben nur via RPC):

- `market_listings` — ein Angebot = ein Tier. `seller_id`, `animal_id`,
  `species`, `tier`, `price`, `status open|sold|cancelled`, `buyer_id`.
  Partieller Unique-Index: pro Tier höchstens ein offenes Angebot.
  Select-Policy: nur eigene Zeilen (das öffentliche Orderbuch kommt per RPC).
- `market_fills` — ausgeführte Trades (Preis, Käufer, Verkäufer, Zeit).
  Select-Policy: Käufer oder Verkäufer.

Ein Angebot ist nur **gültig**, solange das Tier dem Verkäufer gehört, nicht
ausgerüstet ist, nicht upgradet und nicht in der Zucht steckt, und der
Verkäufer nicht gebannt ist. Ungültige Angebote tauchen im Orderbuch nicht
auf; der Verkäufer sieht sie als „ungültig" und kann sie zurückziehen.

RPCs (`security definer set search_path = public`, nur `authenticated`):

| RPC | Zweck |
| --- | --- |
| `market_overview()` | alle Märkte mit Wert, Formel-Teilen, Umlauf, 24h-Änderung, Sparkline, bestem Ask, Volumen; eigene Angebote; schreibt ggf. Snapshot |
| `market_book(p_species, p_tier, p_range)` | Chart-Punkte (`24h`/`7d`/`30d`), letzte Trades, gültige Asks (mit Verkäufername), Marktdaten |
| `market_list(p_animal_ids, p_price)` | bis zu 25 eigene Tiere zum Stückpreis anbieten (max. 60 offene Angebote) |
| `market_cancel(p_listing_ids)` | eigene Angebote zurückziehen |
| `market_buy(p_listing_ids)` | Angebote akzeptieren: Münzen Käufer → Verkäufer, Tiere → Käufer (abgerüstet), Fill + `transactions(kind = 'market')` |

Kauf ist atomar: alle Angebote werden `for update` gesperrt, jedes muss offen
und gültig sein, nicht vom Käufer selbst; die Münzen werden mit
`coins >= total` abgebucht. Antwort mit absolutem `coins` + `server_now`.
Ist das verkaufte Tier der Liebling des Verkäufers, springt der Liebling auf
ein anderes Tier (wie beim Freilassen).

Keine Gebühr, kein Ablauf (Good-till-cancelled).

## UI (`MarketView.vue`)

- Kopf: Titel, LIVE-Punkt, Ticker-Laufband (Top-Märkte mit ▲/▼ %).
- Portfolio-Karte (dunkles „Terminal"-Panel): Gesamtwert aller eigenen Tiere
  zum Marktwert, 24h-Änderung, Sparkline, Marktkapitalisierung, Spieler.
- Filter-Chips: Alle · Gewinner · Verlierer · Selten · Angebote · Meine,
  Suche, Sortierung.
- Marktliste: Emoji mit Stufen-Ring, Name + Ticker-Symbol, Umlauf,
  Sparkline, Kurs, Prozent-Pille.
- Detail-Overlay (Teleport): großer Kurs mit Flash-Animation, SVG-Chart mit
  Verlauf, Fadenkreuz und Trade-Punkten, Zeitraum 24H/7T/30T, Kennzahlen,
  Formel-Aufschlüsselung, Orderbuch (nach Preis gruppiert, Tiefenbalken,
  „Kaufen"), Trade-Tape, Verkaufs-Formular (Menge, Preis mit
  −10 %/Marktwert/+10 %/+25 %, Abweichung zum Marktwert), eigene Angebote.
- Kauf-Bestätigung zeigt „x % unter/über Marktwert".
- Live-Gefühl: Polling alle 20 s nur bei `visibilityState === 'visible'`,
  `useReturnRefresh`.
- i18n de/en/ru über lokales `I18N` + `tx()`.
- Dunkles Panel nutzt lokale Tokens (warmes Dunkelbraun, kein Navy), Grün
  `--accent-2`, Rot `--danger`.
