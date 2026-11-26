import { expect, test } from 'vitest'
import {
  applyAttempt,
  emptyProgress,
  isDone,
  officialExamScores,
  readScore,
  recordOfficialExamScores,
} from '../../src/learning-engine/index.ts'

test('nothing is recorded for an official mock exam before the learner records it', () => {
  expect(officialExamScores(emptyProgress(), 'adults-1')).toEqual({})
})

test('the learner records four module scores for an official mock exam, and only for that exam', () => {
  const scores = { reading: 93, listening: 87, writing: 90, speaking: 96 }

  const progress = recordOfficialExamScores(emptyProgress(), 'adults-1', scores)

  expect(officialExamScores(progress, 'adults-1')).toEqual(scores)
  expect(officialExamScores(progress, 'adults-2')).toEqual({})
})

test('modules can be recorded one after another, as the learner gets through the exam', () => {
  let progress = recordOfficialExamScores(emptyProgress(), 'adults-1', { reading: 93 })
  expect(officialExamScores(progress, 'adults-1')).toEqual({ reading: 93 })

  progress = recordOfficialExamScores(progress, 'adults-1', { reading: 93, listening: 97 })
  expect(officialExamScores(progress, 'adults-1')).toEqual({ reading: 93, listening: 97 })
})

test('recording again replaces what was recorded: a score can be corrected or taken back', () => {
  let progress = recordOfficialExamScores(emptyProgress(), 'adults-1', { reading: 39, listening: 97 })

  progress = recordOfficialExamScores(progress, 'adults-1', { reading: 93 })

  expect(officialExamScores(progress, 'adults-1')).toEqual({ reading: 93 })
})

test('taking back every score of an exam leaves nothing recorded for it', () => {
  let progress = recordOfficialExamScores(emptyProgress(), 'adults-1', { reading: 93 })
  progress = recordOfficialExamScores(progress, 'adults-2', { reading: 91 })

  progress = recordOfficialExamScores(progress, 'adults-1', {})

  expect(progress.officialExams).toEqual({ 'adults-2': { reading: 91 } })
})

test('recording scores leaves the nodes as they were, and a node test leaves the scores', () => {
  let progress = applyAttempt(emptyProgress(), 'grammar-001', { passed: true })

  progress = recordOfficialExamScores(progress, 'adults-1', { reading: 93 })
  progress = applyAttempt(progress, 'grammar-002', { passed: false })

  expect(isDone(progress, 'grammar-001')).toBe(true)
  expect(officialExamScores(progress, 'adults-1')).toEqual({ reading: 93 })
})

test('recording gives new progress and leaves the old one as it was', () => {
  const before = recordOfficialExamScores(emptyProgress(), 'adults-1', { reading: 93 })

  recordOfficialExamScores(before, 'adults-1', { reading: 50, writing: 70 })

  expect(officialExamScores(before, 'adults-1')).toEqual({ reading: 93 })
})

test.each([
  ['90', 90],
  ['0', 0],
  ['100', 100],
  ['  87 ', 87],
  ['007', 7],
  // A learner who reads Persian may type Persian or Arabic digits.
  ['۹۰', 90],
  ['۱۰۰', 100],
  ['٨٧', 87],
])('a typed score "%s" is read as %i', (typed, score) => {
  expect(readScore(typed)).toBe(score)
})

test.each(['', '   '])('an empty field ("%s") means the module is not recorded', (typed) => {
  expect(readScore(typed)).toBe('none')
})

test.each([
  '101',
  '-1',
  '90.5',
  '90,5',
  '90%',
  'ninety',
  '9 0',
  '1e2',
  '۱۰۱',
])('a typed score "%s" is not a whole number from 0 to 100', (typed) => {
  expect(readScore(typed)).toBe('invalid')
})
