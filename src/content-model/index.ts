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

/** The four modules of the exam, as an exam-part node names its own. */
export const EXAM_MODULES = ['lesen', 'hoeren', 'schreiben', 'sprechen'] as const
export type ExamModule = (typeof EXAM_MODULES)[number]

/** Each module under the exam's own name, with the number of parts the exam gives it. */
export const EXAM_MODULE_FACTS: Readonly<Record<ExamModule, { name: string; parts: number }>> = {
  lesen: { name: 'Lesen', parts: 5 },
  hoeren: { name: 'Hören', parts: 4 },
  schreiben: { name: 'Schreiben', parts: 3 },
  sprechen: { name: 'Sprechen', parts: 3 },
}

/** One part of the exam: Lesen, Teil 1 is { module: 'lesen', part: 1 }. */
export interface ExamPart {
  module: ExamModule
  part: number
}

/** The id of the node of an exam part: "exam-lesen-1". */
export function examPartNodeId({ module, part }: ExamPart): string {
  return `exam-${module}-${part}`
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

/**
 * What a node explains in one language. Which of these a node must have
 * follows from its kind (`EXPLANATIONS_OF` below); the node schema checks it.
 * German inside any of them goes in *asterisks*.
 */
const explanationIn = (language: Language) =>
  z.strictObject(
    {
      /** A grammar node: the rule in two or three sentences. */
      rule: text.optional(),
      /** An exam-part node: what the part asks the candidate to do. */
      task: text.optional(),
      /** An exam-part node: how the part is scored. */
      scoring: text.optional(),
      /** An exam-part node: how to approach the part, as steps in order. */
      approach: z.array(text).min(1).optional(),
    },
    missingIn(language),
  )

const EXAM_PART_EXPLANATIONS = ['task', 'scoring', 'approach'] as const
const EXPLANATIONS = ['rule', ...EXAM_PART_EXPLANATIONS] as const

/** The explanations that a node of this kind writes in every language. */
function explanationsOf(kind: NodeKind): readonly (typeof EXPLANATIONS)[number][] {
  return kind === 'exam-part' ? EXAM_PART_EXPLANATIONS : ['rule']
}

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

/** The prompt of a gap fill question, chosen or typed, is a sentence with exactly one gap. */
function hasOneGap(value: { prompt: string }, ctx: z.RefinementCtx) {
  if ((value.prompt.match(GAP) ?? []).length !== 1) {
    ctx.addIssue({ code: 'custom', path: ['prompt'], message: 'must have exactly one gap, written as ___' })
  }
}

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
    hasOneGap(value, ctx)
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

const NO_ACCEPTED_ANSWER = 'no correct answer: the question lists none under "answers"'

/**
 * The answer rule of a question whose answer is typed: it lists every
 * accepted answer, so that correct German is never marked wrong. The first
 * one is shown as the right answer. Spaces, ae/oe/ue/ss and capitals are
 * forgiven by the learning engine and need no entries of their own.
 */
const acceptedAnswers = z
  .array(text, {
    error: ({ input }) =>
      input === undefined ? NO_ACCEPTED_ANSWER : 'must be a list of every accepted answer, such as [wohnst]',
  })
  .min(1, NO_ACCEPTED_ANSWER)
  .superRefine((answers, ctx) => {
    const spaced = answers.map((answer) => answer.replace(/\s+/g, ' '))
    spaced.forEach((answer, index) => {
      if (spaced.indexOf(answer) < index) {
        ctx.addIssue({ code: 'custom', path: [index], message: `"${answer}" is listed twice` })
      }
    })
  })

/** The learner types the answer to the prompt. */
const typedAnswerQuestion = z.strictObject({
  ...questionBase,
  type: z.literal('typed-answer'),
  answers: acceptedAnswers,
})

/** A sentence with one gap; the learner types what fills it. */
const typedGapFillQuestion = z
  .strictObject({
    ...questionBase,
    type: z.literal('typed-gap-fill'),
    answers: acceptedAnswers,
  })
  .superRefine(hasOneGap)

/** Later question types join this union under their own `type`, each with its answer rule. */
const question = z.discriminatedUnion('type', [
  multipleChoiceQuestion,
  gapFillQuestion,
  trueFalseQuestion,
  typedAnswerQuestion,
  typedGapFillQuestion,
])

// ---------------------------------------------------------------------------
// Exam tasks: a part of the exam as a candidate meets it
// ---------------------------------------------------------------------------

const partId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be lower-case words joined by hyphens, like "t1"')

/** A German text that a task's items are about: an e-mail, a blog entry, an advertisement. */
const taskText = z.strictObject({
  /** Stable inside the task. */
  id: partId,
  /** A heading or subject line, where the text has one. */
  title: text.optional(),
  /** The text itself. A blank line starts a new paragraph; a line break inside a paragraph is kept. */
  body: text,
})

/**
 * "Richtig" or "Falsch": the prompt is a statement about the text of the
 * task, and the text decides. (Not `true-false`, which asks whether a
 * sentence is correct German.)
 */
const richtigFalschItem = z.strictObject({
  ...questionBase,
  type: z.literal('richtig-falsch'),
  /** true when the statement is right according to the text (Richtig), false when it is not (Falsch). */
  answer: z.boolean(oneAnswer('richtig-falsch', 'must be true (Richtig) or false (Falsch)')),
})

/**
 * One item of a task. An item is a question whose answer lies in the task's
 * texts, so it has what every question has: id, prompt, answer, explanation.
 * The item format of another exam part joins this union under its own `type`.
 */
const taskItem = z.discriminatedUnion('type', [richtigFalschItem])

/**
 * One task in the format of one exam part: its texts, and its items in the
 * order the candidate answers them. It is always taken whole and scored per
 * item. A practice task of an exam-part node has this shape, and so does a
 * part of a mock exam.
 */
export const examTaskSchema = z.strictObject({
  /** Stable inside the node (or the exam) that holds the task. */
  id: partId,
  texts: z.array(taskText).min(1),
  items: z.array(taskItem).min(1),
})

export type ExamTaskFile = z.infer<typeof examTaskSchema>

/**
 * The format of the task of each exam part, by the id of the part's node:
 * how many texts it has and how many items. A part that is not listed here
 * has no task format yet, so its node cannot be published. Source: the
 * candidate sheets of the official model set (the solved example "0" that
 * some parts begin with is not an item).
 *
 * Every item is "richtig-falsch" so far. With the item type of a second
 * part, a format also names the type of its items.
 */
export const EXAM_TASK_FORMATS: Readonly<Record<string, ExamTaskFormat>> = {
  'exam-lesen-1': { texts: 1, items: 6 },
}

export interface ExamTaskFormat {
  texts: number
  items: number
}

/** The task format of an exam part, or undefined while it is not built. */
export function examTaskFormat(part: ExamPart): ExamTaskFormat | undefined {
  return EXAM_TASK_FORMATS[examPartNodeId(part)]
}

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

/** The fields that the nodes of one kind have, and no others. */
const FIELDS_OF_ONE_KIND = {
  module: 'exam-part',
  part: 'exam-part',
  practice: 'exam-part',
  purpose: 'phrases',
  examTasks: 'phrases',
} as const satisfies Record<string, NodeKind>

const withArticle = (kind: NodeKind) => `${kind === 'exam-part' ? 'an' : 'a'} ${kind}`

/** The content sections that a published grammar node must have. */
const CONTENT_SECTIONS = ['explanations', 'table', 'examples', 'mistakes', 'questions'] as const

/** The content sections that a published exam-part node must have. */
const EXAM_PART_SECTIONS = ['explanations', 'practice'] as const

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

    /** Exam-part nodes only: the module of the exam this part belongs to. */
    module: z.enum(EXAM_MODULES).optional(),
    /** Exam-part nodes only: the number of the part inside its module, as the exam counts it. */
    part: z.number().int('must be a whole number').positive().optional(),

    /** Phrases nodes only: what the phrases are for, in one line. */
    purpose: localised.optional(),
    /** Phrases nodes only: ids of the exam-part nodes whose tasks the phrases serve. */
    examTasks: z.array(nodeId).min(1, 'must name at least one exam task').optional(),

    explanations: z
      .strictObject({ en: explanationIn('en'), fa: explanationIn('fa'), de: explanationIn('de') })
      .optional(),
    table: table.optional(),
    examples: z.array(example).min(1).optional(),
    mistakes: z.array(mistake).min(1).optional(),
    questions: z.array(question).min(1).optional(),
    /**
     * Only in an exam-part node: its practice tasks, each in the format of
     * the node's exam part. An attempt takes one of them, whole.
     */
    practice: z.array(examTaskSchema).min(1).optional(),
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
    for (const [field, kind] of Object.entries(FIELDS_OF_ONE_KIND)) {
      if (value.kind !== kind && value[field as keyof typeof FIELDS_OF_ONE_KIND] !== undefined) {
        ctx.addIssue({ code: 'custom', path: [field], message: `only ${withArticle(kind)} node has this` })
      }
    }
    if (value.kind === 'phrases') {
      if (!value.id.startsWith('phrases-')) {
        ctx.addIssue({
          code: 'custom',
          path: ['id'],
          message: 'a phrases node id is "phrases-" plus its purpose in a word or two, like "phrases-agreeing"',
        })
      }
      if (value.purpose === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['purpose'],
          message: 'is missing: a phrases node says in one line what its phrases are for',
        })
      }
      if (value.examTasks === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['examTasks'],
          message: 'is missing: a phrases node names the exam tasks it serves, by the ids of their exam-part nodes',
        })
      }
    }
    if (value.kind === 'exam-part') {
      if (value.module === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['module'],
          message: `is missing: an exam-part node names its module: ${EXAM_MODULES.slice(0, -1).join(', ')} or ${EXAM_MODULES.at(-1)}`,
        })
      }
      if (value.part === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['part'],
          message: 'is missing: an exam-part node gives the number of its part inside the module',
        })
      }
      const id = `exam-${value.module}-${value.part}`
      if (value.module !== undefined && value.part !== undefined && value.id !== id) {
        ctx.addIssue({
          code: 'custom',
          path: ['id'],
          message: `the id of part ${value.part} of the module ${value.module} is "${id}"`,
        })
      }
      if (value.module !== undefined && value.part !== undefined) {
        const { name, parts } = EXAM_MODULE_FACTS[value.module]
        if (value.part > parts) {
          ctx.addIssue({
            code: 'custom',
            path: ['part'],
            message: `${name} has parts 1 to ${parts}, not a part ${value.part}`,
          })
        }
      }
    }

    // A node explains what its kind explains, in every language, and nothing else.
    const wanted = explanationsOf(value.kind)
    for (const language of value.explanations ? LANGUAGES : []) {
      for (const name of EXPLANATIONS) {
        const written = value.explanations?.[language][name] !== undefined
        if (written === wanted.includes(name)) continue
        ctx.addIssue({
          code: 'custom',
          path: ['explanations', language, name],
          message: written
            ? value.kind === 'exam-part'
              ? 'belongs to a grammar node; an exam-part node explains task, scoring and approach'
              : `belongs to an exam-part node; ${withArticle(value.kind)} node explains its rule`
            : `is missing; this text is needed in ${language}`,
        })
      }
    }

    if (value.status !== 'published') return
    if (value.kind !== 'grammar' && value.kind !== 'exam-part') {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: `a ${value.kind} node cannot be published yet; only grammar nodes and exam parts have a page`,
      })
      return
    }
    if (value.kind === 'exam-part') {
      // Without its module and part the node is already rejected above.
      const { module, part } = value
      if (module !== undefined && part !== undefined && examTaskFormat({ module, part }) === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['status'],
          message: `${EXAM_MODULE_FACTS[module].name}, Teil ${part} cannot be published yet: the format of its practice task is not built`,
        })
        return
      }
      for (const section of EXAM_PART_SECTIONS) {
        if (value[section] === undefined) {
          ctx.addIssue({ code: 'custom', path: [section], message: 'is required for a published node' })
        }
      }
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
// Official mock exams (source): official-mock-exams.yaml
// ---------------------------------------------------------------------------

