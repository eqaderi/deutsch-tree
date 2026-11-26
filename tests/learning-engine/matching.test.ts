import { expect, test } from 'vitest'
import type { MatchingQuestion } from '../../src/content-model/index.ts'
import { checkAnswer, isAnswered, scoreAttempt } from '../../src/learning-engine/index.ts'

/** ich – wohne, du – wohnst, wir – wohnen. An answer names the partner of each item, in the order of the items. */
const question: MatchingQuestion = {
  id: 'q1',
  type: 'matching',
  prompt: 'ich / du / wir',
  left: ['ich', 'du', 'wir'],
  right: ['wohnen', 'wohne', 'wohnst'],
  answer: ['wohne', 'wohnst', 'wohnen'],
  explanation: { en: ['Because.'], fa: ['چون.'], de: ['Darum.'] },
}

test('a matching answer is right when every item has its own partner', () => {
  expect(checkAnswer(question, ['wohne', 'wohnst', 'wohnen']).correct).toBe(true)
})

test('a matching answer with two partners swapped is wrong', () => {
  expect(checkAnswer(question, ['wohnst', 'wohne', 'wohnen']).correct).toBe(false)
  expect(checkAnswer(question, ['wohnen', 'wohne', 'wohnst']).correct).toBe(false)
})

test('a matching answer that leaves an item without a partner is wrong', () => {
  expect(checkAnswer(question, ['wohne', 'wohnst', null]).correct).toBe(false)
  expect(checkAnswer(question, ['wohne', 'wohnst']).correct).toBe(false)
  expect(checkAnswer(question, []).correct).toBe(false)
})

test('for matching, no answer and an answer of another kind are wrong', () => {
  expect(checkAnswer(question, undefined).correct).toBe(false)
  expect(checkAnswer(question, 'wohne').correct).toBe(false)
  expect(checkAnswer(question, 0).correct).toBe(false)
  expect(checkAnswer(question, true).correct).toBe(false)
})

test('a matching question is answered once every item has a partner', () => {
  expect(isAnswered(question, undefined)).toBe(false)
  expect(isAnswered(question, [])).toBe(false)
  expect(isAnswered(question, ['wohne', null, 'wohnen'])).toBe(false)
  expect(isAnswered(question, ['wohne', 'wohnst'])).toBe(false)
  // Whole, though wrong: the test may move on.
  expect(isAnswered(question, ['wohnst', 'wohne', 'wohnen'])).toBe(true)
})

test('a matching question counts in the score of an attempt', () => {
  expect(scoreAttempt([question], [['wohne', 'wohnst', 'wohnen']])).toMatchObject({ correct: 1 })
  expect(scoreAttempt([question], [['wohne', 'wohnen', 'wohnst']])).toMatchObject({ correct: 0 })
})
