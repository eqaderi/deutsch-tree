import { expect, test } from 'vitest'
import { applyAttempt, emptyProgress, startedVocabulary, unmarkDone } from '../../src/learning-engine/index.ts'
import { curriculum, doneWith } from './curriculum.ts'

const NODES = curriculum(
  'A1 vocabulary v1',
  'A1 grammar g1',
  'A1 vocabulary v2',
  'A1 vocabulary v3 soon',
  'A2 vocabulary v4',
  'A2 phrases p1',
)

test('nothing is started before the learner has a result', () => {
  expect(startedVocabulary(NODES, emptyProgress())).toEqual([])
})

test('the started vocabulary nodes are those done or in progress, in curriculum order', () => {
  let progress = doneWith('v4', 'g1', 'p1')
  progress = applyAttempt(progress, 'v1', { passed: false })

  expect(startedVocabulary(NODES, progress).map((node) => node.id)).toEqual(['v1', 'v4'])
})

test('a node un-marked as done is still started', () => {
  const progress = unmarkDone(doneWith('v2'), 'v2')

  expect(startedVocabulary(NODES, progress).map((node) => node.id)).toEqual(['v2'])
})

test('only published nodes count, even with progress kept for one that is coming soon now', () => {
  expect(startedVocabulary(NODES, doneWith('v3', 'v2')).map((node) => node.id)).toEqual(['v2'])
})
