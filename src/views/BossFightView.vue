<script setup>
import { useRouter } from "vue-router";
import { locale } from "../i18n";
import EndlessBossView from "./EndlessBossView.vue";

const router = useRouter();

const I18N = {
  de: {
    title: "👑 Boss-Kampf",
    sub: "Sammle 3 Minuten lang Schaden in der Endless-Challenge.",
    backHome: "Zurück"
  },
  en: {
    title: "👑 Boss Fight",
    sub: "Deal damage for 3 minutes in the endless challenge.",
    backHome: "Back"
  },
  ru: {
    title: "👑 Бой с боссами",
    sub: "Наноси урон 3 минуты в эндлесс-челлендже.",
    backHome: "Назад"
  }
};

function tx(key) {
  return I18N[locale.value]?.[key] || I18N.en[key] || key;
}

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

    <div class="bf-content">
      <EndlessBossView />
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
  background: linear-gradient(90deg, var(--accent), #ff476f, #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.bf-sub {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 13px;
}
.bf-content { min-height: 200px; }
</style>
