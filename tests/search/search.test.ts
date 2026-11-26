import { expect, test } from 'vitest'
import type { Language } from '../../src/content-model/index.ts'
import { prepareSearch } from '../../src/search/index.ts'
import { data, nodes } from './catalogue.ts'

const search = (query: string, language: Language = 'en') => prepareSearch(nodes, data[language], language)(query)

/** The ids of the nodes found, in the order of the results. */
const found = (query: string, language: Language = 'en') => search(query, language).map((result) => result.node.id)

test('a word of a title finds its node', () => {
  expect(found('questions')).toEqual(['grammar-003'])
})

test('capitals make no difference', () => {
  expect(found('QUESTIONS')).toEqual(['grammar-003'])
  expect(found('modal Verbs')).toEqual(['grammar-004'])
})

test('a word of the content finds its node, and the result shows the passage it was found in', () => {
  expect(search('irregular')).toEqual([
    { node: nodes[1], passage: [{ de: 'sein' }, ' is irregular. It is the first verb to learn.'] },
  ])
})

test('a result found by its title shows no passage', () => {
  expect(search('questions')).toEqual([{ node: nodes[2], passage: null }])
})

test('every word of the query must be found, each anywhere in the node', () => {
  // grammar-001 has "present" in its title and "wohnst" in its table; grammar-003 has both in its content.
  expect(found('present wohnst')).toEqual(['grammar-001', 'grammar-003'])
  expect(found('present müde')).toEqual([])
})

test('the passage shown is the one that holds the most words of the query', () => {
  expect(search('goethe live').map((result) => result.passage)).toEqual([
    [{ de: 'Ich wohne in der Goethestraße.' }, ' – I live in Goethe Street.'],
  ])
})

test('nodes found by their title come before nodes found by their content, each group in curriculum order', () => {
  expect(found('verb')).toEqual(['grammar-002', 'grammar-004', 'grammar-001', 'grammar-003'])
})

test('a topic that is not written yet is found by its title', () => {
  const results = search('modal')

  expect(results.map((result) => [result.node.id, result.node.status])).toEqual([['grammar-004', 'coming-soon']])
})

test('the German title finds a node in every language, and the result shows it as German', () => {
  expect(search('Modalverben', 'en')).toEqual([{ node: nodes[3], passage: [{ de: 'Modalverben: können, müssen' }] }])
  expect(search('Präsens', 'fa')).toEqual([{ node: nodes[0], passage: [{ de: 'Präsens' }] }])
  // In German it is the title the learner sees.
  expect(search('Präsens', 'de')).toEqual([{ node: nodes[0], passage: null }])
})

test('a query without a letter or a number finds nothing', () => {
  expect(found('')).toEqual([])
  expect(found('  ?! ')).toEqual([])
})

test('German typed on a keyboard without umlauts is found: ae, oe, ue and ss, or the bare vowel', () => {
  for (const typed of ['müde', 'muede', 'mude', 'MÜDE', 'Muede']) {
    expect(found(typed), typed).toEqual(['grammar-002'])
  }
  for (const typed of ['Goethestraße', 'goethestrasse', 'GOETHESTRASSE']) {
    expect(found(typed), typed).toEqual(['grammar-001'])
  }
  for (const typed of ['koennen', 'konnen', 'können', 'muessen', 'mussen']) {
    expect(found(typed), typed).toEqual(['grammar-004'])
  }
  for (const typed of ['praesens', 'prasens']) {
    expect(found(typed, 'de'), typed).toEqual(['grammar-001'])
  }
})

test('a word that really has ae, oe or ue is still found as it is written', () => {
  // "Goethe" has an "oe" that is no umlaut, "question" a "ue".
  expect(found('goethe')).toEqual(['grammar-001'])
  expect(found('question word')).toEqual(['grammar-003'])
})

/** The zero-width non-joiner: it ends a letter's join without a space, as in «می‌کنم». */
const ZWNJ = '\u200C'

/** The same Persian text as an Arabic keyboard writes it: with the Arabic forms of ی and ک. */
const fromArabicKeyboard = (text: string) => text.replaceAll('\u06CC', '\u064A').replaceAll('\u06A9', '\u0643')

test('Persian typed with the Arabic forms of ی and ک is found', () => {
  const typed = fromArabicKeyboard('فعل‌های کمکی')
  expect(typed).not.toBe('فعل‌های کمکی')

  expect(found(typed, 'fa')).toEqual(['grammar-004'])
  expect(found(fromArabicKeyboard('خیابان'), 'fa')).toEqual(['grammar-001'])
})

test('Persian is found with the zero-width non-joiner, with a space in its place, and with neither', () => {
  for (const typed of [`می${ZWNJ}کنم`, 'می کنم', 'میکنم']) {
    expect(found(typed, 'fa'), typed).toEqual(['grammar-001'])
  }
  for (const typed of [`فعل${ZWNJ}های کمکی`, 'فعل های کمکی', 'فعلهای کمکی']) {
    expect(found(typed, 'fa'), typed).toEqual(['grammar-004'])
  }
})

test('Persian is found without the small signs that a keyboard often leaves out', () => {
  // «کلمهٔ» without its hamza, and written with the single letter ۀ.
  expect(found('کلمه پرسشی', 'fa')).toEqual(['grammar-003'])
  expect(found('کلم\u06C0 پرسشی', 'fa')).toEqual(['grammar-003'])
  // «آب» without the sign on its first letter.
  expect(found('اب کجاست', 'fa')).toEqual(['grammar-002'])
})

test('a Persian result shows its passage with the German marked as German', () => {
  expect(search('خیابان گوته', 'fa')).toEqual([
    { node: nodes[0], passage: [{ de: 'Ich wohne in der Goethestraße.' }, ' – من در خیابان گوته زندگی می‌کنم.'] },
  ])
})
