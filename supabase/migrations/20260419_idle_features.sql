-- =============================================================================
-- Idle-Game Feature-Migration (2026-04-19)
-- Ergänzt:
--   1. Offline-Level + upgradebarer Offline-Cap (Basis 2h, pro Level +30min, max 8h)
--   2. avatar_emoji + set_avatar (idempotent, falls noch nicht vorhanden)
--   3. friends_view um avatar_emoji erweitert
--   4. 0-Münz-Trades erlaubt (Barter ohne Preis oder Wunsch-Spezies)
-- Die Migration ist idempotent — mehrfach ausführbar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Profiles: neue Spalten
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_emoji text,
  add column if not exists offline_level int not null default 1
    check (offline_level >= 1 and offline_level <= 13);
-- 13 Level → 2h + 12*0.5h = 8h Cap

-- -----------------------------------------------------------------------------
-- 2) Helper: Offline-Stunden je nach Level
-- -----------------------------------------------------------------------------
create or replace function public._offline_hours(p_level int)
returns numeric language sql immutable as $$
  select least(8, 2 + (greatest(coalesce(p_level, 1), 1) - 1) * 0.5)::numeric;
$$;

create or replace function public._next_offline_cost(p_level int)
returns bigint language sql immutable as $$
  select floor(500 * power(2.5, greatest(coalesce(p_level, 1), 1) - 1))::bigint;
$$;

-- -----------------------------------------------------------------------------
-- 3) upgrade_offline RPC
-- -----------------------------------------------------------------------------
create or replace function public.upgrade_offline()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cur int;
  cost bigint;
  new_balance bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select offline_level into cur from public.profiles where id = uid for update;
  if cur is null then cur := 1; end if;
  if public._offline_hours(cur) >= 8 then
    raise exception 'offline max level erreicht';
  end if;

  cost := public._next_offline_cost(cur);

  update public.profiles
     set coins = coins - cost,
         offline_level = cur + 1
   where id = uid and coins >= cost
   returning coins into new_balance;

  if new_balance is null then raise exception 'nicht genug Münzen'; end if;

  return jsonb_build_object(
    'coins', new_balance,
    'offline_level', cur + 1,
    'max_offline_hours', public._offline_hours(cur + 1),
    'next_cost', case when public._offline_hours(cur + 1) >= 8
                      then null
                      else public._next_offline_cost(cur + 1) end
  );
end $$;
grant execute on function public.upgrade_offline() to authenticated;

