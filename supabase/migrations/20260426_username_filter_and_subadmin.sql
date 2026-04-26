-- =============================================================================
-- Username-Filter, Sub-Admin-Rolle und Aktionslogs
--
-- Inhalt:
--   * profiles.is_subadmin (eingeschraenkter Admin-Lite)
--   * forbidden_usernames: Admin-pflegbare Sperrliste (exact / contains)
--   * username_filter_log: Verlauf automatischer Umbenennungen
--   * user_ban_log: Bann-Verlauf inkl. Begruendung
--   * shop_restock_log: Verlauf aller Restock/Stop-Aktionen im Shop
--   * Helper _admin_role(), _username_blocked(), _random_anonymous_username()
--   * handle_new_user / change_username pruefen Sperrliste
--   * admin_apply_username_filter() benennt alle blockierten Namen um
--   * admin_set_user_subadmin(): Vollwertiger Admin schaltet Sub-Admin frei
--   * Bestehende admin_*-Funktionen lassen Sub-Admins fuer erlaubte Aktionen zu
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Schema-Erweiterungen
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_subadmin boolean not null default false;

create table if not exists public.forbidden_usernames (
  id uuid primary key default gen_random_uuid(),
  pattern text not null,
  kind text not null default 'contains' check (kind in ('exact', 'contains')),
  note text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists forbidden_usernames_pattern_kind_unique
  on public.forbidden_usernames (lower(pattern), kind);

alter table public.forbidden_usernames enable row level security;
revoke all on table public.forbidden_usernames from public, anon, authenticated;

create table if not exists public.username_filter_log (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  old_username text not null,
  new_username text not null,
  matched_pattern text,
  performed_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

alter table public.username_filter_log enable row level security;
revoke all on table public.username_filter_log from public, anon, authenticated;

create table if not exists public.user_ban_log (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  banned boolean not null,
  reason text,
  performed_by uuid references auth.users on delete set null,
  performed_role text,
  created_at timestamptz not null default now()
);

create index if not exists user_ban_log_user_idx on public.user_ban_log(user_id);
alter table public.user_ban_log enable row level security;
revoke all on table public.user_ban_log from public, anon, authenticated;

create table if not exists public.shop_restock_log (
  id bigserial primary key,
  action text not null check (action in ('restock', 'stop', 'rotate', 'enable', 'disable', 'weight')),
  species text,
  qty int,
  weight int,
  enabled boolean,
  performed_by uuid references auth.users on delete set null,
  performed_role text,
  created_at timestamptz not null default now()
);

create index if not exists shop_restock_log_created_idx on public.shop_restock_log(created_at desc);
alter table public.shop_restock_log enable row level security;
revoke all on table public.shop_restock_log from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Helper: Rolle ermitteln (admin / subadmin / null)
-- -----------------------------------------------------------------------------
create or replace function public._admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(p.is_admin, false) then 'admin'
    when coalesce(p.is_subadmin, false) then 'subadmin'
    else null
  end
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public._admin_role() from public, anon;
grant execute on function public._admin_role() to authenticated;

-- Helper: blockierte Namen erkennen
create or replace function public._username_blocked(p_name text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select f.pattern
    from public.forbidden_usernames f
   where (f.kind = 'exact' and lower(p_name) = lower(f.pattern))
      or (f.kind = 'contains' and lower(p_name) like '%' || lower(f.pattern) || '%')
   order by f.kind desc
   limit 1;
$$;

revoke all on function public._username_blocked(text) from public, anon, authenticated;

-- Helper: Anonymer Username u + 9 Zufallsziffern
create or replace function public._random_anonymous_username()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  tries int := 0;
begin
  loop
    candidate := 'u' || lpad(floor(random() * 1000000000)::bigint::text, 9, '0');
    exit when not exists (
      select 1 from public.profiles where lower(username) = lower(candidate)
    );
    tries := tries + 1;
    if tries > 30 then
      candidate := candidate || tries::text;
      exit;
    end if;
  end loop;
  return candidate;
end $$;

revoke all on function public._random_anonymous_username() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- handle_new_user: Sperrliste pruefen, ggf. anonymen Namen vergeben
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  u text;
begin
  u := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  if u is null or length(trim(u)) = 0 then
    u := public._random_anonymous_username();
  elsif public._username_blocked(u) is not null then
    u := public._random_anonymous_username();
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(u)) then
    u := u || substr(replace(new.id::text, '-', ''), 1, 4);
    if exists (select 1 from public.profiles where lower(username) = lower(u)) then
      u := public._random_anonymous_username();
    end if;
  end if;
  insert into public.profiles (id, username) values (new.id, u);
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- change_username: Sperrliste pruefen
-- -----------------------------------------------------------------------------
create or replace function public.change_username(p_new text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean text;
  taken boolean;
  is_adm boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  clean := trim(coalesce(p_new, ''));
  if length(clean) < 3 or length(clean) > 20 then raise exception 'username must be 3-20 chars'; end if;
  if clean !~ '^[A-Za-z0-9_.-]+$' then raise exception 'invalid characters'; end if;
  select coalesce(is_admin, false) into is_adm from public.profiles where id = uid;
  if not is_adm and public._username_blocked(clean) is not null then
    raise exception 'username not allowed';
  end if;
  select exists(select 1 from public.profiles where lower(username) = lower(clean) and id <> uid) into taken;
  if taken then raise exception 'username taken'; end if;
  update public.profiles set username = clean where id = uid;
  return jsonb_build_object('username', clean);
end $$;
grant execute on function public.change_username(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Admin: Sperrliste verwalten (nur volle Admins)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_forbidden_usernames()
returns table (
  id uuid,
  pattern text,
  kind text,
  note text,
  created_by uuid,
  created_at timestamptz
)
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
  return query
    select f.id, f.pattern, f.kind, f.note, f.created_by, f.created_at
      from public.forbidden_usernames f
     order by f.created_at desc;
end $$;

grant execute on function public.admin_list_forbidden_usernames() to authenticated;

create or replace function public.admin_add_forbidden_username(
  p_pattern text,
  p_kind text default 'contains',
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
  clean text;
  k text;
  new_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select coalesce(is_admin, false) into is_adm from public.profiles where id = uid;
  if not is_adm then raise exception 'full admin only'; end if;
  clean := trim(coalesce(p_pattern, ''));
  if length(clean) = 0 then raise exception 'pattern required'; end if;
  if length(clean) > 60 then raise exception 'pattern too long'; end if;
  k := coalesce(nullif(trim(p_kind), ''), 'contains');
  if k not in ('exact', 'contains') then raise exception 'invalid kind'; end if;
  insert into public.forbidden_usernames(pattern, kind, note, created_by)
    values (clean, k, nullif(trim(p_note), ''), uid)
    on conflict (lower(pattern), kind) do update
      set note = coalesce(excluded.note, public.forbidden_usernames.note)
    returning id into new_id;
  return jsonb_build_object('id', new_id, 'pattern', clean, 'kind', k);
end $$;

grant execute on function public.admin_add_forbidden_username(text, text, text) to authenticated;

create or replace function public.admin_remove_forbidden_username(p_id uuid)
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
  delete from public.forbidden_usernames where id = p_id;
  return jsonb_build_object('deleted', true, 'id', p_id);
end $$;

grant execute on function public.admin_remove_forbidden_username(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Sperrliste durchsetzen: alle blockierten Spieler umbenennen
-- -----------------------------------------------------------------------------
create or replace function public.admin_apply_username_filter()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_adm boolean;
  rec record;
  matched text;
  new_name text;
  renamed int := 0;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select coalesce(is_admin, false) into is_adm from public.profiles where id = uid;
  if not is_adm then raise exception 'full admin only'; end if;

  for rec in
    select p.id, p.username
      from public.profiles p
     where coalesce(p.is_admin, false) = false
  loop
    matched := public._username_blocked(rec.username);
    if matched is not null then
      new_name := public._random_anonymous_username();
      update public.profiles set username = new_name where id = rec.id;
      insert into public.username_filter_log(user_id, old_username, new_username, matched_pattern, performed_by)
        values (rec.id, rec.username, new_name, matched, uid);
      renamed := renamed + 1;
    end if;
  end loop;

  return jsonb_build_object('renamed', renamed);
end $$;

grant execute on function public.admin_apply_username_filter() to authenticated;

-- -----------------------------------------------------------------------------
-- Sub-Admin freischalten / entziehen (nur volle Admins)
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_user_subadmin(p_user_id uuid, p_is_subadmin boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_adm boolean;
  target_is_admin boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select coalesce(is_admin, false) into is_adm from public.profiles where id = uid;
  if not is_adm then raise exception 'full admin only'; end if;
  if p_user_id is null then raise exception 'user id required'; end if;

  select coalesce(is_admin, false) into target_is_admin from public.profiles where id = p_user_id;
  if target_is_admin then raise exception 'target is full admin'; end if;

  update public.profiles
     set is_subadmin = coalesce(p_is_subadmin, false)
   where id = p_user_id;
  if not found then raise exception 'user not found'; end if;

  return jsonb_build_object('user_id', p_user_id, 'is_subadmin', coalesce(p_is_subadmin, false));
end $$;

grant execute on function public.admin_set_user_subadmin(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_list_users: Sub-Admin darf lesen, liefert is_subadmin mit
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  username text,
  email text,
  coins bigint,
  is_admin boolean,
  is_subadmin boolean,
  is_banned boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := public._admin_role();
  q text := nullif(trim(p_search), '');
begin
  if role is null then raise exception 'admin only'; end if;
  return query
    select
      p.id,
      p.username,
      u.email,
      p.coins,
      p.is_admin,
      coalesce(p.is_subadmin, false) as is_subadmin,
      p.is_banned,
      p.created_at,
      u.last_sign_in_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    where q is null
       or p.username ilike ('%' || q || '%')
       or u.email ilike ('%' || q || '%')
    order by p.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 200))
    offset greatest(coalesce(p_offset, 0), 0);
end $$;

grant execute on function public.admin_list_users(text, int, int) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_set_user_ban: Sub-Admin darf bannen mit Begruendung, alles geloggt.
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_user_ban(
  p_user_id uuid,
  p_banned boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role text := public._admin_role();
  target_admin boolean := false;
  target_subadmin boolean := false;
  reason_clean text := nullif(trim(p_reason), '');
begin
  if role is null then raise exception 'admin only'; end if;
  if p_user_id is null then raise exception 'user id required'; end if;
  if p_user_id = uid then raise exception 'cannot ban yourself'; end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'user not found';
  end if;

  select coalesce(p.is_admin, false), coalesce(p.is_subadmin, false)
    into target_admin, target_subadmin
    from public.profiles p
   where p.id = p_user_id;

  if target_admin then raise exception 'cannot ban another admin'; end if;
  if role = 'subadmin' and target_subadmin then
    raise exception 'sub-admins cannot ban other sub-admins';
  end if;

  if role = 'subadmin' and coalesce(p_banned, false) and reason_clean is null then
    raise exception 'reason required';
  end if;

  if coalesce(p_banned, false) then
    update auth.users set banned_until = 'infinity'::timestamptz where id = p_user_id;
    update public.profiles set is_banned = true where id = p_user_id;
  else
    update auth.users set banned_until = null where id = p_user_id;
    update public.profiles set is_banned = false where id = p_user_id;
  end if;

  insert into public.user_ban_log(user_id, banned, reason, performed_by, performed_role)
    values (p_user_id, coalesce(p_banned, false), reason_clean, uid, role);

  return jsonb_build_object(
    'user_id', p_user_id,
    'is_banned', coalesce(p_banned, false),
    'reason', reason_clean
  );
end $$;

grant execute on function public.admin_set_user_ban(uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_delete_user: Loeschen bleibt vollen Admins vorbehalten (vorhandene
-- Funktion nutzt is_admin, also nichts zu tun).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Broadcasts: Sub-Admin darf
-- -----------------------------------------------------------------------------
create or replace function public.admin_broadcast(p_message text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role text := public._admin_role();
  clean text;
  row_id bigint;
begin
  if role is null then raise exception 'admin only'; end if;
  clean := trim(coalesce(p_message, ''));
  if length(clean) = 0 or length(clean) > 280 then raise exception 'message must be 1-280 chars'; end if;
  insert into public.broadcasts(message, created_by) values (clean, uid) returning id into row_id;
  return jsonb_build_object('id', row_id, 'message', clean);
end $$;
grant execute on function public.admin_broadcast(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Geschenke: Sub-Admin darf
-- -----------------------------------------------------------------------------
create or replace function public.admin_queue_gift(
  p_username text, p_coins bigint default 0, p_species text default null,
  p_tier text default 'normal', p_qty int default 1, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role text := public._admin_role();
  rcpt uuid;
  gift_id uuid;
begin
  if role is null then raise exception 'admin only'; end if;
  if coalesce(p_coins, 0) < 0 then raise exception 'coins must be >= 0'; end if;
  if coalesce(p_qty, 1) < 1 or p_qty > 50 then raise exception 'qty 1..50'; end if;
  if p_species is null and coalesce(p_coins, 0) = 0 then raise exception 'either coins or species required'; end if;
  select id into rcpt from public.profiles where username ilike p_username limit 1;
  if rcpt is null then raise exception 'recipient not found'; end if;
  if p_species is not null and not exists (select 1 from public.species_costs where species = p_species) then
    raise exception 'unknown species';
  end if;
  insert into public.pending_gifts(recipient_id, created_by, coins, species, tier, qty, note)
    values (rcpt, uid, coalesce(p_coins, 0), p_species, coalesce(p_tier, 'normal'), coalesce(p_qty, 1), p_note)
    returning id into gift_id;
  return jsonb_build_object('gift_id', gift_id, 'recipient', p_username);
end $$;
grant execute on function public.admin_queue_gift(text, bigint, text, text, int, text) to authenticated;

create or replace function public.admin_queue_gift_bulk(
  p_usernames text, p_coins bigint default 0, p_species text default null,
  p_tier text default 'normal', p_qty int default 1, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role text := public._admin_role();
  is_all boolean := false;
  is_online boolean := false;
  sent int := 0;
  missed text[] := '{}';
  ids uuid[];
  online_cutoff timestamptz := now() - interval '5 minutes';
  selector text := lower(trim(coalesce(p_usernames, '')));
begin
  if role is null then raise exception 'admin only'; end if;
  if coalesce(p_coins, 0) < 0 then raise exception 'coins must be >= 0'; end if;
  if coalesce(p_qty, 1) < 1 or p_qty > 50 then raise exception 'qty 1..50'; end if;
  if p_species is null and coalesce(p_coins, 0) = 0 then raise exception 'either coins or species required'; end if;
  if p_species is not null and not exists (select 1 from public.species_costs where species = p_species) then
    raise exception 'unknown species';
  end if;
  if selector = '@all' then
    is_all := true;
    select array_agg(id) into ids from public.profiles;
  elsif selector = '@online' then
    is_online := true;
    select array_agg(id) into ids
      from public.profiles
     where last_collected_at >= online_cutoff;
  else
    select array_agg(p.id) into ids
      from (select distinct btrim(u) as name from unnest(string_to_array(p_usernames, ',')) u where btrim(u) <> '') x
      left join public.profiles p on p.username ilike x.name;
    select array_agg(x.name) into missed
      from (select distinct btrim(u) as name from unnest(string_to_array(p_usernames, ',')) u where btrim(u) <> '') x
      where not exists (select 1 from public.profiles p where p.username ilike x.name);
    ids := array_remove(ids, null);
  end if;
  if ids is null or cardinality(ids) = 0 then raise exception 'no recipients found'; end if;
  insert into public.pending_gifts(recipient_id, created_by, coins, species, tier, qty, note)
    select r, uid, coalesce(p_coins, 0), p_species, coalesce(p_tier, 'normal'), coalesce(p_qty, 1), p_note
      from unnest(ids) r;
  get diagnostics sent = row_count;
  return jsonb_build_object(
    'sent', sent,
    'all', is_all,
    'online', is_online,
    'missed', coalesce(missed, '{}')
  );
end $$;
grant execute on function public.admin_queue_gift_bulk(text, bigint, text, text, int, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Shop-Aktionen: Sub-Admin darf, alles geloggt
-- -----------------------------------------------------------------------------
create or replace function public.admin_force_add(p_species text, p_qty int default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role text := public._admin_role();
  state public.shop_state;
  current_qty int;
begin
  if role is null then raise exception 'admin only'; end if;
  if p_qty is null or p_qty < 1 then raise exception 'qty must be >= 1'; end if;
  if not exists (select 1 from public.species_costs where species = p_species) then raise exception 'unknown species'; end if;
  current_qty := coalesce((select (forced_stock->>p_species)::int from public.shop_state where id = 1), 0);
  update public.shop_state
     set forced_stock = jsonb_set(forced_stock, array[p_species], to_jsonb(current_qty + p_qty))
   where id = 1
   returning * into state;
  insert into public.shop_restock_log(action, species, qty, performed_by, performed_role)
    values ('restock', p_species, p_qty, uid, role);
  return jsonb_build_object('forced_stock', state.forced_stock, 'species', p_species, 'qty', current_qty + p_qty);
end $$;
grant execute on function public.admin_force_add(text, int) to authenticated;

create or replace function public.admin_force_remove(p_species text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role text := public._admin_role();
  state public.shop_state;
begin
  if role is null then raise exception 'admin only'; end if;
  update public.shop_state
     set forced_stock = forced_stock - p_species,
         random_stock = random_stock - p_species
   where id = 1
   returning * into state;
  insert into public.shop_restock_log(action, species, performed_by, performed_role)
    values ('stop', p_species, uid, role);
  return jsonb_build_object('forced_stock', state.forced_stock, 'random_stock', state.random_stock);
end $$;
grant execute on function public.admin_force_remove(text) to authenticated;

create or replace function public.admin_force_rotation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role text := public._admin_role();
  state public.shop_state;
begin
  if role is null then raise exception 'admin only'; end if;
  update public.shop_state set updated_at = 'epoch' where id = 1;
  state := public._rotate_if_needed();
  insert into public.shop_restock_log(action, performed_by, performed_role)
    values ('rotate', uid, role);
  return jsonb_build_object('random_stock', state.random_stock, 'forced_stock', state.forced_stock, 'rotates_at', state.rotates_at);
end $$;
grant execute on function public.admin_force_rotation() to authenticated;

create or replace function public.admin_set_species_enabled(p_species text, p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role text := public._admin_role();
begin
  if role is null then raise exception 'admin only'; end if;
  update public.species_costs set enabled = p_enabled where species = p_species;
  if not found then raise exception 'unknown species'; end if;
  insert into public.shop_restock_log(action, species, enabled, performed_by, performed_role)
    values (case when p_enabled then 'enable' else 'disable' end, p_species, p_enabled, uid, role);
  return jsonb_build_object('species', p_species, 'enabled', p_enabled);
end $$;
grant execute on function public.admin_set_species_enabled(text, boolean) to authenticated;

create or replace function public.admin_set_species_weight(p_species text, p_weight int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role text := public._admin_role();
begin
  if role is null then raise exception 'admin only'; end if;
  if p_weight <= 0 then raise exception 'weight must be > 0'; end if;
  update public.species_costs set weight = p_weight where species = p_species;
  if not found then raise exception 'unknown species'; end if;
  insert into public.shop_restock_log(action, species, weight, performed_by, performed_role)
    values ('weight', p_species, p_weight, uid, role);
  return jsonb_build_object('species', p_species, 'weight', p_weight);
end $$;
grant execute on function public.admin_set_species_weight(text, int) to authenticated;

-- -----------------------------------------------------------------------------
-- Support-Tickets: Sub-Admin darf
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_support_tickets(
  p_status text default null,
  p_limit int default 100,
  p_offset int default 0
)
returns table (
  id uuid,
  ticket_number text,
  user_id uuid,
  username text,
  user_email text,
  subject text,
  message text,
  status text,
  admin_reply text,
  notify_user_copy boolean,
  created_at timestamptz,
  replied_at timestamptz,
  closed_at timestamptz
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
    select t.id, t.ticket_number, t.user_id, t.username, t.user_email,
           t.subject, t.message, t.status, t.admin_reply, t.notify_user_copy,
           t.created_at, t.replied_at, t.closed_at
      from public.support_tickets t
     where p_status is null or t.status = p_status
     order by t.created_at desc
     limit greatest(1, least(coalesce(p_limit, 100), 500))
     offset greatest(0, coalesce(p_offset, 0));
end $$;
grant execute on function public.admin_list_support_tickets(text, int, int) to authenticated;

create or replace function public.admin_reply_support_ticket(
  p_ticket_id uuid,
  p_reply text,
  p_close boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  role text := public._admin_role();
  reply_clean text;
  new_status text;
begin
  if role is null then raise exception 'admin only'; end if;
  reply_clean := trim(coalesce(p_reply, ''));
  if reply_clean = '' then raise exception 'reply required'; end if;
  if length(reply_clean) > 5000 then raise exception 'reply too long'; end if;
  new_status := case when coalesce(p_close, false) then 'closed' else 'replied' end;

  update public.support_tickets
     set admin_reply = reply_clean,
         replied_at = now(),
         status = new_status,
         closed_at = case when coalesce(p_close, false) then now() else closed_at end
   where id = p_ticket_id;
  if not found then raise exception 'ticket not found'; end if;

  perform public._notify_support_mailer(p_ticket_id, 'reply');
  return jsonb_build_object('ok', true, 'status', new_status);
end $$;
grant execute on function public.admin_reply_support_ticket(uuid, text, boolean) to authenticated;

create or replace function public.admin_set_support_ticket_status(
  p_ticket_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := public._admin_role();
begin
  if role is null then raise exception 'admin only'; end if;
  if p_status not in ('open', 'replied', 'closed') then
    raise exception 'invalid status';
  end if;
  update public.support_tickets
     set status = p_status,
         closed_at = case when p_status = 'closed' then coalesce(closed_at, now()) else closed_at end
   where id = p_ticket_id;
  if not found then raise exception 'ticket not found'; end if;
  return jsonb_build_object('ok', true, 'status', p_status);
end $$;
grant execute on function public.admin_set_support_ticket_status(uuid, text) to authenticated;
