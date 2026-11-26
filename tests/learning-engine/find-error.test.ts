import { expect, test } from 'vitest'
import type { FindErrorQuestion } from '../../src/content-model/index.ts'
import { checkAnswer, isAnswered, scoreAttempt } from '../../src/learning-engine/index.ts'

/** "Du wohne in Berlin.": the wrong word is the second one. */
const question: FindErrorQuestion = {
  id: 'q1',
  type: 'find-error',
  prompt: 'Du wohne in Berlin.',
  parts: [{ word: 'Du' }, ' ', { word: 'wohne' }, ' ', { word: 'in' }, ' ', { word: 'Berlin' }, '.'],
  answer: 1,
  explanation: { en: ['Because.'], fa: ['چون.'], de: ['Darum.'] },
}

test('a find the error answer is right when it picks the wrong word of the sentence', () => {
  expect(checkAnswer(question, 1).correct).toBe(true)
  expect(checkAnswer(question, 0).correct).toBe(false)
  expect(checkAnswer(question, 3).correct).toBe(false)
})

test('for find the error, no answer and an answer of another kind are wrong', () => {
  expect(checkAnswer(question, undefined).correct).toBe(false)
  expect(checkAnswer(question, 'wohne').correct).toBe(false)
  expect(checkAnswer(question, '1').correct).toBe(false)
  expect(checkAnswer(question, true).correct).toBe(false)
})

test('a find the error question is answered once a word is picked', () => {
  expect(isAnswered(question, undefined)).toBe(false)
  expect(isAnswered(question, 3)).toBe(true)
})

test('a find the error question counts in the score of an attempt', () => {
  expect(scoreAttempt([question], [1])).toMatchObject({ total: 1, correct: 1 })
  expect(scoreAttempt([question], [2])).toMatchObject({ total: 1, correct: 0 })
})
