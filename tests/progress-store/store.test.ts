import { expect, test } from 'vitest'
import { applyAttempt, emptyProgress, isDone } from '../../src/learning-engine/index.ts'
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
  expect(JSON.parse(text ?? '')).toMatchObject({ version: 1 })
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
  ['a version from the future', '{"version":99,"nodes":{"grammar-001":{"done":true}}}'],
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
