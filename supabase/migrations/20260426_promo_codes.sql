-- Promo-Code-System
-- rewards-Schema (jsonb):
--   {
--     "coins": 1000,
--     "tickets": 5,
--     "species": "cat",
--     "tier": "gold",
--     "qty": 1,
--     "pet_boost_multiplier": 2,
--     "pet_boost_minutes": 30,
--     "note": "optionaler Hinweis fuer den Spieler"
--   }

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  rewards jsonb not null default '{}'::jsonb,
  max_uses int,
  used_count int not null default 0,
  max_uses_per_user int not null default 1,
  expires_at timestamptz,
  is_active boolean not null default true,
  note text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists promo_codes_code_lower_unique
  on public.promo_codes (lower(code));

alter table public.promo_codes enable row level security;
revoke all on table public.promo_codes from public, anon, authenticated;

create table if not exists public.promo_code_redemptions (
  id bigserial primary key,
  code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rewards_applied jsonb not null default '{}'::jsonb,
  redeemed_at timestamptz not null default now()
);

create index if not exists promo_code_redemptions_user_idx
  on public.promo_code_redemptions(user_id);
create index if not exists promo_code_redemptions_code_idx
  on public.promo_code_redemptions(code_id);

alter table public.promo_code_redemptions enable row level security;
revoke all on table public.promo_code_redemptions from public, anon, authenticated;

create or replace function public.redeem_promo_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean_code text;
  pc public.promo_codes%rowtype;
  rewards jsonb;
  user_uses int;
  reward_coins bigint := 0;
  reward_tickets bigint := 0;
  reward_species text;
  reward_tier text;
  reward_qty int := 0;
  reward_boost_mult numeric := 0;
  reward_boost_min int := 0;
  reward_note text;
  new_coins bigint;
  new_tickets bigint;
  cur_until timestamptz;
  cur_mult numeric;
  new_until timestamptz;
  new_mult numeric;
  applied jsonb := '{}'::jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  clean_code := upper(trim(coalesce(p_code, '')));
  if length(clean_code) = 0 then raise exception 'code required'; end if;

  select * into pc from public.promo_codes where lower(code) = lower(clean_code) for update;
  if not found then raise exception 'invalid code'; end if;
  if not pc.is_active then raise exception 'code inactive'; end if;
  if pc.expires_at is not null and pc.expires_at < now() then raise exception 'code expired'; end if;
  if pc.max_uses is not null and pc.used_count >= pc.max_uses then raise exception 'code exhausted'; end if;

  select count(*) into user_uses
    from public.promo_code_redemptions
   where code_id = pc.id and user_id = uid;
  if user_uses >= coalesce(pc.max_uses_per_user, 1) then
    raise exception 'already redeemed';
  end if;

  rewards := coalesce(pc.rewards, '{}'::jsonb);
  reward_coins        := coalesce((rewards->>'coins')::bigint, 0);
  reward_tickets      := coalesce((rewards->>'tickets')::bigint, 0);
  reward_species      := nullif(rewards->>'species', '');
  reward_tier         := coalesce(nullif(rewards->>'tier', ''), 'normal');
  reward_qty          := greatest(0, coalesce((rewards->>'qty')::int, 0));
  reward_boost_mult   := coalesce((rewards->>'pet_boost_multiplier')::numeric, 0);
  reward_boost_min    := coalesce((rewards->>'pet_boost_minutes')::int, 0);
  reward_note         := nullif(rewards->>'note', '');

  if reward_coins < 0 then reward_coins := 0; end if;
  if reward_tickets < 0 then reward_tickets := 0; end if;

  if reward_coins > 0 or reward_tickets > 0 then
    update public.profiles
       set coins = coins + reward_coins,
           tickets = coalesce(tickets, 0) + reward_tickets
     where id = uid
     returning coins, tickets into new_coins, new_tickets;
  else
    select coins, tickets into new_coins, new_tickets from public.profiles where id = uid;
  end if;

  if reward_species is not null and reward_qty > 0 then
    if not exists (select 1 from public.species_costs where species = reward_species) then
      raise exception 'reward species unknown';
    end if;
    insert into public.pending_gifts(recipient_id, created_by, coins, species, tier, qty, note)
      values (uid, null, 0, reward_species, reward_tier, least(reward_qty, 50), reward_note);
  end if;

  if reward_boost_mult > 0 and reward_boost_min > 0 then
    insert into public.pets(owner_id) values (uid) on conflict (owner_id) do nothing;
    select boost_until, boost_multiplier into cur_until, cur_mult from public.pets where owner_id = uid;
    if cur_until > now() and cur_mult >= reward_boost_mult then
      new_until := cur_until + make_interval(mins => reward_boost_min);
      new_mult  := cur_mult;
    else
      new_until := now() + make_interval(mins => reward_boost_min);
      new_mult  := reward_boost_mult;
    end if;
    update public.pets
       set boost_multiplier = new_mult,
           boost_until = new_until
     where owner_id = uid;
  end if;

  update public.promo_codes set used_count = used_count + 1 where id = pc.id;

  applied := jsonb_build_object(
    'coins', reward_coins,
    'tickets', reward_tickets,
    'species', reward_species,
    'tier', reward_tier,
    'qty', reward_qty,
    'pet_boost_multiplier', reward_boost_mult,
    'pet_boost_minutes', reward_boost_min,
    'note', reward_note
  );

  insert into public.promo_code_redemptions(code_id, user_id, rewards_applied)
    values (pc.id, uid, applied);

  return jsonb_build_object(
    'ok', true,
    'code', pc.code,
    'rewards', applied,
    'coins', new_coins,
    'tickets', new_tickets
  );
