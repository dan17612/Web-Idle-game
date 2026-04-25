// Edge Function: support-mailer
// Wird von public._notify_support_mailer aufgerufen, sobald ein Support-Ticket
// erstellt oder vom Admin beantwortet wurde. Verschickt E-Mails über Resend.
//
// Required env (Secrets in Supabase UI / `supabase secrets set ...`):
//   MAILER_SECRET   - muss mit DB-Setting app.mailer_secret übereinstimmen
//   RESEND_API_KEY  - dein Resend-API-Key (re_xxx)
//   SUPPORT_FROM    - Absender, z. B. "Zoo Empire <support@deine-domain.de>"
//                     (Domain muss in Resend verifiziert sein, sonst nur onboarding@resend.dev)
//   ADMIN_EMAIL     - Empfänger für neue Tickets, z. B. daniil@schiller.pw

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TicketRow {
  id: string
  ticket_number: string
  user_id: string | null
  username: string | null
  user_email: string | null
  subject: string
  message: string
  notify_user_copy: boolean
  admin_reply: string | null
  status: string
  created_at: string
  replied_at: string | null
}

function need(key: string): string {
  const v = Deno.env.get(key)
  if (!v) throw new Error(`missing env ${key}`)
  return v
}

async function sendMail(opts: { to: string; subject: string; text: string; replyTo?: string }) {
  const apiKey = need('RESEND_API_KEY')
  const from = need('SUPPORT_FROM')
  const payload: Record<string, unknown> = {
    from,
    to: [opts.to],
    subject: opts.subject,
    text: opts.text
  }
  if (opts.replyTo) payload.reply_to = opts.replyTo
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`resend ${res.status}: ${txt}`)
  }
}

function fmtAdminBody(t: TicketRow): string {
  return [
    `Neues Support-Ticket: ${t.ticket_number}`,
    `Spieler: ${t.username ?? '?'} <${t.user_email ?? '?'}>`,
    `User-ID: ${t.user_id ?? '?'}`,
    '',
    `Betreff: ${t.subject}`,
    '',
    'Nachricht:',
    t.message,
    '',
    `— Antworten direkt auf diese Mail (Reply-To = ${t.user_email ?? '?'}) oder im Admin-Panel.`
  ].join('\n')
}

function fmtUserConfirmBody(t: TicketRow): string {
  return [
    `Hallo ${t.username ?? ''},`,
    '',
    `wir haben dein Support-Ticket ${t.ticket_number} erhalten und melden uns so bald wie möglich.`,
    '',
    `Betreff: ${t.subject}`,
    '',
    'Deine Nachricht:',
    t.message,
    '',
    '— Zoo Empire'
  ].join('\n')
}

function fmtUserReplyBody(t: TicketRow): string {
  return [
    `Hallo ${t.username ?? ''},`,
    '',
    `Antwort zu deinem Support-Ticket ${t.ticket_number}:`,
    '',
    t.admin_reply ?? '',
    '',
    '─────────────────────────────',
    `Deine ursprüngliche Nachricht (${t.subject}):`,
    t.message,
    '',
    '— Zoo Empire'
  ].join('\n')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }
  const expected = Deno.env.get('MAILER_SECRET') || ''
  const got = req.headers.get('x-mailer-secret') || ''
  if (!expected || got !== expected) {
    return new Response('forbidden', { status: 403 })
  }

  let body: { ticket_id?: string; mode?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('bad json', { status: 400 })
  }
  const ticketId = body.ticket_id
  const mode = body.mode || 'new'
  if (!ticketId) return new Response('missing ticket_id', { status: 400 })

  const supabase = createClient(
    need('SUPABASE_URL'),
    need('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  )
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, user_id, username, user_email, subject, message, notify_user_copy, admin_reply, status, created_at, replied_at')
    .eq('id', ticketId)
    .maybeSingle()
  if (error) return new Response(`db error: ${error.message}`, { status: 500 })
  if (!data) return new Response('ticket not found', { status: 404 })
  const ticket = data as TicketRow

  const adminEmail = Deno.env.get('ADMIN_EMAIL') || ''
  const results: Record<string, string> = {}

  try {
    if (mode === 'new') {
      if (adminEmail) {
        await sendMail({
          to: adminEmail,
          subject: `[${ticket.ticket_number}] ${ticket.subject}`,
          text: fmtAdminBody(ticket),
          replyTo: ticket.user_email ?? undefined
        })
        results.admin = 'sent'
      }
      if (ticket.notify_user_copy && ticket.user_email) {
        await sendMail({
          to: ticket.user_email,
          subject: `Dein Support-Ticket ${ticket.ticket_number}`,
          text: fmtUserConfirmBody(ticket)
        })
        results.user = 'sent'
      }
    } else if (mode === 'reply') {
      if (ticket.user_email) {
        await sendMail({
          to: ticket.user_email,
          subject: `Re: [${ticket.ticket_number}] ${ticket.subject}`,
          text: fmtUserReplyBody(ticket),
          replyTo: adminEmail || undefined
        })
        results.user = 'sent'
      }
    } else {
      return new Response('unknown mode', { status: 400 })
    }
  } catch (e) {
    return new Response(`mail error: ${(e as Error).message}`, { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
