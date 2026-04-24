-- Allow signed-in players to view historical species index entries on profiles.
-- This powers ProfileView/IndexView for other players without exposing data to anon users.
drop policy if exists "idx public read" on public.species_index;
create policy "idx public read" on public.species_index
  for select using ((select auth.uid()) is not null);
