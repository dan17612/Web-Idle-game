<script setup>
// Schwebende Halloween-Deko über der ganzen App (nur in der Saison, siehe
// src/composables/useHalloween.js). Reine Kosmetik: pointer-events: none,
// nur transform/opacity-Animationen, bei reduzierter Bewegung steht alles.
import { DECOR_ITEMS } from '../halloween'

const flying = DECOR_ITEMS.filter((item) => item.mode === 'fly')
const falling = DECOR_ITEMS.filter((item) => item.mode === 'fall')
const sides = DECOR_ITEMS.filter((item) => item.mode === 'side')

function sideStyle(item) {
  return {
    [item.side]: item.x + 'vw',
    bottom: item.bottom + 'px',
    fontSize: item.size + 'px'
  }
}
</script>

<template>
  <!-- Fliegt über dem Inhalt, aber unter Kopf- und Navigationsleiste. -->
  <div class="hw-sky" aria-hidden="true">
    <span
      v-for="(item, i) in flying"
      :key="'f' + i"
      class="hw-fly"
      :class="[item.kind, { reverse: item.reverse }]"
      :style="{ top: item.top + '%', animationDuration: item.dur + 's', animationDelay: item.delay + 's' }"
    ><span class="hw-flap" :style="{ fontSize: item.size + 'px' }">{{ item.e }}</span></span>
    <span
      v-for="(item, i) in falling"
      :key="'l' + i"
      class="hw-fall"
      :style="{ left: item.left + '%', animationDuration: item.dur + 's', animationDelay: item.delay + 's' }"
    ><span class="hw-sway" :style="{ fontSize: item.size + 'px' }">{{ item.e }}</span></span>
  </div>

  <!-- Nur auf breiten Bildschirmen (ab 1000 px sind die Seitenränder frei): Kürbisse. -->
  <div class="hw-ground" aria-hidden="true">
    <span
      v-for="(item, i) in sides"
      :key="'s' + i"
      class="hw-side"
      :class="item.kind"
      :style="sideStyle(item)"
    >{{ item.e }}</span>
  </div>

  <!-- Spinnweben in den Ecken. -->
  <svg class="hw-web tl" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M0 0 L100 22 M0 0 L78 78 M0 0 L22 100 M0 0 L52 92 M0 0 L92 52" />
    <path d="M24 5 Q20 20 5 24 M44 10 Q36 36 10 44 M66 15 Q52 52 15 66 M86 19 Q68 68 19 86" />
  </svg>
  <svg class="hw-web tr" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M0 0 L100 22 M0 0 L78 78 M0 0 L22 100 M0 0 L52 92 M0 0 L92 52" />
    <path d="M24 5 Q20 20 5 24 M44 10 Q36 36 10 44 M66 15 Q52 52 15 66 M86 19 Q68 68 19 86" />
  </svg>
</template>

<style scoped>
.hw-sky { position: fixed; inset: 0; z-index: 9; pointer-events: none; overflow: hidden; }

.hw-fly { position: absolute; left: 0; will-change: transform;
  animation-name: hwFly; animation-timing-function: linear; animation-iteration-count: infinite;
  transform: translateX(-14vw); }
.hw-fly.reverse { animation-name: hwFlyBack; transform: translateX(114vw); }
/* Überflug in der ersten Hälfte, danach Pause außerhalb des Bildes. */
@keyframes hwFly {
  0% { transform: translateX(-14vw); }
  45%, 100% { transform: translateX(114vw); } }
@keyframes hwFlyBack {
  0% { transform: translateX(114vw); }
  45%, 100% { transform: translateX(-14vw); } }
.hw-flap { display: inline-block; filter: drop-shadow(0 3px 4px rgba(40, 10, 60, 0.35));
  animation: hwFlap 0.42s ease-in-out infinite alternate; }
.bat .hw-flap { opacity: 0.92; }
.ghost .hw-flap { opacity: 0.8; animation: hwFloat 2.6s ease-in-out infinite alternate; }
@keyframes hwFlap { from { transform: translateY(-5px) scaleY(1); } to { transform: translateY(5px) scaleY(0.82); } }
@keyframes hwFloat { from { transform: translateY(-14px) rotate(-6deg); } to { transform: translateY(14px) rotate(6deg); } }

.hw-fall { position: absolute; top: 0; will-change: transform;
  animation-name: hwFall; animation-timing-function: linear; animation-iteration-count: infinite;
  transform: translateY(-8vh); }
@keyframes hwFall {
  0% { transform: translateY(-8vh); }
  55%, 100% { transform: translateY(108vh); } }
.hw-sway { display: inline-block; opacity: 0.85; animation: hwSway 3.2s ease-in-out infinite alternate; }
@keyframes hwSway { from { transform: translateX(-18px) rotate(-30deg); } to { transform: translateX(18px) rotate(40deg); } }

.hw-ground { display: none; }
@media (min-width: 1000px) {
  .hw-ground { display: block; position: fixed; inset: 0; z-index: 0; pointer-events: none; }
  .hw-side { position: absolute; line-height: 1; filter: drop-shadow(0 6px 10px rgba(80, 30, 0, 0.3)); }
  .hw-side.pumpkin { filter: drop-shadow(0 0 14px rgba(255, 150, 40, 0.65)); animation: hwGlow 3.4s ease-in-out infinite alternate; }
  .hw-side.skull { opacity: 0.85; }
}
@keyframes hwGlow { from { filter: drop-shadow(0 0 8px rgba(255, 150, 40, 0.45)); } to { filter: drop-shadow(0 0 18px rgba(255, 150, 40, 0.85)); } }

.hw-web { position: fixed; z-index: 11; pointer-events: none; width: 64px; height: 64px;
  top: var(--safe-top); opacity: 0.5; }
.hw-web path { fill: none; stroke: var(--muted); stroke-width: 1.4; vector-effect: non-scaling-stroke; }
.hw-web.tl { left: 0; }
.hw-web.tr { right: 0; transform: scaleX(-1); display: none; }
@media (min-width: 760px) {
  .hw-web { width: 110px; height: 110px; }
  .hw-web.tr { display: block; }
}

@media (prefers-reduced-motion: reduce) {
  .hw-sky { display: none; }
  .hw-side.pumpkin { animation: none; }
}
</style>
