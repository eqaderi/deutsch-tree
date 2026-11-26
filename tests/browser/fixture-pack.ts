/**
 * Builds the fixture pack for the browser tests: the synthetic book of
 * tests/pack-builder/fixture.ts, turned into a pack by the pack builder, in a
 * packs folder of its own (never the project's private/).
 *
 *   node tests/browser/fixture-pack.ts <packs folder>
 */
import { mkdir, rm } from 'node:fs/promises'
import { buildPack } from '../../src/pack-builder/index.ts'
import { fixtureBook, writeFixtureBook } from '../pack-builder/fixture.ts'

const [folder] = process.argv.slice(2)
if (!folder) throw new Error('usage: fixture-pack.ts <packs folder>')

await rm(folder, { recursive: true, force: true })
await mkdir(folder, { recursive: true })
const book = await writeFixtureBook(fixtureBook())
const { report } = await buildPack({
  examPdf: book.examPdf,
  answerKeyPdf: book.answerKeyPdf,
  audioDir: book.audioDir,
  name: 'Fixture book',
  outDir: folder,
})
await rm(book.dir, { recursive: true, force: true })
if (!report.ok) throw new Error(`The fixture pack did not build: ${JSON.stringify(report.errors)}`)
