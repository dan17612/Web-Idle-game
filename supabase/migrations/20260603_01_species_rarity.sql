-- 20260603_01_species_rarity.sql
-- Add 5-tier rarity to species_costs, backfill existing, integrate existing
-- 'giraffe' as Safari-only species (rate kept), insert 4 new safari species.

alter table public.species_costs
  add column if not exists rarity text not null default 'common'
  check (rarity in ('common','uncommon','rare','epic','legendary'));

-- Backfill existing species (adjustable later)
update public.species_costs set rarity = 'common'    where species in ('chick','chicken');
update public.species_costs set rarity = 'uncommon'  where species in ('rabbit','pig','sheep','cow');
update public.species_costs set rarity = 'rare'      where species in ('horse','scorpion');
update public.species_costs set rarity = 'epic'      where species in ('panda','tiger','lion','trex');
update public.species_costs set rarity = 'legendary'
  where species in ('peacock','dragon','unicorn','bear','phoenix','jormungandr','kraken','wahl');

-- Convert existing 'giraffe' (cost 750M, rate 1.2M/s) into Safari-only species.
-- Rate and cost are preserved; only flags and rarity change. Players who already
-- own giraffes keep their existing animals and rate.
update public.species_costs
   set enabled      = false,
       shop_visible = false,
       rarity       = 'epic'
 where species = 'giraffe';

-- Insert 4 new safari species (only obtainable via Safari Egg).
-- cost=1 is a sentinel (CHECK constraint requires > 0; species are never shop-visible).
insert into public.species_costs
  (species, name, emoji, cost, rate, weight, enabled, shop_visible, rarity)
values
  ('elephant', 'Elefant',  '🐘', 1,  100000, 1, false, false, 'common'),
  ('zebra',    'Zebra',    '🦓', 1,  250000, 1, false, false, 'uncommon'),
  ('rhino',    'Nashorn',  '🦏', 1,  500000, 1, false, false, 'rare'),
  ('hippo',    'Nilpferd', '🦛', 1, 1500000, 1, false, false, 'legendary')
on conflict (species) do nothing;
