import { expect, test } from 'vitest'
import {
  applyAttempt,
  applyEnteredScore,
  emptyProgress,
  enteredScores,
  isDone,
  nextRecommended,
  nodeProgress,
  nodeState,
  scorePasses,
  unmarkDone,
} from '../../src/learning-engine/index.ts'
import { curriculum } from './curriculum.ts'

test('a score of 90 or more out of 100 passes, anything below does not', () => {
  expect([0, 60, 89, 90, 91, 100].map(scorePasses)).toEqual([false, false, false, true, true, true])
})

test('entering a score of 90 marks the node done, and only that node', () => {
  const progress = applyEnteredScore(emptyProgress(), 'exam-schreiben-1', 90)

  expect(isDone(progress, 'exam-schreiben-1')).toBe(true)
  expect(isDone(progress, 'exam-sprechen-1')).toBe(false)
})

test('entering a score of 89 does not mark the node done', () => {
  const progress = applyEnteredScore(emptyProgress(), 'exam-schreiben-1', 89)

  expect(isDone(progress, 'exam-schreiben-1')).toBe(false)
})

test('a lower score never changes a done node', () => {
  let progress = applyEnteredScore(emptyProgress(), 'exam-schreiben-1', 95)

  progress = applyEnteredScore(progress, 'exam-schreiben-1', 40)

  expect(isDone(progress, 'exam-schreiben-1')).toBe(true)
})

test('every entered score of a node is kept, in the order it was entered', () => {
  let progress = emptyProgress()
  expect(enteredScores(progress, 'exam-schreiben-1')).toEqual([])

  progress = applyEnteredScore(progress, 'exam-schreiben-1', 72)
  progress = applyEnteredScore(progress, 'exam-schreiben-1', 93)
  progress = applyEnteredScore(progress, 'exam-schreiben-1', 85)
  progress = applyEnteredScore(progress, 'exam-sprechen-1', 60)

  expect(enteredScores(progress, 'exam-schreiben-1')).toEqual([72, 93, 85])
  expect(enteredScores(progress, 'exam-sprechen-1')).toEqual([60])
})

test('an entered score counts as one attempt of the node', () => {
  let progress = applyEnteredScore(emptyProgress(), 'exam-schreiben-1', 72)
  progress = applyEnteredScore(progress, 'exam-schreiben-1', 93)

  expect(nodeProgress(progress, 'exam-schreiben-1').attempts).toBe(2)
})

test('a node that was only ever tested by questions has no entered score', () => {
  const progress = applyAttempt(emptyProgress(), 'grammar-001', { passed: true })

  expect(enteredScores(progress, 'grammar-001')).toEqual([])
})

test('entering a score gives new progress and leaves the old one as it was', () => {
  const before = applyEnteredScore(emptyProgress(), 'exam-schreiben-1', 72)

  applyEnteredScore(before, 'exam-schreiben-1', 93)

  expect(enteredScores(before, 'exam-schreiben-1')).toEqual([72])
})

test('a node with a score below 90 is in progress, and done with 90 or more', () => {
  let progress = emptyProgress()
  expect(nodeState(progress, 'exam-schreiben-1')).toBe('not-started')

  progress = applyEnteredScore(progress, 'exam-schreiben-1', 89)
  expect(nodeState(progress, 'exam-schreiben-1')).toBe('in-progress')

  progress = applyEnteredScore(progress, 'exam-schreiben-1', 90)
  expect(nodeState(progress, 'exam-schreiben-1')).toBe('done')
})

test('a node that is scored outside the app is next recommended until a score of 90 is entered', () => {
  const nodes = curriculum('B1 exam-part exam-schreiben-1', 'B1 exam-part exam-sprechen-1')
  expect(nextRecommended(nodes, emptyProgress())?.id).toBe('exam-schreiben-1')

  let progress = applyEnteredScore(emptyProgress(), 'exam-schreiben-1', 70)
  expect(nextRecommended(nodes, progress)?.id).toBe('exam-schreiben-1')

  progress = applyEnteredScore(progress, 'exam-schreiben-1', 96)
  expect(nextRecommended(nodes, progress)?.id).toBe('exam-sprechen-1')
})

test('a node done by a score can be un-marked: it is in progress with its scores, and a new 90 finishes it again', () => {
  let progress = applyEnteredScore(emptyProgress(), 'exam-schreiben-1', 93)

  progress = unmarkDone(progress, 'exam-schreiben-1')

  expect(nodeState(progress, 'exam-schreiben-1')).toBe('in-progress')
  expect(enteredScores(progress, 'exam-schreiben-1')).toEqual([93])

  progress = applyEnteredScore(progress, 'exam-schreiben-1', 80)
  expect(isDone(progress, 'exam-schreiben-1')).toBe(false)

  progress = applyEnteredScore(progress, 'exam-schreiben-1', 90)
  expect(isDone(progress, 'exam-schreiben-1')).toBe(true)
  expect(enteredScores(progress, 'exam-schreiben-1')).toEqual([93, 80, 90])
})
