-- Fix: in admin_list_support_tickets / admin_list_ticket_messages ist die
-- RETURNS-TABLE-Spalte "id" mehrdeutig zur Spalte profiles.id im Admin-Check.
-- Loesung: profiles.id qualifizieren.

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
declare
  uid uuid := auth.uid();
  is_adm boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select is_admin into is_adm from public.profiles where profiles.id = uid;
  if not coalesce(is_adm, false) then raise exception 'admin only'; end if;

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

grant execute on function public.admin_list_support_tickets(text, int, int) to authenticated;

create or replace function public.admin_list_ticket_messages(
  p_ticket_id uuid
) returns table (
  id uuid,
  sender text,
  body text,
  created_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_adm boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select is_admin into is_adm from public.profiles where profiles.id = uid;
  if not coalesce(is_adm, false) then raise exception 'admin only'; end if;

  return query
    select m.id, m.sender, m.body, m.created_at
    from public.support_ticket_messages m
    where m.ticket_id = p_ticket_id
    order by m.created_at asc;
end $$;

grant execute on function public.admin_list_ticket_messages(uuid) to authenticated;
