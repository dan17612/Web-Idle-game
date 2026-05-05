-- Schwierigkeit der Boss-Pfad-Bonus-Etappen an Level 15 ausrichten.
-- Level 15 live: 20.000 HP in 300 Sekunden. 16-20 haben mehr HP und mehr Zeit,
-- mit nur leicht höherem benötigtem Schaden pro Sekunde.

update public.boss_path_stage_configs
   set hp = v.hp,
       time_seconds = v.time_seconds
  from (values
    (16, 24000, 360),
    (17, 27000, 390),
    (18, 30000, 420),
    (19, 33000, 450),
    (20, 36000, 480)
  ) as v(stage, hp, time_seconds)
 where public.boss_path_stage_configs.stage = v.stage;
