import { expect, test } from 'vitest'
import { applyAttempt, emptyProgress, nodeState } from '../../src/learning-engine/index.ts'

test('a node that was never tested is not started', () => {
  expect(nodeState(emptyProgress(), 'grammar-001')).toBe('not-started')
})

test('a node with a finished test that was not passed is in progress', () => {
  const progress = applyAttempt(emptyProgress(), 'grammar-001', { passed: false })

  expect(nodeState(progress, 'grammar-001')).toBe('in-progress')
  expect(nodeState(progress, 'grammar-002')).toBe('not-started')
})

test('a passed node is done, also when it was failed before or after', () => {
  let progress = applyAttempt(emptyProgress(), 'grammar-001', { passed: false })
  progress = applyAttempt(progress, 'grammar-001', { passed: true })
  progress = applyAttempt(progress, 'grammar-001', { passed: false })

  expect(nodeState(progress, 'grammar-001')).toBe('done')
})
