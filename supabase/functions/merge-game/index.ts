// Edge Function: merge-game
// Serverautoritative 2048-ähnliche Merge-Logik für das globale Tier-Event.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Direction = 'up' | 'down' | 'left' | 'right'
type BoardCell = { id: string; rank: number } | null
type SpeciesRow = {
  species: string
  name: string | null
  emoji: string | null
  cost: number | string
  rate: number | string | null
  weight: number | string | null
  enabled: boolean | null
  shop_visible: boolean | null
}

const BOARD_SIZE = 4
const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE
const MYTHIC_SPECIES = ['phoenix', 'unicorn', 'jormungandr', 'kraken']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
}

function need(key: string): string {
  const value = Deno.env.get(key)
  if (!value) throw new Error(`missing env ${key}`)
  return value
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeBoard(raw: unknown): BoardCell[] {
  const arr = Array.isArray(raw) ? raw : []
  const board: BoardCell[] = []
  for (let i = 0; i < BOARD_CELLS; i++) {
    const cell = arr[i]
    const rank = Number(cell?.rank)
    board.push(cell && Number.isFinite(rank) && rank >= 0
      ? { id: String(cell.id || crypto.randomUUID()), rank: Math.floor(rank) }
      : null)
  }
  return board
}

function boardKey(board: BoardCell[]) {
  return board.map((cell) => cell?.rank ?? '.').join(',')
}

function hasEmpty(board: BoardCell[]) {
  return board.some((cell) => !cell)
}

function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return '∞'
  if (n < 1000) return String(Math.floor(n))
  const units = ['', 'K', 'M', 'B', 'T', 'Q']
  let value = n
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit++
  }
  const decimals = value < 10 ? 2 : value < 100 ? 1 : 0
  return `${value.toFixed(decimals)}${units[unit]}`
}

function valueLabel(rank: number): string {
  if (rank <= 50) return compactNumber(2 ** rank)
  return `2^${rank}`
}

function speciesForRank(rank: number, speciesRows: SpeciesRow[]) {
  const rows = speciesRows.length ? speciesRows : [{
    species: 'chick',
    name: 'Küken',
    emoji: '🐤',
    cost: 50,
    rate: 1,
    weight: 100,
    enabled: true,
    shop_visible: true,
  }]
  const index = rank % rows.length
  const cycle = Math.floor(rank / rows.length)
  const row = rows[index]
  return {
    rank,
    value_label: valueLabel(rank),
    species: row.species,
    name: row.name || row.species,
    emoji: row.emoji || '❓',
    rate: Number(row.rate || 0),
    cost: Number(row.cost || 0),
    weight: Number(row.weight || 0),
    cycle,
    mythic: MYTHIC_SPECIES.includes(row.species),
  }
}

function decorateBoard(board: BoardCell[], speciesRows: SpeciesRow[]) {
  return board.map((cell) => {
    if (!cell) return null
    return {
      ...cell,
      ...speciesForRank(cell.rank, speciesRows),
    }
  })
}

function decoratedMapping(speciesRows: SpeciesRow[], count = 28) {
  return Array.from({ length: count }, (_, rank) => speciesForRank(rank, speciesRows))
}

function activeBonusMultiplier(globalState: Record<string, unknown> | null) {
  const until = globalState?.bonus_until ? new Date(String(globalState.bonus_until)).getTime() : 0
  if (until <= Date.now()) return 1
  return Math.max(1, Number(globalState?.bonus_multiplier || 1))
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0)
  if (total <= 0) return items[0]
  let roll = Math.random() * total
  for (const item of items) {
    roll -= Math.max(0, item.weight)
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}

function randomSpawnRank(speciesRows: SpeciesRow[], globalState: Record<string, unknown> | null) {
  const activeBonus = activeBonusMultiplier(globalState) > 1
  const enabled = speciesRows.filter((s) => s.enabled !== false && Number(s.weight || 0) > 0)
  const base = (enabled.length ? enabled : speciesRows).slice(0, activeBonus ? 5 : 4)
  const candidates = base.map((sp, rank) => ({
    rank,
    weight: Math.max(0.1, Number(sp.weight || 1)) / Math.pow(2, rank),
  }))
  return weightedPick(candidates.length ? candidates : [{ rank: 0, weight: 1 }]).rank
}

