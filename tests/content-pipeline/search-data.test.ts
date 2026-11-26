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
    'exam-schreiben-1',
    'exam-sprechen-1',
    'phrases-greeting',
  ])
})

test('a writing or speaking node is found by the words of its task, which are German in every language', async () => {
  const { bundle } = await compileContent(fixtureContent)

  const passages = (language: 'en' | 'fa') =>
    bundle?.search[language].entries.find((entry) => entry.node === 'exam-sprechen-1')?.passages
  expect(passages('en')).toEqual([
    [{ de: 'Ihr Kurs macht am Ende ein Fixture-Fest. Sie organisieren das Fest zu zweit.' }],
    [{ de: 'Wann und wo feiern?' }],
    [{ de: 'Was essen und trinken?' }],
    [{ de: 'Wer bringt was mit?' }],
    [{ de: 'Welches Programm?' }],
  ])
  expect(passages('fa')).toEqual(passages('en'))
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
