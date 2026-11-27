/**
 * Content pipeline: the chapter list, node files and the list of official
 * mock exams in, compiled bundle and a report out.
 *
 * `compileContent` reads and validates; it never writes. `writeBundle` puts a
 * compiled bundle on disk. The command line (cli.ts) and the site build
 * (vite-plugin.ts) are thin callers of these.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { z } from 'zod'
import { spoken, spokenLines } from '../audio/index.ts'
import type { SpokenLine } from '../content-model/audio.ts'
import { readDrawing } from '../content-model/diagram.ts'
import {
  type ChapterEntry,
  type CompiledNode,
  type ContentBundle,
  type ContentIndex,
  chaptersFileSchema,
  type Diagram,
  type ExamPartExplanations,
  type ExamTask,
  type ExamTaskContent,
  type FindErrorQuestion,
  GAP,
  type GrammarContent,
  type ItemTask,
  type ItemTaskFile,
  LANGUAGES,
  type Language,
  type Localised,
  NO_TEXT,
  type NodeContent,
  type NodeFile,
  type NodeSummary,
  nodeFileSchema,
  type OfficialMockExam,
  type OfficialMockExams,
  officialMockExamsFileSchema,
  type PhrasesContent,
  type PracticeContent,
  type Question,
  type RichText,
  type TaskText,
  WORD,
} from '../content-model/index.ts'
import { hasPool, hasPractice, isAssistantGraded } from '../content-model/scoring.ts'
import { READINESS_EXAMS } from '../learning-engine/index.ts'
import { audioProblems, presentAudio } from './audio.ts'
import { checkpointData } from './checkpoint-data.ts'
import { CHAPTERS_FILE, CHECKS, type CheckedNode, type ContentProblem, formatPath } from './checks/index.ts'
import { mixedAwayFrom } from './mix.ts'
import { compileMockExam, MOCK_EXAMS_JSON, mockExamList, readMockExams } from './mock-exams.ts'
import { overviewData } from './overview-data.ts'
import { persianProblem } from './persian-texts.ts'
import { searchData } from './search-data.ts'
import { compileVocabularyContent } from './vocabulary.ts'

/** The list of official mock exams, beside the `nodes` folder, and its file in the compiled bundle. */
export const OFFICIAL_MOCK_EXAMS_FILE = 'official-mock-exams.yaml'
export const OFFICIAL_MOCK_EXAMS_JSON = 'official-mock-exams.json'

export type { ContentProblem }

export interface PipelineReport {
  ok: boolean
  errors: ContentProblem[]
  nodes: { total: number; published: number; comingSoon: number }
  questions: number
}

export interface PipelineResult {
  report: PipelineReport
  /** Null when the report has errors. */
  bundle: ContentBundle | null
}

export interface CompileOptions {
  /**
   * Whether every spoken item of a published node must have its audio file
   * (default true). Only the command that generates the audio turns it off.
   */
  requireAudio?: boolean
}