function spawnTile(board: BoardCell[], speciesRows: SpeciesRow[], globalState: Record<string, unknown> | null) {
  const empties = board
    .map((cell, index) => cell ? null : index)
    .filter((index): index is number => index !== null)
  if (!empties.length) return { board, spawned: null }
  const index = empties[Math.floor(Math.random() * empties.length)]
  const rank = randomSpawnRank(speciesRows, globalState)
  const next = board.slice()
  next[index] = { id: crypto.randomUUID(), rank }
  return { board: next, spawned: { index, rank, ...speciesForRank(rank, speciesRows) } }
}

function createInitialBoard(speciesRows: SpeciesRow[], globalState: Record<string, unknown> | null) {
  let board = Array.from({ length: BOARD_CELLS }, () => null) as BoardCell[]
  board = spawnTile(board, speciesRows, globalState).board
  board = spawnTile(board, speciesRows, globalState).board
  return board
}

function lineIndices(direction: Direction) {
  const lines: number[][] = []
  if (direction === 'left' || direction === 'right') {
    for (let row = 0; row < BOARD_SIZE; row++) {
      const line = []
      for (let col = 0; col < BOARD_SIZE; col++) line.push(row * BOARD_SIZE + col)
      lines.push(direction === 'left' ? line : line.reverse())
    }
  } else {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const line = []
      for (let row = 0; row < BOARD_SIZE; row++) line.push(row * BOARD_SIZE + col)
      lines.push(direction === 'up' ? line : line.reverse())
    }
  }
  return lines
}

function scoreForRank(rank: number, speciesRows: SpeciesRow[], combo: number, bonus: number) {
  const meta = speciesForRank(rank, speciesRows)
  const value = 2 ** Math.min(rank, 30)
  const rateFactor = Math.max(1, Math.log10(Number(meta.rate || 0) + 10))
  const comboFactor = 1 + Math.max(0, combo - 1) * 0.25
  return Math.max(1, Math.round(value * rateFactor * comboFactor * bonus))
}

function moveBoard(
  board: BoardCell[],
  direction: Direction,
  speciesRows: SpeciesRow[],
  globalState: Record<string, unknown> | null,
) {
  const before = boardKey(board)
  const next = Array.from({ length: BOARD_CELLS }, () => null) as BoardCell[]
  const fusedRanks: number[] = []
  let fusions = 0
  let scoreDelta = 0
  let combo = 0
  const bonus = activeBonusMultiplier(globalState)

  for (const line of lineIndices(direction)) {
    const cells = line.map((index) => board[index]).filter((cell): cell is Exclude<BoardCell, null> => !!cell)
    const merged: BoardCell[] = []
    for (let i = 0; i < cells.length; i++) {
      const current = cells[i]
      const following = cells[i + 1]
      if (following && current.rank === following.rank) {
        const rank = current.rank + 1
        combo++
        fusions++
        fusedRanks.push(rank)
        scoreDelta += scoreForRank(rank, speciesRows, combo, bonus)
        merged.push({ id: crypto.randomUUID(), rank })
        i++
      } else {
        merged.push(current)
      }
    }
    for (let i = 0; i < line.length; i++) {
      next[line[i]] = merged[i] || null
    }
  }

  return {
    board: next,
    moved: before !== boardKey(next),
    fusions,
    scoreDelta,
    combo,
    fusedRanks,
  }
}

function hasMove(board: BoardCell[]) {
  if (hasEmpty(board)) return true
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const index = row * BOARD_SIZE + col
      const rank = board[index]?.rank
      if (rank == null) continue
      if (col < BOARD_SIZE - 1 && board[index + 1]?.rank === rank) return true
      if (row < BOARD_SIZE - 1 && board[index + BOARD_SIZE]?.rank === rank) return true
    }
  }
  return false
}

function highestRank(board: BoardCell[]) {
  return board.reduce((max, cell) => Math.max(max, cell?.rank ?? 0), 0)
}

