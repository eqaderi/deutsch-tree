import { expect, test } from 'vitest'
import { markingOf, scoreOutOf100 } from '../../src/assistant-grading/index.ts'
import { everyTask, schreiben1, schreiben3, sprechen1, sprechen2, sprechen3 } from './tasks.ts'

/**
 * The points below are from the official score sheets: Schreiben 40 + 40 + 20,
 * Sprechen 28 + 40 + 16 and 16 for Aussprache. The expected scores are worked
 * out by hand from the rule, not by the code.
 */

test('the official points of the three writing tasks add up to 100', () => {
  expect([1, 2, 3].map((part) => markingOf({ module: 'schreiben', part: part as 1 | 2 | 3 }).maximum)).toEqual([
    40, 40, 20,
  ])
})

test('the official points of the three speaking parts and of Aussprache add up to 100', () => {
  const parts = [1, 2, 3].map((part) => markingOf({ module: 'sprechen', part: part as 1 | 2 | 3 }))

  expect(parts.map((marking) => marking.maximum)).toEqual([28, 40, 16])
  expect(parts.map((marking) => marking.pronunciation?.points[0])).toEqual([16, 16, 16])
})

test.each(everyTask)('the best band of every criterion of $module $part gives the maximum of the task', (task) => {
  const marking = markingOf(task)

  expect(marking.criteria.reduce((sum, criterion) => sum + criterion.points[0], 0)).toBe(marking.maximum)
  expect(marking.criteria.every((criterion) => criterion.points[4] === 0)).toBe(true)
})

test('a writing task is scored as its share of the points of that task', () => {
  // Aufgabe 1: 32.5 of 40 points is 81.25%.
  expect(scoreOutOf100(schreiben1, { task: 32.5 })).toBe(81)
  expect(scoreOutOf100(schreiben1, { task: 40 })).toBe(100)
  expect(scoreOutOf100(schreiben1, { task: 0 })).toBe(0)
  // One criterion at B, the rest at A: 37.5 of 40 is 93.75%.
  expect(scoreOutOf100(schreiben1, { task: 37.5 })).toBe(94)
  // Aufgabe 3: 18 of 20 points is exactly 90%.
  expect(scoreOutOf100(schreiben3, { task: 18 })).toBe(90)
})

test('half a point out of 100 is rounded up', () => {
  // Aufgabe 3: 18.5 of 20 points is 92.5%.
  expect(scoreOutOf100(schreiben3, { task: 18.5 })).toBe(93)
})

test('a speaking part counts for 84 of the 100 points and Aussprache for its official 16', () => {
  // Teil 1: 21 of 28 points is three quarters of 84, which is 63. Aussprache B is 12.
  expect(scoreOutOf100(sprechen1, { task: 21, pronunciation: 12 })).toBe(75)
  // Teil 2: 37 of 40 points is 77.7 of 84. With Aussprache A: 93.7.
  expect(scoreOutOf100(sprechen2, { task: 37, pronunciation: 16 })).toBe(94)
  // Teil 3: 12 of 16 points is 63 of 84. Aussprache C is 8.
  expect(scoreOutOf100(sprechen3, { task: 12, pronunciation: 8 })).toBe(71)
})

test('a perfect speaking part with perfect Aussprache is 100, and nothing is 0', () => {
  expect(scoreOutOf100(sprechen1, { task: 28, pronunciation: 16 })).toBe(100)
  expect(scoreOutOf100(sprechen2, { task: 40, pronunciation: 16 })).toBe(100)
  expect(scoreOutOf100(sprechen3, { task: 16, pronunciation: 16 })).toBe(100)
  expect(scoreOutOf100(sprechen1, { task: 0, pronunciation: 0 })).toBe(0)
})

test('a perfect speaking part cannot reach 90 with Aussprache at band D or lower', () => {
  // 84 + 4 = 88: the part is not done until the pronunciation is at least band C.
  expect(scoreOutOf100(sprechen1, { task: 28, pronunciation: 4 })).toBe(88)
  expect(scoreOutOf100(sprechen1, { task: 28, pronunciation: 8 })).toBe(92)
})
