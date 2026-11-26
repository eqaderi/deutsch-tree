/**
 * Progress store: keeps the learner's progress in browser storage, so it is
 * still there after a reload, with no account. It also writes and reads the
 * progress file a learner exports as a backup or to move to another device.
 *
 * It only stores. How progress changes is decided by the learning engine: a
 * caller passes `update` a function built from the engine's rules.
 *
 * ## The saved shape and its version
 *
 * What is saved is the `Progress` object of the learning engine plus a
 * `version` number: `{ "version": 2, "nodes": { … }, "officialExams": { … } }`. The file a learner
 * exports is the same object with three more lines that say what it is.
 *
 * The version number is what keeps progress from being lost. An app reads
 * every version up to its own, and refuses a newer one without touching it,
 * because it would drop whatever it does not know and save the rest.
 *
 * To add a field to progress:
 *   1. Add it to `Progress` and `emptyProgress` in the learning engine.
 *   2. Give it a reader in `READERS` below. The type checker asks for it. The
 *      reader returns the empty value when the field is missing, which is how
 *      everything saved before the field existed still loads.
 *   3. Raise `SAVED_VERSION` by one and add a line to its history.
 *   4. Add a test that loads text written by the version before
 *      (`tests/progress-store/older-versions.test.ts`).
 * It is then saved, loaded, exported and imported with no further code.
 *
 * A new field inside a node (beside `done` and `attempts`) is the same, with
 * its line in `readNodes` in place of step 2. One that may be absent, and
 * whose absence means "nothing yet", needs no new version: `scores` (the
 * scores a learner typed in for a writing or speaking node) was added so.
 *
 * To change the shape of something already saved (rename, move, convert):
 * do the steps above, and add a step to `UPGRADES` that turns the old saved
 * object into the new one. A version that only added a field needs no step.
 *
 * Never remove a reader's tolerance or an upgrade step: a learner may come
 * back with a file exported years ago.
 */
import {
  EXAM_MODULES,
  emptyProgress,
  isScore,
  type ModuleScores,
  type NodeProgress,
  type Progress,
} from '../learning-engine/index.ts'

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
  /**
   * `'newer-version'` when browser storage holds progress saved by a newer
   * version of the app than this one. The store then leaves storage alone:
   * progress starts empty and lasts only until the page is closed. Reloading
   * the page brings the newer app, which can read it. Otherwise null.
   */
  readonly problem: 'newer-version' | null
}

/** Where progress lives in browser storage. */
export const STORAGE_KEY = 'deutsch-tree:progress'

/** Where saved text that could not be read is kept, so that replacing it destroys nothing. */
export const UNREADABLE_KEY = 'deutsch-tree:progress:unreadable'

/**
 * The version of the saved shape written today.
 *
 * History, one line per version:
 *   1  nodes: done and number of attempts, by node identifier
 *   2  officialExams: the module scores recorded for official mock exams, by exam identifier
 */
export const SAVED_VERSION = 2

/** A saved object as it comes out of JSON, before anything is known about it. */
type Saved = Record<string, unknown>

/**
 * Step `n` turns the saved object of version `n` into that of version
 * `n + 1`. Only a version that reshaped saved data has a step; see the top
 * of this file. Example: `2: (saved) => ({ ...saved, exams: saved.mockExams })`.
 */
export type Upgrades = Record<number, (saved: Saved) => Saved>

const UPGRADES: Upgrades = {}

/**
 * One reader per field of `Progress`: the field's value from what was saved
 * under its name. A reader never fails. For a missing value it returns the
 * empty value, and it skips what it cannot understand.
 */
const READERS: { [Field in keyof Progress]-?: (saved: unknown) => Progress[Field] } = {
  nodes: readNodes,
  officialExams: readOfficialExams,
}

function readNodes(saved: unknown): Record<string, NodeProgress> {
  const nodes: Record<string, NodeProgress> = {}
  if (!isRecord(saved)) return nodes
  // Every identifier is kept, also one the content no longer has: content may
  // change, and what a learner has done is never thrown away.
  for (const [id, node] of Object.entries(saved)) {
    if (!isRecord(node)) continue
    nodes[id] = {
      done: node.done === true,
      attempts: wholeNumber(node.attempts),
      // Absent stays absent: a node without entered scores is saved as it always was.
      ...(Array.isArray(node.scores) ? { scores: node.scores.filter(isScore) } : {}),
    }
  }
  return nodes
}

/**
 * The recorded module scores of official mock exams. A score that is not a
 * whole number from 0 to 100 is skipped, and so is an exam left with none.
 */
function readOfficialExams(saved: unknown): Record<string, ModuleScores> {
  const exams: Record<string, ModuleScores> = {}
  if (!isRecord(saved)) return exams
  // Every identifier is kept, also of an exam the content no longer lists.
  for (const [id, savedScores] of Object.entries(saved)) {
    if (!isRecord(savedScores)) continue
    const scores: ModuleScores = {}
    for (const module of EXAM_MODULES) {
      const score = savedScores[module]
      if (isScore(score)) scores[module] = score
    }
    if (Object.keys(scores).length > 0) exams[id] = scores
  }
  return exams
}

/** Why saved text or a file was not read. */
export type ReadProblem =
  /** Not progress at all: other text, another shape, a damaged file. */
  | 'not-progress'
  /** Saved by a newer version of the app than this one. */
  | 'newer-version'

export type ReadProgress = { ok: true; progress: Progress } | { ok: false; problem: ReadProblem }

/** The saved shape an app reads: its version and the steps that lead up to it. */
export interface SavedFormat {
  version: number
  upgrades: Upgrades
}

