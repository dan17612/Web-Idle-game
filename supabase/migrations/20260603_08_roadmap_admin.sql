-- 20260603_08_roadmap_admin.sql
-- Admin-Funktionen fuer Vorschlaege/Roadmap: Status aendern + Idee loeschen.
-- Nutzt das bestehende _admin_role()-Muster (admin oder subadmin).

create or replace function public.admin_set_idea_status(p_idea_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  role text := public._admin_role();
begin
  if role is null then raise exception 'admin only'; end if;
  if p_status not in ('idea','planned','in_progress','done','rejected') then
    raise exception 'invalid status';
  end if;
  update public.roadmap_ideas set status = p_status where id = p_idea_id;
  if not found then raise exception 'idea not found'; end if;
  return jsonb_build_object('id', p_idea_id, 'status', p_status);
end $$;

create or replace function public.admin_delete_idea(p_idea_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  role text := public._admin_role();
begin
  if role is null then raise exception 'admin only'; end if;
  delete from public.roadmap_ideas where id = p_idea_id;
  if not found then raise exception 'idea not found'; end if;
  return jsonb_build_object('id', p_idea_id, 'deleted', true);
end $$;
