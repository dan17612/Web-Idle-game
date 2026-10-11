<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { locale } from '../i18n'
import { operatorField } from '../legal'
import { useAuthStore } from '../stores/auth'
import { useGameStore } from '../stores/game'

// Rendert Nutzungsbedingungen oder Datenschutzerklärung aus src/legalTexts.js.
// Fehlt eine Übersetzung, wird die maßgebliche deutsche Fassung gezeigt.
const props = defineProps({
  doc: { type: Object, required: true }
})

const I18N = {
  de: { back: 'Zurück zur Zustimmung', fallback: '' },
  en: { back: 'Back to consent', fallback: 'This text is only available in German.' },
  ru: { back: 'Назад к согласию', fallback: 'Этот текст доступен только на немецком языке.' }
}
function tx(key) {
  return (I18N[locale.value] || I18N.en)[key] ?? I18N.en[key]
}

const router = useRouter()
const auth = useAuthStore()
const game = useGameStore()

const translated = computed(() => Boolean(props.doc[locale.value]))
const text = computed(() => props.doc[locale.value] || props.doc.de)
const pendingConsent = computed(() => auth.isAuth && Boolean(game.legalStatus?.needsAcceptance))

function fill(s) {
  return String(s ?? '')
    .replace(/\{operatorName\}/g, operatorField('name'))
    .replace(/\{operatorAddress\}/g, operatorField('address'))
    .replace(/\{operatorEmail\}/g, operatorField('email'))
}

function backToConsent() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'game' })
}
</script>

<template>
  <div class="stack legal-doc">
    <h1 class="title">{{ text.title }}</h1>

    <section class="card stack">
      <p v-if="!translated && tx('fallback')" class="hint">{{ tx('fallback') }}</p>
      <p>{{ fill(text.intro) }}</p>
      <p class="hint">{{ text.updated }}</p>
    </section>

    <section v-for="section in text.sections" :key="section.title" class="card stack">
      <h2 class="section-title">{{ section.title }}</h2>
      <p v-for="paragraph in section.paragraphs || []" :key="paragraph">{{ fill(paragraph) }}</p>
      <ul v-if="section.bullets?.length" class="legal-list">
        <li v-for="item in section.bullets" :key="item">{{ fill(item) }}</li>
      </ul>
      <p v-for="paragraph in section.after || []" :key="paragraph">{{ fill(paragraph) }}</p>
    </section>

    <div v-if="pendingConsent" class="legal-back">
      <Button type="button" class="btn full" @click="backToConsent">{{ tx('back') }}</Button>
    </div>
  </div>
</template>

<style scoped>
.legal-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}
.section-title {
  margin: 0;
  font-size: 16px;
}
.legal-back {
  position: sticky;
  bottom: calc(12px + var(--safe-bot));
  z-index: 5;
}
</style>
