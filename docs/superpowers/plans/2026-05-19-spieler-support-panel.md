# Spieler-Support-Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spieler sehen eigene Support-Tickets über ein schwebendes Icon unten rechts; offene/beantwortete Tickets jederzeit, geschlossene noch 24h.

**Architecture:** Reine Filter-/Badge-Logik in `src/supportTickets.js` (unit-getestet mit `node --test`). Pinia-Store (`auth`) lädt eigene Tickets via RLS-Owner-Select und exponiert Getter. `App.vue` zeigt den FAB + read-only `SupportModal.vue` im Stil von `AdminModal.vue`.

**Tech Stack:** Vue 3 (script setup), Pinia (options API store), Supabase JS, PrimeVue Button, `node:test` + `node:assert/strict`.

---

## File Structure

- **Create** `src/supportTickets.js` — reine Funktionen `qualifySupportTickets`, `hasUnseenReply`, `buildSeenMap`. Keine Seiteneffekte.
- **Create** `src/supportTickets.test.js` — Unit-Tests dazu.
- **Modify** `src/stores/auth.js` — State `mySupportTickets`, Action `loadMySupportTickets`, Getter `qualifiedSupportTickets` / `hasUnseenSupportReply`, Action `markSupportRepliesSeen`.
- **Create** `src/components/SupportModal.vue` — read-only Ticket-Liste, Markup/Stil-Muster von `AdminModal.vue`.
- **Modify** `src/i18n.js` — Key `app.supportTickets` in de/en/ru.
- **Modify** `src/styles.css` — `.support-fab`, PrimeVue-Override, `.fab-dot`.
- **Modify** `src/App.vue` — FAB-Button + roter Punkt + `SupportModal` + Lade-Aufrufe.

`localStorage`-Zugriff (Key `seenSupportReplies`) lebt ausschließlich im Store, nicht in den reinen Funktionen.

---

### Task 1: Reine Logik + Tests

**Files:**
- Create: `src/supportTickets.js`
- Test: `src/supportTickets.test.js`

- [ ] **Step 1: Failing-Test schreiben**

`src/supportTickets.test.js`:

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { qualifySupportTickets, hasUnseenReply, buildSeenMap } from './supportTickets.js'

const NOW = Date.parse('2026-05-19T12:00:00Z')
const hoursAgo = (h) => new Date(NOW - h * 3600_000).toISOString()

test('qualifySupportTickets keeps open and replied tickets', () => {
  const tickets = [
    { id: 'a', status: 'open', closed_at: null },
    { id: 'b', status: 'replied', closed_at: null }
  ]
  const out = qualifySupportTickets(tickets, NOW)
  assert.deepEqual(out.map((t) => t.id), ['a', 'b'])
})

test('qualifySupportTickets keeps closed ticket younger than 24h', () => {
  const tickets = [{ id: 'c', status: 'closed', closed_at: hoursAgo(23) }]
  assert.equal(qualifySupportTickets(tickets, NOW).length, 1)
})

test('qualifySupportTickets drops closed ticket older than 24h', () => {
  const tickets = [{ id: 'd', status: 'closed', closed_at: hoursAgo(25) }]
  assert.equal(qualifySupportTickets(tickets, NOW).length, 0)
})

test('qualifySupportTickets drops closed ticket without closed_at', () => {
  const tickets = [{ id: 'e', status: 'closed', closed_at: null }]
  assert.equal(qualifySupportTickets(tickets, NOW).length, 0)
})

test('hasUnseenReply true when replied ticket not in seen map', () => {
  const tickets = [{ id: 'a', status: 'replied', replied_at: hoursAgo(1), closed_at: null }]
  assert.equal(hasUnseenReply(tickets, {}, NOW), true)
})

test('hasUnseenReply false when replied_at already seen', () => {
  const r = hoursAgo(1)
  const tickets = [{ id: 'a', status: 'replied', replied_at: r, closed_at: null }]
  assert.equal(hasUnseenReply(tickets, { a: r }, NOW), false)
})

