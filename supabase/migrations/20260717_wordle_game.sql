-- Zoo-Wordle Minispiel: tägliches deutsches 5-Buchstaben-Wort, 6 Versuche.
-- Komplett server-autoritativ: Wortliste + Bewertung liegen in Postgres,
-- die Lösung verlässt den Server erst nach Spielende. Sieg zahlt Coins/Tickets
-- (Streak-Multiplikator wie bei der täglichen Belohnung), Bestenliste per RPC.

create table if not exists public.wordle_words (
  id int generated always as identity primary key,
  word text not null unique check (char_length(word) = 5 and word ~ '^[A-ZÄÖÜ]{5}$')
);
alter table public.wordle_words enable row level security;
revoke all on table public.wordle_words from anon, authenticated;

create table if not exists public.wordle_daily_games (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  guesses jsonb not null default '[]'::jsonb,
  solved boolean not null default false,
  finished boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.wordle_daily_games enable row level security;
drop policy if exists "wordle_daily_games self read" on public.wordle_daily_games;
create policy "wordle_daily_games self read" on public.wordle_daily_games
  for select using ((select auth.uid()) = user_id);
revoke all on table public.wordle_daily_games from anon;
grant select on table public.wordle_daily_games to authenticated;

create table if not exists public.wordle_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  games int not null default 0,
  wins int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_win_day date,
  dist jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.wordle_stats enable row level security;
drop policy if exists "wordle_stats self read" on public.wordle_stats;
create policy "wordle_stats self read" on public.wordle_stats
  for select using ((select auth.uid()) = user_id);
revoke all on table public.wordle_stats from anon;
grant select on table public.wordle_stats to authenticated;

insert into public.wordle_words (word) values
  ('TIGER'),('ADLER'),('OTTER'),('KOALA'),('ZEBRA'),('PANDA'),('HYÄNE'),('BIBER'),
  ('FUCHS'),('LUCHS'),('ROBBE'),('WELPE'),('KATZE'),('RATTE'),('TAUBE'),('WESPE'),
  ('BIENE'),('KÄFER'),('SCHAF'),('ZIEGE'),('PFERD'),('KAMEL'),('BISON'),('OKAPI'),
  ('TAPIR'),('LEMUR'),('GECKO'),('KOBRA'),('VIPER'),('LACHS'),('HECHT'),('KREBS'),
  ('DACHS'),('MEISE'),('AMSEL'),('FALKE'),('FASAN'),('LÖWEN'),('BÄREN'),('AFFEN'),
  ('WÖLFE'),('HASEN'),('ELCHE'),('MÄUSE'),
  ('APFEL'),('BIRNE'),('BEERE'),('MANGO'),('TORTE'),('PIZZA'),('NUDEL'),('SUPPE'),
  ('SALAT'),('WURST'),('HONIG'),('SAHNE'),('MILCH'),('KAKAO'),('PILZE'),('BOHNE'),
  ('GURKE'),('MÖHRE'),('KRAUT'),('LAUCH'),('FEIGE'),('OLIVE'),('KEKSE'),('CHILI'),
  ('CURRY'),('QUARK'),('MÜSLI'),
  ('WIESE'),('BÄUME'),('BLATT'),('BLUME'),('ZWEIG'),('TANNE'),('EICHE'),('BUCHE'),
  ('BIRKE'),('AHORN'),('LINDE'),('PALME'),('TULPE'),('NELKE'),('ASTER'),('FLUSS'),
  ('TEICH'),('INSEL'),('KÜSTE'),('STEIN'),('STAUB'),('WOLKE'),('REGEN'),('HAGEL'),
  ('NEBEL'),('STURM'),('BLITZ'),('SONNE'),('STERN'),('LICHT'),('FEUER'),('ASCHE'),
  ('RAUCH'),('FROST'),('MEERE'),('BERGE'),('WINDE'),('MONDE'),('HÜGEL'),('EBENE'),
  ('WÜSTE'),('SUMPF'),('MOORE'),('WELLE'),('ALGEN'),('QUARZ'),('KOHLE'),('EISEN'),
  ('STAHL'),('BLECH'),('DRAHT'),('ROHRE'),
  ('TISCH'),('STUHL'),('REGAL'),('LAMPE'),('KERZE'),('UHREN'),('TASSE'),('GABEL'),
  ('KISTE'),('TRUHE'),('DECKE'),('HEFTE'),('STIFT'),('FEDER'),('BRIEF'),('KARTE'),
  ('MARKE'),('MÜNZE'),('KRONE'),('KETTE'),('PERLE'),('NADEL'),('FADEN'),('KNOPF'),
  ('STOFF'),('WOLLE'),('SEIDE'),('LEDER'),('SCHUH'),('SOCKE'),('HOSEN'),('JACKE'),
  ('KLEID'),('MÜTZE'),('SCHAL'),('WESTE'),('BLUSE'),('MASKE'),('LOCKE'),('KÄMME'),
  ('ZÖPFE'),('BÄRTE'),('SEIFE'),('CREME'),('KUGEL'),('BÄLLE'),('NETZE'),('RASEN'),
  ('HALLE'),('HAKEN'),('ZANGE'),('SÄGEN'),('NAGEL'),('FEILE'),('FARBE'),('KREIS'),
  ('ECKEN'),('KANTE'),('LINIE'),('TITEL'),('SEITE'),('ZEILE'),('DRUCK'),('RADIO'),
  ('HANDY'),('TASTE'),('KABEL'),('STROM'),('AMPEL'),('GLEIS'),('BOOTE'),('HAFEN'),
  ('ANKER'),('SEGEL'),('FLÜGE'),('BUSSE'),('AUTOS'),('WAGEN'),('RÄDER'),('MOTOR'),
  ('PFADE'),('MARKT'),('LADEN'),('KIOSK'),('KÄFIG'),('STALL'),('ACKER'),('ERNTE'),
  ('SAMEN'),('HAFER'),('STROH'),
  ('TRAUM'),('PAUSE'),('KRAFT'),('MACHT'),('ANGST'),('GLÜCK'),('SORGE'),('LIEBE'),
  ('TREUE'),('STOLZ'),('WITZE'),('SPASS'),('LEERE'),('JUNGE'),('TEMPO'),('START'),
  ('ZIELE'),('RUNDE'),('KURVE'),('STUFE'),('SEILE'),('MUSIK'),('NOTEN'),('GEIGE'),
  ('FLÖTE'),('HARFE'),('KLANG'),('TÄNZE'),('OPERN'),('BÜHNE'),('FILME'),('SZENE'),
  ('KÖNIG'),('DAMEN'),('PRINZ'),('ZWERG'),('RIESE'),('HEXEN'),('GEIST'),('MAGIE'),
  ('TRICK'),('FRAGE'),('WORTE'),('SILBE'),('SÄTZE'),('TEXTE'),('SPIEL'),('FIGUR'),
  ('PUNKT'),('SIEGE'),('PREIS'),('POKAL'),('ORDEN'),('PROBE'),('FEIER'),('PARTY'),
  ('GABEN'),('VATER'),('TANTE'),('ONKEL'),('NEFFE'),('GÄSTE'),('LEUTE'),('KÖCHE'),
  ('ÄRZTE'),('BAUER'),('JÄGER'),('MALER'),('CLOWN'),('PILOT'),('STADT'),('HOTEL'),
  ('BANDE'),('HAARE'),('STIRN'),('AUGEN'),('LIPPE'),('ZUNGE'),('ZÄHNE'),('HÄNDE'),
  ('BEINE'),('FÜSSE'),('ZEHEN'),('MAGEN'),('ÄRMEL'),('SÖHNE'),('WOCHE'),('MONAT'),
  ('JAHRE'),('HEUTE'),('ABEND'),('NACHT'),('IMMER'),('DANKE'),('BITTE'),('HALLO'),
  ('MÖBEL'),('GEHEN'),('SEHEN'),('HÖREN'),('LESEN'),('MALEN'),('BAUEN'),('HEBEN'),
  ('ESSEN'),('NÄHEN'),('RUFEN'),('REDEN'),('SAGEN'),('GEBEN'),('RATEN'),('LÖSEN'),
  ('EILEN'),('BADEN'),('TAUEN'),('KLEIN'),('GROSS'),('BREIT'),('LANGE'),('TIEFE'),
  ('WEITE'),('SAUER'),('MILDE'),('HEISS'),('KÜHLE'),('NASSE'),('HELLE'),('BUNTE'),
  ('BLAUE'),('GRÜNE'),('BRAUN'),('WEISS'),('GELBE'),('GANZE'),('VOLLE')
on conflict (word) do nothing;

-- Belohnung: Coins nach Versuchen, Streak-Multiplikator max x2 (wie Daily).
create or replace function public._wordle_reward(p_attempts int, p_streak int)
returns table (coins bigint, tickets bigint)
language sql immutable set search_path = public as $$
  select
    ((case p_attempts when 1 then 12000 when 2 then 9000 when 3 then 7000
        when 4 then 5000 when 5 then 3500 else 2500 end)
     * (10 + least(greatest(p_streak, 1) - 1, 10)) / 10)::bigint,
    (case p_attempts when 1 then 3 when 2 then 2 when 3 then 1 when 4 then 1 else 0 end)::bigint;
$$;

-- Tageswort deterministisch aus md5(Tag) -> Index in die Wortliste.
create or replace function public._wordle_solution(p_day date)
returns text language sql stable set search_path = public as $$
  select w.word
  from (select word, row_number() over (order by id) as rn from public.wordle_words) w
  where w.rn = 1 + mod(
    ('x' || substr(md5(p_day::text || '-zoo-wordle'), 1, 8))::bit(32)::int & 2147483647,
    (select count(*)::int from public.wordle_words)
  );
$$;

-- Klassischer Zwei-Pass: erst exakte Treffer (c), dann vorhandene Buchstaben (p)
-- unter Beachtung der Restbuchstaben (Duplikate korrekt), sonst (a).
create or replace function public._wordle_eval(p_guess text, p_solution text)
returns text language plpgsql immutable set search_path = public as $$
declare
  v_res text[] := array['a','a','a','a','a'];
  v_rest text := '';
  v_ch text;
  v_pos int;
  i int;
begin
  for i in 1..5 loop
    if substr(p_guess, i, 1) = substr(p_solution, i, 1) then
      v_res[i] := 'c';
    else
      v_rest := v_rest || substr(p_solution, i, 1);
    end if;
  end loop;
  for i in 1..5 loop
    if v_res[i] = 'a' then
      v_ch := substr(p_guess, i, 1);
      v_pos := position(v_ch in v_rest);
      if v_pos > 0 then
        v_res[i] := 'p';
        v_rest := overlay(v_rest placing '' from v_pos for 1);
      end if;
    end if;
  end loop;
  return array_to_string(v_res, '');
end $$;

create or replace function public._wordle_state(p_uid uuid)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_game public.wordle_daily_games%rowtype;
  v_stats public.wordle_stats%rowtype;
  v_guesses jsonb;
  v_finished boolean;
begin
  select * into v_game from public.wordle_daily_games
   where user_id = p_uid and day = v_today;
  select * into v_stats from public.wordle_stats where user_id = p_uid;
  v_guesses := coalesce(v_game.guesses, '[]'::jsonb);
  v_finished := coalesce(v_game.finished, false);
  return jsonb_build_object(
    'day', v_today,
    'guesses', v_guesses,
    'attempts', jsonb_array_length(v_guesses),
    'max_guesses', 6,
    'word_length', 5,
    'finished', v_finished,
    'solved', coalesce(v_game.solved, false),
    'solution', case when v_finished then public._wordle_solution(v_today) else null end,
    'stats', jsonb_build_object(
      'games', coalesce(v_stats.games, 0),
      'wins', coalesce(v_stats.wins, 0),
      'current_streak', coalesce(v_stats.current_streak, 0),
      'best_streak', coalesce(v_stats.best_streak, 0),
      'dist', coalesce(v_stats.dist, '{}'::jsonb)
    ),
    'next_day_at', ((v_today + 1)::timestamp at time zone 'utc'),
    'server_now', now()
  );
end $$;

create or replace function public.get_wordle_state()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  return public._wordle_state(uid);
end $$;

create or replace function public.wordle_guess(p_guess text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_guess text := upper(trim(coalesce(p_guess, '')));
  v_solution text;
  v_game public.wordle_daily_games%rowtype;
  v_result text;
  v_attempts int;
  v_solved boolean;
  v_finished boolean;
  v_streak int;
  v_last_win date;
  v_base record;
  v_coins bigint := 0;
  v_tickets bigint := 0;
  new_coins bigint;
  new_tickets bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if v_guess !~ '^[A-ZÄÖÜ]{5}$' then raise exception 'invalid guess'; end if;

  insert into public.wordle_daily_games (user_id, day)
  values (uid, v_today)
  on conflict (user_id, day) do nothing;

  select * into v_game from public.wordle_daily_games
   where user_id = uid and day = v_today for update;

  if v_game.finished then raise exception 'already finished'; end if;

  v_solution := public._wordle_solution(v_today);
  v_result := public._wordle_eval(v_guess, v_solution);
  v_attempts := jsonb_array_length(v_game.guesses) + 1;
  v_solved := (v_result = 'ccccc');
  v_finished := v_solved or v_attempts >= 6;

  update public.wordle_daily_games
     set guesses = guesses || jsonb_build_object('g', v_guess, 'r', v_result),
         solved = v_solved,
         finished = v_finished,
         updated_at = now()
   where user_id = uid and day = v_today;

  if v_finished then
    insert into public.wordle_stats (user_id) values (uid)
    on conflict (user_id) do nothing;

    select current_streak, last_win_day into v_streak, v_last_win
      from public.wordle_stats where user_id = uid for update;

    if v_solved then
      v_streak := case when v_last_win = v_today - 1 then coalesce(v_streak, 0) + 1 else 1 end;
      select * into v_base from public._wordle_reward(v_attempts, v_streak);
      v_coins := v_base.coins;
      v_tickets := v_base.tickets;
      update public.wordle_stats
         set games = games + 1,
             wins = wins + 1,
             current_streak = v_streak,
             best_streak = greatest(best_streak, v_streak),
             last_win_day = v_today,
             dist = jsonb_set(dist, array[v_attempts::text],
                              to_jsonb(coalesce((dist ->> v_attempts::text)::int, 0) + 1)),
             updated_at = now()
       where user_id = uid;
      update public.profiles
         set coins = coins + v_coins,
             tickets = tickets + v_tickets
       where id = uid
       returning coins, tickets into new_coins, new_tickets;
    else
      update public.wordle_stats
         set games = games + 1,
             current_streak = 0,
             updated_at = now()
       where user_id = uid;
    end if;
  end if;

  return public._wordle_state(uid) || jsonb_build_object(
    'result', v_result,
    'coins_added', v_coins,
    'tickets_added', v_tickets,
    'coins', new_coins,
    'tickets', new_tickets
  );
end $$;

create or replace function public.get_wordle_leaderboard(p_limit int default 50)
returns table (
  username text,
  avatar_emoji text,
  current_streak int,
  best_streak int,
  wins int,
  games int
) language sql security definer set search_path = public as $$
  select p.username, p.avatar_emoji, s.current_streak, s.best_streak, s.wins, s.games
  from public.wordle_stats s
  join public.profiles p on p.id = s.user_id
  where coalesce(p.is_banned, false) = false
    and s.wins > 0
  order by s.current_streak desc, s.best_streak desc, s.wins desc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.get_wordle_state() to authenticated;
grant execute on function public.wordle_guess(text) to authenticated;
grant execute on function public.get_wordle_leaderboard(int) to authenticated, anon;

-- anon darf die Spiel-RPCs gar nicht erst aufrufen; interne Helfer bleiben
-- komplett gesperrt (insbesondere _wordle_solution: sonst Lösungs-Orakel).
revoke execute on function public.get_wordle_state() from anon, public;
revoke execute on function public.wordle_guess(text) from anon, public;
revoke execute on function public._wordle_state(uuid) from anon, authenticated, public;
revoke execute on function public._wordle_solution(date) from anon, authenticated, public;
revoke execute on function public._wordle_eval(text, text) from anon, authenticated, public;
revoke execute on function public._wordle_reward(int, int) from anon, authenticated, public;
