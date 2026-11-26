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

const multipleChoiceQuestion = z
  .strictObject({
    ...questionBase,
    type: z.literal('multiple-choice'),
    options: z.array(text).min(2),
    /** The text of the one correct option. */
    answer: z
      .string({
        error: ({ input }) => {
          if (input === undefined) return 'no correct answer: the question states none'
          if (Array.isArray(input)) {
            return `${input.length} correct answers: a multiple-choice question has exactly one`
          }
          return undefined
        },
      })
      .trim()
      .min(1, 'must not be empty'),
  })
  .superRefine((value, ctx) => {
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
  })

/** Later question types join this union under their own `type`. */
const question = z.discriminatedUnion('type', [multipleChoiceQuestion])

/** The content sections that a published node must have. */
const CONTENT_SECTIONS = ['explanations', 'table', 'examples', 'mistakes', 'questions'] as const

export const nodeFileSchema = z
  .strictObject({
    id: nodeId,
    kind: z.enum(NODE_KINDS),
    /** A CEFR level such as A1. A new level needs no code change. */
    level: z.string().regex(/^[A-C][12]$/, 'must be a level such as A1, A2 or B1'),
    /** Position in the curriculum order; lower comes first. */
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
// Compiled bundle (what the app loads)
// ---------------------------------------------------------------------------

/** Learner-language text, split so that German parts can be rendered as German. */
export type RichText = Array<string | { de: string }>

/** What the tree needs to know about a node. */
export interface NodeSummary {
  id: string
  kind: NodeKind
  level: string
  order: number
  status: NodeStatus
  recogniseOnly: boolean
  prerequisites: string[]
  title: Localised
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

export interface MultipleChoiceQuestion {
  id: string
  type: 'multiple-choice'
  prompt: string
  options: string[]
  answer: string
  explanation: Localised<RichText>
}

export type Question = MultipleChoiceQuestion

export interface GrammarContent {
  explanations: Localised<{ rule: RichText }>
  table: GrammarTable
  examples: Example[]
  mistakes: Mistake[]
  questions: Question[]
}

/** A node as the app loads it. `content` is null until the node is published. */
export interface CompiledNode extends NodeSummary {
  content: GrammarContent | null
}

/** Nodes in curriculum order. */
export interface ContentIndex {
  nodes: NodeSummary[]
}

export interface ContentBundle {
  index: ContentIndex
  nodes: CompiledNode[]
}
