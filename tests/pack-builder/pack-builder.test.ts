import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import { buildPack } from '../../src/pack-builder/index.ts'
import { type FixtureBook, fixtureBook, fixturePageNumbers, writeFixtureBook } from './fixture.ts'

/** Builds a pack from a synthetic book into a new temporary folder. */
async function build(book: FixtureBook = fixtureBook()) {
  const files = await writeFixtureBook(book)
  const outDir = await mkdtemp(path.join(tmpdir(), 'deutsch-tree-packs-'))
  const result = await buildPack({
    examPdf: files.examPdf,
    answerKeyPdf: files.answerKeyPdf,
    audioDir: files.audioDir,
    name: 'Fixture book',
    outDir,
  })
  return { ...result, outDir }
}

async function readJson(packDir: string | null, file: string) {
  expect(packDir).not.toBeNull()
  return JSON.parse(await readFile(path.join(packDir as string, file), 'utf8'))
}

test('a book becomes a pack folder whose description names the pack and counts its exams', async () => {
  const { report, packDir, outDir } = await build()

  expect(report.errors).toEqual([])
  expect(report.ok).toBe(true)
  expect(packDir).toBe(path.join(outDir, 'fixture-book'))

  const description = await readJson(packDir, 'pack.json')
  expect(description).toMatchObject({ format: 1, id: 'fixture-book', name: 'Fixture book', examCount: 2 })
  expect(description.exams.map((exam: { number: number }) => exam.number)).toEqual([1, 2])
})

test('the description says which pages belong to each exam, module and part', async () => {
  const { packDir } = await build()
  const description = await readJson(packDir, 'pack.json')

  // Exam 1 is pages 2 to 13 of the book; its own PDF counts them from 1.
  const [first, second] = description.exams
  expect(first).toMatchObject({ pagesFile: 'exams/01/pages.pdf', pageCount: 12, sourcePages: { first: 2, last: 13 } })
  expect(second).toMatchObject({ pagesFile: 'exams/02/pages.pdf', pageCount: 12, sourcePages: { first: 14, last: 25 } })

  const ranges = (exam: typeof first) =>
    exam.modules.map((module: { id: string; pages: unknown; sourcePages: unknown; parts: unknown[] }) => [
      module.id,
      module.pages,
      module.sourcePages,
    ])
  expect(ranges(first)).toEqual([
    ['lesen', { first: 1, last: 6 }, { first: 2, last: 7 }],
    ['hoeren', { first: 7, last: 10 }, { first: 8, last: 11 }],
    ['schreiben', { first: 11, last: 11 }, { first: 12, last: 12 }],
    ['sprechen', { first: 12, last: 12 }, { first: 13, last: 13 }],
  ])
  expect(ranges(second)).toEqual([
    ['lesen', { first: 1, last: 6 }, { first: 14, last: 19 }],
    ['hoeren', { first: 7, last: 10 }, { first: 20, last: 23 }],
    ['schreiben', { first: 11, last: 11 }, { first: 24, last: 24 }],
    ['sprechen', { first: 12, last: 12 }, { first: 25, last: 25 }],
  ])

  const partPages = (exam: typeof first, moduleId: string) =>
    exam.modules
      .find((module: { id: string }) => module.id === moduleId)
      .parts.map((part: { number: number; pages: unknown; sourcePages: unknown }) => [
        part.number,
        part.pages,
        part.sourcePages,
      ])
  // Teil 2 of Lesen runs over two pages; its second page has no heading.
  expect(partPages(first, 'lesen')).toEqual([
    [1, { first: 1, last: 1 }, { first: 2, last: 2 }],
    [2, { first: 2, last: 3 }, { first: 3, last: 4 }],
    [3, { first: 4, last: 4 }, { first: 5, last: 5 }],
    [4, { first: 5, last: 5 }, { first: 6, last: 6 }],
    [5, { first: 6, last: 6 }, { first: 7, last: 7 }],
  ])
  expect(partPages(second, 'hoeren')).toEqual([
    [1, { first: 7, last: 7 }, { first: 20, last: 20 }],
    [2, { first: 8, last: 8 }, { first: 21, last: 21 }],
    [3, { first: 9, last: 9 }, { first: 22, last: 22 }],
    [4, { first: 10, last: 10 }, { first: 23, last: 23 }],
  ])
  // Schreiben and Sprechen are not scored: pages, but no parts.
  expect(partPages(first, 'schreiben')).toEqual([])
  expect(partPages(first, 'sprechen')).toEqual([])
})

test("each exam's pages are copied from the book into the exam's own PDF", async () => {
  const { packDir } = await build()

  expect(await fixturePageNumbers(path.join(packDir as string, 'exams/01/pages.pdf'))).toEqual([
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
  ])
  expect(await fixturePageNumbers(path.join(packDir as string, 'exams/02/pages.pdf'))).toEqual([
    14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
  ])
})
