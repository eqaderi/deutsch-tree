import { expect, test } from 'vitest'
import { SCOPE_LIST_FILE } from '../../src/content-model/scope-list.ts'
import { bundleFiles, compileContent } from '../../src/content-pipeline/index.ts'
import { changeReviewedNode, fixtureContent, fixtureContentWith, VOCABULARY } from './fixture.ts'

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

test('the caption of a diagram is found by search, after the rule', async () => {
  const { bundle } = await compileContent(fixtureContent)

  const passages = (language: 'en' | 'fa') =>
    bundle?.search[language].entries.find((entry) => entry.node === 'grammar-101')?.passages.slice(1, 3)
  expect(passages('en')).toEqual([['The book lies ', { de: 'auf dem Tisch' }, '.'], [{ de: 'der · Tisch' }]])
  expect(passages('fa')?.[0]).toEqual(['کتاب ', { de: 'auf dem Tisch' }, ' است.'])
})

test('a node that is coming soon has no search data: the index has its title', async () => {
  const { bundle } = await compileContent(fixtureContent)

  // grammar-002 and grammar-201 are coming soon.
  expect(bundle?.search.en.entries.map((entry) => entry.node)).toEqual([
    'grammar-001',
    'grammar-010',
    'vocabulary-fixture-home',
    'grammar-101',
    'grammar-102',
    'grammar-103',
    'exam-lesen-1',
    'exam-schreiben-1',
    'exam-sprechen-1',
    'phrases-greeting',
    'exam-hoeren-3',
  ])
})

test('a vocabulary node is found by each word with its article and what it means in the language of the page', async () => {
  const { bundle } = await compileContent(fixtureContent)

  const passages = (language: 'en' | 'fa' | 'de') =>
    bundle?.search[language].entries.find((entry) => entry.node === 'vocabulary-fixture-home')?.passages
  expect(passages('en')).toHaveLength(11)
  expect(passages('en')?.[0]).toEqual([{ de: 'der Tisch' }, ' – table'])
  expect(passages('fa')?.[0]).toEqual([{ de: 'der Tisch' }, ' – میز'])
  // In simple German the meaning is the German definition.
  expect(passages('de')?.[0]).toEqual([{ de: 'der Tisch – ein Möbelstück mit einer Platte und vier Beinen' }])
  expect(passages('en')?.[8]).toEqual([{ de: 'schlafen' }, ' – to sleep'])
  // The example sentences are left out: they would make the file several times larger.
  expect(JSON.stringify(passages('en'))).not.toContain('Das Essen steht auf dem Tisch.')
})

test('a reflexive verb is found with its "sich", as it is learned', async () => {
  const content = await fixtureContentWith({
    [SCOPE_LIST_FILE]: (text) => `${text}freuen\tverb\tA1\t\t\tsich\n`,
    [VOCABULARY]: changeReviewedNode((node) => {
      node.words.push({
        ...node.words[8],
        word: 'freuen',
        reflexive: 'sich',
        meaning: { en: 'to be glad', fa: 'خوشحال شدن' },
        definition: 'froh sein, zum Beispiel über ein Geschenk',
        example: { de: 'Wir freuen uns.', en: 'We are glad.', fa: 'خوشحالیم.' },
      })
    }),
  })
  // The new word has no audio; that is not what this test is about.
  const { bundle } = await compileContent(content, { requireAudio: false })

  const passages = bundle?.search.en.entries.find((entry) => entry.node === 'vocabulary-fixture-home')?.passages
  expect(passages?.[11]).toEqual([{ de: 'sich freuen' }, ' – to be glad'])
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

test('a writing or speaking node is found by what its page explains, and by the words of its task, which are German in every language', async () => {
  const { bundle } = await compileContent(fixtureContent)

  const passages = (language: 'en' | 'fa') =>
    bundle?.search[language].entries.find((entry) => entry.node === 'exam-sprechen-1')?.passages
  expect(passages('en')?.slice(0, 2)).toEqual([
    ['You plan a fixture party with a partner.'],
    ['Each fixture point counts.'],
  ])
  expect(passages('en')?.slice(-5)).toEqual([
    [{ de: 'Ihr Kurs macht am Ende ein Fixture-Fest. Sie organisieren das Fest zu zweit.' }],
    [{ de: 'Wann und wo feiern?' }],
    [{ de: 'Was essen und trinken?' }],
    [{ de: 'Wer bringt was mit?' }],
    [{ de: 'Welches Programm?' }],
  ])
  expect(passages('fa')?.slice(-5)).toEqual(passages('en')?.slice(-5))
  expect(passages('fa')?.[0]).toEqual(['با یک هم‌گروهی یک جشن آزمایشی برنامه‌ریزی می‌کنید.'])
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
