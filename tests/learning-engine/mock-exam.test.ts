import { expect, test } from 'vitest'
import {
  emptyProgress,
  hasProgress,
  mockExamHistory,
  mockModuleResult,
  recordMockExamResult,
  scoreStanding,
  timeLeft,
} from '../../src/learning-engine/index.ts'

/** Lesen, as the exam has it: 6 + 6 + 7 + 7 + 4 items, here with `wrong` items wrong in each part. */
function lesen(...wrong: number[]) {
  return [6, 6, 7, 7, 4].map((total, index) => ({ part: index + 1, total, correct: total - (wrong[index] ?? 0) }))
}

const FINISHED = '2026-11-26T10:00:00.000Z'

test('a finished module is scored over the items of all its parts, out of 100, and keeps each part', () => {
  const result = mockModuleResult({
    exam: 'mock-exam-1',
    module: 'reading',
    finished: FINISHED,
    timed: true,
    parts: lesen(0, 1, 1, 0, 1),
  })

  expect(result).toEqual({
    exam: 'mock-exam-1',
    module: 'reading',
    finished: FINISHED,
    timed: true,
    score: 90,
    parts: [
      { part: 1, total: 6, correct: 6 },
      { part: 2, total: 6, correct: 5 },
      { part: 3, total: 7, correct: 6 },
      { part: 4, total: 7, correct: 7 },
      { part: 5, total: 4, correct: 3 },
    ],
  })
})

test.each([
  // Right items per part of Hören (10 + 5 + 7 + 8 = 30), the score the exam's own table gives, and where it stands against 60 and 90.
  [[10, 5, 7, 8], 100, 'at-target'],
  [[9, 4, 7, 7], 90, 'at-target'],
  [[9, 4, 6, 7], 87, 'passed'],
  [[6, 3, 4, 5], 60, 'passed'],
  [[6, 3, 4, 4], 57, 'not-passed'],
  [[0, 0, 0, 0], 0, 'not-passed'],
] as const)('Hören with %j right is %i out of 100: %s', (right, score, standing) => {
  const parts = [10, 5, 7, 8].map((total, index) => ({ part: index + 1, total, correct: right[index] ?? 0 }))

  const result = mockModuleResult({ exam: 'mock-exam-1', module: 'listening', finished: FINISHED, timed: false, parts })

  expect(result.score).toBe(score)
  expect(scoreStanding(result.score)).toBe(standing)
})

test('the history keeps every finished module, the latest first, and a new result never replaces an old one', () => {
  const first = mockModuleResult({
    exam: 'mock-exam-1',
    module: 'reading',
    finished: '2026-11-20T09:00:00.000Z',
    timed: true,
    parts: lesen(3, 3, 3, 3, 3),
  })
  const second = mockModuleResult({
    exam: 'mock-exam-1',
    module: 'reading',
    finished: '2026-11-26T09:00:00.000Z',
    timed: true,
    parts: lesen(),
  })
  const other = mockModuleResult({
    exam: 'mock-exam-2',
    module: 'listening',
    finished: '2026-11-22T09:00:00.000Z',
    timed: false,
    parts: [{ part: 1, total: 10, correct: 9 }],
  })

  const before = emptyProgress()
  const progress = [first, other, second].reduce(recordMockExamResult, before)

  expect(mockExamHistory(progress)).toEqual([second, other, first])
  expect(mockExamHistory(progress, 'mock-exam-1')).toEqual([second, first])
  expect(hasProgress(progress)).toBe(true)
  expect(mockExamHistory(before)).toEqual([])
})

test('the time left runs down from the limit, in whole seconds, and stops at nothing', () => {
  const start = Date.parse('2026-11-26T10:00:00.000Z')

  expect(timeLeft(65, start, start)).toBe(65 * 60)
  expect(timeLeft(65, start, start + 1500)).toBe(65 * 60 - 1)
  expect(timeLeft(65, start, start + 65 * 60_000 - 400)).toBe(1)
  expect(timeLeft(65, start, start + 65 * 60_000)).toBe(0)
  expect(timeLeft(65, start, start + 2 * 60 * 60_000)).toBe(0)
})