test('hasUnseenReply true when replied_at changed since seen', () => {
  const tickets = [{ id: 'a', status: 'replied', replied_at: hoursAgo(1), closed_at: null }]
  assert.equal(hasUnseenReply(tickets, { a: hoursAgo(5) }, NOW), true)
})

test('hasUnseenReply ignores non-qualified (old closed) replied tickets', () => {
  const tickets = [{ id: 'a', status: 'closed', replied_at: hoursAgo(30), closed_at: hoursAgo(25) }]
  assert.equal(hasUnseenReply(tickets, {}, NOW), false)
})

test('buildSeenMap records replied_at of qualified replied tickets', () => {
  const r = hoursAgo(1)
  const tickets = [
    { id: 'a', status: 'replied', replied_at: r, closed_at: null },
    { id: 'b', status: 'open', replied_at: null, closed_at: null }
  ]
  assert.deepEqual(buildSeenMap(tickets, { x: 'old' }, NOW), { x: 'old', a: r })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npm test`
Expected: FAIL — `Cannot find module './supportTickets.js'`

- [ ] **Step 3: Minimale Implementierung**

`src/supportTickets.js`:

```javascript
const DAY_MS = 24 * 3600 * 1000

export function qualifySupportTickets(tickets, now = Date.now()) {
  const list = Array.isArray(tickets) ? tickets : []
  return list.filter((t) => {
    if (!t) return false
    if (t.status !== 'closed') return true
    if (!t.closed_at) return false
    return now - new Date(t.closed_at).getTime() < DAY_MS
  })
}

export function hasUnseenReply(tickets, seenMap = {}, now = Date.now()) {
  const map = seenMap || {}
  return qualifySupportTickets(tickets, now).some(
    (t) => t.status === 'replied' && t.replied_at && map[t.id] !== t.replied_at
  )
}

export function buildSeenMap(tickets, seenMap = {}, now = Date.now()) {
  const next = { ...(seenMap || {}) }
  for (const t of qualifySupportTickets(tickets, now)) {
    if (t.status === 'replied' && t.replied_at) next[t.id] = t.replied_at
  }
  return next
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npm test`
Expected: PASS — alle `supportTickets` Tests grün, keine anderen Tests gebrochen.

- [ ] **Step 5: Commit**

```bash
git add src/supportTickets.js src/supportTickets.test.js
git commit -m "feat(support): reine Filter-/Badge-Logik für Spieler-Tickets"
```

---

### Task 2: i18n-Key für FAB-Titel

**Files:**
- Modify: `src/i18n.js` (drei `app:`-Blöcke: de ~Zeile 48, en ~Zeile 392, ru ~Zeile 736 — jeweils Zeile `admin: 'Admin'`)

- [ ] **Step 1: Deutschen Key ergänzen**

In `src/i18n.js` im **deutschen** `app:`-Block die Zeile `admin: 'Admin'` ersetzen durch:

```javascript
      admin: 'Admin',
      supportTickets: 'Meine Support-Tickets'
```

- [ ] **Step 2: Englischen Key ergänzen**

Im **englischen** `app:`-Block die Zeile `admin: 'Admin'` ersetzen durch:

```javascript
      admin: 'Admin',
      supportTickets: 'My support tickets'
```

- [ ] **Step 3: Russischen Key ergänzen**

Im **russischen** `app:`-Block die Zeile `admin: 'Admin'` ersetzen durch:

```javascript
      admin: 'Admin',
      supportTickets: 'Мои тикеты поддержки'
```

- [ ] **Step 4: Build prüfen**

Run: `npm run build`
Expected: Build erfolgreich, keine Syntaxfehler.

- [ ] **Step 5: Commit**

```bash
git add src/i18n.js
git commit -m "feat(support): i18n-Key app.supportTickets (de/en/ru)"
```

---

### Task 3: Auth-Store-Integration

**Files:**
- Modify: `src/stores/auth.js` (State `state: () => ({...})` ~Zeile 20-25; Getter-Block ~Zeile 26-31; Action-Block, neue Actions nach `submitSupportTicket` ~Zeile 197)

- [ ] **Step 1: Import ergänzen**

In `src/stores/auth.js` nach `import { t } from '../i18n'` (Zeile 4) einfügen:

```javascript
import { qualifySupportTickets, hasUnseenReply, buildSeenMap } from '../supportTickets'

const SEEN_KEY = 'seenSupportReplies'
function readSeenMap() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {} } catch { return {} }
}
function writeSeenMap(map) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(map || {})) } catch {}
}
```

- [ ] **Step 2: State erweitern**

Den `state`-Block (aktuell):

```javascript
  state: () => ({
    session: null,
    profile: null,
    identities: [],
    loading: true
  }),
