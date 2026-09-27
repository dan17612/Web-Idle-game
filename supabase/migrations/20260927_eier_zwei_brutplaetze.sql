-- 20260927_eier_zwei_brutplaetze.sql
-- Eier-Maschine brütet zwei Eier gleichzeitig (Brutplatz 1 und 2).
-- Spec: docs/superpowers/specs/2026-09-27-dark-mode-eier-maschine-design.md
-- Client-Spiegel der Platzanzahl: EGG_SLOTS in src/eggSlots.js.

-- 1) Tabelle: ein Datensatz pro (Spieler, Platz). Laufende Bruten → Platz 1.
alter table public.egg_incubations
  add column if not exists slot smallint not null default 1;

alter table public.egg_incubations drop constraint if exists egg_incubations_slot_check;
alter table public.egg_incubations add constraint egg_incubations_slot_check
  check (slot between 1 and 2);

alter table public.egg_incubations drop constraint if exists egg_incubations_pkey;
alter table public.egg_incubations add constraint egg_incubations_pkey
  primary key (user_id, slot);

-- RLS bleibt: nur eigene Zeilen lesen, Schreiben ausschließlich über RPCs.
alter table public.egg_incubations enable row level security;

-- 2) start_incubation: nächster freier Platz, sonst Fehler.
create or replace function public.start_incubation(p_egg_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  egg public.player_eggs;
  et public.egg_types;
  w_total int; r int; acc int; rec record;
  picked_species text;
  minutes int;
  ready_ts timestamptz;
  free_slot smallint;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  -- Serialisiert parallele Starts desselben Spielers (sonst Wettlauf um Platz).
  perform 1 from public.profiles where id = uid for update;

  select * into egg from public.player_eggs where id = p_egg_id for update;
  if egg is null or egg.owner_id <> uid then raise exception 'egg not found'; end if;

  if exists (select 1 from public.trade_eggs te
             join public.trades t on t.id = te.trade_id
             where te.egg_id = p_egg_id and t.status = 'pending') then
    raise exception 'egg is in an open trade';
  end if;

  select s::smallint into free_slot
    from generate_series(1, 2) s
   where not exists (select 1 from public.egg_incubations i
                      where i.user_id = uid and i.slot = s)
   order by s
   limit 1;
  if free_slot is null then
    raise exception 'incubator slots are busy';
  end if;

  select * into et from public.egg_types where egg_type = egg.egg_type;
  if et is null then raise exception 'unknown egg type'; end if;

  minutes := coalesce(egg.bred_minutes, et.incubation_minutes);

  if egg.bred_species is not null then
    -- Zucht-Ei: Das Ergebnis stand schon beim Verpaaren fest.
    picked_species := egg.bred_species;
  else
    select coalesce(sum(weight), 0) into w_total
      from public.egg_drop_pool where egg_type = egg.egg_type;
    if w_total <= 0 then raise exception 'no drop pool for egg'; end if;

    r := 1 + floor(random() * w_total)::int;
    acc := 0; picked_species := null;
    for rec in select species, weight from public.egg_drop_pool
               where egg_type = egg.egg_type order by species loop
      acc := acc + rec.weight;
      if r <= acc then picked_species := rec.species; exit; end if;
    end loop;
    if picked_species is null then
      select species into picked_species from public.egg_drop_pool
        where egg_type = egg.egg_type order by species limit 1;
    end if;
  end if;

  ready_ts := now() + (minutes || ' minutes')::interval;

  delete from public.player_eggs where id = p_egg_id;
  insert into public.egg_incubations(user_id, slot, egg_type, started_at, ready_at, hatched_species)
    values (uid, free_slot, egg.egg_type, now(), ready_ts, picked_species);

  return jsonb_build_object(
    'slot', free_slot,
    'egg_type', egg.egg_type,
    'ready_at', ready_ts,
    'incubation_minutes', minutes,
    'server_now', now()
  );
end $$;

-- 3) get_incubation_status: alle Plätze + alte Top-Level-Felder für ältere
--    App-Versionen (zeigen den zuerst fertigen Platz).
create or replace function public.get_incubation_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  first_inc public.egg_incubations;
  v_slots jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'slot', i.slot,
           'egg_type', i.egg_type,
           'started_at', i.started_at,
           'ready_at', i.ready_at,
           'ready_now', (now() >= i.ready_at)
         ) order by i.slot), '[]'::jsonb)
    into v_slots
    from public.egg_incubations i
   where i.user_id = uid;

  select * into first_inc from public.egg_incubations
   where user_id = uid order by ready_at, slot limit 1;

  if first_inc is null then
    return jsonb_build_object('active', false, 'slots', v_slots,
                              'max_slots', 2, 'server_now', now());
  end if;
  return jsonb_build_object(
    'active', true,
    'slot', first_inc.slot,
    'egg_type', first_inc.egg_type,
    'started_at', first_inc.started_at,
    'ready_at', first_inc.ready_at,
    'ready_now', (now() >= first_inc.ready_at),
    'slots', v_slots,
    'max_slots', 2,
    'server_now', now()
  );
end $$;

-- 4) claim_hatched: bestimmten Platz abholen; ohne Platz den zuerst fertigen
--    (so rufen ältere App-Versionen die Funktion auf).
drop function if exists public.claim_hatched();

create or replace function public.claim_hatched(p_slot int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  inc public.egg_incubations;
  new_animal public.animals%rowtype;
  r text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  if p_slot is null then
    select * into inc from public.egg_incubations
     where user_id = uid and ready_at <= now()
     order by ready_at, slot limit 1 for update;
    if inc is null then
      if exists (select 1 from public.egg_incubations where user_id = uid) then
        raise exception 'not ready yet';
      end if;
      raise exception 'no active incubation';
    end if;
  else
    select * into inc from public.egg_incubations
     where user_id = uid and slot = p_slot for update;
    if inc is null then raise exception 'no active incubation'; end if;
    if now() < inc.ready_at then raise exception 'not ready yet'; end if;
  end if;

  insert into public.animals(owner_id, species, tier)
    values (uid, inc.hatched_species, 'normal')
    returning * into new_animal;

  delete from public.egg_incubations where user_id = uid and slot = inc.slot;

  select rarity into r from public.species_costs where species = inc.hatched_species;
  return jsonb_build_object(
    'slot', inc.slot,
    'species', inc.hatched_species,
    'animal_id', new_animal.id,
    'rarity', coalesce(r, 'common')
  );
end $$;

-- 5) Grants: nur eingeloggte Spieler.
grant execute on function public.start_incubation(uuid) to authenticated;
grant execute on function public.get_incubation_status() to authenticated;
grant execute on function public.claim_hatched(int) to authenticated;
revoke execute on function public.start_incubation(uuid) from anon, public;
revoke execute on function public.get_incubation_status() from anon, public;
revoke execute on function public.claim_hatched(int) from anon, public;
