import { expect, test } from 'vitest'
import type { WordOrderQuestion } from '../../src/content-model/index.ts'
import { compiledExtra, problemsOfExtra, withQuestion } from './extra-question.ts'

const wordOrder = { type: 'word-order', answer: ['heute', 'wohne', 'ich', 'in Berlin'] }

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
    answer: ['heute', 'wohne', 'ich', 'in Berlin'],
    alsoAccepted: [],
    explanation: expect.objectContaining({ en: ['With ', { de: 'du' }, ' the ending is ', { de: '-st' }, '.'] }),
  })
  // The app gets the same pieces, mixed.
  expect(sorted(compiled.pieces)).toEqual(['heute', 'ich', 'in Berlin', 'wohne'])
  expect(compiled.pieces).not.toEqual(compiled.answer)
})

test('a word ordering question lists every other right order, and may end with a question mark', async () => {
  const compiled = await compiledWordOrder({
    type: 'word-order',
    answer: ['wohnst', 'du', 'heute', 'in Berlin'],
    alsoAccepted: [['wohnst', 'du', 'in Berlin', 'heute']],
    end: '?',
  })

  expect(compiled).toMatchObject({
    end: '?',
    answer: ['wohnst', 'du', 'heute', 'in Berlin'],
    alsoAccepted: [['wohnst', 'du', 'in Berlin', 'heute']],
  })
})

test('the pieces are never shown in an order that is right', async () => {
  // Five of the six orders of three pieces are accepted here, so only one order can be shown.
  const compiled = await compiledWordOrder({
    type: 'word-order',
    answer: ['a', 'b', 'c'],
    alsoAccepted: [
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
    answer: ['die Frau', 'sieht', 'die Katze', 'und', 'die Katze', 'schläft'],
  })

  expect(sorted(compiled.pieces)).toEqual(['die Frau', 'die Katze', 'die Katze', 'schläft', 'sieht', 'und'])
})

test('a word ordering question that states no answer is rejected', async () => {
  const content = await withQuestion({ type: 'word-order' })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer', message: 'no correct answer: the question states none' },
  ])
})

test('a word ordering answer that is not a list of pieces is rejected', async () => {
  const content = await withQuestion({ type: 'word-order', answer: 'Heute wohne ich in Berlin.' })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer', message: 'must be the pieces of the sentence in the right order, as a list' },
  ])
})

test('a word ordering question with fewer than three pieces is rejected', async () => {
  const content = await withQuestion({ type: 'word-order', answer: ['ich', 'wohne'] })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer', message: 'needs at least 3 pieces: with fewer there is nothing to put in order' },
  ])
})

test('another accepted order that is not made of the same pieces is rejected', async () => {
  const content = await withQuestion({
    ...wordOrder,
    alsoAccepted: [
      ['ich', 'wohne', 'heute', 'in Berlin'],
      ['ich', 'wohne', 'heute', 'in Bonn'],
      ['ich', 'wohne', 'heute'],
    ],
  })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'alsoAccepted[1]', message: 'must be the pieces of the answer in another order: "in Bonn" is not one' },
    { where: 'alsoAccepted[2]', message: 'must be the pieces of the answer in another order: "in Berlin" is missing' },
  ])
})

test('an accepted order that is listed twice is rejected', async () => {
  const content = await withQuestion({
    ...wordOrder,
    alsoAccepted: [
      ['heute', 'wohne', 'ich', 'in Berlin'],
      ['ich', 'wohne', 'heute', 'in Berlin'],
      ['ich', 'wohne', 'heute', 'in Berlin'],
    ],
  })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'alsoAccepted[0]', message: 'is the same order as the answer' },
    { where: 'alsoAccepted[2]', message: 'is listed twice' },
  ])
})

test('a sentence can only end with a full stop, a question mark or an exclamation mark', async () => {
  const content = await withQuestion({ ...wordOrder, end: ',' })

  expect(await problemsOfExtra(content)).toEqual([{ where: 'end', message: 'must be ".", "?" or "!"' }])
})
