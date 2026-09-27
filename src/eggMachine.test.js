import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { setLocale, t } from './i18n.js'

const source = () => readFile(new URL('./components/EggMachine.vue', import.meta.url), 'utf8')

test('Eier-Maschine nutzt das Maschinen-Layout von Crafter & Fusion', async () => {
  const src = await source()
  for (const cls of ['fusion-toggle', 'fusion-preview', 'craft-job', 'fusion-machine', 'fm-slot', 'fm-core', 'fm-species-grid', 'fm-sp-btn']) {
    assert.ok(src.includes(`class="${cls}`) || src.includes(`class="btn ${cls}`) || src.includes(`"${cls}"`), cls)
  }
  // Countdown läuft auf Serverzeit, nicht auf der lokalen Uhr.
  assert.match(src, /game\.serverOffset/)
})

test('Eier-Maschine sitzt direkt unter der Fusions-Maschine', async () => {
  const view = await readFile(new URL('./views/GameView.vue', import.meta.url), 'utf8')
  const fusion = view.indexOf('class="card fusion-card"')
  const egg = view.indexOf('<EggMachine />')
  const events = view.indexOf('class="events-head"')
  assert.ok(fusion > 0 && fusion < egg && egg < events)
})

test('Eier-Maschinen-Texte gibt es in allen Sprachen', () => {
  const keys = ['machineTitle', 'toggleOpen', 'toggleClose', 'hint', 'slotEgg', 'slotResult', 'yourEggs', 'mystery', 'minutes', 'empty', 'noEggs', 'pickEgg', 'startIncubation', 'readyIn', 'ready', 'claim', 'slotBusy']
  for (const locale of ['de', 'en', 'ru']) {
    setLocale(locale)
    for (const k of keys) assert.notEqual(t(`eggs.${k}`), `eggs.${k}`, `${locale}: eggs.${k}`)
    assert.ok(t('eggs.minutes', { minutes: 60 }).includes('60'))
  }
  setLocale('de')
})