/** Who a set was written for. A youth set has the same format and scoring as an adult set. */
export const EXAM_AUDIENCES = ['adults', 'youth'] as const
export type ExamAudience = (typeof EXAM_AUDIENCES)[number]

/**
 * What a link leads to: the exam papers (a PDF), the listening recordings, or
 * a version of the exam that is worked through online.
 */
export const EXAM_LINK_KINDS = ['papers', 'audio', 'online'] as const
export type ExamLinkKind = (typeof EXAM_LINK_KINDS)[number]

const pageNumber = z.number().int('must be a whole number').positive()

const examLink = z.strictObject({
  kind: z.enum(EXAM_LINK_KINDS),
  /** The app links to this address and never requests it. */
  url: z.string().regex(/^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/, 'must be a full address that starts with https://'),
  /** One line for the learner, for example where on the page the set is found. */
  note: localised.optional(),
  /**
   * The pages of a PDF that hold the candidate sheets. The pages after them
   * hold the answers; the learner is told to stay inside these.
   */
  candidatePages: z
    .strictObject({ first: pageNumber, last: pageNumber })
    .superRefine((pages, ctx) => {
      if (pages.last < pages.first) {
        ctx.addIssue({
          code: 'custom',
          path: ['last'],
          message: `must not be before the first page (${pages.first})`,
        })
      }
    })
    .optional(),
  /** The day a person last opened the link and saw what it promises. Absent: nobody has yet. Not shown. */
  checked: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date such as 2026-11-26')
    .optional(),
})

