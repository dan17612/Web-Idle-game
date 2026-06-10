<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import { t } from '../i18n'
import { useReturnRefresh } from '../composables/useReturnRefresh'
import { useAppToast } from '../composables/useAppToast'

const toast = useAppToast()
const auth = useAuthStore()
const ideas = ref([])
const loading = ref(false)
const filter = ref('all')
const sortBy = ref('votes')
const expanded = ref(new Set())
const submitOpen = ref(false)
const submitForm = reactive({ title: '', description: '', busy: false })
const adminBusy = ref('')

const isAdmin = computed(() => !!(auth.profile?.is_admin || auth.profile?.is_subadmin))
const adminStatuses = ['idea', 'planned', 'in_progress', 'done', 'rejected']

function isOwnIdea(idea) {
  return !!auth.user && idea.created_by === auth.user.id
}

async function load() {
  loading.value = true
  try {
    const { data, error } = await supabase.from('roadmap_view').select('*')
    if (error) throw error
    ideas.value = data || []
  } catch (e) {
    toast.err(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
useReturnRefresh(load)

const statusFilters = computed(() => [
  { k: 'all',         label: t('roadmap.statusAll'),         emoji: '📚' },
  { k: 'idea',        label: t('roadmap.statusIdea'),        emoji: '💡' },
  { k: 'planned',     label: t('roadmap.statusPlanned'),     emoji: '📋' },
  { k: 'in_progress', label: t('roadmap.statusInProgress'), emoji: '🔨' },
  { k: 'done',        label: t('roadmap.statusDone'),        emoji: '✅' }
])

const filteredIdeas = computed(() => {
  let list = ideas.value
  if (filter.value !== 'all') list = list.filter(i => i.status === filter.value)
  if (sortBy.value === 'votes') {
    list = [...list].sort((a, b) => (Number(b.vote_count) || 0) - (Number(a.vote_count) || 0))
  } else {
    list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
  return list
})

function statusEmoji(s) {
  return ({ idea: '💡', planned: '📋', in_progress: '🔨', done: '✅', rejected: '❌' })[s] || '💡'
}

function statusLabel(s) {
  return t('roadmap.status' + s.charAt(0).toUpperCase() + s.slice(1).replace(/_(\w)/g, (_, c) => c.toUpperCase()))
}

function fmtVotes(n) {
  const num = Number(n) || 0
  return num > 99 ? '99+' : String(num)
}

function toggleExpand(id) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
  expanded.value = new Set(expanded.value)
}

async function vote(idea) {
  try {
    const { data, error } = await supabase.rpc('vote_idea', { p_idea_id: idea.id })
    if (error) throw error
    idea.vote_count = data.count
    idea.my_vote = data.voted
  } catch (e) { toast.err(e) }
}

async function adminSetStatus(idea, status) {
  if (status === idea.status) return
  adminBusy.value = 'status-' + idea.id
  try {
    const { error } = await supabase.rpc('admin_set_idea_status', { p_idea_id: idea.id, p_status: status })
    if (error) throw error
    idea.status = status
    toast.ok(t('roadmap.statusUpdated'))
  } catch (e) { toast.err(e) } finally { adminBusy.value = '' }
}

async function adminDelete(idea) {
  if (!confirm(t('roadmap.deleteConfirm'))) return
  adminBusy.value = 'del-' + idea.id
  try {
    const { error } = await supabase.rpc('admin_delete_idea', { p_idea_id: idea.id })
    if (error) throw error
    ideas.value = ideas.value.filter(i => i.id !== idea.id)
    toast.ok(t('roadmap.deleted'))
  } catch (e) { toast.err(e) } finally { adminBusy.value = '' }
}

async function deleteOwn(idea) {
  if (!confirm(t('roadmap.deleteConfirm'))) return
  adminBusy.value = 'own-' + idea.id
  try {
    const { error } = await supabase.rpc('delete_own_idea', { p_idea_id: idea.id })
    if (error) throw error
    ideas.value = ideas.value.filter(i => i.id !== idea.id)
    toast.ok(t('roadmap.deleted'))
  } catch (e) { toast.err(e) } finally { adminBusy.value = '' }
}

async function submitIdea() {
  const title = submitForm.title.trim()
  if (title.length < 3) {
    toast.err(t('roadmap.titleTooShort'))
    return
  }
  submitForm.busy = true
  try {
    const { error } = await supabase.rpc('submit_idea', {
      p_title: title,
      p_description: submitForm.description.trim() || null
    })
    if (error) throw error
    toast.ok(t('roadmap.submitted'))
    submitForm.title = ''
    submitForm.description = ''
    submitOpen.value = false
    await load()
  } catch (e) { toast.err(e) } finally { submitForm.busy = false }
}
</script>

<template>
  <h1 class="title">🗺️ {{ t('roadmap.title') }}</h1>

  <div class="card filter-card">
    <div class="filter-bar">
      <Button
        v-for="f in statusFilters"
        :key="f.k"
        class="filter-chip"
        :class="{ active: filter === f.k }"
        @click="filter = f.k"
      >
        <span>{{ f.emoji }}</span>
        <span>{{ f.label }}</span>
      </Button>
    </div>
    <div class="sort-row">
      <span class="subtitle" style="margin:0">{{ t('roadmap.sortBy') }}</span>
      <Button
        class="sort-btn"
        :class="{ active: sortBy === 'votes' }"
        @click="sortBy = 'votes'"
      >⭐ {{ t('roadmap.sortVotes') }}</Button>
      <Button
        class="sort-btn"
        :class="{ active: sortBy === 'recent' }"
        @click="sortBy = 'recent'"
      >🕒 {{ t('roadmap.sortRecent') }}</Button>
    </div>
  </div>

  <div v-if="loading" class="card subtitle">{{ t('common.loading') }}</div>
  <div v-else-if="!filteredIdeas.length" class="card subtitle">{{ t('roadmap.empty') }}</div>

  <div v-else>
    <div
      v-for="idea in filteredIdeas"
      :key="idea.id"
      class="card idea-card"
      :class="{ 'has-voted': idea.my_vote }"
      @click="toggleExpand(idea.id)"
    >
      <div class="idea-row">
        <div class="vote-col" @click.stop="vote(idea)">
          <span class="vote-arrow" :class="{ active: idea.my_vote }">▲</span>
          <span class="vote-count">{{ fmtVotes(idea.vote_count) }}</span>
        </div>
        <div class="idea-body">
          <div class="idea-title">{{ idea.title }}</div>
          <div v-if="idea.description && !expanded.has(idea.id)" class="idea-desc">
            {{ idea.description.length > 90 ? idea.description.slice(0, 90) + '…' : idea.description }}
          </div>
          <div v-if="idea.description && expanded.has(idea.id)" class="idea-desc full">
            {{ idea.description }}
          </div>
          <div class="idea-meta">
            <span class="status-chip" :data-status="idea.status">
              {{ statusEmoji(idea.status) }} {{ statusLabel(idea.status) }}
            </span>
            <span v-if="idea.author_username" class="author">— {{ idea.author_username }}</span>
            <Button
              v-if="!isAdmin && isOwnIdea(idea)"
              class="own-delete"
              :disabled="adminBusy === 'own-' + idea.id"
              :title="t('roadmap.delete')"
              @click.stop="deleteOwn(idea)"
            >🗑️</Button>
          </div>

          <div v-if="isAdmin" class="admin-controls" @click.stop>
            <span class="admin-label">🛠️ {{ t('roadmap.adminStatus') }}</span>
            <div class="admin-status-row">
              <Button
                v-for="s in adminStatuses"
                :key="s"
                class="admin-status-btn"
                :class="{ active: idea.status === s }"
                :data-status="s"
                :disabled="adminBusy === 'status-' + idea.id"
                @click="adminSetStatus(idea, s)"
              >{{ statusEmoji(s) }} {{ statusLabel(s) }}</Button>
            </div>
            <Button
              class="btn danger small admin-delete"
              :disabled="adminBusy === 'del-' + idea.id"
              @click="adminDelete(idea)"
            >🗑️ {{ t('roadmap.delete') }}</Button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Button class="submit-fab btn" @click="submitOpen = true">
    + {{ t('roadmap.submit') }}
  </Button>

  <div v-if="submitOpen" class="modal-backdrop" @click.self="submitOpen = false">
    <div class="modal">
      <div class="row between" style="margin-bottom:10px">
        <h3 style="margin:0">💡 {{ t('roadmap.submitTitle') }}</h3>
        <Button class="btn secondary small" @click="submitOpen = false">×</Button>
      </div>
      <label class="subtitle">{{ t('roadmap.titleLabel') }}</label>
      <InputText v-model="submitForm.title" :placeholder="t('roadmap.titlePlaceholder')" maxlength="120" />
      <label class="subtitle" style="margin-top:10px">{{ t('roadmap.descriptionLabel') }}</label>
      <Textarea v-model="submitForm.description" :placeholder="t('roadmap.descriptionPlaceholder')" maxlength="1000" rows="4" autoResize />
      <Button class="btn full" :disabled="submitForm.busy || submitForm.title.trim().length < 3" @click="submitIdea" style="margin-top:12px">
        {{ submitForm.busy ? t('common.loadingShort') : t('roadmap.submitButton') }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.filter-card { padding: 8px; }
.filter-bar {
  display: flex; gap: 6px; overflow-x: auto; padding: 2px;
  scrollbar-width: thin;
}
.filter-chip {
  flex: 0 0 auto;
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--card-2); border: 1px solid var(--border);
  color: inherit; padding: 6px 10px; border-radius: 999px; cursor: pointer;
  font-size: 12px;
}
.filter-chip.active {
  background: var(--accent); color: #1b1300; border-color: var(--accent);
  font-weight: 700;
}
.sort-row {
  display: flex; align-items: center; gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.sort-btn {
  background: transparent; border: 1px solid var(--border);
  color: var(--muted); padding: 4px 10px; border-radius: 999px;
  font-size: 11px; cursor: pointer;
}
.sort-btn.active {
  border-color: var(--accent); color: var(--accent); font-weight: 700;
}

.idea-card {
  margin-bottom: 8px; cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.idea-card:hover { transform: translateY(-1px); border-color: var(--accent); }
.idea-card.has-voted { border-color: rgba(244, 169, 18, 0.5); }
.idea-row { display: flex; align-items: flex-start; gap: 12px; }
.vote-col {
  display: flex; flex-direction: column; align-items: center;
  min-width: 44px; padding: 4px 6px;
  background: var(--card-2); border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer; user-select: none;
  transition: border-color 0.15s ease;
}
.vote-col:hover { border-color: var(--accent); }
.vote-arrow { font-size: 16px; color: var(--muted); line-height: 1; }
.vote-arrow.active { color: var(--accent); }
.vote-count { font-size: 12px; font-weight: 800; margin-top: 2px; }
.idea-body { flex: 1; min-width: 0; }
.idea-title { font-weight: 700; font-size: 15px; }
.idea-desc { color: var(--muted); font-size: 13px; margin-top: 4px; }
.idea-desc.full { white-space: pre-wrap; }
.idea-meta { display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.status-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 999px;
  font-size: 10px; font-weight: 700;
  background: rgba(155, 110, 255, 0.18);
  border: 1px solid rgba(155, 110, 255, 0.45);
  color: #b894ff;
}
.status-chip[data-status="planned"] {
  background: rgba(25, 146, 200, 0.18);
  border-color: rgba(25, 146, 200, 0.45);
  color: #1992c8;
}
.status-chip[data-status="in_progress"] {
  background: rgba(244, 169, 18, 0.18);
  border-color: rgba(244, 169, 18, 0.5);
  color: var(--accent);
}
.status-chip[data-status="done"] {
  background: rgba(46, 194, 114, 0.18);
  border-color: rgba(46, 194, 114, 0.5);
  color: var(--accent-2);
}
.status-chip[data-status="rejected"] {
  background: rgba(239, 71, 111, 0.18);
  border-color: rgba(239, 71, 111, 0.45);
  color: var(--danger);
}
.author { font-size: 11px; color: var(--muted); }
.own-delete {
  margin-left: auto;
  background: transparent;
  border: 1px solid rgba(239, 71, 111, 0.4);
  color: var(--danger);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
}
.own-delete:hover { border-color: var(--danger); background: rgba(239, 71, 111, 0.12); }
.own-delete:disabled { opacity: 0.5; cursor: not-allowed; }

.admin-controls {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
}
.admin-label {
  font-size: 11px;
  color: var(--muted);
  font-weight: 700;
}
.admin-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0;
}
.admin-status-btn {
  background: var(--card-2);
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  cursor: pointer;
}
.admin-status-btn.active {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 700;
}
.admin-status-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.admin-delete {
  margin-top: 2px;
}

.submit-fab {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  padding: 12px 22px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 20px;
}
.modal {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 14px; padding: 18px;
  width: 100%; max-width: 420px;
}
</style>
