-- Neue Tiere: 4 Shop-Tiere füllen Lücken in der Kosten-Kurve, 3 Craft-Tiere mit Rezepten.
-- Balance-Leitplanken, damit die Economy intakt bleibt:
-- * Shop: Amortisationszeit (cost/rate) bleibt entlang der Kosten monoton steigend
--   (Fuchs 197s, Wolf 222s, Hai 357s, Mammut 625s); kein neues Tier dominiert ein
--   bestehendes (mehr Rate für weniger Kosten gibt es nicht).
-- * Truhe: kleine Gewichte analog zu den Nachbarn (Hai 0.5 < Jörmungandr 0.7,
--   Mammut 0.1 < Wal 0.25), damit der Erwartungswert pro Truhe kaum steigt.
-- * Craft: Output-Rate <= Summe der Input-Raten (Slot-Konsolidierung statt
--   Einkommens-Inflation); Ticket-Wert beim Freilassen (cost * tier / 2) max ~3x
--   des Input-Release-Werts - im Rahmen der bestehenden Rezepte (Bär, Einhorn).

insert into public.species_costs
  (species, name, emoji, cost, rate, weight, enabled, shop_visible, craft_only, rarity)
values
  ('fox',         'Fuchs',             '🦊', 75000,       380,      15,  true,  true,  false, 'uncommon'),
  ('wolf',        'Wolf',              '🐺', 2000000,     9000,     4,   true,  true,  false, 'rare'),
  ('shark',       'Hai',               '🦈', 250000000,   700000,   0.5, true,  true,  false, 'legendary'),
  ('mammoth',     'Mammut',            '🦣', 2500000000,  4000000,  0.1, true,  true,  false, 'legendary'),
  ('flamingo',    'Flamingo',          '🦩', 30000,       150,      0.1, false, false, true,  'rare'),
  ('owl',         'Eule',              '🦉', 2500000,     4200,     0.1, false, false, true,  'epic'),
  ('worldturtle', 'Weltenschildkröte', '🐢', 15000000000, 14000000, 0.1, false, false, true,  'legendary')
on conflict (species) do update set
  name = excluded.name,
  emoji = excluded.emoji,
  cost = excluded.cost,
  rate = excluded.rate,
  weight = excluded.weight,
  enabled = excluded.enabled,
  shop_visible = excluded.shop_visible,
  craft_only = excluded.craft_only,
  rarity = excluded.rarity;

-- Rezepte: Flamingo als Early-Game-Ziel (Rainbow-Hühner bekommen einen Zweck),
-- Eule als Midgame-Konsolidierung, Weltenschildkröte als Endgame-Senke mit der
-- höchsten Single-Slot-Rate (aber unter der Summe ihrer Zutaten).
insert into public.craft_recipes (name, output_species, ingredients, enabled)
select v.name, v.output_species, v.ingredients::jsonb, true
from (values
  ('Flamingo',          'flamingo',    '[{"species":"chicken","tier":"rainbow","qty":4}]'),
  ('Eule',              'owl',         '[{"species":"sheep","tier":"rainbow","qty":3}]'),
  ('Weltenschildkröte', 'worldturtle', '[{"species":"dragon","tier":"rainbow","qty":2},{"species":"jormungandr","tier":"rainbow","qty":1}]')
) as v(name, output_species, ingredients)
where not exists (
  select 1 from public.craft_recipes r where r.output_species = v.output_species
);
