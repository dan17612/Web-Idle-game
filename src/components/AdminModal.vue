<script setup>
import { computed, ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { speciesInfo } from '../animals'
import { locale } from '../i18n'

const emit = defineEmits(['close'])

const I18N = {
  de: {
    title: 'Admin',
    tabs: { broadcast: 'Broadcast', shop: 'Shop', gift: 'Gift', users: 'Users' },
    tiers: { normal: 'Normal', gold: 'Gold', diamond: 'Diamant', epic: 'Episch', rainbow: 'Rainbow' },
    flash: {
      enterMessage: 'Nachricht eingeben',
      broadcastSent: 'Nachricht an alle gesendet',
      enterUserOrAll: 'Username oder @all angeben',
      enterCoinsOrSpecies: 'Muenzen oder Spezies angeben',
      sentAll: 'An alle {count} Spieler gesendet',
      giftQueued: '{count} Geschenk(e) eingereiht',
      notFound: 'nicht gefunden',
      ok: 'OK',
      weightPositive: 'Gewicht > 0',
      cannotBanAdmins: 'Andere Admins werden hier nicht gebannt.',
      banned: 'User wurde gebannt.',
      unbanned: 'User wurde entbannt.',
      cannotDeleteAdmins: 'Andere Admins werden hier nicht geloescht.',
      accountDeleted: 'Account geloescht.'
    },
    confirm: {
      deleteAccount: 'Account von {username} wirklich endgueltig loeschen?'
    },
    broadcast: {
      subtitle: 'Erscheint kurz mittig bei allen Spielern.',
      placeholder: 'Nachricht...',
      sendAll: 'An alle senden'
    },
    gift: {
      subtitle: 'Geschenk wird beim naechsten Login des Empfaengers automatisch eingeloest.',
      recipientLabel: 'Empfaenger - mehrere mit Komma oder',
      recipientPlaceholder: 'alice, bob, charlie oder @all',
      coinsOptional: 'Muenzen (optional)',
      speciesOptional: 'Spezies (optional)',
      tier: 'Tier',
      qty: 'Anzahl',
      noteOptional: 'Notiz (optional)',
      notePlaceholder: 'z. B. Willkommen',
      queueGift: 'Geschenk einreihen',
      noneSpecies: '- keine -'
    },
    shop: {
      rerollNow: 'Sofort neu wuerfeln',
      weightStatus: 'Weight {weight} · {status}',
      active: 'aktiv',
      disabled: 'aus',
      restock: 'Restock',
      stop: 'Stop'
    },
    users: {
      subtitle: 'Accounts verwalten: suchen, bannen/entbannen, loeschen.',
      searchPlaceholder: 'Suche nach Username oder E-Mail',
      search: 'Suchen',
      admin: 'ADMIN',
      banned: 'BANNED',
      noEmail: 'keine E-Mail',
      coins: 'Coins: {coins}',
      ban: 'Bannen',
      unban: 'Entbannen',
      delete: 'Loeschen'
    }
  },
  en: {
    title: 'Admin',
    tabs: { broadcast: 'Broadcast', shop: 'Shop', gift: 'Gift', users: 'Users' },
    tiers: { normal: 'Normal', gold: 'Gold', diamond: 'Diamond', epic: 'Epic', rainbow: 'Rainbow' },
    flash: {
      enterMessage: 'Enter a message',
      broadcastSent: 'Message sent to everyone',
      enterUserOrAll: 'Enter username or @all',
      enterCoinsOrSpecies: 'Enter coins or species',
      sentAll: 'Sent to all {count} players',
      giftQueued: '{count} gift(s) queued',
      notFound: 'not found',
      ok: 'OK',
      weightPositive: 'Weight > 0',
      cannotBanAdmins: 'Other admins cannot be banned here.',
      banned: 'User has been banned.',
      unbanned: 'User has been unbanned.',
      cannotDeleteAdmins: 'Other admins cannot be deleted here.',
      accountDeleted: 'Account deleted.'
    },
    confirm: {
      deleteAccount: 'Really permanently delete account of {username}?'
    },
    broadcast: {
      subtitle: 'Appears briefly in the center for all players.',
      placeholder: 'Message...',
      sendAll: 'Send to everyone'
    },
    gift: {
      subtitle: 'Gift is automatically claimed on the recipient’s next login.',
      recipientLabel: 'Recipient - multiple names separated by comma or',
      recipientPlaceholder: 'alice, bob, charlie or @all',
      coinsOptional: 'Coins (optional)',
      speciesOptional: 'Species (optional)',
      tier: 'Tier',
      qty: 'Amount',
      noteOptional: 'Note (optional)',
      notePlaceholder: 'e.g. Welcome',
      queueGift: 'Queue gift',
      noneSpecies: '- none -'
    },
    shop: {
      rerollNow: 'Reroll now',
      weightStatus: 'Weight {weight} · {status}',
      active: 'active',
      disabled: 'off',
      restock: 'Restock',
      stop: 'Stop'
    },
    users: {
      subtitle: 'Manage accounts: search, ban/unban, delete.',
      searchPlaceholder: 'Search by username or email',
      search: 'Search',
      admin: 'ADMIN',
      banned: 'BANNED',
      noEmail: 'no email',
      coins: 'Coins: {coins}',
      ban: 'Ban',
      unban: 'Unban',
      delete: 'Delete'
    }
  },
  ru: {
    title: 'Админ',
    tabs: { broadcast: 'Рассылка', shop: 'Магазин', gift: 'Подарок', users: 'Пользователи' },
    tiers: { normal: 'Обычный', gold: 'Золотой', diamond: 'Алмазный', epic: 'Эпический', rainbow: 'Радужный' },
    flash: {
      enterMessage: 'Введите сообщение',
      broadcastSent: 'Сообщение отправлено всем',
      enterUserOrAll: 'Укажите username или @all',
      enterCoinsOrSpecies: 'Укажите монеты или вид',
      sentAll: 'Отправлено всем {count} игрокам',
      giftQueued: '{count} подарков поставлено в очередь',
      notFound: 'не найдено',
      ok: 'OK',
      weightPositive: 'Вес > 0',
      cannotBanAdmins: 'Других админов здесь нельзя банить.',
      banned: 'Пользователь забанен.',
      unbanned: 'Пользователь разбанен.',
      cannotDeleteAdmins: 'Других админов здесь нельзя удалять.',
      accountDeleted: 'Аккаунт удален.'
    },
    confirm: {
      deleteAccount: 'Точно навсегда удалить аккаунт {username}?'
    },
    broadcast: {
      subtitle: 'Коротко показывается по центру у всех игроков.',
      placeholder: 'Сообщение...',
      sendAll: 'Отправить всем'
    },
    gift: {
      subtitle: 'Подарок автоматически забирается при следующем входе получателя.',
      recipientLabel: 'Получатель - несколько имен через запятую или',
      recipientPlaceholder: 'alice, bob, charlie или @all',
      coinsOptional: 'Монеты (опционально)',
      speciesOptional: 'Вид (опционально)',
      tier: 'Тир',
      qty: 'Количество',
      noteOptional: 'Заметка (опционально)',
      notePlaceholder: 'например: Добро пожаловать',
      queueGift: 'Поставить подарок в очередь',
      noneSpecies: '- нет -'
    },
    shop: {
      rerollNow: 'Обновить сейчас',
      weightStatus: 'Вес {weight} · {status}',
      active: 'вкл',
      disabled: 'выкл',
      restock: 'Ресток',
      stop: 'Стоп'
    },
    users: {
      subtitle: 'Управление аккаунтами: поиск, бан/разбан, удаление.',
      searchPlaceholder: 'Поиск по username или email',
      search: 'Найти',
      admin: 'ADMIN',
      banned: 'BANNED',
      noEmail: 'нет email',
      coins: 'Монеты: {coins}',
      ban: 'Бан',
      unban: 'Разбан',
      delete: 'Удалить'
    }
  }
}

function tx(key, vars = {}) {
  const lang = I18N[locale.value] ? locale.value : 'en'
  let value = I18N[lang]
  for (const part of key.split('.')) value = value?.[part]
  if (value == null) {
    value = I18N.en
    for (const part of key.split('.')) value = value?.[part]
  }
  const text = String(value ?? key)
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const tab = ref('broadcast')
const busy = ref('')
const error = ref('')
const info = ref('')

const broadcastMsg = ref('')
const restockQty = ref({})
const weightDraft = ref({})
const speciesRows = ref([])
const userSearch = ref('')
const users = ref([])

const giftForm = ref({ username: '', coins: 0, species: '', tier: 'normal', qty: 1, note: '' })
const TIERS = ['normal', 'gold', 'diamond', 'epic', 'rainbow']
const giftTierOptions = computed(() => TIERS.map((tier) => ({ label: tx(`tiers.${tier}`), value: tier })))
const giftSpeciesOptions = computed(() => {
  const species = speciesRows.value.map((r) => ({
    label: `${speciesInfo(r.species).emoji || '❓'} ${speciesInfo(r.species).name || r.species}`,
    value: r.species
  }))
  return [{ label: tx('gift.noneSpecies'), value: '' }, ...species]
})

function flash(msg, isError = false) {
  if (isError) {
    error.value = msg
    info.value = ''
  } else {
    info.value = msg
    error.value = ''
  }
  setTimeout(() => {
    if (isError) error.value = ''
    else info.value = ''
  }, 3000)
}

async function loadSpecies() {
  const { data } = await supabase.from('species_costs').select('species, enabled, weight').order('species')
  speciesRows.value = data || []
  for (const r of data || []) weightDraft.value[r.species] = r.weight
}

async function loadUsers() {
  busy.value = 'users'
  try {
    const { data, error: e } = await supabase.rpc('admin_list_users', {
      p_search: userSearch.value.trim() || null,
      p_limit: 100,
      p_offset: 0
    })
    if (e) throw e
    users.value = data || []
  } catch (e) {
    flash(e.message, true)
  } finally {
    if (busy.value === 'users') busy.value = ''
  }
}

onMounted(async () => {
  await loadSpecies()
  await loadUsers()
})

async function sendBroadcast() {
  const msg = broadcastMsg.value.trim()
  if (!msg) return flash(tx('flash.enterMessage'), true)
  busy.value = 'bc'
  try {
    const { error: e } = await supabase.rpc('admin_broadcast', { p_message: msg })
    if (e) throw e
    flash(tx('flash.broadcastSent'))
    broadcastMsg.value = ''
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

async function sendGift() {
  const f = giftForm.value
  if (!f.username.trim()) return flash(tx('flash.enterUserOrAll'), true)
  if ((!f.coins || f.coins < 1) && !f.species) return flash(tx('flash.enterCoinsOrSpecies'), true)
  busy.value = 'gift'
  try {
    const { data, error: e } = await supabase.rpc('admin_queue_gift_bulk', {
      p_usernames: f.username.trim(),
      p_coins: Math.max(0, Math.floor(Number(f.coins) || 0)),
      p_species: f.species || null,
      p_tier: f.tier || 'normal',
      p_qty: Math.max(1, Math.min(50, Math.floor(Number(f.qty) || 1))),
      p_note: f.note?.trim() || null
    })
    if (e) throw e
    const sent = Number(data?.sent ?? 0)
    const missed = Array.isArray(data?.missed) ? data.missed : []
    let msg = data?.all ? tx('flash.sentAll', { count: sent }) : tx('flash.giftQueued', { count: sent })
    if (missed.length) msg += ` · ${tx('flash.notFound')}: ${missed.join(', ')}`
    flash(msg, missed.length > 0 && sent === 0)
    if (sent > 0) giftForm.value = { username: '', coins: 0, species: '', tier: 'normal', qty: 1, note: '' }
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

async function callAdmin(rpc, args, key) {
  busy.value = key
  try {
    const { error: e } = await supabase.rpc(rpc, args)
    if (e) throw e
    await loadSpecies()
    flash(tx('flash.ok'))
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

function restock(species) {
  const qty = Math.max(1, parseInt(restockQty.value[species] || 1, 10))
  return callAdmin('admin_force_add', { p_species: species, p_qty: qty }, 'r-' + species)
}

function stop(species) {
  return callAdmin('admin_force_remove', { p_species: species }, 's-' + species)
}

function toggleEnabled(r) {
  return callAdmin('admin_set_species_enabled', { p_species: r.species, p_enabled: !r.enabled }, 'e-' + r.species)
}

function saveWeight(species) {
  const v = parseInt(weightDraft.value[species], 10)
  if (!(v > 0)) return flash(tx('flash.weightPositive'), true)
  return callAdmin('admin_set_species_weight', { p_species: species, p_weight: v }, 'w-' + species)
}

function rotate() {
  return callAdmin('admin_force_rotation', {}, 'rotate')
}

async function setBan(u, banned) {
  if (u.is_admin) return flash(tx('flash.cannotBanAdmins'), true)
  busy.value = banned ? `ban-${u.id}` : `unban-${u.id}`
  try {
    const { error: e } = await supabase.rpc('admin_set_user_ban', {
      p_user_id: u.id,
      p_banned: banned,
      p_reason: null
    })
    if (e) throw e
    await loadUsers()
    flash(banned ? tx('flash.banned') : tx('flash.unbanned'))
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

async function deleteUser(u) {
  if (u.is_admin) return flash(tx('flash.cannotDeleteAdmins'), true)
  if (!confirm(tx('confirm.deleteAccount', { username: u.username }))) return
  busy.value = `del-${u.id}`
  try {
    const { error: e } = await supabase.rpc('admin_delete_user', { p_user_id: u.id })
    if (e) throw e
    await loadUsers()
    flash(tx('flash.accountDeleted'))
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card">
      <div class="row between" style="margin-bottom:12px">
        <h2>{{ tx('title') }}</h2>
        <Button class="btn secondary small" @click="emit('close')">X</Button>
      </div>

      <div class="tabs">
        <Button :class="{ active: tab==='broadcast' }" @click="tab='broadcast'">{{ tx('tabs.broadcast') }}</Button>
        <Button :class="{ active: tab==='shop' }" @click="tab='shop'">{{ tx('tabs.shop') }}</Button>
        <Button :class="{ active: tab==='gift' }" @click="tab='gift'">{{ tx('tabs.gift') }}</Button>
        <Button :class="{ active: tab==='users' }" @click="tab='users'">{{ tx('tabs.users') }}</Button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="info" class="success">{{ info }}</p>

      <template v-if="tab === 'broadcast'">
        <p class="subtitle">{{ tx('broadcast.subtitle') }}</p>
        <Textarea
          v-model="broadcastMsg"
          rows="3"
          maxlength="280"
          :placeholder="tx('broadcast.placeholder')"
          style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--card-2);color:inherit"
        />
        <Button class="btn full" style="margin-top:10px" :disabled="busy==='bc'" @click="sendBroadcast">
          {{ busy==='bc' ? '...' : tx('broadcast.sendAll') }}
        </Button>
      </template>

      <template v-if="tab === 'gift'">
        <p class="subtitle">{{ tx('gift.subtitle') }}</p>
        <label class="subtitle">{{ tx('gift.recipientLabel') }} <code>@all</code></label>
        <InputText v-model="giftForm.username" :placeholder="tx('gift.recipientPlaceholder')" style="width:100%;margin-bottom:8px" />
        <label class="subtitle">{{ tx('gift.coinsOptional') }}</label>
        <InputText type="number" min="0" v-model.number="giftForm.coins" placeholder="0" style="width:100%;margin-bottom:8px" />
        <label class="subtitle">{{ tx('gift.speciesOptional') }}</label>
        <Select
          v-model="giftForm.species"
          :options="giftSpeciesOptions"
          optionLabel="label"
          optionValue="value"
          style="width:100%;margin-bottom:8px"
        />
        <div class="row" style="gap:8px;margin-bottom:8px">
          <div style="flex:1">
            <label class="subtitle">{{ tx('gift.tier') }}</label>
            <Select
              v-model="giftForm.tier"
              :options="giftTierOptions"
              optionLabel="label"
              optionValue="value"
              style="width:100%"
            />
          </div>
          <div style="width:90px">
            <label class="subtitle">{{ tx('gift.qty') }}</label>
            <InputText type="number" min="1" max="50" v-model.number="giftForm.qty" style="width:100%" />
          </div>
        </div>
        <label class="subtitle">{{ tx('gift.noteOptional') }}</label>
        <InputText v-model="giftForm.note" maxlength="140" :placeholder="tx('gift.notePlaceholder')" style="width:100%;margin-bottom:10px" />
        <Button class="btn full" :disabled="busy==='gift'" @click="sendGift">
          {{ busy==='gift' ? '...' : tx('gift.queueGift') }}
        </Button>
      </template>

      <template v-if="tab === 'shop'">
        <Button class="btn full" :disabled="busy==='rotate'" @click="rotate" style="margin-bottom:10px">
          {{ tx('shop.rerollNow') }}
        </Button>
        <div v-for="r in speciesRows" :key="r.species" class="admin-row">
          <div class="admin-left">
            <span style="font-size:22px">{{ speciesInfo(r.species).emoji }}</span>
            <div>
              <div style="font-weight:700">{{ speciesInfo(r.species).name || r.species }}</div>
              <div class="subtitle" style="margin:0">{{ tx('shop.weightStatus', { weight: r.weight, status: r.enabled ? tx('shop.active') : tx('shop.disabled') }) }}</div>
            </div>
          </div>
          <div class="admin-actions">
            <label class="weight"><span>W</span>
              <InputText
                type="number"
                min="1"
                max="9999"
                v-model.number="weightDraft[r.species]"
                @blur="saveWeight(r.species)"
                @keydown.enter.prevent="saveWeight(r.species); $event.target.blur()" />
            </label>
            <label class="toggle">
              <Checkbox
                :modelValue="r.enabled"
                binary
                @update:modelValue="toggleEnabled(r)"
              />
            </label>
            <label class="weight"><span>+</span>
              <InputText type="number" min="1" max="99" v-model.number="restockQty[r.species]" placeholder="1" />
            </label>
            <Button class="btn secondary small" :disabled="busy==='r-'+r.species" @click="restock(r.species)">{{ tx('shop.restock') }}</Button>
            <Button class="btn danger small" :disabled="busy==='s-'+r.species" @click="stop(r.species)">{{ tx('shop.stop') }}</Button>
          </div>
        </div>
      </template>

      <template v-if="tab === 'users'">
        <p class="subtitle">{{ tx('users.subtitle') }}</p>
        <div class="row" style="gap:8px;margin-bottom:10px">
          <InputText
            v-model="userSearch"
            :placeholder="tx('users.searchPlaceholder')"
            style="flex:1"
            @keydown.enter.prevent="loadUsers" />
          <Button class="btn secondary small" :disabled="busy==='users'" @click="loadUsers">
            {{ busy==='users' ? '...' : tx('users.search') }}
          </Button>
        </div>
        <div v-for="u in users" :key="u.id" class="admin-row">
          <div class="admin-left">
            <div>
              <div style="font-weight:700;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                <span>{{ u.username }}</span>
                <span v-if="u.is_admin" class="pill">{{ tx('users.admin') }}</span>
                <span v-if="u.is_banned" class="pill banned">{{ tx('users.banned') }}</span>
              </div>
              <div class="subtitle" style="margin:0">{{ u.email || tx('users.noEmail') }}</div>
              <div class="subtitle" style="margin:0">{{ tx('users.coins', { coins: u.coins }) }}</div>
            </div>
          </div>
          <div class="admin-actions">
            <Button
              v-if="!u.is_banned"
              class="btn danger small"
              :disabled="busy===`ban-${u.id}` || u.is_admin"
              @click="setBan(u, true)"
            >
              {{ busy===`ban-${u.id}` ? '...' : tx('users.ban') }}
            </Button>
            <Button
              v-else
              class="btn secondary small"
              :disabled="busy===`unban-${u.id}` || u.is_admin"
              @click="setBan(u, false)"
            >
              {{ busy===`unban-${u.id}` ? '...' : tx('users.unban') }}
            </Button>
            <Button
              class="btn danger small"
              :disabled="busy===`del-${u.id}` || u.is_admin"
              @click="deleteUser(u)"
            >
              {{ busy===`del-${u.id}` ? '...' : tx('users.delete') }}
            </Button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.admin-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: 8px;
  flex-wrap: wrap;
}
.admin-row:last-child { border-bottom: none; }
.admin-left { display: flex; gap: 10px; align-items: center; min-width: 0; }
.admin-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.btn.small { padding: 6px 10px; font-size: 12px; }
.toggle :deep(.p-checkbox) { width: 20px; height: 20px; }
.weight { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--muted); }
.weight input { width: 54px; padding: 4px 6px; font-size: 16px; border-radius: 8px; text-align: right; }
.pill {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.08);
}
.pill.banned {
  border-color: #ff6b6b;
  color: #ff8a8a;
}
</style>