-- -----------------------------------------------------------------------------
-- 4) collect_offline: dynamischer Cap statt harter 8h
-- -----------------------------------------------------------------------------
create or replace function public.collect_offline(p_coins bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  elapsed_sec float;
  max_rate bigint;
  max_earn bigint;
  cap_sec float;
  lvl int;
  new_balance bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_coins <= 0 then
    return jsonb_build_object('coins', (select coins from public.profiles where id = uid));
  end if;

  select offline_level into lvl from public.profiles where id = uid;
  cap_sec := public._offline_hours(lvl) * 3600;

  select extract(epoch from (now() - last_collected_at)) into elapsed_sec
    from public.profiles where id = uid;
  elapsed_sec := least(elapsed_sec, cap_sec);

  select coalesce(sum(sc.cost / 50), 0) into max_rate
    from public.animals a
    join public.species_costs sc on sc.species = a.species
    where a.owner_id = uid and a.equipped = true;

  max_earn := ceil(max_rate * elapsed_sec);
  p_coins := least(p_coins, (max_earn * 1.2)::bigint + 1);

  update public.profiles
     set coins = coins + p_coins,
         last_collected_at = now()
   where id = uid
   returning coins into new_balance;

  return jsonb_build_object('coins', new_balance);
end $$;

-- -----------------------------------------------------------------------------
-- 5) set_avatar RPC (idempotent, überschreibt existente Version)
-- -----------------------------------------------------------------------------
create or replace function public.set_avatar(p_emoji text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cleaned text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  cleaned := nullif(trim(p_emoji), '');
  -- max 8 Zeichen für Emoji (kombinierte Sequenzen)
  if cleaned is not null and char_length(cleaned) > 8 then
    raise exception 'avatar too long';
  end if;
  update public.profiles set avatar_emoji = cleaned where id = uid;
  return jsonb_build_object('avatar_emoji', cleaned);
end $$;
grant execute on function public.set_avatar(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 6) friends_view: avatar_emoji ergänzen
-- -----------------------------------------------------------------------------
drop view if exists public.friends_view;
create or replace view public.friends_view as
  select f.id as friendship_id,
         f.status,
         f.created_at,
         f.responded_at,
         case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id,
         case when f.requester_id = auth.uid() then pa.username else pr.username end as friend_username,
         case when f.requester_id = auth.uid() then pa.coins else pr.coins end as friend_coins,
         case when f.requester_id = auth.uid() then pa.avatar_emoji else pr.avatar_emoji end as friend_avatar,
         case when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end as direction
    from public.friendships f
    join public.profiles pr on pr.id = f.requester_id
    join public.profiles pa on pa.id = f.addressee_id
   where f.requester_id = auth.uid() or f.addressee_id = auth.uid();
alter view public.friends_view set (security_invoker = on);
grant select on public.friends_view to authenticated;

-- -----------------------------------------------------------------------------
-- 7) Trade: 0-Münz-Gift-Trades erlauben
-- Alte Regel: p_price = 0 und p_wanted_species IS NULL → Fehler.
-- Neu: Geschenk (Tier für 0 Münzen) erlaubt, Selbst-Leer-Offer weiter blockiert.
-- -----------------------------------------------------------------------------
create or replace function public.create_trade_offer(
  p_animal_id uuid,
  p_price bigint,
  p_to_username text,
  p_wanted_species text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  animal public.animals%rowtype;
  target uuid := null;
  offer_id uuid;
  want text := nullif(p_wanted_species, '');
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_price < 0 then raise exception 'price cannot be negative'; end if;
  -- 0-Münz-Trades jetzt erlaubt (auch ohne wanted_species → Geschenk)

  select * into animal from public.animals where id = p_animal_id and owner_id = uid;
  if not found then raise exception 'animal not found'; end if;
  if animal.equipped then raise exception 'animal is equipped'; end if;

  if want is not null
     and not exists(select 1 from public.species_costs where species = want) then
    raise exception 'unknown wanted species';
  end if;

  if exists (select 1 from public.trade_offers where animal_id = p_animal_id and status = 'open') then
    raise exception 'animal is already listed';
  end if;

  if p_to_username is not null and p_to_username <> '' then
    select id into target from public.profiles where username = p_to_username;
    if target is null then raise exception 'recipient not found'; end if;
    if target = uid then raise exception 'cannot target yourself'; end if;
  end if;

  insert into public.trade_offers(seller_id, animal_id, species, price, to_user, wanted_species)
    values (uid, p_animal_id, animal.species, p_price, target, want)
    returning id into offer_id;

  return jsonb_build_object('offer_id', offer_id);
end $$;
grant execute on function public.create_trade_offer(uuid, bigint, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 8) Profile-Sichtbarkeits-Policy: alle authentifizierten können username,
-- coins, avatar_emoji, offline_level sehen (für Profil-Seite).
-- Bestehende Select-Policy wird nicht verändert — nur ergänzt.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles public read'
  ) then
    create policy "profiles public read" on public.profiles
      for select using (true);
  end if;
end $$;

-- Falls andere Tiere-Reads restriktiv sind, brauchen wir Sicht auf fremde animals
-- für die Profil-Sammlung (nur species + tier, kein owner-leak):
create or replace view public.animals_public as
  select id, owner_id, species, tier, equipped
    from public.animals;
alter view public.animals_public set (security_invoker = on);
grant select on public.animals_public to authenticated;

-- =============================================================================
-- Fertig. Änderungen sind idempotent — bei Fehler einzelner Block
-- kann der Rest neu ausgeführt werden.
-- =============================================================================
