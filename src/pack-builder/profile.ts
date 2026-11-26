/**
 * Book profile: everything the pack builder has to be told about one book,
 * because it differs from book to book. The exam's structure (modules, parts,
 * items and their choices), and how to recognise headings in the exam PDF,
 * answers in the answer-key PDF and recordings by their file names.
 *
 * The defaults describe the Goethe-Zertifikat B1 and a book with plain
 * headings. A profile file overrides them key by key; docs/private-packs.md
 * explains every key.
 *
 * Patterns are JavaScript regular expressions. They are matched against the
 * text of a page with one line of the page per line of text; `^` and `$`
 * stand for the start and end of a line. Write `(?i:...)` to ignore case.
 */
import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'
import { z } from 'zod'

const pattern = z
  .string()
  .min(1)
  .superRefine((source, ctx) => {
    try {
      new RegExp(source, 'gmu')
    } catch (error) {
      ctx.addIssue({ code: 'custom', message: `is not a valid pattern: ${(error as Error).message}` })
    }
  })

const moduleId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be lower-case words joined by hyphens')
const pageNumber = z.number().int().positive()
const choices = z.array(z.string().min(1)).min(2)

const partProfile = z.strictObject({
  /** How many items the part has. */
  items: z.number().int().positive(),
  /**
   * The answers an item can have. One list for every item of the part, or a
   * list of lists that the items take in turn (first item the first list,
   * second item the second, and round again).
   */
  choices: z.union([choices, z.array(choices).min(1)]),
})

const moduleProfile = z.strictObject({
  id: moduleId,
  /** The module's German name, shown in the app and in reports. */
  title: z.string().min(1),
  /** The scored parts, in order. Leave out for a module without an answer key. */
  parts: z.array(partProfile).default([]),
  /** True for the module whose parts have recordings. */
  recordings: z.boolean().default(false),
})

export const bookProfileSchema = z
  .strictObject({
    /** How many exams the book has. When given, any other number is an error. */
    exams: z.number().int().positive().optional(),
    /** The modules of one exam, in the order they appear in the book. */
    modules: z.array(moduleProfile).min(1),
    examPdf: z.strictObject({
      /** Pages before this one are skipped (contents, introduction). */
      firstPage: pageNumber.default(1),
      /** Pages after this one are skipped (transcripts, answer sheets). Default: the last page. */
      lastPage: pageNumber.optional(),
      /** An exam's heading. Group 1 is the exam's number. */
      exam: pattern,
      /** A module's heading, by module id. */
      modules: z.record(moduleId, pattern),
      /** A part's heading. Group 1 is the part's number. */
      part: pattern,
    }),
    answerKey: z.strictObject({
      /** How many columns of text a page of the key has. */
      columns: z.number().int().positive().default(1),
      /** An exam's heading in the key. Group 1 is the exam's number. */
      exam: pattern,
      /** A module's heading in the key, by module id. */
      modules: z.record(moduleId, pattern),
      /** A part's heading in the key; group 1 is its number. Null when the key has none. */
      part: pattern.nullable(),
      /** One answer. Group 1 is the printed item number, group 2 the answer as printed. */
      item: pattern,
      /** Printed answers that stand for a choice, for example r: richtig. Case is ignored. */
      answers: z.record(z.string(), z.string()).default({}),
    }),
    recordings: z.strictObject({
      /**
       * Matched against a recording's file name without its ending. Either
       * the named groups `exam` and `part` (both numbers), or the named group
       * `track`: a running number, with one recording per part, in book order.
       */
      file: pattern,
      /** Files in the audio folder that are not recordings of a part. */
      ignore: pattern.optional(),
    }),
  })
  .superRefine((profile, ctx) => {
    const ids = profile.modules.map((module) => module.id)
    ids.forEach((id, index) => {
      if (ids.indexOf(id) !== index) {
        ctx.addIssue({ code: 'custom', path: ['modules', index, 'id'], message: `"${id}" is used twice` })
      }
    })
    for (const module of profile.modules) {
      if (profile.examPdf.modules[module.id] === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['examPdf', 'modules'],
          message: `has no heading pattern for the module "${module.id}"`,
        })
      }
      if (module.parts.length > 0 && profile.answerKey.modules[module.id] === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['answerKey', 'modules'],
          message: `has no heading pattern for the module "${module.id}"`,
        })
      }
      if (module.recordings && module.parts.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['modules', ids.indexOf(module.id), 'recordings'],
          message: 'needs parts: a recording belongs to a part',
        })
      }
    }
    if (profile.modules.filter((module) => module.recordings).length > 1) {
      ctx.addIssue({ code: 'custom', path: ['modules'], message: 'only one module can have recordings' })
    }
    const groups = namedGroups(profile.recordings.file)
    const byPart = groups.includes('exam') && groups.includes('part')
    if (byPart === groups.includes('track')) {
      ctx.addIssue({
        code: 'custom',
        path: ['recordings', 'file'],
        message: 'needs either the named groups (?<exam>...) and (?<part>...), or the named group (?<track>...)',
      })
    }
  })