function findMythicSpecies(fusedRanks: number[], speciesRows: SpeciesRow[]) {
  for (const rank of fusedRanks) {
    const meta = speciesForRank(rank, speciesRows)
    if (meta.mythic) return meta.species
  }
  const best = Math.max(0, ...fusedRanks)
  if (best >= 10 && Math.random() < 0.001) {
    return MYTHIC_SPECIES.find((species) => speciesRows.some((row) => row.species === species)) || null
  }
  return null
}

async function getUser(req: Request, admin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) throw new Response('missing authorization', { status: 401, headers: corsHeaders })
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Response('invalid authorization', { status: 401, headers: corsHeaders })
  return data.user
}

async function loadCatalog(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin
    .from('species_costs')
    .select('species, name, emoji, cost, rate, weight, enabled, shop_visible')
    .order('cost', { ascending: true })
  if (error) throw error
  return (data || []) as SpeciesRow[]
}

async function loadGlobal(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin
    .from('merge_global_state')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw error
  if (data) return data as Record<string, unknown>
  const { data: inserted, error: insertError } = await admin
    .from('merge_global_state')
    .insert({ id: 1 })
    .select('*')
    .single()
  if (insertError) throw insertError
  return inserted as Record<string, unknown>
}

async function loadMilestones(admin: ReturnType<typeof createClient>, userId: string) {
  const [{ data: milestones, error: milestonesError }, { data: claims, error: claimsError }] = await Promise.all([
    admin.from('merge_milestones').select('*').eq('is_active', true).order('fusion_goal', { ascending: true }),
    admin.from('merge_milestone_claims').select('fusion_goal').eq('user_id', userId),
  ])
  if (milestonesError) throw milestonesError
  if (claimsError) throw claimsError
  const claimed = new Set((claims || []).map((row) => Number(row.fusion_goal)))
  return (milestones || []).map((milestone) => ({
    ...milestone,
    claimed: claimed.has(Number(milestone.fusion_goal)),
  }))
}

