/**
 * Pack builder: a learner's own exam book (exam PDF, answer-key PDF, audio
 * folder) in, a pack folder out. It copies and rearranges the learner's
 * files; it never retypes, translates or publishes anything.
 *
 * The builder writes a pack only when everything adds up. Anything that does
 * not (an exam with a missing part, a recording that matches nothing, a part
 * whose answers do not match its items) is an error in the report, and
 * nothing is written. A wrong answer key that looks right is the worst
 * outcome, so there are no silent guesses.
 */
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  PACK_DESCRIPTION_FILE,
  PACK_FORMAT,
  type PackDescription,
  type PackExam,
  type PageRange,
} from '../content-model/pack.ts'
import { readPdfText, splitPdf } from './pdf.ts'
import { type BookProfile, type BookProfileOverrides, type ModuleProfile, resolveProfile } from './profile.ts'

export interface PackBuildOptions {
  /** The book's exams as one PDF with a text layer. */
  examPdf: string
  /** The book's answer key as a PDF with a text layer. */
  answerKeyPdf: string
  /** The folder that holds the book's recordings. */
  audioDir: string
  /** The pack's name, as the app shows it. */
  name: string
  /** The folder that holds packs. The pack is written to a subfolder of it. */
  outDir: string
  /** The pack's folder name. Default: the name in lower case with hyphens. */
  id?: string
  /** What differs in this book from the defaults in profile.ts. */
  profile?: BookProfileOverrides
}

export type ProblemSource = 'profile' | 'exam-pdf' | 'answer-key' | 'recordings' | 'output'

export interface PackBuildProblem {
  /** Which input the problem is in. */
  source: ProblemSource
  message: string
}

/** A heading the builder recognised in the exam PDF, and the page it is on. */
export interface FoundHeading {
  exam: number
  /** Absent for the exam's own heading. */
  module?: string
  /** Absent for an exam's or a module's heading. */
  part?: number
  page: number
}

export interface PackBuildReport {
  ok: boolean
  errors: PackBuildProblem[]
  /** Every heading recognised in the exam PDF, in reading order, also when the build fails. */
  headings: FoundHeading[]
}

export interface PackBuildResult {
  report: PackBuildReport
  /** The finished pack folder, or null when there were errors. */
  packDir: string | null
}

// ---------------------------------------------------------------------------
// Finding headings
// ---------------------------------------------------------------------------

interface Match {
  index: number
  end: number
  groups: string[]
  named: Record<string, string>
}

function matches(source: string, text: string): Match[] {
  return [...text.matchAll(new RegExp(source, 'gmu'))].map((match) => ({
    index: match.index,
    end: match.index + match[0].length,
    groups: match.slice(1),
    named: { ...match.groups },
  }))
}

// ---------------------------------------------------------------------------
// The exam PDF: which pages belong to which exam, module and part
// ---------------------------------------------------------------------------

interface PartOutline {
  number: number
  page: number
}

interface ModuleOutline {
  profile: ModuleProfile
  page: number
  parts: PartOutline[]
}

