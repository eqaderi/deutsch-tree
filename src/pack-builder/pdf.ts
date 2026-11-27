/**
 * The two things the pack builder does with a PDF: read the text layer of
 * every page, and copy a run of pages into a new file. Pages are copied
 * unchanged; nothing is rendered, recognised or retyped.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

interface Fragment {
  text: string
  column: number
  x: number
  y: number
  width: number
  height: number
}

/**
 * The text of every page, one string per page, with one line of the page per
 * line of text, top to bottom. With `columns` above 1 the page is cut into
 * that many equal vertical strips, read one after the other.
 */
export async function readPdfText(file: string, columns = 1): Promise<string[]> {
  const data = new Uint8Array(await readFile(file))
  const task = getDocument({ data, verbosity: 0 })
  const pdf = await task.promise
  try {
    const pages: string[] = []
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number)
      const [left = 0, , right = 0] = page.view
      const stripWidth = (right - left) / columns
      const content = await page.getTextContent()
      const fragments: Fragment[] = []
      for (const item of content.items) {
        if (!('str' in item) || item.str.trim() === '') continue
        const x = item.transform[4] as number
        fragments.push({
          text: item.str,
          column: Math.min(columns - 1, Math.max(0, Math.floor((x - left) / stripWidth))),
          x,
          y: item.transform[5] as number,
          width: item.width,
          height: item.height,
        })
      }
      pages.push(linesOf(fragments).join('\n'))
    }
    return pages
  } finally {
    await task.destroy()
  }
}

/** How many pages a PDF has. Its text is not read. */
export async function pdfPageCount(file: string): Promise<number> {
  const task = getDocument({ data: new Uint8Array(await readFile(file)), verbosity: 0 })
  try {
    return (await task.promise).numPages
  } finally {
    await task.destroy()
  }
}

/** Groups text fragments into lines: by column, then top to bottom, then left to right. */
function linesOf(fragments: Fragment[]): string[] {
  const sorted = [...fragments].sort((a, b) => a.column - b.column || b.y - a.y || a.x - b.x)
  const lines: Fragment[][] = []
  for (const fragment of sorted) {
    const line = lines.at(-1)
    const first = line?.[0]
    const sameLine =
      first !== undefined &&
      first.column === fragment.column &&
      Math.abs(first.y - fragment.y) <= Math.max(2, 0.4 * Math.min(first.height, fragment.height))
    if (line && sameLine) line.push(fragment)
    else lines.push([fragment])
  }
  return lines.map((line) => {
    let text = ''
    let end = Number.NEGATIVE_INFINITY
    for (const fragment of line.sort((a, b) => a.x - b.x)) {
      // Fragments that touch are pieces of one word; a visible gap is a space.
      const gap = fragment.x - end
      text += text !== '' && gap > 0.15 * fragment.height ? ` ${fragment.text}` : fragment.text
      end = fragment.x + fragment.width
    }
    // One spelling for umlauts (a single character), as in the profile's patterns.
    return text.normalize('NFC').replace(/\s+/g, ' ').trim()
  })
}

/** Copies pages `first` to `last` (counted from 1) of `source` into each `file`. */
export async function splitPdf(
  source: string,
  parts: Array<{ file: string; first: number; last: number }>,
): Promise<void> {
  const book = await PDFDocument.load(await readFile(source))
  for (const part of parts) {
    const out = await PDFDocument.create()
    const indices = Array.from({ length: part.last - part.first + 1 }, (_, offset) => part.first - 1 + offset)
    for (const page of await out.copyPages(book, indices)) out.addPage(page)
    await writeFile(part.file, await out.save())
  }
}
