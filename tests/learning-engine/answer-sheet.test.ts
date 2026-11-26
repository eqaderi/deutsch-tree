import { expect, test } from 'vitest'
import { examScore, scoreAnswerSheet, scoreModule } from '../../src/learning-engine/index.ts'

// A book's answer key for one part, as a pack holds it: the right choice per item number.
const KEY = [
  { item: 7, answer: 'a' },
  { item: 8, answer: 'c' },
  { item: 9, answer: 'b' },
  { item: 10, answer: 'b' },
  { item: 11, answer: 'a' },
  { item: 12, answer: 'c' },
]

test.each([
  [30, 30, 100],
  [27, 30, 90],
  [18, 30, 60],
  [20, 30, 67],
  [0, 30, 0],
  [5, 6, 83],
])('%i right of %i items is a score of %i out of 100', (correct, total, score) => {
  expect(examScore(correct, total)).toBe(score)
})

test('an answer sheet is scored item by item against the answer key', () => {
  const result = scoreAnswerSheet(KEY, { 7: 'a', 8: 'c', 9: 'a', 10: 'b', 11: 'a', 12: 'c' })

  expect(result).toMatchObject({ total: 6, correct: 5, score: 83 })
  expect(result.items[2]).toEqual({ item: 9, given: 'a', right: 'b', correct: false })
  expect(result.items[0]).toEqual({ item: 7, given: 'a', right: 'a', correct: true })
})

test('an item left empty on the sheet counts as wrong', () => {
  const result = scoreAnswerSheet(KEY, { 7: 'a' })

  expect(result).toMatchObject({ total: 6, correct: 1, score: 17 })
  expect(result.items[1]).toEqual({ item: 8, given: undefined, right: 'c', correct: false })
})

test('a module is scored over the items of all its parts, out of 100', () => {
  const lesen = [
    { total: 6, correct: 6 },
    { total: 6, correct: 5 },
    { total: 7, correct: 6 },
    { total: 7, correct: 7 },
    { total: 4, correct: 3 },
  ]

  expect(scoreModule(lesen)).toEqual({ total: 30, correct: 27, score: 90 })
})
