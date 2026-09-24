import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MARKET } from './market.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260924_tier_boerse.sql'),
  'utf8'
)

function fnBody(name) {
  const start = sql.indexOf(`create or replace function public.${name}(`)
  assert.ok(start >= 0, `function ${name} missing`)
  const end = sql.indexOf('$$;', sql.indexOf('$$', start) + 2)
  return sql.slice(start, end)
}

const RPCS = [
  'market_overview()',
  'market_book(text, text, text)',
  'market_list(uuid[], bigint)',
  'market_cancel(uuid[])',
  'market_buy(uuid[])'
]
const HELPERS = [
  '_market_ease_from_chance(numeric)',
  '_market_model(timestamptz)',
  '_market_values()',
  '_market_listing_ok(uuid, uuid)',
  '_market_snapshot()'
]

test('all market tables have RLS and select-only access', () => {
  for (const t of ['market_listings', 'market_fills', 'market_snapshots']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${t}`))
    assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`))
    assert.match(sql, new RegExp(`revoke all on table public\\.${t} from anon, authenticated`))
    assert.match(sql, new RegExp(`grant select on table public\\.${t} to authenticated`))
  }
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*to authenticated/)
  assert.match(sql, /revoke all on sequence public\.market_fills_id_seq from anon, authenticated/)
})

test('listings are private to the seller, fills to buyer and seller', () => {
  assert.match(sql, /"market_listings self read"[\s\S]*?for select using \(\(select auth\.uid\(\)\) = seller_id\)/)
  assert.match(sql, /"market_fills self read"[\s\S]*?using \(\(select auth\.uid\(\)\) = seller_id or \(select auth\.uid\(\)\) = buyer_id\)/)
})

test('one open listing per animal and sane price bounds', () => {
  assert.match(sql, /create unique index if not exists market_listings_open_animal_uidx\s+on public\.market_listings \(animal_id\) where status = 'open'/)
  assert.match(sql, /price bigint not null check \(price >= 1 and price <= 1000000000000000\)/)
  assert.match(sql, /status in \('open', 'sold', 'cancelled'\)/)
})

test('transactions accept the market kind', () => {
  assert.match(sql, /array\['send'::text, 'trade'::text, 'public_trade'::text, 'market'::text\]/)
})

test('every function pins search_path', () => {
  const defs = sql.match(/create or replace function[\s\S]*?as \$\$/g) || []
  assert.equal(defs.length, RPCS.length + HELPERS.length)
  for (const d of defs) assert.match(d, /set search_path = public/, d.split('\n')[0])
})

test('RPCs are security definer, authenticated only; helpers are internal', () => {
  for (const fn of RPCS) {
    const name = fn.split('(')[0]
    assert.match(fnBody(name), /security definer/)
    assert.match(fnBody(name), /if uid is null then raise exception 'not authenticated'/)
    assert.ok(sql.includes(`grant execute on function public.${fn} to authenticated;`), fn)
    assert.ok(sql.includes(`revoke execute on function public.${fn} from anon, public;`), fn)
  }
  for (const fn of HELPERS) {
    assert.ok(sql.includes(`revoke execute on function public.${fn} from anon, authenticated, public;`), fn)
  }
})

