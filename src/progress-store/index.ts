/**
 * Progress store: keeps the learner's progress in browser storage, so it is
 * still there after a reload, with no account.
 *
 * It only stores. How progress changes is decided by the learning engine: a
 * caller passes `update` a function built from the engine's rules.
 *
 * The saved text carries a version number. When the saved shape changes,
 * raise SAVED_VERSION and teach `parseProgress` to read the older versions.
 * A new field that may be absent needs no new version: `scores` was added
 * that way, and text saved before it reads as "no score yet".
 */
import { emptyProgress, FULL_SCORE, type NodeProgress, type Progress } from '../learning-engine/index.ts'

/** The part of the browser's `localStorage` that the store needs. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface ProgressStore {
  /** The progress as it is now. The same object until the next change. */
  get(): Progress
  /** Replaces the progress with `change(progress)`, saves it and tells the subscribers. */
  update(change: (progress: Progress) => Progress): void
  /** Calls `listener` after every change. Returns the function that stops it. */
  subscribe(listener: () => void): () => void
}

/** Where progress lives in browser storage. */
export const STORAGE_KEY = 'deutsch-tree:progress'

/** The version of the saved shape written today. */
export const SAVED_VERSION = 1

/** Progress as the text that is saved. */
export function serialiseProgress(progress: Progress): string {
  return JSON.stringify({ version: SAVED_VERSION, nodes: progress.nodes })
}

/** Saved text back into progress. Null when the text is not progress this version can read. */
export function parseProgress(text: string): Progress | null {
  let saved: unknown
  try {
    saved = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(saved) || saved.version !== SAVED_VERSION || !isRecord(saved.nodes)) return null

  const nodes: Record<string, NodeProgress> = {}
  for (const [id, node] of Object.entries(saved.nodes)) {
    if (!isRecord(node)) continue
    const attempts = node.attempts
    nodes[id] = {
      done: node.done === true,
      attempts: typeof attempts === 'number' && Number.isInteger(attempts) && attempts > 0 ? attempts : 0,
      // Absent stays absent: a node without entered scores is saved as it always was.
      ...(Array.isArray(node.scores) ? { scores: node.scores.filter(isScore) } : {}),
    }
  }
  return { nodes }
}

/**
 * A store on the given storage (the browser's `localStorage`). With `null`,
 * or with storage that refuses to work (some private windows), progress still
 * works but lasts only until the page is closed.
 */
export function createProgressStore(storage: KeyValueStorage | null): ProgressStore {
  let progress = load(storage)
  const listeners = new Set<() => void>()

  return {
    get: () => progress,
    update(change) {
      progress = change(progress)
      try {
        storage?.setItem(STORAGE_KEY, serialiseProgress(progress))
      } catch {
        // Storage is full or switched off. The progress stays in memory.
      }
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function load(storage: KeyValueStorage | null): Progress {
  try {
    const text = storage?.getItem(STORAGE_KEY)
    return (text ? parseProgress(text) : null) ?? emptyProgress()
  } catch {
    return emptyProgress()
  }
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= FULL_SCORE
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