export async function compileContent(
  contentDir: string,
  { requireAudio = true }: CompileOptions = {},
): Promise<PipelineResult> {
  const errors: ContentProblem[] = []
  const checked: CheckedNode[] = []
  const ids = new Set<string>()

  const files = await findNodeFiles(contentDir)
  if (files.length === 0) {
    errors.push({ file: 'nodes', message: `no node files (*.yaml) found under ${path.join(contentDir, 'nodes')}` })
  }

  for (const file of files) {
    const source = await readFile(path.join(contentDir, file), 'utf8')

    let raw: unknown
    try {
      raw = parseYaml(source)
    } catch (error) {
      errors.push({ file, node: nodeOf(file), message: `is not valid YAML: ${(error as Error).message}` })
      ids.add(nodeOf(file))
      continue
    }
    ids.add(nodeOf(file, raw))

    const parsed = nodeFileSchema.safeParse(raw)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          file,
          node: nodeOf(file, raw),
          ...questionAt(issue.path, raw),
          where: formatPath(issue.path),
          message: issue.message,
        })
      }
      continue
    }

    const { id } = parsed.data
    if (path.basename(file) !== `${id}.yaml`) {
      errors.push({ file, node: id, where: 'id', message: `the file of node "${id}" must be named ${id}.yaml` })
      continue
    }

    checked.push({ file, node: parsed.data })
  }

  const chapters = await readChapters(contentDir, errors)
  const officialMockExams = await readOfficialMockExams(contentDir, errors)
  const checkedMockExams = await readMockExams(contentDir, errors)

  for (const check of CHECKS) {
    errors.push(...(await check({ contentDir, nodes: checked, ids, chapters })))
  }

  // The curriculum order: chapter by chapter, and inside a chapter by `order`.
  const chapterPlace = new Map((chapters ?? []).map((chapter, index) => [chapter.id, index]))
  const placeOf = (node: CompiledNode) => chapterPlace.get(node.chapter) ?? Number.POSITIVE_INFINITY
  const nodes = checked.map(({ node }) => compileNode(node))
  nodes.sort((a, b) => placeOf(a) - placeOf(b) || a.order - b.order || a.id.localeCompare(b.id))

  const mockExams = checkedMockExams
    .map(({ exam }) => compileMockExam(exam, compileItemTask, richTextIn))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

  // What the published pages and mock exams say aloud, and whether its files are there.
  const fileOf = new Map([
    ...checked.map(({ file, node }) => [node.id, file] as const),
    ...checkedMockExams.map(({ file, exam }) => [exam.id, file] as const),
  ])
  errors.push(...audioProblems([...nodes, ...mockExams], fileOf, requireAudio ? await presentAudio(contentDir) : null))

  const published = nodes.filter((node) => node.status === 'published').length
  const report: PipelineReport = {
    ok: errors.length === 0,
    errors,
    nodes: { total: nodes.length, published, comingSoon: nodes.length - published },
    questions: nodes.reduce((sum, node) => sum + questionCount(node.content), 0),
  }

  const index: ContentIndex = {
    chapters: (chapters ?? []).map((chapter) => ({ ...chapter, title: richTextIn(chapter.title) })),
    nodes: nodes.map(summarise),
  }
  return {
    report,
    bundle: report.ok
      ? {
          index,
          nodes,
          officialMockExams: officialMockExams ?? [],
          mockExams,
          search: searchData(nodes),
          overview: overviewData(nodes),
          checkpoints: checkpointData(nodes, index),
        }
      : null,
  }
}

/** The files of a compiled bundle, as paths relative to the bundle folder. */
export function bundleFiles(bundle: ContentBundle): Array<{ path: string; json: string }> {
  return [
    { path: 'index.json', json: JSON.stringify(bundle.index) },
    {
      path: OFFICIAL_MOCK_EXAMS_JSON,
      json: JSON.stringify({ exams: bundle.officialMockExams } satisfies OfficialMockExams),
    },
    ...bundle.nodes.map((node) => ({ path: `nodes/${node.id}.json`, json: JSON.stringify(node) })),
    // The list first; an exam's parts only when it is opened.
    { path: MOCK_EXAMS_JSON, json: JSON.stringify(mockExamList(bundle.mockExams)) },
    ...bundle.mockExams.map((exam) => ({ path: `mock-exams/${exam.id}.json`, json: JSON.stringify(exam) })),
    // Fetched only when the learner opens a level's checkpoint.
    ...Object.entries(bundle.checkpoints).map(([level, pools]) => ({
      path: `checkpoints/${level}.json`,
      json: JSON.stringify(pools),
    })),
    // Fetched only when the learner opens the "all grammar at a glance" page.
    { path: 'overview.json', json: JSON.stringify(bundle.overview) },
    // Fetched only when the learner opens search.
    ...LANGUAGES.map((language) => ({
      path: `search/${language}.json`,
      json: JSON.stringify(bundle.search[language]),
    })),
  ]
}

