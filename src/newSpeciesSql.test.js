import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260612_new_species_and_crafts.sql'),
  'utf8',
)

function speciesRow(species) {
  const m = sql.match(new RegExp(`\\('${species}',[^)]+\\)`))
  assert.ok(m, `species ${species} missing in migration`)
  const parts = m[0].slice(1, -1).split(',').map((s) => s.trim().replace(/^'|'$/g, ''))
  return {
    species: parts[0],
    cost: Number(parts[3]),
    rate: Number(parts[4]),
    weight: Number(parts[5]),
    enabled: parts[6] === 'true',
    shop_visible: parts[7] === 'true',
    craft_only: parts[8] === 'true',
  }
}

test('shop species keep the payback curve intact (no dominant new animal)', () => {
  // Bestehende Nachbarn aus der Live-Economy (cost, rate).
  const neighbors = {
    fox: { below: { cost: 30000, rate: 160 }, above: { cost: 150000, rate: 800 } },
    wolf: { below: { cost: 820000, rate: 4200 }, above: { cost: 4000000, rate: 18000 } },
    shark: { below: { cost: 100000000, rate: 420000 }, above: { cost: 500000000, rate: 900000 } },
    mammoth: { below: { cost: 850000000, rate: 1500000 }, above: null },
  }
  for (const [key, { below, above }] of Object.entries(neighbors)) {
    const row = speciesRow(key)
    assert.ok(row.enabled && row.shop_visible && !row.craft_only, `${key} must be a shop animal`)
    assert.ok(row.cost > below.cost && row.rate > below.rate, `${key} must sit above its lower neighbor`)
    assert.ok(row.cost / row.rate >= below.cost / below.rate, `${key} must not beat the payback of its lower neighbor`)
    if (above) {
      assert.ok(row.cost < above.cost && row.rate < above.rate, `${key} must sit below its upper neighbor`)
    }
  }
})

test('craft species are craft-only and never inflate income above their inputs', () => {
  const inputs = {
    flamingo: 4 * 2 * 10 + 100, // 4x Rainbow-Huhn + Toleranz für Early-Game
    owl: 3 * 160 * 10,
    worldturtle: 2 * 420000 * 10 + 1 * 900000 * 10,
  }
  for (const [key, inputRate] of Object.entries(inputs)) {
    const row = speciesRow(key)
    assert.ok(!row.enabled && !row.shop_visible && row.craft_only, `${key} must be craft-only`)
    assert.ok(row.rate <= inputRate, `${key} rate ${row.rate} must stay <= input rate ${inputRate}`)
  }
})

test('recipes are idempotent and reference only obtainable shop species', () => {
  assert.match(sql, /where not exists \(\s*select 1 from public\.craft_recipes r where r\.output_species = v\.output_species\s*\)/)
  for (const ing of ['chicken', 'sheep', 'dragon', 'jormungandr']) {
    assert.match(sql, new RegExp(`"species":"${ing}","tier":"rainbow"`))
  }
})

test('species upsert is idempotent via on conflict', () => {
  assert.match(sql, /on conflict \(species\) do update set/)
})
