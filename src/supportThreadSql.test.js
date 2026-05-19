import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260519_support_thread.sql'),
  'utf8'
)

test('creates thread table with sender check and cascade', () => {
  assert.match(sql, /create table if not exists public\.support_ticket_messages/i)
  assert.match(sql, /sender text not null check \(sender in \('user', ?'admin'\)\)/i)
  assert.match(sql, /references public\.support_tickets\(id\) on delete cascade/i)
})

test('adds reminder_sent_at column', () => {
  assert.match(sql, /add column if not exists reminder_sent_at timestamptz/i)
})

test('enables RLS with owner select and user-only insert', () => {
  assert.match(sql, /alter table public\.support_ticket_messages enable row level security/i)
  assert.match(sql, /create policy support_msgs_owner_select/i)
  assert.match(sql, /create policy support_msgs_owner_insert_user/i)
  assert.match(sql, /with check[\s\S]*sender = 'user'/i)
})

test('backfill is idempotent via not exists guard', () => {
  assert.match(sql, /insert into public\.support_ticket_messages[\s\S]*not exists/i)
})

test('user_reply reopens ticket and has rate limit, no mailer', () => {
  assert.match(sql, /create or replace function public\.user_reply_support_ticket/i)
  assert.match(sql, /set status = 'open', closed_at = null/i)
  assert.match(sql, /interval '1 hour'/i)
})

test('admin_reply also inserts admin thread row and resets reminder', () => {
  assert.match(sql, /create or replace function public\.admin_reply_support_ticket/i)
  assert.match(sql, /insert into public\.support_ticket_messages[\s\S]*'admin'/i)
  assert.match(sql, /reminder_sent_at = null/i)
})

test('admin_list returns last_user_message_at', () => {
  assert.match(sql, /last_user_message_at timestamptz/i)
})

test('admin_list_ticket_messages exists and is admin-guarded', () => {
  assert.match(sql, /create or replace function public\.admin_list_ticket_messages/i)
})

test('digest function and pg_cron schedule exist', () => {
  assert.match(sql, /create or replace function public\.support_send_unanswered_digest/i)
  assert.match(sql, /create extension if not exists pg_cron/i)
  assert.match(sql, /cron\.schedule\(\s*'support-unanswered-digest'/i)
  assert.match(sql, /'mode', ?'digest'/i)
})
