# Freundschaftsanfragen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freundschaftsanfragen können nach einer Ablehnung erneut gesendet werden, und Nutzer können neue eingehende Freundschaftsanfragen deaktivieren.

**Architecture:** Die Datenbank bleibt die Sicherheitsgrenze: `friend_request` reaktiviert abgelehnte Beziehungen und respektiert eine neue Profil-Einstellung. Das Frontend bekommt nur einen Settings-Schalter und mappt die stabile SQL-Fehlermeldung auf i18n-Texte. Ein kleiner JS-Helfer kapselt die Fehlererkennung für Freundschaftsanfragen.

**Tech Stack:** Supabase SQL/RPC, Vue 3 `<script setup>`, Pinia, PrimeVue `Checkbox`, Node Test Runner (`node --test`).

---

## File Structure

- **Create** `src/friendRequests.js` - dependency-freier Helfer `isFriendRequestsDisabledError(error)`.
- **Create** `src/friendRequests.test.js` - Unit-Tests für den Fehler-Helfer.
- **Create** `src/friendRequestsSql.test.js` - statischer SQL-Guard für Migration und `schema.sql`.
- **Create** Supabase CLI migration under `supabase/migrations/*_friend_requests_settings.sql` - neue Spalte, Setter-RPC, neue `friend_request`-Logik.
- **Modify** `supabase/schema.sql` - finaler Schema-Stand mit neuer Spalte und RPCs.
- **Modify** `src/stores/auth.js` - Action `setFriendRequestsEnabled(enabled)`.
- **Modify** `src/views/SettingsView.vue` - Settings-Schalter.
- **Modify** `src/views/FriendsView.vue` - deaktivierte Anfrage-Fehler übersetzen.
- **Modify** `src/views/ProfileView.vue` - deaktivierte Anfrage-Fehler übersetzen.
- **Modify** `src/i18n.js` - de/en/ru Texte.

---

### Task 1: Freundschaftsanfrage-Fehler-Helfer

**Files:**
- Create: `src/friendRequests.js`
- Create: `src/friendRequests.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/friendRequests.test.js`:

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { isFriendRequestsDisabledError } from './friendRequests.js'

test('detects the stable disabled friend requests database error', () => {
  assert.equal(isFriendRequestsDisabledError('friend requests disabled'), true)
  assert.equal(isFriendRequestsDisabledError(new Error('friend requests disabled')), true)
  assert.equal(isFriendRequestsDisabledError({ message: 'friend requests disabled' }), true)
})

