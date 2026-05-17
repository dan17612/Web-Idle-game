-- Memory-Minispiel: 10 zusaetzliche Level (21-30), deutlich schwerer.
-- Maximal 17 Paare, da nur 17 gewichtete Arten existieren (sonst doppelte Emojis).
-- Schwierigkeit kommt vor allem ueber sehr knappe Zuglimits.

insert into public.memory_level_configs
  (level, pairs, move_limit, chest_qty, reward_species, reward_tier, reward_qty)
values
  (21, 16, 30, 6, null,          'normal',  0),
  (22, 16, 28, 6, null,          'normal',  0),
  (23, 16, 26, 6, null,          'normal',  0),
  (24, 17, 27, 7, null,          'normal',  0),
  (25, 17, 26, 7, 'jormungandr', 'gold',    1),
  (26, 17, 25, 7, null,          'normal',  0),
  (27, 17, 24, 8, null,          'normal',  0),
  (28, 17, 23, 8, null,          'normal',  0),
  (29, 17, 22, 9, null,          'normal',  0),
  (30, 17, 21, 10, 'dragon',     'rainbow', 1)
on conflict (level) do update
  set pairs = excluded.pairs,
      move_limit = excluded.move_limit,
      chest_qty = excluded.chest_qty,
      reward_species = excluded.reward_species,
      reward_tier = excluded.reward_tier,
      reward_qty = excluded.reward_qty;
