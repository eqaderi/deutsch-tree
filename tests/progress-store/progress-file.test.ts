/**
 * The progress file: what a learner exports as a backup and imports on
 * another device, or on this one after the browser was cleared.
 */
import { expect, test } from 'vitest'
import { applyAttempt, emptyProgress, isDone, type Progress } from '../../src/learning-engine/index.ts'
import { exportProgress, importProgress, SAVED_VERSION } from '../../src/progress-store/index.ts'

/** A morning in Berlin, in whatever time zone the test runs. */
const morning = new Date(2026, 10, 26, 9, 30)

function someProgress(): Progress {
  let progress = emptyProgress()
  progress = applyAttempt(progress, 'grammar-001', { passed: false })
  progress = applyAttempt(progress, 'grammar-001', { passed: true })
  progress = applyAttempt(progress, 'grammar-002', { passed: false })
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
