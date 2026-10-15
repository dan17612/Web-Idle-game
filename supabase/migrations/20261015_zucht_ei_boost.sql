-- Zucht-Eier mit sichtbarer Zuchtkraft (Boost) und Warteschlange.
-- Spec: docs/superpowers/specs/2026-10-15-zucht-ei-boost-warteschlange-design.md
--
-- Shop-Ei und gezüchtetes Ei teilen sich egg_type 'breeding'. Damit die
-- Eier-Maschine sie trennen kann, merkt sich jedes gezüchtete Ei seine
-- Zuchtkraft. Shop-Eier bleiben null und gelten als SHOP_EGG_POWER (3).
-- Nur Anzeige: das Ergebnis steht weiter in bred_species.

alter table public.player_eggs add column if not exists bred_power numeric;

-- Altbestand: Brutzeit = round(30 + 15 · Kraft), Kraft in halben Punkten.
update public.player_eggs
   set bred_power = least(12, greatest(0, round((bred_minutes - 30) / 15.0 * 2) / 2))
 where bred_species is not null
   and bred_minutes is not null
   and bred_power is null;

create or replace function public.breed_animals(p_a uuid, p_b uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  a public.animals;
  b public.animals;
  v_power numeric;
  v_cost bigint;
  v_minutes int;
  v_species text;
  v_egg_id uuid;
  v_coins bigint;
  v_ready timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.event_is_active('breeding_game') then raise exception 'event ended'; end if;
  if p_a is null or p_b is null or p_a = p_b then raise exception 'need two different animals'; end if;

  select * into a from public.animals where id = p_a for update;
  select * into b from public.animals where id = p_b for update;
  if a is null or b is null or a.owner_id <> uid or b.owner_id <> uid then
    raise exception 'animal not found';
  end if;
  if coalesce(a.breeding_until, 'epoch'::timestamptz) > now()
     or coalesce(b.breeding_until, 'epoch'::timestamptz) > now() then
    raise exception 'animal still breeding';
  end if;
  if a.upgrade_ready_at is not null and a.upgrade_ready_at > now() then
    raise exception 'animal is upgrading';
  end if;
  if b.upgrade_ready_at is not null and b.upgrade_ready_at > now() then
    raise exception 'animal is upgrading';
  end if;

  v_power := least(12, public._breed_power(a.species, a.tier) + public._breed_power(b.species, b.tier));
  v_cost := public._breed_cost(v_power);
  v_minutes := public._breed_minutes(v_power);
  v_species := public._breed_roll(v_power);
  v_ready := now() + (v_minutes || ' minutes')::interval;

  update public.profiles set coins = coins - v_cost
   where id = uid and coins >= v_cost
   returning coins into v_coins;
  if v_coins is null then raise exception 'insufficient coins'; end if;

  insert into public.player_eggs(owner_id, egg_type, bred_species, bred_minutes, bred_power)
  values (uid, 'breeding', v_species, v_minutes, v_power)
  returning id into v_egg_id;

  update public.animals set breeding_until = v_ready where id in (p_a, p_b);

  return jsonb_build_object(
    'egg_id', v_egg_id,
    'power', v_power,
    'cost', v_cost,
    'incubation_minutes', v_minutes,
    'breeding_until', v_ready,
    'coins', v_coins,
    'server_now', now()
  );
end $$;

grant execute on function public.breed_animals(uuid, uuid) to authenticated;
revoke execute on function public.breed_animals(uuid, uuid) from anon, public;
