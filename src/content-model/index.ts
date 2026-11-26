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

/** The four modules of the Goethe B1 exam, as they are written in a node id. */
export const EXAM_MODULES = ['lesen', 'hoeren', 'schreiben', 'sprechen'] as const
export type ExamModule = (typeof EXAM_MODULES)[number]

/** How many parts each module has. */
export const EXAM_PART_COUNT: Record<ExamModule, number> = { lesen: 5, hoeren: 4, schreiben: 3, sprechen: 3 }

/**
 * The modules that the app cannot score itself. Their nodes have no question
 * pool: the learner does a task, an AI assistant grades it with the prompt
 * the app provides, and the learner types the score in.
 */
export const ASSISTANT_GRADED_MODULES = ['schreiben', 'sprechen'] as const
export type AssistantGradedModule = (typeof ASSISTANT_GRADED_MODULES)[number]

/** Whether a node is a writing or speaking exam part: graded by an AI assistant, with no question pool. */
export function isAssistantGraded(node: { kind: NodeKind; module?: ExamModule | undefined }): node is {
  kind: 'exam-part'
  module: AssistantGradedModule
} {
  return node.kind === 'exam-part' && (ASSISTANT_GRADED_MODULES as readonly unknown[]).includes(node.module)
}

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

/** Later question types join this union under their own `type`, each with its answer rule. */
const question = z.discriminatedUnion('type', [multipleChoiceQuestion, gapFillQuestion, trueFalseQuestion])

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

/** The content sections that a published grammar node must have. */
const CONTENT_SECTIONS = ['explanations', 'table', 'examples', 'mistakes', 'questions'] as const

/**
 * The task of a writing or speaking node: what tells it apart from another
 * task of the same exam part. All of it is German. Which fields a task has
 * depends on its part; `TASK_FIELDS` says which.
 */
const task = z.strictObject({
  /** The situation the learner writes or speaks in. */
  situation: text.optional(),
  /** The content points of an e-mail, or the points to plan together. */
  points: z.array(text).optional(),
  /** Schreiben Aufgabe 2: the one opinion from a forum that the learner replies to. */
  opinion: z.strictObject({ author: text, text }).optional(),
  /** Sprechen Teil 2 and 3: the topic of the presentation. */
  topic: text.optional(),
})

type TaskField = keyof z.infer<typeof task>

/** The fields of a task in each part, and how many points it lists. */
const TASK_FIELDS: Record<
  AssistantGradedModule,
  Record<number, { name: string; fields: TaskField[]; points?: number }>
> = {
  schreiben: {
    1: { name: 'Schreiben Aufgabe 1', fields: ['situation', 'points'], points: 3 },
    2: { name: 'Schreiben Aufgabe 2', fields: ['situation', 'opinion'] },
    3: { name: 'Schreiben Aufgabe 3', fields: ['situation'] },
  },
  sprechen: {
    1: { name: 'Sprechen Teil 1', fields: ['situation', 'points'], points: 4 },
    2: { name: 'Sprechen Teil 2', fields: ['topic'] },
    3: { name: 'Sprechen Teil 3', fields: ['topic'] },
  },
}

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

    /** Exam part nodes only: the module of the exam the part belongs to. */
    module: z.enum(EXAM_MODULES).optional(),
    /** Exam part nodes only: the number of the part in its module (Teil 1, Aufgabe 2 …). */
    part: z.number().int('must be a whole number').positive().optional(),
    /** Writing and speaking nodes only: the task. */
    task: task.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'grammar' && !/^grammar-\d{3}$/.test(value.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'a grammar node id is "grammar-" plus its three-digit number in the grammar list, like "grammar-001"',
      })
    }
    const partIsKnown = examPartIsStated(value, ctx)
    const taskFields = partIsKnown && isAssistantGraded(value) ? TASK_FIELDS[value.module][value.part ?? 0] : undefined
    if (taskFields && value.task) taskFitsItsPart(value.task, taskFields, ctx)

    if (value.status !== 'published') return
    if (value.kind === 'grammar') {
      for (const section of CONTENT_SECTIONS) {
        if (value[section] === undefined) {
          ctx.addIssue({ code: 'custom', path: [section], message: 'is required for a published node' })
        }
      }
    } else if (isAssistantGraded(value)) {
      if (value.task === undefined) {
        ctx.addIssue({ code: 'custom', path: ['task'], message: 'is required for a published node' })
      }
    } else if (value.kind !== 'exam-part' || partIsKnown) {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: `a ${value.kind} node${value.module ? ` of ${value.module}` : ''} cannot be published yet; it has no page`,
      })
    }
  })

