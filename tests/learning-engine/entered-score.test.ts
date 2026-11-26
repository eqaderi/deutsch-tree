import { expect, test } from 'vitest'
import {
  applyAttempt,
  applyEnteredScore,
  emptyProgress,
  enteredScores,
  isDone,
  nodeProgress,
  readScore,
  scorePasses,
} from '../../src/learning-engine/index.ts'

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

test.each([
  ['90', 90],
  [' 87 ', 87],
  ['0', 0],
  ['100', 100],
  ['۹۳', 93], // Persian digits, as a Persian keyboard types them
  ['٧٥', 75], // Arabic digits
])('what a learner types as a score (%j) is read as a whole number from 0 to 100', (typed, score) => {
  expect(readScore(typed)).toBe(score)
})

test.each([
  [''],
  ['ninety'],
  ['101'],
  ['-5'],
  ['87.5'],
  ['90/100'],
  ['9 0'],
])('typed text that is not a whole number from 0 to 100 (%j) is no score', (typed) => {
  expect(readScore(typed)).toBeNull()
})
