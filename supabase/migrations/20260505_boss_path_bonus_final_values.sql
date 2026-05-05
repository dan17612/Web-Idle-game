-- Finaler Endstand für Boss-Pfad-Bonus-Etappen 16-20.
-- Die Werte bleiben vollständig in Supabase änderbar.

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
    (16, 24000, 360,  6,  8::numeric, 15, null::text, 'normal', 0),
    (17, 27000, 390,  7,  9::numeric, 17, null::text, 'normal', 0),
    (18, 30000, 420,  8, 10::numeric, 20, null::text, 'normal', 0),
    (19, 33000, 450,  9, 11::numeric, 22, null::text, 'normal', 0),
    (20, 36000, 480, 10, 12::numeric, 25, null::text, 'normal', 0)
  ) as v(stage, hp, time_seconds, chest_qty, boost_mult, boost_minutes, pet_species, pet_tier, pet_qty)
 where public.boss_path_stage_configs.stage = v.stage;