/**
 * An exam part node states its module and its part, and is named after them;
 * no other node states them. Returns whether the node is an exam part whose
 * module and part can be relied on.
 */
function examPartIsStated(
  value: { id: string; kind: NodeKind; module?: ExamModule | undefined; part?: number | undefined },
  ctx: z.RefinementCtx,
): boolean {
  if (value.kind !== 'exam-part') {
    for (const field of ['module', 'part'] as const) {
      if (value[field] !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `belongs to exam part nodes only; this is a ${value.kind} node`,
        })
      }
    }
    return false
  }

  if (value.module === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['module'],
      message: `is required for an exam part node: ${EXAM_MODULES.slice(0, -1).join(', ')} or ${EXAM_MODULES.at(-1)}`,
    })
  }
  if (value.part === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['part'],
      message: 'is required for an exam part node: the number of the part in its module',
    })
  }
  if (value.module === undefined || value.part === undefined) return false

  if (value.part > EXAM_PART_COUNT[value.module]) {
    ctx.addIssue({
      code: 'custom',
      path: ['part'],
      message: `${value.module} has parts 1 to ${EXAM_PART_COUNT[value.module]}`,
    })
    return false
  }
  const id = `exam-${value.module}-${value.part}`
  if (value.id !== id) {
    ctx.addIssue({
      code: 'custom',
      path: ['id'],
      message: `the id of an exam part node is "exam-<module>-<part>": this one must be "${id}"`,
    })
  }
  return true
}

/** A task holds the fields of its exam part, no others, and as many points as the part has. */
function taskFitsItsPart(
  value: z.infer<typeof task>,
  part: { name: string; fields: TaskField[]; points?: number },
  ctx: z.RefinementCtx,
): void {
  for (const field of part.fields) {
    if (value[field] === undefined) {
      ctx.addIssue({ code: 'custom', path: ['task', field], message: `is required for ${part.name}` })
    }
  }
  for (const field of Object.keys(value) as TaskField[]) {
    if (value[field] !== undefined && !part.fields.includes(field)) {
      ctx.addIssue({
        code: 'custom',
        path: ['task', field],
        message: `does not belong to ${part.name}; that task has: ${part.fields.join(', ')}`,
      })
    }
  }
  if (part.points !== undefined && value.points !== undefined && value.points.length !== part.points) {
    ctx.addIssue({
      code: 'custom',
      path: ['task', 'points'],
      message: `${part.name} has exactly ${part.points} points, this task has ${value.points.length}`,
    })
  }
}

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

export type Question = MultipleChoiceQuestion | GapFillQuestion | TrueFalseQuestion

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

/**
 * One task of the Schreiben module or one part of the Sprechen module, with
 * everything that tells it apart from another task of the same part. All of
 * its text is German. The fixed wording of a part (how long, what to mind)
 * is not content; it comes from the part.
 *
 * A task stands on its own, so a mock exam can hold tasks as well as a node.
 */
export type ExamTask =
  /** An informal e-mail of about 80 words on three content points. */
  | { module: 'schreiben'; part: 1; situation: string; points: string[] }
  /** A post of about 80 words giving the learner's opinion, in reply to one opinion from a forum. */
  | { module: 'schreiben'; part: 2; situation: string; opinion: { author: string; text: string } }
  /** A short semi-formal e-mail of about 40 words. */
  | { module: 'schreiben'; part: 3; situation: string }
  /** Planning something with a partner, along four guiding points. */
  | { module: 'sprechen'; part: 1; situation: string; points: string[] }
  /** A short presentation on a topic, along the five fixed slides. */
  | { module: 'sprechen'; part: 2; topic: string }
  /** Talking about a presentation on a topic: feedback, a question, answers. */
  | { module: 'sprechen'; part: 3; topic: string }

/**
 * The page content of a writing or speaking node. There is no pool: the
 * learner does the task, an AI assistant grades it with the prompt the app
 * provides, and the learner types the score in.
 */
export interface ExamTaskContent {
  task: ExamTask
}

/** A node as the app loads it. `content` is null until the node is published. */
export interface CompiledNode extends NodeSummary {
  content: NodeContent | null
}

/** What a node's page is built from. Which one it is follows from what it holds: a pool, or a task. */
export type NodeContent = GrammarContent | ExamTaskContent

/** Whether the node is tested by questions drawn from its pool. A writing or speaking node is not. */
export function hasPool(content: NodeContent): content is GrammarContent {
  return 'questions' in content
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