```

ersetzen durch:

```javascript
  state: () => ({
    session: null,
    profile: null,
    identities: [],
    loading: true,
    mySupportTickets: []
  }),
```

- [ ] **Step 3: Getter erweitern**

Den `getters`-Block (aktuell):

```javascript
  getters: {
    user: (s) => s.session?.user || null,
    isAuth: (s) => !!s.session,
    hasGoogleLinked: (s) => (s.identities || []).some((i) => i.provider === 'google'),
    canUnlinkGoogle: (s) => (s.identities || []).some((i) => i.provider === 'google')
  },
```

ersetzen durch:

```javascript
  getters: {
    user: (s) => s.session?.user || null,
    isAuth: (s) => !!s.session,
    hasGoogleLinked: (s) => (s.identities || []).some((i) => i.provider === 'google'),
    canUnlinkGoogle: (s) => (s.identities || []).some((i) => i.provider === 'google'),
    qualifiedSupportTickets: (s) => qualifySupportTickets(s.mySupportTickets, Date.now()),
    hasUnseenSupportReply: (s) => hasUnseenReply(s.mySupportTickets, readSeenMap(), Date.now())
  },
```

- [ ] **Step 4: Actions ergänzen**

In `src/stores/auth.js` direkt nach der Action `submitSupportTicket` (endet mit `return data\n    },` ~Zeile 197) einfügen:

```javascript
    async loadMySupportTickets() {
      if (!this.session) return
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, subject, message, status, admin_reply, created_at, replied_at, closed_at')
        .order('created_at', { ascending: false })
      if (error) { console.error(error); return }
      this.mySupportTickets = data || []
    },
    markSupportRepliesSeen() {
      writeSeenMap(buildSeenMap(this.mySupportTickets, readSeenMap(), Date.now()))
    },
```

- [ ] **Step 5: Build + Tests prüfen**

Run: `npm run build && npm test`
Expected: Build erfolgreich; alle Tests grün.

- [ ] **Step 6: Commit**

```bash
git add src/stores/auth.js
git commit -m "feat(support): Store lädt eigene Tickets + Seen-Tracking"
```

---

### Task 4: SupportModal-Komponente

**Files:**
- Create: `src/components/SupportModal.vue`

- [ ] **Step 1: Komponente anlegen**

`src/components/SupportModal.vue`:

```vue
<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { locale } from '../i18n'

const emit = defineEmits(['close'])
const auth = useAuthStore()

const I18N = {
  de: {
    title: '🎫 Meine Support-Tickets',
    subtitle: 'Deine Anfragen. Antworten kommen zusätzlich per E-Mail.',
    empty: 'Keine aktiven Tickets.',
    from: 'Erstellt',
    reply: 'Antwort vom Support',
    close: 'Schließen',
    status_open: 'Offen',
    status_replied: 'Beantwortet',
    status_closed: 'Geschlossen'
  },
  en: {
    title: '🎫 My support tickets',
    subtitle: 'Your requests. Replies are also emailed to you.',
    empty: 'No active tickets.',
    from: 'Created',
    reply: 'Support reply',
    close: 'Close',
    status_open: 'Open',
    status_replied: 'Replied',
    status_closed: 'Closed'
  },
  ru: {
    title: '🎫 Мои тикеты поддержки',
    subtitle: 'Твои обращения. Ответы также приходят на e-mail.',
    empty: 'Нет активных тикетов.',
    from: 'Создан',
    reply: 'Ответ поддержки',
    close: 'Закрыть',
    status_open: 'Открыт',
    status_replied: 'Отвечен',
    status_closed: 'Закрыт'
  }
}

