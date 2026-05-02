-- Fügt 5 weitere Boss-Pfad-Etappen (16–20) hinzu.
-- Mythische Endbosse mit stark steigenden HP und Belohnungen.

insert into public.boss_path_stage_configs
  (stage, species, name, terrain, hp, time_seconds, chest_qty, boost_mult, boost_minutes, pet_species, pet_tier, pet_qty)
values
  (16, 'phoenix',      'Flammen-Phönix',   'volcano_peak', 26000, 180, 5, 15, 35, 'phoenix',      'gold',    1),
  (17, 'unicorn',      'Sternen-Einhorn',  'cosmos',       33000, 180, 6, 18, 40, 'unicorn',      'gold',    1),
  (18, 'kraken',       'Tiefsee-Kraken',   'deep_ocean',   42000, 180, 6, 20, 45, null,           'normal',  0),
  (19, 'jormungandr',  'Welt-Schlange',    'void',         53000, 180, 7, 22, 50, null,           'normal',  0),
  (20, 'dragon',       'Omega-Drache',     'divine',       70000, 180, 8, 30, 60, 'dragon',       'diamond', 1)
on conflict (stage) do nothing;
