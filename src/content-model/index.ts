/**
 * Content model: what a node file may contain (the schema maintainers write
 * against) and what the compiled bundle contains (the types the app reads).
 *
 * Two conventions run through the whole node file format:
 *   1. A plain string is German and is shown unchanged in every language.
 *      Text for the learner's language is always an { en, fa, de } map.
 *   2. Inside learner-language text, German is wrapped in asterisks
 *      (*ich wohne*), so the app can render it left to right as German.
 */
import { z } from 'zod'

export const LANGUAGES = ['en', 'fa', 'de'] as const
export type Language = (typeof LANGUAGES)[number]
export type Localised<T = string> = Record<Language, T>

export const NODE_KINDS = ['grammar', 'vocabulary', 'phrases', 'exam-part'] as const
export type NodeKind = (typeof NODE_KINDS)[number]

export const NODE_STATUSES = ['published', 'coming-soon'] as const
export type NodeStatus = (typeof NODE_STATUSES)[number]

/**
 * The fewest questions a published node's pool may hold. An attempt draws 10
 * to 15, so a smaller pool could not give a fresh set on a retry. The spec
 * asks for about 15 to 20 for a small topic and up to 40 for a large one.
 */
export const MINIMUM_POOL_SIZE = 15

// ---------------------------------------------------------------------------
// Node file schema (source)
// ---------------------------------------------------------------------------

const text = z.string().trim().min(1, 'must not be empty')

/** Says which language is absent, instead of a bare "expected string". */
const missingIn = (language: Language) => ({
  error: (issue: { input?: unknown }) =>
    issue.input === undefined ? `is missing; this text is needed in ${language}` : undefined,
})

const textIn = (language: Language) => z.string(missingIn(language)).trim().min(1, 'must not be empty')

const localised = z.strictObject({ en: textIn('en'), fa: textIn('fa'), de: textIn('de') })

const nodeId = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be lower-case words joined by hyphens, like "grammar-001"')

const explanationIn = (language: Language) =>
  z.strictObject(
    {
      /** The rule in two or three sentences. German inside it goes in *asterisks*. */
      rule: text,
    },
    missingIn(language),
  )

const table = z
  .strictObject({
    columns: z.array(localised).min(1),
    /** Cells are German. */
    rows: z.array(z.array(text).min(1)).min(1),
  })
  .superRefine((value, ctx) => {
    value.rows.forEach((row, index) => {
      if (row.length !== value.columns.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', index],
          message: `has ${row.length} cells but the table has ${value.columns.length} columns`,
        })
      }
    })
  })

const example = z.strictObject({ de: text, en: textIn('en'), fa: textIn('fa') })

const mistake = z.strictObject({ wrong: text, right: text, why: localised })

const questionBase = {
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be lower-case words joined by hyphens, like "q1"'),
  /** German, shown unchanged in every language. */
  prompt: text,
  /** One line saying why the right answer is right. */
  explanation: localised,
}

/**
 * The answer rule of every question type: a question states exactly one
 * correct answer. `type` names the question type in the message, and `shape`
 * says what one answer looks like when the value is something else.
 */
const oneAnswer = (type: string, shape?: string) => ({
  error: ({ input }: { input?: unknown }) => {
    if (input === undefined) return 'no correct answer: the question states none'
    if (Array.isArray(input)) return `${input.length} correct answers: a ${type} question has exactly one`
    return shape
  },
})

/** The stated answer of a question with options: the text of one option. */
const answerText = (type: string) => z.string(oneAnswer(type)).trim().min(1, 'must not be empty')

/** The stated answer must be exactly one of the options. */
function answerIsOneOption(value: { options: string[]; answer: string }, ctx: z.RefinementCtx) {
  const matches = value.options.filter((option) => option === value.answer).length
  if (matches === 1) return
  ctx.addIssue({
    code: 'custom',
    path: ['answer'],
    message:
      matches === 0
        ? `no correct answer: "${value.answer}" is not one of the options`
        : `${matches} correct answers: "${value.answer}" is in the options ${matches} times`,
  })
}

const multipleChoiceQuestion = z
  .strictObject({
    ...questionBase,
    type: z.literal('multiple-choice'),
    options: z.array(text).min(2),
    /** The text of the one correct option. */
    answer: answerText('multiple-choice'),
  })
  .superRefine(answerIsOneOption)

/** How a gap is written in a German sentence: three underscores or more. */
export const GAP = /_{3,}/g

