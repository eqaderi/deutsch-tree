import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { bundleFiles, compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContent, fixtureContentWith, PUBLISHED } from './fixture.ts'

test('the overview data holds the table of every published grammar node, and nothing for a node without one', async () => {
  const { bundle } = await compileContent(fixtureContent)

  // grammar-002 is coming soon: it has no table, so it has no place here.
  expect(bundle?.overview).toEqual({
    tables: [
      {
        node: 'grammar-001',
        table: {
          columns: [
            { en: 'Person', fa: 'شخص', de: 'Person' },
            { en: 'Form', fa: 'صورت', de: 'Form' },
          ],
          rows: [
            ['ich', 'wohne'],
            ['du', 'wohnst'],
          ],
        },
      },
    ],
  })
})

test('the tables of the overview data are in curriculum order', async () => {
  const published = await readFile(path.join(fixtureContent, PUBLISHED), 'utf8')
  const content = await fixtureContentWith({
    // A second written node, which its `order` puts before the first.
    'nodes/grammar/grammar-003.yaml': () =>
      published.replace('id: grammar-001', 'id: grammar-003').replace('order: 1', 'order: 0.5'),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([])
  expect(bundle?.overview.tables.map((entry) => entry.node)).toEqual(['grammar-003', 'grammar-001'])
})

test('a draft table inside a node that is coming soon is not in the overview data', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.table = { columns: [{ en: 'Draft', fa: 'پیش‌نویس', de: 'Entwurf' }], rows: [['bin']] }
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([])
  expect(bundle?.overview.tables.map((entry) => entry.node)).toEqual(['grammar-001'])
})

test('the overview data is one file, and none of it is in the file the tree loads', async () => {
  const { bundle } = await compileContent(fixtureContent)
  if (!bundle) throw new Error('the fixture content must compile')

  const files = new Map(bundleFiles(bundle).map((file) => [file.path, file.json]))

  expect(JSON.parse(files.get('overview.json') ?? '')).toEqual(bundle.overview)
  expect(files.get('index.json')).not.toContain('wohnst')
})
