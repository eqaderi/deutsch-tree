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

/** A part's answers in item order, as [item, answer] pairs. */
async function answersOf(packDir: string | null, exam: number, moduleId: string, part: number) {
  const key = await readJson(packDir, 'answers.json')
  return key.exams
    .find((entry: { number: number }) => entry.number === exam)
    .modules.find((entry: { id: string }) => entry.id === moduleId)
    .parts.find((entry: { number: number }) => entry.number === part)
    .answers.map((entry: { item: number; answer: string }) => [entry.item, entry.answer])
}

test('the answer key gives every item of every Lesen and Hören part its answer', async () => {
  const { packDir } = await build()

  expect(await answersOf(packDir, 1, 'lesen', 1)).toEqual([
    [1, 'richtig'],
    [2, 'falsch'],
    [3, 'falsch'],
    [4, 'richtig'],
    [5, 'richtig'],
    [6, 'falsch'],
  ])
  expect(await answersOf(packDir, 1, 'lesen', 3)).toEqual([
    [13, 'd'],
    [14, '0'],
    [15, 'a'],
    [16, 'h'],
    [17, 'f'],
    [18, 'j'],
    [19, 'b'],
  ])
  expect(await answersOf(packDir, 1, 'lesen', 5)).toEqual([
    [27, 'c'],
    [28, 'a'],
    [29, 'b'],
    [30, 'a'],
  ])
  expect(await answersOf(packDir, 1, 'hoeren', 1)).toEqual([
    [1, 'falsch'],
    [2, 'b'],
    [3, 'richtig'],
    [4, 'a'],
    [5, 'richtig'],
    [6, 'c'],
    [7, 'falsch'],
    [8, 'a'],
    [9, 'falsch'],
    [10, 'b'],
  ])
  expect(await answersOf(packDir, 2, 'lesen', 4)).toEqual([
    [20, 'nein'],
    [21, 'ja'],
    [22, 'ja'],
    [23, 'nein'],
    [24, 'ja'],
    [25, 'nein'],
    [26, 'nein'],
  ])
  expect(await answersOf(packDir, 2, 'hoeren', 4)).toEqual([
    [23, 'b'],
    [24, 'a'],
    [25, 'c'],
    [26, 'a'],
    [27, 'c'],
    [28, 'b'],
    [29, 'b'],
    [30, 'c'],
  ])

  // Only Lesen and Hören are scored from the key.
  const key = await readJson(packDir, 'answers.json')
  expect(key.format).toBe(1)
  expect(key.exams.map((exam: { modules: Array<{ id: string }> }) => exam.modules.map((module) => module.id))).toEqual([
    ['lesen', 'hoeren'],
    ['lesen', 'hoeren'],
  ])
})

test('the description lists each part\'s items with the answers an answer sheet offers', async () => {
  const { packDir } = await build()
  const description = await readJson(packDir, 'pack.json')
  const items = (moduleId: string, part: number) =>
    description.exams[0].modules.find((module: { id: string }) => module.id === moduleId).parts[part - 1].items

  expect(items('lesen', 2)).toEqual([
    { number: 7, choices: ['a', 'b', 'c'] },
    { number: 8, choices: ['a', 'b', 'c'] },
    { number: 9, choices: ['a', 'b', 'c'] },
    { number: 10, choices: ['a', 'b', 'c'] },
    { number: 11, choices: ['a', 'b', 'c'] },
    { number: 12, choices: ['a', 'b', 'c'] },
  ])
  expect(items('lesen', 4).map((item: { number: number }) => item.number)).toEqual([20, 21, 22, 23, 24, 25, 26])
  expect(items('lesen', 4)[0].choices).toEqual(['ja', 'nein'])
  // Hören Teil 1 alternates: a richtig/falsch item, then an a/b/c item.
  expect(items('hoeren', 1).slice(0, 3)).toEqual([
    { number: 1, choices: ['richtig', 'falsch'] },
    { number: 2, choices: ['a', 'b', 'c'] },
    { number: 3, choices: ['richtig', 'falsch'] },
  ])
  expect(items('hoeren', 4).map((item: { number: number }) => item.number)).toEqual([23, 24, 25, 26, 27, 28, 29, 30])
})

test('a numbering misprint in the answer key is repaired, and the repair is recorded', async () => {
  // The fixture key prints exam 2, Lesen Teil 2 as "7 b  8 a  8 c  10 c  11 a  12 b".
  const { report, packDir } = await build()

  expect(await answersOf(packDir, 2, 'lesen', 2)).toEqual([
    [7, 'b'],
    [8, 'a'],
    [9, 'c'],
    [10, 'c'],
    [11, 'a'],
    [12, 'b'],
  ])
  const repair = { exam: 2, module: 'lesen', part: 2, item: 9, printed: 8 }
  expect(report.repairs).toEqual([repair])
  expect((await readJson(packDir, 'answers.json')).repairs).toEqual([repair])
})