end $$;

grant execute on function public.redeem_promo_code(text) to authenticated;

create or replace function public.admin_list_promo_codes()
returns table (
  id uuid,
  code text,
  rewards jsonb,
  max_uses int,
  used_count int,
  max_uses_per_user int,
  expires_at timestamptz,
  is_active boolean,
  note text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := public._admin_role();
begin
  if role is null then raise exception 'admin only'; end if;
  return query
    select c.id, c.code, c.rewards, c.max_uses, c.used_count, c.max_uses_per_user,
           c.expires_at, c.is_active, c.note, c.created_at
      from public.promo_codes c
     order by c.created_at desc;
end $$;

grant execute on function public.admin_list_promo_codes() to authenticated;

create or replace function public.admin_upsert_promo_code(
  p_code text,
  p_rewards jsonb,
  p_max_uses int default null,
  p_max_uses_per_user int default 1,
  p_expires_at timestamptz default null,
  p_is_active boolean default true,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_adm boolean;
  clean_code text;
  new_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select coalesce(is_admin, false) into is_adm from public.profiles where id = uid;
  if not is_adm then raise exception 'full admin only'; end if;
  clean_code := upper(trim(coalesce(p_code, '')));
  if length(clean_code) = 0 then raise exception 'code required'; end if;
  if length(clean_code) > 40 then raise exception 'code too long'; end if;

  insert into public.promo_codes(code, rewards, max_uses, max_uses_per_user, expires_at, is_active, note, created_by)
    values (
      clean_code,
      coalesce(p_rewards, '{}'::jsonb),
      p_max_uses,
      coalesce(p_max_uses_per_user, 1),
      p_expires_at,
      coalesce(p_is_active, true),
      nullif(trim(p_note), ''),
      uid
    )
    on conflict (lower(code)) do update set
      rewards = excluded.rewards,
      max_uses = excluded.max_uses,
      max_uses_per_user = excluded.max_uses_per_user,
      expires_at = excluded.expires_at,
      is_active = excluded.is_active,
      note = excluded.note
    returning id into new_id;

  return jsonb_build_object('id', new_id, 'code', clean_code);
end $$;

grant execute on function public.admin_upsert_promo_code(text, jsonb, int, int, timestamptz, boolean, text) to authenticated;

create or replace function public.admin_delete_promo_code(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_adm boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select coalesce(is_admin, false) into is_adm from public.profiles where id = uid;
  if not is_adm then raise exception 'full admin only'; end if;
  delete from public.promo_codes where id = p_id;
  return jsonb_build_object('deleted', true, 'id', p_id);
end $$;

grant execute on function public.admin_delete_promo_code(uuid) to authenticated;
