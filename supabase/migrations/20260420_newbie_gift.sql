-- =============================================================================
-- Newbie-Geschenk: einmaliger Hase + 50 Bonus-Taps für neue Spieler
-- =============================================================================

alter table public.profiles
  add column if not exists newbie_gift_claimed boolean not null default false;

-- claim_newbie_gift: gibt 1 Hase (bunny) und markiert Flag. Der 50-Taps-Bonus
-- wird clientseitig im localStorage verwaltet (tap_earn akzeptiert dynamisches
-- p_max, sodass der Client den Cap temporär erhöht).
create or replace function public.claim_newbie_gift()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  already boolean;
  pick_species text;
  new_animal public.animals%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select newbie_gift_claimed into already from public.profiles where id = uid for update;
  if coalesce(already, false) then
    raise exception 'newbie gift already claimed';
  end if;

  -- Bevorzugt 'bunny' oder Hase-artige Spezies, sonst günstigste aktive.
  select species into pick_species from public.species_costs
   where enabled
     and (lower(species) = 'bunny'
          or lower(species) = 'hase'
          or lower(species) = 'rabbit'
          or lower(name) like '%hase%'
          or lower(name) like '%bunny%'
          or lower(name) like '%rabbit%')
   order by cost asc
   limit 1;

  if pick_species is null then
    select species into pick_species from public.species_costs
     where enabled
     order by cost asc
     limit 1;
  end if;

  if pick_species is null then
    raise exception 'no species available';
  end if;

  insert into public.animals(owner_id, species)
    values (uid, pick_species)
    returning * into new_animal;

  update public.profiles
     set newbie_gift_claimed = true
   where id = uid;

  return jsonb_build_object(
    'species', pick_species,
    'animal_id', new_animal.id,
    'bonus_taps', 50
  );
end $$;

grant execute on function public.claim_newbie_gift() to authenticated;

-- =============================================================================
-- Case-insensitive Username-Uniqueness
-- =============================================================================
create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

