import { expect, test } from 'vitest'
import {
  emptyProgress,
  type ModuleScores,
  type Progress,
  readiness,
  readinessOf,
  recordOfficialExamScores,
} from '../../src/learning-engine/index.ts'

/** The official mock exams that count, as the content lists them. */
const OFFICIAL = ['adults-1', 'adults-2', 'youth-1']

const all = (score: number): ModuleScores => ({ reading: score, listening: score, writing: score, speaking: score })

function recorded(scores: Record<string, ModuleScores>): Progress {
  return Object.entries(scores).reduce(
    (progress, [examId, examScores]) => recordOfficialExamScores(progress, examId, examScores),
    emptyProgress(),
  )
}

test('a learner who has recorded nothing is not ready and still needs two official mock exams', () => {
  const result = readiness(emptyProgress(), OFFICIAL)

  expect(result).toMatchObject({ ready: false, needed: 2, met: 0, missing: 2 })
})

test('90 or more in every module on two official mock exams is ready', () => {
  const progress = recorded({
    'adults-1': { reading: 97, listening: 90, writing: 92, speaking: 100 },
    'adults-2': { reading: 90, listening: 93, writing: 90, speaking: 91 },
  })

  expect(readiness(progress, OFFICIAL)).toMatchObject({ ready: true, met: 2, missing: 0 })
})

test('exactly 90 in every module counts', () => {
  const progress = recorded({ 'adults-1': all(90), 'adults-2': all(90) })

  expect(readiness(progress, OFFICIAL).ready).toBe(true)
})

test('one official mock exam is not enough, however good', () => {
  const progress = recorded({ 'adults-1': all(100) })

  expect(readiness(progress, OFFICIAL)).toMatchObject({ ready: false, met: 1, missing: 1 })
})

test('one module under 90 keeps an exam from counting, whatever the other modules are', () => {
  const progress = recorded({
    'adults-1': all(95),
    'adults-2': { reading: 100, listening: 100, writing: 89, speaking: 100 },
  })

  const result = readiness(progress, OFFICIAL)

  expect(result).toMatchObject({ ready: false, met: 1, missing: 1 })
  expect(result.exams.find((exam) => exam.id === 'adults-2')).toEqual({
    id: 'adults-2',
    started: true,
    met: false,
    below: [{ module: 'writing', score: 89 }],
    notRecorded: [],
  })
})

test('an exam with a module not yet recorded does not count, and the view can say which module', () => {
  const progress = recorded({
    'adults-1': all(95),
    'adults-2': { reading: 96, listening: 94 },
  })

  const result = readiness(progress, OFFICIAL)

  expect(result.ready).toBe(false)
  expect(result.exams.find((exam) => exam.id === 'adults-2')).toEqual({
    id: 'adults-2',
    started: true,
    met: false,
    below: [],
    notRecorded: ['writing', 'speaking'],
  })
})

test('every official mock exam is reported, in the order given, also the ones not started', () => {
  const result = readiness(recorded({ 'adults-2': all(91) }), OFFICIAL)

  expect(result.exams.map((exam) => [exam.id, exam.started, exam.met])).toEqual([
    ['adults-1', false, false],
    ['adults-2', true, true],
    ['youth-1', false, false],
  ])
})

test('any two of the official mock exams will do, and a third good one changes nothing', () => {
  expect(readiness(recorded({ 'adults-2': all(92), 'youth-1': all(94) }), OFFICIAL).ready).toBe(true)
  expect(readiness(recorded({ 'adults-1': all(92), 'adults-2': all(92), 'youth-1': all(94) }), OFFICIAL)).toMatchObject(
    { ready: true, met: 3, missing: 0 },
  )
})

test('scores of an exam that is not one of the official mock exams do not count', () => {
  const progress = recorded({ 'adults-1': all(95), 'somewhere-else': all(100) })

  const result = readiness(progress, OFFICIAL)

  expect(result).toMatchObject({ ready: false, met: 1, missing: 1 })
  expect(result.exams.map((exam) => exam.id)).toEqual(OFFICIAL)
})

test('of the official mock exams the content lists, only those that count toward readiness are held to the rule', () => {
  const listed = [
    { id: 'adults-1', countsTowardReadiness: true },
    { id: 'practice-set', countsTowardReadiness: false },
    { id: 'adults-2', countsTowardReadiness: true },
  ]
  const progress = recorded({ 'adults-1': all(95), 'practice-set': all(95) })

  const result = readinessOf(progress, listed)

  expect(result).toMatchObject({ ready: false, met: 1, missing: 1 })
  expect(result.exams.map((exam) => exam.id)).toEqual(['adults-1', 'adults-2'])
})