/** A sentence with one gap, filled by choosing one of the offered forms. */
const gapFillQuestion = z
  .strictObject({
    ...questionBase,
    type: z.literal('gap-fill'),
    options: z.array(text).min(2),
    /** The text of the one option that fills the gap. */
    answer: answerText('gap-fill'),
  })
  .superRefine((value, ctx) => {
    if ((value.prompt.match(GAP) ?? []).length !== 1) {
      ctx.addIssue({ code: 'custom', path: ['prompt'], message: 'must have exactly one gap, written as ___' })
    }
    answerIsOneOption(value, ctx)
  })

/** A CEFR level such as A1. A new level needs no code change. */
const level = z.string().regex(/^[A-C][12]$/, 'must be a level such as A1, A2 or B1')

/** The prompt is a German sentence; the learner says whether it is correct German. */
const trueFalseQuestion = z.strictObject({
  ...questionBase,
  type: z.literal('true-false'),
  /** true when the sentence is correct German, false when it holds a mistake. */
  answer: z.boolean(oneAnswer('true-false', 'must be true or false')),
})

/**
 * A word of a German sentence: letters and digits, with a hyphen or an
 * apostrophe inside it. Whatever stands between two words (spaces, commas,
 * the full stop) belongs to neither.
 */
export const WORD = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu

/** The prompt is a German sentence with one wrong word; the learner picks that word. */
const findErrorQuestion = z
  .strictObject({
    ...questionBase,
    type: z.literal('find-error'),
    /** The one wrong word, written as it stands in the sentence. */
    answer: answerText('find-error'),
  })
  .superRefine((value, ctx) => {
    const matches = (value.prompt.match(WORD) ?? []).filter((word) => word === value.answer).length
    if (matches === 1) return
    ctx.addIssue({
      code: 'custom',
      path: ['answer'],
      message:
        matches === 0
          ? `no correct answer: "${value.answer}" is not a word of the sentence`
          : `${matches} correct answers: "${value.answer}" is in the sentence ${matches} times`,
    })
  })

/**
 * A question type whose prompt the author does not write: the pipeline builds
 * it from what the question shows.
 */
const questionWithoutPrompt = { id: questionBase.id, explanation: questionBase.explanation }

/** The marks that may close the sentence of a word ordering question. */
export const SENTENCE_ENDS = ['.', '?', '!'] as const

/** One order of the pieces of a word ordering question. */
const piecesInOrder = z.array(text, {
  error: ({ input }) =>
    input === undefined
      ? 'no correct answer: the question states none'
      : 'must be the pieces of the sentence in the right order, as a list',
})

/**
 * The pieces of a German sentence, which the learner puts in order. A piece
 * is one word or several. Where German allows more than one order, every
 * right one is listed: `answer` and then `alsoAccepted`.
 */
const wordOrderQuestion = z
  .strictObject({
    ...questionWithoutPrompt,
    type: z.literal('word-order'),
    /** The pieces in the right order, each written as it stands inside a sentence (no capital for the first). */
    answer: piecesInOrder.min(3, 'needs at least 3 pieces: with fewer there is nothing to put in order'),
    /** Every other right order of the same pieces. */
    alsoAccepted: z.array(piecesInOrder).default([]),
    /** The mark that closes the sentence. The app adds it, and the capital letter at the start. */
    end: z.enum(SENTENCE_ENDS, { error: 'must be ".", "?" or "!"' }).default('.'),
  })
  .superRefine((value, ctx) => {
    value.alsoAccepted.forEach((order, index) => {
      const problem =
        notTheSamePieces(value.answer, order) ??
        (sameList(order, value.answer) ? 'is the same order as the answer' : undefined) ??
        (value.alsoAccepted.slice(0, index).some((earlier) => sameList(earlier, order)) ? 'is listed twice' : undefined)
      if (problem) ctx.addIssue({ code: 'custom', path: ['alsoAccepted', index], message: problem })
    })
  })

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

/** Why `order` is not a rearrangement of `pieces`, or undefined when it is one. */
function notTheSamePieces(pieces: readonly string[], order: readonly string[]): string | undefined {
  const must = 'must be the pieces of the answer in another order'
  const left = [...pieces]
  for (const piece of order) {
    const index = left.indexOf(piece)
    if (index === -1) {
      return `${must}: "${piece}" is ${pieces.includes(piece) ? 'there too often' : 'not one'}`
    }
    left.splice(index, 1)
  }
  return left.length > 0 ? `${must}: "${left[0]}" is missing` : undefined
}

const NOT_PAIRS = 'must be the pairs, each one written as [item, partner]'

/**
 * Pairs of German: the learner finds the partner of each item. An item has
 * one partner and a partner fits one item, so only one matching is right.
 */
