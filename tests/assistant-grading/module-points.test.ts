import { expect, test } from 'vitest'
import { modulePoints } from '../../src/assistant-grading/index.ts'
import { scoreModule } from '../../src/learning-engine/index.ts'

/**
 * A mock exam's Schreiben or Sprechen: the score out of 100 of each task, as
 * the learner typed it in, made into points of the part's weight in the
 * module. The weights and points are worked out by hand: Schreiben weighs
 * 40, 40 and 20; Sprechen 28, 40 and 16 with Aussprache's 16 spread over the
 * parts as their points (33⅓, 47.6, 19.0), shown whole as 33, 48 and 19.
 */

test('a writing task weighs its official points, so the module score is the sum of the tasks', () => {
  // 81 of 100 is 32.4 of 40 points, 75 is 30 of 40, 75 is 15 of 20: 77.4 in all.
  const parts = modulePoints('schreiben', [81, 75, 75])

  expect(parts).toEqual([
    { part: 1, correct: 32, total: 40 },
    { part: 2, correct: 30, total: 40 },
    { part: 3, correct: 15, total: 20 },
  ])
  expect(scoreModule(parts).score).toBe(77)
})

test('the parts add up to the module score the exam rule gives, also where each part has a fraction', () => {
  // 83 everywhere: 33.2 + 33.2 + 16.6 = 83. The point left over goes to the largest fraction.
  const parts = modulePoints('schreiben', [83, 83, 83])

  expect(parts.map((part) => part.correct)).toEqual([33, 33, 17])
  expect(scoreModule(parts).score).toBe(83)
})

test('a speaking part weighs its points and its share of Aussprache, and the weights add up to 100', () => {
  // 75 everywhere: 25 + 35.7 + 14.3 = 75.
  const parts = modulePoints('sprechen', [75, 75, 75])

  expect(parts).toEqual([
    { part: 1, correct: 25, total: 33 },
    { part: 2, correct: 36, total: 48 },
    { part: 3, correct: 14, total: 19 },
  ])
  expect(scoreModule(parts).score).toBe(75)
})

test('Sprechen is the weighted mean of its parts, not the plain mean', () => {
  // 90 × 28/84 + 60 × 40/84 + 100 × 16/84 = 30 + 28.6 + 19.0 = 77.6. The plain mean would be 83.
  const parts = modulePoints('sprechen', [90, 60, 100])

  expect(parts.map((part) => part.correct)).toEqual([30, 29, 19])
  expect(scoreModule(parts).score).toBe(78)
})

test('full marks are every part at its weight, and a task without a score counts as 0', () => {
  expect(scoreModule(modulePoints('sprechen', [100, 100, 100])).score).toBe(100)
  expect(modulePoints('schreiben', [90, undefined, 90])).toEqual([
    { part: 1, correct: 36, total: 40 },
    { part: 2, correct: 0, total: 40 },
    { part: 3, correct: 18, total: 20 },
  ])
})