/** Replaces `outDir` with the compiled bundle. */
export async function writeBundle(bundle: ContentBundle, outDir: string): Promise<void> {
  await rm(outDir, { recursive: true, force: true })
  for (const file of bundleFiles(bundle)) {
    const target = path.join(outDir, file.path)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, file.json)
  }
}

/** The report as text for a terminal. */
export function formatReport(report: PipelineReport): string {
  if (!report.ok) return formatErrors(report.errors)
  const { total, published, comingSoon } = report.nodes
  return [
    ...report.errors.map(formatProblem),
    `Content OK. Nodes: ${total} (${published} published, ${comingSoon} coming soon). Questions: ${report.questions}.`,
  ].join('\n')
}

/** The content errors that stopped a compile, one line each, and their count. */
export function formatErrors(errors: readonly ContentProblem[]): string {
  return [
    ...errors.map(formatProblem),
    `Content has ${errors.length} error${errors.length === 1 ? '' : 's'}. Nothing was compiled.`,
  ].join('\n')
}

/** "ERROR node grammar-001, question q2 (nodes/grammar/grammar-001.yaml at questions[1].answer): …" */
function formatProblem(problem: ContentProblem): string {
  const place = `${problem.file}${problem.where ? ` at ${problem.where}` : ''}`
  if (!problem.node) return `ERROR ${place}: ${problem.message}`
  const question = problem.question ? `, question ${problem.question}` : ''
  return `ERROR node ${problem.node}${question} (${place}): ${problem.message}`
}

async function findNodeFiles(contentDir: string): Promise<string[]> {
  const nodesDir = path.join(contentDir, 'nodes')
  let entries: string[]
  try {
    entries = await readdir(nodesDir, { recursive: true })
  } catch {
    return []
  }
  return entries
    .filter((entry) => entry.endsWith('.yaml'))
    .map((entry) => path.posix.join('nodes', entry.split(path.sep).join('/')))
    .sort()
}

/** The chapter list, or null when it cannot be used; the reason is then added to `errors`. */
function readChapters(contentDir: string, errors: ContentProblem[]): Promise<ChapterEntry[] | null> {
  return readListFile(contentDir, CHAPTERS_FILE, chaptersFileSchema, errors, {
    whenMissing: 'is missing: the chapter list that every node file names a chapter of',
  })
}

/**
 * The official mock exams, compiled, or null when the list cannot be used;
 * the reasons are then added to `errors`.
 */
async function readOfficialMockExams(contentDir: string, errors: ContentProblem[]): Promise<OfficialMockExam[] | null> {
  const before = errors.length
  const exams = await readListFile(contentDir, OFFICIAL_MOCK_EXAMS_FILE, officialMockExamsFileSchema, errors, {
    whenMissing: 'is missing: the list of official mock exams that the readiness view links to',
  })
  if (!exams) return null

  exams.forEach((exam, examIndex) => {
    exam.links.forEach((link, linkIndex) => {
      const message = link.note && persianProblem(link.note.fa)
      if (message) {
        errors.push({ file: OFFICIAL_MOCK_EXAMS_FILE, where: `[${examIndex}].links[${linkIndex}].note.fa`, message })
      }
    })
  })

  const counting = exams.filter((exam) => exam.countsTowardReadiness).length
  if (counting < READINESS_EXAMS) {
    errors.push({
      file: OFFICIAL_MOCK_EXAMS_FILE,
      message: `only ${counting} exam${counting === 1 ? ' counts' : 's count'} toward readiness: the readiness rule needs ${READINESS_EXAMS}, so the learner could never reach it`,
    })
  }
  if (errors.length > before) return null

  return exams.map((exam) => ({
    ...exam,
    // The day a link was last checked is for maintainers; the learner is not shown it.
    links: exam.links.map(({ checked: _checked, note, ...link }) => ({
      ...link,
      ...(note ? { note: richTextIn(note) } : {}),
    })),
  }))
}

