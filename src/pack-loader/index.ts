/**
 * Pack loader: finds the private packs at run time and hands them to the
 * private exam view. It runs in the browser.
 *
 * Packs live in the `private` folder beside the site's index.html. A browser
 * cannot list a folder, so the loader reads `private/packs.json` (the ids of
 * the packs, `packListSchema`), then each pack's `pack.json`. Nothing is
 * configured:
 *
 *   - `pnpm dev` answers packs.json from the project's private folder as it is;
 *   - the pack builder rewrites packs.json after every build, so a folder
 *     served by a start file has it;
 *   - on the public site there is no private folder: the request fails, the
 *     loader finds no pack, and the app explains where to put one.
 *
 * Any answer that is not a readable list (a 404, a page instead of JSON, a
 * newer format) counts as "no pack". A listed pack whose description cannot
 * be read is reported as such, so the learner sees which folder is broken.
 */
import {
  PACK_ANSWER_KEY_FILE,
  PACK_DESCRIPTION_FILE,
  PACK_LIST_FILE,
  PACKS_FOLDER,
  type PackAnswerKey,
  type PackDescription,
  type PackExam,
  type PackModule,
  type PackPart,
  packAnswerKeySchema,
  packDescriptionSchema,
  packListSchema,
} from '../content-model/pack.ts'
import type { KeyedAnswer } from '../learning-engine/index.ts'

export type FoundPack = { id: string; description: PackDescription } | { id: string; unreadable: true }

/** The address of a file of the private folder, relative to the page, as the browser requests it. */
export function packFileUrl(file: string): string {
  return new URL(`${PACKS_FOLDER}/${file}`, document.baseURI).href
}

/** The address of a file inside one pack, for example its recordings and pages. */
export function fileOfPack(packId: string, file: string): string {
  return packFileUrl(`${packId}/${file}`)
}

/** The JSON of a file, or undefined when there is none or it is not JSON. */
async function json(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return undefined
    return await response.json()
  } catch {
    return undefined
  }
}

async function findAll(): Promise<FoundPack[]> {
  const list = packListSchema.safeParse(await json(packFileUrl(PACK_LIST_FILE)))
  if (!list.success) return []
  return Promise.all(
    list.data.packs.map(async (id): Promise<FoundPack> => {
      const description = packDescriptionSchema.safeParse(await json(fileOfPack(id, PACK_DESCRIPTION_FILE)))
      return description.success && description.data.id === id
        ? { id, description: description.data }
        : { id, unreadable: true }
    }),
  )
}

let found: Promise<FoundPack[]> | undefined

/**
 * The packs in the private folder, in the order of packs.json; empty when
 * there is none, as on the public site. The same promise for every call, so
 * it can be passed to React's `use()`.
 */
export function findPacks(): Promise<FoundPack[]> {
  found ??= findAll()
  return found
}

const keys = new Map<string, Promise<PackAnswerKey | undefined>>()

/** A pack's answer key; undefined when it cannot be read. */
export function loadAnswerKey(packId: string): Promise<PackAnswerKey | undefined> {
  let key = keys.get(packId)
  if (!key) {
    key = json(fileOfPack(packId, PACK_ANSWER_KEY_FILE)).then((data) => {
      const parsed = packAnswerKeySchema.safeParse(data)
      return parsed.success ? parsed.data : undefined
    })
    keys.set(packId, key)
  }
  return key
}

/** One module of one exam of a pack, with the exam it belongs to. */
export interface PackModuleOf {
  exam: PackExam
  module: PackModule
}

/** The module `moduleId` of exam `examNumber`, or undefined when the pack has none such. */
export function moduleOf(description: PackDescription, examNumber: number, moduleId: string): PackModuleOf | undefined {
  const exam = description.exams.find((candidate) => candidate.number === examNumber)
  const module = exam?.modules.find((candidate) => candidate.id === moduleId)
  return exam && module ? { exam, module } : undefined
}

/** The key's answers for one part, by item number; undefined when the key has no such part. */
export function answersOf(
  key: PackAnswerKey,
  examNumber: number,
  moduleId: string,
  part: Pick<PackPart, 'number'>,
): KeyedAnswer[] | undefined {
  return key.exams
    .find((exam) => exam.number === examNumber)
    ?.modules.find((module) => module.id === moduleId)
    ?.parts.find((candidate) => candidate.number === part.number)?.answers
}
