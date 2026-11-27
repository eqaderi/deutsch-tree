/**
 * Progress saved by an older version of the app must load in every later one.
 *
 * When SAVED_VERSION is raised, add a test here with text exactly as the
 * version before wrote it, written out by hand (never produced by today's
 * code), and say what today's app must make of it.
 */
import { expect, test } from 'vitest'
import {
  emptyProgress,
  isDone,
  mockExamHistory,
  nodeProgress,
  officialExamScores,
} from '../../src/learning-engine/index.ts'
import { parseProgress, SAVED_VERSION, type SavedFormat } from '../../src/progress-store/index.ts'

function read(text: string, format?: SavedFormat) {
  const result = parseProgress(text, format)
  if (!result.ok) throw new Error(`could not be read: ${result.problem}`)
  return result.progress
}

test('the saved shape has a version, and a new field of progress means a new version', () => {
  // This fails when a field is added to Progress. Then: raise SAVED_VERSION,
  // add the field's reader, update the two values below, and add a test in
  // this file for text saved by the version before. An app that does not
  // know the field must refuse the data instead of dropping the field, and
  // the version number is what tells it. See src/progress-store/index.ts.
  expect({ version: SAVED_VERSION, fields: Object.keys(emptyProgress()).sort() }).toEqual({
    version: 4,
    fields: ['mockExams', 'nodes', 'officialExams', 'voice'],
  })
})

test('progress saved by version 1 loads, with no official mock exam scores recorded', () => {
  // Version 1 knew nothing of official mock exams.
  const progress = read(
    '{"version":1,"nodes":{"grammar-001":{"done":true,"attempts":3},"grammar-002":{"done":false,"attempts":1}}}',
  )

  expect(nodeProgress(progress, 'grammar-001')).toEqual({ done: true, attempts: 3 })
  expect(nodeProgress(progress, 'grammar-002')).toEqual({ done: false, attempts: 1 })
  expect(progress.officialExams).toEqual({})
  expect(officialExamScores(progress, 'goethe-b1-modellsatz-erwachsene')).toEqual({})
})

test('progress saved by version 2 loads', () => {
  // Version 2 added the module scores recorded for official mock exams. An exam may lack modules.
  const progress = read(
    '{"version":2,"nodes":{"grammar-001":{"done":true,"attempts":3}},"officialExams":{"goethe-b1-modellsatz-erwachsene":{"reading":93,"listening":90,"writing":88,"speaking":100},"goethe-b1-uebungssatz-erwachsene":{"reading":0}}}',
  )

  expect(nodeProgress(progress, 'grammar-001')).toEqual({ done: true, attempts: 3 })
  expect(officialExamScores(progress, 'goethe-b1-modellsatz-erwachsene')).toEqual({
    reading: 93,
    listening: 90,
    writing: 88,
    speaking: 100,
  })
  expect(officialExamScores(progress, 'goethe-b1-uebungssatz-erwachsene')).toEqual({ reading: 0 })
  expect(mockExamHistory(progress)).toEqual([])
})

test('progress saved by version 3 loads, with the history of mock exam modules', () => {
  // Version 3 added the finished modules of the original mock exams, oldest first.
  const progress = read(
    '{"version":3,"nodes":{},"officialExams":{},"mockExams":[{"exam":"mock-exam-1","module":"reading","finished":"2026-11-20T09:00:00.000Z","timed":true,"score":90,"parts":[{"part":1,"correct":6,"total":6},{"part":2,"correct":5,"total":6},{"part":3,"correct":6,"total":7},{"part":4,"correct":7,"total":7},{"part":5,"correct":3,"total":4}]},{"exam":"mock-exam-1","module":"listening","finished":"2026-11-21T09:00:00.000Z","timed":false,"score":57,"parts":[{"part":1,"correct":6,"total":10}]},{"exam":"mock-exam-1","module":"reading","finished":"not a date","score":"ninety"}]}',
  )

  expect(mockExamHistory(progress)).toEqual([
    {
      exam: 'mock-exam-1',
      module: 'listening',
      finished: '2026-11-21T09:00:00.000Z',
      timed: false,
      score: 57,
      parts: [{ part: 1, correct: 6, total: 10 }],
    },
    {
      exam: 'mock-exam-1',
      module: 'reading',
      finished: '2026-11-20T09:00:00.000Z',
      timed: true,
      score: 90,
      parts: [
        { part: 1, correct: 6, total: 6 },
        { part: 2, correct: 5, total: 6 },
        { part: 3, correct: 6, total: 7 },
        { part: 4, correct: 7, total: 7 },
        { part: 5, correct: 3, total: 4 },
      ],
    },
  ])
})

