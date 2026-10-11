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
    const count = (lang) => allStrings(doc[lang]).join(' ').match(/\{operator(Name|Address|Email)\}/g)?.length || 0
    for (const lang of LANGS) assert.equal(count(lang), count('de'), `${name}.${lang}`)
  })

  test(`${name}: German uses real umlauts and no em dashes`, () => {
    const text = allStrings(doc.de).join(' ')
    assert.doesNotMatch(text, /—/)
    assert.doesNotMatch(text, /\b(fuer|ueber|koennen|Aenderung|Loeschung|Datenschutzerklaerung)\b/)
  })
}

test('terms forbid macros, second accounts and real-money trading', () => {
  const text = allStrings(TERMS.de).join(' ')
  assert.match(text, /Makros, Autoklicker, Bots/)
  assert.match(text, /Pro Person ist ein Konto erlaubt/)
  assert.match(text, /gegen echtes Geld/)
})

test('privacy names every external service the app talks to', () => {
  const text = allStrings(PRIVACY.de).join(' ')
  for (const svc of ['Supabase', 'Vercel', 'Resend', 'Google Fonts', 'Cloudflare']) {
    assert.match(text, new RegExp(svc), svc)
  }
})
