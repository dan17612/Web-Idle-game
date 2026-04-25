-- =============================================================================
-- Newbie-Geschenk: zusätzlich 1000 Münzen für den Tutorial-Start
-- =============================================================================
create or replace function public.claim_newbie_gift()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  already boolean;
  pick_species text;
  new_animal public.animals%rowtype;
  new_balance bigint;
  gift_coins constant bigint := 1000;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select newbie_gift_claimed into already from public.profiles where id = uid for update;
  if coalesce(already, false) then
    raise exception 'newbie gift already claimed';
  end if;

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
     set newbie_gift_claimed = true,
         coins = coins + gift_coins
   where id = uid
   returning coins into new_balance;

  return jsonb_build_object(
    'species', pick_species,
    'animal_id', new_animal.id,
    'bonus_taps', 50,
    'coins_added', gift_coins,
    'coins', new_balance
  );
end $$;

grant execute on function public.claim_newbie_gift() to authenticated;
