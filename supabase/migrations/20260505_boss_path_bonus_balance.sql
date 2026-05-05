-- Balancing für Boss-Pfad-Bonus-Etappen 16-20.
-- Diese Stufen bleiben als Zusatz nach Level 15 gedacht:
-- mehr Truhen, aber schwächere Boosts und keine garantierten Top-Pets.

update public.boss_path_stage_configs
   set hp = v.hp,
       time_seconds = v.time_seconds,
       chest_qty = v.chest_qty,
       boost_mult = v.boost_mult,
       boost_minutes = v.boost_minutes,
       pet_species = v.pet_species,
       pet_tier = v.pet_tier,
       pet_qty = v.pet_qty
  from (values
    (16, 16000, 180,  6,  8::numeric, 15, null::text, 'normal', 0),
    (17, 18000, 180,  7,  9::numeric, 17, null::text, 'normal', 0),
    (18, 20000, 180,  8, 10::numeric, 20, null::text, 'normal', 0),
    (19, 23000, 180,  9, 11::numeric, 22, null::text, 'normal', 0),
    (20, 26000, 180, 10, 12::numeric, 25, null::text, 'normal', 0)
  ) as v(stage, hp, time_seconds, chest_qty, boost_mult, boost_minutes, pet_species, pet_tier, pet_qty)
 where public.boss_path_stage_configs.stage = v.stage;
