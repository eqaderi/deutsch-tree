/**
 * The grammar sample node (ticket #17): the node the learner judges before
 * the other grammar nodes are written from its pattern. These are facts of
 * that decision, which no content check can know.
 */
import { fileURLToPath } from 'node:url'
import { beforeAll, expect, test } from 'vitest'
import type { CompiledNode } from '../../src/content-model/index.ts'
import { compileContent, formatReport } from '../../src/content-pipeline/index.ts'
import { en } from '../../src/language/strings.ts'

const realContent = fileURLToPath(new URL('../../content', import.meta.url))

/** Two-way prepositions, Wo? + Dativ: a topic where a diagram shows what text cannot. */
const SAMPLE = 'grammar-128'

let sample: CompiledNode

beforeAll(async () => {
  const { report, bundle } = await compileContent(realContent)
  if (!bundle) throw new Error(formatReport(report))
  const node = bundle.nodes.find((candidate) => candidate.id === SAMPLE)
  if (!node) throw new Error(`${SAMPLE} is missing`)
  sample = node
})

test('the sample is published with a diagram, a table, examples and common mistakes', () => {
  expect(sample.status).toBe('published')
  expect(sample.content?.diagrams?.length).toBeGreaterThanOrEqual(1)
  expect(sample.content?.table).toBeDefined()
  expect(sample.content?.examples.length).toBeGreaterThanOrEqual(5)
  expect(sample.content?.mistakes.length).toBeGreaterThanOrEqual(3)
})

test('the sample’s pool has the size of a small topic and uses every question type there is', () => {
  const questions = sample.content?.questions ?? []
  // The spec: about 15 to 20 questions for a small topic.
  expect(questions.length).toBeGreaterThanOrEqual(15)
  expect(questions.length).toBeLessThanOrEqual(20)
  // Every type has an instruction for the learner, so that list names every type.
  expect(new Set(questions.map((question) => question.type))).toEqual(new Set(Object.keys(en.instructions)))
})
