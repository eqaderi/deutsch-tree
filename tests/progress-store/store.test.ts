import { expect, test } from 'vitest'
import {
  applyAttempt,
  emptyProgress,
  isDone,
  officialExamScores,
  recordOfficialExamScores,
} from '../../src/learning-engine/index.ts'
import { createProgressStore, type KeyValueStorage } from '../../src/progress-store/index.ts'

/** Browser storage as the store sees it: text kept under a key. */
function browserStorage(saved: Record<string, string> = {}): KeyValueStorage & { saved: Record<string, string> } {
  return {
    saved,
    getItem: (key) => saved[key] ?? null,
    setItem: (key, value) => {
      saved[key] = value
    },
  }
}

const passGrammar1 = (progress = emptyProgress()) => applyAttempt(progress, 'grammar-001', { passed: true })

test('a browser that was never used has empty progress', () => {
  const store = createProgressStore(browserStorage())

  expect(store.get()).toEqual(emptyProgress())
})

test('progress is still there when the app starts again on the same browser', () => {
  const storage = browserStorage()
  createProgressStore(storage).update(passGrammar1)

  const afterReload = createProgressStore(storage)

  expect(isDone(afterReload.get(), 'grammar-001')).toBe(true)
  expect(isDone(afterReload.get(), 'grammar-002')).toBe(false)
})

test('saved progress carries a version number', () => {
  const storage = browserStorage()

  createProgressStore(storage).update(passGrammar1)

  const [text] = Object.values(storage.saved)
  expect(JSON.parse(text ?? '')).toMatchObject({ version: expect.any(Number) })
})

test('progress saved by version 1 of the app loads', () => {
  // Written out by hand: this is what version 1 put into browser storage.
  const storage = browserStorage({
    'deutsch-tree:progress':
      '{"version":1,"nodes":{"grammar-001":{"done":true,"attempts":3},"grammar-002":{"done":false,"attempts":1}}}',
  })

  const progress = createProgressStore(storage).get()

  expect(isDone(progress, 'grammar-001')).toBe(true)
  expect(isDone(progress, 'grammar-002')).toBe(false)
})

test.each([
  ['text that is not progress', 'hello'],
  ['another shape', '["grammar-001"]'],
])('saved data that cannot be read (%s) starts the learner empty instead of breaking the app', (_case, text) => {
  const store = createProgressStore(browserStorage({ 'deutsch-tree:progress': text }))

  expect(store.get()).toEqual(emptyProgress())
  store.update(passGrammar1)
  expect(isDone(store.get(), 'grammar-001')).toBe(true)
})

test('progress works for the visit when the browser refuses to store anything', () => {
  const refusing: KeyValueStorage = {
    getItem: () => {
      throw new Error('storage is switched off')
    },
    setItem: () => {
      throw new Error('storage is switched off')
    },
  }

  for (const storage of [refusing, null]) {
    const store = createProgressStore(storage)
    store.update(passGrammar1)

    expect(isDone(store.get(), 'grammar-001')).toBe(true)
  }
})

test('whoever subscribed hears of every change until they stop listening', () => {
  const store = createProgressStore(browserStorage())
  let heard = 0
  const stop = store.subscribe(() => {
    heard += 1
  })

  store.update(passGrammar1)
  store.update(passGrammar1)
  stop()
  store.update(passGrammar1)

  expect(heard).toBe(2)
})

test('progress saved by a newer version of the app is left alone, not overwritten', () => {
  const fromTheFuture = '{"version":99,"nodes":{"grammar-001":{"done":true}},"somethingNew":[1,2,3]}'
  const storage = browserStorage({ 'deutsch-tree:progress': fromTheFuture })

  const store = createProgressStore(storage)

  // The app says why, and still works for the visit.
  expect(store.problem).toBe('newer-version')
  store.update(passGrammar1)
  expect(isDone(store.get(), 'grammar-001')).toBe(true)
  expect(storage.saved).toEqual({ 'deutsch-tree:progress': fromTheFuture })
})

test('progress that loads has no problem to report', () => {
  expect(createProgressStore(browserStorage()).problem).toBeNull()
})

test('saved text that cannot be read is set aside before new progress takes its place', () => {
  const damaged = '{"version":1,"nodes":{"grammar-001":{"done":tr'
  const storage = browserStorage({ 'deutsch-tree:progress': damaged })

  const store = createProgressStore(storage)
  store.update(passGrammar1)

  expect(storage.saved['deutsch-tree:progress:unreadable']).toBe(damaged)
  expect(isDone(createProgressStore(storage).get(), 'grammar-001')).toBe(true)
})

test('progress for a topic that the content no longer has is kept', () => {
  // The store knows nothing of content: whatever was done stays, whatever the tree shows today.
  const storage = browserStorage({
    'deutsch-tree:progress': '{"version":1,"nodes":{"grammar-removed":{"done":true,"attempts":2}}}',
  })

  const store = createProgressStore(storage)
  store.update(passGrammar1)

  const afterReload = createProgressStore(storage).get()
  expect(afterReload.nodes['grammar-removed']).toEqual({ done: true, attempts: 2 })
  expect(isDone(afterReload, 'grammar-001')).toBe(true)
})

test('recorded scores of an official mock exam are still there when the app starts again', () => {
  const storage = browserStorage()
  const store = createProgressStore(storage)
  store.update(passGrammar1)
  store.update((progress) => recordOfficialExamScores(progress, 'adults-1', { reading: 93, listening: 0 }))

  const afterReload = createProgressStore(storage).get()

  expect(officialExamScores(afterReload, 'adults-1')).toEqual({ reading: 93, listening: 0 })
  expect(officialExamScores(afterReload, 'adults-2')).toEqual({})
  expect(isDone(afterReload, 'grammar-001')).toBe(true)
})

test('a saved score that is not a whole number from 0 to 100 counts as not recorded', () => {
  const storage = browserStorage({
    'deutsch-tree:progress': JSON.stringify({
      version: 2,
      nodes: {},
      officialExams: {
        'adults-1': { reading: 93, listening: '97', writing: 100.5, speaking: 101, other: 95 },
        'adults-2': 'ninety',
        'adults-3': { reading: -1 },
      },
    }),
  })

  const progress = createProgressStore(storage).get()

  expect(progress.officialExams).toEqual({ 'adults-1': { reading: 93 } })
})
