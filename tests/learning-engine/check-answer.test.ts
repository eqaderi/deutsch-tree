import { expect, test } from 'vitest'
import { checkAnswer } from '../../src/learning-engine/index.ts'
import { gapFill, multipleChoice, trueFalse } from './questions.ts'

test('a multiple choice answer is right when it is the correct option', () => {
  const question = multipleChoice('q1', 'wohne', ['wohnst', 'wohnt'])

  expect(checkAnswer(question, 'wohne').correct).toBe(true)
  expect(checkAnswer(question, 'wohnst').correct).toBe(false)
})

test('a gap fill answer is right when it is the form that fills the gap', () => {
  const question = gapFill('q1', 'wohnst', ['wohne'])

  expect(checkAnswer(question, 'wohnst').correct).toBe(true)
  expect(checkAnswer(question, 'wohne').correct).toBe(false)
})

test('a true/false answer is right when it judges the sentence as the question does', () => {
  expect(checkAnswer(trueFalse('q1', true), true).correct).toBe(true)
  expect(checkAnswer(trueFalse('q1', true), false).correct).toBe(false)
  expect(checkAnswer(trueFalse('q2', false), false).correct).toBe(true)
  expect(checkAnswer(trueFalse('q2', false), true).correct).toBe(false)
})

test('no answer is a wrong answer', () => {
  expect(checkAnswer(multipleChoice('q1', 'wohne', ['wohnst']), undefined).correct).toBe(false)
  expect(checkAnswer(trueFalse('q2', false), undefined).correct).toBe(false)
})

test('an answer of the wrong kind is a wrong answer', () => {
  expect(checkAnswer(trueFalse('q1', true), 'true').correct).toBe(false)
  expect(checkAnswer(multipleChoice('q2', 'true', ['false']), true).correct).toBe(false)
})
