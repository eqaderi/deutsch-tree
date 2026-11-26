import { expect, test } from 'vitest'
import { bundleFiles, compileContent } from '../../src/content-pipeline/index.ts'
import { fixtureContent } from './fixture.ts'

test('a level’s checkpoint data holds the pool of each published topic with one, in curriculum order', async () => {
  const { bundle } = await compileContent(fixtureContent)
  const pools = bundle?.checkpoints

  // A1: two grammar topics and a vocabulary topic; grammar-002 is coming soon.
  expect(pools?.A1?.map(({ nodeId, questions }) => [nodeId, questions.length])).toEqual([
    ['grammar-001', 19],
    ['grammar-010', 15],
    ['vocabulary-fixture-home', 20],
  ])
  // The pool is the one the node's test draws from.
  const grammar001 = bundle?.nodes.find((node) => node.id === 'grammar-001')?.content
  expect(pools?.A1?.[0]?.questions).toEqual(grammar001 && 'questions' in grammar001 ? grammar001.questions : null)
})

test('an exam part and a writing or speaking part give nothing to a checkpoint', async () => {
  const { bundle } = await compileContent(fixtureContent)

  // B1 has only a writing and a speaking part; B2 a phrases topic and a listening part.
  expect(bundle?.checkpoints.B1).toEqual([])
  expect(bundle?.checkpoints.B2?.map(({ nodeId }) => nodeId)).toEqual(['phrases-greeting'])
})

test('each level’s checkpoint data is a file of its own, fetched only by that checkpoint', async () => {
  const { bundle } = await compileContent(fixtureContent)
  if (!bundle) throw new Error('the fixture content does not compile')

  const paths = bundleFiles(bundle).map((file) => file.path)
  expect(paths.filter((file) => file.startsWith('checkpoints/'))).toEqual([
    'checkpoints/A1.json',
    'checkpoints/A2.json',
    'checkpoints/B1.json',
    'checkpoints/B2.json',
  ])
})