async function ensureState(
  admin: ReturnType<typeof createClient>,
  userId: string,
  speciesRows: SpeciesRow[],
  globalState: Record<string, unknown>,
) {
  const { data, error } = await admin
    .from('merge_player_states')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (data && normalizeBoard(data.board).some(Boolean)) return data as Record<string, unknown>

  const board = createInitialBoard(speciesRows, globalState)
  const { data: saved, error: saveError } = await admin
    .from('merge_player_states')
    .upsert({
      user_id: userId,
      board,
      version: crypto.randomUUID(),
      highest_rank: highestRank(board),
      last_spawn_rank: highestRank(board),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (saveError) throw saveError
  return saved as Record<string, unknown>
}

function buildPayload(
  state: Record<string, unknown>,
  globalState: Record<string, unknown>,
  milestones: Record<string, unknown>[],
  speciesRows: SpeciesRow[],
  turn: Record<string, unknown> = {},
) {
  const board = normalizeBoard(state.board)
  const total = Number(globalState.total_fusions || 0)
  const claimable = milestones.filter((m) => !m.claimed && Number(m.fusion_goal || 0) <= total)
  const nextMilestone = milestones.find((m) => !m.claimed && Number(m.fusion_goal || 0) > total) || null
  return {
    state: {
      ...state,
      board: decorateBoard(board, speciesRows),
      game_over: !hasMove(board),
      score: Number(state.score || 0),
      total_fusions: Number(state.total_fusions || 0),
      highest_rank: Number(state.highest_rank || 0),
      combo_best: Number(state.combo_best || 0),
      last_score_delta: Number(state.last_score_delta || 0),
    },
    global: {
      ...globalState,
      total_fusions: Number(globalState.total_fusions || 0),
      highest_rank: Number(globalState.highest_rank || 0),
      mythic_total: Number(globalState.mythic_total || 0),
      bonus_multiplier: Number(globalState.bonus_multiplier || 1),
      bonus_active: activeBonusMultiplier(globalState) > 1,
    },
    milestones,
    claimable_milestones: claimable,
    next_milestone: nextMilestone,
    mapping: decoratedMapping(speciesRows),
    turn,
    server_now: new Date().toISOString(),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const admin = createClient(
      need('SUPABASE_URL'),
      need('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } },
    )
    const user = await getUser(req, admin)
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || 'status')
    const speciesRows = await loadCatalog(admin)
    const globalState = await loadGlobal(admin)

    if (action === 'reset') {
      const board = createInitialBoard(speciesRows, globalState)
      let { data, error } = await admin
        .from('merge_player_states')
        .update({
          board,
          version: crypto.randomUUID(),
          last_score_delta: 0,
          last_spawn_rank: highestRank(board),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select('*')
        .maybeSingle()
      if (error) throw error
      if (!data) {
        const inserted = await admin
          .from('merge_player_states')
          .insert({
            user_id: user.id,
            board,
            version: crypto.randomUUID(),
            highest_rank: highestRank(board),
            last_spawn_rank: highestRank(board),
          })
          .select('*')
          .single()
        if (inserted.error) throw inserted.error
        data = inserted.data
      }
      const milestones = await loadMilestones(admin, user.id)
      return json(buildPayload(data, globalState, milestones, speciesRows, { reset: true }))
    }

    const state = await ensureState(admin, user.id, speciesRows, globalState)

    if (action === 'claim') {
      const fusionGoal = Math.floor(Number(body.fusion_goal || 0))
      if (fusionGoal <= 0) return json({ error: 'invalid milestone' }, 400)
      const { data, error } = await admin.rpc('merge_claim_milestone', {
        p_user_id: user.id,
        p_fusion_goal: fusionGoal,
      })
      if (error) throw error
      const [freshState, freshGlobal, milestones] = await Promise.all([
        ensureState(admin, user.id, speciesRows, globalState),
        loadGlobal(admin),
        loadMilestones(admin, user.id),
      ])
      return json(buildPayload(freshState, freshGlobal, milestones, speciesRows, {
        claimed: data,
      }))
    }

    if (action === 'move') {
      const direction = String(body.direction || '') as Direction
      if (!['up', 'down', 'left', 'right'].includes(direction)) {
        return json({ error: 'invalid direction' }, 400)
      }

      const board = normalizeBoard(state.board)
      const moved = moveBoard(board, direction, speciesRows, globalState)
      if (!moved.moved) {
        const milestones = await loadMilestones(admin, user.id)
        return json(buildPayload(state, globalState, milestones, speciesRows, { moved: false }))
      }

      const spawn = spawnTile(moved.board, speciesRows, globalState)
      const finalBoard = spawn.board
      const bestRank = highestRank(finalBoard)
      const mythicSpecies = findMythicSpecies(moved.fusedRanks, speciesRows)
      const { data, error } = await admin.rpc('merge_apply_turn', {
        p_user_id: user.id,
        p_seen_version: state.version,
        p_board: finalBoard,
        p_score_delta: moved.scoreDelta,
        p_fusions_count: moved.fusions,
        p_highest_rank: bestRank,
        p_combo: moved.combo,
        p_spawn_rank: spawn.spawned?.rank || 0,
        p_mythic_species: mythicSpecies,
      })
      if (error) {
        if (/state conflict/i.test(error.message || '')) {
          const [freshState, freshGlobal, milestones] = await Promise.all([
            ensureState(admin, user.id, speciesRows, await loadGlobal(admin)),
            loadGlobal(admin),
            loadMilestones(admin, user.id),
          ])
          return json(buildPayload(freshState, freshGlobal, milestones, speciesRows, {
            conflict: true,
          }), 409)
        }
        throw error
      }

      const applied = data as Record<string, unknown>
      const appliedState = applied.state as Record<string, unknown>
      const appliedGlobal = applied.global as Record<string, unknown>
      const milestones = await loadMilestones(admin, user.id)
      return json(buildPayload(appliedState, appliedGlobal, milestones, speciesRows, {
        moved: true,
        fusions: moved.fusions,
        score_delta: moved.scoreDelta,
        combo: moved.combo,
        spawned: spawn.spawned,
        mythic_species: mythicSpecies,
        claimable_milestones: applied.claimable_milestones || [],
      }))
    }

    const milestones = await loadMilestones(admin, user.id)
    return json(buildPayload(state, globalState, milestones, speciesRows))
  } catch (err) {
    if (err instanceof Response) return err
    const message = err instanceof Error ? err.message : String(err)
    return json({ error: message }, 500)
  }
})
