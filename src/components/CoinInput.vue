<script setup>
import { computed, ref, watch } from 'vue'
import { formatCoins, parseCoinInput } from '../animals'
import { currentLocaleTag, t } from '../i18n'

const props = defineProps({
  modelValue: { type: [Number, String, null], default: null },
  min: { type: Number, default: 0 },
  placeholder: { type: String, default: 'z.B. 10M' },
  required: Boolean,
  disabled: Boolean
})
const emit = defineEmits(['update:modelValue'])

const raw = ref(props.modelValue == null ? '' : String(props.modelValue))

watch(() => props.modelValue, (v) => {
  const current = parseCoinInput(raw.value)
  const target = v == null ? null : Number(v)
  if (current !== target) {
    raw.value = v == null ? '' : String(v)
  }
})

const parsed = computed(() => parseCoinInput(raw.value))

const preview = computed(() => {
  if (!raw.value.trim()) return ''
  const n = parsed.value
  if (n == null) return t('coin.invalid')
  const short = formatCoins(n)
  const full = n.toLocaleString(currentLocaleTag())
  if (String(n) === raw.value.trim() && short === String(n)) return ''
  if (short === full) return full
  return `${short} · ${full}`
})

const invalid = computed(() => raw.value.trim() !== '' && parsed.value == null)

function onInput(e) {
  raw.value = e.target.value
  const n = parseCoinInput(raw.value)
  emit('update:modelValue', n)
}
</script>

<template>
  <div class="coin-input">
    <InputText
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :value="raw"
      @input="onInput"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :class="{ bad: invalid }" />
    <div class="preview" :class="{ bad: invalid }" v-if="preview">{{ preview }}</div>
  </div>
</template>

<style scoped>
.coin-input { display: flex; flex-direction: column; gap: 2px; }
.coin-input input { width: 100%; }
.coin-input input.bad { border-color: #c33; }
.preview { font-size: 12px; color: var(--muted); padding-left: 4px; }
.preview.bad { color: #c33; }
</style>
