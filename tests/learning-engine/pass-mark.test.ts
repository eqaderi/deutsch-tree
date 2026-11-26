import { expect, test } from 'vitest'
import { passMark } from '../../src/learning-engine/index.ts'

// The smallest whole number of questions that is at least 90% of the attempt.
test.each([
  // attempt size, pass mark
  [10, 9], // 9 is exactly 90%
  [11, 10], // 9 of 11 is 81.8%
  [12, 11], // 10 of 12 is 83.3%
  [13, 12], // 11 of 13 is 84.6%
  [14, 13], // 12 of 14 is 85.7%
  [15, 14], // 13 of 15 is 86.7%
])('an attempt of %i questions is passed with %i right', (attemptSize, expected) => {
  expect(passMark(attemptSize)).toBe(expected)
})

test.each([
  [1, 1],
  [8, 8], // 7 of 8 is 87.5%
  [9, 9], // 8 of 9 is 88.9%
  [20, 18],
  [30, 27], // exactly 90%; must not be pushed to 28 by rounding inside the computer
  [40, 36],
])('outside the usual sizes too: %i questions need %i right', (attemptSize, expected) => {
  expect(passMark(attemptSize)).toBe(expected)
})