/**
 * One official mock exam: a full set with all four modules, published by the
 * exam's own institute. The app links to it; it never hosts or copies it.
 */
const officialMockExam = z.strictObject({
  /** Stable for ever: the scores a learner records are kept under it. */
  id: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be lower-case words joined by hyphens, like "goethe-b1-modellsatz"'),
  /** The set's own German name, shown unchanged in every language. */
  title: text,
  /** Who publishes it, shown unchanged in every language. */
  publisher: text,
  audience: z.enum(EXAM_AUDIENCES),
  /** Whether 90 or more in every module on this set counts as one of the two the readiness rule asks for. */
  countsTowardReadiness: z.boolean(),
  links: z.array(examLink).min(1, 'needs at least one link: the app only links to an official mock exam'),
})

export const officialMockExamsFileSchema = z.array(officialMockExam).superRefine((exams, ctx) => {
  const seen = new Set<string>()
  exams.forEach(({ id }, index) => {
    if (seen.has(id)) {
      ctx.addIssue({ code: 'custom', path: [index, 'id'], message: `duplicated exam id: "${id}"` })
    }
    seen.add(id)
  })
})

export type OfficialMockExamEntry = z.infer<typeof officialMockExam>

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
  /** Exam-part nodes only: the module of the exam and the number of the part inside it. */
  module?: ExamModule
  part?: number
  /** Phrases nodes only: what the phrases are for, and the ids of the exam-part nodes whose tasks they serve. */
  purpose?: Localised<RichText>
  examTasks?: string[]
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