interface ExamOutline {
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
function outlineOf(pages: string[], profile: BookProfile, firstPage: number, lastPage: number): ExamOutline[] {
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

function headingsOf(exams: ExamOutline[]): FoundHeading[] {
  return exams.flatMap((exam) => [
    { exam: exam.number, page: exam.page },
    ...exam.modules.flatMap((module) => [
      { exam: exam.number, module: module.profile.id, page: module.page },
      ...module.parts.map((part) => ({
        exam: exam.number,
        module: module.profile.id,
        part: part.number,
        page: part.page,
      })),
    ]),
  ])
}

const list = (numbers: number[]) => (numbers.length > 0 ? numbers.join(', ') : 'none')

/** Everything in the outline that does not match the profile's exam structure. */
function outlineErrors(exams: ExamOutline[], profile: BookProfile, firstPage: number, lastPage: number): string[] {
  if (exams.length === 0) {
    return [
      `No exam heading found on pages ${firstPage} to ${lastPage}. The pattern for an exam's heading is ${profile.examPdf.exam}`,
    ]
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
  return errors
}

// ---------------------------------------------------------------------------
// The pack
// ---------------------------------------------------------------------------

const two = (number: number) => String(number).padStart(2, '0')

/** The description's exams, from an outline that has passed outlineErrors. */
function describeExams(exams: ExamOutline[], lastPage: number): PackExam[] {
  return exams.map((exam, examIndex) => {
    const examLast = (exams[examIndex + 1]?.page ?? lastPage + 1) - 1
    const inExam = (range: PageRange): PageRange => ({
      first: range.first - exam.page + 1,
      last: range.last - exam.page + 1,
    })
    return {
      number: exam.number,
      pagesFile: `exams/${two(exam.number)}/pages.pdf`,
      pageCount: examLast - exam.page + 1,
      sourcePages: { first: exam.page, last: examLast },
      modules: exam.modules.map((module, moduleIndex) => {
        // A section ends on the page before the next heading. When two
        // headings share a page, that page belongs to both sections.
        const nextModule = exam.modules[moduleIndex + 1]?.page ?? examLast + 1
        const moduleLast = Math.max(module.page, nextModule - 1)
        const moduleRange = { first: module.page, last: moduleLast }
        return {
          id: module.profile.id,
          title: module.profile.title,
          pages: inExam(moduleRange),
          sourcePages: moduleRange,
          parts: module.parts.map((part, partIndex) => {
            const nextPart = module.parts[partIndex + 1]?.page ?? moduleLast + 1
            const partRange = { first: part.page, last: Math.max(part.page, nextPart - 1) }
            return {
              number: part.number,
              pages: inExam(partRange),
              sourcePages: partRange,
              items: [],
              recordings: [],
            }
          }),
        }
      }),
    }
  })
}

function slug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function exists(file: string): Promise<boolean> {
  return stat(file).then(
    () => true,
    () => false,
  )
}

export async function buildPack(options: PackBuildOptions): Promise<PackBuildResult> {
  const errors: PackBuildProblem[] = []
  let headings: FoundHeading[] = []
  const failed = (): PackBuildResult => ({ report: { ok: false, errors, headings }, packDir: null })
  const problem = (source: ProblemSource, message: string) => errors.push({ source, message })

  const resolved = resolveProfile(options.profile)
  if (!resolved.profile) {
    for (const message of resolved.errors) problem('profile', message)
    return failed()
  }
  const profile = resolved.profile

  const id = options.id ?? slug(options.name)
  const packDir = path.join(options.outDir, id)

  const pages = await readPdfText(options.examPdf)
  const firstPage = profile.examPdf.firstPage
  const lastPage = Math.min(profile.examPdf.lastPage ?? pages.length, pages.length)
  const outline = outlineOf(pages, profile, firstPage, lastPage)
  headings = headingsOf(outline)
  for (const message of outlineErrors(outline, profile, firstPage, lastPage)) problem('exam-pdf', message)

  if (errors.length > 0) return failed()

  const description: PackDescription = {
    format: PACK_FORMAT,
    id,
    name: options.name,
    examCount: outline.length,
    exams: describeExams(outline, lastPage),
  }

  // Written beside its final place and moved there when complete, so a pack
  // folder is never half-written.
  const building = path.join(options.outDir, `.${id}-building-${process.pid}`)
  await rm(building, { recursive: true, force: true })
  try {
    for (const exam of description.exams) {
      await mkdir(path.join(building, path.dirname(exam.pagesFile)), { recursive: true })
    }
    await splitPdf(
      options.examPdf,
      description.exams.map((exam) => ({ file: path.join(building, exam.pagesFile), ...exam.sourcePages })),
    )
    await writeFile(path.join(building, PACK_DESCRIPTION_FILE), `${JSON.stringify(description, null, 2)}\n`)
    await rename(building, packDir)
  } finally {
    await rm(building, { recursive: true, force: true })
  }

  return { report: { ok: true, errors, headings }, packDir: (await exists(packDir)) ? packDir : null }
}