const TODAY: SavedFormat = { version: SAVED_VERSION, upgrades: UPGRADES }

/** Progress as the text that is saved. */
export function serialiseProgress(progress: Progress): string {
  return JSON.stringify(savedObject(progress))
}

/**
 * Saved text back into progress, whichever version of the app saved it.
 * (`format` is for tests of the upgrade steps; the app never passes it.)
 */
export function parseProgress(text: string, format: SavedFormat = TODAY): ReadProgress {
  return readSaved(parseJson(text), format)
}

function savedObject(progress: Progress): Saved {
  return { version: SAVED_VERSION, ...progress }
}

function readSaved(saved: unknown, format: SavedFormat): ReadProgress {
  if (!isRecord(saved)) return { ok: false, problem: 'not-progress' }
  const version = saved.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, problem: 'not-progress' }
  }
  if (version > format.version) return { ok: false, problem: 'newer-version' }

  let current = saved
  for (let from = version; from < format.version; from += 1) {
    current = format.upgrades[from]?.(current) ?? current
  }

  const progress = emptyProgress()
  for (const field of Object.keys(READERS) as Array<keyof Progress>) {
    assign(progress, field, READERS[field](current[field]))
  }
  return { ok: true, progress }
}

function assign<Field extends keyof Progress>(progress: Progress, field: Field, value: Progress[Field]): void {
  progress[field] = value
}

/** The name that marks a file as a progress file of this app. */
const APP_NAME = 'deutsch-tree'

const ABOUT_THE_FILE =
  'A backup of your learning progress in deutsch-tree. To bring it back, open deutsch-tree, choose "Back up progress" and import this file. It holds which topics you have done and your scores, nothing else, and it is never sent anywhere.'

export interface ProgressFile {
  /** A file name that says what the file is and the day it was made. */
  name: string
  text: string
}

/**
 * The progress as a file for the learner to keep: the saved object, headed
 * by the app's name, a sentence on what the file is, and the moment of the
 * export. Laid out so that a person can read it.
 */
export function exportProgress(progress: Progress, now: Date): ProgressFile {
  const { version, ...fields } = savedObject(progress)
  const file = { app: APP_NAME, about: ABOUT_THE_FILE, exported: now.toISOString(), version, ...fields }
  // The day as the learner's own clock has it, which is what they will look for.
  const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-')
  return { name: `${APP_NAME}-progress-${day}.json`, text: `${readableJson(file)}\n` }
}

export type ImportedProgress =
  | {
      ok: true
      progress: Progress
      /** When the file was exported, if it says so. */
      exported: Date | null
    }
  | { ok: false; problem: ReadProblem }

/** The text of a progress file back into progress, whichever version of the app exported it. */
export function importProgress(text: string): ImportedProgress {
  const file = parseJson(text)
  if (!isRecord(file) || file.app !== APP_NAME) return { ok: false, problem: 'not-progress' }
  const read = readSaved(file, TODAY)
  if (!read.ok) return read
  const exported = typeof file.exported === 'string' ? new Date(file.exported) : null
  return { ...read, exported: exported && !Number.isNaN(exported.getTime()) ? exported : null }
}

/**
 * JSON with the first two levels on lines of their own and everything deeper
 * on one line: one line per topic, per exam, per whatever a field lists.
 */
function readableJson(value: unknown, depth = 0): string {
  const inner = '  '.repeat(depth + 1)
  const close = '  '.repeat(depth)
  if (depth < 2 && Array.isArray(value) && value.length > 0) {
    return `[\n${value.map((item) => inner + readableJson(item, depth + 1)).join(',\n')}\n${close}]`
  }
  if (depth < 2 && isRecord(value) && Object.keys(value).length > 0) {
    const lines = Object.entries(value).map(
      ([key, item]) => `${inner}${JSON.stringify(key)}: ${readableJson(item, depth + 1)}`,
    )
    return `{\n${lines.join(',\n')}\n${close}}`
  }
  return onOneLine(value)
}

function onOneLine(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(onOneLine).join(', ')}]`
  if (isRecord(value)) {
    const parts = Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${onOneLine(item)}`)
    return parts.length > 0 ? `{ ${parts.join(', ')} }` : '{}'
  }
  return JSON.stringify(value) ?? 'null'
}

/**
 * A store on the given storage (the browser's `localStorage`). With `null`,
 * or with storage that refuses to work (some private windows), progress still
 * works but lasts only until the page is closed.
 */
export function createProgressStore(storage: KeyValueStorage | null): ProgressStore {
  const loaded = load(storage)
  let progress = loaded.progress
  const problem = loaded.problem
  const listeners = new Set<() => void>()

  return {
    problem,
    get: () => progress,
    update(change) {
      progress = change(progress)
      if (!problem) {
        try {
          storage?.setItem(STORAGE_KEY, serialiseProgress(progress))
        } catch {
          // Storage is full or switched off. The progress stays in memory.
        }
      }
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function load(storage: KeyValueStorage | null): Pick<ProgressStore, 'problem'> & { progress: Progress } {
  try {
    const text = storage?.getItem(STORAGE_KEY)
    const read = text ? parseProgress(text) : undefined
    if (read?.ok) return { progress: read.progress, problem: null }
    if (read?.problem === 'newer-version') return { progress: emptyProgress(), problem: 'newer-version' }
    // Damaged text is of no use to the app, but it may be to a person. It is
    // kept beside the progress that is about to replace it.
    if (text) storage?.setItem(UNREADABLE_KEY, text)
  } catch {
    // Storage is switched off.
  }
  return { progress: emptyProgress(), problem: null }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function wholeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
