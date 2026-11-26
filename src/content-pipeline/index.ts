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
import {
  type ChapterEntry,
  type CompiledNode,
  type ContentBundle,
  chaptersFileSchema,
  type ExamPartContent,
  type ExamTask,
  type ExamTaskFile,
  GAP,
  type GrammarContent,
  LANGUAGES,
  type Language,
  type Localised,
  type NodeFile,
  type NodeSummary,
  nodeFileSchema,
  type OfficialMockExam,
  type OfficialMockExams,
  officialMockExamsFileSchema,
  type Question,
  type RichText,
} from '../content-model/index.ts'
import { READINESS_EXAMS } from '../learning-engine/index.ts'
import { unmarkedGerman } from './checks/german-in-persian-is-marked.ts'
import { CHAPTERS_FILE, CHECKS, type CheckedNode, type ContentProblem } from './checks/index.ts'
import { overviewData } from './overview-data.ts'
import { searchData } from './search-data.ts'

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

export async function compileContent(contentDir: string): Promise<PipelineResult> {
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

  for (const check of CHECKS) {
    errors.push(...(await check({ contentDir, nodes: checked, ids, chapters })))
  }

  // The curriculum order: chapter by chapter, and inside a chapter by `order`.
  const chapterPlace = new Map((chapters ?? []).map((chapter, index) => [chapter.id, index]))
  const placeOf = (node: CompiledNode) => chapterPlace.get(node.chapter) ?? Number.POSITIVE_INFINITY
  const nodes = checked.map(({ node }) => compileNode(node))
  nodes.sort((a, b) => placeOf(a) - placeOf(b) || a.order - b.order || a.id.localeCompare(b.id))

  const published = nodes.filter((node) => node.status === 'published').length
  const report: PipelineReport = {
    ok: errors.length === 0,
    errors,
    nodes: { total: nodes.length, published, comingSoon: nodes.length - published },
    questions: nodes.reduce((sum, node) => sum + questionCount(node.content), 0),
  }

  return {
    report,
    bundle: report.ok
      ? {
          index: {
            chapters: (chapters ?? []).map((chapter) => ({ ...chapter, title: richTextIn(chapter.title) })),
            nodes: nodes.map(summarise),
          },
          nodes,
          officialMockExams: officialMockExams ?? [],
          search: searchData(nodes),
          overview: overviewData(nodes),
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
  const lines = report.errors.map(formatProblem)
  const { total, published, comingSoon } = report.nodes
  lines.push(
    report.ok
      ? `Content OK. Nodes: ${total} (${published} published, ${comingSoon} coming soon). Questions: ${report.questions}.`
      : `Content has ${report.errors.length} error${report.errors.length === 1 ? '' : 's'}. Nothing was compiled.`,
  )
  return lines.join('\n')
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
      const message = link.note && unmarkedGerman(link.note.fa)
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

/** How many questions a published node asks: its pool, or the items of its practice tasks. */
function questionCount(content: CompiledNode['content']): number {
  if (content === null) return 0
  if (content.kind === 'grammar') return content.questions.length
  return content.practice.reduce((sum, task) => sum + task.items.length, 0)
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
    title: richTextIn(file.title),
    ...(file.module !== undefined && { module: file.module }),
    ...(file.part !== undefined && { part: file.part }),
    ...(file.purpose !== undefined && { purpose: richTextIn(file.purpose) }),
    ...(file.examTasks !== undefined && { examTasks: file.examTasks }),
  }
  // Drafts inside a "coming soon" file are checked but never shipped.
  if (file.status !== 'published') return { ...summary, content: null }
  return { ...summary, content: file.kind === 'exam-part' ? compileExamPartContent(file) : compileGrammarContent(file) }
}

function compileExamPartContent(file: NodeFile): ExamPartContent {
  // The schema guarantees these sections, and every explanation, for a published exam-part node.
  const { explanations, practice } = file as Required<NodeFile>
  const explain = (language: Language) => ({
    task: richText(explanations[language].task ?? ''),
    scoring: richText(explanations[language].scoring ?? ''),
    approach: (explanations[language].approach ?? []).map(richText),
  })
  return {
    kind: 'exam-part',
    explanations: { en: explain('en'), fa: explain('fa'), de: explain('de') },
    practice: practice.map(compileExamTask),
  }
}

/** A task as the app shows it. Used for a node's practice tasks; a mock exam's parts have the same shape. */
export function compileExamTask(task: ExamTaskFile): ExamTask {
  return {
    id: task.id,
    texts: task.texts.map(({ id, title, body }) => ({
      id,
      ...(title === undefined ? {} : { title }),
      paragraphs: body
        .split(/\n[ \t]*\n/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph !== ''),
    })),
    items: task.items.map((item) => ({ ...item, explanation: richTextIn(item.explanation) })),
  }
}

function compileGrammarContent(file: NodeFile): GrammarContent {
  // The schema guarantees these sections for a published node.
  const { explanations, table, examples, mistakes, questions } = file as Required<NodeFile>
  // The schema guarantees the rule in every language.
  const rule = (language: Language) => ({ rule: richText(explanations[language].rule ?? '') })
  return {
    kind: 'grammar',
    explanations: { en: rule('en'), fa: rule('fa'), de: rule('de') },
    table,
    examples,
    mistakes: mistakes.map((mistake) => ({ ...mistake, why: richTextIn(mistake.why) })),
    questions: questions.map(compileQuestion),
    attemptSize: file.attemptSize,
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
    default:
      return { ...question, explanation }
  }
}

function summarise(node: CompiledNode): NodeSummary {
  const { content: _content, ...summary } = node
  return summary
}

function richTextIn(text: Localised): Localised<RichText> {
  return Object.fromEntries(LANGUAGES.map((language) => [language, richText(text[language])])) as Localised<RichText>
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

function formatPath(pathParts: PropertyKey[]): string | undefined {
  if (pathParts.length === 0) return undefined
  return pathParts
    .map((part, index) => (typeof part === 'number' ? `[${part}]` : index === 0 ? String(part) : `.${String(part)}`))
    .join('')
}
