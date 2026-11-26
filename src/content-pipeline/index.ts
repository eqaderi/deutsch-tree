/**
 * Content pipeline: the chapter list and node files in, compiled bundle and a
 * report out.
 *
 * `compileContent` reads and validates; it never writes. `writeBundle` puts a
 * compiled bundle on disk. The command line (cli.ts) and the site build
 * (vite-plugin.ts) are thin callers of these.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import {
  type ChapterEntry,
  type CompiledNode,
  type ContentBundle,
  chaptersFileSchema,
  GAP,
  type GrammarContent,
  LANGUAGES,
  type Localised,
  type NodeFile,
  type NodeSummary,
  nodeFileSchema,
  type Question,
  type RichText,
} from '../content-model/index.ts'
import { CHAPTERS_FILE, CHECKS, type CheckedNode, type ContentProblem } from './checks/index.ts'
import { overviewData } from './overview-data.ts'
import { searchData } from './search-data.ts'

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
    questions: nodes.reduce((sum, node) => sum + (node.content?.questions.length ?? 0), 0),
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
async function readChapters(contentDir: string, errors: ContentProblem[]): Promise<ChapterEntry[] | null> {
  let source: string
  try {
    source = await readFile(path.join(contentDir, CHAPTERS_FILE), 'utf8')
  } catch {
    errors.push({
      file: CHAPTERS_FILE,
      message: 'is missing: the chapter list that every node file names a chapter of',
    })
    return null
  }

  let raw: unknown
  try {
    raw = parseYaml(source)
  } catch (error) {
    errors.push({ file: CHAPTERS_FILE, message: `is not valid YAML: ${(error as Error).message}` })
    return null
  }

  const parsed = chaptersFileSchema.safeParse(raw)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({ file: CHAPTERS_FILE, where: formatPath(issue.path), message: issue.message })
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

/** The question that a place such as `questions[1].answer` lies in, if it states an id. */
function questionAt(pathParts: PropertyKey[], raw: unknown): { question?: string } {
  if (pathParts[0] !== 'questions' || typeof pathParts[1] !== 'number') return {}
  const id = (raw as { questions?: Array<{ id?: unknown } | null> }).questions?.[pathParts[1]]?.id
  return typeof id === 'string' && id !== '' ? { question: id } : {}
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
  }
  // Drafts inside a "coming soon" file are checked but never shipped.
  return { ...summary, content: file.status === 'published' ? compileGrammarContent(file) : null }
}

function compileGrammarContent(file: NodeFile): GrammarContent {
  // The schema guarantees these sections for a published node.
  const { explanations, table, examples, mistakes, questions } = file as Required<NodeFile>
  return {
    explanations: {
      en: { rule: richText(explanations.en.rule) },
      fa: { rule: richText(explanations.fa.rule) },
      de: { rule: richText(explanations.de.rule) },
    },
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
