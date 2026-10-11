<script setup>
import LegalDocument from '../components/LegalDocument.vue'
import { TERMS } from '../legalTexts'
</script>

<template>
  <LegalDocument :doc="TERMS" />
</template>