/**
 * A content file that holds one list, read and held against its schema. Null
 * when it cannot be used; the reason is then added to `errors`.
 */
async function readListFile<T>(
  contentDir: string,
  file: string,
  schema: z.ZodType<T>,
  errors: ContentProblem[],
  { whenMissing }: { whenMissing: string },
): Promise<T | null> {
  let source: string
  try {
    source = await readFile(path.join(contentDir, file), 'utf8')
  } catch {
    errors.push({ file, message: whenMissing })
    return null
  }

  let raw: unknown
  try {
    raw = parseYaml(source)
  } catch (error) {
    errors.push({ file, message: `is not valid YAML: ${(error as Error).message}` })
    return null
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({ file, where: formatPath(issue.path), message: issue.message })
    }
    return null
  }
  return parsed.data
}

/** The node a file holds: the id it states, or else the id its name promises. */
function nodeOf(file: string, raw?: unknown): string {
  const id = (raw as { id?: unknown } | null | undefined)?.id
  return typeof id === 'string' && id !== '' ? id : path.basename(file, '.yaml')
}

/**
 * The question that a place such as `questions[1].answer` lies in, if it
 * states an id. An item of a practice task (`practice[0].items[4].answer`) is
 * named with its task: "t1/i5".
 */
function questionAt(pathParts: PropertyKey[], raw: unknown): { question?: string } {
  type Identified = { id?: unknown } | null
  const named = (...ids: unknown[]) =>
    ids.every((id) => typeof id === 'string' && id !== '') ? { question: ids.join('/') } : {}

  const [section, first, inner, second] = pathParts
  if (section === 'questions' && typeof first === 'number') {
    return named((raw as { questions?: Identified[] }).questions?.[first]?.id)
  }
  if (section === 'practice' && typeof first === 'number' && inner === 'items' && typeof second === 'number') {
    const task = (raw as { practice?: Array<{ id?: unknown; items?: Identified[] } | null> }).practice?.[first]
    return named(task?.id, task?.items?.[second]?.id)
  }
  return {}
}

/**
 * How many questions a published node asks: its pool, or the items of its
 * practice tasks. A writing or speaking task asks none the app scores.
 */
function questionCount(content: CompiledNode['content']): number {
  if (content === null) return 0
  if (hasPool(content)) return content.questions.length
  if (hasPractice(content)) return content.practice.reduce((sum, task) => sum + task.items.length, 0)
  return 0
}

function compileNode(file: NodeFile): CompiledNode {
  const summary: NodeSummary = {
    id: file.id,
    kind: file.kind,
    level: file.level,
    chapter: file.chapter,
    order: file.order,
    status: file.status,
    recogniseOnly: file.recogniseOnly,
    prerequisites: file.prerequisites,
    // A draft pool or practice task inside a "coming soon" file is not a test yet.
    // A vocabulary node's test is made from its words.
    hasTest:
      file.status === 'published' &&
      (file.questions !== undefined || file.practice !== undefined || file.kind === 'vocabulary'),
    title: richTextIn(file.title),
    ...(file.module !== undefined && { module: file.module }),
    ...(file.part !== undefined && { part: file.part }),
    ...(file.purpose !== undefined && { purpose: richTextIn(file.purpose) }),
    ...(file.examTasks !== undefined && { examTasks: file.examTasks }),
  }
  // Drafts inside a "coming soon" file are checked but never shipped.
  return { ...summary, content: file.status === 'published' ? compileContentOf(file) : null }
}

/** The page content of a published node. The schema lets only the kinds with a page be published. */
function compileContentOf(file: NodeFile): NodeContent {
  if (isAssistantGraded(file)) return compileTaskContent(file)
  if (file.kind === 'exam-part') return compilePracticeContent(file)
  if (file.kind === 'vocabulary') return compileVocabularyContent(file)
  return file.kind === 'phrases' ? compilePhrasesContent(file) : compileGrammarContent(file)
}

