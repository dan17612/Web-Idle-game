-- Halloween: Regenbogen-Fledermaus für alle 72 Sterne im Kürbis-Puzzle.
-- Spec: docs/superpowers/specs/2026-10-08-halloween-update-design.md
-- (Abschnitt „Erweiterung: Regenbogen-Fledermaus").
--
-- Wer jedes der 24 Level mit drei Sternen abschließt, bekommt einmalig eine
-- Fledermaus in Stufe rainbow. Vergabe im Abschluss-RPC, sobald die
-- Sternesumme das Ziel erreicht — auch bei Wiederholungen, denn genau die
-- holen die fehlenden Sterne.
--
-- Achtung Spiegel: _hpuzzle_rainbow_goal lebt doppelt, hier und als
-- RAINBOW_STAR_GOAL in src/halloweenPuzzle.js
-- (src/halloweenRainbowSql.test.js vergleicht beide).
--
-- Bewusst ohne drop-Statements: Der Supabase-MCP verlangt dafür eine
-- Bestätigung, die in Cloud-Sessions abbricht (siehe AGENTS.md).

-- 1) Einmal-Vergabe merken.
alter table public.halloween_puzzle_progress
  add column if not exists rainbow_claimed_at timestamptz;

-- 2) Ziel: alle Level mit drei Sternen.
create or replace function public._hpuzzle_rainbow_goal()
returns int language sql immutable set search_path = public as $$
  select 24 * 3;
$$;
revoke execute on function public._hpuzzle_rainbow_goal() from anon, authenticated, public;

-- 3) Fortschritt lesen — liefert jetzt auch Ziel und Vergabe-Status.
create or replace function public.get_halloween_puzzle_progress()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_row public.halloween_puzzle_progress%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into v_row from public.halloween_puzzle_progress where user_id = uid;
  return jsonb_build_object(
    'highest_level', coalesce(v_row.highest_level, 0),
    'stars', coalesce(v_row.stars, '{}'::jsonb),
    'best_times', coalesce(v_row.best_times, '{}'::jsonb),
    'total_finishes', coalesce(v_row.total_finishes, 0),
    'max_level', 24,
    'star_goal', public._hpuzzle_rainbow_goal(),
    'rainbow_claimed', v_row.rainbow_claimed_at is not null,
    'server_now', now()
  );
end $$;

