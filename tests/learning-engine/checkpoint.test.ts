import { expect, test } from 'vitest'
import type { Question } from '../../src/content-model/index.ts'
import { type CheckpointSource, drawCheckpoint } from '../../src/learning-engine/index.ts'
import { multipleChoice } from './questions.ts'
import { seededRandom } from './random.ts'

/** A published node with a pool of `poolSize` questions, named after the node: "n1-q1", "n1-q2", … */
function node(nodeId: string, poolSize = 15): CheckpointSource {
  return {
    nodeId,
    questions: Array.from({ length: poolSize }, (_, index) =>
      multipleChoice(`${nodeId}-q${index + 1}`, 'right', ['wrong']),
    ),
  }
}

/** The published nodes n1 to n<count> of a level, in curriculum order. */
function level(count: number, poolSize = 15): CheckpointSource[] {
  return Array.from({ length: count }, (_, index) => node(`n${index + 1}`, poolSize))
}

/** How many questions each node gave, by node id. */
function shares(questions: ReadonlyArray<{ nodeId: string; question: Question }>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const { nodeId } of questions) counts[nodeId] = (counts[nodeId] ?? 0) + 1
  return counts
}

test('a checkpoint of a level with two nodes asks five questions of each, none twice, each named with its node', () => {
  const checkpoint = drawCheckpoint(level(2), seededRandom(1))

  expect(checkpoint.questions).toHaveLength(10)
  expect(shares(checkpoint.questions)).toEqual({ n1: 5, n2: 5 })
  expect(new Set(checkpoint.questions.map(({ question }) => question.id)).size).toBe(10)
  for (const { nodeId, question } of checkpoint.questions) expect(question.id.startsWith(`${nodeId}-`)).toBe(true)
})

test('a level with one node still gives a checkpoint: five of its questions', () => {
  const checkpoint = drawCheckpoint(level(1), seededRandom(2))

  expect(shares(checkpoint.questions)).toEqual({ n1: 5 })
})

test('a checkpoint never asks more than thirty questions: with more than six nodes every node still gives some, as evenly as thirty divides', () => {
  // 7 nodes: thirty is four each and two left over. 12 nodes: two each and six left over. 30 nodes: one each.
  for (const [nodes, least] of [
    [7, 4],
    [12, 2],
    [29, 1],
    [30, 1],
  ] as const) {
    const checkpoint = drawCheckpoint(level(nodes), seededRandom(nodes))

    expect(checkpoint.questions).toHaveLength(30)
    const perNode = Object.values(shares(checkpoint.questions))
    expect(perNode).toHaveLength(nodes)
    expect(Math.min(...perNode)).toBe(least)
    expect(Math.max(...perNode)).toBeLessThanOrEqual(least + 1)
    expect(new Set(checkpoint.questions.map(({ question }) => question.id)).size).toBe(30)
  }
})

test('a level with over a hundred nodes is sampled fairly: thirty different nodes each time, and over many checkpoints every node about equally often', () => {
  const nodes = level(120)
  const random = seededRandom(26)
  const timesAsked: Record<string, number> = Object.fromEntries(nodes.map(({ nodeId }) => [nodeId, 0]))

  for (let taken = 0; taken < 400; taken += 1) {
    const perNode = shares(drawCheckpoint(nodes, random).questions)
    expect(Object.values(perNode)).toEqual(Array.from({ length: 30 }, () => 1))
    for (const nodeId of Object.keys(perNode)) timesAsked[nodeId] = (timesAsked[nodeId] ?? 0) + 1
  }

  // A node is in 30 of 120 checkpoints on average: 100 of these 400. The first node and the last get the same chance.
  expect(Object.keys(timesAsked)).toHaveLength(120)
  expect(Math.min(...Object.values(timesAsked))).toBeGreaterThan(70)
  expect(Math.max(...Object.values(timesAsked))).toBeLessThan(130)
})

test('a published node without questions gives none, and the other nodes are asked as if it were not there', () => {
  // A writing or speaking node is published and has no pool.
  const nodes = [node('n1'), node('writing', 0), node('n2'), node('speaking', 0)]

  const checkpoint = drawCheckpoint(nodes, seededRandom(3))

  expect(shares(checkpoint.questions)).toEqual({ n1: 5, n2: 5 })
  expect(checkpoint.nodeIds).toEqual(['n1', 'n2'])
})

test('a level whose nodes have no questions has an empty checkpoint, and so has a level without nodes', () => {
  expect(drawCheckpoint([node('writing', 0), node('speaking', 0)], seededRandom(4))).toEqual({
    questions: [],
    nodeIds: [],
  })
  expect(drawCheckpoint([], seededRandom(4))).toEqual({ questions: [], nodeIds: [] })
})

test('a node with fewer questions than its share gives all it has, and no question twice', () => {
  const checkpoint = drawCheckpoint([node('small', 2), node('n2')], seededRandom(5))

  expect(shares(checkpoint.questions)).toEqual({ small: 2, n2: 5 })
  expect(new Set(checkpoint.questions.map(({ question }) => question.id)).size).toBe(7)
})

test('the questions go round the nodes: every node is asked once before any node is asked again', () => {
  const { questions } = drawCheckpoint(level(4), seededRandom(6))

  expect(questions).toHaveLength(20)
  for (let round = 0; round < 5; round += 1) {
    const askedInRound = questions.slice(round * 4, round * 4 + 4).map(({ nodeId }) => nodeId)
    expect([...askedInRound].sort()).toEqual(['n1', 'n2', 'n3', 'n4'])
  }
  // Not in curriculum order every time, though.
  const firstOfEachRound = [0, 4, 8, 12, 16].map((place) => questions[place]?.nodeId)
  expect(new Set(firstOfEachRound).size).toBeGreaterThan(1)
})

test('the checkpoint follows the randomness it is given, names its nodes in curriculum order and leaves the pools as they were', () => {
  const nodes = level(40)
  const before = structuredClone(nodes)

  const checkpoint = drawCheckpoint(nodes, seededRandom(7))

  expect(drawCheckpoint(nodes, seededRandom(7))).toEqual(checkpoint)
  expect(drawCheckpoint(nodes, seededRandom(8))).not.toEqual(checkpoint)
  const position = (nodeId: string) => nodes.findIndex((source) => source.nodeId === nodeId)
  expect(checkpoint.nodeIds).toHaveLength(30)
  expect(checkpoint.nodeIds).toEqual([...checkpoint.nodeIds].sort((a, b) => position(a) - position(b)))
  expect([...checkpoint.nodeIds].sort()).toEqual(Object.keys(shares(checkpoint.questions)).sort())
  expect(nodes).toEqual(before)
})

test('a checkpoint asks each question as an attempt asks it: the options in an order drawn for this checkpoint', () => {
  const sources = [
    { nodeId: 'n1', questions: [multipleChoice('n1-q1', 'wohnen', ['wohne', 'wohnst', 'wohnt'])] },
    { nodeId: 'n2', questions: [multipleChoice('n2-q1', 'gehen', ['gehe', 'gehst', 'geht'])] },
  ]
  const random = seededRandom(9)

  const places = new Set(
    Array.from({ length: 30 }, () => {
      const asked = drawCheckpoint(sources, random).questions.find(({ nodeId }) => nodeId === 'n1')?.question
      return asked?.type === 'multiple-choice' ? asked.options.indexOf('wohnen') : -1
    }),
  )

  expect([...places].sort()).toEqual([0, 1, 2, 3])
})
