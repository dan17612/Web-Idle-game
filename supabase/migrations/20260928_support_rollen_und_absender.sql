-- 20260928_support_rollen_und_absender.sql
-- 1) Support-Chat zeigt, welcher Admin geantwortet hat: Absender-ID, Name und
--    Rolle werden pro Nachricht gespeichert (Name als Schnappschuss).
-- 2) Sub-Admins duerfen nur noch Spieler sperren (+ dafuer suchen) und
--    Support-Tickets bearbeiten. Shop/Restock/Rotation, Spezies, Geschenke,
--    Broadcast, Promo-Codes und Roadmap-Verwaltung sind nur noch fuer Admins.

-- ── 1) Absender an der Nachricht ─────────────────────────────────────
alter table public.support_ticket_messages
  add column if not exists sender_id uuid references auth.users on delete set null,
  add column if not exists sender_name text,
  add column if not exists sender_role text check (sender_role is null or sender_role in ('admin', 'subadmin'));

-- ── 2a) Tickets: Admin + Sub-Admin ───────────────────────────────────
create or replace function public.admin_reply_support_ticket(
  p_ticket_id uuid,
  p_reply text,
  p_close boolean default false
) returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  role text := public._admin_role();
  uname text;
  reply_clean text;
  new_status text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if role is null then raise exception 'admin only'; end if;

  reply_clean := trim(coalesce(p_reply, ''));
  if reply_clean = '' then raise exception 'reply required'; end if;
  if length(reply_clean) > 5000 then raise exception 'reply too long'; end if;

  select nullif(trim(p.username), '') into uname from public.profiles p where p.id = uid;

  new_status := case when coalesce(p_close, false) then 'closed' else 'replied' end;

  update public.support_tickets
    set admin_reply = reply_clean,
        replied_at = now(),
        status = new_status,
        reminder_sent_at = null,
        closed_at = case when coalesce(p_close, false) then now() else closed_at end
    where id = p_ticket_id;
  if not found then raise exception 'ticket not found'; end if;

  insert into public.support_ticket_messages (ticket_id, sender, body, sender_id, sender_name, sender_role)
  values (p_ticket_id, 'admin', reply_clean, uid, uname, role);

  perform public._notify_support_mailer(p_ticket_id, 'reply');

  return jsonb_build_object('ok', true, 'status', new_status, 'sender_name', uname, 'sender_role', role);
end $$;

create or replace function public.admin_list_support_tickets(
  p_status text default null,
  p_limit int default 100,
  p_offset int default 0
) returns table (
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
  closed_at timestamptz,
  last_user_message_at timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if public._admin_role() is null then raise exception 'admin only'; end if;

  return query
    select t.id, t.ticket_number, t.user_id, t.username, t.user_email,
           t.subject, t.message, t.status, t.admin_reply, t.notify_user_copy,
           t.created_at, t.replied_at, t.closed_at,
           (select max(m.created_at) from public.support_ticket_messages m
              where m.ticket_id = t.id and m.sender = 'user') as last_user_message_at
    from public.support_tickets t
    where p_status is null or t.status = p_status
    order by t.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(0, coalesce(p_offset, 0));
end $$;

-- Rueckgabetyp aendert sich (Absender-Spalten) -> erst droppen.
drop function if exists public.admin_list_ticket_messages(uuid);
create or replace function public.admin_list_ticket_messages(
  p_ticket_id uuid
) returns table (
  id uuid,
  sender text,
  body text,
  created_at timestamptz,
  sender_name text,
  sender_role text
) language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if public._admin_role() is null then raise exception 'admin only'; end if;

  return query
    select m.id, m.sender, m.body, m.created_at, m.sender_name, m.sender_role
    from public.support_ticket_messages m
    where m.ticket_id = p_ticket_id
    order by m.created_at asc;
end $$;

revoke all on function public.admin_reply_support_ticket(uuid, text, boolean) from public, anon;
grant execute on function public.admin_reply_support_ticket(uuid, text, boolean) to authenticated;
revoke all on function public.admin_list_support_tickets(text, int, int) from public, anon;
grant execute on function public.admin_list_support_tickets(text, int, int) to authenticated;
revoke all on function public.admin_list_ticket_messages(uuid) from public, anon;
grant execute on function public.admin_list_ticket_messages(uuid) to authenticated;

-- ── 2b) Alles andere nur noch fuer Admins ────────────────────────────
-- Die Funktionen haben alle denselben Guard. Statt die (teils langen)
-- Rumpfe zu kopieren, wird der Guard in der Live-Definition ersetzt.
-- Bleiben fuer Sub-Admins offen: admin_list_users, admin_set_user_ban,
-- admin_set_support_ticket_status und die Ticket-RPCs oben.
do $$
declare
  fn text;
  def text;
  old_guard constant text := 'if role is null then raise exception ''admin only''; end if;';
  new_guard constant text := 'if role is distinct from ''admin'' then raise exception ''admin only''; end if;';
begin
  foreach fn in array array[
    'admin_broadcast(text)',
    'admin_force_add(text, integer)',
    'admin_force_remove(text)',
    'admin_force_rotation()',
    'admin_set_species_enabled(text, boolean)',
    'admin_set_species_weight(text, integer)',
    'admin_queue_gift(text, bigint, text, text, integer, text)',
    'admin_queue_gift_bulk(text, bigint, text, text, integer, text)',
    'admin_list_promo_codes()',
    'admin_set_idea_status(uuid, text)',
    'admin_delete_idea(uuid)'
  ] loop
    def := pg_get_functiondef(('public.' || fn)::regprocedure);
    if position(new_guard in def) > 0 then
      continue; -- schon umgestellt (Migration erneut ausgefuehrt)
    end if;
    if position(old_guard in def) = 0 then
      raise exception 'guard not found in %', fn;
    end if;
    execute replace(def, old_guard, new_guard);
  end loop;
end $$;
