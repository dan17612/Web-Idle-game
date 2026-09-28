<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { locale } from '../i18n'
import { useAuthStore } from '../stores/auth'
import SupportChat from '../components/SupportChat.vue'
import RoadmapBoard from '../components/RoadmapBoard.vue'

const I18N = {
  de: { title: 'Support', tabChat: 'Support-Chat', tabRoadmap: 'Roadmap' },
  en: { title: 'Support', tabChat: 'Support chat', tabRoadmap: 'Roadmap' },
  ru: { title: 'Поддержка', tabChat: 'Чат поддержки', tabRoadmap: 'Роудмап' }
}

function tx(key) {
  const lang = I18N[locale.value] ? locale.value : 'en'
  return I18N[lang][key] ?? I18N.en[key] ?? key
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// Reiter steckt in ?tab=, damit /roadmap-Links und Zurück-Navigation passen.
const tab = computed(() => (route.query.tab === 'roadmap' ? 'roadmap' : 'chat'))

function setTab(key) {
  if (key === tab.value) return
  const query = { ...route.query }
  if (key === 'chat') delete query.tab
  else query.tab = key
  router.replace({ query })
}
</script>

<template>
  <h1 class="title">💬 {{ tx('title') }}</h1>

  <div class="tabs support-tabs">
    <Button :class="{ active: tab === 'chat' }" @click="setTab('chat')">
      💬 {{ tx('tabChat') }}
      <span v-if="auth.hasUnseenSupportReply" class="tab-dot"></span>
    </Button>
    <Button :class="{ active: tab === 'roadmap' }" @click="setTab('roadmap')">
      🗺️ {{ tx('tabRoadmap') }}
    </Button>
  </div>

  <SupportChat v-if="tab === 'chat'" />
  <RoadmapBoard v-else />
</template>

<style scoped>
.support-tabs .p-button { position: relative; gap: 4px; }
.tab-dot {
  display: inline-block;
  width: 8px; height: 8px;
  margin-left: 2px;
  border-radius: 50%;
  background: var(--danger);
}
</style>
