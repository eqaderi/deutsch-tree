import { expect, test } from 'vitest'
import type { ItemTask, MatchingQuestion, MeaningOfWordQuestion, Question } from '../../src/content-model/index.ts'
import { asAsked, checkAnswer, drawQuestions, taskAsAsked, vocabularyPool } from '../../src/learning-engine/index.ts'
import { gapFill, multipleChoice, richtigFalsch, trueFalse, typedAnswer } from './questions.ts'
import { seededRandom } from './random.ts'
import { BETT, LAMPE, STUHL, TISCH, TUER } from './words.ts'

const OPTIONS = ['wohne', 'wohnst', 'wohnt', 'wohnen']

test('an attempt shows the options of a multiple choice question in an order drawn for it, every option once', () => {
  const question = multipleChoice('q1', 'wohnen', ['wohne', 'wohnst', 'wohnt'])
  const random = seededRandom(1)

  const orders = Array.from({ length: 30 }, () => asAsked(question, random).options)

  for (const order of orders) expect([...order].sort()).toEqual([...OPTIONS].sort())
  // Over thirty attempts the right answer stands in every place, and no order is the only one.
  const places = new Set(orders.map((order) => order.indexOf('wohnen')))
  expect([...places].sort()).toEqual([0, 1, 2, 3])
  expect(new Set(orders.map((order) => order.join(' '))).size).toBeGreaterThan(1)
})

/** Where the option that `at` finds stands, in each of thirty attempts at `question`. */
function placesOfAnswer<Q extends Question & { options: unknown[] }>(
  question: Q,
  at: (option: Q['options'][number]) => boolean,
) {
  const random = seededRandom(2)
  return new Set(Array.from({ length: 30 }, () => asAsked(question, random).options.findIndex(at)))
}

test('a gap fill question shows its options in an order drawn for each attempt', () => {
  const question = gapFill('q1', 'wohnen', ['wohne', 'wohnst'])

  expect([...placesOfAnswer(question, (option) => option === 'wohnen')].sort()).toEqual([0, 1, 2])
})

test('a vocabulary question from German shows its meanings in an order drawn for each attempt', () => {
  const question = vocabularyPool([TISCH, TUER, BETT, LAMPE, STUHL]).find(
    (asked): asked is MeaningOfWordQuestion => asked.type === 'meaning-of-word',
  )
  if (!question) throw new Error('the pool asks every word from German')

  expect([...placesOfAnswer(question, (option) => option.word === question.answer)].sort()).toEqual([0, 1, 2, 3])
})

test('over many attempts the right option stands in each place about as often, whatever place the pool gives it', () => {
  const meaning = vocabularyPool([TISCH, TUER, BETT, LAMPE, STUHL]).find(
    (asked): asked is MeaningOfWordQuestion => asked.type === 'meaning-of-word',
  )
  if (!meaning) throw new Error('the pool asks every word from German')
  // The right option last, as the vocabulary pool tends to hold it, and first, as writers tend to write it.
  const choice = multipleChoice('q1', 'wohnen', ['wohne', 'wohnst', 'wohnt'])
  const gap = gapFill('q2', 'wohnen', ['wohne', 'wohnst', 'wohnt'])
  const attempts = 4000

  for (const [question, place] of [
    [
      meaning,
      (asked: Question) => (asked as MeaningOfWordQuestion).options.findIndex((o) => o.word === meaning.answer),
    ],
    [choice, (asked: Question) => (asked as typeof choice).options.indexOf('wohnen')],
    [gap, (asked: Question) => (asked as typeof gap).options.indexOf('wohnen')],
  ] as const) {
    const counts = [0, 0, 0, 0]
    for (let seed = 0; seed < attempts; seed += 1) {
      const at = place(asAsked(question, seededRandom(seed)))
      counts[at] = (counts[at] ?? 0) + 1
    }
    for (const count of counts) {
      expect(count / attempts).toBeGreaterThan(0.22)
      expect(count / attempts).toBeLessThan(0.28)
    }
  }
})

/** ich – wohne, du – wohnst, wir – wohnen. The partners as the node file pairs them are the answer. */
function matching(answer: string[]): MatchingQuestion {
  return {
    id: 'q1',
    type: 'matching',
    prompt: 'ich / du / wir',
    left: answer.map((_, index) => `item ${index + 1}`),
    right: [...answer].reverse(),
    answer,
    explanation: { en: ['Because.'], fa: ['چون.'], de: ['Darum.'] },
  }
}

test('a matching question shows its partners in an order drawn for each attempt, never the order of the answer', () => {
  const question = matching(['wohne', 'wohnst', 'wohnen'])
  const random = seededRandom(3)

  const orders = Array.from({ length: 30 }, () => asAsked(question, random).right.join(' '))

  // Three partners have six orders; one is the answer, the other five all come up.
  expect(new Set(orders)).toEqual(
    new Set([
      'wohne wohnen wohnst',
      'wohnst wohne wohnen',
      'wohnst wohnen wohne',
      'wohnen wohne wohnst',
      'wohnen wohnst wohne',
    ]),
  )
})

