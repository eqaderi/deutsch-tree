import { expect, test } from 'vitest'
import { applyAttempt, countNodes, emptyProgress, unmarkDone, youAreHere } from '../../src/learning-engine/index.ts'
import { curriculum, doneWith } from './curriculum.ts'

const nodes = curriculum(
  'A1 grammar g1',
  'A1 grammar g2',
  'A1 grammar g3 soon',
  'A1 vocabulary v1 soon',
  'A2 grammar g4',
  'A2 vocabulary v2 soon',
)

test('before anything is done, every node remains, and the ones not written yet are told apart', () => {
  expect(countNodes(nodes, emptyProgress())).toEqual({ total: 6, done: 0, remaining: 6, comingSoon: 3 })
})

test('a done node moves from remaining to done; "coming soon" nodes stay among the remaining', () => {
  expect(countNodes(nodes, doneWith('g1', 'g4'))).toEqual({ total: 6, done: 2, remaining: 4, comingSoon: 3 })
})

test('counts make sense when nearly everything is still to be written', () => {
  const mostlySoon = curriculum('A1 grammar g1', ...Array.from({ length: 211 }, (_, i) => `A1 grammar s${i} soon`))

  // One topic done is 1 of 212, not "everything done": the 211 are still ahead.
  expect(countNodes(mostlySoon, doneWith('g1'))).toEqual({ total: 212, done: 1, remaining: 211, comingSoon: 211 })
})

test('a node that was tested but not passed, or was un-marked, counts as remaining', () => {
  let progress = applyAttempt(doneWith('g1'), 'g2', { passed: false })
  progress = unmarkDone(progress, 'g1')

  expect(countNodes(nodes, progress)).toMatchObject({ done: 0, remaining: 6 })
})

test('counts are for the nodes given: one level, or one kind', () => {
  const progress = doneWith('g1', 'g4')
  const a1 = nodes.filter((node) => node.level === 'A1')
  const vocabulary = nodes.filter((node) => node.kind === 'vocabulary')

  expect(countNodes(a1, progress)).toEqual({ total: 4, done: 1, remaining: 3, comingSoon: 2 })
  expect(countNodes(vocabulary, progress)).toEqual({ total: 2, done: 0, remaining: 2, comingSoon: 2 })
  expect(countNodes([], progress)).toEqual({ total: 0, done: 0, remaining: 0, comingSoon: 0 })
})

test('progress on a node that is not among the nodes given is not counted', () => {
  expect(countNodes(nodes, doneWith('removed-node')).done).toBe(0)
})

test('the learner is at the next recommended node', () => {
  expect(youAreHere(nodes, emptyProgress())?.id).toBe('g1')
  expect(youAreHere(nodes, doneWith('g1', 'g2'))?.id).toBe('g4')
})

test('with every published node done, the learner is at the first node still to be written', () => {
  expect(youAreHere(nodes, doneWith('g1', 'g2', 'g4'))?.id).toBe('g3')
})

test('with every node done, the learner is past the last node', () => {
  const written = curriculum('A1 grammar g1', 'B1 exam-part e1')

  expect(youAreHere(written, doneWith('g1', 'e1'))).toBeUndefined()
})
