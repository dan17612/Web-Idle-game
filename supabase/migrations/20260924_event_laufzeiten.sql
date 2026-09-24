-- Laufzeiten der laufenden Ereignisse.
--
-- BlockFall läuft 60 Tage, die übrigen laufenden Ereignisse etwas kürzer und
-- gestaffelt, damit nicht alles am selben Tag verschwindet. Alle Enden liegen
-- auf 23:59:59 deutscher Zeit (CET = UTC+1).
--
-- Die Zoo-Welt (world_lobby) bleibt ohne Ende: Sie ist die Lobby, kein
-- zeitlich begrenztes Ereignis. Der Endlessboss zeigt ab jetzt ebenfalls den
-- Countdown ("Verschwindet in …").

update public.event_schedule set ends_at = '2026-11-23 22:59:59+00', enabled = true, show_countdown = true
 where key = 'blockfall_game';

update public.event_schedule set ends_at = '2026-11-13 22:59:59+00', enabled = true, show_countdown = true
 where key = 'breeding_game';

update public.event_schedule set ends_at = '2026-11-08 22:59:59+00', enabled = true, show_countdown = true
 where key = 'boss_endless';

update public.event_schedule set ends_at = '2026-11-03 22:59:59+00', enabled = true, show_countdown = true
 where key = 'wordle_game';
