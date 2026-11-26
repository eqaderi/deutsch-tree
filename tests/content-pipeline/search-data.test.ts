import { expect, test } from 'vitest'
import { bundleFiles, compileContent } from '../../src/content-pipeline/index.ts'
import { fixtureContent } from './fixture.ts'

test('the search data of a language holds what a published node says, in that language and in German', async () => {
  const { bundle } = await compileContent(fixtureContent)

  expect(bundle?.search.en.entries[0]).toEqual({
    node: 'grammar-001',
    passages: [
      ['A fixture verb takes the ending of its person. With ', { de: 'ich' }, ' the ending is ', { de: '-e' }, '.'],
      [{ de: 'ich · wohne' }],
      [{ de: 'du · wohnst' }],
      [{ de: 'Ich wohne in Berlin.' }, ' – I live in Berlin.'],
      [{ de: 'Wohnst du hier?' }, ' – Do you live here?'],
      [{ de: 'Du wohnst hier.' }, ' – With ', { de: 'du' }, ' the ending is ', { de: '-st' }, '.'],
    ],
  })
  expect(bundle?.search.fa.entries[0]?.passages[3]).toEqual([
    { de: 'Ich wohne in Berlin.' },
    ' – من در برلین زندگی می‌کنم.',
  ])
})

test('a node that is coming soon has no search data: the index has its title', async () => {
  const { bundle } = await compileContent(fixtureContent)

  // grammar-002 and grammar-201 are coming soon.
  expect(bundle?.search.en.entries.map((entry) => entry.node)).toEqual([
    'grammar-001',
    'grammar-010',
    'grammar-101',
    'grammar-102',
    'grammar-103',
    'exam-lesen-1',
  ])
})

test('the search data of an exam part holds what its page explains, and nothing of its practice tasks', async () => {
  const { bundle } = await compileContent(fixtureContent)

  expect(bundle?.search.en.entries.find((entry) => entry.node === 'exam-lesen-1')?.passages).toEqual([
    [
      'You read one fixture text and decide whether six statements about it are right. The answer sheet says ',
      { de: 'Richtig' },
      ' or ',
      { de: 'Falsch' },
      '.',
    ],
    ['Each right answer is one fixture point.'],
    ['Read the six statements first.'],
    ['Then look for each statement in the text.'],
  ])
  expect(bundle?.search.de.entries.find((entry) => entry.node === 'exam-lesen-1')?.passages[1]).toEqual([
    'Jede richtige Antwort ist ein Test-Punkt.',
  ])
  // A search must not show a task's text before it is taken, nor an item or the reason that answers it.
  const text = JSON.stringify(bundle?.search)
  expect(text).not.toContain('Neu in Bonn')
  expect(text).not.toContain('ich wohne seit Mai')
  expect(text).not.toContain('Toms Wohnung ist groß.')
  expect(text).not.toContain('klein, aber hell')
})

test('in simple German an example needs no translation', async () => {
  const { bundle } = await compileContent(fixtureContent)

  expect(bundle?.search.de.entries[0]?.passages.slice(3, 5)).toEqual([
    [{ de: 'Ich wohne in Berlin.' }],
    [{ de: 'Wohnst du hier?' }],
  ])
})

test('the search data leaves out the questions with their answers, and wrong German', async () => {
  const { bundle } = await compileContent(fixtureContent)

  const text = JSON.stringify(bundle?.search)
  expect(text).not.toContain('___')
  expect(text).not.toContain('Du wohne hier.')
})

test('the search data is one file per language, and none of it is in the file the tree loads', async () => {
  const { bundle } = await compileContent(fixtureContent)
  if (!bundle) throw new Error('the fixture content must compile')

  const files = new Map(bundleFiles(bundle).map((file) => [file.path, file.json]))

  expect([...files.keys()].filter((file) => file.startsWith('search/'))).toEqual([
    'search/en.json',
    'search/fa.json',
    'search/de.json',
  ])
  expect(JSON.parse(files.get('search/fa.json') ?? '')).toEqual(bundle.search.fa)
  expect(files.get('index.json')).not.toContain('takes the ending')
})
