import { expect, test } from 'vitest'
import { refreshApprovalDocument } from '../../src/vocabulary-scope/approval.ts'
import { LEFT_OUT_FILE } from '../../src/vocabulary-scope/index.ts'
import { fixtureContentWith } from '../content-pipeline/fixture.ts'

/** A generated part of the approval document, made from the fixture content. */
async function generated(part: string): Promise<string> {
  const dir = await fixtureContentWith({
    [LEFT_OUT_FILE]: () => 'word\tlevel\treason\tnotedOn\nAbsenderin\tA1\tfeminine form\tAbsender\n',
  })
  return refreshApprovalDocument(`<!-- generated: ${part} -->\n<!-- end generated -->`, dir)
}

/** The numbers table of the approval document, generated from the fixture content. */
const numbersTable = () => generated('numbers')

test('a level without vocabulary nodes has no smallest and largest node in the numbers', async () => {
  const table = await numbersTable()
  // The fixture's vocabulary nodes are all A1; A2 has one scope word and no vocabulary node.
  expect(table).toMatch(/^\| A2 \| 1 \| 0 \| 0 \| – \|$/m)
  expect(table).not.toMatch(/Infinity/)
})

test('the list of a node shows a noun with its article, and a noun that takes none bare', async () => {
  const list = await generated('list')

  expect(list).toContain('der Tisch · die Lampe')
  expect(list).toMatch(/ · Deutschland$/m)
  expect(list).not.toContain('none')
})

test('a left-out row with a reason the scope rule does not give is refused', async () => {
  const dir = await fixtureContentWith({
    [LEFT_OUT_FILE]: () => 'word\tlevel\treason\tnotedOn\nAbsenderin\tA1\tforgotten\tAbsender\n',
  })
  await expect(refreshApprovalDocument('', dir)).rejects.toThrow(/forgotten/)
})
