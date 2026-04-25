<script setup>
defineProps({
  text: { type: String, required: true },
  finger: { type: String, default: '👇' },
  position: { type: String, default: 'top' }
})
</script>

<template>
  <div class="tutorial-bubble" :class="['pos-' + position]">
    <div class="tb-bunny">🐰</div>
    <div class="tb-speech">{{ text }}</div>
    <div class="tb-finger">{{ finger }}</div>
  </div>
</template>

<style scoped>
.tutorial-bubble {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  user-select: none;
  animation: tb-bob 1.4s ease-in-out infinite;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.4));
  z-index: 800;
}

.tb-bunny {
  font-size: 38px;
  line-height: 1;
}

.tb-speech {
  background: linear-gradient(135deg, #fff7d6, #ffe79a);
  color: #2a1d05;
  font-weight: 700;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 2px solid #ffb84d;
  max-width: 220px;
  text-align: center;
  position: relative;
  line-height: 1.25;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.tb-speech::before {
  content: "";
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 12px;
  height: 12px;
  background: linear-gradient(135deg, #fff7d6, #fff7d6);
  border-left: 2px solid #ffb84d;
  border-top: 2px solid #ffb84d;
}

.tb-finger {
  font-size: 30px;
  line-height: 1;
  animation: tb-point 0.9s ease-in-out infinite;
}

.pos-up .tb-finger {
  transform: rotate(180deg);
}

@keyframes tb-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes tb-point {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}

.pos-up .tb-finger {
  animation: tb-point-up 0.9s ease-in-out infinite;
}

@keyframes tb-point-up {
  0%, 100% { transform: rotate(180deg) translateY(0); }
  50% { transform: rotate(180deg) translateY(6px); }
}
</style>