export type BookProfile = z.infer<typeof bookProfileSchema>
export type ModuleProfile = BookProfile['modules'][number]

/** A profile file: any subset of the keys; the rest keep their defaults. */
export type BookProfileOverrides = {
  [Key in keyof z.input<typeof bookProfileSchema>]?: Key extends 'examPdf' | 'answerKey' | 'recordings'
    ? Partial<z.input<typeof bookProfileSchema>[Key]>
    : z.input<typeof bookProfileSchema>[Key]
}

export function namedGroups(source: string): string[] {
  return [...source.matchAll(/\(\?<([A-Za-z_]\w*)>/g)].map((match) => match[1] as string)
}

const TRUE_FALSE = ['richtig', 'falsch']
const A_TO_C = ['a', 'b', 'c']

/**
 * The Goethe-Zertifikat B1: Lesen has 30 items in five parts, Hören has 30
 * items in four parts, each with one recording. Schreiben and Sprechen have
 * pages but no answer key.
 */
export const DEFAULT_PROFILE: z.input<typeof bookProfileSchema> = {
  modules: [
    {
      id: 'lesen',
      title: 'Lesen',
      parts: [
        { items: 6, choices: TRUE_FALSE },
        { items: 6, choices: A_TO_C },
        // The letter of the matching advert, or 0 when none matches.
        { items: 7, choices: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', '0'] },
        { items: 7, choices: ['ja', 'nein'] },
        { items: 4, choices: A_TO_C },
      ],
    },
    {
      id: 'hoeren',
      title: 'Hören',
      recordings: true,
      parts: [
        // Five short texts, each with a richtig/falsch item and then an a/b/c item.
        { items: 10, choices: [TRUE_FALSE, A_TO_C] },
        { items: 5, choices: A_TO_C },
        { items: 7, choices: TRUE_FALSE },
        { items: 8, choices: A_TO_C },
      ],
    },
    { id: 'schreiben', title: 'Schreiben' },
    { id: 'sprechen', title: 'Sprechen' },
  ],
  examPdf: {
    exam: '^Modelltest (\\d+)$',
    modules: { lesen: '^Lesen$', hoeren: '^Hören$', schreiben: '^Schreiben$', sprechen: '^Sprechen$' },
    part: '^Teil (\\d+)$',
  },
  answerKey: {
    exam: '^Modelltest (\\d+)$',
    modules: { lesen: '^Lesen$', hoeren: '^Hören$' },
    part: '^Teil (\\d+)\\b',
    item: '(?<!\\S)(\\d{1,2})[.):]?[ \\t]+(?i:(richtig|falsch|ja|nein|[a-j0]))(?!\\S)',
  },
  recordings: {
    // The first number in the file name is the exam, the next one the part.
    file: '^\\D*(?<exam>\\d+)\\D+(?<part>\\d+)\\D*$',
  },
}

export type ProfileResult = { profile: BookProfile; errors: [] } | { profile: null; errors: string[] }

/** The defaults with a book's own values laid over them, checked. */
export function resolveProfile(overrides: BookProfileOverrides = {}): ProfileResult {
  const merged = {
    ...DEFAULT_PROFILE,
    ...overrides,
    examPdf: { ...DEFAULT_PROFILE.examPdf, ...overrides.examPdf },
    answerKey: { ...DEFAULT_PROFILE.answerKey, ...overrides.answerKey },
    recordings: { ...DEFAULT_PROFILE.recordings, ...overrides.recordings },
  }
  const parsed = bookProfileSchema.safeParse(merged)
  if (parsed.success) return { profile: parsed.data, errors: [] }
  return {
    profile: null,
    errors: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'profile'}: ${issue.message}`),
  }
}

/** Reads a profile file (YAML). Its content is checked when the builder resolves it. */
export async function readProfileFile(file: string): Promise<BookProfileOverrides> {
  const data: unknown = parse(await readFile(file, 'utf8'))
  if (data === null || data === undefined) return {}
  if (typeof data !== 'object' || Array.isArray(data)) throw new Error(`${file} must hold a list of keys and values`)
  return data as BookProfileOverrides
}
