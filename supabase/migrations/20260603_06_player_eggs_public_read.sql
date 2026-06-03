-- 20260603_06_player_eggs_public_read.sql
-- Relax player_eggs SELECT policy to public-read (analogous to animals table).
-- This allows TradeView to enumerate a partner's eggs without granting write access.
-- Owner-only enforcement still applies for INSERT/UPDATE/DELETE (handled via RPCs).

drop policy if exists "own player_eggs" on public.player_eggs;

create policy "player_eggs public read" on public.player_eggs
  for select to authenticated using (true);
