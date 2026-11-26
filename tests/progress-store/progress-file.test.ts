/**
 * The progress file: what a learner exports as a backup and imports on
 * another device, or on this one after the browser was cleared.
 */
import { expect, test } from 'vitest'
import {
  applyAttempt,
  applyEnteredScore,
  emptyProgress,
  enteredScores,
  isDone,
  officialExamScores,
  type Progress,
  readiness,
  recordOfficialExamScores,
} from '../../src/learning-engine/index.ts'
import { exportProgress, importProgress, SAVED_VERSION } from '../../src/progress-store/index.ts'

/** A morning in Berlin, in whatever time zone the test runs. */
const morning = new Date(2026, 10, 26, 9, 30)

function someProgress(): Progress {
  let progress = emptyProgress()
  progress = applyAttempt(progress, 'grammar-001', { passed: false })
  progress = applyAttempt(progress, 'grammar-001', { passed: true })
  progress = applyAttempt(progress, 'grammar-002', { passed: false })
  progress = recordOfficialExamScores(progress, 'adults-1', { reading: 93, listening: 90, writing: 88, speaking: 100 })
  progress = recordOfficialExamScores(progress, 'adults-2', { reading: 0 })
  return progress
}

function imported(text: string) {
  const result = importProgress(text)
  if (!result.ok) throw new Error(`the file was refused: ${result.problem}`)
  return result
}

test('an exported file comes back as the same progress', () => {
  const progress = someProgress()

  const file = exportProgress(progress, morning)

  expect(imported(file.text).progress).toEqual(progress)
})

test('the scores a learner typed in for writing and speaking go into the file and come back from it', () => {
  let progress = someProgress()
  progress = applyEnteredScore(progress, 'exam-schreiben-1', 72)
  progress = applyEnteredScore(progress, 'exam-schreiben-1', 93)
  progress = applyEnteredScore(progress, 'exam-sprechen-1', 85)

  const file = exportProgress(progress, morning)

  expect(file.text).toContain('    "exam-schreiben-1": { "done": true, "attempts": 2, "scores": [72, 93] },\n')
  const back = imported(file.text).progress
  expect(enteredScores(back, 'exam-schreiben-1')).toEqual([72, 93])
  expect(enteredScores(back, 'exam-sprechen-1')).toEqual([85])
  expect(isDone(back, 'exam-schreiben-1')).toBe(true)
  expect(isDone(back, 'exam-sprechen-1')).toBe(false)
  expect(back).toEqual(progress)
})

test('the file says in its name and in its first lines what it is, and when it was made', () => {
  const file = exportProgress(someProgress(), morning)

  expect(file.name).toBe('deutsch-tree-progress-2026-11-26.json')
  const lines = file.text.split('\n')
  expect(lines[1]).toBe('  "app": "deutsch-tree",')
  expect(lines[2]).toMatch(/^ {2}"about": ".*progress.*",$/)
  expect(lines[3]).toBe(`  "exported": "${morning.toISOString()}",`)
  expect(lines[4]).toBe(`  "version": ${SAVED_VERSION},`)
  expect(imported(file.text).exported).toEqual(morning)
})

test('every field of the progress is in the file, so that nothing is left behind on the old device', () => {
  const file = JSON.parse(exportProgress(emptyProgress(), morning).text)

  expect(Object.keys(file)).toEqual(['app', 'about', 'exported', 'version', ...Object.keys(emptyProgress())])
})

test('a person can read the file: one line per topic', () => {
  const file = exportProgress(someProgress(), morning)

  expect(file.text).toContain('    "grammar-001": { "done": true, "attempts": 2 },\n')
  expect(file.text).toContain('    "grammar-002": { "done": false, "attempts": 1 }\n')
})