test('a matching question of two pairs always shows its partners the other way round, whatever the randomness', () => {
  const question = matching(['wohne', 'wohnst'])

  for (const random of [() => 0, () => 0.999, seededRandom(4)]) {
    expect(asAsked(question, random).right).toEqual(['wohnst', 'wohne'])
  }
})

test('the order follows the randomness it is given and leaves the question as it was written', () => {
  const question = multipleChoice('q1', 'wohnen', ['wohne', 'wohnst', 'wohnt'])
  const written = structuredClone(question)

  expect(asAsked(question, seededRandom(5))).toEqual(asAsked(question, seededRandom(5)))
  expect(asAsked(question, () => 0).options).toEqual(['wohne', 'wohnst', 'wohnt', 'wohnen'])
  expect(asAsked(question, () => 0.999).options).toEqual(['wohnen', 'wohnt', 'wohnst', 'wohne'])
  expect(question).toEqual(written)
})

test('the order changes nothing in what is right: the same answers are right and wrong in every order', () => {
  const random = seededRandom(6)
  const choice = multipleChoice('q1', 'wohnen', ['wohne', 'wohnst', 'wohnt'])
  const pairs = matching(['wohne', 'wohnst', 'wohnen'])

  for (let attempt = 0; attempt < 10; attempt += 1) {
    expect(checkAnswer(asAsked(choice, random), 'wohnen').correct).toBe(true)
    expect(checkAnswer(asAsked(choice, random), 'wohne').correct).toBe(false)
    expect(checkAnswer(asAsked(pairs, random), ['wohne', 'wohnst', 'wohnen']).correct).toBe(true)
    expect(checkAnswer(asAsked(pairs, random), ['wohnst', 'wohne', 'wohnen']).correct).toBe(false)
  }
})

test('a question without options to order, or whose options stand as on the answer sheet, is asked as written', () => {
  const whichText: Question = {
    id: 'i1',
    type: 'which-text',
    prompt: 'Sie suchen einen Kurs.',
    options: ['a', 'b', 'c', '0'],
    answer: 'b',
    explanation: { en: ['Because.'], fa: ['چون.'], de: ['Darum.'] },
  }
  const whoSays: Question = {
    ...whichText,
    type: 'who-says',
    options: ['Moderatorin', 'Herr Kurz', 'Frau Wild'],
    answer: 'Herr Kurz',
  }

  for (const question of [
    trueFalse('q1', true),
    richtigFalsch('i1', false),
    typedAnswer('q2', ['wohne']),
    whichText,
    whoSays,
  ]) {
    expect(asAsked(question, seededRandom(7))).toBe(question)
  }
})

test('a task asks each of its items as an attempt asks it, and keeps its texts and the order of its items', () => {
  const task: ItemTask = {
    id: 't1',
    texts: [{ id: 'a', paragraphs: ['Ein Text.'] }],
    items: [
      richtigFalsch('i1', true),
      multipleChoice('i2', 'im Juni', ['im Mai', 'im Juli']),
      richtigFalsch('i3', false),
      multipleChoice('i4', 'mit dem Bus', ['zu Fuß', 'mit dem Rad']),
    ],
  }
  const random = seededRandom(8)

  const attempts = Array.from({ length: 20 }, () => taskAsAsked(task, random))

  for (const asked of attempts) {
    expect(asked.texts).toBe(task.texts)
    expect(asked.items.map((item) => item.id)).toEqual(['i1', 'i2', 'i3', 'i4'])
    expect(asked.items[0]).toBe(task.items[0])
  }
  const orders = (place: number) =>
    new Set(
      attempts.map(({ items }) => (items[place]?.type === 'multiple-choice' ? items[place].options.join(' ') : '')),
    )
  expect(orders(1).size).toBeGreaterThan(1)
  expect(orders(3).size).toBeGreaterThan(1)
})

test('a drawn test asks its questions as an attempt asks them: the same questions, the options in an order of their own', () => {
  const pool = [multipleChoice('q1', 'wohnen', ['wohne', 'wohnst', 'wohnt']), trueFalse('q2', true)]
  const random = seededRandom(10)

  const attempts = Array.from({ length: 30 }, () => drawQuestions(pool, 2, random))

  for (const attempt of attempts) expect(attempt.map(({ id }) => id).sort()).toEqual(['q1', 'q2'])
  const places = attempts.map((attempt) => {
    const asked = attempt.find(({ id }) => id === 'q1')
    return asked?.type === 'multiple-choice' ? asked.options.indexOf('wohnen') : -1
  })
  expect([...new Set(places)].sort()).toEqual([0, 1, 2, 3])
})
