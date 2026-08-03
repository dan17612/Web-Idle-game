<script setup>
import { ref, computed } from 'vue'

// Virtueller Touch-Joystick: Pointer-Capture auf der Basis, normierter
// Vektor {x, y} mit y > 0 = oben. Bei Loslassen springt der Knopf zurück.
const emit = defineEmits(['move'])
const props = defineProps({
  size: { type: Number, default: 124 },
})

const baseRef = ref(null)
const knob = ref({ x: 0, y: 0 })
const active = ref(false)

const maxR = computed(() => props.size / 2 - 18)

function vectorFrom(e) {
  const rect = baseRef.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  let dx = e.clientX - cx
  let dy = e.clientY - cy
  const len = Math.hypot(dx, dy)
  if (len > maxR.value) {
    dx = (dx / len) * maxR.value
    dy = (dy / len) * maxR.value
  }
  return { dx, dy }
}

function update(e) {
  const { dx, dy } = vectorFrom(e)
  knob.value = { x: dx, y: dy }
  emit('move', { x: dx / maxR.value, y: -dy / maxR.value })
}

function onDown(e) {
  active.value = true
  baseRef.value.setPointerCapture?.(e.pointerId)
  update(e)
}

function onMove(e) {
  if (!active.value) return
  update(e)
}

function onUp() {
  active.value = false
  knob.value = { x: 0, y: 0 }
  emit('move', { x: 0, y: 0 })
}
</script>

<template>
  <div
    ref="baseRef"
    class="joy"
    :class="{ active }"
    :style="{ width: size + 'px', height: size + 'px' }"
    @pointerdown.prevent="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
    @lostpointercapture="onUp"
  >
    <div
      class="joy-knob"
      :style="{ transform: `translate(${knob.x}px, ${knob.y}px)` }"
    ></div>
  </div>
</template>

<style scoped>
.joy {
  position: relative;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  border: 3px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 6px 18px rgba(60, 40, 10, 0.25);
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}
.joy.active { background: rgba(255, 255, 255, 0.5); }
.joy-knob {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--accent-soft, #fbd35c), var(--accent, #f4a912));
  border: 3px solid #fff;
  box-shadow: 0 4px 0 var(--accent-deep, #c97f06);
  transition: transform 0.05s linear;
  pointer-events: none;
}
</style>
