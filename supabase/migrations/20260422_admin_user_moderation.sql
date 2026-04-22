-- =============================================================================
-- Admin user moderation
-- - add profile ban flag
-- - admin list users (with email)
-- - admin ban/unban users
-- - admin delete users
-- =============================================================================

alter table public.profiles
  add column if not exists is_banned boolean not null default false;

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
  is_banned boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  q text := nullif(trim(p_search), '');
  is_adm boolean := false;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select p.is_admin into is_adm
  from public.profiles p
  where p.id = uid;

  if not coalesce(is_adm, false) then
    raise exception 'admin only';
  end if;

  return query
  select
    p.id,
    p.username,
    u.email,
    p.coins,
    p.is_admin,
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
  is_adm boolean := false;
  target_admin boolean := false;
  reason_clean text := nullif(trim(p_reason), '');
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select p.is_admin into is_adm
  from public.profiles p
  where p.id = uid;

  if not coalesce(is_adm, false) then
    raise exception 'admin only';
  end if;

  if p_user_id is null then
    raise exception 'user id required';
  end if;

  if p_user_id = uid then
    raise exception 'cannot ban yourself';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'user not found';
  end if;

  select p.is_admin into target_admin
  from public.profiles p
  where p.id = p_user_id;

  if coalesce(target_admin, false) then
    raise exception 'cannot ban another admin';
  end if;

  if coalesce(p_banned, false) then
    update auth.users
      set banned_until = 'infinity'::timestamptz
      where id = p_user_id;

    update public.profiles
      set is_banned = true
      where id = p_user_id;
  else
    update auth.users
      set banned_until = null
      where id = p_user_id;

    update public.profiles
      set is_banned = false
      where id = p_user_id;
  end if;

  return jsonb_build_object(
    'user_id', p_user_id,
    'is_banned', coalesce(p_banned, false),
    'reason', reason_clean
  );
end $$;

grant execute on function public.admin_set_user_ban(uuid, boolean, text) to authenticated;

create or replace function public.admin_delete_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_adm boolean := false;
  target_admin boolean := false;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select p.is_admin into is_adm
  from public.profiles p
  where p.id = uid;

  if not coalesce(is_adm, false) then
    raise exception 'admin only';
  end if;

  if p_user_id is null then
    raise exception 'user id required';
  end if;

  if p_user_id = uid then
    raise exception 'cannot delete yourself';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'user not found';
  end if;

  select p.is_admin into target_admin
  from public.profiles p
  where p.id = p_user_id;

  if coalesce(target_admin, false) then
    raise exception 'cannot delete another admin';
  end if;

  delete from auth.users where id = p_user_id;

  return jsonb_build_object('deleted', true, 'user_id', p_user_id);
end $$;

grant execute on function public.admin_delete_user(uuid) to authenticated;
