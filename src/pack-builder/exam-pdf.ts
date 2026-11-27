/**
 * Reads the exam PDF's text into an outline: on which page every exam, module
 * and part starts. Or, for a book whose exams all have the same pages, works
 * the pages out from the profile's layout without reading any text.
 */
import type { PageRange } from '../content-model/pack.ts'
import { matches } from './patterns.ts'
import type { BookProfile, ModuleProfile } from './profile.ts'

export interface PartOutline {
  number: number
  page: number
}

export interface ModuleOutline {
  profile: ModuleProfile
  page: number
  parts: PartOutline[]
}

export interface ExamOutline {
  number: number
  page: number
  modules: ModuleOutline[]
}

type HeadingEvent =
  | { kind: 'exam'; index: number; number: number }
  | { kind: 'module'; index: number; profile: ModuleProfile }
  | { kind: 'part'; index: number; number: number }

/**
 * Walks the pages in order and notes where the exam, module or part changes.
 * A heading that repeats the current one (a running head on every page) is
 * not a change, so both kinds of book give the same outline.
 */
export function outlineOf(pages: string[], profile: BookProfile, firstPage: number, lastPage: number): ExamOutline[] {
  const exams: ExamOutline[] = []
  let exam: ExamOutline | undefined
  let module: ModuleOutline | undefined
  let part: PartOutline | undefined

  for (let page = firstPage; page <= lastPage; page++) {
    const text = pages[page - 1] ?? ''
    const events: HeadingEvent[] = [
      ...matches(profile.examPdf.exam, text).map(
        (match): HeadingEvent => ({ kind: 'exam', index: match.index, number: Number(match.groups[0]) }),
      ),
      ...profile.modules.flatMap((moduleProfile) =>
        matches(profile.examPdf.modules[moduleProfile.id] as string, text).map(
          (match): HeadingEvent => ({ kind: 'module', index: match.index, profile: moduleProfile }),
        ),
      ),
      ...matches(profile.examPdf.part, text).map(
        (match): HeadingEvent => ({ kind: 'part', index: match.index, number: Number(match.groups[0]) }),
      ),
    ]
    // An exam starts on a new page, so its heading counts first wherever it sits on the page.
    events.sort((a, b) => Number(b.kind === 'exam') - Number(a.kind === 'exam') || a.index - b.index)

    for (const event of events) {
      if (event.kind === 'exam') {
        if (exam?.number === event.number) continue
        exam = { number: event.number, page, modules: [] }
        exams.push(exam)
        module = undefined
        part = undefined
      } else if (event.kind === 'module') {
        if (!exam || module?.profile.id === event.profile.id) continue
        module = { profile: event.profile, page, parts: [] }
        exam.modules.push(module)
        part = undefined
      } else {
        if (!module || module.profile.parts.length === 0 || part?.number === event.number) continue
        part = { number: event.number, page }
        module.parts.push(part)
      }
    }
  }
  return exams
}

const list = (numbers: number[]) => (numbers.length > 0 ? numbers.join(', ') : 'none')

export interface OutlineCheck {
  errors: string[]
  /**
   * False when the list of exams itself is in doubt. The answer key and the
   * recordings are then not checked: every mismatch would be an echo.
   */
  examsAddUp: boolean
}