-- 4) Level abschließen. Unverändert aus 20261008_halloween_puzzle.sql bis auf
--    den Block „Regenbogen-Fledermaus" und die neuen Antwortfelder.
create or replace function public.complete_halloween_puzzle(p_level int, p_seconds int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_highest int;
  v_stars jsonb;
  v_times jsonb;
  v_last timestamptz;
  v_rainbow_at timestamptz;
  v_pieces int;
  v_secs int;
  v_run_stars int;
  v_prev_stars int;
  v_prev_time int;
  v_first boolean;
  v_base record;
  v_coins bigint;
  v_tickets bigint;
  v_pet_id uuid;
  v_total_stars int;
  v_bonus_id uuid;
  new_coins bigint;
  new_tickets bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.event_is_active('halloween_puzzle') then raise exception 'event ended'; end if;
  if p_level is null or p_level < 1 or p_level > 24 then
    raise exception 'invalid level';
  end if;
  if p_seconds is null or p_seconds < 1 then
    raise exception 'invalid time';
  end if;

  v_pieces := public._hpuzzle_pieces(p_level);
  v_secs := least(p_seconds, 86400);
  -- Schneller als eine halbe Sekunde pro Teil legt niemand ein Puzzle.
  if v_secs * 2 < v_pieces then raise exception 'too fast'; end if;

  insert into public.halloween_puzzle_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select highest_level, stars, best_times, last_finish_at, rainbow_claimed_at
    into v_highest, v_stars, v_times, v_last, v_rainbow_at
    from public.halloween_puzzle_progress where user_id = uid for update;

  if p_level > v_highest + 1 then raise exception 'level locked'; end if;
  -- Zwischen zwei Abschlüssen liegt mindestens die Mindest-Legezeit. Ehrliche
  -- Spieler stoßen nie daran (die Uhr startet erst nach dem letzten Abschluss),
  -- Skripte können die Wiederholungs-Belohnung so nicht im Sekundentakt farmen.
  if v_last is not null and v_last > now() - make_interval(secs => v_pieces / 2.0) then
    raise exception 'too fast';
  end if;

  v_run_stars := public._hpuzzle_stars(p_level, v_secs);
  v_first := (p_level = v_highest + 1);
  select * into v_base from public._hpuzzle_reward(p_level);
  if v_first then
    v_coins := v_base.coins;
    if v_run_stars = 3 then
      v_coins := v_coins + v_base.coins / 2;
    end if;
    v_tickets := v_base.tickets;
  else
    v_coins := greatest(100, v_base.coins / 20);
    v_tickets := 0;
  end if;

  v_prev_stars := coalesce((v_stars ->> p_level::text)::int, 0);
  v_prev_time := (v_times ->> p_level::text)::int;

  update public.halloween_puzzle_progress
     set highest_level = greatest(highest_level, p_level),
         stars = jsonb_set(stars, array[p_level::text],
                           to_jsonb(greatest(v_prev_stars, v_run_stars))),
         best_times = jsonb_set(best_times, array[p_level::text],
                                to_jsonb(least(coalesce(v_prev_time, v_secs), v_secs))),
         total_finishes = total_finishes + 1,
         last_finish_at = now(),
         updated_at = now()
   where user_id = uid
   returning public._stars_total(stars) into v_total_stars;

  -- Fledermaus nur beim Erstabschluss.
  if v_first and v_base.pet_species is not null
     and exists (select 1 from public.species_costs where species = v_base.pet_species) then
    insert into public.animals (owner_id, species, tier, equipped)
    values (uid, v_base.pet_species, coalesce(v_base.pet_tier, 'normal'), false)
    returning id into v_pet_id;
  end if;

  -- Regenbogen-Fledermaus: einmalig, sobald alle Sterne gesammelt sind.
  if v_rainbow_at is null and v_total_stars >= public._hpuzzle_rainbow_goal()
     and exists (select 1 from public.species_costs where species = 'bat') then
    insert into public.animals (owner_id, species, tier, equipped)
    values (uid, 'bat', 'rainbow', false)
    returning id into v_bonus_id;
    update public.halloween_puzzle_progress
       set rainbow_claimed_at = now()
     where user_id = uid;
  end if;

  update public.profiles
     set coins = coins + v_coins,
         tickets = tickets + v_tickets
   where id = uid
   returning coins, tickets into new_coins, new_tickets;

  return jsonb_build_object(
    'level', p_level,
    'first_clear', v_first,
    'seconds', v_secs,
    'run_stars', v_run_stars,
    'stars', greatest(v_prev_stars, v_run_stars),
    'best_time', least(coalesce(v_prev_time, v_secs), v_secs),
    'coins_added', v_coins,
    'tickets_added', v_tickets,
    'pet', case when v_pet_id is null then null
                else jsonb_build_object('id', v_pet_id, 'species', v_base.pet_species,
                                        'tier', coalesce(v_base.pet_tier, 'normal')) end,
    'bonus_pet', case when v_bonus_id is null then null
                      else jsonb_build_object('id', v_bonus_id, 'species', 'bat', 'tier', 'rainbow') end,
    'total_stars', v_total_stars,
    'star_goal', public._hpuzzle_rainbow_goal(),
    'rainbow_claimed', v_rainbow_at is not null or v_bonus_id is not null,
    'coins', new_coins,
    'tickets', new_tickets,
    'highest_level', greatest(v_highest, p_level),
    'server_now', now()
  );
end $$;

grant execute on function public.get_halloween_puzzle_progress() to authenticated;
grant execute on function public.complete_halloween_puzzle(int, int) to authenticated;
revoke execute on function public.get_halloween_puzzle_progress() from anon, public;
revoke execute on function public.complete_halloween_puzzle(int, int) from anon, public;
