import { expect, test } from 'vitest'
import {
  applyAttempt,
  emptyProgress,
  isDone,
  nodeProgress,
  nodeState,
  unmarkDone,
} from '../../src/learning-engine/index.ts'

const pass = { passed: true }
const fail = { passed: false }

test('un-marking a done node makes it not done, and only that node', () => {
  let progress = applyAttempt(emptyProgress(), 'grammar-001', pass)
  progress = applyAttempt(progress, 'grammar-002', pass)

  progress = unmarkDone(progress, 'grammar-001')

  expect(isDone(progress, 'grammar-001')).toBe(false)
  expect(isDone(progress, 'grammar-002')).toBe(true)
})

test('an un-marked node is in progress, not untouched: its finished tests are still counted', () => {
  let progress = applyAttempt(emptyProgress(), 'grammar-001', fail)
  progress = applyAttempt(progress, 'grammar-001', pass)

  progress = unmarkDone(progress, 'grammar-001')

  expect(nodeState(progress, 'grammar-001')).toBe('in-progress')
  expect(nodeProgress(progress, 'grammar-001').attempts).toBe(2)
})

test('an un-marked node is done again after its test is passed again', () => {
  let progress = applyAttempt(emptyProgress(), 'grammar-001', pass)
  progress = unmarkDone(progress, 'grammar-001')

  progress = applyAttempt(progress, 'grammar-001', fail)
  expect(isDone(progress, 'grammar-001')).toBe(false)

  progress = applyAttempt(progress, 'grammar-001', pass)
  expect(isDone(progress, 'grammar-001')).toBe(true)
})

test('un-marking keeps whatever else is recorded for the node', () => {
  // A later kind of result (an entered score, say) adds its own fields to a node.
  const progress = { ...emptyProgress(), nodes: { 'exam-writing-1': { done: true, attempts: 1, scores: [92] } } }

  expect(unmarkDone(progress, 'exam-writing-1').nodes['exam-writing-1']).toEqual({
    done: false,
    attempts: 1,
    scores: [92],
  })
})

test('un-marking a node that is not done changes nothing', () => {
  const untouched = emptyProgress()
  const failed = applyAttempt(emptyProgress(), 'grammar-001', fail)

  expect(unmarkDone(untouched, 'grammar-001')).toEqual(emptyProgress())
  expect(unmarkDone(failed, 'grammar-001')).toEqual(failed)
})

test('un-marking gives new progress and leaves the old one as it was', () => {
  const before = applyAttempt(emptyProgress(), 'grammar-001', pass)

  unmarkDone(before, 'grammar-001')

  expect(isDone(before, 'grammar-001')).toBe(true)
})
