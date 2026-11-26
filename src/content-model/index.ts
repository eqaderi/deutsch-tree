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
import { type AssistantGradedModule, isAssistantGraded } from './scoring.ts'

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

const NOT_ORDERS = 'must be a list of orders, each one a list of the pieces, such as [[wo, wohnst, du]]'

/** One order of the pieces of a word ordering question. */
const piecesInOrder = z.array(text).min(3, 'needs at least 3 pieces: with fewer there is nothing to put in order')

/**
 * Every right order of a word ordering question. One order written without
 * the list around it is the likely slip, so the shape is looked at first and
 * gets one message.
 */
const rightOrders = z
  .custom<unknown[][]>((input) => Array.isArray(input) && input.every(Array.isArray), {
    error: ({ input }) => (input === undefined ? NO_ACCEPTED_ANSWER : NOT_ORDERS),
  })
  .pipe(z.array(piecesInOrder).min(1, NO_ACCEPTED_ANSWER))

/**
 * The pieces of a German sentence, which the learner puts in order. A piece
 * is one word or several. Like a typed question it lists every accepted
 * answer: where German allows more than one order of the pieces, each right
 * order is listed, and the first one is shown as the right answer.
 */
const wordOrderQuestion = z
  .strictObject({
    ...questionWithoutPrompt,
    type: z.literal('word-order'),
    /** Every right order. A piece is written as it stands inside a sentence (no capital for the first). */
    answers: rightOrders,
    /** The mark that closes the sentence. The app adds it, and the capital letter at the start. */
    end: z.enum(SENTENCE_ENDS, { error: 'must be ".", "?" or "!"' }).default('.'),
  })
  .superRefine((value, ctx) => {
    const [first = []] = value.answers
    value.answers.forEach((order, index) => {
      if (index === 0) return
      const listedTwice = value.answers.slice(0, index).some((earlier) => sameList(earlier, order))
      const problem = notTheSamePieces(first, order) ?? (listedTwice ? 'is listed twice' : undefined)
      if (problem) ctx.addIssue({ code: 'custom', path: ['answers', index], message: problem })
    })
  })

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

/** Why `order` is not a rearrangement of `pieces`, or undefined when it is one. */
function notTheSamePieces(pieces: readonly string[], order: readonly string[]): string | undefined {
  const must = 'must be the pieces of the first order in another order'
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
  typedAnswerQuestion,
  typedGapFillQuestion,
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

/**
 * One word of a vocabulary node. `word` is the headword as the scope list
 * (content/vocabulary/scope-list.tsv) spells it; the list holds its word
 * class, level, article and plural. The rest of an entry (meanings, a
 * definition, an example sentence) joins this object when vocabulary pages
 * are built.
 */
const vocabularyEntry = z.strictObject({ word: text })

/** The fields that the nodes of one kind have, and no others. */
const FIELDS_OF_ONE_KIND = {
  module: 'exam-part',
  part: 'exam-part',
  purpose: 'phrases',
  examTasks: 'phrases',
  words: 'vocabulary',
} as const satisfies Record<string, NodeKind>

const withArticle = (kind: NodeKind) => `${kind === 'exam-part' ? 'an' : 'a'} ${kind}`

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
    /** How many questions of the pool one attempt draws. */
    attemptSize: z
      .number()
      .int('must be a whole number')
      .min(10, 'must be 10 to 15: an attempt draws 10 to 15 questions')
      .max(15, 'must be 10 to 15: an attempt draws 10 to 15 questions')
      .default(10),
    /** A published node must have one that matches its pool; the content pipeline checks it. */
    review: reviewRecord.optional(),
    /** The words of a vocabulary node; no other kind has them. */
    words: z.array(vocabularyEntry).min(1).optional(),

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
    }
    if (value.kind === 'vocabulary' && !value.id.startsWith('vocabulary-')) {
      ctx.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'a vocabulary node id is "vocabulary-" plus the name of its theme, like "vocabulary-family"',
      })
    }
    if (value.kind === 'vocabulary' && value.words === undefined) {
      ctx.addIssue({ code: 'custom', path: ['words'], message: 'is missing: a vocabulary node lists its words' })
    }
    if (isAssistantGraded(value) && value.part !== undefined) {
      const taskFields = TASK_FIELDS[value.module][value.part]
      if (taskFields === undefined) {
        const parts = Object.keys(TASK_FIELDS[value.module])
        ctx.addIssue({
          code: 'custom',
          path: ['part'],
          message: `${value.module} has parts ${parts[0]} to ${parts.at(-1)}`,
        })
      } else if (value.task) {
        taskFitsItsPart(value.task, taskFields, ctx)
      }
    }

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
    } else {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: `a ${value.kind} node${value.module ? ` of ${value.module}` : ''} cannot be published yet; it has no page`,
      })
    }
  })

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
  /**
   * The node is published and has a pool, so its test can be started at
   * `#/node/<id>/test` without opening its page. False for a node that becomes
   * done in another way (a score typed in, a practice task).
   */
  hasTest: boolean
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
  /** Every right order of the pieces. The first is the one a result shows as the right answer. */
  answers: string[][]
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

export type Question =
  | MultipleChoiceQuestion
  | GapFillQuestion
  | TrueFalseQuestion
  | TypedAnswerQuestion
  | TypedGapFillQuestion
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

/** What a node's page is built from. Which one it is follows from what it holds: a pool, or a task (see scoring.ts). */
export type NodeContent = GrammarContent | ExamTaskContent

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