const matchingQuestion = z
  .strictObject({
    ...questionWithoutPrompt,
    type: z.literal('matching'),
    /** The pairs, each one as [item, partner]. The app mixes the partners. */
    answer: z
      .array(z.tuple([text, text], { error: NOT_PAIRS }), {
        error: ({ input }) => (input === undefined ? 'no correct answer: the question states none' : NOT_PAIRS),
      })
      .min(3, 'needs at least 3 pairs: with fewer there is nothing to match'),
  })
  .superRefine((value, ctx) => {
    value.answer.forEach(([item, partner], index) => {
      // Reported once, at the last pair that repeats it.
      const later = value.answer.slice(index + 1)
      const items = value.answer.filter(([other]) => other === item).length
      if (items > 1 && !later.some(([other]) => other === item)) {
        const message = `${items} correct answers: "${item}" has ${items} partners`
        ctx.addIssue({ code: 'custom', path: ['answer', index], message })
      }
      const partners = value.answer.filter(([, other]) => other === partner).length
      if (partners > 1 && !later.some(([, other]) => other === partner)) {
        const message = `${partners} correct answers: "${partner}" is the partner of ${partners} items`
        ctx.addIssue({ code: 'custom', path: ['answer', index], message })
      }
    })
  })

/** Later question types join this union under their own `type`, each with its answer rule. */
const question = z.discriminatedUnion('type', [
  multipleChoiceQuestion,
  gapFillQuestion,
  trueFalseQuestion,
  findErrorQuestion,
  wordOrderQuestion,
  matchingQuestion,
])

/**
 * Proof that an independent reviewer answered the pool without seeing the
 * answer key, and that every disagreement was resolved. Written by
 * `pnpm review:record`, never by hand.
 */
const reviewRecord = z.strictObject({
  /** Who answered the pool blind: a person, or an AI agent named as one. */
  reviewer: text,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date such as 2026-11-26'),
  /** Fingerprint of the questions and the answer key that were reviewed. */
  pool: text,
})

/** The content sections that a published node must have. */
const CONTENT_SECTIONS = ['explanations', 'table', 'examples', 'mistakes', 'questions'] as const

export const nodeFileSchema = z
  .strictObject({
    id: nodeId,
    kind: z.enum(NODE_KINDS),
    level,
    /** Id of the chapter this node belongs to: an entry of chapters.yaml with the same level and kind. */
    chapter: z.string({
      error: ({ input }) =>
        input === undefined ? 'is missing: every node belongs to a chapter of chapters.yaml' : undefined,
    }),
    /** Position inside its chapter; lower comes first. The chapter list orders the chapters. */
    order: z.number().positive(),
    status: z.enum(NODE_STATUSES),
    recogniseOnly: z.boolean().default(false),
    /** Ids of the nodes this one builds on. Advisory; never locks a node. */
    prerequisites: z.array(nodeId).default([]),
    title: localised,

    explanations: z
      .strictObject({ en: explanationIn('en'), fa: explanationIn('fa'), de: explanationIn('de') })
      .optional(),
    table: table.optional(),
    examples: z.array(example).min(1).optional(),
    mistakes: z.array(mistake).min(1).optional(),
    questions: z.array(question).min(1).optional(),
    /** How many questions of the pool one attempt draws. */
    attemptSize: z
      .number()
      .int('must be a whole number')
      .min(10, 'must be 10 to 15: an attempt draws 10 to 15 questions')
      .max(15, 'must be 10 to 15: an attempt draws 10 to 15 questions')
      .default(10),
    /** A published node must have one that matches its pool; the content pipeline checks it. */
    review: reviewRecord.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'grammar' && !/^grammar-\d{3}$/.test(value.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'a grammar node id is "grammar-" plus its three-digit number in the grammar list, like "grammar-001"',
      })
    }
    if (value.status !== 'published') return
    if (value.kind !== 'grammar') {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: `a ${value.kind} node cannot be published yet; only grammar nodes have a page`,
      })
      return
    }
    for (const section of CONTENT_SECTIONS) {
      if (value[section] === undefined) {
        ctx.addIssue({ code: 'custom', path: [section], message: 'is required for a published node' })
      }
    }
  })

export type NodeFile = z.infer<typeof nodeFileSchema>

// ---------------------------------------------------------------------------
// Chapter list schema (source): chapters.yaml
// ---------------------------------------------------------------------------

/**
 * A chapter is a named group of nodes of one kind inside one level. The list
 * is written in curriculum order: the curriculum runs through the chapters
 * from the first to the last, and inside a chapter by each node's `order`.
 */
