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
import { type Spoken, voiceSchema } from './audio.ts'
import { type DiagramPart, readDrawing } from './diagram.ts'
import { WORD_CLASSES, type WordClass } from './scope-list.ts'
import { ASSISTANT_GRADED_MODULES, type AssistantGradedModule, isAssistantGraded } from './scoring.ts'

export const LANGUAGES = ['en', 'fa', 'de'] as const
export type Language = (typeof LANGUAGES)[number]
export type Localised<T = string> = Record<Language, T>

export const NODE_KINDS = ['grammar', 'vocabulary', 'phrases', 'exam-part'] as const
export type NodeKind = (typeof NODE_KINDS)[number]

/** What kind of word a vocabulary entry is: the classes of the scope list. */
export { WORD_CLASSES, type WordClass }

export const ARTICLES = ['der', 'die', 'das'] as const
export type Article = (typeof ARTICLES)[number]

/** What a noun with one number only has. */
export const NOUN_NUMBERS = ['singular-only', 'plural-only'] as const
export type NounNumber = (typeof NOUN_NUMBERS)[number]

export const NODE_STATUSES = ['published', 'coming-soon'] as const
export type NodeStatus = (typeof NODE_STATUSES)[number]

/** The four modules of the Goethe B1 exam, as they are written in a node id. */
export const EXAM_MODULES = ['lesen', 'hoeren', 'schreiben', 'sprechen'] as const
export type ExamModule = (typeof EXAM_MODULES)[number]

/**
 * Each module under the exam's own name, with the number of parts the exam
 * gives it and its time in minutes. Lesen (65) and Schreiben (60) have a
 * fixed limit. Hören is paced by its recording, about 40 minutes with the
 * five minutes to fill in the answer sheet; Sprechen takes about 15 for a
 * pair, after 15 minutes to prepare. Source: the exam's own overview.
 */
export const EXAM_MODULE_FACTS: Readonly<Record<ExamModule, { name: string; parts: number; minutes: number }>> = {
  lesen: { name: 'Lesen', parts: 5, minutes: 65 },
  hoeren: { name: 'Hören', parts: 4, minutes: 40 },
  schreiben: { name: 'Schreiben', parts: 3, minutes: 60 },
  sprechen: { name: 'Sprechen', parts: 3, minutes: 15 },
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

/** The name of a label in a drawing: {{box}}. */
const labelName = z.string().regex(/^[a-z][a-z0-9-]*$/, 'must be lower-case letters, digits and hyphens, like "box"')

/**
 * A diagram: a drawing written as SVG, the words of the learner's language
 * it shows (its labels), and a caption that says what it shows. German is
 * written in the drawing itself. The format: content/README.md, "Diagrams".
 */
const diagram = z
  .strictObject({
    /** One or two sentences saying what the drawing shows. Also what a screen reader reads for it. */
    caption: localised,
    /** Words of the learner's language, by name; the drawing shows one as {{name}}. */
    labels: z.record(labelName, localised).default({}),
    /** The drawing. */
    svg: text,
  })
  .superRefine((value, ctx) => {
    const names = Object.keys(value.labels)
    const { problems, used } = readDrawing(value.svg, names)
    for (const message of problems) ctx.addIssue({ code: 'custom', path: ['svg'], message })
    for (const name of names) {
      if (used && !used.includes(name)) {
        ctx.addIssue({ code: 'custom', path: ['labels', name], message: 'is not used in the drawing' })
      }
      const german = /\p{Script=Latin}+/u.exec(value.labels[name]?.fa ?? '')?.[0]
      if (german) {
        ctx.addIssue({
          code: 'custom',
          path: ['labels', name, 'fa'],
          message: `a label holds no German ("${german}"); write the German as its own text in the drawing`,
        })
      }
    }
  })

const example = z.strictObject({ de: text, en: textIn('en'), fa: textIn('fa') })

const mistake = z.strictObject({ wrong: text, right: text, why: localised })

/**
 * One set phrase of a phrases node. `meaning` says what the phrase means in
 * English and in Persian; its German text explains in simple German when the
 * phrase is used, since a translation would say nothing to that reader.
 */
const phrase = z.strictObject({
  /** The phrase. Where the speaker's own words follow, it is left open with "…". */
  de: text,
  meaning: localised,
  /** Ids of the exam-part nodes whose tasks this phrase serves: one or more of the node's own `examTasks`. */
  examTasks: z.array(nodeId).min(1, 'must name at least one exam task'),
  /** The phrase in use, in a whole sentence. */
  example: z.strictObject(example.shape, {
    error: ({ input }) =>
      input === undefined
        ? 'is missing: a phrase is shown in use, in one German sentence with its English and Persian'
        : undefined,
  }),
})

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

// ---------------------------------------------------------------------------
// Item tasks: a reading part as a candidate meets it, scored per item
// ---------------------------------------------------------------------------

const partId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be lower-case words joined by hyphens, like "t1"')

/** Who speaks in a heard text, and in which voice. */
const speaker = z.strictObject({
  /** The name the lines give, and the transcript shows: "Lena". */
  name: text,
  voice: voiceSchema,
})

/** One line of a heard text: who says it, and what they say (German). */
const spokenLine = z.strictObject({
  /** The name of one of the text's speakers. */
  speaker: text,
  text,
})

/**
 * A German text that a task's items are about. A text to read (Lesen: an
 * e-mail, a blog entry, an advertisement) has a `body`. A text to hear (Hören:
 * a conversation, an announcement) has `speakers` and `lines`, and each line
 * is heard in the voice of its speaker.
 */
const taskText = z
  .strictObject({
    /** Stable inside the task. */
    id: partId,
    /** A heading or subject line, where the text has one. */
    title: text.optional(),
    /** A text to read. A blank line starts a new paragraph; a line break inside a paragraph is kept. */
    body: text.optional(),
    /** A text to hear: who speaks in it, each in a voice of their own. */
    speakers: z.array(speaker).min(1).optional(),
    /** A text to hear: what is said, line by line, in the order it is heard. */
    lines: z.array(spokenLine).min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.body !== undefined) {
      for (const field of ['speakers', 'lines'] as const) {
        if (value[field] !== undefined) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: 'belongs to a text to hear; a text to read has its body only',
          })
        }
      }
      return
    }
    if (value.lines === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['body'],
        message: 'is missing: a text has a body (to read), or speakers and lines (to hear)',
      })
      return
    }
    if (value.speakers === undefined) {
      ctx.addIssue({ code: 'custom', path: ['speakers'], message: 'is missing: a text to hear names its speakers' })
      return
    }
    const { speakers } = value
    speakers.forEach((one, index) => {
      if (speakers.findIndex((other) => other.name === one.name) !== index) {
        ctx.addIssue({ code: 'custom', path: ['speakers', index, 'name'], message: `"${one.name}" is named twice` })
        return
      }
      const sameVoice = speakers.find((other) => other.voice === one.voice)
      if (sameVoice !== one) {
        ctx.addIssue({
          code: 'custom',
          path: ['speakers', index, 'voice'],
          message: `is also the voice of ${sameVoice?.name}: the speakers of one text are told apart by their voices`,
        })
      }
    })
    const names = speakers.map((one) => one.name)
    value.lines.forEach((line, index) => {
      if (!names.includes(line.speaker)) {
        ctx.addIssue({
          code: 'custom',
          path: ['lines', index, 'speaker'],
          message: `"${line.speaker}" is not a speaker of this text; its speakers are ${names.join(', ')}`,
        })
      }
    })
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
 * "Ja" or "Nein" (Lesen, Teil 4): the prompt asks whether the writer of one
 * of the texts is for something ("Ist Lisa für ein Verbot?"), and that text
 * decides.
 */
