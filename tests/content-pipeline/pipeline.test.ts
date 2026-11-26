import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { fixtureContent, fixtureContentWith, withoutReviewRecord } from './fixture.ts'

test('valid content compiles and the report counts what was found', async () => {
  const { report, bundle } = await compileContent(fixtureContent)

  expect(report).toEqual({
    ok: true,
    errors: [],
    nodes: { total: 2, published: 1, comingSoon: 1 },
    questions: 2,
  })
  expect(bundle).not.toBeNull()
})

test('a node file that breaks the content model is reported by file and place, and nothing is compiled', async () => {
  const content = await fixtureContentWith({
    'nodes/grammar/grammar-001.yaml': (text) => text.replace('kind: grammar', 'kind: grammer'),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.ok).toBe(false)
  expect(report.errors).toEqual([
    { file: 'nodes/grammar/grammar-001.yaml', where: 'kind', message: expect.stringContaining('"grammar"') },
  ])
  expect(bundle).toBeNull()
})

test('a published node with no review record is refused', async () => {
  const content = await fixtureContentWith({
    'nodes/grammar/grammar-001.yaml': withoutReviewRecord,
  })

  const { report, bundle } = await compileContent(content)

  expect(report.ok).toBe(false)
  expect(report.errors).toEqual([
    { file: 'nodes/grammar/grammar-001.yaml', where: 'review', message: expect.stringContaining('review record') },
  ])
  expect(bundle).toBeNull()
})

test('a published node whose pool changed after its review needs a new review', async () => {
  const content = await fixtureContentWith({
    'nodes/grammar/grammar-001.yaml': (text) =>
      text.replace('options: [wohne, wohnst, wohnt]', 'options: [wohne, wohnst, wohnen]'),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.ok).toBe(false)
  expect(report.errors).toEqual([
    { file: 'nodes/grammar/grammar-001.yaml', where: 'review', message: expect.stringContaining('new review') },
  ])
  expect(bundle).toBeNull()
})
