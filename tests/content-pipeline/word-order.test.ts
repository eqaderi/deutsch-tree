import { expect, test } from 'vitest'
import type { WordOrderQuestion } from '../../src/content-model/index.ts'
import { compiledExtra, problemsOfExtra, withQuestion } from './extra-question.ts'

const wordOrder = { type: 'word-order', answers: [['heute', 'wohne', 'ich', 'in Berlin']] }

async function compiledWordOrder(question: Record<string, unknown>): Promise<WordOrderQuestion> {
  const compiled = await compiledExtra(await withQuestion(question))
  if (compiled?.type !== 'word-order') throw new Error('the question did not compile as word ordering')
  return compiled
}

const sorted = (pieces: string[]) => [...pieces].sort()

test('a word ordering question is the pieces of a German sentence in the right order', async () => {
  const compiled = await compiledWordOrder(wordOrder)

  expect(compiled).toEqual({
    id: 'extra',
    type: 'word-order',
    prompt: compiled.pieces.join(' / '),
    pieces: expect.any(Array),
    // A sentence ends with a full stop unless the question says otherwise.
    end: '.',
    answers: [['heute', 'wohne', 'ich', 'in Berlin']],
    explanation: expect.objectContaining({ en: ['With ', { de: 'du' }, ' the ending is ', { de: '-st' }, '.'] }),
  })
  // The app gets the same pieces, mixed.
  expect(sorted(compiled.pieces)).toEqual(['heute', 'ich', 'in Berlin', 'wohne'])
  expect(compiled.pieces).not.toEqual(compiled.answers[0])
})

test('a word ordering question lists every right order, and may end with a question mark', async () => {
  const answers = [
    ['wohnst', 'du', 'heute', 'in Berlin'],
    ['wohnst', 'du', 'in Berlin', 'heute'],
  ]

  expect(await compiledWordOrder({ type: 'word-order', answers, end: '?' })).toMatchObject({ end: '?', answers })
})

test('the pieces are never shown in an order that is right', async () => {
  // Five of the six orders of three pieces are right here, so only one order can be shown.
  const compiled = await compiledWordOrder({
    type: 'word-order',
    answers: [
      ['a', 'b', 'c'],
      ['a', 'c', 'b'],
      ['b', 'a', 'c'],
      ['b', 'c', 'a'],
      ['c', 'a', 'b'],
    ],
  })

  expect(compiled.pieces).toEqual(['c', 'b', 'a'])
})

test('the same piece may stand in the sentence twice', async () => {
  const compiled = await compiledWordOrder({
    type: 'word-order',
    answers: [['die Frau', 'sieht', 'die Katze', 'und', 'die Katze', 'schläft']],
  })

  expect(sorted(compiled.pieces)).toEqual(['die Frau', 'die Katze', 'die Katze', 'schläft', 'sieht', 'und'])
})

test('a word ordering question that lists no right order is rejected', async () => {
  const noAnswer = { where: 'answers', message: 'no correct answer: the question lists none under "answers"' }

  expect(await problemsOfExtra(await withQuestion({ type: 'word-order' }))).toEqual([noAnswer])
  expect(await problemsOfExtra(await withQuestion({ type: 'word-order', answers: [] }))).toEqual([noAnswer])
})

test('right orders that are not written as a list of orders are rejected', async () => {
  const notOrders = 'must be a list of orders, each one a list of the pieces, such as [[wo, wohnst, du]]'

  // The sentence itself.
  expect(
    await problemsOfExtra(await withQuestion({ type: 'word-order', answers: 'Heute wohne ich in Berlin.' })),
  ).toEqual([{ where: 'answers', message: notOrders }])
  // One order without the list around it.
  expect(await problemsOfExtra(await withQuestion({ type: 'word-order', answers: ['wo', 'wohnst', 'du'] }))).toEqual([
    { where: 'answers', message: notOrders },
  ])
})

test('a word ordering question with fewer than three pieces is rejected', async () => {
  const content = await withQuestion({ type: 'word-order', answers: [['ich', 'wohne']] })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answers[0]', message: 'needs at least 3 pieces: with fewer there is nothing to put in order' },
  ])
})

test('a right order that is not made of the same pieces as the first is rejected', async () => {
  const content = await withQuestion({
    type: 'word-order',
    answers: [
      ['heute', 'wohne', 'ich', 'in Berlin'],
      ['ich', 'wohne', 'heute', 'in Berlin'],
      ['ich', 'wohne', 'heute', 'in Bonn'],
      ['ich', 'wohne', 'heute', 'heute'],
      ['in Berlin', 'wohne', 'ich'],
    ],
  })

  const must = 'must be the pieces of the first order in another order'
  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answers[2]', message: `${must}: "in Bonn" is not one` },
    { where: 'answers[3]', message: `${must}: "heute" is there too often` },
    { where: 'answers[4]', message: `${must}: "heute" is missing` },
  ])
})

test('a right order that is listed twice is rejected', async () => {
  const content = await withQuestion({
    type: 'word-order',
    answers: [
      ['heute', 'wohne', 'ich', 'in Berlin'],
      ['ich', 'wohne', 'heute', 'in Berlin'],
      ['heute', 'wohne', 'ich', 'in Berlin'],
      ['ich', 'wohne', 'heute', 'in Berlin'],
    ],
  })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answers[2]', message: 'is listed twice' },
    { where: 'answers[3]', message: 'is listed twice' },
  ])
})

test('a sentence can only end with a full stop, a question mark or an exclamation mark', async () => {
  const content = await withQuestion({ ...wordOrder, end: ',' })

  expect(await problemsOfExtra(content)).toEqual([{ where: 'end', message: 'must be ".", "?" or "!"' }])
})
