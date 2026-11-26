import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { hasPool } from '../../src/content-model/scoring.ts'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { blindPool, type ReviewSheet, recordReview } from '../../src/content-pipeline/review.ts'
import { changeNode, fixtureContent, fixtureContentWith, VOCABULARY, withoutReviewRecord } from './fixture.ts'

const NODE = 'vocabulary-fixture-home'
const BY = { reviewer: 'Second fixture reviewer', date: '2026-02-03' }

/**
 * The words of the fixture node as a careful reviewer knows them: the word as
 * it is learned and what it means in each language. Written out here, not
 * read from the node file.
 */
const WORDS: Record<string, { german: string; en: string; fa: string; de: string }> = {
  tisch: { german: 'der Tisch', en: 'table', fa: 'میز', de: 'ein Möbelstück mit einer Platte und vier Beinen' },
  lampe: { german: 'die Lampe', en: 'lamp', fa: 'چراغ', de: 'ein Gerät, das Licht macht' },
  bett: { german: 'das Bett', en: 'bed', fa: 'تخت', de: 'ein Möbelstück, in dem man schläft' },
  stuhl: { german: 'der Stuhl', en: 'chair', fa: 'صندلی', de: 'ein Möbelstück, auf dem eine Person sitzt' },
  tuer: {
    german: 'die Tür',
    en: 'door',
    fa: 'در',
    de: 'der Eingang in ein Zimmer, den man öffnen und schließen kann',
  },
  fenster: {
    german: 'das Fenster',
    en: 'window',
    fa: 'پنجره',
    de: 'eine Öffnung mit Glas in der Wand, durch die Licht kommt',
  },
  kueche: { german: 'die Küche', en: 'kitchen', fa: 'آشپزخانه', de: 'das Zimmer, in dem man das Essen macht' },
  moebel: {
    german: 'die Möbel',
    en: 'furniture',
    fa: 'مبلمان',
    de: 'alle großen Sachen in einer Wohnung, auf denen man sitzt, schläft oder isst',
  },
  schlafen: {
    german: 'schlafen',
    en: 'to sleep',
    fa: 'خوابیدن',
    de: 'in der Nacht im Bett liegen und die Augen zu haben',
  },
  gross: { german: 'groß', en: 'big', fa: 'بزرگ', de: 'nicht klein' },
}

let compiled: ReturnType<typeof compileContent> | undefined

/** The id of the question about `word` in one direction, as the compiled pool names it. */
async function idOf(word: string, direction: 'meaning' | 'word'): Promise<string> {
  compiled ??= compileContent(fixtureContent)
  const { bundle } = await compiled
  const content = bundle?.nodes.find((node) => node.id === NODE)?.content
  if (!content || !hasPool(content)) throw new Error(`${NODE} has no pool`)
  const type = direction === 'meaning' ? 'meaning-of-word' : 'word-for-meaning'
  const question = content?.questions.find((one) => one.type === type && 'word' in one && one.word === word)
  if (!question) throw new Error(`the pool has no ${type} question about ${word}`)
  return question.id
}

/** The headword of each entry of WORDS. */
const HEADWORD: Record<string, string> = {
  tisch: 'Tisch',
  lampe: 'Lampe',
  bett: 'Bett',
  stuhl: 'Stuhl',
  tuer: 'Tür',
  fenster: 'Fenster',
  kueche: 'Küche',
  moebel: 'Möbel',
  schlafen: 'schlafen',
  gross: 'groß',
}

/** The sheet id of the question about a word, in a direction and a language: "tisch", "word", "fa". */
async function item(word: string, direction: 'meaning' | 'word', language: 'en' | 'fa' | 'de'): Promise<string> {
  return `${await idOf(HEADWORD[word] ?? word, direction)}-${language}`
}

/** What that reviewer answers: the meaning in the language asked in, and the word as it is learned. */
async function rightAnswers(): Promise<Record<string, string>> {
  const answers: Record<string, string> = {}
  for (const [id, word] of Object.entries(WORDS)) {
    for (const language of ['en', 'fa', 'de'] as const) {
      answers[await item(id, 'meaning', language)] = word[language]
      answers[await item(id, 'word', language)] = word.german
    }
  }
  return answers
}

