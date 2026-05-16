alter table public.profiles
  add column if not exists friend_requests_enabled boolean not null default true;

create or replace function public.set_friend_requests_enabled(p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  next_value boolean := coalesce(p_enabled, true);
begin
  if uid is null then raise exception 'not authenticated'; end if;

  update public.profiles
    set friend_requests_enabled = next_value
    where id = uid;

  if not found then raise exception 'profile not found'; end if;

  return jsonb_build_object('friend_requests_enabled', next_value);
end $$;
grant execute on function public.set_friend_requests_enabled(boolean) to authenticated;

create or replace function public.friend_request(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  target uuid;
  target_requests_enabled boolean;
  existing public.friendships%rowtype;
  new_row public.friendships%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select id, friend_requests_enabled
    into target, target_requests_enabled
    from public.profiles
    where lower(username) = lower(trim(p_username))
    limit 1;

  if target is null then raise exception 'user not found'; end if;
  if target = uid then raise exception 'cannot friend yourself'; end if;

  select * into existing from public.friendships
    where (requester_id = uid and addressee_id = target)
       or (requester_id = target and addressee_id = uid)
    limit 1;

  if existing.id is not null then
    if existing.addressee_id = uid and existing.status = 'pending' then
      update public.friendships
        set status = 'accepted', responded_at = now()
        where id = existing.id
        returning * into new_row;
      return jsonb_build_object('status', 'accepted', 'id', new_row.id);
    end if;

    if existing.status = 'accepted' or existing.status = 'pending' then
      return jsonb_build_object('status', existing.status, 'id', existing.id);
    end if;

    if existing.status = 'declined' then
      if not coalesce(target_requests_enabled, true) then
        raise exception 'friend requests disabled';
      end if;

      update public.friendships
        set requester_id = uid,
            addressee_id = target,
            status = 'pending',
            created_at = now(),
            responded_at = null
        where id = existing.id
        returning * into new_row;

      return jsonb_build_object('status', 'pending', 'id', new_row.id);
    end if;
  end if;

  if not coalesce(target_requests_enabled, true) then
    raise exception 'friend requests disabled';
  end if;

  insert into public.friendships(requester_id, addressee_id)
    values (uid, target)
    returning * into new_row;

  return jsonb_build_object('status', 'pending', 'id', new_row.id);
end $$;
grant execute on function public.friend_request(text) to authenticated;
