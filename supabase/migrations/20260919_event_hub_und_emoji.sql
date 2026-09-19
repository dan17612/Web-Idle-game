-- Event-Hub: Drift und Parkour an den Event-Zeitplan hängen.
--
-- Bisher liefen beide Minispiele unbegrenzt: kein Eintrag in event_schedule,
-- kein Gating in den Abschluss-RPCs. Damit war "Ereignis beendet" reine Optik —
-- der Server hätte weiter Coins und Tickets ausgezahlt.
--
-- Gleiche Mechanik wie bei Memory und Boss-Pfad: event_is_active() entscheidet,
-- die Fortschritts-RPCs bleiben offen, damit Spieler ihre Sterne weiter sehen.

-- 1) Zeitplan-Einträge. drift_game und parkour_game sind beendet, die beiden
--    anderen nur vorbereitet, damit sie später ohne Codeänderung schaltbar sind.
insert into public.event_schedule (key, starts_at, ends_at, enabled)
values
  ('drift_game',   null, '2026-09-19 18:52:06.5757+00', true),
  ('parkour_game', null, '2026-09-19 18:52:06.5757+00', true),
  ('wordle_game',  null, null, true),
  ('world_lobby',  null, null, true)
on conflict (key) do update
  set ends_at = excluded.ends_at,
      enabled = excluded.enabled;

-- 2) Abschluss-RPCs gaten. Bodies unverändert übernommen, nur die
--    event_is_active-Prüfung direkt hinter der Auth-Prüfung ergänzt.

create or replace function public.complete_drift_level(p_level int, p_stars int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_highest int;
  v_stars jsonb;
  v_prev_stars int;
  v_first boolean;
  v_base record;
  v_coins bigint;
  v_tickets bigint;
  new_coins bigint;
  new_tickets bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.event_is_active('drift_game') then raise exception 'event ended'; end if;
  if p_level is null or p_level < 1 or p_level > 12 then
    raise exception 'invalid level';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 3 then
    raise exception 'invalid stars';
  end if;

  insert into public.drift_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select highest_level, stars into v_highest, v_stars
    from public.drift_progress where user_id = uid for update;

  if p_level > v_highest + 1 then raise exception 'level locked'; end if;

  v_first := (p_level = v_highest + 1);
  select * into v_base from public._drift_reward(p_level);
  if v_first then
    v_coins := v_base.coins;
    if p_stars = 3 then
      v_coins := v_coins + v_base.coins / 2;
    end if;
    v_tickets := v_base.tickets;
  else
    v_coins := greatest(100, v_base.coins / 20);
    v_tickets := 0;
  end if;

  v_prev_stars := coalesce((v_stars ->> p_level::text)::int, 0);

  update public.drift_progress
     set highest_level = greatest(highest_level, p_level),
         stars = jsonb_set(stars, array[p_level::text],
                           to_jsonb(greatest(v_prev_stars, p_stars))),
         total_finishes = total_finishes + 1,
         updated_at = now()
   where user_id = uid;

  update public.profiles
     set coins = coins + v_coins,
         tickets = tickets + v_tickets
   where id = uid
   returning coins, tickets into new_coins, new_tickets;

  return jsonb_build_object(
    'level', p_level,
    'first_clear', v_first,
    'stars', greatest(v_prev_stars, p_stars),
    'coins_added', v_coins,
    'tickets_added', v_tickets,
    'coins', new_coins,
    'tickets', new_tickets,
    'highest_level', greatest(v_highest, p_level),
    'server_now', now()
  );
end $$;

create or replace function public.complete_parkour_level(p_level int, p_stars int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_highest int;
  v_stars jsonb;
  v_prev_stars int;
  v_first boolean;
  v_base record;
  v_coins bigint;
  v_tickets bigint;
  new_coins bigint;
  new_tickets bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.event_is_active('parkour_game') then raise exception 'event ended'; end if;
  if p_level is null or p_level < 1 or p_level > 12 then
    raise exception 'invalid level';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 3 then
    raise exception 'invalid stars';
  end if;

  insert into public.parkour_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select highest_level, stars into v_highest, v_stars
    from public.parkour_progress where user_id = uid for update;

  if p_level > v_highest + 1 then raise exception 'level locked'; end if;

  v_first := (p_level = v_highest + 1);
  select * into v_base from public._parkour_reward(p_level);
  if v_first then
    v_coins := v_base.coins;
    if p_stars = 3 then
      v_coins := v_coins + v_base.coins / 2;
    end if;
    v_tickets := v_base.tickets;
  else
    v_coins := greatest(100, v_base.coins / 20);
    v_tickets := 0;
  end if;

  v_prev_stars := coalesce((v_stars ->> p_level::text)::int, 0);

  update public.parkour_progress
     set highest_level = greatest(highest_level, p_level),
         stars = jsonb_set(stars, array[p_level::text],
                           to_jsonb(greatest(v_prev_stars, p_stars))),
         total_finishes = total_finishes + 1,
         updated_at = now()
   where user_id = uid;

  update public.profiles
     set coins = coins + v_coins,
         tickets = tickets + v_tickets
   where id = uid
   returning coins, tickets into new_coins, new_tickets;

  return jsonb_build_object(
    'level', p_level,
    'first_clear', v_first,
    'stars', greatest(v_prev_stars, p_stars),
    'coins_added', v_coins,
    'tickets_added', v_tickets,
    'coins', new_coins,
    'tickets', new_tickets,
    'highest_level', greatest(v_highest, p_level),
    'server_now', now()
  );
end $$;

grant execute on function public.complete_drift_level(int, int) to authenticated;
grant execute on function public.complete_parkour_level(int, int) to authenticated;
revoke execute on function public.complete_drift_level(int, int) from anon, public;
revoke execute on function public.complete_parkour_level(int, int) from anon, public;

-- 3) Emoji-Korrekturen: Diese Werte werden als Canvas-Sprites in der Zoo-Welt
--    gezeichnet. Sequenzen aus mehreren Codepoints zerfallen dort auf Windows
--    in mehrere Glyphen, deshalb nur Einzel-Codepoint-Emoji.
update public.species_costs set emoji = '🦅'
 where species = 'phoenix' and emoji = '🐦‍🔥';

update public.world_items set emoji = case id
  when 'pirate'   then '🦜'
  when 'kart_red' then '🚘'
  when 'desert'   then '🌵'
  when 'snow'     then '⛄'
end
where id in ('pirate', 'kart_red', 'desert', 'snow');
