-- ProfileView und IndexView lesen species_index für beliebige User (authenticated).
-- Die alte "idx public read"-Policy wurde in 20260422_fixes.sql entfernt,
-- was dazu führte dass Profilansichten fremder Spieler leer blieben.
-- Neue Policy: jeder eingeloggte Nutzer darf alle Zeilen lesen (wie animals_public).
drop policy if exists "idx public read" on public.species_index;
create policy "idx public read" on public.species_index
  for select using ((select auth.uid()) is not null);