const jaNeinItem = z.strictObject({
  ...questionBase,
  type: z.literal('ja-nein'),
  /** true when the text's writer is for it (Ja), false when against (Nein). */
  answer: z.boolean(oneAnswer('ja-nein', 'must be true (Ja) or false (Nein)')),
})

/** The answer of a `which-text` item when no text of its task fits: "0", as on the exam's answer sheet. */
export const NO_TEXT = '0'

/**
 * Which text fits (Lesen, Teil 3): the prompt is a situation, and the answer
 * is the id of the one text (an advertisement) that fits it, or "0" when
 * none does. The options are the task's texts; the pipeline adds them.
 */
const whichTextItem = z.strictObject({
  ...questionBase,
  type: z.literal('which-text'),
  /** The id of the text that fits, or "0" (also written 0) when none does. */
  answer: z.preprocess(
    (value) => (value === 0 ? NO_TEXT : value),
    z.string(oneAnswer('which-text', 'must be the id of one text, or "0"')).trim().min(1, 'must not be empty'),
  ),
})

/**
 * Who says it (Hören, Teil 4): the prompt is a statement made in the
 * discussion, and the answer is the name of the speaker who makes it. The
 * options are the speakers of the task's text; the pipeline adds them.
 */
const whoSaysItem = z.strictObject({
  ...questionBase,
  type: z.literal('who-says'),
  /** The name of one speaker of the task's text. */
  answer: answerText('who-says'),
})

/**
 * One item of a task. An item is a question whose answer lies in the task's
 * texts, so it has what every question has: id, prompt, answer, explanation.
 * A `multiple-choice` item is the a, b, c of the exam: its options are shown
 * in an order drawn for each attempt (`asAsked` in the learning engine), as
 * in a node's test. The item format of another exam part joins this
 * union under its own `type`.
 */
const taskItem = z.discriminatedUnion('type', [
  richtigFalschItem,
  multipleChoiceQuestion,
  jaNeinItem,
  whichTextItem,
  whoSaysItem,
])

/** The item types of a task, as `ITEM_TASK_FORMATS` names them. */
export type TaskItemType = z.infer<typeof taskItem>['type']

const itemTaskFields = {
  texts: z.array(taskText).min(1),
  items: z.array(taskItem).min(1),
}

