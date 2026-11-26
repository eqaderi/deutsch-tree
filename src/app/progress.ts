/**
 * The learner's progress, for components. One store for the whole app, kept
 * in this browser's storage by the progress store.
 *
 *   const progress = useProgress()            // re-renders when it changes
 *   isDone(progress, node.id)                 // read it with the learning engine
 *   updateProgress((p) => applyAttempt(p, node.id, result))   // change it with the learning engine
 */
import { useSyncExternalStore } from 'react'
import type { Progress } from '../learning-engine/index.ts'
import { createProgressStore, type KeyValueStorage } from '../progress-store/index.ts'

function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage
  } catch {
    // Storage can be switched off. Progress then lasts until the page is closed.
    return null
  }
}

const store = createProgressStore(browserStorage())

export function useProgress(): Progress {
  return useSyncExternalStore(store.subscribe, store.get)
}

/** Replaces the progress with `change(progress)` and saves it. */
export function updateProgress(change: (progress: Progress) => Progress): void {
  store.update(change)
}

/**
 * Set when this browser holds progress from a newer version of the app, which
 * this one cannot read and does not touch. The page frame tells the learner.
 */
export const progressProblem = store.problem