const chapter = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be lower-case words joined by hyphens, like "a1-cases"'),
  level,
  kind: z.enum(NODE_KINDS),
  /** The chapter's name in the three languages. */
  title: localised,
})

export const chaptersFileSchema = z.array(chapter).superRefine((chapters, ctx) => {
  const seen = new Set<string>()
  chapters.forEach(({ id }, index) => {
    if (seen.has(id)) {
      ctx.addIssue({ code: 'custom', path: [index, 'id'], message: `duplicated chapter id: "${id}"` })
    }
    seen.add(id)
  })
})

export type ChapterEntry = z.infer<typeof chapter>

// ---------------------------------------------------------------------------
// Compiled bundle (what the app loads)
// ---------------------------------------------------------------------------

/** Learner-language text, split so that German parts can be rendered as German. */
export type RichText = Array<string | { de: string }>

/** What the tree needs to know about a node. */
export interface NodeSummary {
  id: string
  kind: NodeKind
  level: string
  /** Id of its chapter. */
  chapter: string
  /** Position inside its chapter. `ContentIndex.nodes` is already in curriculum order. */
  order: number
  status: NodeStatus
  recogniseOnly: boolean
  prerequisites: string[]
  /** German inside a title is marked, like in every other text for the learner. */
  title: Localised<RichText>
}

/** A chapter as the tree shows it: a stop on the line of its level. */
export interface ChapterSummary {
  id: string
  level: string
  kind: NodeKind
  title: Localised<RichText>
}

export interface GrammarTable {
  columns: Localised[]
  rows: string[][]
}

export interface Example {
  de: string
  en: string
  fa: string
}

export interface Mistake {
  wrong: string
  right: string
  why: Localised<RichText>
}

interface QuestionBase {
  /** Stable inside the node. */
  id: string
  /** German. */
  prompt: string
  /** One line saying why the right answer is right. */
  explanation: Localised<RichText>
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'multiple-choice'
  options: string[]
  answer: string
}

/** The prompt holds one gap; one of the options fills it. */
export interface GapFillQuestion extends QuestionBase {
  type: 'gap-fill'
  options: string[]
  answer: string
  /** The prompt cut at its gap, so the app can show the chosen form inside the sentence. */
  gap: { before: string; after: string }
}

/** The prompt is a German sentence; `answer` says whether it is correct German. */
export interface TrueFalseQuestion extends QuestionBase {
  type: 'true-false'
  answer: boolean
}

/** The prompt is a German sentence with one wrong word; the learner picks that word. */
export interface FindErrorQuestion extends QuestionBase {
  type: 'find-error'
  /** The prompt cut into its words and what stands between them, so the app can offer each word. */
  parts: Array<string | { word: string }>
  /** The place of the wrong word among the words of `parts`, counted from 0. */
  answer: number
}

/** The learner puts the pieces of a German sentence in order. The prompt is the mixed pieces. */
export interface WordOrderQuestion extends QuestionBase {
  type: 'word-order'
  /** The pieces as the learner first sees them: mixed, and in no right order. */
  pieces: string[]
  /** The mark that closes the sentence. */
  end: (typeof SENTENCE_ENDS)[number]
  /** The pieces in the right order. */
  answer: string[]
  /** Every other right order of the same pieces. */
  alsoAccepted: string[][]
}

/** The learner finds the partner of each item. The prompt is the items. */
export interface MatchingQuestion extends QuestionBase {
  type: 'matching'
  /** The items that each get a partner, in the order the author wrote them. */
  left: string[]
  /** The partners to choose from, mixed. No two are the same. */
  right: string[]
  /** The partner of each item of `left`, in the same order. */
  answer: string[]
}

export type Question =
  | MultipleChoiceQuestion
  | GapFillQuestion
  | TrueFalseQuestion
  | FindErrorQuestion
  | WordOrderQuestion
  | MatchingQuestion

export interface GrammarContent {
  explanations: Localised<{ rule: RichText }>
  table: GrammarTable
  examples: Example[]
  mistakes: Mistake[]
  /** The pool. */
  questions: Question[]
  /** How many questions of the pool one attempt draws. */
  attemptSize: number
}

/** A node as the app loads it. `content` is null until the node is published. */
export interface CompiledNode extends NodeSummary {
  content: GrammarContent | null
}

/** Chapters and nodes, both in curriculum order: chapter by chapter, and inside a chapter by `order`. */
export interface ContentIndex {
  chapters: ChapterSummary[]
  nodes: NodeSummary[]
}

export interface ContentBundle {
  index: ContentIndex
  nodes: CompiledNode[]
}
