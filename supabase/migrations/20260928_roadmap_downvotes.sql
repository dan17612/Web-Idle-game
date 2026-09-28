-- 20260928_roadmap_downvotes.sql
-- Roadmap: Downvotes. Jede Stimme ist jetzt +1 (hoch) oder -1 (runter).
-- Bestehende Stimmen bleiben Upvotes. Aeltere App-Versionen, die nur
-- vote_idea(p_idea_id) aufrufen, bekommen weiter einen Upvote-Toggle und die
-- alten Antwortfelder (voted/count).

-- 1) Stimmwert
alter table public.roadmap_votes
  add column if not exists value smallint not null default 1;
alter table public.roadmap_votes
  drop constraint if exists roadmap_votes_value_check;
alter table public.roadmap_votes
  add constraint roadmap_votes_value_check check (value in (-1, 1));

-- 2) View: Spalten bleiben kompatibel (vote_count = Score, my_vote = Upvote),
--    neue Spalten nur hinten anhaengen. security_invoker direkt mitsetzen.
create or replace view public.roadmap_view
with (security_invoker = on) as
select
  i.id, i.title, i.description, i.status, i.created_by, i.created_at,
  coalesce(p.username, '') as author_username,
  coalesce((select sum(v.value) from public.roadmap_votes v where v.idea_id = i.id), 0)::bigint as vote_count,
  exists (
    select 1 from public.roadmap_votes v
    where v.idea_id = i.id and v.user_id = auth.uid() and v.value = 1
  ) as my_vote,
  (select count(*) from public.roadmap_votes v where v.idea_id = i.id and v.value = 1) as up_count,
  (select count(*) from public.roadmap_votes v where v.idea_id = i.id and v.value = -1) as down_count,
  coalesce((
    select v.value::int from public.roadmap_votes v
    where v.idea_id = i.id and v.user_id = auth.uid()
  ), 0) as my_value
from public.roadmap_ideas i
left join public.profiles p on p.id = i.created_by;

-- 3) vote_idea mit Richtung. Gleiche Richtung erneut (oder 0) = Stimme zurueck.
drop function if exists public.vote_idea(uuid);
create or replace function public.vote_idea(p_idea_id uuid, p_value int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cur smallint;
  mine int;
  up_cnt int;
  down_cnt int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_value is null or p_value not in (-1, 0, 1) then
    raise exception 'invalid vote';
  end if;
  if not exists (select 1 from public.roadmap_ideas where id = p_idea_id) then
    raise exception 'idea not found';
  end if;

  select v.value into cur from public.roadmap_votes v
    where v.idea_id = p_idea_id and v.user_id = uid
    for update;

  if p_value = 0 or cur = p_value then
    delete from public.roadmap_votes where idea_id = p_idea_id and user_id = uid;
    mine := 0;
  else
    insert into public.roadmap_votes(idea_id, user_id, value)
      values (p_idea_id, uid, p_value)
      on conflict (idea_id, user_id)
      do update set value = excluded.value, voted_at = now();
    mine := p_value;
  end if;

  select count(*) filter (where v.value = 1), count(*) filter (where v.value = -1)
    into up_cnt, down_cnt
    from public.roadmap_votes v where v.idea_id = p_idea_id;

  return jsonb_build_object(
    'my_vote', mine,
    'up', up_cnt,
    'down', down_cnt,
    'score', up_cnt - down_cnt,
    -- Altfelder fuer aeltere Apps (nur Upvote-Toggle)
    'voted', mine = 1,
    'count', up_cnt - down_cnt
  );
end $$;

-- 4) Grants: Roadmap-RPCs nur fuer eingeloggte Spieler
revoke all on function public.vote_idea(uuid, int) from public, anon;
grant execute on function public.vote_idea(uuid, int) to authenticated;
revoke all on function public.submit_idea(text, text) from public, anon;
grant execute on function public.submit_idea(text, text) to authenticated;
revoke all on function public.delete_own_idea(uuid) from public, anon;
grant execute on function public.delete_own_idea(uuid) to authenticated;
revoke all on function public.admin_set_idea_status(uuid, text) from public, anon;
grant execute on function public.admin_set_idea_status(uuid, text) to authenticated;
revoke all on function public.admin_delete_idea(uuid) from public, anon;
grant execute on function public.admin_delete_idea(uuid) to authenticated;
