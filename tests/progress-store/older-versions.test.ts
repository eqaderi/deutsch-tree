/**
 * Progress saved by an older version of the app must load in every later one.
 *
 * When SAVED_VERSION is raised, add a test here with text exactly as the
 * version before wrote it, written out by hand (never produced by today's
 * code), and say what today's app must make of it.
 */
import { expect, test } from 'vitest'
import { emptyProgress, isDone, nodeProgress } from '../../src/learning-engine/index.ts'
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
    version: 1,
    fields: ['nodes'],
  })
})

test('progress saved by version 1 loads', () => {
  const progress = read(
    '{"version":1,"nodes":{"grammar-001":{"done":true,"attempts":3},"grammar-002":{"done":false,"attempts":1}}}',
  )

  expect(nodeProgress(progress, 'grammar-001')).toEqual({ done: true, attempts: 3 })
  expect(nodeProgress(progress, 'grammar-002')).toEqual({ done: false, attempts: 1 })
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
