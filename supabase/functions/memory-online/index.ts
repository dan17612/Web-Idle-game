// Edge Function: memory-online
// Serverautoritatives rundenbasiertes Online-Memory. Layout bleibt in der DB.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

async function getUser(req: Request, admin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) throw new Response('missing authorization', { status: 401, headers: corsHeaders })
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Response('invalid authorization', { status: 401, headers: corsHeaders })
  return data.user
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const admin = createClient(
      need('SUPABASE_URL'),
      need('SUPABASE_SERVICE_ROLE_KEY'),
    )
    const user = await getUser(req, admin)

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const action = String(body.action || 'list_rooms')

    let rpc: string
    let args: Record<string, unknown>

    if (action === 'list_rooms') {
      rpc = 'mo_list_rooms'
      args = { p_user_id: user.id }
    } else if (action === 'create_room') {
      const name = String(body.name || '')
      const maxPlayers = Number(body.max_players)
      const boardPairs = Number(body.board_pairs)
      const turnSeconds = body.turn_seconds == null ? 20 : Number(body.turn_seconds)
      const password = body.password ? String(body.password) : null
      if (!name.trim()) return json({ error: 'name required' }, 400)
      if (![2, 3, 4].includes(maxPlayers)) return json({ error: 'invalid max_players' }, 400)
      if (!Number.isInteger(boardPairs) || boardPairs < 2 || boardPairs > 99) {
        return json({ error: 'invalid board_pairs' }, 400)
      }
      if (!Number.isInteger(turnSeconds) || turnSeconds < 5 || turnSeconds > 120) {
        return json({ error: 'invalid turn_seconds' }, 400)
      }
      rpc = 'mo_create_room'
      args = {
        p_user_id: user.id, p_name: name, p_max_players: maxPlayers,
        p_board_pairs: boardPairs, p_password: password, p_turn_seconds: turnSeconds,
      }
    } else if (action === 'join_room') {
      const roomId = String(body.room_id || '')
      if (!roomId) return json({ error: 'room_id required' }, 400)
      rpc = 'mo_join_room'
      args = { p_user_id: user.id, p_room_id: roomId, p_password: body.password ? String(body.password) : null }
    } else if (action === 'leave_room') {
      rpc = 'mo_leave_room'
      args = { p_user_id: user.id, p_room_id: String(body.room_id || '') }
    } else if (action === 'start_game') {
      rpc = 'mo_start_game'
      args = { p_user_id: user.id, p_room_id: String(body.room_id || '') }
    } else if (action === 'room_state') {
      rpc = 'mo_room_state'
      args = { p_user_id: user.id, p_room_id: String(body.room_id || '') }
    } else if (action === 'flip') {
      const index = Number(body.index)
      if (!Number.isInteger(index) || index < 0) return json({ error: 'invalid index' }, 400)
      rpc = 'mo_flip'
      args = {
        p_user_id: user.id, p_room_id: String(body.room_id || ''),
        p_seen_version: String(body.version || ''), p_index: index,
      }
    } else if (action === 'skip_turn') {
      rpc = 'mo_skip_turn'
      args = {
        p_user_id: user.id, p_room_id: String(body.room_id || ''),
        p_seen_version: String(body.version || ''),
      }
    } else {
      return json({ error: 'unknown action' }, 400)
    }

    const { data, error } = await admin.rpc(rpc, args)
    if (error) return json({ error: error.message }, 400)
    return json(data)
  } catch (err) {
    if (err instanceof Response) return err
    const message = err instanceof Error ? err.message : String(err)
    return json({ error: message }, 500)
  }
})