test('ignores unrelated friend request errors', () => {
  assert.equal(isFriendRequestsDisabledError('user not found'), false)
  assert.equal(isFriendRequestsDisabledError(new Error('already responded')), false)
  assert.equal(isFriendRequestsDisabledError(null), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test
```

Expected: FAIL because `src/friendRequests.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/friendRequests.js`:

```javascript
export const FRIEND_REQUESTS_DISABLED_ERROR = 'friend requests disabled'

export function isFriendRequestsDisabledError(error) {
  const message = typeof error === 'string' ? error : error?.message
  return String(message || '').toLowerCase().includes(FRIEND_REQUESTS_DISABLED_ERROR)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test
```

Expected: PASS for `friendRequests.test.js`; existing tests remain green.

- [ ] **Step 5: Commit**

```bash
git add src/friendRequests.js src/friendRequests.test.js
git commit -m "test(friends): add friend request error helper"
```

---

### Task 2: SQL-Guard für neue Freundschaftsanfragen-Logik

**Files:**
- Create: `src/friendRequestsSql.test.js`

- [ ] **Step 1: Write the failing SQL structure test**

Create `src/friendRequestsSql.test.js`:

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaPath = path.join(root, 'supabase', 'schema.sql')
const migrationsDir = path.join(root, 'supabase', 'migrations')
const schemaSql = readFileSync(schemaPath, 'utf8')
const migrationSql = readdirSync(migrationsDir)
  .filter((name) => name.includes('friend_requests'))
  .map((name) => readFileSync(path.join(migrationsDir, name), 'utf8'))
  .join('\n')
const combinedSql = `${schemaSql}\n${migrationSql}`

test('profiles schema and migration include the friend request preference', () => {
  assert.match(schemaSql, /friend_requests_enabled boolean not null default true/)
  assert.match(migrationSql, /alter table public\.profiles\s+add column if not exists friend_requests_enabled boolean not null default true/i)
  assert.match(schemaSql, /create or replace function public\.set_friend_requests_enabled/)
})

test('friend_request reopens declined relationships and blocks disabled new incoming requests', () => {
  assert.match(combinedSql, /friend requests disabled/)
  assert.match(combinedSql, /existing\.status = 'declined'/)
  assert.match(combinedSql, /requester_id = uid/)
  assert.match(combinedSql, /addressee_id = target/)
  assert.match(combinedSql, /responded_at = null/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test
```

Expected: FAIL because no migration containing `friend_requests` exists and `schema.sql` has no `friend_requests_enabled` column yet.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/friendRequestsSql.test.js
git commit -m "test(friends): guard friend request sql behavior"
```

---

### Task 3: Supabase-Migration und `schema.sql`

**Files:**
- Create: Supabase CLI-generated `supabase/migrations/*_friend_requests_settings.sql`
- Modify: `supabase/schema.sql`
- Test: `src/friendRequestsSql.test.js`

- [ ] **Step 1: Create the migration file with Supabase CLI**

Run one of these, depending on the available CLI:

```bash
supabase migration new friend_requests_settings
```

If `supabase` is not on PATH:

```bash
npx supabase migration new friend_requests_settings
```

Expected: a new file under `supabase/migrations/` whose filename ends in `_friend_requests_settings.sql`.

- [ ] **Step 2: Fill the migration SQL**

Put this SQL into the generated migration file:

```sql
alter table public.profiles
  add column if not exists friend_requests_enabled boolean not null default true;

create or replace function public.set_friend_requests_enabled(p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  next_value boolean := coalesce(p_enabled, true);
begin
  if uid is null then raise exception 'not authenticated'; end if;

  update public.profiles
    set friend_requests_enabled = next_value
    where id = uid;

  if not found then raise exception 'profile not found'; end if;

  return jsonb_build_object('friend_requests_enabled', next_value);
end $$;
grant execute on function public.set_friend_requests_enabled(boolean) to authenticated;

create or replace function public.friend_request(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  target uuid;
  target_requests_enabled boolean;
  existing public.friendships%rowtype;
  new_row public.friendships%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select id, friend_requests_enabled
    into target, target_requests_enabled
    from public.profiles
    where lower(username) = lower(trim(p_username))
    limit 1;

  if target is null then raise exception 'user not found'; end if;
  if target = uid then raise exception 'cannot friend yourself'; end if;

  select * into existing from public.friendships
    where (requester_id = uid and addressee_id = target)
       or (requester_id = target and addressee_id = uid)
    limit 1;

  if existing.id is not null then
    if existing.addressee_id = uid and existing.status = 'pending' then
      update public.friendships
        set status = 'accepted', responded_at = now()
        where id = existing.id
        returning * into new_row;
      return jsonb_build_object('status', 'accepted', 'id', new_row.id);
    end if;

    if existing.status = 'accepted' or existing.status = 'pending' then
      return jsonb_build_object('status', existing.status, 'id', existing.id);
    end if;

    if existing.status = 'declined' then
      if not coalesce(target_requests_enabled, true) then
        raise exception 'friend requests disabled';
      end if;

      update public.friendships
        set requester_id = uid,
            addressee_id = target,
            status = 'pending',
            created_at = now(),
            responded_at = null
        where id = existing.id
        returning * into new_row;

      return jsonb_build_object('status', 'pending', 'id', new_row.id);
    end if;
  end if;

  if not coalesce(target_requests_enabled, true) then
    raise exception 'friend requests disabled';
  end if;

  insert into public.friendships(requester_id, addressee_id)
    values (uid, target)
    returning * into new_row;

  return jsonb_build_object('status', 'pending', 'id', new_row.id);
end $$;
grant execute on function public.friend_request(text) to authenticated;
```

- [ ] **Step 3: Update `supabase/schema.sql` profile table**

In `create table if not exists public.profiles`, add the new column after `is_banned boolean not null default false`:

```sql
  is_banned boolean not null default false,
  friend_requests_enabled boolean not null default true
```

- [ ] **Step 4: Update `supabase/schema.sql` friends functions**

Replace the existing `public.friend_request(p_username text)` function with the same function body from Step 2.

Add `public.set_friend_requests_enabled(p_enabled boolean)` before `public.friend_request(p_username text)`:

```sql
create or replace function public.set_friend_requests_enabled(p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  next_value boolean := coalesce(p_enabled, true);
begin
  if uid is null then raise exception 'not authenticated'; end if;

  update public.profiles
    set friend_requests_enabled = next_value
    where id = uid;

  if not found then raise exception 'profile not found'; end if;

  return jsonb_build_object('friend_requests_enabled', next_value);
end $$;
grant execute on function public.set_friend_requests_enabled(boolean) to authenticated;
```

- [ ] **Step 5: Run tests to verify SQL guard passes**

Run:

```bash
npm test
```

Expected: PASS for `friendRequestsSql.test.js` and all previous tests.

- [ ] **Step 6: Commit**

```bash
git add supabase/schema.sql supabase/migrations/*_friend_requests_settings.sql src/friendRequestsSql.test.js
git commit -m "feat(friends): allow resending declined friend requests"
```

---

### Task 4: Auth-Store Action und i18n

**Files:**
- Modify: `src/stores/auth.js`
- Modify: `src/i18n.js`

- [ ] **Step 1: Add i18n keys**

In each locale's `settings` object, add these keys near the existing account/privacy settings keys.

German:

```javascript
      friendRequestsTitle: 'Freundschaftsanfragen',
      friendRequestsHint: 'Wenn deaktiviert, können dir andere Spieler keine neuen Freundschaftsanfragen senden.',
      friendRequestsEnabled: 'Freundschaftsanfragen erlauben',
      friendRequestsSaved: 'Einstellung gespeichert.',
```

English:

```javascript
      friendRequestsTitle: 'Friend requests',
      friendRequestsHint: 'When disabled, other players cannot send you new friend requests.',
      friendRequestsEnabled: 'Allow friend requests',
      friendRequestsSaved: 'Setting saved.',
```

Russian:

```javascript
      friendRequestsTitle: 'Запросы в друзья',
      friendRequestsHint: 'Если отключено, другие игроки не смогут отправлять вам новые запросы в друзья.',
      friendRequestsEnabled: 'Разрешить запросы в друзья',
      friendRequestsSaved: 'Настройка сохранена.',
```

In each locale's `storeErrors` object, add:

German:

```javascript
      friendRequestsDisabled: 'Diese Person nimmt aktuell keine Freundschaftsanfragen an.',
```

English:

```javascript
      friendRequestsDisabled: 'This person is not accepting friend requests right now.',
```

Russian:

```javascript
      friendRequestsDisabled: 'Этот игрок сейчас не принимает запросы в друзья.',
```

- [ ] **Step 2: Add Auth store action**

In `src/stores/auth.js`, add this action after `setAvatar(emoji)`:

```javascript
    async setFriendRequestsEnabled(enabled) {
      const { data, error } = await supabase.rpc('set_friend_requests_enabled', {
        p_enabled: !!enabled
      })
      if (error) throw error
      if (this.profile) {
        this.profile.friend_requests_enabled = data?.friend_requests_enabled !== false
      }
      return data
    },
```

- [ ] **Step 3: Run tests/build**

Run:

```bash
npm test
npm run build
```

Expected: tests pass; build succeeds without missing i18n syntax errors.

- [ ] **Step 4: Commit**

```bash
git add src/stores/auth.js src/i18n.js
git commit -m "feat(settings): add friend request preference state"
```

---

### Task 5: Settings-Schalter

**Files:**
- Modify: `src/views/SettingsView.vue`

- [ ] **Step 1: Add computed setting state**

In `src/views/SettingsView.vue`, after `selectedLocale`, add:

```javascript
const friendRequestsEnabled = computed(() => auth.profile?.friend_requests_enabled !== false)
```

- [ ] **Step 2: Add save action**

After `saveCustomAvatar()`, add:

```javascript
async function setFriendRequestsEnabled(value) {
  if (!auth.profile || busy.value === 'friend-requests') return
  busy.value = 'friend-requests'
  try {
    await auth.setFriendRequestsEnabled(value)
    flash(t('settings.friendRequestsSaved'))
  } catch (e) {
    flash(e.message || String(e), true)
  } finally {
    busy.value = ''
  }
}
```

- [ ] **Step 3: Add Settings UI section**

Add this section after the account card and before the avatar card:

```html
    <section class="card stack">
      <h2 style="margin:0">{{ t('settings.friendRequestsTitle') }}</h2>
      <p class="hint">{{ t('settings.friendRequestsHint') }}</p>
      <label class="row friend-request-toggle">
        <Checkbox
          :modelValue="friendRequestsEnabled"
          :binary="true"
          inputId="friend-requests-enabled"
          :disabled="busy==='friend-requests'"
          @update:modelValue="setFriendRequestsEnabled"
        />
        <span>{{ t('settings.friendRequestsEnabled') }}</span>
      </label>
    </section>
```

- [ ] **Step 4: Add scoped CSS**

In `<style scoped>`, after `.account-actions`, add:

```css
.friend-request-toggle {
  justify-content: flex-start;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
```

- [ ] **Step 5: Build**

Run:

```bash
npm run build
```

Expected: build succeeds and `SettingsView.vue` compiles.

- [ ] **Step 6: Commit**

```bash
git add src/views/SettingsView.vue
git commit -m "feat(settings): add friend request toggle"
```

---

### Task 6: Freundes- und Profilseite Fehler-Mapping

**Files:**
- Modify: `src/views/FriendsView.vue`
- Modify: `src/views/ProfileView.vue`
- Test: `src/friendRequests.test.js`

- [ ] **Step 1: Import helper in both views**

In `src/views/FriendsView.vue`, add the import near the other local imports:

```javascript
import { isFriendRequestsDisabledError } from '../friendRequests'
```

In `src/views/ProfileView.vue`, add the same import near the other local imports:

```javascript
import { isFriendRequestsDisabledError } from '../friendRequests'
```

- [ ] **Step 2: Map send errors in `FriendsView.vue`**

Replace the catch block in `sendRequest()`:

```javascript
  } catch (e) {
    appToast.err(e)
  } finally {
```

with:

```javascript
  } catch (e) {
    appToast.err(isFriendRequestsDisabledError(e) ? t('storeErrors.friendRequestsDisabled') : e)
  } finally {
```

- [ ] **Step 3: Map send errors in `ProfileView.vue`**

Replace the catch block in `sendFriendRequest()`:

```javascript
  } catch (e) {
    appToast.err(e)
  } finally {
```

with:

```javascript
  } catch (e) {
    appToast.err(isFriendRequestsDisabledError(e) ? t('storeErrors.friendRequestsDisabled') : e)
  } finally {
```

- [ ] **Step 4: Run tests/build**

Run:

```bash
npm test
npm run build
```

Expected: tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/views/FriendsView.vue src/views/ProfileView.vue
git commit -m "feat(friends): show disabled request message"
```

---

### Task 7: Final Verification

**Files:**
- Verify all modified files

- [ ] **Step 1: Check working tree**

Run:

```bash
git status --short
```

Expected: only pre-existing unrelated changes may remain, specifically `.claude/settings.local.json` and `src/views/TicketsView.vue` if they were already dirty before this feature work.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: all Node tests pass.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: Vite build succeeds.

- [ ] **Step 4: Manual Supabase/App scenarios**

Verify these against a local or staging Supabase database after applying the migration:

```text
1. A sends a friend request to B.
2. B declines.
3. A sends another friend request to B.
4. The existing declined row becomes pending again with A as requester and B as addressee.
5. B disables friend requests in Settings.
6. A tries to send a new request to B and sees the localized disabled message.
7. B sends a request to A while disabled.
8. A sends a request to B and the incoming pending request is accepted.
9. Existing accepted friends remain accepted.
```

- [ ] **Step 5: Final commit check**

Run:

```bash
git log -5 --oneline
```

Expected: recent commits include the helper, SQL guard, Supabase behavior, settings state, settings UI, and error mapping commits.

---

## Self-Review

Spec coverage:
- Erneutes Senden nach Ablehnung: Task 3 updates `friend_request`, Task 2 guards SQL content.
- Deaktivierbare neue eingehende Anfragen: Task 3 adds `friend_requests_enabled` and server-side check.
- Bestehende Freunde und offene Gegenanfragen bleiben möglich: Task 3 returns/accepts before disabled-target checks.
- Settings-Schalter: Tasks 4-5 add store/i18n/UI.
- Lokalisierte Fehlermeldung: Tasks 1, 4, and 6 add helper, texts, and view mapping.
- Verifikation: Task 7 covers tests, build, and manual Supabase scenarios.

Placeholder scan:
- No placeholder markers or unspecified test steps.

Type consistency:
- SQL error string is `friend requests disabled`.
- JS helper constant is `FRIEND_REQUESTS_DISABLED_ERROR`.
- Profile field is `friend_requests_enabled`.
- RPC setter is `set_friend_requests_enabled(p_enabled boolean)`.
- Auth action is `setFriendRequestsEnabled(enabled)`.