function tx(key) {
  const lang = I18N[locale.value] ? locale.value : 'en'
  return I18N[lang][key] ?? I18N.en[key] ?? key
}

function fmtDateTime(s) {
  if (!s) return ''
  try { return new Date(s).toLocaleString() } catch { return String(s) }
}

onMounted(async () => {
  await auth.loadMySupportTickets()
  auth.markSupportRepliesSeen()
})
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="support-modal">
      <div class="sm-head">
        <h2 style="margin:0">{{ tx('title') }}</h2>
        <Button class="btn secondary small" @click="emit('close')">✕</Button>
      </div>
      <p class="subtitle">{{ tx('subtitle') }}</p>

      <div v-if="!auth.qualifiedSupportTickets.length" class="subtitle" style="text-align:center;padding:16px">
        {{ tx('empty') }}
      </div>

      <div
        v-for="ticket in auth.qualifiedSupportTickets"
        :key="ticket.id"
        class="ticket-card"
      >
        <div class="ticket-top">
          <span class="ticket-num">{{ ticket.ticket_number }}</span>
          <span class="pill" :class="`status-${ticket.status}`">
            {{ tx(`status_${ticket.status}`) }}
          </span>
        </div>
        <div class="subtitle" style="margin:2px 0 6px">
          {{ tx('from') }}: {{ fmtDateTime(ticket.created_at) }}
        </div>
        <div class="ticket-subject">{{ ticket.subject }}</div>
        <pre class="ticket-msg">{{ ticket.message }}</pre>
        <div v-if="ticket.admin_reply" class="ticket-reply">
          <div class="subtitle" style="margin:0 0 4px">
            {{ tx('reply') }} · {{ fmtDateTime(ticket.replied_at) }}
          </div>
          <pre class="ticket-msg" style="background:rgba(120,200,160,0.08)">{{ ticket.admin_reply }}</pre>
        </div>
      </div>

      <Button class="btn full" @click="emit('close')">{{ tx('close') }}</Button>
    </div>
  </div>
</template>