test('the review sheet of a vocabulary node asks every question once in each language, as a learner of that language meets it', async () => {
  const sheet = await blindPool(fixtureContent, NODE)
  const RIGHT = await rightAnswers()

  expect(sheet.questions.map((entry) => entry.id).sort()).toEqual(Object.keys(RIGHT).sort())
  const ids = {
    meaningEn: await item('tisch', 'meaning', 'en'),
    meaningFa: await item('tisch', 'meaning', 'fa'),
    meaningDe: await item('tisch', 'meaning', 'de'),
    wordEn: await item('tisch', 'word', 'en'),
    wordFa: await item('tisch', 'word', 'fa'),
    wordDe: await item('tisch', 'word', 'de'),
  }
  const entry = (id: string) => sheet.questions.find((one) => one.id === id)

  expect(entry(ids.meaningEn)).toEqual({
    id: ids.meaningEn,
    language: 'en',
    instruction: 'What does this word mean?',
    question: { type: 'meaning-of-word', prompt: 'der Tisch', options: expect.arrayContaining(['table']) },
    answerFormat: expect.any(String),
    answer: null,
    objection: null,
  })
  expect(entry(ids.meaningFa)).toMatchObject({
    language: 'fa',
    instruction: 'این واژه چه معنایی دارد؟',
    question: { type: 'meaning-of-word', prompt: 'der Tisch', options: expect.arrayContaining(['میز']) },
  })
  expect(entry(ids.meaningDe)?.question.options).toContain('ein Möbelstück mit einer Platte und vier Beinen')
  for (const id of [ids.meaningEn, ids.meaningFa, ids.meaningDe]) {
    expect(entry(id)?.question.options).toHaveLength(4)
  }

  expect(entry(ids.wordEn)).toEqual({
    id: ids.wordEn,
    language: 'en',
    instruction: 'Type the German word. A noun needs its article.',
    question: { type: 'word-for-meaning', prompt: 'table' },
    answerFormat: expect.any(String),
    answer: null,
    objection: null,
  })
  expect(entry(ids.wordFa)?.question).toEqual({ type: 'word-for-meaning', prompt: 'میز' })
  expect(entry(ids.wordDe)).toMatchObject({
    instruction: 'Welches Wort ist das? Schreib es. Ein Nomen braucht seinen Artikel.',
    question: { type: 'word-for-meaning', prompt: 'ein Möbelstück mit einer Platte und vier Beinen' },
  })
})

test('the sheet gives no answer away: no key, no example sentence, and no German word where it is asked for', async () => {
  const sheet = await blindPool(fixtureContent, NODE)

  for (const entry of sheet.questions) {
    const shown = entry.question.type === 'meaning-of-word' ? ['options', 'prompt', 'type'] : ['prompt', 'type']
    expect(Object.keys(entry.question).sort()).toEqual(shown)
  }
  const askedFor = sheet.questions.filter((entry) => entry.question.type === 'word-for-meaning')
  expect(JSON.stringify(askedFor)).not.toMatch(/Tisch|Lampe|Küche|schlafen/)
  expect(JSON.stringify(sheet)).not.toContain('Das Essen steht auf dem Tisch.')
})

test('a review with no disagreement is recorded, and the vocabulary node can then be published', async () => {
  const content = await unreviewedFixture()
  expect((await compileContent(content)).report.errors).toEqual([
    { file: VOCABULARY, node: NODE, where: 'review', message: expect.stringContaining('needs a review record') },
  ])
  const sheet = answered(await blindPool(content, NODE), await rightAnswers())

  const result = await recordReview(content, NODE, [sheet], BY)

  expect(result.disagreements).toEqual([])
  expect(result.record).toMatchObject(BY)
  expect(await readFile(path.join(content, VOCABULARY), 'utf8')).toContain('reviewer: Second fixture reviewer')
  expect((await compileContent(content)).report).toMatchObject({ ok: true, errors: [] })
})

test('a reviewer who types a noun without its article, or picks another meaning, disagrees with the key', async () => {
  const content = await unreviewedFixture()
  const tischWordEn = await item('tisch', 'word', 'en')
  const lampeMeaningFa = await item('lampe', 'meaning', 'fa')
  const sheet = answered(await blindPool(content, NODE), {
    ...(await rightAnswers()),
    [tischWordEn]: 'Tisch',
    [lampeMeaningFa]: 'میز',
  })

  const result = await recordReview(content, NODE, [sheet], BY)

  expect(result.record).toBeNull()
  expect(result.disagreements).toHaveLength(2)
  expect(result.disagreements).toEqual(
    expect.arrayContaining([
      { question: lampeMeaningFa, problem: 'the reviewer answered "میز", the key says "چراغ"' },
      { question: tischWordEn, problem: 'the reviewer answered "Tisch", the key says ["der Tisch"]' },
    ]),
  )
})

