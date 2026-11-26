/**
 * The real content in `content/`, held against facts of the approved grammar
 * list that the content pipeline cannot know: how many topics the list has,
 * which rows are recognise-only, and where the rows added later belong.
 *
 * This is the one place where a test reads the real content. A test of code
 * belongs on the fixture content instead.
 */
import { fileURLToPath } from 'node:url'
import { beforeAll, expect, test } from 'vitest'
import type { ContentIndex, NodeSummary } from '../../src/content-model/index.ts'
import { compileContent, formatReport } from '../../src/content-pipeline/index.ts'

const realContent = fileURLToPath(new URL('../../content', import.meta.url))

/** The grammar list has rows 1 to 212. */
const LIST_SIZE = 212

let index: ContentIndex
let grammar: NodeSummary[]

/** "grammar-097" for row 97. */
const id = (row: number) => `grammar-${String(row).padStart(3, '0')}`

/** The place of a row in the curriculum order. */
const placeOf = (row: number) => index.nodes.findIndex((node) => node.id === id(row))

beforeAll(async () => {
  const { report, bundle } = await compileContent(realContent)
  if (!bundle) throw new Error(formatReport(report))
  index = bundle.index
  grammar = index.nodes.filter((node) => node.kind === 'grammar')
})

test('every row of the grammar list is a node, under its number', () => {
  const rows = Array.from({ length: LIST_SIZE }, (_, row) => id(row + 1))

  expect(grammar.map((node) => node.id).sort()).toEqual(rows)
})

test('the topics are spread over A1, A2 and B1 as in the list', () => {
  const count = (level: string) => grammar.filter((node) => node.level === level).length

  expect({ A1: count('A1'), A2: count('A2'), B1: count('B1') }).toEqual({ A1: 85, A2: 55, B1: 72 })
})

test('the rows that the list marks "rec." are recognise-only, and no others', () => {
  const recogniseOnly = grammar.filter((node) => node.recogniseOnly).map((node) => node.id)

  expect(recogniseOnly.sort()).toEqual([33, 51, 52, 118, 176, 183].map(id))
})

test('rows 204 to 212 stand at their teaching positions, not at the end', () => {
  const directlyBefore = (earlier: number, later: number) => expect(placeOf(later) - placeOf(earlier)).toBe(1)

  directlyBefore(204, 97)
  directlyBefore(59, 205)
  directlyBefore(73, 206)
  directlyBefore(151, 207)
  directlyBefore(54, 208)
  directlyBefore(68, 209)
  directlyBefore(49, 211)
  directlyBefore(137, 212)
  // Row 210 is an A1 topic and row 199 an A2 topic: 210 closes word building in A1, 199 opens it in A2.
  directlyBefore(198, 210)
  expect(grammar.filter((node) => node.chapter === 'a2-word-building-particles')[0]?.id).toBe(id(199))
})

test('every prerequisite is an earlier topic of the curriculum, so none points nowhere and none forms a cycle', () => {
  const place = new Map(index.nodes.map((node, position) => [node.id, position]))
  const notEarlier = index.nodes.flatMap((node, position) =>
    node.prerequisites
      .filter((prerequisite) => !((place.get(prerequisite) ?? Number.POSITIVE_INFINITY) < position))
      .map((prerequisite) => `${node.id} needs ${prerequisite}`),
  )

  expect(notEarlier).toEqual([])
})

test('the curriculum runs through A1, then A2, then B1, one chapter after the other', () => {
  const levels = index.nodes.map((node) => node.level)
  expect(levels).toEqual(levels.toSorted())

  const chaptersInOrder = index.nodes.map((node) => node.chapter).filter((chapter, at, all) => chapter !== all[at - 1])
  expect(chaptersInOrder).toEqual(index.chapters.map((chapter) => chapter.id))
})
