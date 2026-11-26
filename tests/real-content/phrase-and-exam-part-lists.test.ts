/**
 * The real content in `content/`, held against facts of the exam and of the
 * lists in `docs/approvals/phrase-and-exam-part-nodes.md` that the content
 * pipeline cannot know: which parts the Goethe B1 exam has, how many phrase
 * nodes the list has, and where their chapters stand in the curriculum.
 */
import { fileURLToPath } from 'node:url'
import { beforeAll, expect, test } from 'vitest'
import type { ContentIndex, NodeSummary } from '../../src/content-model/index.ts'
import { compileContent, formatReport } from '../../src/content-pipeline/index.ts'

const realContent = fileURLToPath(new URL('../../content', import.meta.url))

/** The parts of the Goethe B1 exam: Lesen 5, Hören 4, Schreiben 3, Sprechen 3. */
const EXAM_PARTS = [
  'exam-lesen-1',
  'exam-lesen-2',
  'exam-lesen-3',
  'exam-lesen-4',
  'exam-lesen-5',
  'exam-hoeren-1',
  'exam-hoeren-2',
  'exam-hoeren-3',
  'exam-hoeren-4',
  'exam-schreiben-1',
  'exam-schreiben-2',
  'exam-schreiben-3',
  'exam-sprechen-1',
  'exam-sprechen-2',
  'exam-sprechen-3',
]

/** The exam's own order of its modules; one chapter for each. */
const EXAM_CHAPTERS = ['b1-exam-lesen', 'b1-exam-hoeren', 'b1-exam-schreiben', 'b1-exam-sprechen']

/** The tasks in which the candidate writes or speaks: the ones that set phrases are for. */
const WRITING_AND_SPEAKING_TASKS = EXAM_PARTS.filter((id) => /schreiben|sprechen/.test(id))

let index: ContentIndex
let phrases: NodeSummary[]
let examParts: NodeSummary[]

/** The place of a chapter in the curriculum order. */
const placeOf = (chapter: string) => index.chapters.findIndex(({ id }) => id === chapter)

beforeAll(async () => {
  const { report, bundle } = await compileContent(realContent)
  if (!bundle) throw new Error(formatReport(report))
  index = bundle.index
  phrases = index.nodes.filter((node) => node.kind === 'phrases')
  examParts = index.nodes.filter((node) => node.kind === 'exam-part')
})

test('there is one exam-part node for each of the 15 parts of the exam, in the order of the exam', () => {
  expect(examParts.map((node) => node.id)).toEqual(EXAM_PARTS)
})

test('every exam-part node is a B1 node in the chapter of its module, at the place of its part number', () => {
  expect(examParts.map((node) => [node.id, node.level, node.chapter, node.order])).toEqual(
    examParts.map((node) => [`exam-${node.module}-${node.part}`, 'B1', `b1-exam-${node.module}`, node.part]),
  )
})

test('the exam parts are the end of the curriculum: one chapter for each module, after everything else', () => {
  expect(index.chapters.slice(-EXAM_CHAPTERS.length).map((chapter) => chapter.id)).toEqual(EXAM_CHAPTERS)
})

test('the phrase list has 30 nodes in six chapters: 10 in A2 and 20 in B1', () => {
  const count = (key: 'level' | 'chapter') =>
    Object.fromEntries(Map.groupBy(phrases, (node) => node[key]).entries().map(([name, nodes]) => [name, nodes.length]))

  expect(count('level')).toEqual({ A2: 10, B1: 20 })
  expect(count('chapter')).toEqual({
    'a2-phrases-emails': 4,
    'a2-phrases-arrangements': 6,
    'b1-phrases-opinions': 5,
    'b1-phrases-writing': 5,
    'b1-phrases-planning': 4,
    'b1-phrases-presentation': 6,
  })
})

test('every writing and speaking task of the exam is served by phrase nodes, and each of them is named by one', () => {
  const served = new Set(phrases.flatMap((node) => node.examTasks ?? []))

  expect([...served].sort()).toEqual(WRITING_AND_SPEAKING_TASKS.toSorted())
})

test('each phrase chapter stands after the grammar chapter it builds on, before the next grammar chapter', () => {
  const grammarBefore = (chapter: string) =>
    index.chapters.slice(0, placeOf(chapter)).findLast(({ kind }) => kind === 'grammar')?.id
  const phraseChapters = index.chapters.filter((chapter) => chapter.kind === 'phrases').map((chapter) => chapter.id)

  expect(phraseChapters.map((chapter) => [chapter, grammarBefore(chapter)])).toEqual([
    ['a2-phrases-emails', 'a2-dativ-objects'],
    ['a2-phrases-arrangements', 'a2-subordinate-clauses'],
    ['b1-phrases-opinions', 'b1-two-part-connectors'],
    ['b1-phrases-writing', 'b1-prepositions'],
    ['b1-phrases-planning', 'b1-modal-konjunktiv'],
    ['b1-phrases-presentation', 'b1-fractions-words-particles'],
  ])
})

test('every phrase and exam-part chapter has nodes, so the tree shows it', () => {
  const empty = index.chapters
    .filter((chapter) => chapter.kind === 'phrases' || chapter.kind === 'exam-part')
    .filter((chapter) => !index.nodes.some((node) => node.chapter === chapter.id))

  expect(empty).toEqual([])
  expect(phrases.length + examParts.length).toBe(30 + 15)
})
