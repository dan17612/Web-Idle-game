// Edge Function: memory-game
// Serverautoritatives Memory-Minispiel. Das verdeckte Layout bleibt in der DB.

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
    const action = String(body.action || 'status')

    let rpc: string
    let args: Record<string, unknown>

    if (action === 'status') {
      rpc = 'get_memory_state'
      args = { p_user_id: user.id }
    } else if (action === 'flip') {
      const index = Number(body.index)
      const version = String(body.version || '')
      if (!Number.isInteger(index) || index < 0) {
        return json({ error: 'invalid index' }, 400)
      }
      rpc = 'memory_flip'
      args = { p_user_id: user.id, p_seen_version: version, p_index: index }
    } else if (action === 'complete') {
      rpc = 'memory_complete_level'
      args = { p_user_id: user.id }
    } else if (action === 'reset') {
      rpc = 'memory_reset_level'
      args = { p_user_id: user.id }
    } else if (action === 'open_chest') {
      const rewardId = Number(body.reward_id)
      if (!Number.isInteger(rewardId)) {
        return json({ error: 'invalid reward_id' }, 400)
      }
      rpc = 'memory_open_chest'
      args = { p_user_id: user.id, p_reward_id: rewardId }
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