test('a reviewer who knows another right word shows that the word must accept it', async () => {
  const content = await unreviewedFixture()
  const lampeWordEn = await item('lampe', 'word', 'en')
  const sheet = answered(await blindPool(content, NODE), {
    ...(await rightAnswers()),
    [lampeWordEn]: ['die Lampe', 'die Leuchte'],
  })

  const open = await recordReview(content, NODE, [sheet], BY)
  expect(open.disagreements).toEqual([
    {
      question: lampeWordEn,
      problem: 'the reviewer answered ["die Lampe","die Leuchte"], the key says ["die Lampe"]',
    },
  ])

  const accepting = await fixtureContentWith({
    [VOCABULARY]: changeNode((node) => {
      delete node.review
      node.words[1].alsoAccepted = ['die Leuchte']
    }),
  })
  const settled = await recordReview(accepting, NODE, [sheet], BY)

  expect(settled.disagreements).toEqual([])
  expect((await compileContent(accepting)).report.ok).toBe(true)
})

test('a word, an article or a meaning in any language that changes after the review calls for a new review', async () => {
  const changes: Array<Parameters<typeof changeNode>[0]> = [
    (node) => {
      node.words[0].article = 'das'
    },
    (node) => {
      node.words[0].meaning.fa = 'میز تحریر'
    },
    (node) => {
      node.words[0].definition = 'ein Möbelstück, an dem man isst'
    },
    (node) => {
      node.words[1].alsoAccepted = ['die Leuchte']
    },
  ]

  for (const change of changes) {
    const content = await fixtureContentWith({ [VOCABULARY]: changeNode(change) })
    const { errors } = (await compileContent(content)).report

    // A changed article also disagrees with the scope list; here only the review counts.
    expect(errors.filter((problem) => problem.where === 'review')).toEqual([
      { file: VOCABULARY, node: NODE, where: 'review', message: expect.stringContaining('needs a new review') },
    ])
  }
})

test('what the test does not ask may change freely: the example sentence, the plural, the level', async () => {
  const content = await fixtureContentWith({
    [VOCABULARY]: changeNode((node) => {
      node.words[0].example = { de: 'Der Tisch ist neu.', en: 'The table is new.', fa: 'میز نو است.' }
      node.words[0].plural = 'Tischen'
      node.words[0].level = 'A2'
    }),
    // The scope list changes with them, as it would when the word lists were read again.
    'vocabulary/scope-list.tsv': (text) => text.replace('Tisch\tnoun\tA1\tder\t-e', 'Tisch\tnoun\tA2\tder\t-en'),
  })

  expect((await compileContent(content)).report.errors).toEqual([])
})

test('a changed word needs a fresh answer for its own questions only', async () => {
  const content = await unreviewedFixture()
  const RIGHT = await rightAnswers()
  const first = answered(await blindPool(content, NODE), RIGHT)
  const changed = await fixtureContentWith({
    [VOCABULARY]: changeNode((node) => {
      delete node.review
      node.words[9].meaning.en = 'large'
    }),
  })

  const open = await recordReview(changed, NODE, [first], BY)
  const again = open.disagreements.map((disagreement) => disagreement.question)

  // The English meaning of "groß" is asked for, offered as its own answer, and offered beside other words.
  const grossMeaningEn = await item('gross', 'meaning', 'en')
  expect(again).toEqual(expect.arrayContaining([grossMeaningEn, await item('gross', 'word', 'en')]))
  expect(again.every((id) => id.endsWith('-en'))).toBe(true)
  expect(again.length).toBeLessThan(10)

  const second = answered(await blindPool(changed, NODE, again), { ...RIGHT, [grossMeaningEn]: 'large' })
  const settled = await recordReview(changed, NODE, [first, second], BY)

  expect(settled.disagreements).toEqual([])
})

test('a vocabulary node whose words are not all written has nothing to review yet', async () => {
  await expect(blindPool(fixtureContent, 'vocabulary-fixture-family')).rejects.toThrow(
    'Node vocabulary-fixture-family has no questions to review.',
  )
})

/** The fixture content as it is before the review of its vocabulary node. */
function unreviewedFixture(): Promise<string> {
  return fixtureContentWith({ [VOCABULARY]: withoutReviewRecord })
}

/** The sheet as a reviewer hands it back. */
function answered(sheet: ReviewSheet, answers: Record<string, unknown>) {
  return {
    ...sheet,
    questions: sheet.questions.map((entry) => ({ ...entry, answer: answers[entry.id] ?? null })),
  }
}