test('formula constants mirror src/market.js', () => {
  const model = fnBody('_market_model')
  assert.ok(model.includes(`sc.rate::numeric * ${MARKET.UTIL_FACTOR}`), 'UTIL_FACTOR')
  assert.ok(model.includes(`(1 + ${MARKET.SCARCITY_WEIGHT} * g.scarcity * (1 - least(1::numeric, g.ease)))`), 'SCARCITY_WEIGHT')
  assert.ok(model.includes(`${MARKET.EGG_EASE} * public._market_ease_from_chance(egg.p)`), 'EGG_EASE')
  assert.ok(model.includes(`${MARKET.BREED_EASE} * public._market_ease_from_chance(breed.p)`), 'BREED_EASE')
  assert.ok(model.includes(`public._breed_weights(${MARKET.BREED_REF_POWER}::numeric)`), 'BREED_REF_POWER')
  assert.ok(model.includes(`${MARKET.CRAFT_EASE} * min(s0.ease0)`), 'CRAFT_EASE')
  assert.ok(model.includes(`case when s0.leaving then ${MARKET.LEAVING_EASE} else 1 end`), 'LEAVING_EASE')
  assert.ok(model.includes(`greatest(0::numeric, 1 - ${MARKET.TIER_EASE_STEP} * td."order")`), 'TIER_EASE_STEP')
  assert.match(model, /1 - sqrt\(least\(1::numeric, coalesce\(h\.holders, 0\)::numeric \/ pl\.n\)\)/)
  assert.match(model, /greatest\(1, td\.required_qty\) as qty/)
  assert.match(model, /where sc\.enabled and sc\.weight > 0 and not coalesce\(sc\.craft_only, false\)/)

  const ease = fnBody('_market_ease_from_chance')
  assert.match(ease, /\(log\(10::numeric, p\) \+ 4\) \/ 3/)

  const values = fnBody('_market_values')
  const w = `least(${MARKET.FILL_WEIGHT_MAX}, ${MARKET.FILL_WEIGHT_STEP} * f.n)`
  assert.ok(values.includes(`(1 - ${w}) * ln(greatest(m.model, 1))`), 'fill weight')
  assert.ok(values.includes(`least(greatest(m.model, 1) * ${MARKET.FILL_CLAMP}, greatest(greatest(m.model, 1) / ${MARKET.FILL_CLAMP}, f.med))`), 'FILL_CLAMP')
  assert.ok(values.includes(`interval '${MARKET.FILL_WINDOW_DAYS} days'`), 'FILL_WINDOW_DAYS')
})

test('a listing is only valid while the animal is free and still owned', () => {
  const ok = fnBody('_market_listing_ok')
  assert.match(ok, /a\.owner_id = p_seller/)
  assert.match(ok, /not a\.equipped/)
  assert.match(ok, /a\.upgrade_ready_at is null or a\.upgrade_ready_at <= now\(\)/)
  assert.match(ok, /a\.breeding_until is null or a\.breeding_until <= now\(\)/)
  assert.match(ok, /not coalesce\(p\.is_banned, false\)/)
})

test('listing validates price, count, ownership and open-listing cap', () => {
  const list = fnBody('market_list')
  assert.match(list, /p_price < 1 or p_price > 1000000000000000/)
  assert.match(list, /v_n < 1 or v_n > 25/)
  assert.match(list, /for update/)
  assert.match(list, /not public\._market_listing_ok\(aid, uid\)/)
  assert.match(list, /seller_id <> uid/)
  assert.match(list, /v_open \+ v_n > 60/)
})

test('buying is atomic, blocks self-trades and checks coins', () => {
  const buy = fnBody('market_buy')
  assert.match(buy, /from public\.market_listings where id = any\(v_ids\) order by id for update/)
  assert.match(buy, /raise exception 'cannot buy your own listing'/)
  assert.match(buy, /not public\._market_listing_ok\(l\.animal_id, l\.seller_id\)/)
  assert.match(buy, /where id = uid and coins >= v_total/)
  assert.match(buy, /update public\.animals set owner_id = uid, equipped = false/)
  assert.match(buy, /insert into public\.market_fills/)
  assert.match(buy, /'market',/)
  assert.match(buy, /'coins', v_bal/)
  assert.match(buy, /'server_now', now\(\)/)
  // Liebling des Verkäufers springt auf ein anderes Tier
  assert.match(buy, /p\.favorite_animal_id = any\(v_animals\)/)
})

test('cancel only touches own open listings', () => {
  const cancel = fnBody('market_cancel')
  assert.match(cancel, /seller_id = uid and status = 'open'/)
})

test('snapshots are hourly, lazy and pruned; history is backfilled', () => {
  const snap = fnBody('_market_snapshot')
  assert.match(snap, /date_trunc\('hour', now\(\)\)/)
  assert.match(snap, /bucket < now\(\) - interval '35 days'/)
  assert.match(fnBody('market_overview'), /perform public\._market_snapshot\(\)/)
  assert.match(sql, /for k in 1\.\.56 loop/)
  assert.match(sql, /for k in 15\.\.30 loop/)
  assert.match(fnBody('market_overview'), /generate_series\(1, 28\)/)
})
