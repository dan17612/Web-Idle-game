-- Fügt 5 weitere Boss-Pfad-Etappen (16–20) hinzu.
-- Bonus-Etappen nach Level 15: mehr Truhen, aber schwächere garantierte Belohnungen.

insert into public.boss_path_stage_configs
  (stage, species, name, terrain, hp, time_seconds, chest_qty, boost_mult, boost_minutes, pet_species, pet_tier, pet_qty)
values
  (16, 'phoenix',      'Flammen-Phönix',   'volcano_peak', 24000, 360, 6,  8, 15, null, 'normal', 0),
  (17, 'unicorn',      'Sternen-Einhorn',  'cosmos',       27000, 390, 7,  9, 17, null, 'normal', 0),
  (18, 'kraken',       'Tiefsee-Kraken',   'deep_ocean',   30000, 420, 8, 10, 20, null, 'normal', 0),
  (19, 'jormungandr',  'Welt-Schlange',    'void',         33000, 450, 9, 11, 22, null, 'normal', 0),
  (20, 'dragon',       'Omega-Drache',     'divine',       36000, 480, 10, 12, 25, null, 'normal', 0)
on conflict (stage) do nothing;
