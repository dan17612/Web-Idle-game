// Hält die PWA-Icons konsistent: Jede Datei, auf die Manifest, index.html und
// der Service Worker verweisen, muss in public/ liegen und die angegebene
// Größe haben. Schützt beim saisonalen Icon-Wechsel (z. B. Halloween) vor
// kaputten Pfaden — ein fehlendes Icon fällt sonst erst auf dem Handy auf.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url))
const publicPath = (src) => `public${src}`

function pngInfo(buf) {
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', 'keine PNG-Datei')
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

test('Manifest-Icons existieren und haben die angegebene Größe', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest').toString('utf8'))
  assert.ok(manifest.icons.length >= 3)
  for (const icon of manifest.icons) {
    const file = publicPath(icon.src)
    assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${file} fehlt`)
    const { width, height } = pngInfo(read(file))
    assert.equal(`${width}x${height}`, icon.sizes, icon.src)
  }
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'), 'kein maskable-Icon')
})

test('index.html verlinkt nur vorhandene Icons', () => {
  const html = read('index.html').toString('utf8')
  const links = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map((m) => m[1])
  assert.ok(links.length >= 2)
  for (const href of links) {
    assert.ok(existsSync(new URL(`../${publicPath(href)}`, import.meta.url)), `${href} fehlt`)
  }
  const apple = html.match(/<link rel="apple-touch-icon" href="([^"]+)"/)[1]
  assert.equal(pngInfo(read(publicPath(apple))).width, 180)
})

test('Service Worker cacht nur vorhandene Shell-Dateien', () => {
  const sw = read('public/sw.js').toString('utf8')
  const shell = JSON.parse(sw.match(/const APP_SHELL = (\[[^\]]*\])/)[1].replace(/'/g, '"'))
  for (const src of shell) {
    if (src === '/' || src === '/index.html') continue
    assert.ok(existsSync(new URL(`../${publicPath(src)}`, import.meta.url)), `${src} fehlt`)
  }
  // Manifest und Icons müssen auch im Shell-Cache landen, auf die verlinkt wird.
  const manifest = JSON.parse(read('public/manifest.webmanifest').toString('utf8'))
  assert.ok(shell.includes(manifest.icons[0].src), 'Manifest-Icon nicht im Shell-Cache')
})
