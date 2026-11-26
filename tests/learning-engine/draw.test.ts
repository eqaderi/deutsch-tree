import { expect, test } from 'vitest'
import { drawAttempt } from '../../src/learning-engine/index.ts'
import { seededRandom } from './random.ts'

const pool = Array.from({ length: 20 }, (_, index) => `q${index + 1}`)

test('an attempt draws the asked number of questions, all from the pool and none twice', () => {
  for (const size of [10, 11, 12, 13, 14, 15]) {
    const attempt = drawAttempt(pool, size, seededRandom(size))

    expect(attempt).toHaveLength(size)
    expect(new Set(attempt).size).toBe(size)
    expect(pool).toEqual(expect.arrayContaining(attempt))
  }
})

test('a retry draws a new set: every attempt is drawn afresh from the whole pool', () => {
  const random = seededRandom(7)

  const attempts = Array.from({ length: 30 }, () => drawAttempt(pool, 10, random))

  const [first, second] = attempts.map((attempt) => [...attempt].sort().join(' '))
  expect(second).not.toBe(first)
  // No question is left out for good, and none is in every attempt.
  for (const question of pool) {
    const timesDrawn = attempts.filter((attempt) => attempt.includes(question)).length
    expect(timesDrawn).toBeGreaterThan(0)
    expect(timesDrawn).toBeLessThan(attempts.length)
  }
})

test('the draw follows the randomness it is given and leaves the pool as it was', () => {
  const before = [...pool]

  expect(drawAttempt(pool, 10, seededRandom(3))).toEqual(drawAttempt(pool, 10, seededRandom(3)))
  expect(drawAttempt(pool, 3, () => 0)).toEqual(['q1', 'q2', 'q3'])
  expect(drawAttempt(pool, 3, () => 0.999)).toEqual(['q20', 'q19', 'q18'])
  expect(pool).toEqual(before)
})

test('a pool smaller than the attempt is drawn whole', () => {
  const attempt = drawAttempt(['a', 'b', 'c'], 10, seededRandom(5))

  expect([...attempt].sort()).toEqual(['a', 'b', 'c'])
})