test('the scores recorded for official mock exams travel in the file, and readiness with them', () => {
  let progress = emptyProgress()
  progress = recordOfficialExamScores(progress, 'adults-1', { reading: 93, listening: 90, writing: 91, speaking: 100 })
  progress = recordOfficialExamScores(progress, 'adults-2', { reading: 95, listening: 94, writing: 90, speaking: 92 })
  progress = recordOfficialExamScores(progress, 'youth-1', { reading: 70 })
  expect(readiness(progress, ['adults-1', 'adults-2', 'youth-1']).ready).toBe(true)

  const file = exportProgress(progress, morning)
  const onTheOtherDevice = imported(file.text).progress

  // A person can read them: one line per exam.
  expect(file.text).toContain('    "adults-1": { "reading": 93, "listening": 90, "writing": 91, "speaking": 100 },\n')
  expect(officialExamScores(onTheOtherDevice, 'adults-2')).toEqual({
    reading: 95,
    listening: 94,
    writing: 90,
    speaking: 92,
  })
  expect(officialExamScores(onTheOtherDevice, 'youth-1')).toEqual({ reading: 70 })
  expect(readiness(onTheOtherDevice, ['adults-1', 'adults-2', 'youth-1']).ready).toBe(true)
})

test('a file exported by version 2 imports, with its official mock exam scores', () => {
  // Written out by hand: a file as version 2 of the app exported it.
  const file = `{
  "app": "deutsch-tree",
  "about": "A backup of your learning progress in deutsch-tree.",
  "exported": "2026-11-26T08:30:00.000Z",
  "version": 2,
  "nodes": {
    "grammar-001": { "done": true, "attempts": 2 }
  },
  "officialExams": {
    "goethe-b1-modellsatz-erwachsene": { "reading": 93, "listening": 90, "writing": 88, "speaking": 100 },
    "an-exam-no-longer-listed": { "speaking": 77 }
  }
}
`

  const result = imported(file)

  expect(isDone(result.progress, 'grammar-001')).toBe(true)
  expect(officialExamScores(result.progress, 'goethe-b1-modellsatz-erwachsene')).toEqual({
    reading: 93,
    listening: 90,
    writing: 88,
    speaking: 100,
  })
  // Scores for an exam that today's list does not have are kept all the same.
  expect(officialExamScores(result.progress, 'an-exam-no-longer-listed')).toEqual({ speaking: 77 })
})

test('a file exported by version 1 imports', () => {
  // Written out by hand: a file as version 1 of the app exported it.
  const file = `{
  "app": "deutsch-tree",
  "about": "A backup of your learning progress in deutsch-tree.",
  "exported": "2026-11-26T08:30:00.000Z",
  "version": 1,
  "nodes": {
    "grammar-001": { "done": true, "attempts": 2 },
    "grammar-retired": { "done": true, "attempts": 1 }
  }
}
`

  const result = imported(file)

  expect(isDone(result.progress, 'grammar-001')).toBe(true)
  // A topic that today's content does not have is kept all the same.
  expect(isDone(result.progress, 'grammar-retired')).toBe(true)
  // Version 1 had no official mock exam scores: none are recorded.
  expect(result.progress.officialExams).toEqual({})
  expect(result.exported).toEqual(new Date('2026-11-26T08:30:00.000Z'))
})

test('a file from a newer version of the app is refused and says so', () => {
  const file = '{"app":"deutsch-tree","exported":"2031-01-01T00:00:00.000Z","version":99,"nodes":{},"somethingNew":{}}'

  expect(importProgress(file)).toEqual({ ok: false, problem: 'newer-version' })
})

test.each([
  [
    'a file cut off in the middle',
    '{\n  "app": "deutsch-tree",\n  "version": 1,\n  "nodes": {\n    "grammar-001": { "do',
  ],
  ['a file of another kind', 'Front;Back\nder Hund;the dog\n'],
  ['JSON from somewhere else', '{"version":1,"nodes":{"a":{"done":true}}}'],
  ['an empty file', ''],
])('a file that is not a progress file (%s) is refused', (_case, text) => {
  expect(importProgress(text)).toEqual({ ok: false, problem: 'not-progress' })
})
