-- Zucht-Ereignis, Nachbesserung: eigene Arten statt geliehener.
--
-- Die bisherigen acht "Zucht-Arten" gibt es alle aus anderen Quellen:
-- Flamingo, Eule, Bär, Einhorn, Phönix und Weltenschildkröte über Craft-Rezepte,
-- Skorpion, Phönix, Einhorn und Kraken über den Boss-Pfad, dazu Phönix, Einhorn
-- und Kraken als Merge-Mythics. Das Versprechen der Zucht ("eine Art, die es
-- sonst nirgends gibt") war damit nicht eingelöst.
--
-- Stattdessen vier neue Arten, die ausschließlich aus der Zucht kommen:
-- enabled = false (keine Shop-Rotation), shop_visible = false, craft_only = true
-- (blockt buy_animal), kein Craft-Rezept. Die Truhe zieht nur aus
-- "enabled and weight > 0 and not craft_only", greift hier also doppelt nicht;
-- weight bleibt trotzdem auf dem Minimum, weil species_costs weight > 0 erzwingt.
--
-- Balance-Leitplanken:
-- * Nur der Brachiosaurus überholt das stärkste Tier des Spiels, und das knapp:
--   15.000.000/s gegen 14.000.000/s der Weltenschildkröte (+7%).
-- * Gorilla (2.500.000/s) bleibt unter dem Mammut (4.000.000/s), dem besten
--   Shop-Tier; Leopard und Igel sitzen in bestehenden Lücken der Rate-Leiter.
-- * cost/rate bleibt entlang der Kosten monoton: Igel 225s, Leopard 225s,
--   Gorilla 600s, Brachiosaurus 1133s (Mammut 625s, Weltenschildkröte 1071s).
--   cost ist hier nur noch Freilass-Wert, gekauft werden kann keines der vier.
--
-- Achtung Reward-Spiegel: _breed_weights und _breed_tier_species leben doppelt,
-- hier und in src/breeding.js. src/breedingSql.test.js vergleicht beide Seiten
-- und liest dabei immer die jüngste Definition.

-- 1) Die vier Zucht-Arten
insert into public.species_costs
  (species, name, emoji, cost, rate, weight, enabled, shop_visible, craft_only, rarity)
values
  ('hedgehog',       'Igel',           '🦔', 1800000,     8000,     0.1, false, false, true, 'rare'),
  ('leopard',        'Leopard',        '🐆', 90000000,    400000,   0.1, false, false, true, 'epic'),
  ('gorilla',        'Gorilla',        '🦍', 1500000000,  2500000,  0.1, false, false, true, 'legendary'),
  ('brachiosaurus',  'Brachiosaurus',  '🦕', 17000000000, 15000000, 0.1, false, false, true, 'legendary')
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

-- 2) Vier Stufen statt fünf, je genau eine Art.
create or replace function public._breed_tier_species(p_tier int)
returns text[] language sql immutable set search_path = public as $$
  select case p_tier
    when 1 then array['hedgehog']
    when 2 then array['leopard']
    when 3 then array['gorilla']
    when 4 then array['brachiosaurus']
    else array[]::text[]
  end;
$$;

-- 3) Gewichte je ganzer Zuchtkraft statt in fünf groben Bereichen.
--
-- Vorher lagen 0 und 2 im selben Bereich: gleiche Chancen, aber 9x Kosten
-- (50 Mio. gegen 450 Mio.). Schwächste Eltern zu verpaaren war damit immer
-- die beste Wahl. Jetzt kauft jeder Punkt Zuchtkraft messbar bessere Chancen.
-- Jede Zeile summiert auf 100, ist also direkt in Prozent lesbar.
create or replace function public._breed_weights(p_power numeric)
returns int[] language sql immutable set search_path = public as $$
  select case floor(least(12, greatest(0, p_power)))
    when 0  then array[88, 12,  0,  0]
    when 1  then array[82, 17,  1,  0]
    when 2  then array[75, 22,  3,  0]
    when 3  then array[67, 28,  5,  0]
    when 4  then array[58, 34,  8,  0]
    when 5  then array[49, 39, 11,  1]
    when 6  then array[40, 43, 16,  1]
    when 7  then array[32, 45, 21,  2]
    when 8  then array[25, 45, 27,  3]
    when 9  then array[19, 43, 34,  4]
    when 10 then array[14, 39, 42,  5]
    when 11 then array[10, 33, 50,  7]
    else         array[ 6, 26, 58, 10]
  end;
$$;

-- 4) Der Würfel läuft jetzt über vier Stufen.
create or replace function public._breed_roll(p_power numeric)
returns text language plpgsql volatile set search_path = public as $$
declare
  w int[] := public._breed_weights(p_power);
  roll int := 1 + floor(random() * 100)::int;
  acc int := 0;
  i int;
  arten text[];
begin
  for i in 1..4 loop
    acc := acc + w[i];
    if roll <= acc then
      arten := public._breed_tier_species(i);
      if array_length(arten, 1) is null then continue; end if;
      return arten[1 + floor(random() * array_length(arten, 1))::int];
    end if;
  end loop;
  -- Sollte die Summe je unter 100 rutschen: auf die unterste Stufe zurückfallen.
  return (public._breed_tier_species(1))[1];
end $$;

-- 5) Helfer bleiben intern (create or replace erhält Rechte, hier trotzdem explizit).
revoke execute on function public._breed_tier_species(int) from anon, authenticated, public;
revoke execute on function public._breed_weights(numeric) from anon, authenticated, public;
revoke execute on function public._breed_roll(numeric) from anon, authenticated, public;
