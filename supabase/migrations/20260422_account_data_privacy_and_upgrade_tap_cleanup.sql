-- =============================================================================
-- Account self-service + cleanup
-- 1) remove legacy upgrade_tap() overload
-- 2) request_my_data(): export own user data as JSON
-- 3) delete_my_account(): hard-delete current auth user (cascade)
-- =============================================================================

-- Remove legacy overload to avoid ambiguous/old behavior.
drop function if exists public.upgrade_tap();

create or replace function public.request_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  payload jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select jsonb_build_object(
    'exported_at', now(),
    'user_id', uid,
    'profile', (
      select to_jsonb(p)
      from public.profiles p
      where p.id = uid
    ),
    'animals', (
      select coalesce(jsonb_agg(to_jsonb(a) order by a.acquired_at), '[]'::jsonb)
      from public.animals a
      where a.owner_id = uid
    ),
    'transactions', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
      from public.transactions t
      where t.from_user = uid or t.to_user = uid
    ),
    'trades', (
      select coalesce(jsonb_agg(to_jsonb(tr) order by tr.created_at desc), '[]'::jsonb)
      from public.trades tr
      where tr.requester_id = uid or tr.addressee_id = uid
    ),
    'friendships', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc), '[]'::jsonb)
      from public.friendships f
      where f.requester_id = uid or f.addressee_id = uid
    )
  ) into payload;

  return payload;
end $$;

grant execute on function public.request_my_data() to authenticated;

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Deleting auth.users cascades to public.profiles and related rows.
  delete from auth.users where id = uid;

  return jsonb_build_object('deleted', true);
end $$;

grant execute on function public.delete_my_account() to authenticated;