/** What every exam part's page begins with: what it asks, how it is scored, how to approach it. */
function compileExamPartExplanations(file: NodeFile): ExamPartExplanations {
  // The schema guarantees every explanation of an exam part, in every language, for a published node.
  const explanations = file.explanations as NonNullable<NodeFile['explanations']>
  const explain = (language: Language) => ({
    task: richText(explanations[language].task ?? ''),
    scoring: richText(explanations[language].scoring ?? ''),
    approach: (explanations[language].approach ?? []).map(richText),
  })
  return inEachLanguage(explain)
}

/** A reading part: its explanations and its practice tasks. */
function compilePracticeContent(file: NodeFile): PracticeContent {
  // The schema guarantees the practice tasks for a published reading part.
  const practice = file.practice as NonNullable<NodeFile['practice']>
  return { explanations: compileExamPartExplanations(file), practice: practice.map(compileItemTask) }
}

/**
 * A task as the app shows it. Used for a node's practice tasks and for the
 * parts of a mock exam's Lesen and Hören.
 */
export function compileItemTask(task: ItemTaskFile): ItemTask {
  return {
    id: task.id,
    texts: task.texts.map(compileTaskText),
    items: task.items.map((item) => compileTaskItem(item, task)),
  }
}

/**
 * An item as the app asks it. An item that chooses among the task's own
 * texts or speakers gets them as its options, so that it can be shown and
 * checked without its task.
 */
function compileTaskItem(item: ItemTaskFile['items'][number], task: ItemTaskFile): ItemTask['items'][number] {
  const explanation = richTextIn(item.explanation)
  switch (item.type) {
    case 'which-text':
      return { ...item, explanation, options: [...task.texts.map((text) => text.id), NO_TEXT] }
    case 'who-says': {
      const speakers = task.texts.flatMap((text) => (text.speakers ?? []).map((one) => one.name))
      return { ...item, explanation, options: [...new Set(speakers)] }
    }
    default:
      return { ...item, explanation }
  }
}

/**
 * A text to read, cut into paragraphs; or a text to hear, each line with the
 * audio that says it in its speaker's voice. The schema guarantees one or
 * the other, and that every line's speaker is one of the text's speakers.
 */
function compileTaskText({ id, title, body, speakers, lines }: ItemTaskFile['texts'][number]): TaskText {
  const titled = { id, ...(title === undefined ? {} : { title }) }
  if (lines === undefined) {
    return {
      ...titled,
      paragraphs: (body ?? '')
        .split(/\n[ \t]*\n/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph !== ''),
    }
  }
  const audio = spokenLines(speakers ?? [], lines)
  return { ...titled, lines: lines.map((line, index) => ({ ...line, audio: audio[index] as SpokenLine })) }
}

/** A writing or speaking node: its explanations, and its task with the module and the part that say which task it is. */
function compileTaskContent(file: NodeFile): ExamTaskContent {
  // The schema guarantees the module, the part, and the fields of that part's task.
  return {
    explanations: compileExamPartExplanations(file),
    task: { module: file.module, part: file.part, ...file.task } as ExamTask,
  }
}

function compilePhrasesContent(file: NodeFile): PhrasesContent {
  // The schema guarantees these sections for a published node.
  const { phrases, questions } = file as Required<NodeFile>
  return {
    phrases: phrases.map((phrase) => ({
      ...phrase,
      audio: spoken(phrase.de),
      meaning: richTextIn(phrase.meaning),
      example: { ...phrase.example, audio: spoken(phrase.example.de) },
    })),
    questions: questions.map(compileQuestion),
    attemptSize: file.attemptSize,
  }
}

