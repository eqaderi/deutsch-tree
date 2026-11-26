/**
 * Synthetic source files for the pack builder: an exam PDF with a text layer,
 * an answer-key PDF and a folder of silent recordings. Every word in them is
 * invented placeholder text; nothing comes from a real book.
 *
 * A book is described as plain data (the lines on each page, the recording
 * file names), so a test changes one line to get a broken or unusual book,
 * and a quirk found in a real book is reproduced here by editing lines.
 *
 *   node tests/pack-builder/fixture.ts <folder>    write the default book's files
 */
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

/** The lines on a page, top to bottom; or side-by-side columns of lines. */
export type FixturePage = string[] | { columns: string[][] }

export interface FixtureBook {
  examPages: FixturePage[]
  keyPages: FixturePage[]
  /** File names in the audio folder. Each becomes a short silent recording. */
  recordings: string[]
}

export interface FixtureFiles {
  dir: string
  examPdf: string
  answerKeyPdf: string
  audioDir: string
}

/** The twelve pages of one exam, with each heading on a line of its own. */
function examPages(exam: number): string[][] {
  const body = (what: string) => [`Placeholder text for ${what}.`, 'Invented for the tests; not from any book.']
  return [
    [`Modelltest ${exam}`, 'Lesen', 'Teil 1', ...body('reading part one')],
    ['Teil 2', ...body('reading part two')],
    ['noch Teil 2', ...body('the second page of reading part two')],
    ['Teil 3', ...body('reading part three')],
    ['Teil 4', ...body('reading part four')],
    ['Teil 5', ...body('reading part five')],
    ['Hören', 'Teil 1', ...body('listening part one'), 'Lesen Sie die Aufgaben aus Teil 1 noch einmal.'],
    ['Teil 2', ...body('listening part two')],
    ['Teil 3', ...body('listening part three')],
    ['Teil 4', ...body('listening part four')],
    ['Schreiben', 'Aufgabe 1', ...body('the writing tasks')],
    ['Sprechen', 'Teil 1', ...body('the speaking tasks'), 'Teil 2'],
  ]
}

/**
 * The default book: one page of front matter, then two exams of twelve pages
 * each (exam 1 on pages 2 to 13, exam 2 on pages 14 to 25). The answer key
 * has one misprint: in exam 2, Lesen Teil 2, item 9 is printed as a second 8.
 */
export function fixtureBook(): FixtureBook {
  return {
    examPages: [
      ['Synthetic practice book', 'Contents', 'Modelltest 1 ........ 2', 'Modelltest 2 ........ 14'],
      ...examPages(1),
      ...examPages(2),
    ],
    keyPages: [
      [
        'Lösungen',
        'Modelltest 1',
        'Lesen',
        'Teil 1   1 richtig   2 falsch   3 falsch   4 richtig   5 richtig   6 falsch',
        'Teil 2   7 a   8 c   9 b   10 b   11 a   12 c',
        'Teil 3   13 d   14 0   15 a   16 h   17 f   18 j   19 b',
        'Teil 4   20 ja   21 nein   22 nein   23 ja   24 ja   25 nein   26 ja',
        'Teil 5   27 c   28 a   29 b   30 a',
        'Hören',
        'Teil 1   1 falsch   2 b   3 richtig   4 a   5 richtig   6 c   7 falsch   8 a   9 falsch   10 b',
        'Teil 2   11 c   12 a   13 b   14 b   15 a',
        'Teil 3   16 richtig   17 falsch   18 falsch   19 richtig   20 falsch   21 richtig   22 richtig',
        'Teil 4   23 a   24 c   25 b   26 b   27 a   28 c   29 a   30 b',
      ],
      [
        'Modelltest 2',
        'Lesen',
        'Teil 1   1 falsch   2 falsch   3 richtig   4 richtig   5 falsch   6 richtig',
        'Teil 2   7 b   8 a   8 c   10 c   11 a   12 b',
        'Teil 3   13 g   14 c   15 0   16 e   17 a   18 i   19 d',
        'Teil 4   20 nein   21 ja   22 ja   23 nein   24 ja   25 nein   26 nein',
        'Teil 5   27 b   28 b   29 c   30 a',
        'Hören',
        'Teil 1   1 richtig   2 c   3 falsch   4 b   5 falsch   6 a   7 richtig   8 c   9 richtig   10 a',
        'Teil 2   11 a   12 b   13 c   14 a   15 c',
        'Teil 3   16 falsch   17 richtig   18 richtig   19 falsch   20 richtig   21 falsch   22 falsch',
        'Teil 4   23 b   24 a   25 c   26 a   27 c   28 b   29 b   30 c',
      ],
    ],
    recordings: [1, 2].flatMap((exam) => [1, 2, 3, 4].map((part) => `Modelltest-${exam}-Hoeren-Teil-${part}.mp3`)),
  }
}

