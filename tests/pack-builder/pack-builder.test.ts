import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import { buildPack, type PackBuildOptions } from '../../src/pack-builder/index.ts'
import { type FixtureBook, fixtureBook, fixturePageNumbers, writeFixtureBook } from './fixture.ts'

/** Builds a pack from a synthetic book into a new temporary folder. */
async function build(book: FixtureBook = fixtureBook(), options: Partial<PackBuildOptions> = {}) {
  const files = await writeFixtureBook(book)
  const outDir = options.outDir ?? (await mkdtemp(path.join(tmpdir(), 'deutsch-tree-packs-')))
  const result = await buildPack({
    examPdf: files.examPdf,
    answerKeyPdf: files.answerKeyPdf,
    audioDir: files.audioDir,
    name: 'Fixture book',
    outDir,
    ...options,
  })
  return { ...result, outDir, files }
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

test("the description lists each part's items with the answers an answer sheet offers", async () => {
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

test('recordings are matched to Hören parts by file name and copied into the pack', async () => {
  const { packDir, files } = await build()
  const description = await readJson(packDir, 'pack.json')
  const recordings = (exam: number, moduleId: string) =>
    description.exams[exam - 1].modules
      .find((module: { id: string }) => module.id === moduleId)
      .parts.map((part: { recordings: unknown }) => part.recordings)

  expect(recordings(1, 'hoeren')).toEqual([
    [{ file: 'exams/01/hoeren-1.mp3', source: 'Modelltest-1-Hoeren-Teil-1.mp3' }],
    [{ file: 'exams/01/hoeren-2.mp3', source: 'Modelltest-1-Hoeren-Teil-2.mp3' }],
    [{ file: 'exams/01/hoeren-3.mp3', source: 'Modelltest-1-Hoeren-Teil-3.mp3' }],
    [{ file: 'exams/01/hoeren-4.mp3', source: 'Modelltest-1-Hoeren-Teil-4.mp3' }],
  ])
  expect(recordings(2, 'hoeren')).toEqual([
    [{ file: 'exams/02/hoeren-1.mp3', source: 'Modelltest-2-Hoeren-Teil-1.mp3' }],
    [{ file: 'exams/02/hoeren-2.mp3', source: 'Modelltest-2-Hoeren-Teil-2.mp3' }],
    [{ file: 'exams/02/hoeren-3.mp3', source: 'Modelltest-2-Hoeren-Teil-3.mp3' }],
    [{ file: 'exams/02/hoeren-4.mp3', source: 'Modelltest-2-Hoeren-Teil-4.mp3' }],
  ])
  expect(recordings(1, 'lesen')).toEqual([[], [], [], [], []])

  // The copy is the learner's file, byte for byte.
  const copied = await readFile(path.join(packDir as string, 'exams/02/hoeren-3.mp3'))
  const original = await readFile(path.join(files.audioDir, 'Modelltest-2-Hoeren-Teil-3.mp3'))
  expect(copied.equals(original)).toBe(true)
})

// ---------------------------------------------------------------------------
// A book that does not add up: errors in the report, and no pack
// ---------------------------------------------------------------------------

/** Builds from the default book after `edit` has changed it; expects the build to fail. */
async function buildBroken(edit: (book: FixtureBook) => void) {
  const book = fixtureBook()
  edit(book)
  const { report, packDir, outDir } = await build(book)

  expect(report.ok).toBe(false)
  expect(packDir).toBeNull()
  expect(await readdir(outDir)).toEqual([])
  return report
}

/** Replaces one line of a page with other lines (none to delete it). */
function replaceLine(pages: FixtureBook['examPages'], page: number, line: string, ...replacement: string[]) {
  const lines = pages[page - 1] as string[]
  expect(lines).toContain(line)
  lines.splice(lines.indexOf(line), 1, ...replacement)
}

test('an exam with a missing part heading is an error that names the exam, the module and the part', async () => {
  // Page 17 is where Lesen Teil 3 of exam 2 starts.
  const report = await buildBroken((book) => replaceLine(book.examPages, 17, 'Teil 3'))

  expect(report.errors).toEqual([
    { source: 'exam-pdf', message: expect.stringMatching(/^Exam 2, Lesen .*Missing: part 3\b/) },
  ])
  // The report still shows what was found, so the pattern or the book can be checked.
  expect(report.headings).toContainEqual({ exam: 2, module: 'lesen', part: 2, page: 15 })
  expect(report.headings).toContainEqual({ exam: 2, module: 'lesen', part: 4, page: 18 })
})

test('an exam with a missing module heading is an error', async () => {
  const report = await buildBroken((book) => replaceLine(book.examPages, 8, 'Hören'))

  expect(report.errors).toContainEqual({ source: 'exam-pdf', message: expect.stringMatching(/^Exam 1 .*Hören/) })
})

test('exam headings that do not count up from 1 are an error', async () => {
  const report = await buildBroken((book) => replaceLine(book.examPages, 14, 'Modelltest 2', 'Modelltest 3'))

  expect(report.errors).toContainEqual({
    source: 'exam-pdf',
    message: expect.stringContaining('1 (page 2), 3 (page 14)'),
  })
})

test('an exam PDF without a text layer is an error', async () => {
  const report = await buildBroken((book) => {
    book.examPages = book.examPages.map(() => [])
  })

  expect(report.errors).toEqual([{ source: 'exam-pdf', message: expect.stringContaining('no text layer') }])
})

test('a part with fewer answers in the key than items is an error, not a shifted key', async () => {
  const report = await buildBroken((book) =>
    replaceLine(
      book.keyPages,
      1,
      'Teil 2   7 a   8 c   9 b   10 b   11 a   12 c',
      'Teil 2   7 a   8 c   9 b   10 b   11 a',
    ),
  )

  expect(report.errors).toEqual([
    {
      source: 'answer-key',
      message:
        'Exam 1, Lesen Teil 2: the key has 5 answers but the part has 6 items. Printed numbers found: 7, 8, 9, 10, 11',
    },
  ])
})

test('an answer that its item cannot have is an error', async () => {
  const report = await buildBroken((book) =>
    replaceLine(
      book.keyPages,
      1,
      'Teil 1   1 richtig   2 falsch   3 falsch   4 richtig   5 richtig   6 falsch',
      'Teil 1   1 richtig   2 b   3 falsch   4 richtig   5 richtig   6 falsch',
    ),
  )

  expect(report.errors).toEqual([
    {
      source: 'answer-key',
      message: 'Exam 1, Lesen Teil 1, item 2: the key says "b", which is not one of richtig, falsch',
    },
  ])
})

test('an exam that the answer key does not have is an error', async () => {
  const report = await buildBroken((book) => {
    book.keyPages = book.keyPages.slice(0, 1)
  })

  expect(report.errors).toEqual([
    { source: 'answer-key', message: 'Exam 2: no heading for this exam in the answer key' },
  ])
})

test('a recording whose name matches nothing is an error', async () => {
  const report = await buildBroken((book) => {
    book.recordings.push('Bonus track.mp3')
  })

  expect(report.errors).toEqual([{ source: 'recordings', message: expect.stringContaining('"Bonus track.mp3"') }])
})

test('a recording for an exam or part that does not exist is an error', async () => {
  const report = await buildBroken((book) => {
    book.recordings.push('Modelltest-3-Hoeren-Teil-1.mp3', 'Modelltest-1-Hoeren-Teil-5.mp3')
  })

  expect(report.errors).toEqual([
    { source: 'recordings', message: expect.stringMatching(/"Modelltest-1-Hoeren-Teil-5.mp3".*Teil 5/) },
    { source: 'recordings', message: expect.stringMatching(/"Modelltest-3-Hoeren-Teil-1.mp3".*exam 3/) },
  ])
})

test('a Hören part without a recording is an error', async () => {
  const report = await buildBroken((book) => {
    book.recordings = book.recordings.filter((name) => name !== 'Modelltest-2-Hoeren-Teil-4.mp3')
  })

  expect(report.errors).toEqual([{ source: 'recordings', message: 'Exam 2, Hören Teil 4: no recording found' }])
})

test('problems in the exam PDF, the answer key and the recordings are all reported in one run', async () => {
  const report = await buildBroken((book) => {
    replaceLine(book.examPages, 17, 'Teil 3')
    replaceLine(book.keyPages, 2, 'Teil 5   27 b   28 b   29 c   30 a', 'Teil 5   27 b   28 b   29 c')
    book.recordings.push('Bonus track.mp3')
  })

  expect(report.errors.map((error) => error.source)).toEqual(['exam-pdf', 'answer-key', 'recordings'])
})

test('a file that is not a PDF is an error', async () => {
  const files = await writeFixtureBook(fixtureBook())
  const { report, packDir } = await build(fixtureBook(), {
    answerKeyPdf: path.join(files.audioDir, 'Modelltest-1-Hoeren-Teil-1.mp3'),
  })

  expect(packDir).toBeNull()
  expect(report.errors).toEqual([{ source: 'answer-key', message: expect.stringContaining('cannot be read as a PDF') }])
})

test('an existing pack is left alone unless the build is told to replace it', async () => {
  const first = await build()
  const smaller = fixtureBook()
  smaller.examPages = smaller.examPages.slice(0, 13)
  smaller.keyPages = smaller.keyPages.slice(0, 1)
  smaller.recordings = smaller.recordings.slice(0, 4)

  const refused = await build(smaller, { outDir: first.outDir })
  expect(refused.packDir).toBeNull()
  expect(refused.report.errors).toEqual([{ source: 'output', message: expect.stringContaining('already exists') }])
  expect((await readJson(first.packDir, 'pack.json')).examCount).toBe(2)

  const replaced = await build(smaller, { outDir: first.outDir, replace: true })
  expect(replaced.report.errors).toEqual([])
  expect((await readJson(replaced.packDir, 'pack.json')).examCount).toBe(1)
  // Nothing of the old pack is left behind, and no working folder either.
  expect(await readdir(first.outDir)).toEqual(['fixture-book'])
  expect(await readdir(path.join(first.outDir, 'fixture-book', 'exams'))).toEqual(['01'])
})

// ---------------------------------------------------------------------------
// A book laid out differently: everything book-specific comes from the profile
// ---------------------------------------------------------------------------

/**
 * A book unlike the default one: other names, a running head on every page
 * instead of headings, contents and transcripts that repeat the headings, a
 * two-column answer key with no part headings and one-letter answers, and
 * recordings numbered as tracks in two folders.
 */
function otherBook(): FixtureBook {
  const exam = (number: number): string[][] => [
    [`Übungssatz ${number} | Leseverstehen | Aufgabe 1`, 'Placeholder text.'],
    [`Übungssatz ${number} | Leseverstehen | Aufgabe 1`, 'Placeholder text, continued.'],
    [`Übungssatz ${number} | Leseverstehen | Aufgabe 2`, 'Placeholder text.'],
    [`Übungssatz ${number} | Hörverstehen | Aufgabe 1`, 'Placeholder text.'],
    [`Übungssatz ${number} | Hörverstehen | Aufgabe 2`, 'Placeholder text.'],
    [`Übungssatz ${number} | Schriftlicher Ausdruck`, 'Placeholder text.'],
  ]
  return {
    examPages: [
      ['Contents', 'Übungssatz 1 | page 3', 'Übungssatz 2 | page 9'],
      ['Introduction', 'Placeholder text.'],
      ...exam(1),
      ...exam(2),
      ['Transcripts', 'Übungssatz 1 | Hörverstehen | Aufgabe 1', 'Placeholder text.'],
    ],
    keyPages: [
      {
        columns: [
          ['Lösungen zu Übungssatz 1', 'LV: 1. R 2. F 3. R 4. b 5. a', 'HV: 1. c 2. a 3. b 4. b'],
          ['Lösungen zu Übungssatz 2', 'LV: 1. F 2. F 3. R 4. c 5. c', 'HV: 1. a 2. b 3. c 4. a'],
        ],
      },
    ],
    recordings: ['cover.jpg', 'CD1/Track 2.mp3', 'CD1/Track 3.mp3', 'CD2/Track 10.mp3', 'CD2/Track 11.mp3'],
  }
}

const otherProfile: PackBuildOptions['profile'] = {
  exams: 2,
  modules: [
    {
      id: 'lesen',
      title: 'Leseverstehen',
      parts: [
        { items: 3, choices: ['richtig', 'falsch'] },
        { items: 2, choices: ['a', 'b', 'c'] },
      ],
    },
    {
      id: 'hoeren',
      title: 'Hörverstehen',
      recordings: true,
      parts: [
        { items: 2, choices: ['a', 'b', 'c'] },
        { items: 2, choices: ['a', 'b', 'c'] },
      ],
    },
    { id: 'schreiben', title: 'Schriftlicher Ausdruck' },
  ],
  examPdf: {
    firstPage: 3,
    lastPage: 14,
    exam: '^Übungssatz (\\d+) \\|',
    modules: {
      lesen: '\\| Leseverstehen\\b',
      hoeren: '\\| Hörverstehen\\b',
      schreiben: '\\| Schriftlicher Ausdruck$',
    },
    part: '\\| Aufgabe (\\d+)$',
  },
  answerKey: {
    columns: 2,
    exam: 'Übungssatz (\\d+)',
    modules: { lesen: '^LV:', hoeren: '^HV:' },
    part: null,
    item: '(\\d+)\\. (R|F|[a-c])(?!\\S)',
    answers: { R: 'richtig', F: 'falsch' },
  },
  recordings: { file: '^Track (?<track>\\d+)$', ignore: '\\.jpg$' },
}

test("a book with another layout is read with that book's profile", async () => {
  const { report, packDir } = await build(otherBook(), { profile: otherProfile })
  expect(report.errors).toEqual([])
  expect(report.repairs).toEqual([])

  const description = await readJson(packDir, 'pack.json')
  expect(description.examCount).toBe(2)
  // The contents page, the introduction and the transcripts belong to no exam.
  expect(description.exams.map((exam: { sourcePages: unknown }) => exam.sourcePages)).toEqual([
    { first: 3, last: 8 },
    { first: 9, last: 14 },
  ])
  const outline = description.exams[1].modules.map(
    (module: { title: string; sourcePages: unknown; parts: Array<{ sourcePages: unknown }> }) => [
      module.title,
      module.sourcePages,
      module.parts.map((part) => part.sourcePages),
    ],
  )
  expect(outline).toEqual([
    [
      'Leseverstehen',
      { first: 9, last: 11 },
      [
        { first: 9, last: 10 },
        { first: 11, last: 11 },
      ],
    ],
    [
      'Hörverstehen',
      { first: 12, last: 13 },
      [
        { first: 12, last: 12 },
        { first: 13, last: 13 },
      ],
    ],
    ['Schriftlicher Ausdruck', { first: 14, last: 14 }, []],
  ])

  // The key has no part headings: answers are cut into parts by item count.
  expect(await answersOf(packDir, 1, 'lesen', 1)).toEqual([
    [1, 'richtig'],
    [2, 'falsch'],
    [3, 'richtig'],
  ])
  expect(await answersOf(packDir, 1, 'lesen', 2)).toEqual([
    [4, 'b'],
    [5, 'a'],
  ])
  expect(await answersOf(packDir, 2, 'lesen', 1)).toEqual([
    [1, 'falsch'],
    [2, 'falsch'],
    [3, 'richtig'],
  ])
  expect(await answersOf(packDir, 2, 'hoeren', 2)).toEqual([
    [3, 'c'],
    [4, 'a'],
  ])

  // Tracks in number order are the Hören parts in book order: 2, 3, 10, 11.
  const recordings = description.exams.map((exam: { modules: Array<{ id: string; parts: unknown[] }> }) =>
    exam.modules
      .find((module) => module.id === 'hoeren')
      ?.parts.map((part) => (part as { recordings: unknown }).recordings),
  )
  expect(recordings).toEqual([
    [
      [{ file: 'exams/01/hoeren-1.mp3', source: 'CD1/Track 2.mp3' }],
      [{ file: 'exams/01/hoeren-2.mp3', source: 'CD1/Track 3.mp3' }],
    ],
    [
      [{ file: 'exams/02/hoeren-1.mp3', source: 'CD2/Track 10.mp3' }],
      [{ file: 'exams/02/hoeren-2.mp3', source: 'CD2/Track 11.mp3' }],
    ],
  ])
})

test('with track numbers, a missing recording is an error rather than a shifted mapping', async () => {
  const book = otherBook()
  book.recordings = book.recordings.filter((name) => name !== 'CD1/Track 3.mp3')
  const { report, packDir } = await build(book, { profile: otherProfile })

  expect(packDir).toBeNull()
  expect(report.errors).toEqual([
    { source: 'recordings', message: expect.stringMatching(/^Found 3 recordings, but .* need 4$/) },
  ])
})

test('a part may have several recordings, kept in file-name order', async () => {
  const book = fixtureBook()
  book.recordings = book.recordings.flatMap((name) =>
    name === 'Modelltest-1-Hoeren-Teil-1.mp3'
      ? ['Modelltest-1-Hoeren-Teil-1b.mp3', 'Modelltest-1-Hoeren-Teil-1a.mp3']
      : [name],
  )
  const { report, packDir } = await build(book)

  expect(report.errors).toEqual([])
  const description = await readJson(packDir, 'pack.json')
  expect(description.exams[0].modules[1].parts[0].recordings).toEqual([
    { file: 'exams/01/hoeren-1-1.mp3', source: 'Modelltest-1-Hoeren-Teil-1a.mp3' },
    { file: 'exams/01/hoeren-1-2.mp3', source: 'Modelltest-1-Hoeren-Teil-1b.mp3' },
  ])
})

test('a different number of exams than the profile expects is an error', async () => {
  const { report, packDir } = await build(fixtureBook(), { profile: { exams: 15 } })

  expect(packDir).toBeNull()
  expect(report.errors).toContainEqual({
    source: 'exam-pdf',
    message: 'The profile says the book has 15 exams, but 2 exam headings were found',
  })
})

test('a profile with a mistake in it is reported before any file is read', async () => {
  const { report, packDir } = await build(fixtureBook(), {
    profile: {
      examPdf: { exam: '^Modelltest (\\d+' },
      recordings: { file: '^Track (\\d+)$' },
      // @ts-expect-error a misspelt key
      answerkey: {},
    },
  })

  expect(packDir).toBeNull()
  expect(report.errors.map((error) => error.source)).toEqual(['profile', 'profile', 'profile'])
  expect(report.errors.map((error) => error.message).join('\n')).toMatch(/examPdf\.exam: is not a valid pattern/)
  expect(report.errors.map((error) => error.message).join('\n')).toMatch(/recordings\.file: needs either/)
  expect(report.errors.map((error) => error.message).join('\n')).toMatch(/answerkey/)
})
