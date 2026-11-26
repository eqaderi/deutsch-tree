import { expect, test } from 'vitest'
import { applyAttempt, emptyProgress, isDone, nodeProgress, scoreAttempt } from '../../src/learning-engine/index.ts'
import { questions } from './questions.ts'

const passed = scoreAttempt(questions(10), Array(10).fill('right'))
const failed = scoreAttempt(questions(10), Array(10).fill('wrong'))

test('nothing is done before the first test', () => {
  expect(isDone(emptyProgress(), 'grammar-001')).toBe(false)
})

test('passing a test marks the node done, and only that node', () => {
  const progress = applyAttempt(emptyProgress(), 'grammar-001', passed)

  expect(isDone(progress, 'grammar-001')).toBe(true)
  expect(isDone(progress, 'grammar-002')).toBe(false)
})

test('failing a test does not mark the node done', () => {
  const progress = applyAttempt(emptyProgress(), 'grammar-001', failed)

  expect(isDone(progress, 'grammar-001')).toBe(false)
})

test('failing never changes a done node, however often', () => {
  let progress = applyAttempt(emptyProgress(), 'grammar-001', passed)

  progress = applyAttempt(progress, 'grammar-001', failed)
  progress = applyAttempt(progress, 'grammar-001', failed)

  expect(isDone(progress, 'grammar-001')).toBe(true)
})

test('a node failed first and passed on a retry is done', () => {
  let progress = applyAttempt(emptyProgress(), 'grammar-001', failed)

  progress = applyAttempt(progress, 'grammar-001', passed)

  expect(isDone(progress, 'grammar-001')).toBe(true)
})

test('a test on one node leaves the other nodes as they were', () => {
  let progress = applyAttempt(emptyProgress(), 'grammar-001', passed)

  progress = applyAttempt(progress, 'grammar-002', failed)
  progress = applyAttempt(progress, 'grammar-003', passed)

  expect(['grammar-001', 'grammar-002', 'grammar-003'].map((id) => isDone(progress, id))).toEqual([true, false, true])
})

test('applying a result gives new progress and leaves the old one as it was', () => {
  const before = emptyProgress()

  applyAttempt(before, 'grammar-001', passed)

  expect(isDone(before, 'grammar-001')).toBe(false)
  expect(before).toEqual(emptyProgress())
})

test('every finished test of a node is counted, passed or not', () => {
  let progress = emptyProgress()
  expect(nodeProgress(progress, 'grammar-001')).toEqual({ done: false, attempts: 0 })

  progress = applyAttempt(progress, 'grammar-001', failed)
  expect(nodeProgress(progress, 'grammar-001')).toEqual({ done: false, attempts: 1 })

  progress = applyAttempt(progress, 'grammar-001', passed)
  progress = applyAttempt(progress, 'grammar-001', failed)
  expect(nodeProgress(progress, 'grammar-001')).toEqual({ done: true, attempts: 3 })
})

test('an attempt with no questions is never passed', () => {
  expect(scoreAttempt([], []).passed).toBe(false)
})