const PAGE = { width: 595, height: 842, margin: 50, lineHeight: 18, fontSize: 9 }

/** A PDF with a text layer. Every page ends with the line "Fixture page N". */
async function pdfOf(pages: FixturePage[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  pages.forEach((content, index) => {
    const page = doc.addPage([PAGE.width, PAGE.height])
    const columns = Array.isArray(content) ? [content] : content.columns
    const columnWidth = (PAGE.width - 2 * PAGE.margin) / columns.length
    columns.forEach((lines, column) => {
      lines.forEach((line, row) => {
        page.drawText(line, {
          x: PAGE.margin + column * columnWidth,
          y: PAGE.height - PAGE.margin - row * PAGE.lineHeight,
          size: PAGE.fontSize,
          font,
        })
      })
    })
    if (columns.some((lines) => lines.length > 0)) {
      page.drawText(`Fixture page ${index + 1}`, { x: PAGE.margin, y: PAGE.margin, size: PAGE.fontSize, font })
    }
  })
  return doc.save()
}

/**
 * Silence as an MP3: MPEG-1 Layer III frames (128 kbit/s, 44.1 kHz, 26 ms
 * each) with nothing in them.
 */
export function silentMp3(frames = 10): Buffer {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0x64])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}

/** Writes a book's source files into a folder; a new temporary one unless given. */
export async function writeFixtureBook(book: FixtureBook, dir?: string): Promise<FixtureFiles> {
  const target = dir ?? (await mkdtemp(path.join(tmpdir(), 'deutsch-tree-book-')))
  const files: FixtureFiles = {
    dir: target,
    examPdf: path.join(target, 'exams.pdf'),
    answerKeyPdf: path.join(target, 'answer-key.pdf'),
    audioDir: path.join(target, 'audio'),
  }
  await mkdir(files.audioDir, { recursive: true })
  await writeFile(files.examPdf, await pdfOf(book.examPages))
  await writeFile(files.answerKeyPdf, await pdfOf(book.keyPages))
  // Every recording has its own length, so a test can tell which file was copied where.
  for (const [index, name] of book.recordings.entries()) {
    await mkdir(path.dirname(path.join(files.audioDir, name)), { recursive: true })
    await writeFile(path.join(files.audioDir, name), silentMp3(10 + index))
  }
  return files
}

/**
 * Which pages of the fixture book a PDF holds: the N of every page's
 * "Fixture page N" line, in page order.
 */
export async function fixturePageNumbers(pdfFile: string): Promise<number[]> {
  const task = getDocument({ data: new Uint8Array(await readFile(pdfFile)), verbosity: 0 })
  const pdf = await task.promise
  const numbers: number[] = []
  for (let page = 1; page <= pdf.numPages; page++) {
    const content = await (await pdf.getPage(page)).getTextContent()
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    numbers.push(Number(/Fixture page (\d+)/.exec(text)?.[1]))
  }
  await task.destroy()
  return numbers
}

if (import.meta.main) {
  const [folder] = process.argv.slice(2)
  if (!folder) throw new Error('usage: node tests/pack-builder/fixture.ts <folder>')
  const files = await writeFixtureBook(fixtureBook(), folder)
  console.log(`Synthetic book written to ${files.dir}`)
}
