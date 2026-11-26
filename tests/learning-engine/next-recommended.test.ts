import { expect, test } from 'vitest'
import { applyAttempt, emptyProgress, nextRecommended, unmarkDone } from '../../src/learning-engine/index.ts'
import { curriculum, doneWith } from './curriculum.ts'

const nodes = curriculum(
  'A1 grammar g1',
  'A1 grammar g2',
  'A1 vocabulary v1 soon',
  'A1 phrases p1',
  'A2 grammar g3 soon',
  'A2 vocabulary v2',
  'B1 exam-part e1',
)

test('before anything is done, the next recommended node is the first published one', () => {
  expect(nextRecommended(nodes, emptyProgress())?.id).toBe('g1')
})

test('a curriculum that opens with nodes not written yet starts at its first published node', () => {
  const later = curriculum('A1 grammar g1 soon', 'A1 grammar g2 soon', 'A1 grammar g3')

  expect(nextRecommended(later, emptyProgress())?.id).toBe('g3')
})

test('done nodes are skipped', () => {
  expect(nextRecommended(nodes, doneWith('g1'))?.id).toBe('g2')
})

test('"coming soon" nodes are skipped, into another kind', () => {
  expect(nextRecommended(nodes, doneWith('g1', 'g2'))?.id).toBe('p1')
})

test('"coming soon" nodes are skipped, into another level', () => {
  expect(nextRecommended(nodes, doneWith('g1', 'g2', 'p1'))?.id).toBe('v2')
  expect(nextRecommended(nodes, doneWith('g1', 'g2', 'p1', 'v2'))?.id).toBe('e1')
})

test('it is the earliest node that is not done, however far ahead the learner has worked', () => {
  expect(nextRecommended(nodes, doneWith('g1', 'p1', 'e1'))?.id).toBe('g2')
})

test('a node that was tested but not passed is still the next one', () => {
  const progress = applyAttempt(doneWith('g1'), 'g2', { passed: false })

  expect(nextRecommended(nodes, progress)?.id).toBe('g2')
})

test('an un-marked node is recommended again when it is the earliest one not done', () => {
  const progress = doneWith('g1', 'g2', 'p1')

  expect(nextRecommended(nodes, unmarkDone(progress, 'g2'))?.id).toBe('g2')
})

test('there is no next recommended node when every published node is done', () => {
  expect(nextRecommended(nodes, doneWith('g1', 'g2', 'p1', 'v2', 'e1'))).toBeUndefined()
})

test('there is none when nothing is published, or when there are no nodes', () => {
  expect(nextRecommended(curriculum('A1 grammar g1 soon'), emptyProgress())).toBeUndefined()
  expect(nextRecommended([], emptyProgress())).toBeUndefined()
})

test('progress on a node that is no longer in the curriculum is ignored', () => {
  expect(nextRecommended(nodes, doneWith('removed-node'))?.id).toBe('g1')
})