/** The answers of the items that choose among the task's own texts or speakers name one of them. */
function answersAreOfTheTask(task: z.infer<z.ZodObject<typeof itemTaskFields>>, ctx: z.RefinementCtx) {
  const textIds = task.texts.map((text) => text.id)
  const speakers = [...new Set(task.texts.flatMap((text) => (text.speakers ?? []).map((one) => one.name)))]
  const answeredBy = new Map<string, string>()
  task.items.forEach((item, index) => {
    const path = ['items', index, 'answer']
    if (item.type === 'which-text') {
      if (item.answer === NO_TEXT) return
      if (!textIds.includes(item.answer)) {
        const message = `"${item.answer}" is not a text of this task; its texts are ${textIds.join(', ')}, or "${NO_TEXT}" when none fits`
        ctx.addIssue({ code: 'custom', path, message })
        return
      }
      const earlier = answeredBy.get(item.answer)
      if (earlier !== undefined) {
        const message = `text "${item.answer}" is also the answer of item "${earlier}": each text fits one item at most`
        ctx.addIssue({ code: 'custom', path, message })
      }
      answeredBy.set(item.answer, item.id)
    }
    if (item.type === 'who-says' && !speakers.includes(item.answer)) {
      const message = `"${item.answer}" is not a speaker of this task; its speakers are ${speakers.join(', ') || 'none'}`
      ctx.addIssue({ code: 'custom', path, message })
    }
  })
}

/**
 * One task in the format of one exam part that the app scores itself: its
 * texts, and its items in the order the candidate answers them. It is always
 * taken whole and scored per item. A practice task of an exam-part node has
 * this shape, and so has a Lesen or Hören part of a mock exam
 * (`mockExamPartSchema`, without the id). (A writing or speaking task,
 * graded by an AI assistant, is `task` below.)
 */
export const itemTaskSchema = z
  .strictObject({
    /** Stable inside the node that holds the task. */
    id: partId,
    ...itemTaskFields,
  })
  .superRefine(answersAreOfTheTask)

export type ItemTaskFile = z.infer<typeof itemTaskSchema>

/** A part of a mock exam: a task whose id is its place, "lesen-2" for Lesen, Teil 2. */
export const mockExamPartSchema = z.strictObject(itemTaskFields).superRefine(answersAreOfTheTask)

/**
 * The format of the task of each exam part, by the id of the part's node:
 * how many texts it has and how many items, and the type of its items. A
 * part that is not listed here has no task format yet, so its node cannot
 * be published. Source: the candidate sheets of the official model set (the
 * solved example "0" that some parts begin with is not an item).
 */
export const ITEM_TASK_FORMATS: Readonly<Record<string, ItemTaskFormat>> = {
  // One longer personal text (an e-mail, a blog entry); six statements.
  'exam-lesen-1': { texts: 1, items: 6, textsAre: 'read', itemTypes: ['richtig-falsch'] },
  // Two press texts; three questions on each, the first on what the text is about.
  'exam-lesen-2': { texts: 2, items: 6, textsAre: 'read', itemTypes: ['multiple-choice'] },
  // Ten short advertisements; seven situations, each with one advertisement or none (0).
  'exam-lesen-3': { texts: 10, items: 7, textsAre: 'read', itemTypes: ['which-text'] },
  // Seven short comments on one question; is the writer of each for it?
  'exam-lesen-4': { texts: 7, items: 7, textsAre: 'read', itemTypes: ['ja-nein'] },
  // One set of rules or instructions; four questions.
  'exam-lesen-5': { texts: 1, items: 4, textsAre: 'read', itemTypes: ['multiple-choice'] },
  // Five short announcements or messages, each heard twice; per text a statement, then a question.
  'exam-hoeren-1': {
    texts: 5,
    items: 10,
    textsAre: 'heard',
    speakers: 1,
    plays: 2,
    itemTypes: ['richtig-falsch', 'multiple-choice'],
  },
  // One talk to an audience (a guided tour), heard once; five questions in the order they are heard.
  'exam-hoeren-2': { texts: 1, items: 5, textsAre: 'heard', speakers: 1, plays: 1, itemTypes: ['multiple-choice'] },
  // One conversation between two people, heard once; seven statements in the order they are heard.
  'exam-hoeren-3': { texts: 1, items: 7, textsAre: 'heard', speakers: 2, plays: 1, itemTypes: ['richtig-falsch'] },
  // One radio discussion of a moderator and two guests, heard twice; who says each of eight statements?
  'exam-hoeren-4': { texts: 1, items: 8, textsAre: 'heard', speakers: 3, plays: 2, itemTypes: ['who-says'] },
}

/** How many options a `multiple-choice` item of the exam has: a, b and c. */
export const EXAM_CHOICES = 3

export interface ItemTaskFormat {
  texts: number
  items: number
  /** How the candidate meets the texts: reads them (Lesen) or hears them (Hören). */
  textsAre: 'read' | 'heard'
  /** Of a part whose texts are heard: how many people speak in each text. */
  speakers?: number
  /** Of a part whose texts are heard: how often the exam plays each recording. */
  plays?: number
  /**
   * The type of each item, in turn: with one type every item has it; with
   * two, the first item has the first, the second the second, the third the
   * first again (Hören, Teil 1: a statement, then a question, per text).
   */
  itemTypes: readonly TaskItemType[]
}

