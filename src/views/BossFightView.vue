<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { locale } from "../i18n";
import BossPathView from "./BossPathView.vue";
import EndlessBossView from "./EndlessBossView.vue";

const route = useRoute();
const router = useRouter();

const I18N = {
  de: {
    title: "👑 Boss-Kampf",
    sub: "Kämpfe gegen Bosse - Pfad-Abenteuer oder Endless-Schaden-Challenge.",
    backHome: "Zurück",
    tabPath: "🗺️ Bosspfad",
    tabEndless: "⏱️ Endlessboss"
  },
  en: {
    title: "👑 Boss Fight",
    sub: "Fight bosses - path adventure or endless damage challenge.",
    backHome: "Back",
    tabPath: "🗺️ Boss path",
    tabEndless: "⏱️ Endless boss"
  },
  ru: {
    title: "👑 Бой с боссами",
    sub: "Сражайся с боссами - путь или эндлесс-урон-челлендж.",
    backHome: "Назад",
    tabPath: "🗺️ Босс-путь",
    tabEndless: "⏱️ Эндлесс-босс"
  }
};

function tx(key) {
  return I18N[locale.value]?.[key] || I18N.en[key] || key;
}

const validModes = ["path", "endless"];
const mode = ref(validModes.includes(route.query.mode) ? route.query.mode : "path");

watch(mode, (m) => {
  router.replace({ query: { ...route.query, mode: m } });
});

watch(() => route.query.mode, (m) => {
  if (validModes.includes(m) && m !== mode.value) mode.value = m;
});

function backHome() {
  router.push("/");
}
</script>

<template>
  <div class="boss-fight-view">
    <header class="bf-header">
      <Button class="btn small btn-ghost back-btn" @click="backHome">
        <i class="pi pi-arrow-left"></i>
        <span>{{ tx("backHome") }}</span>
      </Button>
      <div class="bf-title-block">
        <h1 class="bf-title">{{ tx("title") }}</h1>
        <p class="bf-sub">{{ tx("sub") }}</p>
      </div>
    </header>

    <div class="bf-tabs">
      <Button
        class="bf-tab"
        :class="{ active: mode === 'path' }"
        @click="mode = 'path'"
      >
        {{ tx("tabPath") }}
      </Button>
      <Button
        class="bf-tab"
        :class="{ active: mode === 'endless' }"
        @click="mode = 'endless'"
      >
        {{ tx("tabEndless") }}
      </Button>
    </div>

    <div class="bf-content">
      <BossPathView v-if="mode === 'path'" :embedded="true" />
      <EndlessBossView v-else />
    </div>
  </div>
</template>

<style scoped>
.boss-fight-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 18px;
}
.bf-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.back-btn { flex-shrink: 0; }
.btn-ghost {
  background: rgba(255, 255, 255, 0.06);
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.bf-title-block { min-width: 0; }
.bf-title {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  background: linear-gradient(90deg, #ffd166, #ff476f, #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.bf-sub {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 13px;
}
.bf-tabs {
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px;
  border-radius: 14px;
  border: 1px solid var(--border);
}
.bf-tab {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--muted);
  padding: 10px 14px;
  font-weight: 800;
  border-radius: 10px;
  transition: background 0.15s, color 0.15s;
}
.bf-tab.active {
  background: linear-gradient(135deg, rgba(255, 209, 102, 0.18), rgba(168, 85, 247, 0.18));
  color: var(--text);
  box-shadow: 0 0 0 1px rgba(255, 209, 102, 0.35) inset;
}
.bf-content { min-height: 200px; }
</style>
