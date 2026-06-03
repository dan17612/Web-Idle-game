-- 20260603_09_roadmap_delete_own.sql
-- Jeder Spieler darf seine eigenen Vorschlaege loeschen.

create or replace function public.delete_own_idea(p_idea_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  delete from public.roadmap_ideas where id = p_idea_id and created_by = uid;
  if not found then raise exception 'idea not found or not yours'; end if;
  return jsonb_build_object('id', p_idea_id, 'deleted', true);
end $$;