/** The task format of an exam part, or undefined while it is not built. */
export function itemTaskFormat(part: ExamPart): ItemTaskFormat | undefined {
  return ITEM_TASK_FORMATS[examPartNodeId(part)]
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

/** The parts of a vocabulary entry that only a noun has. */
const NOUN_FIELDS = ['article', 'plural', 'number'] as const

/** The parts that every word of a published vocabulary node must have. */
const WRITTEN_WORD_FIELDS = ['class', 'level', 'meaning', 'definition', 'example'] as const

/** Whether `text` holds `word` as a whole word, whatever its capitals. */
function usesWord(text: string, word: string): boolean {
  const letters = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<!\\p{L})${letters}(?!\\p{L})`, 'iu').test(text)
}

/**
 * One word of a vocabulary node. A node that is coming soon may give `word`
 * alone; a published node needs every part (the node schema checks that).
 */
const vocabularyEntry = z
  .strictObject({
    /** The headword, without article, as the scope list spells it: "Mutter", "kochen". */
    word: text,
    class: z.enum(WORD_CLASSES).optional(),
    /** Nouns only. */
    article: z.enum(ARTICLES).optional(),
    /** Nouns only: the plural form, without article ("Mütter"). */
    plural: text.optional(),
    /** Nouns only, in place of `plural`: the noun has one number only. */
    number: z.enum(NOUN_NUMBERS).optional(),
    /** The level of the word; a node may hold words of several levels. */
    level: level.optional(),
    /** What the word means, in English and in Persian. Plain text. */
    meaning: z.strictObject({ en: textIn('en'), fa: textIn('fa') }).optional(),
    /** What the word means, in simple German that does not use the word itself. A phrase without a full stop. */
    definition: text.optional(),
    /** One original sentence that uses the word. */
    example: example.optional(),
    /** Other German that is right when a learner is asked for this word, written exactly: "die Mama". */
    alsoAccepted: z.array(text).default([]),
    /** Words of this node that mean nearly the same; their meaning is never offered as a wrong option for this word. */
    tooCloseTo: z.array(text).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.definition !== undefined && usesWord(value.definition, value.word)) {
      ctx.addIssue({
        code: 'custom',
        path: ['definition'],
        message: `uses the word "${value.word}" itself; the definition is what a learner who reads in German is asked for the word by`,
      })
    }
    if (value.class !== undefined && value.class !== 'noun') {
      const wordClass = `${/^[aeiou]/.test(value.class) ? 'an' : 'a'} ${value.class}`
      for (const field of NOUN_FIELDS) {
        if (value[field] !== undefined) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `only a noun has this, and this word is ${wordClass}`,
          })
        }
      }
      return
    }
    if (value.plural !== undefined && value.number !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['number'],
        message: 'a noun with a plural has both numbers; give the plural or this, not both',
      })
    }
    const bare = value.plural?.replace(/^die\s+/i, '')
    if (value.plural !== undefined && bare !== value.plural) {
      ctx.addIssue({ code: 'custom', path: ['plural'], message: `is written without its article: "${bare}"` })
    }
    if (value.number === 'plural-only' && value.article !== undefined && value.article !== 'die') {
      ctx.addIssue({ code: 'custom', path: ['article'], message: 'a noun that has only a plural takes "die"' })
    }
  })

/** The words of a vocabulary node. What one word says about another must hold inside the node. */
const vocabularyEntries = z
  .array(vocabularyEntry)
  .min(1)
  .superRefine((words, ctx) => {
    const ofNode = new Set(words.map((entry) => entry.word))
    words.forEach((entry, index) => {
      entry.tooCloseTo.forEach((other, place) => {
        if (!ofNode.has(other) || other === entry.word) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'tooCloseTo', place],
            message: other === entry.word ? 'names the word itself' : `"${other}" is not a word of this node`,
          })
        }
      })
    })
  })

/** The fields that the nodes of one kind have, and no others. */
const FIELDS_OF_ONE_KIND = {
  module: 'exam-part',
  part: 'exam-part',
  practice: 'exam-part',
  purpose: 'phrases',
  examTasks: 'phrases',
  phrases: 'phrases',
  words: 'vocabulary',
} as const satisfies Record<string, NodeKind>

const withArticle = (kind: NodeKind) => `${kind === 'exam-part' ? 'an' : 'a'} ${kind}`

/**
 * The content sections that a published node with a pool must have, by its
 * kind. A writing or speaking node has a task instead (see `isAssistantGraded`).
 */
const SECTIONS_OF_A_PUBLISHED = {
  // A grammar node needs a table, a diagram or both; that is checked below.
  grammar: ['explanations', 'examples', 'mistakes', 'questions'],
  phrases: ['phrases', 'questions'],
} as const satisfies Partial<Record<NodeKind, readonly string[]>>

const hasAPage = (kind: NodeKind): kind is keyof typeof SECTIONS_OF_A_PUBLISHED => kind in SECTIONS_OF_A_PUBLISHED

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
    /** Drawings, shown after the rule and before the table. A published node needs a table, a diagram or both. */
    diagrams: z.array(diagram).min(1).optional(),
    examples: z.array(example).min(1).optional(),
    mistakes: z.array(mistake).min(1).optional(),
    /** Phrases nodes only: the set phrases, in the order the page shows them. */
    phrases: z.array(phrase).min(1).optional(),
    questions: z.array(question).min(1).optional(),
    /**
     * Only in an exam-part node: its practice tasks, each in the format of
     * the node's exam part. An attempt takes one of them, whole.
     */
    practice: z.array(itemTaskSchema).min(1).optional(),
    /** How many questions of the pool one attempt draws. */
    attemptSize: z
      .number()
      .int('must be a whole number')
      .min(10, 'must be 10 to 15: an attempt draws 10 to 15 questions')
      .max(15, 'must be 10 to 15: an attempt draws 10 to 15 questions')
      .default(10),
    /** A published node must have one that matches its pool; the content pipeline checks it. */
    review: reviewRecord.optional(),

    /** Vocabulary nodes only: the words of the node. Its page lists them and its test is made from them. */
    words: vocabularyEntries.optional(),
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
    if (value.kind === 'vocabulary') {
      if (!value.id.startsWith('vocabulary-')) {
        ctx.addIssue({
          code: 'custom',
          path: ['id'],
          message: 'a vocabulary node id is "vocabulary-" plus the name of its theme, like "vocabulary-family"',
        })
      }
      if (value.words === undefined) {
        ctx.addIssue({ code: 'custom', path: ['words'], message: 'is missing: a vocabulary node lists its words' })
      }
      if (value.questions !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions'],
          message: 'a vocabulary node writes no questions: its test is made from its words',
        })
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

    // What the learner does with an exam part follows from its module: an AI
    // assistant grades a writing or speaking task; a reading part is practised
    // with tasks the app scores per item.
    if (value.kind === 'exam-part' && value.module !== undefined) {
      if (isAssistantGraded(value)) {
        if (value.practice !== undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['practice'],
            message: 'a writing or speaking part has no practice task of items: an AI assistant grades its task',
          })
        }
      } else if (value.task !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['task'],
          message: 'only a writing or speaking part has a task for an AI assistant; this part has practice tasks',
        })
      }
    }

    // A writing or speaking task has the fields of its part. A part that its module does not have is reported above.
    if (isAssistantGraded(value) && value.part !== undefined && value.task) {
      const taskFields = TASK_FIELDS[value.module][value.part]
      if (taskFields) {
        taskFitsItsPart(value.task, taskFields, ctx, ['task'])
      }
    }

    if (value.status !== 'published') return
    if (value.kind === 'vocabulary') {
      const required = 'is required for a published node'
      ;(value.words ?? []).forEach((entry, index) => {
        const missing = (field: string, why = '') =>
          ctx.addIssue({ code: 'custom', path: ['words', index, field], message: `${required}${why}` })
        for (const field of WRITTEN_WORD_FIELDS) {
          if (entry[field] === undefined) missing(field)
        }
        if (entry.class !== 'noun') return
        if (entry.article === undefined) missing('article', ': a noun is learned with its article')
        if (entry.plural === undefined && entry.number === undefined) {
          missing(
            'plural',
            ': the plural of the noun, or "number: singular-only" or "number: plural-only" in its place',
          )
        }
      })
      return
    }
    if (hasAPage(value.kind)) {
      for (const section of SECTIONS_OF_A_PUBLISHED[value.kind]) {
        if (value[section] === undefined) {
          ctx.addIssue({ code: 'custom', path: [section], message: 'is required for a published node' })
        }
      }
      if (value.kind === 'grammar' && value.table === undefined && value.diagrams === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['table'],
          message: 'is required for a published node, unless it has a diagram',
        })
      }
      return
    }
    if (value.kind !== 'exam-part') {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: `${withArticle(value.kind)} node cannot be published yet; it has no page`,
      })
      return
    }

    // A published exam part. Without its module and part it is already rejected above.
    const { module, part } = value
    if (module === undefined || part === undefined) return
    if (!isAssistantGraded(value) && itemTaskFormat({ module, part }) === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: `${EXAM_MODULE_FACTS[module].name}, Teil ${part} cannot be published yet: the format of its practice task is not built`,
      })
      return
    }
    // Every exam part's page: what the part asks, how it is scored, how to approach it.
    if (value.explanations === undefined) {
      ctx.addIssue({ code: 'custom', path: ['explanations'], message: 'is required for a published node' })
    }
    // Then what the learner does with it.
    if (isAssistantGraded(value)) {
      if (value.task === undefined) {
        ctx.addIssue({ code: 'custom', path: ['task'], message: 'is required for a published node' })
      }
    } else if (value.practice === undefined) {
      ctx.addIssue({ code: 'custom', path: ['practice'], message: 'is required for a published node' })
    }
  })

/**
 * A task holds the fields of its exam part, no others, and as many points as
 * the part has. `at` is where the task stands in its file.
 */
function taskFitsItsPart(
  value: z.infer<typeof task>,
  part: { name: string; fields: TaskField[]; points?: number },
  ctx: z.RefinementCtx,
  at: PropertyKey[],
): void {
  for (const field of part.fields) {
    if (value[field] === undefined) {
      ctx.addIssue({ code: 'custom', path: [...at, field], message: `is required for ${part.name}` })
    }
  }
  for (const field of Object.keys(value) as TaskField[]) {
    if (value[field] !== undefined && !part.fields.includes(field)) {
      ctx.addIssue({
        code: 'custom',
        path: [...at, field],
        message: `does not belong to ${part.name}; that task has: ${part.fields.join(', ')}`,
      })
    }
  }
  if (part.points !== undefined && value.points !== undefined && value.points.length !== part.points) {
    ctx.addIssue({
      code: 'custom',
      path: [...at, 'points'],
      message: `${part.name} has exactly ${part.points} points, this task has ${value.points.length}`,
    })
  }
}

export type NodeFile = z.infer<typeof nodeFileSchema>

/**
 * The question types in which the learner produces the form: types it, or
 * builds the sentence from its pieces. A recognise-only node must not use
 * them. Every other type offers the forms, or a sentence to judge, and asks
 * the learner to recognise and understand: those are the understanding
 * questions a recognise-only pool is made of.
 */
export const PRODUCING_QUESTION_TYPES = ['typed-answer', 'typed-gap-fill', 'word-order'] as const satisfies Array<
  NonNullable<NodeFile['questions']>[number]['type']
>

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
// Original mock exams (source): mock-exams/<id>.yaml
// ---------------------------------------------------------------------------

/**
 * The modules a mock exam holds as tasks scored per item, in the order of
 * the exam. Each is a list of its parts, Teil 1 first, each in the format of
 * its exam part (`ITEM_TASK_FORMATS`).
 */
export const MOCK_EXAM_ITEM_MODULES = ['lesen', 'hoeren'] as const
export type MockExamItemModule = (typeof MOCK_EXAM_ITEM_MODULES)[number]

/**
 * The modules a mock exam holds as tasks that an AI assistant grades, after
 * Lesen and Hören: Schreiben, Aufgabe 1 to 3, and Sprechen, Teil 1 to 3. A
 * task has the fields of its part, as the task of a writing or speaking
 * node has (`TASK_FIELDS`).
 */
export const MOCK_EXAM_ASSISTANT_MODULES = ASSISTANT_GRADED_MODULES

/**
 * One original mock exam: a full exam in the Goethe B1 format, written for
 * this project. A file that is coming soon may be its title alone.
 */
export const mockExamFileSchema = z
  .strictObject({
    /** Stable for ever: the learner's history is kept under it. "mock-exam-1". */
    id: nodeId,
    /** Its place in the list of mock exams; lower comes first. */
    order: z.number().int('must be a whole number').positive(),
    status: z.enum(NODE_STATUSES),
    title: localised,
    /** Lesen, Teil 1 to Teil 5. */
    lesen: z.array(mockExamPartSchema).min(1).optional(),
    /** Hören, Teil 1 to Teil 4. */
    hoeren: z.array(mockExamPartSchema).min(1).optional(),
    /** Schreiben, Aufgabe 1 to Aufgabe 3. */
    schreiben: z.array(task).min(1).optional(),
    /** Sprechen, Teil 1 to Teil 3. */
    sprechen: z.array(task).min(1).optional(),
    /** A published exam must have one that matches its texts and items; the content pipeline checks it. */
    review: reviewRecord.optional(),
  })
  .superRefine((value, ctx) => {
    for (const module of MOCK_EXAM_ASSISTANT_MODULES) {
      ;(value[module] ?? []).forEach((one, index) => {
        const taskFields = TASK_FIELDS[module][index + 1]
        if (taskFields) taskFitsItsPart(one, taskFields, ctx, [module, index])
      })
    }
    if (value.status !== 'published') return
    for (const module of [...MOCK_EXAM_ITEM_MODULES, ...MOCK_EXAM_ASSISTANT_MODULES]) {
      const { name, parts } = EXAM_MODULE_FACTS[module]
      const held = value[module]?.length ?? 0
      if (held !== parts) {
        ctx.addIssue({
          code: 'custom',
          path: [module],
          message: `must hold the ${parts} parts of ${name}, Teil 1 to Teil ${parts}; it holds ${held}`,
        })
      }
    }
  })

export type MockExamFile = z.infer<typeof mockExamFileSchema>

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
   * The node is published and the app can test it, so its test can be started
   * at `#/node/<id>/test` without opening its page: a draw from its pool, or
   * for an exam part one of its practice tasks. False for a node that becomes
   * done in another way (a score typed in).
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

/**
 * A diagram as the app draws it. The drawing is read into shapes; a label
 * stands in it by name, and the app writes it in the learner's language.
 */
export interface Diagram {
  /** The width and height of the drawing. The app scales it to the page. */
  width: number
  height: number
  drawing: DiagramPart[]
  labels: Record<string, Localised>
  caption: Localised<RichText>
}

export type { DiagramPart, DiagramShape, DiagramTag } from './diagram.ts'

export interface Example {
  de: string
  en: string
  fa: string
}

/** An example as a page shows it, with the audio of its German (see `Spoken` in audio.ts). */
export interface HeardExample extends Example {
  audio: Spoken
}

export interface Mistake {
  wrong: string
  right: string
  why: Localised<RichText>
  /** What says `right`. The wrong sentence is never said: a learner should not hear it. */
  audio: Spoken
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
  /** The partners to choose from, mixed, and drawn anew for each attempt (`asAsked`). No two are the same. */
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

/**
 * Vocabulary, from German: the learner reads a word and chooses what it
 * means. The prompt is the word as it is learned ("die Mutter"). Made from
 * the words of a vocabulary node, never written in a node file.
 */
export interface MeaningOfWordQuestion extends QuestionBase {
  type: 'meaning-of-word'
  /** The headword the question is about. An attempt asks about a word once while it has other words to ask. */
  word: string
  /**
   * What the learner chooses from, each the meaning of one word of the node:
   * `en` and `fa` in that language, `de` the German definition. `word` names
   * the option whatever the language.
   */
  options: Array<{ word: string; meaning: Localised }>
  /** The `word` of the one right option. */
  answer: string
}

/**
 * Vocabulary, into German: the learner reads a meaning and types the word, a
 * noun with its article. Made from the words of a vocabulary node.
 */
export interface WordForMeaningQuestion extends Omit<QuestionBase, 'prompt'> {
  type: 'word-for-meaning'
  /** The headword the question is about. */
  word: string
  /** The meaning in the learner's language; `de` is the German definition. */
  prompt: Localised
  /** Every accepted answer, as in a typed answer. The first is the word as it is learned. */
  answers: string[]
}

/** An item of an exam task: the prompt is a statement about the task's text; `answer` says whether the text makes it right. */
export interface RichtigFalschQuestion extends QuestionBase {
  type: 'richtig-falsch'
  answer: boolean
}

/** An item of an exam task: the prompt asks whether a text's writer is for something; `answer` true is Ja. */
export interface JaNeinQuestion extends QuestionBase {
  type: 'ja-nein'
  answer: boolean
}

/**
 * An item of an exam task: the prompt is a situation; the options are the
 * ids of the task's texts and, last, "0" for none. `answer` is one of them.
 */
export interface WhichTextQuestion extends QuestionBase {
  type: 'which-text'
  options: string[]
  answer: string
}

/** An item of an exam task: the prompt is a statement; the options are the speakers of the task's text. */
export interface WhoSaysQuestion extends QuestionBase {
  type: 'who-says'
  options: string[]
  answer: string
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
  | FindErrorQuestion
  | WordOrderQuestion
  | MatchingQuestion
  | RichtigFalschQuestion
  | JaNeinQuestion
  | WhichTextQuestion
  | WhoSaysQuestion
  | MeaningOfWordQuestion
  | WordForMeaningQuestion

/** One word of a vocabulary node, as its page shows it and as its test asks it. */
export interface VocabularyWord {
  /** The headword, without article: "Mutter", "kochen". */
  word: string
  class: WordClass
  /** Of a noun. */
  article?: Article
  /** Of a noun: its plural, without article ("Mütter"). Absent when the noun has one number only. */
  plural?: string
  /** Of a noun that has one number only. */
  number?: NounNumber
  /** The level the word belongs to; a node may hold words of several. */
  level: string
  /** What the word means, in the learner's language. A learner who reads in German gets the definition. */
  meaning: { en: string; fa: string }
  /** What the word means, in simple German that does not use the word itself. */
  definition: string
  example: Example
  /** Other German that is right when the learner is asked for this word, written exactly ("die Mama"). */
  alsoAccepted: string[]
  /** Words of the same node that mean nearly the same; their meaning is never a wrong option for this word. */
  tooCloseTo: string[]
}

/** A word as its page shows it: the word with its article can be heard, and so can its example. */
export type HeardWord = VocabularyWord & { audio: Spoken; example: HeardExample }

/**
 * A word as it is learned, said and asked for: a noun with its article
 * ("die Mutter"), any other word on its own ("kochen").
 */
export function asLearned(word: Pick<VocabularyWord, 'word' | 'article'>): string {
  return word.article ? `${word.article} ${word.word}` : word.word
}

/** The plural of a noun as it is learned ("die Mütter"), or undefined for a word without one. */
export function pluralAsLearned(word: Pick<VocabularyWord, 'plural'>): string | undefined {
  return word.plural ? `die ${word.plural}` : undefined
}

/** A question that is an item of an item task: its answer lies in the task's texts. */
export type TaskItem =
  | RichtigFalschQuestion
  | MultipleChoiceQuestion
  | JaNeinQuestion
  | WhichTextQuestion
  | WhoSaysQuestion

/** A text of a task: one to read, or one to hear (`isHeard` in scoring.ts tells them apart). */
export type TaskText = ReadText | HeardText

/** A text to read (Lesen). */
export interface ReadText {
  /** Stable inside the task. */
  id: string
  /** German: a heading or subject line. */
  title?: string
  /** German. A line break inside a paragraph is part of the text (a greeting, a signature). */
  paragraphs: string[]
}

/**
 * A text to hear (Hören): a conversation or an announcement, line by line.
 * Each line carries the audio that says it in its speaker's voice; played
 * one after the other, the lines are the recording.
 */
export interface HeardText {
  /** Stable inside the task. */
  id: string
  /** German: what the recording is about. */
  title?: string
  lines: HeardLine[]
}

export interface HeardLine {
  /** The name of who says the line. */
  speaker: string
  /** German: what is said, as the transcript shows it. */
  text: string
  /** The line said in its speaker's voice. */
  audio: Spoken
}

/**
 * One task in the format of one exam part that the app scores itself: texts
 * to read, and items in the order they are answered. It is taken whole and
 * scored per item with the learning engine's `scoreAttempt(task.items, answers)`.
 */
export interface ItemTask {
  /** Stable inside the node or exam that holds the task. */
  id: string
  texts: TaskText[]
  items: TaskItem[]
}

/**
 * What the page of every exam part begins with, whatever its module: what
 * the part asks, how it is scored, how to approach it.
 */
export type ExamPartExplanations = Localised<{
  /** What the part asks the candidate to do. */
  task: RichText
  /** How the part is scored. */
  scoring: RichText
  /** How to approach the part: steps, in order. */
  approach: RichText[]
}>

/** The page content of a reading part: its explanations and the practice tasks the app scores per item. */
export interface PracticeContent {
  explanations: ExamPartExplanations
  /** The practice tasks. An attempt takes one of them, whole. */
  practice: ItemTask[]
}

export interface GrammarContent {
  explanations: Localised<{ rule: RichText }>
  /** A node explained by a diagram alone has no table. */
  table?: GrammarTable
  /** Drawings, shown after the rule and before the table. */
  diagrams?: Diagram[]
  examples: HeardExample[]
  mistakes: Mistake[]
  /** The pool. */
  questions: Question[]
  /** How many questions of the pool one attempt draws. */
  attemptSize: number
}

/** What the page and the test of a published vocabulary node need. */
export interface VocabularyContent {
  /** In the order of the node file. */
  words: HeardWord[]
  /** The pool, made from the words: each word from German and into German. */
  questions: Question[]
  /** How many questions of the pool one attempt draws. */
  attemptSize: number
}

/** One set phrase, as the page of a phrases node shows it. */
export interface Phrase {
  /** The phrase itself. */
  de: string
  /** What says the phrase itself. */
  audio: Spoken
  /** What it means in English and in Persian, and in simple German when it is used. */
  meaning: Localised<RichText>
  /** Ids of the exam-part nodes whose tasks the phrase serves. */
  examTasks: string[]
  /** The phrase in use. */
  example: HeardExample
}

export interface PhrasesContent {
  phrases: Phrase[]
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
 * The page content of a writing or speaking node: its explanations and its
 * task. There is no pool: the learner does the task, an AI assistant grades
 * it with the prompt the app provides, and the learner types the score in.
 */
export interface ExamTaskContent {
  explanations: ExamPartExplanations
  task: ExamTask
}

/** A node as the app loads it. `content` is null until the node is published. */
export interface CompiledNode extends NodeSummary {
  content: NodeContent | null
}

/**
 * What a node's page is built from. Which one it is follows from what it
 * holds: a pool (and words, for vocabulary), practice tasks, or a task for an AI assistant (see
 * `hasPool` and `hasPractice` in scoring.ts).
 */
export type NodeContent = GrammarContent | VocabularyContent | PhrasesContent | PracticeContent | ExamTaskContent

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

/**
 * What one published topic gives to the checkpoint of its level: its pool.
 * A level's checkpoint file (`checkpoints/<level>.json`) is a list of these,
 * in curriculum order; the app fetches it when the checkpoint opens.
 */
export interface CheckpointPool {
  nodeId: string
  questions: Question[]
}

/** An original mock exam as the list of mock exams shows it (`mock-exams.json`). */
export interface MockExamSummary {
  id: string
  order: number
  status: NodeStatus
  title: Localised<RichText>
  /** The modules it can be taken in, in the order of the exam. None while it is coming soon. */
  modules: ExamModule[]
}

/** An original mock exam with what is taken (`mock-exams/<id>.json`). */
export interface MockExam extends MockExamSummary {
  /** Null while it is coming soon. */
  content: MockExamContent | null
}

export interface MockExamContent {
  /** In the order of the exam. */
  modules: MockExamModule[]
}

/**
 * One module of a mock exam. A module that the app scores per item (Lesen,
 * Hören) holds item tasks; a module graded by an AI assistant (Schreiben,
 * Sprechen) holds the tasks of a writing or speaking node. The mock exam
 * page picks the view by `scoredBy`.
 */
export type MockExamModule = ItemTaskModule | AssistantTaskModule

/** Lesen or Hören of a mock exam: its parts, each a task scored per item. */
export interface ItemTaskModule {
  module: MockExamItemModule
  scoredBy: 'items'
  /** The time of the module in the exam (`EXAM_MODULE_FACTS`). */
  minutes: number
  /** Teil 1 first. */
  parts: ItemTaskPart[]
}

export interface ItemTaskPart {
  /** The part's number in its module. */
  part: number
  /** Its id is the part's place: "lesen-2". */
  task: ItemTask
  /** Of a part whose texts are heard: how often each recording may be played, as in the exam. */
  plays?: number
}

/** Schreiben or Sprechen of a mock exam: its tasks, which an AI assistant grades and the learner scores. */
export interface AssistantTaskModule {
  module: AssistantGradedModule
  scoredBy: 'assistant'
  /** The time of the module in the exam (`EXAM_MODULE_FACTS`). */
  minutes: number
  /** Aufgabe 1 or Teil 1 first. */
  parts: AssistantTaskPart[]
}

export interface AssistantTaskPart {
  /** The part's number in its module. */
  part: number
  task: ExamTask
}

/** `mock-exams.json`: every mock exam, in order. */
export interface MockExamList {
  exams: MockExamSummary[]
}

export interface ContentBundle {
  index: ContentIndex
  nodes: CompiledNode[]
  officialMockExams: OfficialMockExam[]
  /** The original mock exams, in order. */
  mockExams: MockExam[]
  search: Localised<SearchData>
  overview: GrammarOverview
  /** Each level's checkpoint data, by level. */
  checkpoints: Record<string, CheckpointPool[]>
}