test('progress saved by version 3 loads with the main voice, as the app sounded then', () => {
  // Version 4 added the voice the learner chose for everything one person says.
  const progress = read(
    '{"version":3,"nodes":{"grammar-001":{"done":true,"attempts":2}},"officialExams":{},"mockExams":[]}',
  )

  expect(progress.voice).toBe('thorsten')
  expect(nodeProgress(progress, 'grammar-001')).toEqual({ done: true, attempts: 2 })
})

test('progress saved by version 4 loads with the voice the learner chose', () => {
  const progress = read('{"version":4,"nodes":{},"officialExams":{},"mockExams":[],"voice":"kerstin"}')

  expect(progress.voice).toBe('kerstin')
})

test('a saved voice the app does not offer reads as the main voice', () => {
  for (const voice of ['"mls-5424"', '"robot"', '3', 'null']) {
    expect(read(`{"version":4,"nodes":{},"voice":${voice}}`).voice).toBe('thorsten')
  }
})

/**
 * The upgrade steps themselves, on an invented history: version 1 kept a
 * list of done topics, version 2 kept them as flags, and version 3 is the
 * shape of today.
 */
const inventedHistory: SavedFormat = {
  version: 3,
  upgrades: {
    1: (saved) => ({ passed: Object.fromEntries((saved.done as string[]).map((id) => [id, true])) }),
    2: (saved) => ({
      nodes: Object.fromEntries(Object.keys(saved.passed as object).map((id) => [id, { done: true, attempts: 1 }])),
    }),
  },
}

test('saved text is brought up to today’s shape one version at a time, from whichever version saved it', () => {
  const fromVersion1 = read('{"version":1,"done":["grammar-001","grammar-007"]}', inventedHistory)
  const fromVersion2 = read('{"version":2,"passed":{"grammar-001":true}}', inventedHistory)
  const fromVersion3 = read('{"version":3,"nodes":{"grammar-001":{"done":true,"attempts":4}}}', inventedHistory)

  expect(fromVersion1.nodes).toEqual({
    'grammar-001': { done: true, attempts: 1 },
    'grammar-007': { done: true, attempts: 1 },
  })
  expect(fromVersion2.nodes).toEqual({ 'grammar-001': { done: true, attempts: 1 } })
  expect(fromVersion3.nodes).toEqual({ 'grammar-001': { done: true, attempts: 4 } })
})

test('a version that only added a field needs no step: what was saved before it loads with the field empty', () => {
  const addedAField: SavedFormat = { version: 2, upgrades: {} }

  const progress = read('{"version":1,"nodes":{"grammar-001":{"done":true,"attempts":1}}}', addedAField)

  expect(isDone(progress, 'grammar-001')).toBe(true)
})

test('text saved by a newer version is refused, whatever it holds', () => {
  expect(parseProgress('{"version":4,"nodes":{}}', inventedHistory)).toEqual({ ok: false, problem: 'newer-version' })
})

test.each([
  ['no version', '{"nodes":{}}'],
  ['a version that is not a whole number from 1 up', '{"version":"1","nodes":{}}'],
  ['version 0', '{"version":0,"nodes":{}}'],
  ['no object', '[1,2,3]'],
  ['no JSON', 'hello'],
])('text that is not saved progress (%s) is refused', (_case, text) => {
  expect(parseProgress(text)).toEqual({ ok: false, problem: 'not-progress' })
})
