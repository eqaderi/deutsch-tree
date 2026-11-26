import { expect, test } from 'vitest'
import { type Answer, scoreAttempt } from '../../src/learning-engine/index.ts'
import { gapFill, multipleChoice, questions, trueFalse } from './questions.ts'

/** One answer per question, in the order of the attempt: right, except at the places (from 1) named in `wrong`. */
function answers(count: number, wrong: number[] = []): Answer[] {
  return Array.from({ length: count }, (_, index) => (wrong.includes(index + 1) ? 'wrong' : 'right'))
}

test('9 right of 10 passes', () => {
  const result = scoreAttempt(questions(10), answers(10, [4]))

  expect(result).toMatchObject({ total: 10, correct: 9, passMark: 9, passed: true })
})

test('8 right of 10 does not pass', () => {
  const result = scoreAttempt(questions(10), answers(10, [4, 9]))

  expect(result).toMatchObject({ total: 10, correct: 8, passMark: 9, passed: false })
})

test('13 right of 15 does not pass, 14 does', () => {
  expect(scoreAttempt(questions(15), answers(15, [1, 2])).passed).toBe(false)
  expect(scoreAttempt(questions(15), answers(15, [1])).passed).toBe(true)
})

test('a question left without an answer counts as wrong', () => {
  expect(scoreAttempt(questions(10), answers(9))).toMatchObject({ correct: 9, passed: true })
  expect(scoreAttempt(questions(10), [undefined, ...answers(9)])).toMatchObject({ correct: 9, passed: true })
  expect(scoreAttempt(questions(10), [])).toMatchObject({ correct: 0, passed: false })
})

test('the result goes through the attempt in order and says for each question what was answered and whether it was right', () => {
  const attempt = [multipleChoice('a', 'wohne', ['wohnst']), trueFalse('b', false), gapFill('c', 'wohnst', ['wohne'])]

  const result = scoreAttempt(attempt, ['wohnst', false, 'wohnst'])

  expect(result.questions).toEqual([
    { question: attempt[0], answer: 'wohnst', correct: false },
    { question: attempt[1], answer: false, correct: true },
    { question: attempt[2], answer: 'wohnst', correct: true },
  ])
  expect(result).toMatchObject({ total: 3, correct: 2, passMark: 3, passed: false })
})

test('answers go by place, so two questions with the same identifier (from two nodes) are told apart', () => {
  const attempt = [multipleChoice('q1', 'der', ['die']), multipleChoice('q1', 'die', ['der'])]

  expect(scoreAttempt(attempt, ['der', 'der'])).toMatchObject({ correct: 1 })
})
