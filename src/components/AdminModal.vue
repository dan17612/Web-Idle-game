<script setup>
import { computed, ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { speciesInfo } from '../animals'
import { locale } from '../i18n'
import { useAuthStore } from '../stores/auth'

const emit = defineEmits(['close'])

const auth = useAuthStore()
const isFullAdmin = computed(() => !!auth.profile?.is_admin)
const isSubadmin = computed(() => !isFullAdmin.value && !!auth.profile?.is_subadmin)

const I18N = {
  de: {
    title: '🛠️',
    titleLite: '🛠️⚡',
    tabs: { broadcast: '📢', shop: '🏪', gift: '🎁', users: '👥', tickets: '🎫', filter: '🚫' },
    tiers: { normal: 'Normal', gold: 'Gold', diamond: 'Diamant', epic: 'Episch', rainbow: 'Rainbow' },
    tickets: {
      subtitle: 'Support-Tickets der Spieler. Antworten gehen per E-Mail an den Spieler.',
      filterAll: 'Alle',
      filterOpen: 'Offen',
      filterReplied: 'Beantwortet',
      filterClosed: 'Geschlossen',
      reload: 'Neu laden',
      empty: 'Keine Tickets vorhanden.',
      from: 'Von',
      created: 'Erstellt',
      replied: 'Beantwortet',
      replyPlaceholder: 'Antwort an den Spieler …',
      sendReply: 'Antworten',
      sendReplyAndClose: 'Antworten & schließen',
      reopen: 'Wieder öffnen',
      close: 'Schließen',
      replied_at: 'Antwort vom {time}',
      previousReply: 'Letzte Admin-Antwort',
      replied_ok: 'Antwort gesendet.',
      status_open: 'Offen',
      status_replied: 'Beantwortet',
      status_closed: 'Geschlossen',
      enterReply: 'Antwort eingeben.'
    },
    flash: {
      enterMessage: 'Nachricht eingeben',
      broadcastSent: 'Nachricht an alle gesendet',
      enterUserOrAll: 'Username, @all oder @online angeben',
      enterCoinsOrSpecies: 'Muenzen oder Spezies angeben',
      sentAll: 'An alle {count} Spieler gesendet',
      sentOnline: 'An {count} aktuell online Spieler gesendet',
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
      recipientPlaceholder: 'alice, bob, charlie, @all oder @online',
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
      subtitleLite: 'Accounts verwalten: suchen und bannen/entbannen. Begründung erforderlich.',
      searchPlaceholder: 'Suche nach Username oder E-Mail',
      search: 'Suchen',
      admin: 'ADMIN',
      subadmin: 'SUB-ADMIN',
      banned: 'BANNED',
      noEmail: 'keine E-Mail',
      coins: 'Coins: {coins}',
      ban: 'Bannen',
      unban: 'Entbannen',
      delete: 'Loeschen',
      makeSub: 'Sub-Admin',
      revokeSub: 'Sub-Admin entziehen',
      promptBanReason: 'Bitte Begründung für den Bann angeben:',
      promptBanReasonOptional: 'Begründung für den Bann (optional):'
    },
    filter: {
      subtitle: 'Verbotene Wörter in Usernamen. „contains" trifft auch als Bestandteil, „exact" nur als ganzer Name.',
      addPattern: 'Neues Muster',
      patternPlaceholder: 'z. B. admin oder zooempire',
      kindContains: 'Enthält',
      kindExact: 'Exakt',
      notePlaceholder: 'Notiz (optional)',
      add: 'Hinzufügen',
      remove: 'Entfernen',
      apply: 'Sperrliste auf alle Spieler anwenden',
      applyConfirm: 'Alle blockierten Spieler werden auf u + 9 Zufallsziffern umbenannt. Fortfahren?',
      applied: '{count} Spieler umbenannt.',
      empty: 'Keine Muster vorhanden.',
      enterPattern: 'Muster eingeben.',
      added: 'Muster hinzugefügt.',
      removed: 'Muster entfernt.'
    }
  },
  en: {
    title: '🛠️',
    titleLite: '🛠️⚡',
    tabs: { broadcast: '📢', shop: '🏪', gift: '🎁', users: '👥', tickets: '🎫', filter: '🚫' },
    tiers: { normal: 'Normal', gold: 'Gold', diamond: 'Diamond', epic: 'Epic', rainbow: 'Rainbow' },
    tickets: {
      subtitle: 'Player support tickets. Replies are emailed to the player.',
      filterAll: 'All',
      filterOpen: 'Open',
      filterReplied: 'Replied',
      filterClosed: 'Closed',
      reload: 'Reload',
      empty: 'No tickets.',
      from: 'From',
      created: 'Created',
      replied: 'Replied',
      replyPlaceholder: 'Reply to the player …',
      sendReply: 'Send reply',
      sendReplyAndClose: 'Reply & close',
      reopen: 'Reopen',
      close: 'Close',
      replied_at: 'Replied {time}',
      previousReply: 'Last admin reply',
      replied_ok: 'Reply sent.',
      status_open: 'Open',
      status_replied: 'Replied',
      status_closed: 'Closed',
      enterReply: 'Please enter a reply.'
    },
    flash: {
      enterMessage: 'Enter a message',
      broadcastSent: 'Message sent to everyone',
      enterUserOrAll: 'Enter username, @all or @online',
      enterCoinsOrSpecies: 'Enter coins or species',
      sentAll: 'Sent to all {count} players',
      sentOnline: 'Sent to {count} online players',
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
      recipientPlaceholder: 'alice, bob, charlie, @all or @online',
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
      subtitleLite: 'Manage accounts: search and ban/unban. Reason required.',
      searchPlaceholder: 'Search by username or email',
      search: 'Search',
      admin: 'ADMIN',
      subadmin: 'SUB-ADMIN',
      banned: 'BANNED',
      noEmail: 'no email',
      coins: 'Coins: {coins}',
      ban: 'Ban',
      unban: 'Unban',
      delete: 'Delete',
      makeSub: 'Make sub-admin',
      revokeSub: 'Revoke sub-admin',
      promptBanReason: 'Please enter a ban reason:',
      promptBanReasonOptional: 'Ban reason (optional):'
    },
    filter: {
      subtitle: 'Forbidden words in usernames. "contains" matches as substring, "exact" only the whole name.',
      addPattern: 'New pattern',
      patternPlaceholder: 'e.g. admin or zooempire',
      kindContains: 'Contains',
      kindExact: 'Exact',
      notePlaceholder: 'Note (optional)',
      add: 'Add',
      remove: 'Remove',
      apply: 'Apply filter to all players',
      applyConfirm: 'All blocked players will be renamed to u + 9 random digits. Continue?',
      applied: '{count} player(s) renamed.',
      empty: 'No patterns yet.',
      enterPattern: 'Enter a pattern.',
      added: 'Pattern added.',
      removed: 'Pattern removed.'
    }
  },
  ru: {
    title: '🛠️',
    titleLite: '🛠️⚡',
    tabs: { broadcast: '📢', shop: '🏪', gift: '🎁', users: '👥', tickets: '🎫', filter: '🚫' },
    tiers: { normal: 'Обычный', gold: 'Золотой', diamond: 'Алмазный', epic: 'Эпический', rainbow: 'Радужный' },
    tickets: {
      subtitle: 'Тикеты поддержки от игроков. Ответы отправляются игроку по email.',
      filterAll: 'Все',
      filterOpen: 'Открытые',
      filterReplied: 'Отвеченные',
      filterClosed: 'Закрытые',
      reload: 'Обновить',
      empty: 'Тикетов нет.',
      from: 'От',
      created: 'Создан',
      replied: 'Отвечен',
      replyPlaceholder: 'Ответ игроку …',
      sendReply: 'Ответить',
      sendReplyAndClose: 'Ответить и закрыть',
      reopen: 'Открыть снова',
      close: 'Закрыть',
      replied_at: 'Ответ от {time}',
      previousReply: 'Последний ответ админа',
      replied_ok: 'Ответ отправлен.',
      status_open: 'Открыт',
      status_replied: 'Отвечен',
      status_closed: 'Закрыт',
      enterReply: 'Введите ответ.'
    },
    flash: {
      enterMessage: 'Введите сообщение',
      broadcastSent: 'Сообщение отправлено всем',
      enterUserOrAll: 'Укажите username, @all или @online',
      enterCoinsOrSpecies: 'Укажите монеты или вид',
      sentAll: 'Отправлено всем {count} игрокам',
      sentOnline: 'Отправлено {count} онлайн-игрокам',
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
      recipientPlaceholder: 'alice, bob, charlie, @all или @online',
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
      subtitleLite: 'Управление аккаунтами: поиск и бан/разбан. Нужна причина.',
      searchPlaceholder: 'Поиск по username или email',
      search: 'Найти',
      admin: 'ADMIN',
      subadmin: 'SUB-ADMIN',
      banned: 'BANNED',
      noEmail: 'нет email',
      coins: 'Монеты: {coins}',
      ban: 'Бан',
      unban: 'Разбан',
      delete: 'Удалить',
      makeSub: 'Назначить саб-админом',
      revokeSub: 'Снять саб-админа',
      promptBanReason: 'Укажите причину бана:',
      promptBanReasonOptional: 'Причина бана (опционально):'
    },
    filter: {
      subtitle: 'Запрещённые слова в никах. „contains" — как подстрока, „exact" — только точное совпадение.',
      addPattern: 'Новое правило',
      patternPlaceholder: 'например admin или zooempire',
      kindContains: 'Содержит',
      kindExact: 'Точно',
      notePlaceholder: 'Заметка (опционально)',
      add: 'Добавить',
      remove: 'Удалить',
      apply: 'Применить фильтр ко всем',
      applyConfirm: 'Все заблокированные игроки будут переименованы в u + 9 цифр. Продолжить?',
      applied: 'Переименовано: {count}.',
      empty: 'Пока нет правил.',
      enterPattern: 'Введите шаблон.',
      added: 'Правило добавлено.',
      removed: 'Правило удалено.'
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

const tickets = ref([])
const ticketFilter = ref('open')
const ticketReply = ref({})

const forbiddenList = ref([])
const newForbidden = ref({ pattern: '', kind: 'contains', note: '' })
const filterKindOptions = computed(() => [
  { label: tx('filter.kindContains'), value: 'contains' },
  { label: tx('filter.kindExact'), value: 'exact' }
])
const ticketStatusOptions = computed(() => [
  { label: tx('tickets.filterAll'), value: '' },
  { label: tx('tickets.filterOpen'), value: 'open' },
  { label: tx('tickets.filterReplied'), value: 'replied' },
  { label: tx('tickets.filterClosed'), value: 'closed' }
])

function fmtDateTime(s) {
  if (!s) return ''
  try { return new Date(s).toLocaleString() } catch { return String(s) }
}

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

const craftOnlyDraft = ref({})
const disappearsDaysDraft = ref({})

async function loadSpecies() {
  const { data } = await supabase
    .from('species_costs')
    .select('species, enabled, weight, craft_only, disappears_at')
    .order('species')
  speciesRows.value = data || []
  for (const r of data || []) {
    weightDraft.value[r.species] = r.weight
    craftOnlyDraft.value[r.species] = !!r.craft_only
  }
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
    let msg
    if (data?.all) msg = tx('flash.sentAll', { count: sent })
    else if (data?.online) msg = tx('flash.sentOnline', { count: sent })
    else msg = tx('flash.giftQueued', { count: sent })
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

async function restock(species) {
  const qty = Math.max(1, parseInt(restockQty.value[species] || 1, 10))
  const days = Math.max(0, parseFloat(disappearsDaysDraft.value[species] || 0))
  const craftOnly = !!craftOnlyDraft.value[species]
  await callAdmin('admin_force_add', { p_species: species, p_qty: qty }, 'r-' + species)
  // Wenn craft_only oder Verschwindezeit gesetzt, zusätzlich admin_set_species_event aufrufen.
  if (craftOnly || days > 0) {
    const disappearsAt = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null
    await callAdmin('admin_set_species_event', {
      p_species: species,
      p_craft_only: craftOnly,
      p_disappears_at: disappearsAt,
      p_clear_disappears: false
    }, 'm-' + species)
  }
  disappearsDaysDraft.value[species] = ''
}

async function clearSpeciesEvent(species) {
  craftOnlyDraft.value[species] = false
  await callAdmin('admin_set_species_event', {
    p_species: species,
    p_craft_only: false,
    p_disappears_at: null,
    p_clear_disappears: true
  }, 'm-' + species)
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
  let reason = null
  if (banned) {
    const promptText = isSubadmin.value
      ? tx('users.promptBanReason')
      : tx('users.promptBanReasonOptional')
    const entered = window.prompt(promptText, '')
    if (entered === null) return
    reason = entered.trim() || null
    if (isSubadmin.value && !reason) return flash(tx('users.promptBanReason'), true)
  }
  busy.value = banned ? `ban-${u.id}` : `unban-${u.id}`
  try {
    const { error: e } = await supabase.rpc('admin_set_user_ban', {
      p_user_id: u.id,
      p_banned: banned,
      p_reason: reason
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

async function toggleSubadmin(u) {
  if (!isFullAdmin.value || u.is_admin) return
  const next = !u.is_subadmin
  busy.value = `sub-${u.id}`
  try {
    const { error: e } = await supabase.rpc('admin_set_user_subadmin', {
      p_user_id: u.id,
      p_is_subadmin: next
    })
    if (e) throw e
    await loadUsers()
    flash(tx('flash.ok'))
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

async function loadForbidden() {
  if (!isFullAdmin.value) return
  busy.value = 'filter'
  try {
    const { data, error: e } = await supabase.rpc('admin_list_forbidden_usernames')
    if (e) throw e
    forbiddenList.value = data || []
  } catch (e) {
    flash(e.message, true)
  } finally {
    if (busy.value === 'filter') busy.value = ''
  }
}

async function addForbidden() {
  const pattern = (newForbidden.value.pattern || '').trim()
  if (!pattern) return flash(tx('filter.enterPattern'), true)
  busy.value = 'filter-add'
  try {
    const { error: e } = await supabase.rpc('admin_add_forbidden_username', {
      p_pattern: pattern,
      p_kind: newForbidden.value.kind || 'contains',
      p_note: (newForbidden.value.note || '').trim() || null
    })
    if (e) throw e
    newForbidden.value = { pattern: '', kind: 'contains', note: '' }
    await loadForbidden()
    flash(tx('filter.added'))
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

async function removeForbidden(id) {
  busy.value = `filter-rm-${id}`
  try {
    const { error: e } = await supabase.rpc('admin_remove_forbidden_username', { p_id: id })
    if (e) throw e
    await loadForbidden()
    flash(tx('filter.removed'))
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

async function applyFilter() {
  if (!confirm(tx('filter.applyConfirm'))) return
  busy.value = 'filter-apply'
  try {
    const { data, error: e } = await supabase.rpc('admin_apply_username_filter')
    if (e) throw e
    flash(tx('filter.applied', { count: Number(data?.renamed ?? 0) }))
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

async function loadTickets() {
  busy.value = 'tickets'
  try {
    const { data, error: e } = await supabase.rpc('admin_list_support_tickets', {
      p_status: ticketFilter.value || null,
      p_limit: 100,
      p_offset: 0
    })
    if (e) throw e
    tickets.value = data || []
  } catch (e) {
    flash(e.message, true)
  } finally {
    if (busy.value === 'tickets') busy.value = ''
  }
}

async function replyTicket(t, close) {
  const reply = (ticketReply.value[t.id] || '').trim()
  if (!reply) return flash(tx('tickets.enterReply'), true)
  busy.value = `treply-${t.id}`
  try {
    const { error: e } = await supabase.rpc('admin_reply_support_ticket', {
      p_ticket_id: t.id,
      p_reply: reply,
      p_close: !!close
    })
    if (e) throw e
    ticketReply.value[t.id] = ''
    await loadTickets()
    flash(tx('tickets.replied_ok'))
  } catch (e) {
    flash(e.message, true)
  } finally {
    busy.value = ''
  }
}

async function setTicketStatus(t, status) {
  busy.value = `tstatus-${t.id}`
  try {
    const { error: e } = await supabase.rpc('admin_set_support_ticket_status', {
      p_ticket_id: t.id,
      p_status: status
    })
    if (e) throw e
    await loadTickets()
    flash(tx('flash.ok'))
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
        <h2>{{ isSubadmin ? tx('titleLite') : tx('title') }}</h2>
        <Button class="btn secondary small" @click="emit('close')">X</Button>
      </div>

      <div class="tabs">
        <Button :class="{ active: tab==='broadcast' }" @click="tab='broadcast'">{{ tx('tabs.broadcast') }}</Button>
        <Button :class="{ active: tab==='shop' }" @click="tab='shop'">{{ tx('tabs.shop') }}</Button>
        <Button :class="{ active: tab==='gift' }" @click="tab='gift'">{{ tx('tabs.gift') }}</Button>
        <Button :class="{ active: tab==='users' }" @click="tab='users'">{{ tx('tabs.users') }}</Button>
        <Button :class="{ active: tab==='tickets' }" @click="tab='tickets'; loadTickets()">{{ tx('tabs.tickets') }}</Button>
        <Button v-if="isFullAdmin" :class="{ active: tab==='filter' }" @click="tab='filter'; loadForbidden()">{{ tx('tabs.filter') }}</Button>
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
        <label class="subtitle">{{ tx('gift.recipientLabel') }} <code>@all</code> / <code>@online</code></label>
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
            <label class="weight" :title="'Tage bis Verschwinden'">
              <span>📅</span>
              <InputText type="number" min="0" max="365" step="0.25" v-model="disappearsDaysDraft[r.species]" placeholder="0" />
            </label>
            <label class="toggle" :title="'Nur craftbar'">
              <Checkbox :modelValue="craftOnlyDraft[r.species]" binary @update:modelValue="craftOnlyDraft[r.species] = $event" />
              <span>🔧</span>
            </label>
            <Button class="btn secondary small" :disabled="busy==='r-'+r.species || busy==='m-'+r.species" @click="restock(r.species)">{{ tx('shop.restock') }}</Button>
            <Button class="btn danger small" :disabled="busy==='s-'+r.species" @click="stop(r.species)">{{ tx('shop.stop') }}</Button>
            <Button v-if="r.craft_only || r.disappears_at" class="btn small btn-ghost" :disabled="busy==='m-'+r.species" @click="clearSpeciesEvent(r.species)" :title="'Verschwindezeit/Craftonly löschen'">↺</Button>
          </div>
        </div>
      </template>

      <template v-if="tab === 'users'">
        <p class="subtitle">{{ isSubadmin ? tx('users.subtitleLite') : tx('users.subtitle') }}</p>
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
                <span v-if="u.is_subadmin && !u.is_admin" class="pill subadmin">{{ tx('users.subadmin') }}</span>
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
              v-if="isFullAdmin"
              class="btn secondary small"
              :disabled="busy===`sub-${u.id}` || u.is_admin"
              @click="toggleSubadmin(u)"
            >
              {{ busy===`sub-${u.id}` ? '...' : (u.is_subadmin ? tx('users.revokeSub') : tx('users.makeSub')) }}
            </Button>
            <Button
              v-if="isFullAdmin"
              class="btn danger small"
              :disabled="busy===`del-${u.id}` || u.is_admin"
              @click="deleteUser(u)"
            >
              {{ busy===`del-${u.id}` ? '...' : tx('users.delete') }}
            </Button>
          </div>
        </div>
      </template>

      <template v-if="tab === 'filter' && isFullAdmin">
        <p class="subtitle">{{ tx('filter.subtitle') }}</p>
        <div class="row" style="gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
          <InputText
            v-model="newForbidden.pattern"
            :placeholder="tx('filter.patternPlaceholder')"
            style="flex:1;min-width:140px"
          />
          <Select
            v-model="newForbidden.kind"
            :options="filterKindOptions"
            optionLabel="label"
            optionValue="value"
            style="min-width:130px"
          />
        </div>
        <InputText
          v-model="newForbidden.note"
          :placeholder="tx('filter.notePlaceholder')"
          maxlength="140"
          style="width:100%;margin-bottom:8px"
        />
        <div class="row" style="gap:8px;margin-bottom:14px;flex-wrap:wrap">
          <Button class="btn small" :disabled="busy==='filter-add'" @click="addForbidden">
            {{ busy==='filter-add' ? '...' : tx('filter.add') }}
          </Button>
          <Button class="btn danger small" :disabled="busy==='filter-apply'" @click="applyFilter">
            {{ busy==='filter-apply' ? '...' : tx('filter.apply') }}
          </Button>
        </div>
        <div v-if="!forbiddenList.length" class="subtitle" style="text-align:center;padding:12px">
          {{ tx('filter.empty') }}
        </div>
        <div v-for="f in forbiddenList" :key="f.id" class="admin-row">
          <div class="admin-left" style="min-width:0;flex:1">
            <div style="min-width:0">
              <div style="font-weight:700;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                <code class="ticket-num">{{ f.pattern }}</code>
                <span class="pill">{{ f.kind === 'exact' ? tx('filter.kindExact') : tx('filter.kindContains') }}</span>
              </div>
              <div v-if="f.note" class="subtitle" style="margin:0;word-break:break-word">{{ f.note }}</div>
            </div>
          </div>
          <div class="admin-actions">
            <Button
              class="btn danger small"
              :disabled="busy===`filter-rm-${f.id}`"
              @click="removeForbidden(f.id)"
            >
              {{ busy===`filter-rm-${f.id}` ? '...' : tx('filter.remove') }}
            </Button>
          </div>
        </div>
      </template>

      <template v-if="tab === 'tickets'">
        <p class="subtitle">{{ tx('tickets.subtitle') }}</p>
        <div class="row" style="gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap">
          <Select
            v-model="ticketFilter"
            :options="ticketStatusOptions"
            optionLabel="label"
            optionValue="value"
            style="min-width:160px"
            @update:modelValue="loadTickets"
          />
          <Button class="btn secondary small" :disabled="busy==='tickets'" @click="loadTickets">
            {{ busy==='tickets' ? '...' : tx('tickets.reload') }}
          </Button>
        </div>
        <div v-if="!tickets.length" class="subtitle" style="text-align:center;padding:12px">
          {{ tx('tickets.empty') }}
        </div>
        <div v-for="t in tickets" :key="t.id" class="ticket-card">
          <div class="row between" style="gap:8px;flex-wrap:wrap">
            <div style="font-weight:700">
              <span class="ticket-num">{{ t.ticket_number }}</span>
              · {{ t.subject }}
            </div>
            <span class="pill" :class="`status-${t.status}`">{{ tx(`tickets.status_${t.status}`) }}</span>
          </div>
          <div class="subtitle" style="margin:4px 0">
            {{ tx('tickets.from') }}: <b>{{ t.username || '?' }}</b>
            &lt;{{ t.user_email || '?' }}&gt; · {{ tx('tickets.created') }}: {{ fmtDateTime(t.created_at) }}
          </div>
          <pre class="ticket-msg">{{ t.message }}</pre>
          <div v-if="t.admin_reply" class="ticket-prev-reply">
            <div class="subtitle" style="margin:0 0 4px">
              {{ tx('tickets.previousReply') }} · {{ fmtDateTime(t.replied_at) }}
            </div>
            <pre class="ticket-msg" style="background:rgba(120,200,160,0.08)">{{ t.admin_reply }}</pre>
          </div>
          <Textarea
            v-model="ticketReply[t.id]"
            rows="3"
            maxlength="5000"
            :placeholder="tx('tickets.replyPlaceholder')"
            style="width:100%;margin-top:8px"
          />
          <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap;justify-content:flex-end">
            <Button
              class="btn small"
              :disabled="busy===`treply-${t.id}`"
              @click="replyTicket(t, false)"
            >
              {{ busy===`treply-${t.id}` ? '...' : tx('tickets.sendReply') }}
            </Button>
            <Button
              class="btn small"
              :disabled="busy===`treply-${t.id}`"
              @click="replyTicket(t, true)"
            >
              {{ tx('tickets.sendReplyAndClose') }}
            </Button>
            <Button
              v-if="t.status !== 'closed'"
              class="btn secondary small"
              :disabled="busy===`tstatus-${t.id}`"
              @click="setTicketStatus(t, 'closed')"
            >
              {{ tx('tickets.close') }}
            </Button>
            <Button
              v-else
              class="btn secondary small"
              :disabled="busy===`tstatus-${t.id}`"
              @click="setTicketStatus(t, 'open')"
            >
              {{ tx('tickets.reopen') }}
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
.pill.subadmin {
  border-color: #6bd4ff;
  color: #6bd4ff;
}
.pill.status-open { border-color: #ffb86b; color: #ffb86b; }
.pill.status-replied { border-color: #6bd4ff; color: #6bd4ff; }
.pill.status-closed { border-color: #888; color: #aaa; }
.ticket-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.02);
}
.ticket-num {
  font-family: ui-monospace, monospace;
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 12px;
}
.ticket-msg {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.04);
  padding: 8px 10px;
  border-radius: 8px;
  margin: 4px 0 0;
  font-size: 13px;
}
.ticket-prev-reply { margin-top: 8px; }
</style>
