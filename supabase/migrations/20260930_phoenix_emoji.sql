-- Phönix bekommt sein eigenes Emoji (🐦‍🔥) zurück. Die Zoo-Welt zeichnet Tiere
-- als Canvas-Sprites und ersetzt die ZWJ-Sequenz dort clientseitig durch 🦅
-- (siehe CANVAS_EMOJI_FALLBACK in worldEngine.js).
update public.species_costs set emoji = '🐦‍🔥'
 where species = 'phoenix' and emoji = '🦅';