function compileGrammarContent(file: NodeFile): GrammarContent {
  // The schema guarantees these sections for a published node.
  const { explanations, examples, mistakes, questions } = file as Required<NodeFile>
  const { table, diagrams } = file
  // The schema guarantees the rule in every language.
  const rule = (language: Language) => ({ rule: richText(explanations[language].rule ?? '') })
  return {
    explanations: inEachLanguage(rule),
    ...(table && { table: { columns: table.columns.map(richTextIn), rows: table.rows } }),
    ...(diagrams && { diagrams: diagrams.map(compileDiagram) }),
    examples: examples.map((example) => ({ ...example, audio: spoken(example.de) })),
    mistakes: mistakes.map((mistake) => ({ ...mistake, why: richTextIn(mistake.why), audio: spoken(mistake.right) })),
    questions: questions.map(compileQuestion),
    attemptSize: file.attemptSize,
  }
}

function compileDiagram(diagram: NonNullable<NodeFile['diagrams']>[number]): Diagram {
  // The schema has read the drawing already, and refused it if it had a problem.
  const { drawing } = readDrawing(diagram.svg, Object.keys(diagram.labels))
  if (!drawing) throw new Error('a diagram that the schema accepted could not be read')
  return {
    width: drawing.width,
    height: drawing.height,
    drawing: drawing.parts,
    labels: diagram.labels,
    caption: richTextIn(diagram.caption),
  }
}

function compileQuestion(question: NonNullable<NodeFile['questions']>[number]): Question {
  const explanation = richTextIn(question.explanation)
  switch (question.type) {
    case 'gap-fill':
    case 'typed-gap-fill': {
      // The schema guarantees exactly one gap.
      const [before = '', after = ''] = question.prompt.split(GAP)
      return { ...question, explanation, gap: { before, after } }
    }
    case 'find-error': {
      const parts = sentenceParts(question.prompt)
      const words = parts.filter((part) => typeof part !== 'string')
      // The schema guarantees that exactly one word is the answer.
      return { ...question, explanation, parts, answer: words.findIndex((part) => part.word === question.answer) }
    }
    case 'word-order': {
      // The schema guarantees a first order, and that every other one is the same pieces.
      const pieces = mixedAwayFrom(question.answers[0] ?? [], question.answers)
      return { ...question, explanation, pieces, prompt: pieces.join(SHOWN_APART) }
    }
    case 'matching': {
      const left = question.answer.map(([item]) => item)
      const answer = question.answer.map(([, partner]) => partner)
      const right = mixedAwayFrom(answer, [answer])
      return { ...question, explanation, left, right, answer, prompt: left.join(SHOWN_APART) }
    }
    default:
      return { ...question, explanation }
  }
}

/** Stands between the things shown, in the prompt that the pipeline builds for a question without one. */
const SHOWN_APART = ' / '

/** Cuts "Du wohne hier." into its words and what stands between them. */
function sentenceParts(sentence: string): FindErrorQuestion['parts'] {
  const parts: FindErrorQuestion['parts'] = []
  let end = 0
  for (const match of sentence.matchAll(WORD)) {
    if (match.index > end) parts.push(sentence.slice(end, match.index))
    parts.push({ word: match[0] })
    end = match.index + match[0].length
  }
  if (end < sentence.length) parts.push(sentence.slice(end))
  return parts
}

function summarise(node: CompiledNode): NodeSummary {
  const { content: _content, ...summary } = node
  return summary
}

function richTextIn(text: Localised): Localised<RichText> {
  return inEachLanguage((language) => richText(text[language]))
}

/** One value for each language of the app, made by `make`. */
function inEachLanguage<T>(make: (language: Language) => T): Localised<T> {
  return Object.fromEntries(LANGUAGES.map((language) => [language, make(language)])) as Localised<T>
}

/** Splits "With *ich* the ending is *-e*." into plain parts and German parts. */
function richText(source: string): RichText {
  return source
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\*([^*]+)\*/)
    .map((part, index) => (index % 2 === 1 ? { de: part } : part))
    .filter((part) => part !== '')
}
