import { expect, test } from 'vitest'
import type { WordOrderQuestion } from '../../src/content-model/index.ts'
import { checkAnswer, isAnswered, rightAnswer, scoreAttempt } from '../../src/learning-engine/index.ts'

/** A word ordering question with these right orders. */
function wordOrder(first: string[], ...others: string[][]): WordOrderQuestion {
  const pieces = [...first].reverse()
  return {
    id: 'q1',
    type: 'word-order',
    prompt: pieces.join(' / '),
    pieces,
    end: '.',
    answers: [first, ...others],
    explanation: { en: ['Because.'], fa: ['چون.'], de: ['Darum.'] },
  }
}

const oneOrder = wordOrder(['heute', 'wohne', 'ich', 'in Berlin'])

test('a word ordering answer is right when the pieces are in the order of the answer', () => {
  expect(checkAnswer(oneOrder, ['heute', 'wohne', 'ich', 'in Berlin']).correct).toBe(true)
  expect(checkAnswer(oneOrder, ['heute', 'ich', 'wohne', 'in Berlin']).correct).toBe(false)
  expect(checkAnswer(oneOrder, ['in Berlin', 'ich', 'wohne', 'heute']).correct).toBe(false)
})

test('every listed order is right, and no other one', () => {
  const question = wordOrder(
    ['heute', 'wohne', 'ich', 'in Berlin'],
    ['ich', 'wohne', 'heute', 'in Berlin'],
    ['in Berlin', 'wohne', 'ich', 'heute'],
  )

  expect(checkAnswer(question, ['heute', 'wohne', 'ich', 'in Berlin']).correct).toBe(true)
  expect(checkAnswer(question, ['ich', 'wohne', 'heute', 'in Berlin']).correct).toBe(true)
  expect(checkAnswer(question, ['in Berlin', 'wohne', 'ich', 'heute']).correct).toBe(true)
  expect(checkAnswer(question, ['ich', 'heute', 'wohne', 'in Berlin']).correct).toBe(false)
})

test('the right answer shown for a word ordering question is the first order listed', () => {
  const question = wordOrder(['heute', 'wohne', 'ich', 'in Berlin'], ['ich', 'wohne', 'heute', 'in Berlin'])

  expect(rightAnswer(question)).toEqual(['heute', 'wohne', 'ich', 'in Berlin'])
})

test('an order that leaves pieces out is wrong, also when it starts right', () => {
  expect(checkAnswer(oneOrder, ['heute', 'wohne', 'ich']).correct).toBe(false)
  expect(checkAnswer(oneOrder, []).correct).toBe(false)
})

test('a piece that stands in the sentence twice may be used for either place', () => {
  const question = wordOrder(['die Katze', 'sieht', 'die Katze'])

  expect(checkAnswer(question, ['die Katze', 'sieht', 'die Katze']).correct).toBe(true)
  expect(checkAnswer(question, ['die Katze', 'die Katze', 'sieht']).correct).toBe(false)
})

test('for word ordering, no answer and an answer of another kind are wrong', () => {
  expect(checkAnswer(oneOrder, undefined).correct).toBe(false)
  expect(checkAnswer(oneOrder, 'heute wohne ich in Berlin').correct).toBe(false)
  expect(checkAnswer(oneOrder, 0).correct).toBe(false)
  expect(checkAnswer(oneOrder, true).correct).toBe(false)
})

test('a word ordering question is answered once every piece is placed', () => {
  expect(isAnswered(oneOrder, undefined)).toBe(false)
  expect(isAnswered(oneOrder, [])).toBe(false)
  expect(isAnswered(oneOrder, ['heute', 'wohne', 'ich'])).toBe(false)
  // Whole, though wrong: the test may move on.
  expect(isAnswered(oneOrder, ['in Berlin', 'ich', 'wohne', 'heute'])).toBe(true)
})

test('a word ordering question counts in the score of an attempt', () => {
  expect(scoreAttempt([oneOrder], [['heute', 'wohne', 'ich', 'in Berlin']])).toMatchObject({ correct: 1 })
  expect(scoreAttempt([oneOrder], [['wohne', 'heute', 'ich', 'in Berlin']])).toMatchObject({ correct: 0 })
})