<style scoped>
.support-modal {
  background: var(--card, #161b2b);
  border: 1px solid var(--border, rgba(255,255,255,0.1));
  border-radius: 16px;
  padding: 18px;
  width: min(560px, 94vw);
  max-height: 88vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sm-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.subtitle { color: var(--muted, #9aa3b2); font-size: 13px; margin: 0; }
.ticket-card {
  background: rgba(0,0,0,0.25);
  border: 1px solid var(--border, rgba(255,255,255,0.1));
  border-radius: 12px;
  padding: 12px;
}
.ticket-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.ticket-num {
  font-family: monospace;
  font-size: 13px;
  color: var(--accent, #ffd166);
}
.ticket-subject { font-weight: 700; margin: 6px 0 4px; }
.ticket-msg {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
  padding: 8px;
  margin: 4px 0 0;
}
.ticket-reply { margin-top: 8px; }
.pill {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid;
}
.pill.status-open { border-color: #ffb86b; color: #ffb86b; }
.pill.status-replied { border-color: #6bd4ff; color: #6bd4ff; }
.pill.status-closed { border-color: #888; color: #aaa; }
.btn.full { width: 100%; }
.btn.small { padding: 4px 10px; }
</style>
```

- [ ] **Step 2: Build prüfen**

Run: `npm run build`
Expected: Build erfolgreich, keine Vue-Compile-Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/components/SupportModal.vue
git commit -m "feat(support): read-only SupportModal für Spieler"
```

---

### Task 5: FAB-Styles

**Files:**
- Modify: `src/styles.css` (nach `.admin-fab`-Block ~Zeile 231-239; PrimeVue-Override `.p-button.admin-fab` ~Zeile 78-83; Hover-Ausnahme-Selektoren ~Zeile 103 + 108)

- [ ] **Step 1: `.support-fab`-Block + Punkt ergänzen**

In `src/styles.css` direkt nach der Zeile `.admin-fab:active { transform: scale(0.95); }` (~Zeile 239) einfügen:

```css
.support-fab {
  position: fixed; right: 14px; bottom: calc(92px + var(--safe-bot));
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, #06d6a0, #1d8f73);
  color: #fff; font-size: 22px; border: none;
  box-shadow: 0 10px 26px rgba(6,214,160,0.45);
  z-index: 50; cursor: pointer;
}
.support-fab:active { transform: scale(0.95); }
.support-fab .fab-dot {
  position: absolute;
  top: 4px; right: 4px;
  width: 11px; height: 11px;
  border-radius: 50%;
  background: #ff4d4f;
  border: 2px solid #0b1220;
}
```

- [ ] **Step 2: PrimeVue position-Override ergänzen**

Den bestehenden Block (~Zeile 78-83):

```css
.p-button.admin-fab {
  position: fixed !important;
  left: 14px !important;
  bottom: calc(92px + var(--safe-bot)) !important;
  z-index: 50 !important;
}
```

ersetzen durch:

```css
.p-button.admin-fab {
  position: fixed !important;
  left: 14px !important;
  bottom: calc(92px + var(--safe-bot)) !important;
  z-index: 50 !important;
}
.p-button.support-fab {
  position: fixed !important;
  right: 14px !important;
  bottom: calc(92px + var(--safe-bot)) !important;
  z-index: 50 !important;
}
```

- [ ] **Step 3: Hover-Ausnahmen ergänzen**

Die zwei Selektor-Zeilen (~Zeile 103 und ~108):

```css
.p-button:not(.btn):not(.settings-link):not(.admin-fab):not(:disabled):hover {
```
und
```css
.p-button:not(.btn):not(.settings-link):not(.admin-fab):not(:disabled):active {
```

ersetzen durch (jeweils `:not(.support-fab)` ergänzen):

```css
.p-button:not(.btn):not(.settings-link):not(.admin-fab):not(.support-fab):not(:disabled):hover {
```
und
```css
.p-button:not(.btn):not(.settings-link):not(.admin-fab):not(.support-fab):not(:disabled):active {
```

- [ ] **Step 4: Build prüfen**

Run: `npm run build`
Expected: Build erfolgreich.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css
git commit -m "feat(support): support-fab Styles + Neu-Punkt"
```

---

### Task 6: App.vue-Verdrahtung

**Files:**
- Modify: `src/App.vue` (Import-Block ~Zeile 10-11; `adminOpen`-ref ~Zeile 15; `onMounted` ~Zeile 106-110; `onAppResume` ~Zeile 151-153; `auth.isAuth`-Watcher ~Zeile 83-94; Template nach `</AdminModal>`/`admin-fab` ~Zeile 342-351)

- [ ] **Step 1: Import + State**

In `src/App.vue` nach `import AdminModal from "./components/AdminModal.vue"` (Zeile 10) einfügen:

```javascript
import SupportModal from "./components/SupportModal.vue";
```

Und nach `const adminOpen = ref(false);` (Zeile 15) einfügen:

```javascript
const supportOpen = ref(false);
```

- [ ] **Step 2: Tickets bei Login/Mount laden**

Im `onMounted`-Hook den Block:

```javascript
  if (auth.isAuth) {
    await game.load();
    subscribeBroadcasts();
  }
```

ersetzen durch:

```javascript
  if (auth.isAuth) {
    await game.load();
    subscribeBroadcasts();
    auth.loadMySupportTickets().catch(() => {});
  }
```

- [ ] **Step 3: Tickets bei Auth-Wechsel laden**

Im `watch(() => auth.isAuth, ...)` den Zweig:

```javascript
    if (v) {
      subscribeBroadcasts();
      if (!prev) game.load().catch(() => {});
    } else if (broadcastChannel) {
```

ersetzen durch:

```javascript
    if (v) {
      subscribeBroadcasts();
      auth.loadMySupportTickets().catch(() => {});
      if (!prev) game.load().catch(() => {});
    } else if (broadcastChannel) {
```

- [ ] **Step 4: Tickets bei App-Rückkehr laden**

Den `onAppResume`-Block:

```javascript
onAppResume(() => {
  refreshOnReturn();
});
```

ersetzen durch:

```javascript
onAppResume(() => {
  refreshOnReturn();
  if (auth.isAuth) auth.loadMySupportTickets().catch(() => {});
});
```

- [ ] **Step 5: FAB + Modal ins Template**

Den bestehenden Admin-FAB-Block + AdminModal (~Zeile 342-351):

```html
    <Button
      v-if="showNav && (auth.profile?.is_admin || auth.profile?.is_subadmin)"
      class="admin-fab"
      @click="adminOpen = true"
      :title="t('app.admin')"
    >
      🛠️
    </Button>

    <AdminModal v-if="adminOpen" @close="adminOpen = false" />
```

ersetzen durch:

```html
    <Button
      v-if="showNav && (auth.profile?.is_admin || auth.profile?.is_subadmin)"
      class="admin-fab"
      @click="adminOpen = true"
      :title="t('app.admin')"
    >
      🛠️
    </Button>

    <Button
      v-if="showNav && auth.qualifiedSupportTickets.length"
      class="support-fab"
      @click="supportOpen = true"
      :title="t('app.supportTickets')"
    >
      🎫
      <span v-if="auth.hasUnseenSupportReply" class="fab-dot"></span>
    </Button>

    <AdminModal v-if="adminOpen" @close="adminOpen = false" />
    <SupportModal v-if="supportOpen" @close="supportOpen = false" />
```

- [ ] **Step 6: Build + Tests**

Run: `npm run build && npm test`
Expected: Build erfolgreich; alle Tests grün.

- [ ] **Step 7: Manuell im Browser verifizieren**

Dev-Server starten, als Spieler mit mindestens einem Ticket einloggen. Prüfen:
- Support-FAB erscheint unten **rechts** (Admin-FAB bleibt links).
- Klick öffnet `SupportModal` mit eigenen Tickets, Status-Pill, ggf. Admin-Antwort.
- Spieler ohne qualifizierte Tickets: kein FAB.
- Ticket auf `replied` (über Admin/DB) → roter Punkt; nach Öffnen des Panels verschwindet er (auch nach Reload, da `localStorage`).
- Geschlossenes Ticket: <24h sichtbar, simuliert >24h (closed_at zurückdatieren) → FAB/Eintrag weg.

- [ ] **Step 8: Commit**

```bash
git add src/App.vue
git commit -m "feat(support): FAB + Panel + Lade-Aufrufe in App.vue"
```

---

## Self-Review

**Spec coverage:**
- Sichtbarkeitsregel (offen/replied + closed<24h) → Task 1 (`qualifySupportTickets`) + Task 3 (Getter) ✓
- Neu-Badge / localStorage → Task 1 (`hasUnseenReply`/`buildSeenMap`) + Task 3 (Seen-Map) + Task 6 (`fab-dot`) ✓
- Sicherer Datenzugriff via RLS-Owner-Select, keine Migration → Task 3 (`loadMySupportTickets`) ✓
- Read-only Panel im AdminModal-Stil → Task 4 ✓
- FAB unten rechts, gespiegelt zum Admin-FAB, keine Überlappung → Task 5 + Task 6 ✓
- i18n de/en/ru für FAB-Titel; Modal-Strings inline → Task 2 + Task 4 ✓
- Laden bei Login/Resume/Panel-Öffnen → Task 3 (mount im Modal) + Task 6 (Login/Resume) ✓
- Tests für reine Funktionen → Task 1 ✓
- YAGNI: keine Migration/RPC/Realtime/Spieler-Aktionen → eingehalten ✓

**Placeholder scan:** Keine TBD/TODO; alle Code-Schritte vollständig.

**Type consistency:** `qualifySupportTickets`, `hasUnseenReply`, `buildSeenMap` identisch in Task 1 (Definition), Task 1 Tests, Task 3 (Import/Nutzung). Getter `qualifiedSupportTickets` / `hasUnseenSupportReply` und Action `loadMySupportTickets` / `markSupportRepliesSeen` konsistent über Task 3/4/6. `localStorage`-Key `seenSupportReplies` nur in Task 3.