/**
 * The learner types the answer. `answers` lists every accepted answer; the
 * first is the one a result shows as the right answer.
 */
export interface TypedAnswerQuestion extends QuestionBase {
  type: 'typed-answer'
  answers: string[]
}

/** The prompt holds one gap; the learner types what fills it. `answers` as in a typed answer. */
export interface TypedGapFillQuestion extends QuestionBase {
  type: 'typed-gap-fill'
  answers: string[]
  /** The prompt cut at its gap, so the app can show the typed form inside the sentence. */
  gap: { before: string; after: string }
}

/** An item of an exam task: the prompt is a statement about the task's text; `answer` says whether the text makes it right. */
export interface RichtigFalschQuestion extends QuestionBase {
  type: 'richtig-falsch'
  answer: boolean
}

/**
 * Every question the app can ask, check and show: those of a node's pool and
 * the items of an exam task.
 */
export type Question =
  | MultipleChoiceQuestion
  | GapFillQuestion
  | TrueFalseQuestion
  | TypedAnswerQuestion
  | TypedGapFillQuestion
  | RichtigFalschQuestion

/** A question that is an item of an exam task: its answer lies in the task's texts. */
export type TaskItem = RichtigFalschQuestion

export interface TaskText {
  /** Stable inside the task. */
  id: string
  /** German: a heading or subject line. */
  title?: string
  /** German. A line break inside a paragraph is part of the text (a greeting, a signature). */
  paragraphs: string[]
}

