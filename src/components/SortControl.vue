<script setup>
import { t } from "../i18n";

defineProps({
  modelValue: { type: String, default: "rarity" },
});
const emit = defineEmits(["update:modelValue"]);

const options = [
  { k: "rarity", badge: "✨" },
  { k: "rate", badge: "🪙" },
];
</script>

<template>
  <div class="sort-control">
    <span class="sort-label">{{ t("sort.label") }}</span>
    <div class="sort-chips">
      <Button
        v-for="o in options"
        :key="o.k"
        class="sort-chip"
        :class="{ active: modelValue === o.k }"
        @click="emit('update:modelValue', o.k)"
      >
        <span>{{ o.badge }}</span>
        <span>{{ t("sort." + o.k) }}</span>
      </Button>
    </div>
  </div>
</template>

<style scoped>
.sort-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.sort-label {
  font-size: 11px;
  color: var(--subtitle, var(--muted));
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}
.sort-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.sort-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--card-2);
  border: 1px solid var(--border);
  color: inherit;
  font: inherit;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
}
.sort-chip.active {
  background: var(--accent);
  color: #1b1300;
  border-color: var(--accent);
  font-weight: 700;
}
</style>