/** Everything in the outline that does not match the profile's exam structure. */
export function checkOutline(
  exams: ExamOutline[],
  profile: BookProfile,
  firstPage: number,
  lastPage: number,
): OutlineCheck {
  if (exams.length === 0) {
    return {
      errors: [
        `No exam heading found on pages ${firstPage} to ${lastPage}. The pattern for an exam's heading is ${profile.examPdf.exam}`,
      ],
      examsAddUp: false,
    }
  }
  const errors: string[] = []
  const numbers = exams.map((exam) => exam.number)
  if (numbers.some((number, index) => number !== index + 1)) {
    const where = exams.map((exam) => `${exam.number} (page ${exam.page})`).join(', ')
    errors.push(`Exam headings must count 1, 2, 3 and so on, each once. Found, in page order: ${where}`)
  }
  if (profile.exams !== undefined && profile.exams !== exams.length) {
    errors.push(`The profile says the book has ${profile.exams} exams, but ${exams.length} exam headings were found`)
  }
  const examsAddUp = errors.length === 0
  for (const exam of exams) {
    const expected = profile.modules.map((module) => module.id)
    const found = exam.modules.map((module) => module.profile.id)
    if (expected.join() !== found.join()) {
      const where = exam.modules.map((module) => `${module.profile.title} (page ${module.page})`).join(', ')
      errors.push(
        `Exam ${exam.number} (from page ${exam.page}): expected the modules ${profile.modules
          .map((module) => module.title)
          .join(', ')} in this order, each once. Found: ${where || 'none'}`,
      )
    }
    for (const module of exam.modules) {
      const wanted = module.profile.parts.map((_, index) => index + 1)
      const got = module.parts.map((part) => part.number)
      if (wanted.join() !== got.join()) {
        const missing = wanted.filter((number) => !got.includes(number))
        const where = module.parts.map((part) => `Teil ${part.number} (page ${part.page})`).join(', ')
        errors.push(
          `Exam ${exam.number}, ${module.profile.title} (from page ${module.page}): expected headings for parts ${list(wanted)} in this order, each once. Found: ${where || 'none'}.${
            missing.length > 0 ? ` Missing: part ${list(missing)}.` : ''
          }`,
        )
      }
    }
  }
  return { errors, examsAddUp }
}

/** The pages of every exam, module and part, counted in the exam PDF. */
export interface ExamPages {
  number: number
  pages: PageRange
  modules: Array<{ profile: ModuleProfile; pages: PageRange; parts: Array<{ number: number; pages: PageRange }> }>
}

/** The pages of an outline that has passed checkOutline. */
export function pagesOfOutline(exams: ExamOutline[], lastPage: number): ExamPages[] {
  return exams.map((exam, examIndex) => {
    const examLast = (exams[examIndex + 1]?.page ?? lastPage + 1) - 1
    return {
      number: exam.number,
      pages: { first: exam.page, last: examLast },
      modules: exam.modules.map((module, moduleIndex) => {
        // A section ends on the page before the next heading. When two
        // headings share a page, that page belongs to both sections.
        const nextModule = exam.modules[moduleIndex + 1]?.page ?? examLast + 1
        const moduleLast = Math.max(module.page, nextModule - 1)
        return {
          profile: module.profile,
          pages: { first: module.page, last: moduleLast },
          parts: module.parts.map((part, partIndex) => {
            const nextPart = module.parts[partIndex + 1]?.page ?? moduleLast + 1
            return { number: part.number, pages: { first: part.page, last: Math.max(part.page, nextPart - 1) } }
          }),
        }
      }),
    }
  })
}

/** The pages of the profile's `exams` exams, from its layout. The profile has checked the layout. */
export function pagesOfLayout(profile: BookProfile): ExamPages[] {
  const layout = profile.examPdf.layout
  if (!layout || profile.exams === undefined) return []
  return Array.from({ length: profile.exams }, (_, index) => {
    const before = layout.firstPage - 1 + index * layout.pagesPerExam
    const inBook = ([first, last]: [number, number]) => ({ first: before + first, last: before + last })
    return {
      number: index + 1,
      pages: inBook([1, layout.pagesPerExam]),
      modules: profile.modules.map((module) => {
        const entry = layout.modules[module.id] ?? { pages: [1, layout.pagesPerExam], parts: [] }
        return {
          profile: module,
          pages: inBook(entry.pages),
          parts: entry.parts.map((range, partIndex) => ({ number: partIndex + 1, pages: inBook(range) })),
        }
      }),
    }
  })
}