/**
 * One task in the format of one exam part: texts to read, and items in the
 * order they are answered. It is taken whole and scored per item with the
 * learning engine's `scoreAttempt(task.items, answers)`.
 */
export interface ExamTask {
  /** Stable inside the node or exam that holds the task. */
  id: string
  texts: TaskText[]
  items: TaskItem[]
}

/** The page of an exam-part node. */
export interface ExamPartContent {
  kind: 'exam-part'
  explanations: Localised<{
    /** What the part asks the candidate to do. */
    task: RichText
    /** How the part is scored. */
    scoring: RichText
    /** How to approach the part: steps, in order. */
    approach: RichText[]
  }>
  /** The practice tasks. An attempt takes one of them. */
  practice: ExamTask[]
}

export interface GrammarContent {
  kind: 'grammar'
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
  /** `content.kind` says which page it is. */
  content: GrammarContent | ExamPartContent | null
}

/** Chapters and nodes, both in curriculum order: chapter by chapter, and inside a chapter by `order`. */
export interface ContentIndex {
  chapters: ChapterSummary[]
  nodes: NodeSummary[]
}

/** A link of an official mock exam as the app shows it. */
export interface OfficialExamLink {
  kind: ExamLinkKind
  url: string
  note?: Localised<RichText>
  /** The pages of the PDF that hold the candidate sheets; the answers come after them. */
  candidatePages?: { first: number; last: number }
}

/** An official mock exam as the app lists it. */
export interface OfficialMockExam {
  id: string
  /** German. */
  title: string
  publisher: string
  audience: ExamAudience
  countsTowardReadiness: boolean
  links: OfficialExamLink[]
}

/** The official mock exams, in the order the list is written. */
export interface OfficialMockExams {
  exams: OfficialMockExam[]
}

/**
 * What search knows about one node beyond its title, in one language. It is
 * the same for every kind of node: a list of pieces of text, with no field
 * that only a grammar node has.
 */
export interface SearchEntry {
  /** Id of the node that a result opens. */
  node: string
  /**
   * The pieces of the node's content, in the order of its page: a rule, a
   * table row, an example with its translation, a word with its meaning.
   * Search looks through them, and a result shows the piece that matched.
   */
  passages: RichText[]
}

/**
 * `search/<language>.json`: everything search looks through besides the
 * titles, which the index already has. A node with nothing written yet has
 * no entry. The app fetches it when the learner opens search, never before.
 */
export interface SearchData {
  entries: SearchEntry[]
}

/**
 * `overview.json`: every grammar table, for the "all grammar at a glance"
 * page, in curriculum order. A node without a table has no entry. The page
 * takes each node's title, level and chapter from the index. The app fetches
 * this file when the learner opens that page, never before.
 */
export interface GrammarOverview {
  tables: Array<{ node: string; table: GrammarTable }>
}

export interface ContentBundle {
  index: ContentIndex
  nodes: CompiledNode[]
  officialMockExams: OfficialMockExam[]
  search: Localised<SearchData>
  overview: GrammarOverview
}
