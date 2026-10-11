import test from 'node:test'
import assert from 'node:assert/strict'
import { PRIVACY, TERMS } from './legalTexts.js'

const DOCS = { TERMS, PRIVACY }
const LANGS = ['de', 'en', 'ru']

function allStrings(doc) {
  const out = [doc.title, doc.updated, doc.intro]
  for (const s of doc.sections) {
    out.push(s.title, ...(s.paragraphs || []), ...(s.bullets || []), ...(s.after || []))
  }
  return out
}

for (const [name, doc] of Object.entries(DOCS)) {
  test(`${name}: every language has the same structure as German`, () => {
    for (const lang of LANGS) {
      const d = doc[lang]
      assert.ok(d, `${name}.${lang} missing`)
      assert.equal(d.sections.length, doc.de.sections.length, `${name}.${lang} section count`)
      doc.de.sections.forEach((s, i) => {
        for (const key of ['paragraphs', 'bullets', 'after']) {
          assert.equal((d.sections[i][key] || []).length, (s[key] || []).length, `${name}.${lang} §${i + 1} ${key}`)
        }
      })
    }
  })

  test(`${name}: operator placeholders survive translation`, () => {
    const count = (lang) => allStrings(doc[lang]).join(' ').match(/\{operator(Email)?\}/g)?.length || 0
    for (const lang of LANGS) assert.equal(count(lang), count('de'), `${name}.${lang}`)
  })

  test(`${name}: German uses real umlauts and no em dashes`, () => {
    const text = allStrings(doc.de).join(' ')
    assert.doesNotMatch(text, /—/)
    assert.doesNotMatch(text, /\b(fuer|ueber|koennen|Aenderung|Loeschung|Datenschutzerklaerung)\b/)
  })
}

test('terms ban macros, only tolerate assisting auto clickers', () => {
  const fair = TERMS.de.sections.find((s) => /Fair Play/.test(s.title))
  const text = (fair.bullets || []).join(' ')
  assert.match(text, /Makros, Bots und Skripte sind verboten/)
  assert.match(text, /Autoklicker[^.]*geduldet/)
  assert.match(text, /kein Anspruch/)
})

test('terms allow several accounts, but not at the same time', () => {
  const text = allStrings(TERMS.de).join(' ')
  assert.match(text, /mehrere Konten/)
  assert.match(text, /nur mit einem gleichzeitig/)
  assert.doesNotMatch(text, /Pro Person ist ein Konto erlaubt/)
})

test('terms reserve the operator rights', () => {
  const text = allStrings(TERMS.de).join(' ')
  assert.match(text, /nach unserem Ermessen/)
  assert.match(text, /befristet oder dauerhaft sperren oder löschen/)
  assert.match(text, /Wir dürfen diese Bedingungen ändern/)
  assert.match(text, /Wir dürfen das Spiel jederzeit/)
  assert.match(text, /ersetzen keine Verluste/)
})

test('privacy names every external service the app talks to', () => {
  const text = allStrings(PRIVACY.de).join(' ')
  for (const svc of ['Supabase', 'Vercel', 'Resend', 'Google Fonts', 'Cloudflare']) {
    assert.match(text, new RegExp(svc), svc)
  }
})
