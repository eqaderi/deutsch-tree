import { expect, test } from 'vitest'
import { refreshApprovalDocument } from '../../src/vocabulary-scope/approval.ts'
import { LEFT_OUT_FILE } from '../../src/vocabulary-scope/index.ts'
import { fixtureContentWith } from '../content-pipeline/fixture.ts'

/** The numbers table of the approval document, generated from the fixture content. */
async function numbersTable(): Promise<string> {
  const dir = await fixtureContentWith({
    [LEFT_OUT_FILE]: () => 'word\tlevel\treason\tnotedOn\nAbsenderin\tA1\tfeminine form\tAbsender\n',
  })
  return refreshApprovalDocument('<!-- generated: numbers -->\n<!-- end generated -->', dir)
}

test('a level without vocabulary nodes has no smallest and largest node in the numbers', async () => {
  const table = await numbersTable()
  // The fixture's vocabulary nodes are all A1; A2 has one scope word and no vocabulary node.
  expect(table).toMatch(/^\| A2 \| 1 \| 0 \| 0 \| – \|$/m)
  expect(table).not.toMatch(/Infinity/)
})

test('a left-out row with a reason the scope rule does not give is refused', async () => {
  const dir = await fixtureContentWith({
    [LEFT_OUT_FILE]: () => 'word\tlevel\treason\tnotedOn\nAbsenderin\tA1\tforgotten\tAbsender\n',
  })
  await expect(refreshApprovalDocument('', dir)).rejects.toThrow(/forgotten/)
})
