/**
 * Pack format: what a private pack folder contains. The pack builder writes
 * it; the pack loader and the private exam view read it. The prose version,
 * with an example, is docs/private-packs.md.
 *
 *   private/<pack id>/
 *     pack.json                 the description (packDescriptionSchema)
 *     answers.json              the answer key (packAnswerKeySchema)
 *     exams/01/pages.pdf        every page of exam 1, copied from the book
 *     exams/01/hoeren-1.mp3     the recording of exam 1, Hören, part 1
 *
 * Every path inside the two JSON files is relative to the pack folder and
 * uses forward slashes. Pages and items are counted from 1.
 */
import { z } from 'zod'

/** Raised when a change would make older packs unreadable. */
export const PACK_FORMAT = 1

/** The folder, inside the project, that holds one subfolder per pack. Never published. */
export const PACKS_FOLDER = 'private'
export const PACK_DESCRIPTION_FILE = 'pack.json'
export const PACK_ANSWER_KEY_FILE = 'answers.json'
/** In the packs folder itself, beside the packs: which packs it holds (packListSchema). */
export const PACK_LIST_FILE = 'packs.json'

/**
 * A pack's id, which is also its folder's name, and the id of a module of a
 * book: lower-case words joined by hyphens. The start files' servers hold
 * the same rule in their own languages.
 */
export const PACK_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/

const count = z.number().int().positive()
const id = z.string().regex(PACK_ID, 'must be lower-case words joined by hyphens')

/** A run of pages, both ends included. */
const pageRange = z.strictObject({ first: count, last: count })

const packItem = z.strictObject({
  /** The item's number as printed on the page, for example 7. */
  number: count,
  /** Every answer the answer sheet offers for this item, for example ["a", "b", "c"]. */
  choices: z.array(z.string().min(1)).min(2),
})

const packRecording = z.strictObject({
  /** Path of the copied recording inside the pack. */
  file: z.string().min(1),
  /** The file's name in the learner's audio folder, kept for checking by hand. */
  source: z.string().min(1),
})

const packPart = z.strictObject({
  number: count,
  /** Pages of this part inside the exam's own PDF (`pagesFile`). */
  pages: pageRange,
  /** The same pages counted in the learner's original PDF, for checking against the book. */
  sourcePages: pageRange,
  items: z.array(packItem).min(1),
  /** In playing order. Empty for a part that has no recording. */
  recordings: z.array(packRecording),
})

const packModule = z.strictObject({
  /** For example "lesen" or "hoeren". Matches the module id in the answer key. */
  id,
  /** The module's German name, for example "Hören". */
  title: z.string().min(1),
  pages: pageRange,
  sourcePages: pageRange,
  /** Empty for a module that is not scored from the answer key (Schreiben, Sprechen). */
  parts: z.array(packPart),
})

const packExam = z.strictObject({
  number: count,
  /** Path of the PDF that holds this exam's pages. */
  pagesFile: z.string().min(1),
  pageCount: count,
  sourcePages: pageRange,
  /** In the order they appear in the book. */
  modules: z.array(packModule).min(1),
})

/** pack.json: which pages and recordings belong to which exam part. */
export const packDescriptionSchema = z.strictObject({
  format: z.literal(PACK_FORMAT),
  /** The name of the pack's folder. */
  id,
  name: z.string().min(1),
  examCount: count,
  exams: z.array(packExam).min(1),
})

const packAnswer = z.strictObject({
  /** The item's number, as in the description. */
  item: count,
  /** One of the item's choices. */
  answer: z.string().min(1),
})

const packAnswerRepair = z.strictObject({
  exam: count,
  module: id,
  part: count,
  /** The item the answer belongs to, by its place in the key. */
  item: count,
  /** The number the book's key prints at that place. */
  printed: count,
})

/** answers.json: the right answer for every item of every scored part. */
export const packAnswerKeySchema = z.strictObject({
  format: z.literal(PACK_FORMAT),
  exams: z.array(
    z.strictObject({
      number: count,
      modules: z.array(
        z.strictObject({
          id,
          parts: z.array(z.strictObject({ number: count, answers: z.array(packAnswer).min(1) })).min(1),
        }),
      ),
    }),
  ),
  /**
   * Places where the book's key prints a wrong item number. The builder reads
   * the key in order, so the answers above are already right; this list is
   * for checking those places against the book by hand.
   */
  repairs: z.array(packAnswerRepair),
})

/**
 * private/packs.json: the ids of the packs in the folder, in name order.
 * A browser cannot list a folder, so this is how the app finds the packs.
 * The pack builder rewrites it after every build, from the subfolders that
 * hold a pack.json; the dev server answers it from the folder as it is; the
 * start files' servers (src/start-files/) rewrite it the same way when they start.
 */
export const packListSchema = z.strictObject({
  format: z.literal(PACK_FORMAT),
  packs: z.array(id),
})

export type PackList = z.infer<typeof packListSchema>
export type PageRange = z.infer<typeof pageRange>
export type PackItem = z.infer<typeof packItem>
export type PackRecording = z.infer<typeof packRecording>
export type PackPart = z.infer<typeof packPart>
export type PackModule = z.infer<typeof packModule>
export type PackExam = z.infer<typeof packExam>
export type PackDescription = z.infer<typeof packDescriptionSchema>
export type PackAnswer = z.infer<typeof packAnswer>
export type PackAnswerRepair = z.infer<typeof packAnswerRepair>
export type PackAnswerKey = z.infer<typeof packAnswerKeySchema>

/** In the packs folder too: the address a phone opens, written by a start file's server when it starts. */
export const LOCAL_ADDRESS_FILE = 'address.json'

/**
 * private/address.json: the address that a phone or tablet on the same network
 * opens to reach the app on this computer, or null when the computer is on no
 * network. Only a start file writes it (src/start-files/folder/server/), so the
 * dev server and the public site have none.
 */
export const localAddressSchema = z.strictObject({
  format: z.literal(PACK_FORMAT),
  phone: z
    .string()
    .regex(/^http:\/\/[^/]+\/$/)
    .nullable(),
})
