-- Fix strict return types for admin_list_users
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
    p.id::uuid,
    p.username::text,
    u.email::text,
    p.coins::bigint,
    p.is_admin::boolean,
    p.is_banned::boolean,
    p.created_at::timestamptz,
    u.last_sign_in_at::timestamptz
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
