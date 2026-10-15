-- Zucht-Ei aus dem Shop: alle vier Zucht-Arten, Brachiosaurus mit 0,5 %.
-- Spec: docs/superpowers/specs/2026-10-15-zucht-ei-boost-warteschlange-design.md
--
-- Gewichte auf 200 skaliert, damit 0,5 % als ganze Zahl passt.
-- Spiegel: SHOP_EGG_WEIGHTS in src/breeding.js (src/eggBoostSql.test.js).
-- Preis und Brutzeit bleiben die einer Verpaarung mit SHOP_EGG_POWER (3).

insert into public.egg_drop_pool (egg_type, species, weight) values
  ('breeding', 'hedgehog',      133),
  ('breeding', 'leopard',        56),
  ('breeding', 'gorilla',        10),
  ('breeding', 'brachiosaurus',   1)
on conflict (egg_type, species) do update set weight = excluded.weight;
