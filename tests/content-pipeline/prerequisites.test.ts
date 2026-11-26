import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, comingSoonNode, fixtureContentWith, PUBLISHED } from './fixture.ts'

test('a prerequisite that points nowhere is rejected, and the report names the node that lists it', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.prerequisites = ['grammar-001', 'grammar-099']
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: COMING_SOON,
      node: 'grammar-002',
      where: 'prerequisites[1]',
      message: 'points nowhere: there is no node "grammar-099"',
    },
  ])
  expect(report.ok).toBe(false)
  expect(bundle).toBeNull()
})

test('a prerequisite cycle is rejected once, and the report names its nodes', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.prerequisites = ['grammar-003']
    }),
    'nodes/grammar/grammar-003.yaml': () => comingSoonNode('grammar-003', { prerequisites: ['grammar-002'] }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PUBLISHED,
      node: 'grammar-001',
      where: 'prerequisites',
      message: 'prerequisite cycle: grammar-001 needs grammar-003, which needs grammar-002, which needs grammar-001',
    },
  ])
  expect(bundle).toBeNull()
})

test('a node that is its own prerequisite is rejected', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.prerequisites = ['grammar-002']
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: COMING_SOON,
      node: 'grammar-002',
      where: 'prerequisites',
      message: 'prerequisite cycle: grammar-002 needs grammar-002',
    },
  ])
  expect(bundle).toBeNull()
})

test('two nodes may share a prerequisite: that is not a cycle', async () => {
  const content = await fixtureContentWith({
    'nodes/grammar/grammar-003.yaml': () => comingSoonNode('grammar-003', { prerequisites: ['grammar-001'] }),
    'nodes/grammar/grammar-004.yaml': () =>
      comingSoonNode('grammar-004', { prerequisites: ['grammar-002', 'grammar-003'] }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})
